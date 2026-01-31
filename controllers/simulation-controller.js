/**
 * SimulationController - Central coordinator for MVC architecture
 * Manages animation loop, model coordination, chart updates, and state persistence
 */
class SimulationController extends window.EventEmitter {
  constructor() {
    super();

    // Tab model (shared across all tabs)
    this.tabModel = new window.TabModel();

    // Per-tab state: Map<tabId, {parameterModel, simulationState, isRunning}>
    this.tabStates = new Map();

    // Initialize services
    this.chartManager = new window.ChartManager();

    // Animation state
    this.animationFrameId = null;

    // Chart registry: chartName -> chartId
    this.chartRegistry = new Map();

    // Chart configurations for auto-scaling
    this.chartConfigs = new Map();

    // Setup event listeners
    this._setupEventListeners();

    // Load saved state
    this._loadState();

    // Initialize state for current tab
    this._ensureTabState(this.tabModel.getActiveTab());
  }

  /**
   * Ensure tab state exists for a given tab ID
   * @private
   */
  _ensureTabState(tabId) {
    if (!tabId || tabId === 'welcome') return;

    if (!this.tabStates.has(tabId)) {
      this.tabStates.set(tabId, {
        parameterModel: new window.ParameterModel(),
        simulationState: new window.SimulationState(),
        isRunning: false
      });
    }
  }

  /**
   * Get current tab's state
   * @private
   */
  _getCurrentTabState() {
    const activeTabId = this.tabModel.getActiveTab();
    if (!activeTabId || activeTabId === 'welcome') return null;

    this._ensureTabState(activeTabId);
    return this.tabStates.get(activeTabId);
  }

  /**
   * Setup event listeners for model changes
   * @private
   */
  _setupEventListeners() {
    // Tab changes
    this.tabModel.on('tab-added', ({ tab }) => {
      // Create fresh state for new tab
      this._ensureTabState(tab.id);
      this._saveState();
      this.emit('tabs-updated', this.tabModel.getAllTabs());
    });

    this.tabModel.on('tab-removed', ({ tabId }) => {
      // Remove tab state
      const tabState = this.tabStates.get(tabId);
      if (tabState && tabState.isRunning) {
        this._stopAnimation();
      }
      this.tabStates.delete(tabId);
      this._saveState();
      this.emit('tabs-updated', this.tabModel.getAllTabs());
    });

    this.tabModel.on('tab-activated', ({ tabId }) => {
      // Stop current animation
      this._stopAnimation();

      // Ensure new tab has state
      this._ensureTabState(tabId);

      // Clear and update charts with new tab's data
      const tabState = this._getCurrentTabState();
      if (tabState) {
        const data = tabState.simulationState.getDataArrays();
        if (data && data.times && data.times.length > 0) {
          this._updateAllCharts(data);
        } else {
          this._clearAllCharts();
        }

        // Emit state updates
        this.emit('parameters-updated', tabState.parameterModel.getAllParameters());
        this.emit('running-changed', tabState.isRunning);

        // Restart animation if tab was running
        if (tabState.isRunning) {
          this._startAnimation();
        }
      }

      this._saveState();
      this.emit('tab-changed', tabId);
    });

    this.tabModel.on('tab-renamed', () => {
      this._saveState();
      this.emit('tabs-updated', this.tabModel.getAllTabs());
    });
  }

  /**
   * Stop animation (helper method)
   * @private
   */
  _stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Start animation (helper method)
   * @private
   */
  _startAnimation() {
    if (!this.animationFrameId) {
      this._animate();
    }
  }

  /**
   * Load state from localStorage
   * @private
   */
  _loadState() {
    const savedTabs = window.StorageService.load('ekf-tabs');
    if (savedTabs && savedTabs.tabs) {
      let lastCreatedTabId = null;
      const savedTabStates = window.StorageService.load('ekf-tab-states') || {};

      savedTabs.tabs.forEach(tab => {
        if (tab.type === 'simulation') {
          // Create new tab and track its ID
          lastCreatedTabId = this.tabModel.addTab(tab.name);

          // Load saved parameters for this tab if they exist
          // Use tab name as key since IDs change
          if (savedTabStates[tab.name]) {
            this._ensureTabState(lastCreatedTabId);
            const tabState = this.tabStates.get(lastCreatedTabId);
            Object.keys(savedTabStates[tab.name]).forEach(key => {
              tabState.parameterModel.setParameter(key, savedTabStates[tab.name][key]);
            });
          }
        }
      });

      // If there was an active tab that wasn't 'welcome', activate the last created tab
      // Otherwise the welcome tab will remain active
      if (savedTabs.activeTabId && savedTabs.activeTabId !== 'welcome' && lastCreatedTabId) {
        this.tabModel.setActiveTab(lastCreatedTabId);
      }
    }
  }

  /**
   * Save state to localStorage
   * @private
   */
  _saveState() {
    window.StorageService.save('ekf-tabs', {
      tabs: this.tabModel.getAllTabs(),
      activeTabId: this.tabModel.getActiveTab()
    });

    // Save per-tab parameters (indexed by tab name for persistence across sessions)
    const tabStates = {};
    this.tabModel.getAllTabs().forEach(tab => {
      if (tab.type === 'simulation' && this.tabStates.has(tab.id)) {
        const state = this.tabStates.get(tab.id);
        tabStates[tab.name] = state.parameterModel.getAllParameters();
      }
    });
    window.StorageService.save('ekf-tab-states', tabStates);
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
    // Destroy existing chart if already registered
    if (this.chartRegistry.has(chartName)) {
      const oldChartId = this.chartRegistry.get(chartName);
      this.chartManager.destroyChart(oldChartId);
      this.chartRegistry.delete(chartName);
      this.chartConfigs.delete(chartName);
    }

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
    const tabState = this._getCurrentTabState();
    if (!tabState || !tabState.isRunning) return;

    const params = tabState.parameterModel.getScaledParameters();
    tabState.simulationState.step(params);

    // Update charts
    const data = tabState.simulationState.getDataArrays();
    this._updateAllCharts(data);
    this.emit('simulation-updated', data);

    this.animationFrameId = requestAnimationFrame(() => this._animate());
  }

  /**
   * Start simulation
   */
  start() {
    const tabState = this._getCurrentTabState();
    if (!tabState || tabState.isRunning) return;

    // Initialize if not already initialized
    if (!tabState.simulationState.initialized) {
      this.reset();
      return; // reset() will call start()
    }

    tabState.isRunning = true;
    this.emit('running-changed', true);
    this._startAnimation();
  }

  /**
   * Pause simulation
   */
  pause() {
    const tabState = this._getCurrentTabState();
    if (!tabState || !tabState.isRunning) return;

    tabState.isRunning = false;
    this.emit('running-changed', false);
    this._stopAnimation();
  }

  /**
   * Reset simulation to initial state
   */
  reset() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    const wasRunning = tabState.isRunning;

    // Stop animation if running
    if (tabState.isRunning) {
      this.pause();
    }

    // Reset simulation state
    const params = tabState.parameterModel.getScaledParameters();
    tabState.simulationState.reset(params);

    // Clear and update charts
    this._clearAllCharts();
    this.emit('simulation-reset');

    // Restart if was running
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Restart simulation (reset + start)
   */
  restart() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    this.pause();
    const params = tabState.parameterModel.getScaledParameters();
    tabState.simulationState.reset(params);
    this._clearAllCharts();
    this.start();
  }

  /**
   * Set a parameter value
   * @param {string} name - Parameter name
   * @param {*} value - Parameter value
   * @returns {boolean} Success status
   */
  setParameter(name, value) {
    const tabState = this._getCurrentTabState();
    if (!tabState) return false;

    const success = tabState.parameterModel.setParameter(name, value);
    if (success) {
      this._saveState();
      this.emit('parameters-updated', tabState.parameterModel.getAllParameters());
    }
    return success;
  }

  /**
   * Get a parameter value
   * @param {string} name - Parameter name
   * @returns {*} Parameter value
   */
  getParameter(name) {
    const tabState = this._getCurrentTabState();
    if (!tabState) return null;
    return tabState.parameterModel.getParameter(name);
  }

  /**
   * Get all parameters
   * @returns {Object} All parameters
   */
  getAllParameters() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return {};
    return tabState.parameterModel.getAllParameters();
  }

  /**
   * Reset parameters to defaults
   */
  resetParameters() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;
    tabState.parameterModel.resetToDefaults();
    this._saveState();
    this.emit('parameters-updated', tabState.parameterModel.getAllParameters());
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
    const tabState = this._getCurrentTabState();
    if (!tabState) return {};
    return tabState.simulationState.getMetrics();
  }

  /**
   * Get simulation data arrays
   * @returns {Object} All data arrays
   */
  getDataArrays() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return {};
    return tabState.simulationState.getDataArrays();
  }

  /**
   * Check if simulation is running
   * @returns {boolean} Running status
   */
  getIsRunning() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return false;
    return tabState.isRunning;
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
