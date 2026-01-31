/**
 * ControlPanel component
 * Contains start/pause/reset/restart buttons
 */

/**
 * ControlPanel - Control buttons for simulation
 * @param {Object} props
 * @param {boolean} props.isRunning - Whether simulation is running
 * @param {Function} props.onStart - Start handler
 * @param {Function} props.onPause - Pause handler
 * @param {Function} props.onReset - Reset handler
 * @param {Function} props.onRestart - Restart handler
 */
function ControlPanel({ isRunning, onStart, onPause, onReset, onRestart }) {
  return (
    <div className="flex gap-2 justify-center">
      <button
        onClick={onStart}
        className="w-12 h-12 bg-green-700 text-white rounded-lg hover:bg-green-600 text-2xl disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
        disabled={isRunning}
        title="Start"
      >
        ▶
      </button>
      <button
        onClick={onPause}
        className="w-12 h-12 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 text-xl disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
        disabled={!isRunning}
        title="Pause"
      >
        ❚❚
      </button>
      <button
        onClick={onReset}
        className="w-12 h-12 bg-blue-700 text-white rounded-lg hover:bg-blue-600 text-2xl flex items-center justify-center shadow-lg"
        title="Reset"
      >
        ↺
      </button>
      <button
        onClick={onRestart}
        className="w-12 h-12 bg-orange-600 text-white rounded-lg hover:bg-orange-500 text-2xl flex items-center justify-center shadow-lg"
        title="Restart"
      >
        ↻
      </button>
    </div>
  );
}

// Export to global scope
window.ControlPanel = ControlPanel;
