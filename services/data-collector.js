/**
 * Manages time-series data arrays with viewport windowing
 * Stores unlimited historical data, provides viewport windows for rendering
 */
class DataCollector {
  /**
   * @param {number} viewportSize - Number of points to show in viewport (default: 400)
   */
  constructor(viewportSize = 400) {
    this.viewportSize = viewportSize;
    this.maxHistoryPoints = viewportSize * 10;  // Limit history to 10x viewport (4000 points)
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
   * Implements FIFO trimming at 10x viewport size (4000 points)
   * @param {Object} point - Data point with keys matching data arrays
   */
  addPoint(point) {
    // Add values to corresponding arrays
    Object.keys(point).forEach(key => {
      if (this.data.hasOwnProperty(key)) {
        this.data[key].push(point[key]);
      }
    });

    // FIFO trimming: drop oldest data if exceeding limit
    const currentLength = this.data.times.length;
    if (currentLength > this.maxHistoryPoints) {
      const trimCount = currentLength - this.maxHistoryPoints;
      Object.keys(this.data).forEach(key => {
        this.data[key].splice(0, trimCount);  // Remove oldest entries
      });
    }
  }

  /**
   * Get all data arrays (legacy method - returns full history)
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
   * Get a viewport window of data for rendering
   * @param {number|null} endIndex - End index (null = "live mode", show latest data)
   * @returns {Object} Viewport data with metadata
   */
  getViewportData(endIndex = null) {
    const totalPoints = this.data.times.length;

    // endIndex = null means "live mode" (show latest viewportSize points)
    // endIndex = number means "historical mode" (show viewportSize points ending at endIndex)
    const end = endIndex === null ? totalPoints : Math.min(endIndex, totalPoints);
    const start = Math.max(0, end - this.viewportSize);

    // Extract viewport slice from each array
    const viewportData = {};
    Object.keys(this.data).forEach(key => {
      viewportData[key] = this.data[key].slice(start, end);
    });

    return {
      data: viewportData,
      start: start,
      end: end,
      total: totalPoints,
      isLive: endIndex === null
    };
  }

  /**
   * Clear all historical data
   * Used for long-running simulations to free memory
   */
  clearHistory() {
    Object.keys(this.data).forEach(key => {
      this.data[key] = [];
    });
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
