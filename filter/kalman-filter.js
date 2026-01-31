/**
 * Extended Kalman Filter implementation for position/velocity tracking
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
   * @param {number} measuredAccel - Acceleration measurement from inertial sensor
   * @param {number} bias - Estimated bias to subtract from measurement
   * @param {number} processNoise - Process noise standard deviation
   * @param {number} dt - Time step
   */
  predict(measuredAccel, bias, processNoise, dt) {
    // Correct the acceleration measurement for known bias
    const correctedAccel = measuredAccel - bias;

    // State transition with constant acceleration model
    // x_pred = x + v·dt + 0.5·a·dt²
    // v_pred = v + a·dt
    this.lastPredictedState = [
      this.x[0] + this.x[1] * dt + 0.5 * correctedAccel * dt * dt,
      this.x[1] + correctedAccel * dt
    ];

    // State transition matrix F
    const F = [
      [1, dt],
      [0, 1]
    ];

    // Process noise covariance Q (continuous white noise acceleration model)
    const Q = [
      [processNoise * processNoise * dt * dt * dt * dt / 4, processNoise * processNoise * dt * dt * dt / 2],
      [processNoise * processNoise * dt * dt * dt / 2, processNoise * processNoise * dt * dt]
    ];

    // Predict covariance: P_pred = F·P·F^T + Q
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
   * @param {number} positionMeasurement - Position measurement from probe
   * @param {number} bias - Estimated bias to subtract from measurement
   * @param {number} measurementNoise - Measurement noise standard deviation
   * @param {Array} P_pred - Predicted covariance from predict step
   */
  update(positionMeasurement, bias, measurementNoise, P_pred) {
    // Correct the position measurement for known bias
    const correctedMeasurement = positionMeasurement - bias;

    // Measurement model: H = [1, 0] (we only observe position, not velocity)
    const H = [1, 0];

    // Predicted measurement: what we expect to see
    const z_pred = this.lastPredictedState[0];

    // Innovation (measurement residual): actual - predicted
    this.lastInnovation = correctedMeasurement - z_pred;

    // Innovation covariance: S = H·P·H^T + R
    const R = measurementNoise * measurementNoise;
    const S = H[0] * P_pred[0][0] * H[0] + R;

    // Kalman gain: K = P·H^T / S
    this.lastKalmanGain = [
      P_pred[0][0] * H[0] / S,
      P_pred[1][0] * H[0] / S
    ];

    // Update state: x = x_pred + K·innovation
    this.x = [
      this.lastPredictedState[0] + this.lastKalmanGain[0] * this.lastInnovation,
      this.lastPredictedState[1] + this.lastKalmanGain[1] * this.lastInnovation
    ];

    // Update covariance: P = (I - K·H)·P_pred
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
