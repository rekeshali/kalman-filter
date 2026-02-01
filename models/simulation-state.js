/**
 * Core simulation state and logic
 * Manages simulation step, OU process, EKF integration, and data collection
 */
class SimulationState extends window.EventEmitter {
  constructor() {
    super();
    this.dt = 0.05;  // Default dt for OU process calculations
    this.amplitude = 1.0;
    this.dataCollector = new window.DataCollector(400);
    this.debugLog = [];  // Debug log for 0.5-second snapshots
    this.lastLogTime = -0.5;  // Force log at t=0
    this.isRecording = false;  // Recording state (only log when true)
    this.reset();
  }

  /**
   * Reset simulation to initial state
   * @param {Object} params - Scaled parameters from ParameterModel
   */
  reset(params = {}) {
    this.time = 0;
    this.startTime = null;  // Wall-clock start time (set on first step)
    this.lastRealTime = null;  // Last wall-clock time (for dt calculation)
    this.pauseStartTime = null;  // Track when pause started
    this.initialized = false;
    this.debugLog = [];  // Clear debug log on reset
    this.lastLogTime = -0.5;  // Force log at t=0

    const freq = params.frequency || 0.5;
    const waveType = params.waveType || 'sine';
    const scale = params.scale || 1.0;

    // Initialize true state using analytical wave functions at t=0
    this.truePosition = window.WaveSimulator.getWavePosition(0, waveType, freq, this.amplitude * scale);
    this.trueVelocity = window.WaveSimulator.getWaveVelocity(0, waveType, freq, this.amplitude * scale);
    this.trueAccel = window.WaveSimulator.getWaveAccelerationClean(0, waveType, freq, this.amplitude * scale);

    // Reset OU perturbations to zero
    this.ouPositionPerturbation = 0;
    this.ouVelocityPerturbation = 0;

    this.processVelocity = 0;

    // Reset EKF
    this.ekf = new window.ExtendedKalmanFilter();
    this.ekf.reset(0, 0, 100, 10);

    // Clear data collector
    this.dataCollector.reset();

    this.emit('reset');
  }

  /**
   * Pause simulation (called when user pauses)
   * Stores pause start time to skip over paused duration on resume
   */
  pause() {
    this.pauseStartTime = performance.now();
  }

  /**
   * Resume simulation (called when user resumes after pause)
   * Adjusts startTime and lastRealTime to account for paused duration
   */
  resume() {
    if (this.pauseStartTime !== null && this.startTime !== null) {
      const now = performance.now();
      const pauseDuration = now - this.pauseStartTime;
      // Shift startTime forward by pause duration to skip over paused time
      this.startTime += pauseDuration;
      // Also update lastRealTime to prevent huge dt on first step after resume
      this.lastRealTime = now;
      this.pauseStartTime = null;
    }
  }

  /**
   * Execute one simulation step
   * @param {Object} params - Scaled parameters from ParameterModel
   */
  step(params) {
    // Real-time synchronization: use wall-clock time
    const now = performance.now();
    if (this.startTime === null) {
      this.startTime = now;
      this.lastRealTime = now;
    }

    // Calculate elapsed real time since simulation start
    this.time = (now - this.startTime) / 1000;  // Convert ms to seconds

    // Calculate dt (time since last frame) for physics calculations
    const dt = this.lastRealTime ? (now - this.lastRealTime) / 1000 : this.dt;
    this.lastRealTime = now;

    // Compute clean analytical wave state (reference trajectory)
    const analyticalPosition = window.WaveSimulator.getWavePosition(
      this.time, params.waveType, params.frequency, this.amplitude * params.scale
    );
    const analyticalVelocity = window.WaveSimulator.getWaveVelocity(
      this.time, params.waveType, params.frequency, this.amplitude * params.scale
    );
    const cleanAccel = window.WaveSimulator.getWaveAccelerationClean(
      this.time, params.waveType, params.frequency, this.amplitude * params.scale
    );

    // Ornstein-Uhlenbeck process for bounded perturbations
    const alpha = window.Config.OU_ALPHA;
    const sigma = params.jitter;

    // Update OU position perturbation (mean-reverting random walk)
    const posDecay = Math.exp(-alpha * dt);
    const posNoiseTerm = sigma * Math.sqrt((1 - Math.exp(-2 * alpha * dt)) / (2 * alpha));
    this.ouPositionPerturbation =
      this.ouPositionPerturbation * posDecay +
      posNoiseTerm * window.NoiseUtils.randn();

    // Update OU velocity perturbation
    const velDecay = Math.exp(-alpha * dt);
    const velNoiseTerm = sigma * Math.sqrt((1 - Math.exp(-2 * alpha * dt)) / (2 * alpha));
    this.ouVelocityPerturbation =
      this.ouVelocityPerturbation * velDecay +
      velNoiseTerm * window.NoiseUtils.randn();

    // Apply perturbations to analytical trajectory
    this.truePosition = analyticalPosition + this.ouPositionPerturbation;
    this.trueVelocity = analyticalVelocity + this.ouVelocityPerturbation;

    // True acceleration includes jitter
    const jitterSample = window.NoiseUtils.randn() * params.jitter;
    this.trueAccel = cleanAccel + jitterSample;

    // Generate sensor measurements by adding errors to true values
    const trueInertialNoiseSample = window.NoiseUtils.randn() * params.trueInertialNoise;
    const trueProbeNoiseSample = window.NoiseUtils.randn() * params.trueProbeNoise;

    // Inertial measurement = true acceleration + bias + noise
    const inertialMeasurement = this.trueAccel + params.trueInertialBias + trueInertialNoiseSample;

    // Probe measurement = true position + bias + noise
    const probeMeasurement = this.truePosition + params.trueProbeBias + trueProbeNoiseSample;

    // Initialize EKF and process model with first probe measurement
    if (!this.initialized) {
      this.ekf.reset(probeMeasurement, this.trueVelocity, params.ekfProbeNoise * params.ekfProbeNoise, 10);
      this.processVelocity = this.trueVelocity;
      this.initialized = true;

      // Store initial data point
      const ekfState = this.ekf.getState();
      this.dataCollector.addPoint({
        times: this.time,
        truePositions: this.truePosition,
        trueVelocities: this.trueVelocity,
        probeMeasurements: probeMeasurement,
        processPositions: probeMeasurement,
        estimates: ekfState[0],
        estimatedVelocities: ekfState[1],
        trueAccels: this.trueAccel,
        inertialMeasurements: inertialMeasurement,
        innovations: 0,
        kalmanGainPos: 0,
        kalmanGainVel: 0,
        positionUncertainties: this.ekf.getPositionUncertainty(),
        velocityUncertainties: this.ekf.getVelocityUncertainty(),
        positionErrors: Math.abs(this.truePosition - ekfState[0])
      });

      this.emit('state-changed', this.dataCollector.getData());
      return;
    }

    // Run EKF prediction and update
    this.ekf.step(
      inertialMeasurement,
      params.ekfInertialBias,
      params.ekfProcessNoise,
      probeMeasurement,
      params.ekfProbeBias,
      params.ekfProbeNoise,
      dt
    );

    const ekfState = this.ekf.getState();
    const innovation = this.ekf.getInnovation();
    const kalmanGain = this.ekf.getKalmanGain();

    // Process model: Sync with EKF velocity to prevent unbounded drift
    // Then integrate forward one step with measured acceleration
    this.processVelocity = ekfState[1];  // Sync to EKF's corrected velocity
    this.processVelocity += inertialMeasurement * dt;
    const processPosition = ekfState[0] + this.processVelocity * dt;

    // Store data
    this.dataCollector.addPoint({
      times: this.time,
      truePositions: this.truePosition,
      trueVelocities: this.trueVelocity,
      probeMeasurements: probeMeasurement,
      processPositions: processPosition,
      estimates: ekfState[0],
      estimatedVelocities: ekfState[1],
      trueAccels: this.trueAccel,
      inertialMeasurements: inertialMeasurement,
      innovations: innovation,
      kalmanGainPos: kalmanGain[0],
      kalmanGainVel: kalmanGain[1],
      positionUncertainties: this.ekf.getPositionUncertainty(),
      velocityUncertainties: this.ekf.getVelocityUncertainty(),
      positionErrors: Math.abs(this.truePosition - ekfState[0])
    });

    // Debug logging every 0.5 seconds (only when recording)
    if (this.isRecording && this.time - this.lastLogTime >= 0.5) {
      this.lastLogTime = this.time;
      const logEntry = {
        time: this.time,
        dt: dt,
        // True state
        truePosition: this.truePosition,
        trueVelocity: this.trueVelocity,
        trueAccel: this.trueAccel,
        // Measurements
        probeMeasurement: probeMeasurement,
        inertialMeasurement: inertialMeasurement,
        // Process model
        processPosition: processPosition,
        processVelocity: this.processVelocity,
        // EKF estimates
        ekfPosition: ekfState[0],
        ekfVelocity: ekfState[1],
        // EKF internals
        innovation: innovation,
        kalmanGainPos: kalmanGain[0],
        kalmanGainVel: kalmanGain[1],
        posUncertainty: this.ekf.getPositionUncertainty(),
        velUncertainty: this.ekf.getVelocityUncertainty(),
        // Errors
        ekfPosError: Math.abs(this.truePosition - ekfState[0]),
        processPosError: Math.abs(this.truePosition - processPosition),
        // Parameters (for reference)
        params: {
          frequency: params.frequency,
          waveType: params.waveType,
          scale: params.scale,
          jitter: params.jitter,
          trueInertialNoise: params.trueInertialNoise,
          trueInertialBias: params.trueInertialBias,
          trueProbeNoise: params.trueProbeNoise,
          trueProbeBias: params.trueProbeBias,
          ekfProcessNoise: params.ekfProcessNoise,
          ekfInertialBias: params.ekfInertialBias,
          ekfProbeNoise: params.ekfProbeNoise,
          ekfProbeBias: params.ekfProbeBias
        }
      };
      this.debugLog.push(logEntry);
      console.log(`[DEBUG t=${this.time.toFixed(1)}s]`, logEntry);
    }

    this.emit('state-changed', this.dataCollector.getData());
  }

  /**
   * Get all time-series data (legacy method - returns full history)
   * @returns {Object} All data arrays
   */
  getDataArrays() {
    return this.dataCollector.getData();
  }

  /**
   * Get viewport window of data for rendering
   * @param {number|null} endIndex - End index (null = live mode)
   * @returns {Object} Viewport data with metadata
   */
  getViewportData(endIndex = null) {
    return this.dataCollector.getViewportData(endIndex);
  }

  /**
   * Clear all historical data
   * Used for long-running simulations to free memory
   */
  clearHistory() {
    this.dataCollector.clearHistory();
    this.emit('history-cleared');
  }

  /**
   * Get current simulation metrics
   * @returns {Object} Current state metrics
   */
  getMetrics() {
    return {
      time: this.time,
      initialized: this.initialized,
      truePosition: this.truePosition,
      trueVelocity: this.trueVelocity,
      trueAccel: this.trueAccel,
      dataPointsCount: this.dataCollector.getLength()
    };
  }

  /**
   * Get debug log (0.5-second interval snapshots)
   * @returns {Array} Debug log entries
   */
  getDebugLog() {
    return this.debugLog;
  }

  /**
   * Export debug log as JSON (for analysis)
   * @returns {string} JSON string of debug log
   */
  exportDebugLog() {
    return JSON.stringify(this.debugLog, null, 2);
  }

  /**
   * Start recording debug snapshots
   * Clears existing log and begins collecting data
   */
  startRecording() {
    this.isRecording = true;
    this.debugLog = [];  // Clear previous recording
    this.lastLogTime = this.time - 0.5;  // Force immediate log on next interval
  }

  /**
   * Stop recording debug snapshots
   */
  stopRecording() {
    this.isRecording = false;
  }

  /**
   * Check if currently recording
   * @returns {boolean} True if recording
   */
  getIsRecording() {
    return this.isRecording;
  }

  /**
   * Download debug log as JSON file
   */
  downloadDebugLog() {
    const json = this.exportDebugLog();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ekf-debug-log-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export to global scope
window.SimulationState = SimulationState;
