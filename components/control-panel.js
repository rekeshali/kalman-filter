/**
 * ControlPanel component
 * Contains start/pause/reset/restart/clear buttons and timeline slider
 */

/**
 * ControlPanel - Control buttons and timeline for simulation
 * @param {Object} props
 * @param {boolean} props.isRunning - Whether simulation is running
 * @param {boolean} props.isRecording - Whether debug logging is active
 * @param {boolean} props.isGeneratingGif - Whether GIF is being generated
 * @param {number} props.timelinePosition - Current timeline position (0-100 percentage)
 * @param {number} props.currentTime - Current viewing time in seconds
 * @param {number} props.endTime - Total simulation duration in seconds
 * @param {number} props.totalPoints - Total number of data points
 * @param {Function} props.onStart - Start handler
 * @param {Function} props.onPause - Pause handler
 * @param {Function} props.onReset - Reset handler
 * @param {Function} props.onRestart - Restart handler
 * @param {Function} props.onToggleRecording - Toggle recording handler
 * @param {Function} props.onTimelineChange - Timeline slider change handler
 */
function ControlPanel({
  isRunning,
  isRecording = false,
  isGeneratingGif = false,
  timelinePosition = 100,
  currentTime = 0,
  endTime = 0,
  totalPoints = 0,
  onStart,
  onPause,
  onReset,
  onRestart,
  onToggleRecording,
  onTimelineChange
}) {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-slate-900 p-4 rounded-lg border border-gray-700 shadow-lg" style={{width: '304px'}}>
      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Playback Controls</h3>

      {/* Playback Buttons */}
      <div className="flex gap-2 justify-center flex-nowrap">
        <button
          onClick={onReset}
          className="w-12 h-12 bg-blue-700 text-white rounded-lg hover:bg-blue-600 text-2xl flex items-center justify-center shadow-lg"
          title="Reset"
        >
          ↺
        </button>
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
          onClick={onRestart}
          className="w-12 h-12 bg-orange-600 text-white rounded-lg hover:bg-orange-500 text-2xl flex items-center justify-center shadow-lg"
          title="Restart"
        >
          ↻
        </button>
        <button
          onClick={onToggleRecording}
          className={`w-12 h-12 text-white rounded-lg text-2xl flex items-center justify-center shadow-lg bg-red-700 ${
            isGeneratingGif ? 'cursor-wait' : 'hover:bg-red-600'
          }`}
          title={isGeneratingGif ? 'Generating GIF...' : (isRecording ? 'Stop Recording & Download' : 'Start Recording')}
          disabled={isGeneratingGif}
        >
          {isGeneratingGif ? (
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            isRecording ? '↓' : '●'
          )}
        </button>
      </div>

      {/* Timeline Slider - always visible to prevent layout shift */}
      <div className="w-full mt-3 px-2">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={timelinePosition}
            onChange={(e) => onTimelineChange(Number(e.target.value))}
            disabled={totalPoints === 0}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-30 disabled:cursor-not-allowed"
            title={totalPoints > 0 ? `Time: ${currentTime.toFixed(1)}s` : 'No data'}
          />
          <span className="text-xs text-gray-400 w-12">{totalPoints > 0 ? `${endTime.toFixed(1)}s` : '0.0s'}</span>
        </div>
      </div>
    </div>
  );
}

// Export to global scope
window.ControlPanel = ControlPanel;
