/**
 * Kalman Filter implementation for position/velocity tracking
 *
 * Mathematical derivation: see FILTER_MATH.md
 *
 * State: x = [position, velocity]^T
 * Model: Constant acceleration with process noise (CWNA)
 * Measurement: Position only (H = [1, 0])
 *
 * Note: Despite class name, this is a LINEAR Kalman filter - no Jacobians needed
 * since both state transition and measurement are linear functions.
 */

class ExtendedKalmanFilter {
  /**
   * Initialize the EKF with state vector [position, velocity]
   * @param {number} initialPosition - Initial position estimate
   * @param {number} initialVelocity - Initial velocity estimate
   * @param {number} initialPositionUncertainty - Initial position uncertainty (variance)
   * @param {number} initialVelocityUncertainty - Initial velocity uncertainty (variance)
   */
  constructor(initialPosition = 0, initialVelocity = 0, initialPositionUncertainty = 100, initialVelocityUncertainty = 10) {
    // State vector: [position, velocity]
    this.x = [initialPosition, initialVelocity];

    // Covariance matrix: uncertainty in state estimate
    this.P = [
      [initialPositionUncertainty, 0],
      [0, initialVelocityUncertainty]
    ];

    // Last computed values (for visualization)
    this.lastInnovation = 0;
    this.lastKalmanGain = [0, 0];
    this.lastPredictedState = [0, 0];
  }

  /**
   * Reset the filter to initial state
   * @param {number} position - Initial position
   * @param {number} velocity - Initial velocity
   * @param {number} posUncertainty - Initial position uncertainty
   * @param {number} velUncertainty - Initial velocity uncertainty
   */
  reset(position = 0, velocity = 0, posUncertainty = 100, velUncertainty = 10) {
    this.x = [position, velocity];
    this.P = [[posUncertainty, 0], [0, velUncertainty]];
    this.lastInnovation = 0;
    this.lastKalmanGain = [0, 0];
    this.lastPredictedState = [0, 0];
  }

  /**
   * Prediction step: predict next state using acceleration measurement
   *
   * Math: FILTER_MATH.md § Prediction Step
   *   x̂⁻ = F·x̂⁺ + B·u  where u = a - bias
   *   P⁻ = F·P⁺·Fᵀ + Q
   *
   * @param {number} measuredAccel - Acceleration measurement from inertial sensor
   * @param {number} bias - Estimated bias to subtract from measurement
   * @param {number} processNoise - Process noise standard deviation (σₐ)
   * @param {number} dt - Time step (Δt)
   */
  predict(measuredAccel, bias, processNoise, dt) {
    // Control input: bias-corrected acceleration
    const correctedAccel = measuredAccel - bias;

    // Predicted state: x̂⁻ = F·x̂⁺ + B·u
    // Expanded: p̂⁻ = p̂⁺ + v̂⁺·Δt + ½·a·Δt²
    //           v̂⁻ = v̂⁺ + a·Δt
    this.lastPredictedState = [
      this.x[0] + this.x[1] * dt + 0.5 * correctedAccel * dt * dt,
      this.x[1] + correctedAccel * dt
    ];

    // State transition matrix: F = [[1, Δt], [0, 1]]
    const F = [
      [1, dt],
      [0, 1]
    ];

    // Process noise covariance (CWNA model): Q = σₐ²·[[Δt⁴/4, Δt³/2], [Δt³/2, Δt²]]
    // See FILTER_MATH.md § Process Noise Model for derivation
    const Q = [
      [processNoise * processNoise * dt * dt * dt * dt / 4, processNoise * processNoise * dt * dt * dt / 2],
      [processNoise * processNoise * dt * dt * dt / 2, processNoise * processNoise * dt * dt]
    ];

    // Predicted covariance: P⁻ = F·P⁺·Fᵀ + Q
    const FP = [
      [
        F[0][0] * this.P[0][0] + F[0][1] * this.P[1][0],
        F[0][0] * this.P[0][1] + F[0][1] * this.P[1][1]
      ],
      [
        F[1][0] * this.P[0][0] + F[1][1] * this.P[1][0],
        F[1][0] * this.P[0][1] + F[1][1] * this.P[1][1]
      ]
    ];

    const P_pred = [
      [FP[0][0] * F[0][0] + FP[0][1] * F[0][1] + Q[0][0], FP[0][0] * F[1][0] + FP[0][1] * F[1][1] + Q[0][1]],
      [FP[1][0] * F[0][0] + FP[1][1] * F[0][1] + Q[1][0], FP[1][0] * F[1][0] + FP[1][1] * F[1][1] + Q[1][1]]
    ];

    return P_pred;
  }

  /**
   * Update step: fuse position measurement from external probe
   *
   * Math: FILTER_MATH.md § Update Step
   *   y = z - H·x̂⁻           (innovation)
   *   S = H·P⁻·Hᵀ + R        (innovation covariance)
   *   K = P⁻·Hᵀ·S⁻¹          (Kalman gain)
   *   x̂⁺ = x̂⁻ + K·y          (updated state)
   *   P⁺ = (I - K·H)·P⁻      (updated covariance)
   *
   * @param {number} positionMeasurement - Position measurement from probe
   * @param {number} bias - Estimated bias to subtract from measurement
   * @param {number} measurementNoise - Measurement noise standard deviation (σz)
   * @param {Array} P_pred - Predicted covariance (P⁻) from predict step
   */
  update(positionMeasurement, bias, measurementNoise, P_pred) {
    // Bias-corrected measurement
    const correctedMeasurement = positionMeasurement - bias;

    // Measurement matrix: H = [1, 0] (observe position only)
    const H = [1, 0];

    // Predicted measurement: ẑ = H·x̂⁻ = p̂⁻
    const z_pred = this.lastPredictedState[0];

    // Innovation: y = z - ẑ
    this.lastInnovation = correctedMeasurement - z_pred;

    // Innovation covariance: S = H·P⁻·Hᵀ + R = P⁻₁₁ + σz²
    const R = measurementNoise * measurementNoise;
    const S = H[0] * P_pred[0][0] * H[0] + R;

    // Kalman gain: K = P⁻·Hᵀ·S⁻¹ = [P⁻₁₁/S, P⁻₂₁/S]ᵀ
    this.lastKalmanGain = [
      P_pred[0][0] * H[0] / S,
      P_pred[1][0] * H[0] / S
    ];

    // Updated state: x̂⁺ = x̂⁻ + K·y
    this.x = [
      this.lastPredictedState[0] + this.lastKalmanGain[0] * this.lastInnovation,
      this.lastPredictedState[1] + this.lastKalmanGain[1] * this.lastInnovation
    ];

    // Updated covariance: P⁺ = (I - K·H)·P⁻
    // Note: Simple form used; Joseph form would be more numerically stable
    const I_KH = [
      [1 - this.lastKalmanGain[0] * H[0], -this.lastKalmanGain[0] * H[1]],
      [-this.lastKalmanGain[1] * H[0], 1 - this.lastKalmanGain[1] * H[1]]
    ];

    this.P = [
      [
        I_KH[0][0] * P_pred[0][0] + I_KH[0][1] * P_pred[1][0],
        I_KH[0][0] * P_pred[0][1] + I_KH[0][1] * P_pred[1][1]
      ],
      [
        I_KH[1][0] * P_pred[0][0] + I_KH[1][1] * P_pred[1][0],
        I_KH[1][0] * P_pred[0][1] + I_KH[1][1] * P_pred[1][1]
      ]
    ];
  }

  /**
   * Full prediction and update cycle
   * @param {number} measuredAccel - Acceleration measurement
   * @param {number} accelBias - Acceleration bias estimate
   * @param {number} processNoise - Process noise std dev
   * @param {number} positionMeasurement - Position measurement
   * @param {number} posBias - Position bias estimate
   * @param {number} measurementNoise - Measurement noise std dev
   * @param {number} dt - Time step
   */
  step(measuredAccel, accelBias, processNoise, positionMeasurement, posBias, measurementNoise, dt) {
    const P_pred = this.predict(measuredAccel, accelBias, processNoise, dt);
    this.update(positionMeasurement, posBias, measurementNoise, P_pred);
  }

  /**
   * Get current state estimate
   * @returns {Array} [position, velocity]
   */
  getState() {
    return [...this.x];
  }

  /**
   * Get current covariance (uncertainty)
   * @returns {Array} 2x2 covariance matrix
   */
  getCovariance() {
    return [
      [...this.P[0]],
      [...this.P[1]]
    ];
  }

  /**
   * Get position standard deviation (square root of position variance)
   * @returns {number} Position uncertainty
   */
  getPositionUncertainty() {
    return Math.sqrt(Math.max(0, this.P[0][0]));
  }

  /**
   * Get velocity standard deviation (square root of velocity variance)
   * @returns {number} Velocity uncertainty
   */
  getVelocityUncertainty() {
    return Math.sqrt(Math.max(0, this.P[1][1]));
  }

  /**
   * Get last innovation (measurement residual)
   * @returns {number} Innovation
   */
  getInnovation() {
    return this.lastInnovation;
  }

  /**
   * Get last Kalman gain values
   * @returns {Array} [K_position, K_velocity]
   */
  getKalmanGain() {
    return [...this.lastKalmanGain];
  }
}

// Export to global scope
window.ExtendedKalmanFilter = ExtendedKalmanFilter;
