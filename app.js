/**
 * Main application - EKF Visualization with React
 */

const { useState, useEffect, useRef } = React;

function EKFVisualization() {
  // Add CSS for 2-second tooltip delay
  useEffect(() => {
    if (!document.querySelector('style[data-tooltip-delay]')) {
      const tooltipDelayStyle = document.createElement('style');
      tooltipDelayStyle.setAttribute('data-tooltip-delay', 'true');
      tooltipDelayStyle.textContent = `
        .tooltip-delay-group .tooltip-content {
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s 0s, visibility 0.2s 0s;
          z-index: 999999 !important;
        }
        .tooltip-delay-group:hover .tooltip-content {
          opacity: 1;
          visibility: visible;
          transition: opacity 0.2s 2s, visibility 0.2s 2s;
        }
      `;
      document.head.appendChild(tooltipDelayStyle);
    }
  }, []);

  // Load saved state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem('ekf-visualization-state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved state:', e);
    }
    return null;
  };

  const savedState = loadSavedState();

  // Inertial sensor parameters
  const [trueInertialNoise, setTrueInertialNoise] = useState(savedState?.trueInertialNoise || window.Config.DEFAULTS.trueInertialNoise);
  const [trueInertialBias, setTrueInertialBias] = useState(savedState?.trueInertialBias || window.Config.DEFAULTS.trueInertialBias);
  const [ekfProcessNoise, setEkfProcessNoise] = useState(savedState?.ekfProcessNoise || window.Config.DEFAULTS.ekfProcessNoise);
  const [ekfInertialBias, setEkfInertialBias] = useState(savedState?.ekfInertialBias || window.Config.DEFAULTS.ekfInertialBias);

  // External probe parameters
  const [trueProbeNoise, setTrueProbeNoise] = useState(savedState?.trueProbeNoise || window.Config.DEFAULTS.trueProbeNoise);
  const [trueProbeBias, setTrueProbeBias] = useState(savedState?.trueProbeBias || window.Config.DEFAULTS.trueProbeBias);
  const [ekfProbeNoise, setEkfProbeNoise] = useState(savedState?.ekfProbeNoise || window.Config.DEFAULTS.ekfProbeNoise);
  const [ekfProbeBias, setEkfProbeBias] = useState(savedState?.ekfProbeBias || window.Config.DEFAULTS.ekfProbeBias);

  // Wave parameters
  const [frequency, setFrequency] = useState(savedState?.frequency || window.Config.DEFAULTS.frequency);
  const [waveType, setWaveType] = useState(savedState?.waveType || window.Config.DEFAULTS.waveType);
  const [jitter, setJitter] = useState(savedState?.jitter || window.Config.DEFAULTS.jitter);
  const [scale, setScale] = useState(savedState?.scale || 1.0);

  const amplitude = 1.0; // Base amplitude (will be scaled)

  const [isRunning, setIsRunning] = useState(false);

  // Tab management
  const [tabs, setTabs] = useState(savedState?.tabs || [{ id: 'welcome', name: 'Welcome', type: 'welcome' }]);
  const [activeTabId, setActiveTabId] = useState(savedState?.activeTabId || 'welcome');
  const [nextTabNumber, setNextTabNumber] = useState(savedState?.nextTabNumber || 1);
  const [hoveredTabId, setHoveredTabId] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');

  // Chart refs
  const positionChartRef = useRef(null);
  const positionChartInstanceRef = useRef(null);
  const accelChartRef = useRef(null);
  const accelChartInstanceRef = useRef(null);
  const velocityChartRef = useRef(null);
  const velocityChartInstanceRef = useRef(null);
  const innovationChartRef = useRef(null);
  const innovationChartInstanceRef = useRef(null);
  const kalmanGainChartRef = useRef(null);
  const kalmanGainChartInstanceRef = useRef(null);
  const uncertaintyChartRef = useRef(null);
  const uncertaintyChartInstanceRef = useRef(null);
  const errorChartRef = useRef(null);
  const errorChartInstanceRef = useRef(null);

  const animationRef = useRef(null);

  // Use refs for parameters that can change during simulation
  const paramsRef = useRef({
    trueInertialNoise: window.Config.NOISE_LEVELS[trueInertialNoise] * scale,
    trueInertialBias: window.Config.BIAS_LEVELS[trueInertialBias] * scale,
    ekfProcessNoise: window.Config.NOISE_LEVELS[ekfProcessNoise] * scale,
    ekfInertialBias: window.Config.BIAS_LEVELS[ekfInertialBias] * scale,
    trueProbeNoise: window.Config.PROBE_NOISE_LEVELS[trueProbeNoise] * scale,
    trueProbeBias: window.Config.PROBE_BIAS_LEVELS[trueProbeBias] * scale,
    ekfProbeNoise: window.Config.PROBE_NOISE_LEVELS[ekfProbeNoise] * scale,
    ekfProbeBias: window.Config.PROBE_BIAS_LEVELS[ekfProbeBias] * scale,
    jitter: window.Config.JITTER_LEVELS[jitter] * scale,
    frequency,
    waveType,
    scale
  });

  // Update refs when parameters change
  useEffect(() => {
    paramsRef.current = {
      trueInertialNoise: window.Config.NOISE_LEVELS[trueInertialNoise] * scale,
      trueInertialBias: window.Config.BIAS_LEVELS[trueInertialBias] * scale,
      ekfProcessNoise: window.Config.NOISE_LEVELS[ekfProcessNoise] * scale,
      ekfInertialBias: window.Config.BIAS_LEVELS[ekfInertialBias] * scale,
      trueProbeNoise: window.Config.PROBE_NOISE_LEVELS[trueProbeNoise] * scale,
      trueProbeBias: window.Config.PROBE_BIAS_LEVELS[trueProbeBias] * scale,
      ekfProbeNoise: window.Config.PROBE_NOISE_LEVELS[ekfProbeNoise] * scale,
      ekfProbeBias: window.Config.PROBE_BIAS_LEVELS[ekfProbeBias] * scale,
      jitter: window.Config.JITTER_LEVELS[jitter] * scale,
      frequency,
      waveType,
      scale
    };
  }, [trueInertialNoise, trueInertialBias, ekfProcessNoise, ekfInertialBias,
      trueProbeNoise, trueProbeBias, ekfProbeNoise, ekfProbeBias, jitter, frequency, waveType, scale]);

  // Save state to localStorage whenever configuration or tabs change
  useEffect(() => {
    try {
      const stateToSave = {
        // Parameter configurations
        trueInertialNoise,
        trueInertialBias,
        ekfProcessNoise,
        ekfInertialBias,
        trueProbeNoise,
        trueProbeBias,
        ekfProbeNoise,
        ekfProbeBias,
        frequency,
        waveType,
        jitter,
        scale,
        // Tab state
        tabs,
        activeTabId,
        nextTabNumber
      };
      localStorage.setItem('ekf-visualization-state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [trueInertialNoise, trueInertialBias, ekfProcessNoise, ekfInertialBias,
      trueProbeNoise, trueProbeBias, ekfProbeNoise, ekfProbeBias,
      frequency, waveType, jitter, scale, tabs, activeTabId, nextTabNumber]);

  // Simulation state
  const stateRef = useRef({
    time: 0,
    dt: 0.05,
    initialized: false,

    // True state (integrated from true acceleration)
    truePosition: 0,
    trueVelocity: 0,
    trueAccel: 0,

    // Ornstein-Uhlenbeck process perturbation state
    ouPositionPerturbation: 0,  // Current position perturbation from OU process
    ouVelocityPerturbation: 0,  // Current velocity perturbation from OU process

    // Process model state - stores velocity for integration
    processVelocity: 0,

    // EKF instance
    ekf: new window.ExtendedKalmanFilter(),

    // Data for plotting
    times: [],
    truePositions: [],
    trueVelocities: [],
    probeMeasurements: [],
    processPositions: [],
    estimates: [],
    estimatedVelocities: [],
    trueAccels: [],
    inertialMeasurements: [],
    innovations: [],
    kalmanGainPos: [],
    kalmanGainVel: [],
    positionUncertainties: [],
    velocityUncertainties: [],
    positionErrors: []
  });

  // Reset simulation
  const reset = () => {
    const state = stateRef.current;
    const params = paramsRef.current;

    state.time = 0;
    state.initialized = false;

    // Initialize true state using analytical wave functions at t=0
    state.truePosition = window.WaveSimulator.getWavePosition(0, params.waveType, params.frequency, amplitude * params.scale);
    state.trueVelocity = window.WaveSimulator.getWaveVelocity(0, params.waveType, params.frequency, amplitude * params.scale);
    state.trueAccel = window.WaveSimulator.getWaveAccelerationClean(0, params.waveType, params.frequency, amplitude * params.scale);

    // Reset OU perturbations to zero
    state.ouPositionPerturbation = 0;
    state.ouVelocityPerturbation = 0;

    state.processVelocity = 0;

    // Reset EKF
    state.ekf.reset(0, 0, 100, 10);

    // Clear all data arrays
    state.times = [];
    state.truePositions = [];
    state.trueVelocities = [];
    state.probeMeasurements = [];
    state.processPositions = [];
    state.estimates = [];
    state.estimatedVelocities = [];
    state.trueAccels = [];
    state.inertialMeasurements = [];
    state.innovations = [];
    state.kalmanGainPos = [];
    state.kalmanGainVel = [];
    state.positionUncertainties = [];
    state.velocityUncertainties = [];
    state.positionErrors = [];

    // Clear all charts
    const charts = [
      positionChartInstanceRef,
      accelChartInstanceRef,
      velocityChartInstanceRef,
      innovationChartInstanceRef,
      kalmanGainChartInstanceRef,
      uncertaintyChartInstanceRef,
      errorChartInstanceRef
    ];

    charts.forEach(chartRef => {
      if (chartRef.current) {
        chartRef.current.data.labels = [];
        chartRef.current.data.datasets.forEach(dataset => {
          dataset.data = [];
        });
        chartRef.current.update();
      }
    });
  };

  // Simulation step
  const step = () => {
    const state = stateRef.current;
    const params = paramsRef.current;
    const dt = state.dt;

    // Compute clean analytical wave state (reference trajectory)
    const analyticalPosition = window.WaveSimulator.getWavePosition(
      state.time, params.waveType, params.frequency, amplitude * params.scale
    );
    const analyticalVelocity = window.WaveSimulator.getWaveVelocity(
      state.time, params.waveType, params.frequency, amplitude * params.scale
    );
    const cleanAccel = window.WaveSimulator.getWaveAccelerationClean(
      state.time, params.waveType, params.frequency, amplitude * params.scale
    );

    // Ornstein-Uhlenbeck process for bounded perturbations
    const alpha = window.Config.OU_ALPHA;
    const sigma = params.jitter;

    // Update OU position perturbation (mean-reverting random walk)
    const posDecay = Math.exp(-alpha * dt);
    const posNoiseTerm = sigma * Math.sqrt((1 - Math.exp(-2 * alpha * dt)) / (2 * alpha));
    state.ouPositionPerturbation =
      state.ouPositionPerturbation * posDecay +
      posNoiseTerm * window.NoiseUtils.randn();

    // Update OU velocity perturbation
    const velDecay = Math.exp(-alpha * dt);
    const velNoiseTerm = sigma * Math.sqrt((1 - Math.exp(-2 * alpha * dt)) / (2 * alpha));
    state.ouVelocityPerturbation =
      state.ouVelocityPerturbation * velDecay +
      velNoiseTerm * window.NoiseUtils.randn();

    // Apply perturbations to analytical trajectory
    state.truePosition = analyticalPosition + state.ouPositionPerturbation;
    state.trueVelocity = analyticalVelocity + state.ouVelocityPerturbation;

    // True acceleration includes jitter
    const jitterSample = window.NoiseUtils.randn() * params.jitter;
    state.trueAccel = cleanAccel + jitterSample;

    // Generate sensor measurements by adding errors to true values
    const trueInertialNoiseSample = window.NoiseUtils.randn() * params.trueInertialNoise;
    const trueProbeNoiseSample = window.NoiseUtils.randn() * params.trueProbeNoise;

    // Inertial measurement = true acceleration + bias + noise
    const inertialMeasurement = state.trueAccel + params.trueInertialBias + trueInertialNoiseSample;

    // Probe measurement = true position + bias + noise
    const probeMeasurement = state.truePosition + params.trueProbeBias + trueProbeNoiseSample;

    // Initialize EKF and process model with first probe measurement
    if (!state.initialized) {
      state.ekf.reset(probeMeasurement, state.trueVelocity, params.ekfProbeNoise * params.ekfProbeNoise, 10);
      state.processVelocity = state.trueVelocity;
      state.initialized = true;

      // Store initial data point
      const ekfState = state.ekf.getState();
      state.times.push(state.time);
      state.truePositions.push(state.truePosition);
      state.trueVelocities.push(state.trueVelocity);
      state.probeMeasurements.push(probeMeasurement);
      state.processPositions.push(probeMeasurement);
      state.estimates.push(ekfState[0]);
      state.estimatedVelocities.push(ekfState[1]);
      state.trueAccels.push(state.trueAccel);
      state.inertialMeasurements.push(inertialMeasurement);
      state.innovations.push(0);
      state.kalmanGainPos.push(0);
      state.kalmanGainVel.push(0);
      state.positionUncertainties.push(state.ekf.getPositionUncertainty());
      state.velocityUncertainties.push(state.ekf.getVelocityUncertainty());
      state.positionErrors.push(Math.abs(state.truePosition - ekfState[0]));

      state.time += dt;
      return;
    }

    // Run EKF prediction and update
    state.ekf.step(
      inertialMeasurement,
      params.ekfInertialBias,
      params.ekfProcessNoise,
      probeMeasurement,
      params.ekfProbeBias,
      params.ekfProbeNoise,
      dt
    );

    const ekfState = state.ekf.getState();
    const innovation = state.ekf.getInnovation();
    const kalmanGain = state.ekf.getKalmanGain();

    // Process model: Start from last EKF estimate + one integration step with measured accel
    state.processVelocity += inertialMeasurement * dt;
    const processPosition = ekfState[0] + state.processVelocity * dt;

    // Store data
    state.times.push(state.time);
    state.truePositions.push(state.truePosition);
    state.trueVelocities.push(state.trueVelocity);
    state.probeMeasurements.push(probeMeasurement);
    state.processPositions.push(processPosition);
    state.estimates.push(ekfState[0]);
    state.estimatedVelocities.push(ekfState[1]);
    state.trueAccels.push(state.trueAccel);
    state.inertialMeasurements.push(inertialMeasurement);
    state.innovations.push(innovation);
    state.kalmanGainPos.push(kalmanGain[0]);
    state.kalmanGainVel.push(kalmanGain[1]);
    state.positionUncertainties.push(state.ekf.getPositionUncertainty());
    state.velocityUncertainties.push(state.ekf.getVelocityUncertainty());
    state.positionErrors.push(Math.abs(state.truePosition - ekfState[0]));

    // Keep only last 400 points for display
    if (state.times.length > 400) {
      state.times.shift();
      state.truePositions.shift();
      state.trueVelocities.shift();
      state.probeMeasurements.shift();
      state.processPositions.shift();
      state.estimates.shift();
      state.estimatedVelocities.shift();
      state.trueAccels.shift();
      state.inertialMeasurements.shift();
      state.innovations.shift();
      state.kalmanGainPos.shift();
      state.kalmanGainVel.shift();
      state.positionUncertainties.shift();
      state.velocityUncertainties.shift();
      state.positionErrors.shift();
    }

    state.time += dt;
  };

  // Animation loop
  const animate = () => {
    if (!isRunning) return;

    step();

    const state = stateRef.current;

    // Update position chart
    if (positionChartInstanceRef.current) {
      positionChartInstanceRef.current.data.labels = state.times;
      positionChartInstanceRef.current.data.datasets[0].data = state.truePositions;
      positionChartInstanceRef.current.data.datasets[1].data = state.probeMeasurements;
      positionChartInstanceRef.current.data.datasets[2].data = state.processPositions;
      positionChartInstanceRef.current.data.datasets[3].data = state.estimates;

      const allPositionData = [...state.truePositions, ...state.probeMeasurements, ...state.processPositions, ...state.estimates];
      if (allPositionData.length > 0) {
        const minPos = Math.min(...allPositionData);
        const maxPos = Math.max(...allPositionData);
        const padding = (maxPos - minPos) * 0.1 || 1;
        positionChartInstanceRef.current.options.scales.y.min = minPos - padding;
        positionChartInstanceRef.current.options.scales.y.max = maxPos + padding;
      }

      positionChartInstanceRef.current.update('none');
    }

    // Update acceleration chart
    if (accelChartInstanceRef.current) {
      accelChartInstanceRef.current.data.labels = state.times;
      accelChartInstanceRef.current.data.datasets[0].data = state.trueAccels;
      accelChartInstanceRef.current.data.datasets[1].data = state.inertialMeasurements;

      const allAccelData = [...state.trueAccels, ...state.inertialMeasurements];
      if (allAccelData.length > 0) {
        const minAccel = Math.min(...allAccelData);
        const maxAccel = Math.max(...allAccelData);
        const padding = Math.max((maxAccel - minAccel) * 0.1, 0.5);
        accelChartInstanceRef.current.options.scales.y.min = minAccel - padding;
        accelChartInstanceRef.current.options.scales.y.max = maxAccel + padding;
      }

      accelChartInstanceRef.current.update('none');
    }

    // Update velocity chart
    if (velocityChartInstanceRef.current) {
      velocityChartInstanceRef.current.data.labels = state.times;
      velocityChartInstanceRef.current.data.datasets[0].data = state.trueVelocities;
      velocityChartInstanceRef.current.data.datasets[1].data = state.estimatedVelocities;

      const allVelData = [...state.trueVelocities, ...state.estimatedVelocities];
      if (allVelData.length > 0) {
        const minVel = Math.min(...allVelData);
        const maxVel = Math.max(...allVelData);
        const padding = Math.max((maxVel - minVel) * 0.1, 0.5);
        velocityChartInstanceRef.current.options.scales.y.min = minVel - padding;
        velocityChartInstanceRef.current.options.scales.y.max = maxVel + padding;
      }

      velocityChartInstanceRef.current.update('none');
    }

    // Update innovation chart
    if (innovationChartInstanceRef.current) {
      innovationChartInstanceRef.current.data.labels = state.times;
      innovationChartInstanceRef.current.data.datasets[0].data = state.innovations;

      if (state.innovations.length > 0) {
        const minInn = Math.min(...state.innovations);
        const maxInn = Math.max(...state.innovations);
        const padding = Math.max(Math.abs(maxInn - minInn) * 0.1, 0.1);
        innovationChartInstanceRef.current.options.scales.y.min = minInn - padding;
        innovationChartInstanceRef.current.options.scales.y.max = maxInn + padding;
      }

      innovationChartInstanceRef.current.update('none');
    }

    // Update Kalman gain chart
    if (kalmanGainChartInstanceRef.current) {
      kalmanGainChartInstanceRef.current.data.labels = state.times;
      kalmanGainChartInstanceRef.current.data.datasets[0].data = state.kalmanGainPos;
      kalmanGainChartInstanceRef.current.data.datasets[1].data = state.kalmanGainVel;

      kalmanGainChartInstanceRef.current.update('none');
    }

    // Update uncertainty chart
    if (uncertaintyChartInstanceRef.current) {
      uncertaintyChartInstanceRef.current.data.labels = state.times;
      uncertaintyChartInstanceRef.current.data.datasets[0].data = state.positionUncertainties;
      uncertaintyChartInstanceRef.current.data.datasets[1].data = state.velocityUncertainties;

      const allUncData = [...state.positionUncertainties, ...state.velocityUncertainties];
      if (allUncData.length > 0) {
        const maxUnc = Math.max(...allUncData);
        uncertaintyChartInstanceRef.current.options.scales.y.min = 0;
        uncertaintyChartInstanceRef.current.options.scales.y.max = maxUnc * 1.1;
      }

      uncertaintyChartInstanceRef.current.update('none');
    }

    // Update error chart
    if (errorChartInstanceRef.current) {
      errorChartInstanceRef.current.data.labels = state.times;
      errorChartInstanceRef.current.data.datasets[0].data = state.positionErrors;

      if (state.positionErrors.length > 0) {
        const maxErr = Math.max(...state.positionErrors);
        errorChartInstanceRef.current.options.scales.y.min = 0;
        errorChartInstanceRef.current.options.scales.y.max = maxErr * 1.1;
      }

      errorChartInstanceRef.current.update('none');
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  // Initialize position chart
  useEffect(() => {
    if (!positionChartRef.current) return;

    const ctx = positionChartRef.current.getContext('2d');

    positionChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'True Position',
            data: [],
            borderColor: 'white',
            backgroundColor: 'white',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            order: 4
          },
          {
            label: 'External Probe',
            data: [],
            borderColor: 'rgb(234, 179, 8)',
            backgroundColor: 'rgb(234, 179, 8)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            order: 3
          },
          {
            label: 'Process Model',
            data: [],
            borderColor: 'cyan',
            backgroundColor: 'cyan',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            order: 2
          },
          {
            label: 'EKF Estimate',
            data: [],
            borderColor: 'red',
            backgroundColor: 'red',
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.1,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        backgroundColor: '#1f2937',
        scales: {
          x: {
            title: { display: true, text: 'Time (s)', color: '#f3f4f6' },
            ticks: {
              maxTicksLimit: 10,
              color: '#d1d5db',
              callback: function(value) {
                return Number(value).toFixed(2);
              }
            },
            grid: { color: '#374151' }
          },
          y: {
            title: { display: true, text: 'Position', color: '#f3f4f6' },
            ticks: { color: '#d1d5db' },
            grid: { color: '#374151' },
            min: -2,
            max: 2
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f3f4f6' }
          },
          title: {
            display: true,
            text: 'Wave Position Tracking',
            color: '#f3f4f6',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });

    return () => {
      if (positionChartInstanceRef.current) {
        positionChartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Initialize acceleration chart
  useEffect(() => {
    if (!accelChartRef.current) return;

    const ctx = accelChartRef.current.getContext('2d');

    accelChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'True Acceleration',
            data: [],
            borderColor: 'white',
            backgroundColor: 'white',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            order: 2
          },
          {
            label: 'Inertial Measurement',
            data: [],
            borderColor: 'cyan',
            backgroundColor: 'cyan',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        backgroundColor: '#1f2937',
        scales: {
          x: {
            title: { display: true, text: 'Time (s)', color: '#f3f4f6' },
            ticks: {
              maxTicksLimit: 10,
              color: '#d1d5db',
              callback: function(value) {
                return Number(value).toFixed(2);
              }
            },
            grid: { color: '#374151' }
          },
          y: {
            title: { display: true, text: 'Acceleration', color: '#f3f4f6' },
            ticks: { color: '#d1d5db' },
            grid: { color: '#374151' },
            min: -5,
            max: 5
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f3f4f6' }
          },
          title: {
            display: true,
            text: 'Wave Acceleration',
            color: '#f3f4f6',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });

    return () => {
      if (accelChartInstanceRef.current) {
        accelChartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Initialize velocity chart
  useEffect(() => {
    if (!velocityChartRef.current) return;

    const ctx = velocityChartRef.current.getContext('2d');

    velocityChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'True Velocity',
            data: [],
            borderColor: 'white',
            backgroundColor: 'white',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            order: 2
          },
          {
            label: 'EKF Velocity Estimate',
            data: [],
            borderColor: 'rgb(220, 38, 38)',
            backgroundColor: 'rgb(220, 38, 38)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        backgroundColor: '#1f2937',
        scales: {
          x: {
            title: { display: true, text: 'Time (s)', color: '#f3f4f6' },
            ticks: {
              maxTicksLimit: 10,
              color: '#d1d5db',
              callback: function(value) {
                return Number(value).toFixed(2);
              }
            },
            grid: { color: '#374151' }
          },
          y: {
            title: { display: true, text: 'Velocity', color: '#f3f4f6' },
            ticks: { color: '#d1d5db' },
            grid: { color: '#374151' },
            min: -3,
            max: 3
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f3f4f6' }
          },
          title: {
            display: true,
            text: 'Velocity Tracking',
            color: '#f3f4f6',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });

    return () => {
      if (velocityChartInstanceRef.current) {
        velocityChartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Initialize innovation chart
  useEffect(() => {
    if (!innovationChartRef.current) return;

    const ctx = innovationChartRef.current.getContext('2d');

    innovationChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Innovation (z - ẑ)',
            data: [],
            borderColor: 'rgb(147, 51, 234)',
            backgroundColor: 'rgb(147, 51, 234)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        backgroundColor: '#1f2937',
        scales: {
          x: {
            title: { display: true, text: 'Time (s)', color: '#f3f4f6' },
            ticks: {
              maxTicksLimit: 10,
              color: '#d1d5db',
              callback: function(value) {
                return Number(value).toFixed(2);
              }
            },
            grid: { color: '#374151' }
          },
          y: {
            title: { display: true, text: 'Innovation', color: '#f3f4f6' },
            ticks: { color: '#d1d5db' },
            grid: { color: '#374151' },
            min: -1,
            max: 1
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f3f4f6' }
          },
          title: {
            display: true,
            text: 'Measurement Residual',
            color: '#f3f4f6',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });

    return () => {
      if (innovationChartInstanceRef.current) {
        innovationChartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Initialize Kalman gain chart
  useEffect(() => {
    if (!kalmanGainChartRef.current) return;

    const ctx = kalmanGainChartRef.current.getContext('2d');

    kalmanGainChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'K[0] (Position)',
            data: [],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          },
          {
            label: 'K[1] (Velocity)',
            data: [],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgb(16, 185, 129)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        backgroundColor: '#1f2937',
        scales: {
          x: {
            title: { display: true, text: 'Time (s)', color: '#f3f4f6' },
            ticks: {
              maxTicksLimit: 10,
              color: '#d1d5db',
              callback: function(value) {
                return Number(value).toFixed(2);
              }
            },
            grid: { color: '#374151' }
          },
          y: {
            title: { display: true, text: 'Kalman Gain', color: '#f3f4f6' },
            ticks: { color: '#d1d5db' },
            grid: { color: '#374151' },
            min: 0,
            max: 1
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f3f4f6' }
          },
          title: {
            display: true,
            text: 'Kalman Gain (Measurement Trust)',
            color: '#f3f4f6',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });

    return () => {
      if (kalmanGainChartInstanceRef.current) {
        kalmanGainChartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Initialize uncertainty chart
  useEffect(() => {
    if (!uncertaintyChartRef.current) return;

    const ctx = uncertaintyChartRef.current.getContext('2d');

    uncertaintyChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Position σ',
            data: [],
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgb(239, 68, 68)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          },
          {
            label: 'Velocity σ',
            data: [],
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgb(249, 115, 22)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        backgroundColor: '#1f2937',
        scales: {
          x: {
            title: { display: true, text: 'Time (s)', color: '#f3f4f6' },
            ticks: {
              maxTicksLimit: 10,
              color: '#d1d5db',
              callback: function(value) {
                return Number(value).toFixed(2);
              }
            },
            grid: { color: '#374151' }
          },
          y: {
            title: { display: true, text: 'Std Dev (σ)', color: '#f3f4f6' },
            ticks: { color: '#d1d5db' },
            grid: { color: '#374151' },
            min: 0,
            max: 1
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f3f4f6' }
          },
          title: {
            display: true,
            text: 'Filter Uncertainty (Convergence)',
            color: '#f3f4f6',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });

    return () => {
      if (uncertaintyChartInstanceRef.current) {
        uncertaintyChartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Initialize error chart
  useEffect(() => {
    if (!errorChartRef.current) return;

    const ctx = errorChartRef.current.getContext('2d');

    errorChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Position Error',
            data: [],
            borderColor: 'rgb(220, 38, 38)',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        backgroundColor: '#1f2937',
        scales: {
          x: {
            title: { display: true, text: 'Time (s)', color: '#f3f4f6' },
            ticks: {
              maxTicksLimit: 10,
              color: '#d1d5db',
              callback: function(value) {
                return Number(value).toFixed(2);
              }
            },
            grid: { color: '#374151' }
          },
          y: {
            title: { display: true, text: '|Error|', color: '#f3f4f6' },
            ticks: { color: '#d1d5db' },
            grid: { color: '#374151' },
            min: 0,
            max: 0.5
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f3f4f6' }
          },
          title: {
            display: true,
            text: 'Position Error (Performance)',
            color: '#f3f4f6',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    });

    return () => {
      if (errorChartInstanceRef.current) {
        errorChartInstanceRef.current.destroy();
      }
    };
  }, []);

  // Handle start/stop
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    if (!stateRef.current.initialized) {
      reset();
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    reset();
  };

  const handleRestart = () => {
    reset();
    setIsRunning(true);
  };

  // Tab management functions
  const addSimulationTab = () => {
    const newTab = {
      id: `sim-${Date.now()}`,
      name: `Simulation ${nextTabNumber}`,
      type: 'simulation'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setNextTabNumber(nextTabNumber + 1);
  };

  const closeTab = (tabId) => {
    if (tabId === 'welcome') return; // Can't close welcome tab
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      // Switch to welcome tab if closing active tab
      setActiveTabId('welcome');
    }
  };

  const startEditingTab = (tabId, currentName) => {
    if (tabId === 'welcome') return; // Can't rename welcome tab
    setEditingTabId(tabId);
    setEditingTabName(currentName);
  };

  const finishEditingTab = (tabId) => {
    if (editingTabName.trim()) {
      setTabs(tabs.map(t => t.id === tabId ? { ...t, name: editingTabName.trim() } : t));
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const incrementFrequency = () => {
    setFrequency(prev => Math.min(2.0, prev + 0.1));
  };

  const decrementFrequency = () => {
    setFrequency(prev => Math.max(0.1, prev - 0.1));
  };

  const incrementScale = () => {
    setScale(prev => Math.min(10.0, prev + 1.0));
  };

  const decrementScale = () => {
    setScale(prev => Math.max(0.5, prev - 1.0));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-2xl font-bold mb-1 text-white">Extended Kalman Filter: Wave Tracking</h1>
        <p className="text-gray-300 text-sm">
          Explore model mismatch in real-time: Change parameters while simulating to see immediate effects.
        </p>

        {/* Chrome-Style Tab Navigation */}
        <div className="flex items-end gap-1 mt-3 -mb-4 bg-gray-800 px-2 pt-1">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`
                relative flex items-center gap-2 px-4 py-3 rounded-t-lg cursor-pointer
                transition-all group min-w-[140px] max-w-[250px]
                ${activeTabId === tab.id
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-650 hover:text-gray-200'
                }
              `}
              onClick={() => setActiveTabId(tab.id)}
              onMouseEnter={() => setHoveredTabId(tab.id)}
              onMouseLeave={() => setHoveredTabId(null)}
            >
              {/* Pencil icon on hover (for non-welcome tabs) */}
              {tab.type !== 'welcome' && hoveredTabId === tab.id && editingTabId !== tab.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); startEditingTab(tab.id, tab.name); }}
                  className="text-gray-400 hover:text-white text-sm"
                  title="Rename tab"
                >
                  ✎
                </button>
              )}

              {/* Tab name (editable or display) */}
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => finishEditingTab(tab.id)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') finishEditingTab(tab.id);
                    if (e.key === 'Escape') { setEditingTabId(null); setEditingTabName(''); }
                  }}
                  className="bg-gray-600 px-2 py-1 rounded text-white text-sm flex-1 min-w-0"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm font-medium truncate flex-1 min-w-0" title={tab.name}>
                  {tab.name.length > 30 ? tab.name.substring(0, 30) + '...' : tab.name}
                </span>
              )}

              {/* Close button (for non-welcome tabs) */}
              {tab.type !== 'welcome' && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="ml-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded w-5 h-5 flex items-center justify-center text-sm"
                  title="Close tab"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Add new tab button */}
          <button
            onClick={addSimulationTab}
            className="px-4 py-3 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-t-lg transition-all font-bold text-lg"
            title="Add new simulation tab"
          >
            +
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className={`flex-1 overflow-y-auto p-6 bg-gray-900 ${activeTabId === 'welcome' ? '' : 'hidden'}`}>
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* LEFT SIDE: Kalman Filter Explanation */}
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">How a Kalman Filter Works</h2>
                <p className="text-gray-200 mb-4">
                  The Kalman filter is an optimal recursive algorithm for estimating the state of a system from noisy measurements.
                  It operates in two steps:
                </p>

                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded border-l-4 border-blue-500">
                    <h3 className="font-semibold text-blue-400 mb-2">1. Prediction Step</h3>
                    <p className="text-gray-200 text-sm">
                      Uses the system dynamics model to predict the next state based on the current estimate and control inputs (acceleration measurements).
                      Uncertainty grows due to process noise.
                    </p>
                  </div>

                  <div className="bg-gray-700 p-4 rounded border-l-4 border-green-500">
                    <h3 className="font-semibold text-green-400 mb-2">2. Update Step</h3>
                    <p className="text-gray-200 text-sm">
                      Fuses the prediction with new measurements (position from external probe) using the Kalman gain.
                      The gain balances trust between the model and measurements. Uncertainty decreases.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-6 bg-gray-900 rounded border border-gray-600">
                  <h3 className="font-semibold text-gray-200 mb-4">Extended Kalman Filter Block Diagram</h3>

                  {/* Row 1: Initialization and Reality Simulation */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Initial Conditions */}
                    <div className="relative group">
                      <div className="h-16 bg-indigo-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        Initial Conditions<br/>x₀, P₀
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] w-80 p-4 bg-gray-800 border border-indigo-400 rounded-lg shadow-xl top-full mt-2 left-0 text-xs text-gray-200">
                        <strong className="text-indigo-400 block mb-2">Initialization:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          x₀ = [p₀, v₀]ᵀ = [0, 0]ᵀ<br/>
                          P₀ = diag([σ²ₚ₀, σ²ᵥ₀])
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Set initial state estimate and uncertainty.</p>
                        <p><strong>Intuition:</strong> Start with high uncertainty (large P₀). As measurements arrive, filter converges to true state.</p>
                      </div>
                    </div>

                    {/* Simulation (Reality) */}
                    <div className="relative group">
                      <div className="h-16 bg-gray-600 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        True Trajectory<br/>(Simulation)
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] w-80 p-4 bg-gray-800 border border-gray-400 rounded-lg shadow-xl top-full mt-2 right-0 text-xs text-gray-200">
                        <strong className="text-gray-300 block mb-2">Reality Simulation:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          x(t) = A·sin(ωt) + η(t)<br/>
                          η: OU process noise
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Generate ground truth with realistic disturbances.</p>
                        <p><strong>Intuition:</strong> Black line in charts. The "reality" our filter tries to track despite never directly observing it.</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Prediction Step */}
                  <div className="text-center text-gray-400 text-sm mb-2">↓ PREDICTION STEP ↓</div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Inertial Propagation */}
                    <div className="relative group">
                      <div className="h-16 bg-purple-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        Inertial<br/>Propagation
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-purple-400 rounded-lg shadow-xl top-full mt-2 left-0 w-96 text-xs text-gray-200">
                        <strong className="text-purple-400 block mb-2">State Prediction:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          x̄ₖ = F·xₖ₋₁ + B·uₖ<br/>
                          F = [1  dt; 0  1], B = [½dt²; dt]<br/>
                          uₖ = accelerometer measurement
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Use acceleration measurement to predict next position and velocity.</p>
                        <p><strong>Intuition:</strong> Dead reckoning - where do we think we are based on motion? Uncertainty grows due to imperfect model.</p>
                      </div>
                    </div>

                    {/* Jacobian */}
                    <div className="relative group">
                      <div className="h-16 bg-pink-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        Jacobian<br/>Linearization
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-pink-400 rounded-lg shadow-xl top-full mt-2 left-0 w-96 text-xs text-gray-200">
                        <strong className="text-pink-400 block mb-2">Linearization Matrices:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          F = ∂f/∂x (state transition)<br/>
                          H = ∂h/∂x (measurement model)<br/>
                          For linear case: F constant, H=[1 0]
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Linearize nonlinear dynamics for Gaussian propagation.</p>
                        <p><strong>Intuition:</strong> EKF approximates nonlinear system as locally linear. For our linear model, Jacobians are exact.</p>
                      </div>
                    </div>

                    {/* Covariance Prediction */}
                    <div className="relative group">
                      <div className="h-16 bg-violet-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        Covariance<br/>Prediction
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-violet-400 rounded-lg shadow-xl top-full mt-2 left-0 w-96 text-xs text-gray-200">
                        <strong className="text-violet-400 block mb-2">Uncertainty Propagation:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          P̄ₖ = F·Pₖ₋₁·Fᵀ + Q<br/>
                          Q = process noise covariance
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Grow uncertainty during prediction due to process noise.</p>
                        <p><strong>Intuition:</strong> Uncertainty grows when we predict without measurements. Q represents model imperfections. See Uncertainty chart.</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Update Step */}
                  <div className="text-center text-gray-400 text-sm mb-2">↓ UPDATE STEP ↓</div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {/* Kalman Gain */}
                    <div className="relative group">
                      <div className="h-16 bg-yellow-600 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        Kalman<br/>Gain
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-yellow-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                        <strong className="text-yellow-400 block mb-2">Optimal Weighting:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          K = P̄·Hᵀ·(H·P̄·Hᵀ + R)⁻¹<br/>
                          R = measurement noise covariance
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Balance trust between prediction and measurement.</p>
                        <p className="mb-1"><strong>Intuition:</strong> K→1: trust measurement (low P̄, high R). K→0: trust prediction (high P̄, low R).</p>
                        <p><strong>Chart:</strong> Kalman Gain chart shows K over time. Watch it adapt to changing uncertainty!</p>
                      </div>
                    </div>

                    {/* Innovation */}
                    <div className="relative group">
                      <div className="h-16 bg-orange-600 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        Innovation<br/>(Residual)
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-orange-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                        <strong className="text-orange-400 block mb-2">Measurement Residual:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          ỹ = zₖ - H·x̄ₖ<br/>
                          = (measured pos) - (predicted pos)
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Quantify prediction error using measurement.</p>
                        <p className="mb-1"><strong>Intuition:</strong> How surprised are we by the measurement? Large innovation means poor prediction.</p>
                        <p><strong>Chart:</strong> Innovation chart should be zero-mean white noise if filter is tuned correctly.</p>
                      </div>
                    </div>

                    {/* State Correction */}
                    <div className="relative group">
                      <div className="h-16 bg-green-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        State<br/>Correction
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-green-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                        <strong className="text-green-400 block mb-2">Posterior State Estimate:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          xₖ = x̄ₖ + K·ỹ<br/>
                          = prediction + correction
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Fuse prediction with measurement for optimal estimate.</p>
                        <p className="mb-1"><strong>Intuition:</strong> Pull prediction toward measurement by K·ỹ. This is the magic of Kalman filtering!</p>
                        <p><strong>Chart:</strong> Red line (EKF estimate) tracks black (true) by correcting predictions with measurements.</p>
                      </div>
                    </div>

                    {/* Covariance Update */}
                    <div className="relative group">
                      <div className="h-16 bg-teal-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                        Covariance<br/>Update
                      </div>
                      <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-teal-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                        <strong className="text-teal-400 block mb-2">Uncertainty Reduction:</strong>
                        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                          Pₖ = (I - K·H)·P̄ₖ<br/>
                          I = identity matrix
                        </div>
                        <p className="mb-1"><strong>Purpose:</strong> Reduce uncertainty after incorporating measurement.</p>
                        <p className="mb-1"><strong>Intuition:</strong> Measurements give us information, reducing uncertainty. Uncertainty decreases after update, grows after prediction.</p>
                        <p><strong>Chart:</strong> Uncertainty chart shows σ decreasing as filter converges, then stabilizing.</p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback arrow */}
                  <div className="text-center text-gray-400 text-sm">
                    ↑ Feedback Loop: Updated state becomes input to next prediction ↑
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Problem Description */}
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">The Tracking Problem</h2>
                <p className="text-gray-200 mb-6">
                  We simulate a mass oscillating along a wave trajectory. The goal is to estimate its position and velocity
                  using noisy, biased sensors.
                </p>

                {/* Two-column grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Wave Dynamics */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-blue-400">Wave Dynamics</h3>
                      <p className="text-gray-200 text-sm mb-2">
                        The true motion follows one of three wave patterns:
                      </p>
                      <div className="bg-gray-700 p-3 rounded font-mono text-xs text-gray-200 space-y-1">
                        <div><strong className="text-blue-300">Sine:</strong> x(t) = A·sin(ωt)</div>
                        <div><strong className="text-blue-300">Triangle:</strong> x(t) = piecewise linear ramp</div>
                        <div><strong className="text-blue-300">Square:</strong> x(t) = ±A (step function)</div>
                      </div>
                    </div>

                    {/* Process Noise */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-blue-400">Process Noise (Jitter)</h3>
                      <p className="text-gray-200 text-sm mb-2">
                        Random perturbations using an Ornstein-Uhlenbeck (OU) process - a mean-reverting stochastic process.
                      </p>
                      <div className="bg-gray-700 p-3 rounded font-mono text-xs text-gray-200">
                        dx = -α·x·dt + σ·dW<br/>
                        <span className="text-gray-400">α = 2.0, σ = jitter level</span>
                      </div>
                    </div>

                    {/* State Space */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-blue-400">State Space</h3>
                      <p className="text-gray-200 text-sm mb-2">
                        The filter estimates a 2D state vector:
                      </p>
                      <div className="bg-gray-700 p-3 rounded font-mono text-xs text-gray-200">
                        <strong className="text-blue-300">State:</strong> x = [position, velocity]<sup>T</sup><br/>
                        <strong className="text-blue-300">Dynamics:</strong> x<sub>k+1</sub> = F·x<sub>k</sub> + B·u<sub>k</sub> + w<sub>k</sub><br/>
                        <strong className="text-blue-300">Measurement:</strong> z<sub>k</sub> = H·x<sub>k</sub> + v<sub>k</sub>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Sensor Suite */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-blue-400">Sensor Suite</h3>
                      <div className="space-y-3">
                        <div className="bg-gray-700 p-3 rounded">
                          <h4 className="font-semibold text-green-400 text-sm mb-1">Inertial Sensor (Accelerometer)</h4>
                          <p className="text-gray-200 text-xs mb-2">
                            Measures acceleration directly. Used in the prediction step.
                            Subject to measurement noise and constant bias.
                          </p>
                          <div className="font-mono text-xs text-gray-300">
                            z<sub>accel</sub> = a<sub>true</sub> + b<sub>accel</sub> + n<sub>accel</sub>
                          </div>
                        </div>

                        <div className="bg-gray-700 p-3 rounded">
                          <h4 className="font-semibold text-purple-400 text-sm mb-1">External Probe (Position Sensor)</h4>
                          <p className="text-gray-200 text-xs mb-2">
                            Measures position directly. Used in the update step to correct predictions.
                            Also subject to noise and bias.
                          </p>
                          <div className="font-mono text-xs text-gray-300">
                            z<sub>pos</sub> = x<sub>true</sub> + b<sub>pos</sub> + n<sub>pos</sub>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Model Mismatch */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-blue-400">Model Mismatch</h3>
                      <p className="text-gray-200 text-sm">
                        The "TRUE" parameters represent reality. The "EKF" parameters represent the filter's assumptions.
                        Mismatch between them demonstrates how robust the filter is to incorrect models.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-600 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-2 text-white">Ready to Explore?</h3>
                <p className="text-gray-200 text-sm mb-4">
                  Click the button below or the <strong className="text-blue-300">+</strong> button next to the Welcome tab to create a new simulation.
                  You can create multiple simulations and rename them by hovering over the tab name. Try changing parameters in real-time and watch how the filter responds!
                </p>
                <button
                  onClick={addSimulationTab}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium transition-colors"
                >
                  Create New Simulation →
                </button>
              </div>
            </div>

          </div>
        </div>

      <div className={`flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 overflow-hidden bg-gray-900 ${activeTabId !== 'welcome' ? '' : 'hidden'}`}>

        {/* LEFT COLUMN: Controls with scroll */}
        <div className="space-y-3 overflow-y-auto pr-2" style={{maxHeight: 'calc(100vh - 120px)'}}>
          {/* Control buttons */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleStart}
              className="w-12 h-12 bg-green-700 text-white rounded-lg hover:bg-green-600 text-2xl disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              disabled={isRunning}
              title="Start"
            >
              ▶
            </button>
            <button
              onClick={handlePause}
              className="w-12 h-12 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 text-xl disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              disabled={!isRunning}
              title="Pause"
            >
              ❚❚
            </button>
            <button
              onClick={handleReset}
              className="w-12 h-12 bg-blue-700 text-white rounded-lg hover:bg-blue-600 text-2xl flex items-center justify-center shadow-lg"
              title="Reset"
            >
              ↺
            </button>
            <button
              onClick={handleRestart}
              className="w-12 h-12 bg-orange-600 text-white rounded-lg hover:bg-orange-500 text-2xl flex items-center justify-center shadow-lg"
              title="Restart"
            >
              ↻
            </button>
          </div>

          {/* Parameter controls */}
          {/* Wave Parameters */}
          <div className="border border-gray-600 rounded p-3 bg-gray-800 shadow-lg">
            <div className="relative tooltip-delay-group inline-block mb-2">
              <h3 className="font-semibold text-gray-300 text-sm">Wave Parameters</h3>
              <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                <strong className="text-blue-400 block mb-1">Wave Motion Controls</strong>
                <p>Configure the analytical wave trajectory that the mass follows. Frequency sets oscillation rate, Scale adjusts amplitude, Type selects wave shape (sine/triangle/square), and Jitter adds realistic process noise.</p>
              </div>
            </div>

            {/* Frequency and Scale */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="relative tooltip-delay-group">
                <label className="block text-xs font-medium mb-1 text-gray-200">
                  Frequency: <span className="text-blue-400">{frequency.toFixed(1)} Hz</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <strong className="text-blue-400 block mb-1">Wave Frequency</strong>
                  <p className="mb-1"><strong>Current:</strong> {frequency.toFixed(1)} Hz</p>
                  <p className="mb-1"><strong>Range:</strong> 0.1 - 2.0 Hz</p>
                  <p><strong>Effect:</strong> Controls how fast the wave oscillates. Higher frequency = faster oscillation, more challenging for filter to track.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={decrementFrequency} className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▼</button>
                  <button onClick={incrementFrequency} className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▲</button>
                </div>
              </div>
              <div className="relative tooltip-delay-group">
                <label className="block text-xs font-medium mb-1 text-gray-200">
                  Scale: <span className="text-blue-400">{scale.toFixed(1)}x</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <strong className="text-blue-400 block mb-1">Wave Amplitude Scale</strong>
                  <p className="mb-1"><strong>Current:</strong> {scale.toFixed(1)}x</p>
                  <p className="mb-1"><strong>Range:</strong> 0.5x - 10.0x</p>
                  <p><strong>Effect:</strong> Multiplies wave amplitude. Larger scale = bigger oscillations, larger position values on charts.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={decrementScale} className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▼</button>
                  <button onClick={incrementScale} className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▲</button>
                </div>
              </div>
            </div>

            {/* Wave Type and Jitter side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Wave Type */}
              <div className="relative tooltip-delay-group">
                <label className="block text-xs font-medium mb-1 text-gray-200">
                  Type: <span className="text-blue-400">{waveType.charAt(0).toUpperCase() + waveType.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <strong className="text-blue-400 block mb-1">Wave Type</strong>
                  <p className="mb-1"><strong>Current:</strong> {waveType.charAt(0).toUpperCase() + waveType.slice(1)}</p>
                  <p className="mb-1"><strong>Sine:</strong> Smooth sinusoidal motion (x=A·sin(ωt))</p>
                  <p className="mb-1"><strong>Triangle:</strong> Linear ramps up/down</p>
                  <p><strong>Square:</strong> Abrupt jumps between ±A</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setWaveType('sine')}
                    className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                      waveType === 'sine'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                    title="Sine"
                  >
                    ∿
                  </button>
                  <button
                    onClick={() => setWaveType('triangle')}
                    className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                      waveType === 'triangle'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Triangle"
                  >
                    △
                  </button>
                  <button
                    onClick={() => setWaveType('square')}
                    className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                      waveType === 'square'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                    title="Square"
                  >
                    ⊓⊔
                  </button>
                </div>
              </div>

              {/* Jitter */}
              <div className="relative tooltip-delay-group">
                <label className="block text-xs font-medium mb-1 text-gray-200">
                  Jitter: <span className="text-blue-400">{jitter.charAt(0).toUpperCase() + jitter.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <strong className="text-blue-400 block mb-1">Process Noise (Jitter)</strong>
                  <p className="mb-1"><strong>Current:</strong> {jitter.charAt(0).toUpperCase() + jitter.slice(1)} (σ = {window.Config.JITTER_LEVELS[jitter]})</p>
                  <p className="mb-1"><strong>Range:</strong> Zero (0) to High (1.0)</p>
                  <p><strong>Effect:</strong> Adds Ornstein-Uhlenbeck process noise to true trajectory. Perturbs position/velocity from ideal wave. Higher jitter = more realistic disturbances, harder tracking problem.</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setJitter('zero')}
                    className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                      jitter === 'zero'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                  >
                    Ø
                  </button>
                  <button
                    onClick={() => setJitter('low')}
                    className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                      jitter === 'low'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setJitter('med')}
                    className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                      jitter === 'med'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setJitter('high')}
                    className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                      jitter === 'high'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                  >
                    H
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Inertial Sensor */}
        <div className="border border-gray-600 rounded p-3 bg-gray-800 shadow-lg">
          <div className="relative tooltip-delay-group inline-block mb-2">
            <h3 className="font-semibold text-gray-300 text-sm">Inertial Sensor</h3>
            <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-green-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
              <strong className="text-green-400 block mb-1">Accelerometer (Inertial Measurement Unit)</strong>
              <p className="mb-1">Measures acceleration directly. Used in the <strong>prediction step</strong> to propagate state forward in time.</p>
              <p className="mb-1"><strong>Measurement:</strong> z = a_true + bias + noise</p>
              <p className="mb-1"><strong>TRUE:</strong> Reality's actual sensor characteristics</p>
              <p><strong>EKF:</strong> Filter's assumptions about sensor (can mismatch!)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Noise Column */}
            <div>
              <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Noise</p>
              <div className="mb-2">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueInertialNoise.charAt(0).toUpperCase() + trueInertialNoise.slice(1)}</span>
                </label>
                <div className="relative tooltip-delay-group">
                  <div className="flex">
                    <button
                      onClick={() => setTrueInertialNoise('zero')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        trueInertialNoise === 'zero'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } rounded-l`}
                    >
                      Ø
                    </button>
                    <button
                      onClick={() => setTrueInertialNoise('low')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        trueInertialNoise === 'low'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      L
                    </button>
                    <button
                      onClick={() => setTrueInertialNoise('med')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        trueInertialNoise === 'med'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => setTrueInertialNoise('high')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        trueInertialNoise === 'high'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } rounded-r`}
                    >
                      H
                    </button>
                  </div>
                  <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-blue-400 rounded-lg shadow-xl bottom-full mb-2 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                    <p className="mb-2">Random zero-mean Gaussian noise added to each acceleration measurement. Range: 0 (zero) to 0.5 (high).</p>
                    <p className="mb-1"><strong>TRUE Value:</strong> {window.Config.NOISE_LEVELS[trueInertialNoise]}</p>
                    <p>Actual noise in the real sensor. Affects measurements used for prediction.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfProcessNoise.charAt(0).toUpperCase() + ekfProcessNoise.slice(1)}</span>
                </label>
                <div className="relative tooltip-delay-group">
                  <div className="flex">
                    <button
                      onClick={() => setEkfProcessNoise('zero')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        ekfProcessNoise === 'zero'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } rounded-l`}
                    >
                      Ø
                    </button>
                    <button
                      onClick={() => setEkfProcessNoise('low')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        ekfProcessNoise === 'low'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      L
                    </button>
                    <button
                      onClick={() => setEkfProcessNoise('med')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        ekfProcessNoise === 'med'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => setEkfProcessNoise('high')}
                      className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                        ekfProcessNoise === 'high'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } rounded-r`}
                    >
                      H
                    </button>
                  </div>
                  <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-blue-400 rounded-lg shadow-xl bottom-full mb-2 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                    <p className="mb-2">Random zero-mean Gaussian noise added to each acceleration measurement. Range: 0 (zero) to 0.5 (high).</p>
                    <p className="mb-1"><strong>EKF Value:</strong> {window.Config.NOISE_LEVELS[ekfProcessNoise]}</p>
                    <p>Filter's assumption about sensor noise. Mismatch from TRUE tests filter robustness!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bias Column */}
            <div>
              <div className="relative tooltip-delay-group inline-block w-full">
                <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Bias</p>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-green-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <strong className="text-green-400 block mb-1">Constant Bias Offset</strong>
                  <p>Systematic offset added to all acceleration measurements. Range: 0 (zero) to 1.0 (high).</p>
                </div>
              </div>
              <div className="mb-2 relative tooltip-delay-group">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueInertialBias.charAt(0).toUpperCase() + trueInertialBias.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <p className="mb-1"><strong>Value:</strong> {window.Config.BIAS_LEVELS[trueInertialBias]}</p>
                  <p>Actual constant bias in the real sensor.</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setTrueInertialBias('zero')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueInertialBias === 'zero'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                  >
                    Ø
                  </button>
                  <button
                    onClick={() => setTrueInertialBias('low')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueInertialBias === 'low'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setTrueInertialBias('med')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueInertialBias === 'med'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setTrueInertialBias('high')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueInertialBias === 'high'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                  >
                    H
                  </button>
                </div>
              </div>
              <div className="relative tooltip-delay-group">
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfInertialBias.charAt(0).toUpperCase() + ekfInertialBias.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <p className="mb-1"><strong>Value:</strong> {window.Config.BIAS_LEVELS[ekfInertialBias]}</p>
                  <p>Filter's assumption about sensor bias. The filter compensates for this bias during prediction.</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setEkfInertialBias('zero')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfInertialBias === 'zero'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                  >
                    Ø
                  </button>
                  <button
                    onClick={() => setEkfInertialBias('low')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfInertialBias === 'low'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setEkfInertialBias('med')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfInertialBias === 'med'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setEkfInertialBias('high')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfInertialBias === 'high'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                  >
                    H
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* External Probe */}
        <div className="border border-gray-600 rounded p-3 bg-gray-800 shadow-lg">
          <div className="relative tooltip-delay-group inline-block mb-2">
            <h3 className="font-semibold text-gray-300 text-sm">External Probe</h3>
            <div className="tooltip-content absolute z-[999999] p-3 bg-gray-700 border border-purple-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
              <strong className="text-purple-400 block mb-1">Position Sensor (External Reference)</strong>
              <p className="mb-1">Measures position directly. Used in the <strong>update step</strong> to correct state predictions with actual measurements.</p>
              <p className="mb-1"><strong>Measurement:</strong> z = x_true + bias + noise</p>
              <p className="mb-1"><strong>TRUE:</strong> Reality's actual sensor characteristics</p>
              <p><strong>EKF:</strong> Filter's assumptions about sensor (can mismatch!)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Noise Column */}
            <div>
              <div className="relative tooltip-delay-group inline-block w-full">
                <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Noise</p>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-purple-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <strong className="text-purple-400 block mb-1">Measurement Noise</strong>
                  <p>Random zero-mean Gaussian noise added to each position measurement. Range: 0 (zero) to 0.3 (high).</p>
                </div>
              </div>
              <div className="mb-2 relative tooltip-delay-group">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueProbeNoise.charAt(0).toUpperCase() + trueProbeNoise.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <p className="mb-1"><strong>Value:</strong> {window.Config.PROBE_NOISE_LEVELS[trueProbeNoise]}</p>
                  <p>Actual noise in the real position sensor. Affects measurements used for state correction.</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setTrueProbeNoise('zero')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeNoise === 'zero'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                  >
                    Ø
                  </button>
                  <button
                    onClick={() => setTrueProbeNoise('low')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeNoise === 'low'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setTrueProbeNoise('med')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeNoise === 'med'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setTrueProbeNoise('high')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeNoise === 'high'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                  >
                    H
                  </button>
                </div>
              </div>
              <div className="relative tooltip-delay-group">
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfProbeNoise.charAt(0).toUpperCase() + ekfProbeNoise.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <p className="mb-1"><strong>Value:</strong> {window.Config.PROBE_NOISE_LEVELS[ekfProbeNoise]}</p>
                  <p>Filter's assumption about position sensor noise. Used to weight measurements vs predictions.</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setEkfProbeNoise('zero')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeNoise === 'zero'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                  >
                    Ø
                  </button>
                  <button
                    onClick={() => setEkfProbeNoise('low')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeNoise === 'low'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setEkfProbeNoise('med')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeNoise === 'med'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setEkfProbeNoise('high')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeNoise === 'high'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                  >
                    H
                  </button>
                </div>
              </div>
            </div>

            {/* Bias Column */}
            <div>
              <div className="relative tooltip-delay-group inline-block w-full">
                <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Bias</p>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-purple-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <strong className="text-purple-400 block mb-1">Constant Bias Offset</strong>
                  <p>Systematic offset added to all position measurements. Range: 0 (zero) to 0.8 (high).</p>
                </div>
              </div>
              <div className="mb-2 relative tooltip-delay-group">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueProbeBias.charAt(0).toUpperCase() + trueProbeBias.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <p className="mb-1"><strong>Value:</strong> {window.Config.PROBE_BIAS_LEVELS[trueProbeBias]}</p>
                  <p>Actual constant bias in the real position sensor.</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setTrueProbeBias('zero')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeBias === 'zero'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                  >
                    Ø
                  </button>
                  <button
                    onClick={() => setTrueProbeBias('low')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeBias === 'low'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setTrueProbeBias('med')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeBias === 'med'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setTrueProbeBias('high')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      trueProbeBias === 'high'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                  >
                    H
                  </button>
                </div>
              </div>
              <div className="relative tooltip-delay-group">
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfProbeBias.charAt(0).toUpperCase() + ekfProbeBias.slice(1)}</span>
                </label>
                <div className="tooltip-content absolute z-[999999] p-2 bg-gray-700 border border-blue-400 rounded-lg shadow-xl top-full mt-1 left-1/2 -translate-x-1/2 w-full max-w-xs text-xs text-gray-200">
                  <p className="mb-1"><strong>Value:</strong> {window.Config.PROBE_BIAS_LEVELS[ekfProbeBias]}</p>
                  <p>Filter's assumption about position sensor bias. The filter compensates for this bias during updates.</p>
                </div>
                <div className="flex">
                  <button
                    onClick={() => setEkfProbeBias('zero')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeBias === 'zero'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-l`}
                  >
                    Ø
                  </button>
                  <button
                    onClick={() => setEkfProbeBias('low')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeBias === 'low'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setEkfProbeBias('med')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeBias === 'med'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setEkfProbeBias('high')}
                    className={`flex-1 px-1.5 py-1 text-xs font-medium transition-colors ${
                      ekfProbeBias === 'high'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } rounded-r`}
                  >
                    H
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* RIGHT SIDE: Plots with scroll */}
        <div className="lg:col-span-3 overflow-y-auto pr-2" style={{maxHeight: 'calc(100vh - 120px)'}}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row 1: Position Tracking (spanning 2 cols) */}
          <div className="md:col-span-2 h-80">
            <canvas ref={positionChartRef}></canvas>
          </div>

          {/* Row 2: Acceleration | Velocity */}
          <div className="h-64">
            <canvas ref={accelChartRef}></canvas>
          </div>
          <div className="h-64">
            <canvas ref={velocityChartRef}></canvas>
          </div>

          {/* Row 3: Innovation | Kalman Gain */}
          <div className="h-64">
            <canvas ref={innovationChartRef}></canvas>
          </div>
          <div className="h-64">
            <canvas ref={kalmanGainChartRef}></canvas>
          </div>

          {/* Row 4: Uncertainty | Position Error */}
          <div className="h-64">
            <canvas ref={uncertaintyChartRef}></canvas>
          </div>
          <div className="h-64">
            <canvas ref={errorChartRef}></canvas>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for use in app.html
window.EKFVisualization = EKFVisualization;
