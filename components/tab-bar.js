/**
 * TabBar component
 * Chrome-style tabs with edit/close functionality
 */

const { useState } = React;

/**
 * TabBar - Chrome-style tab navigation
 * @param {Object} props
 * @param {Array} props.tabs - Array of tab objects {id, name, type}
 * @param {string} props.activeTabId - Currently active tab ID
 * @param {Function} props.onTabChange - Tab change handler (tabId)
 * @param {Function} props.onTabClose - Tab close handler (tabId)
 * @param {Function} props.onTabRename - Tab rename handler (tabId, newName)
 * @param {Function} props.onAddTab - Add new tab handler
 */
function TabBar({ tabs, activeTabId, onTabChange, onTabClose, onTabRename, onAddTab }) {
  const [hoveredTabId, setHoveredTabId] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');

  const startEditingTab = (tabId, currentName) => {
    if (tabId === 'welcome') return; // Can't rename welcome tab
    setEditingTabId(tabId);
    setEditingTabName(currentName);
  };

  const finishEditingTab = (tabId) => {
    if (editingTabName.trim()) {
      onTabRename(tabId, editingTabName.trim());
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const cancelEditingTab = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  return (
    <div className="flex items-end gap-1 mt-3 -mb-4 bg-gray-800 px-2 pt-1">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`
            relative flex items-center gap-2 px-4 py-3 rounded-t-lg cursor-pointer
            transition-all group min-w-[140px] max-w-[250px]
            ${activeTabId === tab.id
              ? 'bg-gray-900 text-white shadow-lg'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-650 hover:text-gray-200'
            }
          `}
          onClick={() => onTabChange(tab.id)}
          onMouseEnter={() => setHoveredTabId(tab.id)}
          onMouseLeave={() => setHoveredTabId(null)}
        >
          {/* Pencil icon on hover (for non-welcome tabs) */}
          {tab.type !== 'welcome' && hoveredTabId === tab.id && editingTabId !== tab.id && (
            <button
              onClick={(e) => { e.stopPropagation(); startEditingTab(tab.id, tab.name); }}
              className="text-gray-400 hover:text-white text-sm"
              title="Rename tab"
            >
              ✎
            </button>
          )}

          {/* Tab name (editable or display) */}
          {editingTabId === tab.id ? (
            <input
              type="text"
              value={editingTabName}
              onChange={(e) => setEditingTabName(e.target.value)}
              onBlur={() => finishEditingTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishEditingTab(tab.id);
                if (e.key === 'Escape') cancelEditingTab();
              }}
              className="bg-gray-600 px-2 py-1 rounded text-white text-sm flex-1 min-w-0"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium truncate flex-1 min-w-0" title={tab.name}>
              {tab.name.length > 30 ? tab.name.substring(0, 30) + '...' : tab.name}
            </span>
          )}

          {/* Close button (for non-welcome tabs) */}
          {tab.type !== 'welcome' && (
            <button
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
              className="ml-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded w-5 h-5 flex items-center justify-center text-sm"
              title="Close tab"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {/* Add new tab button */}
      <button
        onClick={onAddTab}
        className="px-4 py-3 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-t-lg transition-all font-bold text-lg"
        title="Add new simulation tab"
      >
        +
      </button>
    </div>
  );
}

// Export to global scope
window.TabBar = TabBar;
