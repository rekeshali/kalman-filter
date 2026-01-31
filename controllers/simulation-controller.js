/**
 * SimulationController - Central coordinator for MVC architecture
 * Manages animation loop, model coordination, chart updates, and state persistence
 */
class SimulationController extends window.EventEmitter {
  constructor() {
    super();

    // Initialize models
    this.parameterModel = new window.ParameterModel();
    this.tabModel = new window.TabModel();
    this.simulationState = new window.SimulationState();

    // Initialize services
    this.chartManager = new window.ChartManager();

    // Animation state
    this.isRunning = false;
    this.animationFrameId = null;

    // Chart registry: chartName -> chartId
    this.chartRegistry = new Map();

    // Chart configurations for auto-scaling
    this.chartConfigs = new Map();

    // Setup event listeners
    this._setupEventListeners();

    // Load saved state
    this._loadState();
  }

  /**
   * Setup event listeners for model changes
   * @private
   */
  _setupEventListeners() {
    // Parameter changes trigger state persistence
    this.parameterModel.on('parameter-changed', () => {
      this._saveState();
      this.emit('parameters-updated', this.parameterModel.getAllParameters());
    });

    // Tab changes trigger state persistence
    this.tabModel.on('tab-added', () => {
      this._saveState();
      this.emit('tabs-updated', this.tabModel.getAllTabs());
    });

    this.tabModel.on('tab-removed', () => {
      this._saveState();
      this.emit('tabs-updated', this.tabModel.getAllTabs());
    });

    this.tabModel.on('tab-activated', ({ tabId }) => {
      this._saveState();
      this.emit('tab-changed', tabId);
    });

    this.tabModel.on('tab-renamed', () => {
      this._saveState();
      this.emit('tabs-updated', this.tabModel.getAllTabs());
    });

    // Simulation state changes trigger chart updates
    this.simulationState.on('state-changed', (data) => {
      this._updateAllCharts(data);
      this.emit('simulation-updated', data);
    });

    this.simulationState.on('reset', () => {
      this._clearAllCharts();
      this.emit('simulation-reset');
    });
  }

  /**
   * Load state from localStorage
   * @private
   */
  _loadState() {
    const savedParams = window.StorageService.load('ekf-parameters');
    if (savedParams) {
      Object.keys(savedParams).forEach(key => {
        this.parameterModel.setParameter(key, savedParams[key]);
      });
    }

    const savedTabs = window.StorageService.load('ekf-tabs');
    if (savedTabs) {
      savedTabs.tabs.forEach(tab => {
        if (tab.type === 'simulation') {
          this.tabModel.addTab(tab.name);
        }
      });
      if (savedTabs.activeTabId) {
        this.tabModel.setActiveTab(savedTabs.activeTabId);
      }
    }
  }

  /**
   * Save state to localStorage
   * @private
   */
  _saveState() {
    window.StorageService.save('ekf-parameters', this.parameterModel.getAllParameters());
    window.StorageService.save('ekf-tabs', {
      tabs: this.tabModel.getAllTabs(),
      activeTabId: this.tabModel.getActiveTab()
    });
  }

  /**
   * Register a chart with the controller
   * @param {string} chartName - Unique chart name (e.g., 'position', 'velocity')
   * @param {HTMLCanvasElement} canvasElement - Canvas element
   * @param {Object} chartConfig - Chart.js configuration
   * @param {Object} updateConfig - Auto-scaling configuration for updates
   * @returns {string|null} chartId or null if failed
   */
  registerChart(chartName, canvasElement, chartConfig, updateConfig = {}) {
    const chartId = this.chartManager.initializeChart(canvasElement, 'line', chartConfig);
    if (chartId) {
      this.chartRegistry.set(chartName, chartId);
      this.chartConfigs.set(chartName, updateConfig);
      return chartId;
    }
    return null;
  }

  /**
   * Update all registered charts with simulation data
   * @private
   */
  _updateAllCharts(data) {
    // Position chart
    if (this.chartRegistry.has('position')) {
      this.chartManager.updateChart(this.chartRegistry.get('position'), {
        labels: data.times,
        datasets: [
          data.truePositions,
          data.probeMeasurements,
          data.processPositions,
          data.estimates
        ],
        autoScaleConfig: {
          axis: 'y',
          datasetIndices: [0, 1, 2, 3],
          padding: null,
          minPadding: null
        }
      });
    }

    // Acceleration chart
    if (this.chartRegistry.has('acceleration')) {
      this.chartManager.updateChart(this.chartRegistry.get('acceleration'), {
        labels: data.times,
        datasets: [
          data.trueAccels,
          data.inertialMeasurements
        ],
        autoScaleConfig: {
          axis: 'y',
          datasetIndices: [0, 1],
          padding: null,
          minPadding: 0.5
        }
      });
    }

    // Velocity chart
    if (this.chartRegistry.has('velocity')) {
      this.chartManager.updateChart(this.chartRegistry.get('velocity'), {
        labels: data.times,
        datasets: [
          data.trueVelocities,
          data.estimatedVelocities
        ],
        autoScaleConfig: {
          axis: 'y',
          datasetIndices: [0, 1],
          padding: null,
          minPadding: 0.5
        }
      });
    }

    // Innovation chart
    if (this.chartRegistry.has('innovation')) {
      this.chartManager.updateChart(this.chartRegistry.get('innovation'), {
        labels: data.times,
        datasets: [data.innovations],
        autoScaleConfig: {
          axis: 'y',
          datasetIndices: [0],
          padding: null,
          minPadding: 0.1
        }
      });
    }

    // Kalman gain chart (no auto-scaling, fixed 0-1)
    if (this.chartRegistry.has('kalmanGain')) {
      this.chartManager.updateChart(this.chartRegistry.get('kalmanGain'), {
        labels: data.times,
        datasets: [
          data.kalmanGainPos,
          data.kalmanGainVel
        ]
      });
    }

    // Uncertainty chart
    if (this.chartRegistry.has('uncertainty')) {
      this.chartManager.updateChart(this.chartRegistry.get('uncertainty'), {
        labels: data.times,
        datasets: [
          data.positionUncertainties,
          data.velocityUncertainties
        ],
        autoScaleConfig: {
          axis: 'y',
          datasetIndices: [0, 1],
          minZero: true,
          multiplier: 1.1
        }
      });
    }

    // Error chart
    if (this.chartRegistry.has('error')) {
      this.chartManager.updateChart(this.chartRegistry.get('error'), {
        labels: data.times,
        datasets: [data.positionErrors],
        autoScaleConfig: {
          axis: 'y',
          datasetIndices: [0],
          minZero: true,
          multiplier: 1.1
        }
      });
    }
  }

  /**
   * Clear all registered charts
   * @private
   */
  _clearAllCharts() {
    this.chartRegistry.forEach((chartId) => {
      this.chartManager.clearChart(chartId);
    });
  }

  /**
   * Animation loop
   * @private
   */
  _animate() {
    if (!this.isRunning) return;

    const params = this.parameterModel.getScaledParameters();
    this.simulationState.step(params);

    this.animationFrameId = requestAnimationFrame(() => this._animate());
  }

  /**
   * Start simulation
   */
  start() {
    if (this.isRunning) return;

    // Initialize if not already initialized
    if (!this.simulationState.initialized) {
      this.reset();
    }

    this.isRunning = true;
    this.emit('running-changed', true);
    this._animate();
  }

  /**
   * Pause simulation
   */
  pause() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.emit('running-changed', false);

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Reset simulation to initial state
   */
  reset() {
    const wasRunning = this.isRunning;

    // Stop animation if running
    if (this.isRunning) {
      this.pause();
    }

    // Reset simulation state
    const params = this.parameterModel.getScaledParameters();
    this.simulationState.reset(params);

    // Restart if was running
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Restart simulation (reset + start)
   */
  restart() {
    this.pause();
    const params = this.parameterModel.getScaledParameters();
    this.simulationState.reset(params);
    this.start();
  }

  /**
   * Set a parameter value
   * @param {string} name - Parameter name
   * @param {*} value - Parameter value
   * @returns {boolean} Success status
   */
  setParameter(name, value) {
    return this.parameterModel.setParameter(name, value);
  }

  /**
   * Get a parameter value
   * @param {string} name - Parameter name
   * @returns {*} Parameter value
   */
  getParameter(name) {
    return this.parameterModel.getParameter(name);
  }

  /**
   * Get all parameters
   * @returns {Object} All parameters
   */
  getAllParameters() {
    return this.parameterModel.getAllParameters();
  }

  /**
   * Reset parameters to defaults
   */
  resetParameters() {
    this.parameterModel.resetToDefaults();
  }

  /**
   * Add a new simulation tab
   * @param {string} name - Optional tab name
   * @returns {string} New tab ID
   */
  addTab(name) {
    return this.tabModel.addTab(name);
  }

  /**
   * Remove a tab
   * @param {string} tabId - Tab ID to remove
   * @returns {boolean} Success status
   */
  removeTab(tabId) {
    return this.tabModel.removeTab(tabId);
  }

  /**
   * Set active tab
   * @param {string} tabId - Tab ID to activate
   * @returns {boolean} Success status
   */
  setActiveTab(tabId) {
    return this.tabModel.setActiveTab(tabId);
  }

  /**
   * Rename a tab
   * @param {string} tabId - Tab ID to rename
   * @param {string} newName - New tab name
   * @returns {boolean} Success status
   */
  renameTab(tabId, newName) {
    return this.tabModel.renameTab(tabId, newName);
  }

  /**
   * Get all tabs
   * @returns {Array} All tabs
   */
  getAllTabs() {
    return this.tabModel.getAllTabs();
  }

  /**
   * Get active tab ID
   * @returns {string|null} Active tab ID
   */
  getActiveTab() {
    return this.tabModel.getActiveTab();
  }

  /**
   * Get current simulation metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return this.simulationState.getMetrics();
  }

  /**
   * Get simulation data arrays
   * @returns {Object} All data arrays
   */
  getDataArrays() {
    return this.simulationState.getDataArrays();
  }

  /**
   * Check if simulation is running
   * @returns {boolean} Running status
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * Subscribe to controller events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    return this.on(event, callback);
  }

  /**
   * Destroy controller and clean up resources
   */
  destroy() {
    // Stop animation
    this.pause();

    // Destroy all charts
    this.chartManager.destroyAll();

    // Clear registries
    this.chartRegistry.clear();
    this.chartConfigs.clear();

    // Remove all event listeners
    this.removeAllListeners();
  }
}

// Export to global scope
window.SimulationController = SimulationController;
