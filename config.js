/**
 * Configuration constants for the EKF simulation
 *
 * NOISE LEVEL RATIONALE (Issue #50):
 * The Kalman gain K[0] = P⁻₁₁ / (P⁻₁₁ + R) where R = σz² (measurement noise variance).
 * Process noise contributes to P via Q matrix (CWNA model):
 *   Q[0][0] = σₐ² × dt⁴/4  (position - tiny due to dt⁴)
 *   Q[1][0] = σₐ² × dt³/2  (cross-covariance - 40× larger than Q[0][0])
 *   Q[1][1] = σₐ² × dt²    (velocity - 1600× larger than Q[0][0])
 *
 * To keep velocity gain K[1] < 1, we need moderate σₐ values.
 * K[0] will trend toward 1 (trust measurements) but responds to parameter changes.
 *
 * At 'med' settings: σₐ=30, σz=0.5 → K[0] ≈ 0.7-0.9, K[1] < 0.5
 */

// Inertial sensor noise level mappings (TRUE noise in simulation)
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

// External probe noise level mappings (TRUE noise in simulation)
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

// EKF process noise level mappings (what the filter THINKS the noise is)
// Moderate values to keep K[1] (velocity gain) below 1 while K[0] responds
const EKF_PROCESS_NOISE_LEVELS = {
  zero: 0,
  low: 10,
  med: 30,
  high: 60
};

// EKF measurement noise level mappings (what the filter THINKS the probe noise is)
const EKF_PROBE_NOISE_LEVELS = {
  zero: 0,
  low: 0.2,
  med: 0.5,
  high: 1.0
};

// Default parameter values
// Set to 'med' for balanced K ≈ 0.5 at neutral position
const DEFAULTS = {
  trueInertialNoise: 'low',
  trueInertialBias: 'zero',
  ekfProcessNoise: 'med',
  ekfInertialBias: 'zero',
  trueProbeNoise: 'low',
  trueProbeBias: 'zero',
  ekfProbeNoise: 'med',
  ekfProbeBias: 'zero',
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
  EKF_PROCESS_NOISE_LEVELS,
  EKF_PROBE_NOISE_LEVELS,
  DEFAULTS,
  OU_ALPHA
};
