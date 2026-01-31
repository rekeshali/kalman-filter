/**
 * Manages time-series data arrays with windowing
 * Implements sliding window of last N points for all 13 datasets
 */
class DataCollector {
  /**
   * @param {number} maxPoints - Maximum points to keep (sliding window size)
   */
  constructor(maxPoints = 400) {
    this.maxPoints = maxPoints;
    this.reset();
  }

  /**
   * Reset all data arrays
   */
  reset() {
    this.data = {
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
    };
  }

  /**
   * Add a new data point to all arrays
   * @param {Object} point - Data point with keys matching data arrays
   */
  addPoint(point) {
    // Add values to corresponding arrays
    Object.keys(point).forEach(key => {
      if (this.data.hasOwnProperty(key)) {
        this.data[key].push(point[key]);
      }
    });

    // Trim to maintain window size
    this.trim();
  }

  /**
   * Trim all arrays to maxPoints
   * @returns {number} Number of points removed
   */
  trim() {
    let removed = 0;
    Object.keys(this.data).forEach(key => {
      while (this.data[key].length > this.maxPoints) {
        this.data[key].shift();
        removed++;
      }
    });
    return removed;
  }

  /**
   * Get all data arrays
   * @returns {Object} Copy of all data arrays
   */
  getData() {
    // Return shallow copy to prevent external modification
    const result = {};
    Object.keys(this.data).forEach(key => {
      result[key] = [...this.data[key]];
    });
    return result;
  }

  /**
   * Get the latest data point
   * @returns {Object} Latest value from each array
   */
  getLatest() {
    const result = {};
    Object.keys(this.data).forEach(key => {
      const arr = this.data[key];
      result[key] = arr.length > 0 ? arr[arr.length - 1] : null;
    });
    return result;
  }

  /**
   * Get current number of data points
   * @returns {number} Number of points stored
   */
  getLength() {
    // All arrays should have the same length
    return this.data.times.length;
  }

  /**
   * Check if collector has data
   * @returns {boolean} True if data exists
   */
  hasData() {
    return this.getLength() > 0;
  }
}

// Export to global scope
window.DataCollector = DataCollector;
