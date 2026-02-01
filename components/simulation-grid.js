/**
 * SimulationGrid Component
 * 3×N grid of simulation slots with add column functionality
 */

const { SimulationSlot } = window;

/**
 * SimulationGrid - Grid of simulation slots (3 rows × N columns)
 * @param {Object} props
 * @param {Array} props.slots - Array of slot objects {id, name, columnIndex, rowIndex, isActive}
 * @param {number} props.columns - Number of columns
 * @param {Function} props.onSlotClick - Slot click handler (slotId)
 * @param {Function} props.onSlotRename - Slot rename handler (slotId, newName)
 * @param {Function} props.onSlotReset - Slot reset handler (slotId)
 * @param {Function} props.onAddColumn - Add column handler
 */
function SimulationGrid({
  slots,
  columns,
  onSlotClick,
  onSlotRename,
  onSlotReset,
  onAddColumn,
  children  // Optional content to render after + button
}) {
  // Sort slots by column and row for proper grid rendering
  const sortedSlots = [...slots].sort((a, b) => {
    if (a.columnIndex !== b.columnIndex) {
      return a.columnIndex - b.columnIndex;
    }
    return a.rowIndex - b.rowIndex;
  });

  return (
    <div className="flex items-center gap-2 overflow-visible">
      {/* Slot Grid */}
      <div
        className="grid grid-rows-3 gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, 240px)`,
          gridAutoFlow: 'column'  // Fill by columns
        }}
      >
        {sortedSlots.map(slot => (
          <SimulationSlot
            key={slot.id}
            id={slot.id}
            name={slot.name}
            isActive={slot.isActive || false}
            isPlaceholder={slot.isPlaceholder || false}
            onRename={(newName) => onSlotRename(slot.id, newName)}
            onReset={() => onSlotReset(slot.id)}
            onClick={() => onSlotClick(slot.id)}
          />
        ))}
      </div>

      {/* Add Column Button - HIDDEN (fixed to 3 slots per problem type) */}
      {/* <button
        onClick={onAddColumn}
        className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 rounded-lg text-2xl text-gray-300 hover:text-white transition-colors flex items-center justify-center shadow-md hover:shadow-lg"
        style={{
          width: '3rem',
          height: 'calc(3 * 3rem + 2 * 0.5rem)'  // Same height as 3 slots + gaps
        }}
        title={`Add column (${columns} column${columns !== 1 ? 's' : ''}, ${slots.length} slots)`}
      >
        +
      </button> */}

      {/* Optional content after + button (e.g., EKF flowchart) */}
      {children}
    </div>
  );
}

// Export to global scope
window.SimulationGrid = SimulationGrid;
