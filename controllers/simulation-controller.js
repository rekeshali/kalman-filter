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

    // Viewport state
    this.viewportMode = 'live';  // 'live' or 'historical'
    this.viewportEndIndex = null;  // null = live mode (show latest data)
    this.timelinePosition = 100;  // 0-100 percentage (100 = live mode)

    // Splash state (transient disturbances)
    this.splashState = {
      frequency: { active: false, startTime: null, baseline: null },
      amplitude: { active: false, startTime: null, baseline: null }
    };
    this.splashDuration = 2.0;  // 2 seconds
    this.splashPeakMultiplier = 2.0;  // 2x baseline

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

      // Emit state updates
      const tabState = this._getCurrentTabState();
      if (tabState) {
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
   * Uses viewport windowing for efficient rendering
   * @private
   */
  _updateAllCharts(simulationState) {
    // Get viewport data instead of full history
    const viewportInfo = simulationState.getViewportData(this.viewportEndIndex);
    const data = viewportInfo.data;

    // Emit viewport info for UI updates
    this.emit('viewport-changed', {
      isLive: viewportInfo.isLive,
      showing: `${viewportInfo.start}-${viewportInfo.end} of ${viewportInfo.total}`,
      start: viewportInfo.start,
      end: viewportInfo.end,
      total: viewportInfo.total
    });

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

    // Apply splash transients if active
    const currentTime = tabState.simulationState.time;

    // Frequency splash
    if (this.splashState.frequency.active) {
      const elapsed = currentTime - this.splashState.frequency.startTime;
      if (elapsed >= this.splashDuration) {
        // Splash complete, deactivate
        this.splashState.frequency.active = false;
        params.frequency = this.splashState.frequency.baseline;
      } else {
        // Apply cosine transient: baseline * (1 + (peak-1) * (1 - cos(2π*t/duration)) / 2)
        const progress = elapsed / this.splashDuration;
        const multiplier = 1 + (this.splashPeakMultiplier - 1) * (1 - Math.cos(2 * Math.PI * progress)) / 2;
        params.frequency = this.splashState.frequency.baseline * multiplier;
      }
    }

    // Amplitude splash
    if (this.splashState.amplitude.active) {
      const elapsed = currentTime - this.splashState.amplitude.startTime;
      if (elapsed >= this.splashDuration) {
        // Splash complete, deactivate
        this.splashState.amplitude.active = false;
        params.scale = this.splashState.amplitude.baseline;
      } else {
        // Apply cosine transient: baseline * (1 + (peak-1) * (1 - cos(2π*t/duration)) / 2)
        const progress = elapsed / this.splashDuration;
        const multiplier = 1 + (this.splashPeakMultiplier - 1) * (1 - Math.cos(2 * Math.PI * progress)) / 2;
        params.scale = this.splashState.amplitude.baseline * multiplier;
      }
    }

    tabState.simulationState.step(params);

    // Update charts with viewport data
    this._updateAllCharts(tabState.simulationState);
    this.emit('simulation-updated');

    this.animationFrameId = requestAnimationFrame(() => this._animate());
  }

  /**
   * Start simulation
   */
  start() {
    const tabState = this._getCurrentTabState();
    if (!tabState || tabState.isRunning) return;

    // Always jump to live mode when starting
    this.viewportEndIndex = null;
    this.viewportMode = 'live';
    this.timelinePosition = 100;
    this.emit('viewport-mode-changed', { mode: 'live' });
    this.emit('timeline-position-changed', { position: 100 });

    // Initialize if not already initialized
    if (!tabState.simulationState.initialized) {
      const params = tabState.parameterModel.getScaledParameters();
      tabState.simulationState.reset(params);
      this._clearAllCharts();
    } else {
      // Resume from pause - adjust startTime to skip paused duration
      tabState.simulationState.resume();
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

    // Notify simulation state that we're pausing (tracks pause start time)
    tabState.simulationState.pause();

    tabState.isRunning = false;
    this.emit('running-changed', false);
    this._stopAnimation();
  }

  /**
   * Reset simulation to initial state
   * Clears all data and stops the simulation
   */
  reset() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    // Stop animation if running
    if (tabState.isRunning) {
      this.pause();
    }

    // Reset simulation state
    const params = tabState.parameterModel.getScaledParameters();
    tabState.simulationState.reset(params);

    // Reset timeline to live mode
    this.viewportEndIndex = null;
    this.viewportMode = 'live';
    this.timelinePosition = 100;

    // Clear splash state
    this.splashState.frequency.active = false;
    this.splashState.amplitude.active = false;

    // Clear and update charts
    this._clearAllCharts();
    this.emit('simulation-reset');
    this.emit('viewport-mode-changed', { mode: 'live' });
    this.emit('timeline-position-changed', { position: 100 });
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
   * Trigger a frequency splash (transient disturbance)
   * Applies a cosine-shaped transient that temporarily increases frequency
   */
  splashFrequency() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    // Only allow splash when simulation is running and initialized
    if (!tabState.isRunning || !tabState.simulationState.initialized) return;

    // Ignore if already splashing
    if (this.splashState.frequency.active) return;

    // Get baseline from scaled parameters (guaranteed to have value)
    const params = tabState.parameterModel.getScaledParameters();
    this.splashState.frequency = {
      active: true,
      startTime: tabState.simulationState.time,
      baseline: params.frequency
    };
  }

  /**
   * Trigger an amplitude splash (transient disturbance)
   * Applies a cosine-shaped transient that temporarily increases amplitude
   */
  splashAmplitude() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    // Only allow splash when simulation is running and initialized
    if (!tabState.isRunning || !tabState.simulationState.initialized) return;

    // Ignore if already splashing
    if (this.splashState.amplitude.active) return;

    // Get baseline from scaled parameters (guaranteed to have value)
    const params = tabState.parameterModel.getScaledParameters();
    this.splashState.amplitude = {
      active: true,
      startTime: tabState.simulationState.time,
      baseline: params.scale
    };
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
   * Refresh charts with current simulation data
   * Call this after registering charts to populate them with existing data
   */
  refreshCharts() {
    const tabState = this._getCurrentTabState();
    if (tabState && tabState.simulationState.initialized) {
      this._updateAllCharts(tabState.simulationState);
    }
  }

  /**
   * Return to live mode (show latest data)
   * Simplified to use timeline slider
   */
  returnToLiveMode() {
    this.handleTimelineChange(100);
  }

  /**
   * Clear all historical data
   * Useful for long-running simulations to free memory
   */
  clearHistory() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    tabState.simulationState.clearHistory();
    this.returnToLiveMode();  // Reset to live mode after clearing
    this.emit('history-cleared');
  }

  /**
   * Toggle recording state
   * If not recording: start recording (clears log)
   * If recording: stop recording and download log file
   */
  toggleRecording() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    const isRecording = tabState.simulationState.getIsRecording();

    if (isRecording) {
      // Stop recording and download
      tabState.simulationState.stopRecording();
      tabState.simulationState.downloadDebugLog();
      this.emit('recording-changed', false);
    } else {
      // Start recording (clears previous log)
      tabState.simulationState.startRecording();
      this.emit('recording-changed', true);
    }
  }

  /**
   * Check if currently recording
   * @returns {boolean} True if recording
   */
  getIsRecording() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return false;
    return tabState.simulationState.getIsRecording();
  }

  /**
   * Check if simulation is currently running
   * @returns {boolean} True if running
   */
  isRunning() {
    const tabState = this._getCurrentTabState();
    if (!tabState) return false;
    return tabState.isRunning;
  }

  /**
   * Get current viewport mode
   * @returns {string} 'live' or 'historical'
   */
  getViewportMode() {
    return this.viewportMode;
  }

  /**
   * Handle timeline slider change
   * @param {number} position - Slider position (0-100 percentage)
   */
  handleTimelineChange(position) {
    const tabState = this._getCurrentTabState();
    if (!tabState) return;

    // Auto-pause if simulation is running
    if (tabState.isRunning) {
      this.pause();
    }

    const totalPoints = tabState.simulationState.dataCollector.getLength();
    if (totalPoints === 0) return;

    // Prevent scrolling below viewport size (400 points)
    // This prevents axis scaling issues when there aren't enough points
    const viewportSize = tabState.simulationState.dataCollector.viewportSize;
    const minPosition = totalPoints > viewportSize
      ? (viewportSize / totalPoints) * 100
      : 0;

    // Clamp position to valid range
    const clampedPosition = Math.max(minPosition, Math.min(100, position));
    this.timelinePosition = clampedPosition;

    // Convert percentage to data index
    if (clampedPosition >= 99) {
      // At or near end = live mode
      this.viewportEndIndex = null;
      this.viewportMode = 'live';
    } else {
      // Historical mode
      const endIndex = Math.floor((clampedPosition / 100) * totalPoints);
      this.viewportEndIndex = Math.max(viewportSize, endIndex);
      this.viewportMode = 'historical';
    }

    this._updateAllCharts(tabState.simulationState);
    this.emit('viewport-mode-changed', { mode: this.viewportMode });
    this.emit('timeline-position-changed', { position: this.timelinePosition });
  }

  /**
   * Get timeline metadata for UI
   * @returns {Object} Timeline info
   */
  getTimelineInfo() {
    const tabState = this._getCurrentTabState();
    if (!tabState) {
      return { position: 100, currentTime: 0, endTime: 0, totalPoints: 0 };
    }

    const dataCollector = tabState.simulationState.dataCollector;
    const totalPoints = dataCollector.getLength();

    if (totalPoints === 0) {
      return { position: 100, currentTime: 0, endTime: 0, totalPoints: 0 };
    }

    // Get viewport data to match what charts are displaying
    const viewportInfo = tabState.simulationState.getViewportData(this.viewportEndIndex);
    const viewportTimes = viewportInfo.data.times;
    const endTime = viewportTimes[viewportTimes.length - 1] || 0;

    let currentTime = endTime;
    if (this.viewportMode === 'historical' && this.viewportEndIndex !== null) {
      const fullTimes = dataCollector.data.times;
      currentTime = fullTimes[Math.min(this.viewportEndIndex - 1, fullTimes.length - 1)] || 0;
    }

    return {
      position: this.timelinePosition,
      currentTime: currentTime,
      endTime: endTime,
      totalPoints: totalPoints
    };
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
