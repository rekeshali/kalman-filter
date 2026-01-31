/**
 * ChartManager - Manages Chart.js instances with auto-scaling
 * Abstracts chart lifecycle: initialization, updates, clearing, destruction
 */
class ChartManager {
  constructor() {
    this.charts = new Map(); // chartId -> Chart.js instance
    this.chartCounter = 0;
  }

  /**
   * Initialize a new Chart.js instance
   * @param {HTMLCanvasElement} canvasElement - Canvas DOM element
   * @param {string} type - Chart type (e.g., 'line')
   * @param {Object} config - Chart.js configuration object
   * @returns {string} chartId - Unique identifier for this chart
   */
  initializeChart(canvasElement, type, config) {
    if (!canvasElement) {
      console.error('ChartManager: Canvas element is required');
      return null;
    }

    const ctx = canvasElement.getContext('2d');
    const chartId = `chart-${this.chartCounter++}`;

    try {
      const chartInstance = new Chart(ctx, {
        type: type,
        ...config
      });

      this.charts.set(chartId, chartInstance);
      return chartId;
    } catch (error) {
      console.error(`ChartManager: Failed to initialize chart ${chartId}`, error);
      return null;
    }
  }

  /**
   * Update chart data and optionally apply auto-scaling
   * @param {string} chartId - Chart identifier
   * @param {Object} dataUpdate - Data to update
   * @param {Array} dataUpdate.labels - X-axis labels (typically time values)
   * @param {Array<Array>} dataUpdate.datasets - Array of dataset arrays to update
   * @param {Object|null} dataUpdate.autoScaleConfig - Auto-scaling configuration
   *   @param {string} autoScaleConfig.axis - Axis to scale ('x' or 'y')
   *   @param {Array<number>} autoScaleConfig.datasetIndices - Which datasets to include in scaling
   *   @param {number|null} autoScaleConfig.padding - Custom padding (null = auto)
   *   @param {number|null} autoScaleConfig.minPadding - Minimum padding value
   *   @param {boolean} autoScaleConfig.minZero - Force min to 0
   *   @param {number} autoScaleConfig.multiplier - Multiplier for max (e.g., 1.1)
   * @param {string} updateMode - Chart.js update mode (default: 'none')
   * @returns {boolean} Success status
   */
  updateChart(chartId, dataUpdate, updateMode = 'none') {
    const chart = this.charts.get(chartId);
    if (!chart) {
      console.warn(`ChartManager: Chart ${chartId} not found`);
      return false;
    }

    try {
      // Update labels
      if (dataUpdate.labels) {
        chart.data.labels = dataUpdate.labels;
      }

      // Update datasets
      if (dataUpdate.datasets && Array.isArray(dataUpdate.datasets)) {
        dataUpdate.datasets.forEach((dataArray, index) => {
          if (chart.data.datasets[index]) {
            chart.data.datasets[index].data = dataArray;
          }
        });
      }

      // Apply auto-scaling if configured
      if (dataUpdate.autoScaleConfig) {
        this._applyAutoScale(chart, dataUpdate.autoScaleConfig, dataUpdate.datasets);
      }

      // Update chart
      chart.update(updateMode);
      return true;
    } catch (error) {
      console.error(`ChartManager: Failed to update chart ${chartId}`, error);
      return false;
    }
  }

  /**
   * Apply auto-scaling to chart axis
   * @private
   */
  _applyAutoScale(chart, config, datasets) {
    const { axis, datasetIndices, padding, minPadding, minZero, multiplier } = config;

    if (!axis || !datasets || datasets.length === 0) return;

    // Collect all data points from specified datasets
    const allData = [];
    (datasetIndices || datasets.map((_, i) => i)).forEach(index => {
      if (datasets[index] && Array.isArray(datasets[index])) {
        allData.push(...datasets[index]);
      }
    });

    if (allData.length === 0) return;

    const min = Math.min(...allData);
    const max = Math.max(...allData);

    // Calculate padding
    let calculatedPadding;
    if (padding !== undefined && padding !== null) {
      calculatedPadding = padding;
    } else {
      const range = max - min;
      calculatedPadding = range * 0.1;

      // Apply minimum padding if specified
      if (minPadding !== undefined && minPadding !== null) {
        calculatedPadding = Math.max(calculatedPadding, minPadding);
      }

      // Fallback if range is zero
      if (range === 0) {
        calculatedPadding = 1;
      }
    }

    // Apply scaling to axis
    if (chart.options.scales && chart.options.scales[axis]) {
      if (minZero) {
        chart.options.scales[axis].min = 0;
      } else {
        chart.options.scales[axis].min = min - calculatedPadding;
      }

      if (multiplier) {
        chart.options.scales[axis].max = max * multiplier;
      } else {
        chart.options.scales[axis].max = max + calculatedPadding;
      }
    }
  }

  /**
   * Clear all data from a chart
   * @param {string} chartId - Chart identifier
   * @returns {boolean} Success status
   */
  clearChart(chartId) {
    const chart = this.charts.get(chartId);
    if (!chart) {
      console.warn(`ChartManager: Chart ${chartId} not found`);
      return false;
    }

    try {
      chart.data.labels = [];
      chart.data.datasets.forEach(dataset => {
        dataset.data = [];
      });
      chart.update('none');
      return true;
    } catch (error) {
      console.error(`ChartManager: Failed to clear chart ${chartId}`, error);
      return false;
    }
  }

  /**
   * Destroy a chart instance and clean up resources
   * @param {string} chartId - Chart identifier
   * @returns {boolean} Success status
   */
  destroyChart(chartId) {
    const chart = this.charts.get(chartId);
    if (!chart) {
      console.warn(`ChartManager: Chart ${chartId} not found`);
      return false;
    }

    try {
      chart.destroy();
      this.charts.delete(chartId);
      return true;
    } catch (error) {
      console.error(`ChartManager: Failed to destroy chart ${chartId}`, error);
      return false;
    }
  }

  /**
   * Get chart instance by ID (for advanced use cases)
   * @param {string} chartId - Chart identifier
   * @returns {Chart|null} Chart.js instance or null
   */
  getChart(chartId) {
    return this.charts.get(chartId) || null;
  }

  /**
   * Destroy all charts and clean up
   */
  destroyAll() {
    this.charts.forEach((chart, chartId) => {
      try {
        chart.destroy();
      } catch (error) {
        console.error(`ChartManager: Failed to destroy chart ${chartId}`, error);
      }
    });
    this.charts.clear();
  }

  /**
   * Get count of active charts
   * @returns {number} Number of active charts
   */
  getChartCount() {
    return this.charts.size;
  }

  /**
   * Check if a chart exists
   * @param {string} chartId - Chart identifier
   * @returns {boolean} True if chart exists
   */
  hasChart(chartId) {
    return this.charts.has(chartId);
  }
}

// Export to global scope
window.ChartManager = ChartManager;
