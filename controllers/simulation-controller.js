/**
 * SimulationController - Central coordinator for MVC architecture
 * Manages animation loop, model coordination, chart updates, and state persistence
 */
class SimulationController extends window.EventEmitter {
  constructor() {
    super();

    // Tab model (shared across all tabs)
    this.tabModel = new window.TabModel();

    // Problem type model (header revamp)
    this.problemTypeModel = new window.ProblemTypeModel();

    // Per-tab state: Map<tabId, {parameterModel, simulationState, isRunning}>
    this.tabStates = new Map();

    // Per-slot state (header revamp): Map<slotId, {parameterModel, simulationState, isRunning}>
    this.slotStates = new Map();

    // Initialize services
    this.chartManager = new window.ChartManager();
    this.gifRecorder = new window.GIFRecorder();

    // Chart grid element reference for GIF recording
    this.chartGridElement = null;

    // GIF generation state
    this.isGeneratingGif = false;

    // Animation state
    this.animationFrameId = null;

    // Viewport state
    this.viewportMode = 'live';  // 'live' or 'historical'
    this.viewportEndIndex = null;  // null = live mode (show latest data)
    this.timelinePosition = 100;  // 0-100 percentage (100 = live mode)

    // Splash state (transient disturbances with hold-to-sustain)
    this.splashState = {
      frequency: { active: false, phase: null, startTime: null, phaseStartTime: null, baseline: null, holding: false },
      amplitude: { active: false, phase: null, startTime: null, phaseStartTime: null, baseline: null, holding: false }
    };
    this.splashRampDuration = 1.0;  // 1 second for ramp up/down
    this.splashMaxSustainDuration = 6.0;  // 6 second max sustain (timeout)
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
   * Get current tab's state (handles both tabs and slots)
   * @private
   */
  _getCurrentTabState() {
    // Check if we're using slot-based system
    const activeSlotId = this.tabModel.getActiveSlotId();
    if (activeSlotId && activeSlotId !== 'welcome') {
      this._ensureSlotState(activeSlotId);
      return this.slotStates.get(activeSlotId);
    }

    // Fall back to tab-based system
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
    const slotState = this._getCurrentSlotState();
    if (!slotState || !slotState.isRunning) return;

    const params = slotState.parameterModel.getScaledParameters();

    // Apply splash transients if active
    const currentTime = slotState.simulationState.time;

    // Frequency splash (hold-to-sustain envelope)
    if (this.splashState.frequency.active) {
      const result = this._applySplashEnvelope(this.splashState.frequency, currentTime);
      if (result.done) {
        this.splashState.frequency.active = false;
        this.splashState.frequency.phase = null;
        params.frequency = this.splashState.frequency.baseline;
        this.emit('splash-progress', { type: 'frequency', progress: 0, active: false });
      } else {
        params.frequency = this.splashState.frequency.baseline * result.multiplier;
        this.emit('splash-progress', { type: 'frequency', progress: result.totalProgress, active: true });
      }
    }

    // Amplitude splash (hold-to-sustain envelope)
    if (this.splashState.amplitude.active) {
      const result = this._applySplashEnvelope(this.splashState.amplitude, currentTime);
      if (result.done) {
        this.splashState.amplitude.active = false;
        this.splashState.amplitude.phase = null;
        params.scale = this.splashState.amplitude.baseline;
        this.emit('splash-progress', { type: 'amplitude', progress: 0, active: false });
      } else {
        params.scale = this.splashState.amplitude.baseline * result.multiplier;
        this.emit('splash-progress', { type: 'amplitude', progress: result.totalProgress, active: true });
      }
    }

    slotState.simulationState.step(params);

    // Update charts with viewport data
    this._updateAllCharts(slotState.simulationState);
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
    this.splashState.frequency = { active: false, phase: null, startTime: null, phaseStartTime: null, baseline: null, holding: false };
    this.splashState.amplitude = { active: false, phase: null, startTime: null, phaseStartTime: null, baseline: null, holding: false };
    this.emit('splash-progress', { type: 'frequency', progress: 0, active: false });
    this.emit('splash-progress', { type: 'amplitude', progress: 0, active: false });

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
   * Apply splash envelope with hold-to-sustain behavior
   * @private
   * @param {Object} state - Splash state object (frequency or amplitude)
   * @param {number} currentTime - Current simulation time
   * @returns {Object} { multiplier, totalProgress, done }
   */
  _applySplashEnvelope(state, currentTime) {
    const phaseElapsed = currentTime - state.phaseStartTime;
    const totalElapsed = currentTime - state.startTime;
    const maxTotalDuration = this.splashRampDuration + this.splashMaxSustainDuration + this.splashRampDuration;

    if (state.phase === 'rampUp') {
      if (phaseElapsed >= this.splashRampDuration) {
        // Ramp up complete - transition based on holding state
        if (state.holding) {
          state.phase = 'sustain';
          state.phaseStartTime = currentTime;
          return { multiplier: this.splashPeakMultiplier, totalProgress: totalElapsed / maxTotalDuration, done: false };
        } else {
          // Not holding - go directly to ramp down
          state.phase = 'rampDown';
          state.phaseStartTime = currentTime;
          return { multiplier: this.splashPeakMultiplier, totalProgress: totalElapsed / maxTotalDuration, done: false };
        }
      }
      // Half-sine ramp up: sin(progress * π/2) gives 0→1
      const progress = phaseElapsed / this.splashRampDuration;
      const envelope = Math.sin(progress * Math.PI / 2);
      const multiplier = 1 + (this.splashPeakMultiplier - 1) * envelope;
      return { multiplier, totalProgress: totalElapsed / maxTotalDuration, done: false };
    }

    if (state.phase === 'sustain') {
      const sustainElapsed = phaseElapsed;
      // Check for timeout or release
      if (!state.holding || sustainElapsed >= this.splashMaxSustainDuration) {
        state.phase = 'rampDown';
        state.phaseStartTime = currentTime;
      }
      return { multiplier: this.splashPeakMultiplier, totalProgress: totalElapsed / maxTotalDuration, done: false };
    }

    if (state.phase === 'rampDown') {
      if (phaseElapsed >= this.splashRampDuration) {
        // Ramp down complete
        return { multiplier: 1, totalProgress: 1, done: true };
      }
      // Half-sine ramp down: cos(progress * π/2) gives 1→0
      const progress = phaseElapsed / this.splashRampDuration;
      const envelope = Math.cos(progress * Math.PI / 2);
      const multiplier = 1 + (this.splashPeakMultiplier - 1) * envelope;
      return { multiplier, totalProgress: totalElapsed / maxTotalDuration, done: false };
    }

    return { multiplier: 1, totalProgress: 0, done: true };
  }

  /**
   * Start frequency splash (called on mousedown)
   * Begins ramp up phase and sets holding state
   */
  splashFrequencyStart() {
    const slotState = this._getCurrentSlotState();
    if (!slotState) return;

    // Only allow splash when simulation is running and initialized
    if (!slotState.isRunning || !slotState.simulationState.initialized) return;

    // Ignore if already splashing
    if (this.splashState.frequency.active) return;

    const params = slotState.parameterModel.getScaledParameters();
    const currentTime = slotState.simulationState.time;
    this.splashState.frequency = {
      active: true,
      phase: 'rampUp',
      startTime: currentTime,
      phaseStartTime: currentTime,
      baseline: params.frequency,
      holding: true
    };
    this.emit('splash-progress', { type: 'frequency', progress: 0, active: true });
  }

  /**
   * End frequency splash (called on mouseup)
   * Transitions to ramp down phase
   */
  splashFrequencyEnd() {
    if (!this.splashState.frequency.active) return;
    this.splashState.frequency.holding = false;
    // Phase transition will happen in _applySplashEnvelope
  }

  /**
   * Start amplitude splash (called on mousedown)
   * Begins ramp up phase and sets holding state
   */
  splashAmplitudeStart() {
    const slotState = this._getCurrentSlotState();
    if (!slotState) return;

    // Only allow splash when simulation is running and initialized
    if (!slotState.isRunning || !slotState.simulationState.initialized) return;

    // Ignore if already splashing
    if (this.splashState.amplitude.active) return;

    const params = slotState.parameterModel.getScaledParameters();
    const currentTime = slotState.simulationState.time;
    this.splashState.amplitude = {
      active: true,
      phase: 'rampUp',
      startTime: currentTime,
      phaseStartTime: currentTime,
      baseline: params.scale,
      holding: true
    };
    this.emit('splash-progress', { type: 'amplitude', progress: 0, active: true });
  }

  /**
   * End amplitude splash (called on mouseup)
   * Transitions to ramp down phase
   */
  splashAmplitudeEnd() {
    if (!this.splashState.amplitude.active) return;
    this.splashState.amplitude.holding = false;
    // Phase transition will happen in _applySplashEnvelope
  }

  // Legacy click handlers (for backwards compatibility - trigger immediate full bump)
  splashFrequency() {
    this.splashFrequencyStart();
    // Immediately release to trigger full bump (rampUp → rampDown, no sustain)
    setTimeout(() => this.splashFrequencyEnd(), 50);
  }

  splashAmplitude() {
    this.splashAmplitudeStart();
    // Immediately release to trigger full bump (rampUp → rampDown, no sustain)
    setTimeout(() => this.splashAmplitudeEnd(), 50);
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
   * Set chart grid element for GIF recording
   * @param {HTMLElement} element - Chart grid container element
   */
  setChartGridElement(element) {
    this.chartGridElement = element;
  }

  /**
   * Get current chart state for GIF snapshot
   * @returns {Object} Current chart data state
   * @private
   */
  _getCurrentChartState() {
    const slotState = this._getCurrentSlotState();
    if (!slotState) return null;

    // Get current viewport data (what's currently displayed on charts)
    const viewportInfo = slotState.simulationState.getViewportData(this.viewportEndIndex);

    return {
      data: viewportInfo.data,
      viewportEndIndex: this.viewportEndIndex
    };
  }

  /**
   * Apply chart state to charts (for GIF rendering)
   * @param {Object} chartState - Chart state to apply
   * @private
   */
  _applyChartState(chartState) {
    if (!chartState || !chartState.data) return;

    // Directly update charts with snapshot data
    // This bypasses viewport calculation and uses stored chart data

    // Position chart
    if (this.chartRegistry.has('position')) {
      this.chartManager.updateChart(this.chartRegistry.get('position'), {
        labels: chartState.data.times,
        datasets: [
          chartState.data.truePositions,
          chartState.data.ekfPositions,
          chartState.data.probeMeasurements,
          chartState.data.trueAccels,
          chartState.data.inertialMeasurements
        ]
      });
    }

    // Velocity chart
    if (this.chartRegistry.has('velocity')) {
      this.chartManager.updateChart(this.chartRegistry.get('velocity'), {
        labels: chartState.data.times,
        datasets: [
          chartState.data.trueVelocities,
          chartState.data.estimatedVelocities
        ]
      });
    }

    // Innovation chart
    if (this.chartRegistry.has('innovation')) {
      this.chartManager.updateChart(this.chartRegistry.get('innovation'), {
        labels: chartState.data.times,
        datasets: [chartState.data.innovations]
      });
    }

    // Uncertainty charts
    if (this.chartRegistry.has('uncertainty')) {
      this.chartManager.updateChart(this.chartRegistry.get('uncertainty'), {
        labels: chartState.data.times,
        datasets: [
          chartState.data.posUncertainties,
          chartState.data.velUncertainties
        ]
      });
    }

    // Error charts
    if (this.chartRegistry.has('error')) {
      this.chartManager.updateChart(this.chartRegistry.get('error'), {
        labels: chartState.data.times,
        datasets: [
          chartState.data.ekfPosErrors,
          chartState.data.processPosErrors
        ]
      });
    }
  }

  /**
   * Toggle recording state
   * If not recording: start recording (clears log)
   * If recording: stop recording and download log + GIF file
   */
  async toggleRecording() {
    const slotState = this._getCurrentSlotState();
    if (!slotState) return;

    const isRecording = slotState.simulationState.getIsRecording();

    if (isRecording) {
      // Stop JSON recording
      slotState.simulationState.stopRecording();

      // Remember if simulation was running
      const wasRunning = slotState.isRunning;

      // ALWAYS pause simulation when clicking download
      slotState.simulationState.pause();
      slotState.isRunning = false;
      this._stopAnimation();
      this.emit('running-changed', false);

      // Generate timestamp for both files
      const timestamp = new Date().toISOString();

      // Download JSON log with timestamp
      const json = slotState.simulationState.exportDebugLog();
      const jsonBlob = new Blob([json], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `ekf-debug-log-${timestamp}.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // Stop GIF recording and download
      if (this.gifRecorder.getIsRecording()) {
        try {
          // Emit generating state (disables UI)
          this.isGeneratingGif = true;
          this.emit('gif-generating-changed', true);

          // Save current chart state before GIF generation
          const savedChartState = this._getCurrentChartState();

          // Generate GIF from snapshots
          const gifBlob = await this.gifRecorder.stopRecording((chartState) => {
            this._applyChartState(chartState);
          });
          this.gifRecorder.downloadGIF(gifBlob, timestamp);

          // Restore the saved chart state to fix any corruption
          if (savedChartState) {
            this._applyChartState(savedChartState);
          }

          // Clear generating state
          this.isGeneratingGif = false;
          this.emit('gif-generating-changed', false);
        } catch (error) {
          console.error('Failed to generate GIF:', error);
          this.isGeneratingGif = false;
          this.emit('gif-generating-changed', false);
        }
      }

      // Resume simulation if it was running before
      if (wasRunning) {
        slotState.simulationState.resume();
        slotState.isRunning = true;
        this._startAnimation();
        this.emit('running-changed', true);
      }

      this.emit('recording-changed', false);
    } else {
      // Start JSON recording (clears previous log)
      slotState.simulationState.startRecording();

      // Start GIF recording with snapshot callback
      if (this.chartGridElement) {
        this.gifRecorder.startRecording(
          this.chartGridElement,
          () => this._getCurrentChartState()
        );
      } else {
        console.warn('Chart grid element not set - GIF recording disabled');
      }

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
   * Check if currently generating GIF
   * @returns {boolean} True if generating GIF
   */
  getIsGeneratingGif() {
    return this.isGeneratingGif;
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

    // Get full time range (total simulation time)
    const fullTimes = dataCollector.data.times;
    const endTime = fullTimes[fullTimes.length - 1] || 0;  // Total simulation time

    // Calculate current time based on viewport position
    let currentTime = endTime;  // Default to end (live mode)
    if (this.viewportMode === 'historical' && this.viewportEndIndex !== null) {
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

  // ========== Slot Management Methods (Header Revamp) ==========

  /**
   * Get current slot state (for active slot)
   * @returns {Object|null} Slot state object or null
   * @private
   */
  _getCurrentSlotState() {
    const slotId = this.tabModel.getActiveSlotId();
    if (slotId === 'welcome') return null;
    return this.slotStates.get(slotId) || null;
  }

  /**
   * Ensure slot state exists (lazy initialization)
   * @param {string} slotId - Slot ID
   * @returns {Object} Slot state object
   * @private
   */
  _ensureSlotState(slotId) {
    if (!this.slotStates.has(slotId)) {
      const slot = this.tabModel.getSlot(slotId);
      if (!slot) {
        console.warn(`SimulationController: Cannot create state for unknown slot: ${slotId}`);
        return null;
      }

      // Get problem type to determine which problem config to use
      const problemType = this.problemTypeModel.getProblemType(slot.problemTypeId);
      if (!problemType) {
        console.warn(`SimulationController: Unknown problem type: ${slot.problemTypeId}`);
        return null;
      }

      // Create new parameter model for this slot
      const parameterModel = new window.ParameterModel();

      // Create new simulation state for this slot
      const simulationState = new window.SimulationState();

      this.slotStates.set(slotId, {
        parameterModel: parameterModel,
        simulationState: simulationState,
        isRunning: false
      });
    }

    return this.slotStates.get(slotId);
  }

  /**
   * Set active problem type
   * @param {string} problemTypeId - Problem type ID
   * @returns {boolean} Success
   */
  setProblemType(problemTypeId) {
    const problemType = this.problemTypeModel.getProblemType(problemTypeId);
    if (!problemType) {
      console.warn(`SimulationController: Unknown problem type: ${problemTypeId}`);
      return false;
    }

    // Set active problem type in both models
    this.problemTypeModel.setProblemType(problemTypeId);
    this.tabModel.setActiveProblemType(problemTypeId);

    // Switch to welcome page for this problem type
    // Use setActiveSlot to trigger proper UI updates
    this.setActiveSlot('welcome');

    this.emit('problem-type-changed', { problemTypeId });

    return true;
  }

  /**
   * Reset a slot to default state (like deleting and recreating)
   * Resets name, parameters, simulation, charts, and timeline
   * @param {string} slotId - Slot ID
   * @returns {boolean} Success
   */
  resetSlot(slotId) {
    const slot = this.tabModel.getSlot(slotId);
    if (!slot) {
      console.warn(`SimulationController: Slot not found: ${slotId}`);
      return false;
    }

    const isActiveSlot = this.tabModel.getActiveSlotId() === slotId;

    // Reset name to default
    const defaultName = `Simulation ${slot.globalIndex}`;
    this.tabModel.renameSlot(slotId, defaultName);

    // Reset simulation state if it exists
    const state = this.slotStates.get(slotId);
    if (state) {
      // Stop animation if this is the active slot and running
      if (isActiveSlot && state.isRunning) {
        this._stopAnimation();
      }
      state.isRunning = false;

      // Reset parameter model to defaults
      state.parameterModel.resetToDefaults();

      // Reset simulation state with default parameters
      state.simulationState.reset(state.parameterModel.getScaledParameters());

      // If this is the active slot, do full UI reset
      if (isActiveSlot) {
        // Reset timeline to live mode
        this.viewportEndIndex = null;
        this.viewportMode = 'live';
        this.timelinePosition = 100;

        // Clear splash state
        this.splashState.frequency.active = false;
        this.splashState.amplitude.active = false;

        // Clear and update charts
        this._clearAllCharts();

        // Emit events for UI updates
        this.emit('parameters-updated', state.parameterModel.getAllParameters());
        this.emit('running-changed', false);
        this.emit('simulation-reset');
        this.emit('viewport-mode-changed', { mode: 'live' });
        this.emit('timeline-position-changed', { position: 100 });
      }
    }

    this.emit('slot-reset', { slotId });

    return true;
  }

  /**
   * Rename a slot
   * @param {string} slotId - Slot ID
   * @param {string} newName - New name
   * @returns {boolean} Success
   */
  renameSlot(slotId, newName) {
    const success = this.tabModel.renameSlot(slotId, newName);
    if (success) {
      this.emit('slot-renamed', { slotId, newName });
    }
    return success;
  }

  /**
   * Set active slot
   * @param {string} slotId - Slot ID
   * @returns {boolean} Success
   */
  setActiveSlot(slotId) {
    // Pause current slot if it's running (to track pause time for resume)
    const currentSlotId = this.tabModel.getActiveSlotId();
    if (currentSlotId && currentSlotId !== 'welcome') {
      const currentSlotState = this.slotStates.get(currentSlotId);
      if (currentSlotState && currentSlotState.isRunning) {
        currentSlotState.simulationState.pause();
      }
    }

    const success = this.tabModel.setActiveSlot(slotId);
    if (!success) return false;

    // Stop current animation
    this._stopAnimation();

    // Emit event for UI update
    this.emit('slot-activated', { slotId });

    // If switching to a simulation slot, ensure state exists and update UI
    if (slotId !== 'welcome') {
      const slotState = this._ensureSlotState(slotId);
      if (slotState) {
        // Update charts with new slot's data
        this._updateAllCharts(slotState.simulationState);

        // Update parameter controls to show new slot's parameters
        this.emit('parameters-updated', slotState.parameterModel.getAllParameters());

        // Update running state for new slot
        this.emit('running-changed', slotState.isRunning);

        // Update timeline slider to new slot's position (BUG-6 fix)
        const timelineInfo = this.getTimelineInfo();
        this.emit('timeline-position-changed', { position: timelineInfo.position });

        // Restart animation if new slot was running
        if (slotState.isRunning) {
          // Resume to adjust startTime and prevent time jump (BUG-4 fix)
          slotState.simulationState.resume();
          this._startAnimation();
        }
      }
    } else {
      // Switching to welcome screen - clear parameter display
      this.emit('parameters-updated', {});
      this.emit('running-changed', false);
    }

    return true;
  }

  /**
   * Add a new column (3 slots) to a problem type
   * @param {string} problemTypeId - Problem type ID
   * @returns {boolean} Success
   */
  addColumnToProblemType(problemTypeId) {
    const success = this.tabModel.addColumn(problemTypeId);
    if (!success) return false;

    this.emit('column-added', { problemTypeId });

    return true;
  }

  /**
   * Get slots for current problem type
   * @returns {Array} Array of slot objects
   */
  getSlotsForCurrentProblemType() {
    const problemTypeId = this.tabModel.getActiveProblemTypeId();
    return this.tabModel.getSlotsForProblemType(problemTypeId);
  }

  /**
   * Get column count for current problem type
   * @returns {number} Column count
   */
  getColumnCountForCurrentProblemType() {
    const problemTypeId = this.tabModel.getActiveProblemTypeId();
    return this.tabModel.getColumnCount(problemTypeId);
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
