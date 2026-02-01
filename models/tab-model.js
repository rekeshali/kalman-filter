/**
 * Tab state management
 * Manages Chrome-style tab creation, removal, activation, and renaming
 */
class TabModel extends window.EventEmitter {
  /**
   * @param {Array} initialTabs - Initial tab configuration
   */
  constructor(initialTabs = null) {
    super();
    this.tabs = initialTabs || [{ id: 'welcome', name: 'Welcome', type: 'welcome' }];
    this.activeTabId = 'welcome';
    this.nextTabNumber = 1;

    // Slot-based management (new header revamp)
    // Map: problemTypeId -> Array of slot objects
    this.simulationsByProblemType = new Map();

    // Map: problemTypeId -> column count
    this.columnsByProblemType = new Map([
      ['simple-wave', 1]  // Start with 1 column (3 slots)
    ]);

    this.activeProblemTypeId = 'simple-wave';
    this.activeSlotId = 'welcome';

    // Initialize slots for simple-wave
    this._initializeProblemType('simple-wave');
  }

  /**
   * Initialize slots for a problem type
   * @param {string} problemTypeId - Problem type ID
   * @private
   */
  _initializeProblemType(problemTypeId) {
    if (!this.simulationsByProblemType.has(problemTypeId)) {
      this.simulationsByProblemType.set(problemTypeId, []);
    }

    const columns = this.columnsByProblemType.get(problemTypeId) || 1;
    const existing = this.simulationsByProblemType.get(problemTypeId);

    // Create initial columns
    for (let col = 0; col < columns; col++) {
      const columnSlots = this._createSlotsForColumn(problemTypeId, col);
      existing.push(...columnSlots);
    }
  }

  /**
   * Add a new simulation tab with smart naming
   * Finds the lowest available "Simulation N" number
   * @param {string} name - Optional custom name
   * @returns {string} New tab ID
   */
  addTab(name) {
    // Smart naming: find lowest available "Simulation N"
    if (!name) {
      let n = 1;
      while (this.tabs.some(tab => tab.name === `Simulation ${n}`)) {
        n++;
      }
      name = `Simulation ${n}`;
    }

    // Use counter to ensure unique IDs even when called rapidly
    const newTab = {
      id: `sim-${Date.now()}-${this.nextTabNumber}`,
      name: name,
      type: 'simulation'
    };

    this.tabs.push(newTab);
    this.activeTabId = newTab.id;

    // Update nextTabNumber for future reference
    this.nextTabNumber++;

    this.emit('tab-added', { tab: newTab });

    return newTab.id;
  }

  /**
   * Remove a tab (cannot remove Welcome tab)
   * @param {string} tabId - Tab ID to remove
   * @returns {boolean} True if removed successfully
   */
  removeTab(tabId) {
    if (tabId === 'welcome') {
      console.warn('TabModel: Cannot remove Welcome tab');
      return false;
    }

    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) {
      console.warn(`TabModel: Tab not found: ${tabId}`);
      return false;
    }

    this.tabs.splice(index, 1);

    // If removing active tab, switch to Welcome
    if (this.activeTabId === tabId) {
      this.activeTabId = 'welcome';
      this.emit('tab-activated', { tabId: 'welcome' });
    }

    this.emit('tab-removed', { tabId });

    return true;
  }

  /**
   * Set the active tab
   * @param {string} tabId - Tab ID to activate
   * @returns {boolean} True if activated successfully
   */
  setActiveTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) {
      console.warn(`TabModel: Tab not found: ${tabId}`);
      return false;
    }

    this.activeTabId = tabId;
    this.emit('tab-activated', { tabId });

    return true;
  }

  /**
   * Rename a tab (cannot rename Welcome tab)
   * @param {string} tabId - Tab ID to rename
   * @param {string} name - New name
   * @returns {boolean} True if renamed successfully
   */
  renameTab(tabId, name) {
    if (tabId === 'welcome') {
      console.warn('TabModel: Cannot rename Welcome tab');
      return false;
    }

    if (!name || !name.trim()) {
      console.warn('TabModel: Invalid tab name');
      return false;
    }

    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) {
      console.warn(`TabModel: Tab not found: ${tabId}`);
      return false;
    }

    const oldName = tab.name;
    tab.name = name.trim();

    this.emit('tab-renamed', { tabId, name: tab.name, oldName });

    return true;
  }

  /**
   * Get all tabs
   * @returns {Array} Copy of tabs array
   */
  getTabs() {
    return [...this.tabs];
  }

  /**
   * Get all tabs (alias for getTabs)
   * @returns {Array} Copy of tabs array
   */
  getAllTabs() {
    return this.getTabs();
  }

  /**
   * Get active tab ID
   * @returns {string} Active tab ID
   */
  getActiveTabId() {
    return this.activeTabId;
  }

  /**
   * Get active tab (alias for getActiveTabId)
   * @returns {string} Active tab ID
   */
  getActiveTab() {
    return this.getActiveTabId();
  }

  /**
   * Get a specific tab
   * @param {string} tabId - Tab ID
   * @returns {Object|null} Tab object or null
   */
  getTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    return tab ? { ...tab } : null;
  }

  /**
   * Get active tab object
   * @returns {Object|null} Active tab object or null
   */
  getActiveTabObject() {
    return this.getTab(this.activeTabId);
  }

  // ========== Slot Management Methods (Header Revamp) ==========

  /**
   * Create 3 slots for a column
   * @param {string} problemTypeId - Problem type ID
   * @param {number} columnIndex - Column index (0-based)
   * @returns {Array} Array of 3 slot objects
   * @private
   */
  _createSlotsForColumn(problemTypeId, columnIndex) {
    const slots = [];
    for (let row = 0; row < 3; row++) {
      const globalIndex = columnIndex * 3 + row + 1;
      slots.push({
        id: `${problemTypeId}-slot-${globalIndex}`,
        name: `Simulation ${globalIndex}`,
        problemTypeId: problemTypeId,
        columnIndex: columnIndex,
        rowIndex: row,
        globalIndex: globalIndex
      });
    }
    return slots;
  }

  /**
   * Add a new column (3 slots) to a problem type
   * @param {string} problemTypeId - Problem type ID
   * @returns {boolean} Success
   */
  addColumn(problemTypeId) {
    if (!this.simulationsByProblemType.has(problemTypeId)) {
      console.warn(`TabModel: Problem type not found: ${problemTypeId}`);
      return false;
    }

    const currentColumns = this.columnsByProblemType.get(problemTypeId) || 0;
    const newColumnIndex = currentColumns;

    // Create 3 new slots
    const newSlots = this._createSlotsForColumn(problemTypeId, newColumnIndex);
    const slots = this.simulationsByProblemType.get(problemTypeId);
    slots.push(...newSlots);

    // Update column count
    this.columnsByProblemType.set(problemTypeId, currentColumns + 1);

    this.emit('column-added', { problemTypeId, columnIndex: newColumnIndex, slots: newSlots });

    return true;
  }

  /**
   * Reset a slot to default name
   * @param {string} slotId - Slot ID
   * @returns {boolean} Success
   */
  resetSlot(slotId) {
    const slot = this.getSlot(slotId);
    if (!slot) {
      console.warn(`TabModel: Slot not found: ${slotId}`);
      return false;
    }

    const defaultName = `Simulation ${slot.globalIndex}`;
    const oldName = slot.name;
    slot.name = defaultName;

    this.emit('slot-reset', { slotId, name: defaultName, oldName });

    return true;
  }

  /**
   * Rename a slot
   * @param {string} slotId - Slot ID
   * @param {string} newName - New name (max 30 chars)
   * @returns {boolean} Success
   */
  renameSlot(slotId, newName) {
    if (!newName || !newName.trim()) {
      console.warn('TabModel: Invalid slot name');
      return false;
    }

    const slot = this.getSlot(slotId);
    if (!slot) {
      console.warn(`TabModel: Slot not found: ${slotId}`);
      return false;
    }

    const oldName = slot.name;
    slot.name = newName.trim().substring(0, 30);  // Truncate to 30 chars

    this.emit('slot-renamed', { slotId, name: slot.name, oldName });

    return true;
  }

  /**
   * Get all slots for a problem type
   * @param {string} problemTypeId - Problem type ID
   * @returns {Array} Array of slot objects
   */
  getSlotsForProblemType(problemTypeId) {
    const slots = this.simulationsByProblemType.get(problemTypeId);
    return slots ? [...slots] : [];
  }

  /**
   * Get a specific slot
   * @param {string} slotId - Slot ID
   * @returns {Object|null} Slot object or null
   */
  getSlot(slotId) {
    for (const slots of this.simulationsByProblemType.values()) {
      const slot = slots.find(s => s.id === slotId);
      if (slot) return slot;
    }
    return null;
  }

  /**
   * Set the active slot
   * @param {string} slotId - Slot ID to activate
   * @returns {boolean} Success
   */
  setActiveSlot(slotId) {
    if (slotId === 'welcome') {
      this.activeSlotId = 'welcome';
      this.emit('slot-activated', { slotId: 'welcome' });
      return true;
    }

    const slot = this.getSlot(slotId);
    if (!slot) {
      console.warn(`TabModel: Slot not found: ${slotId}`);
      return false;
    }

    this.activeSlotId = slotId;
    this.activeProblemTypeId = slot.problemTypeId;

    this.emit('slot-activated', { slotId, problemTypeId: slot.problemTypeId });

    return true;
  }

  /**
   * Get active slot ID
   * @returns {string} Active slot ID
   */
  getActiveSlotId() {
    return this.activeSlotId;
  }

  /**
   * Get number of columns for a problem type
   * @param {string} problemTypeId - Problem type ID
   * @returns {number} Column count
   */
  getColumnCount(problemTypeId) {
    return this.columnsByProblemType.get(problemTypeId) || 0;
  }

  /**
   * Set active problem type
   * @param {string} problemTypeId - Problem type ID
   * @returns {boolean} Success
   */
  setActiveProblemType(problemTypeId) {
    if (!this.simulationsByProblemType.has(problemTypeId)) {
      // Initialize if not exists
      this._initializeProblemType(problemTypeId);
    }

    this.activeProblemTypeId = problemTypeId;
    this.activeSlotId = 'welcome';  // Reset to welcome when switching types

    this.emit('problem-type-changed', { problemTypeId });

    return true;
  }

  /**
   * Get active problem type ID
   * @returns {string} Active problem type ID
   */
  getActiveProblemTypeId() {
    return this.activeProblemTypeId;
  }
}

// Export to global scope
window.TabModel = TabModel;
