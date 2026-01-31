/**
 * Configuration constants for the EKF simulation
 */

// Inertial sensor noise level mappings
const NOISE_LEVELS = {
  zero: 0,
  low: 0.05,
  med: 0.2,
  high: 0.5
};

// Inertial sensor bias level mappings
const BIAS_LEVELS = {
  zero: 0,
  low: 0.1,
  med: 0.5,
  high: 1.0
};

// External probe noise level mappings
const PROBE_NOISE_LEVELS = {
  zero: 0,
  low: 0.02,
  med: 0.1,
  high: 0.3
};

// External probe bias level mappings
const PROBE_BIAS_LEVELS = {
  zero: 0,
  low: 0.1,
  med: 0.3,
  high: 0.8
};

// Jitter (acceleration noise) level mappings
const JITTER_LEVELS = {
  zero: 0,
  low: 0.1,
  med: 0.5,
  high: 1.0
};

// Default parameter values
const DEFAULTS = {
  trueInertialNoise: 'low',
  trueInertialBias: 'low',
  ekfProcessNoise: 'low',
  ekfInertialBias: 'low',
  trueProbeNoise: 'low',
  trueProbeBias: 'low',
  ekfProbeNoise: 'low',
  ekfProbeBias: 'low',
  jitter: 'low',
  frequency: 0.5,
  amplitude: 1.0,
  waveType: 'sine'
};

// Ornstein-Uhlenbeck process configuration
const OU_ALPHA = 2.0;  // Reversion rate: higher = faster return to equilibrium
                        // Autocorrelation time τ = 1/α = 0.5 seconds

// Export to global scope
window.Config = {
  NOISE_LEVELS,
  BIAS_LEVELS,
  PROBE_NOISE_LEVELS,
  PROBE_BIAS_LEVELS,
  JITTER_LEVELS,
  DEFAULTS,
  OU_ALPHA
};
