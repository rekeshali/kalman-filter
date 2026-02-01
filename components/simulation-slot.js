/**
 * SimulationSlot Component
 * Individual simulation slot with inline editing and reset functionality
 */

const { useState } = React;

/**
 * SimulationSlot - Individual slot in the simulation grid
 * @param {Object} props
 * @param {string} props.id - Slot ID
 * @param {string} props.name - Slot name
 * @param {boolean} props.isActive - Whether this slot is active
 * @param {Function} props.onRename - Rename handler (newName)
 * @param {Function} props.onReset - Reset handler
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.isPlaceholder - Whether this is a placeholder (Coming Soon) slot
 */
function SimulationSlot({ id, name, isActive, onRename, onReset, onClick, isPlaceholder = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  // Update edit name when prop name changes
  React.useEffect(() => {
    setEditName(name);
  }, [name]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (!isPlaceholder) {
      setIsEditing(true);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (!isPlaceholder) {
      setIsEditing(true);
    }
  };

  const handleEditBlur = () => {
    if (editName.trim()) {
      onRename(editName);
    } else {
      setEditName(name);  // Revert if empty
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (editName.trim()) {
        onRename(editName);
      } else {
        setEditName(name);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditName(name);
      setIsEditing(false);
    }
  };

  const handleResetClick = (e) => {
    e.stopPropagation();
    onReset();
  };

  const handleEditChange = (e) => {
    // Limit to 30 characters
    const value = e.target.value.substring(0, 30);
    setEditName(value);
  };

  // Override display name for placeholder slots
  const displayName = isPlaceholder ? 'Coming Soon' : name;

  return (
    <div
      className={`
        relative flex items-center gap-2 px-3 py-2 rounded-lg
        transition-all h-12 w-60
        ${isPlaceholder ? 'cursor-default' : 'cursor-pointer'}
        ${isActive
          ? 'bg-gray-100 text-gray-900 border-2 border-white shadow-lg'
          : 'bg-black text-gray-300 hover:bg-gray-900 hover:border-gray-800 border-2 border-transparent'
        }
      `}
      onClick={isPlaceholder ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Editable name */}
      {isEditing && !isPlaceholder ? (
        <input
          type="text"
          value={editName}
          onChange={handleEditChange}
          onBlur={handleEditBlur}
          onKeyDown={handleEditKeyDown}
          className="flex-1 bg-gray-600 px-2 py-1 rounded text-white text-sm outline-none focus:ring-2 focus:ring-blue-400"
          maxLength={30}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-sm font-semibold tracking-wide truncate select-none"
          onDoubleClick={handleDoubleClick}
          title={displayName}
        >
          {displayName}
        </span>
      )}

      {/* Edit and Reset buttons (visible on hover, hidden when editing or placeholder) */}
      {isHovered && !isEditing && !isPlaceholder && (
        <>
          <button
            onClick={handleEditClick}
            className="text-gray-400 hover:text-blue-400 text-sm transition-colors flex items-center justify-center w-6 h-6"
            title="Rename simulation"
          >
            ✎
          </button>
          <button
            onClick={handleResetClick}
            className="text-gray-400 hover:text-red-400 text-lg transition-colors flex items-center justify-center w-6 h-6"
            title="Reset simulation and name"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

// Export to global scope
window.SimulationSlot = SimulationSlot;
