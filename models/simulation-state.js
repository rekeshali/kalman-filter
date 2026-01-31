/**
 * Core simulation state and logic
 * Manages simulation step, OU process, EKF integration, and data collection
 */
class SimulationState extends window.EventEmitter {
  constructor() {
    super();
    this.dt = 0.05;
    this.amplitude = 1.0;
    this.dataCollector = new window.DataCollector(400);
    this.reset();
  }

  /**
   * Reset simulation to initial state
   * @param {Object} params - Scaled parameters from ParameterModel
   */
  reset(params = {}) {
    this.time = 0;
    this.initialized = false;

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
   * Execute one simulation step
   * @param {Object} params - Scaled parameters from ParameterModel
   */
  step(params) {
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
    const dt = this.dt;

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

      this.time += dt;
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

    // Process model: Start from last EKF estimate + one integration step with measured accel
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

    this.time += dt;
    this.emit('state-changed', this.dataCollector.getData());
  }

  /**
   * Get all time-series data
   * @returns {Object} All data arrays
   */
  getDataArrays() {
    return this.dataCollector.getData();
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
}

// Export to global scope
window.SimulationState = SimulationState;
