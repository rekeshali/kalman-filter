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

    const newTab = {
      id: `sim-${Date.now()}`,
      name: name,
      type: 'simulation'
    };

    this.tabs.push(newTab);
    this.activeTabId = newTab.id;

    // Update nextTabNumber for future reference (though we use smart search)
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
   * Get active tab ID
   * @returns {string} Active tab ID
   */
  getActiveTabId() {
    return this.activeTabId;
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
   * Get active tab
   * @returns {Object|null} Active tab object or null
   */
  getActiveTab() {
    return this.getTab(this.activeTabId);
  }
}

// Export to global scope
window.TabModel = TabModel;
