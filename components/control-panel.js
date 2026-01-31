/**
 * ControlPanel component
 * Contains start/pause/reset/restart/clear buttons and timeline slider
 */

/**
 * ControlPanel - Control buttons and timeline for simulation
 * @param {Object} props
 * @param {boolean} props.isRunning - Whether simulation is running
 * @param {string} props.viewportMode - 'live' or 'historical'
 * @param {number} props.timelinePosition - Current timeline position (0-100 percentage)
 * @param {number} props.currentTime - Current viewing time in seconds
 * @param {number} props.endTime - Total simulation duration in seconds
 * @param {number} props.totalPoints - Total number of data points
 * @param {Function} props.onStart - Start handler
 * @param {Function} props.onPause - Pause handler
 * @param {Function} props.onReset - Reset handler
 * @param {Function} props.onRestart - Restart handler
 * @param {Function} props.onClearHistory - Clear history handler
 * @param {Function} props.onTimelineChange - Timeline slider change handler
 */
function ControlPanel({
  isRunning,
  viewportMode = 'live',
  timelinePosition = 100,
  currentTime = 0,
  endTime = 0,
  totalPoints = 0,
  onStart,
  onPause,
  onReset,
  onRestart,
  onClearHistory,
  onTimelineChange
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Playback Controls */}
      <div className="flex gap-2 justify-center flex-wrap">
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
        <button
          onClick={onClearHistory}
          className="w-12 h-12 bg-red-700 text-white rounded-lg hover:bg-red-600 text-xl flex items-center justify-center shadow-lg"
          title="Clear History"
        >
          🗑
        </button>
      </div>

      {/* Timeline Slider - only show when data exists */}
      {totalPoints > 0 && (
        <div className="w-full px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-8 text-right">0s</span>
            <input
              type="range"
              min="0"
              max="100"
              value={timelinePosition}
              onChange={(e) => onTimelineChange(Number(e.target.value))}
              disabled={isRunning}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              title={`Time: ${currentTime.toFixed(1)}s`}
            />
            <span className="text-xs text-gray-400 w-12">{endTime.toFixed(1)}s</span>
          </div>
          <div className="text-center text-xs text-gray-500 mt-1">
            {viewportMode === 'live' ? 'Live Mode' : `Viewing: ${currentTime.toFixed(1)}s`}
          </div>
        </div>
      )}
    </div>
  );
}

// Export to global scope
window.ControlPanel = ControlPanel;
