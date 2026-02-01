/**
 * ParameterControls component
 * All 13 simulation parameters with tooltips
 */

const { Tooltip } = window;

/**
 * LevelButtonGroup - Reusable button group for zero/low/med/high levels
 */
function LevelButtonGroup({ value, onChange, compact = false }) {
  const sizeClass = compact ? 'px-1.5 py-1 text-xs' : 'px-2 py-1.5 text-sm';

  return (
    <div className="flex">
      <button
        onClick={() => onChange('zero')}
        className={`flex-1 ${sizeClass} font-medium transition-colors ${
          value === 'zero'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        } rounded-l`}
      >
        Ø
      </button>
      <button
        onClick={() => onChange('low')}
        className={`flex-1 ${sizeClass} font-medium transition-colors ${
          value === 'low'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        L
      </button>
      <button
        onClick={() => onChange('med')}
        className={`flex-1 ${sizeClass} font-medium transition-colors ${
          value === 'med'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        M
      </button>
      <button
        onClick={() => onChange('high')}
        className={`flex-1 ${sizeClass} font-medium transition-colors ${
          value === 'high'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        } rounded-r`}
      >
        H
      </button>
    </div>
  );
}

/**
 * SplashButton - Inline button with hold-to-sustain and progress bar
 * Progress bar only shows after holding for 0.5s
 */
function SplashButton({ onStart, onEnd, progress, active }) {
  const [isHolding, setIsHolding] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);
  const holdTimerRef = React.useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsHolding(true);
    onStart();

    // Only show progress bar after 0.5s of holding
    holdTimerRef.current = setTimeout(() => {
      setShowProgress(true);
    }, 500);
  };

  const handleMouseUp = () => {
    setIsHolding(false);
    setShowProgress(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    onEnd();
  };

  const handleMouseLeave = () => {
    if (isHolding) {
      handleMouseUp();
    }
  };

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  // Progress bar width: 6s max sustain = 100%
  const progressPercent = Math.min(progress * 100, 100);

  // Show active color only while holding, fade out on release
  const isActiveDisplay = active && isHolding;

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      className={`relative flex-1 py-1 rounded font-medium overflow-hidden transition-all duration-300 ${
        isActiveDisplay
          ? 'bg-gray-600 text-white'
          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
      }`}
      title="Click for bump, hold to sustain (6s max)"
    >
      {/* Progress bar - blue fill from left, only show if held > 0.5s */}
      {showProgress && isHolding && (
        <div
          className="absolute inset-0 bg-blue-600"
          style={{ width: `${progressPercent}%`, left: 0 }}
        />
      )}
      <span className="relative z-10 text-2xl leading-none">≋</span>
    </button>
  );
}

/**
 * ParameterControls - All simulation parameter controls
 * @param {Object} props
 * @param {Object} props.parameters - All parameter values
 * @param {Function} props.onParameterChange - Parameter change handler (name, value)
 * @param {Function} props.onSplashFrequencyStart - Splash frequency start handler (mousedown)
 * @param {Function} props.onSplashFrequencyEnd - Splash frequency end handler (mouseup)
 * @param {Function} props.onSplashAmplitudeStart - Splash amplitude start handler (mousedown)
 * @param {Function} props.onSplashAmplitudeEnd - Splash amplitude end handler (mouseup)
 * @param {Object} props.splashProgress - Splash progress state { frequency: {progress, active}, amplitude: {progress, active} }
 */
function ParameterControls({ parameters, onParameterChange, onSplashFrequencyStart, onSplashFrequencyEnd, onSplashAmplitudeStart, onSplashAmplitudeEnd, splashProgress }) {
  const {
    frequency = 0.5,
    scale = 1.0,
    waveType = 'sine',
    jitter = 'low',
    trueInertialNoise = 'low',
    trueInertialBias = 'low',
    ekfProcessNoise = 'low',
    ekfInertialBias = 'low',
    trueProbeNoise = 'low',
    trueProbeBias = 'low',
    ekfProbeNoise = 'low',
    ekfProbeBias = 'low'
  } = parameters;

  const incrementFrequency = () => {
    onParameterChange('frequency', Math.min(2.0, frequency + 0.1));
  };

  const decrementFrequency = () => {
    onParameterChange('frequency', Math.max(0.1, frequency - 0.1));
  };

  const incrementScale = () => {
    onParameterChange('scale', Math.min(5.0, scale + 0.5));
  };

  const decrementScale = () => {
    onParameterChange('scale', Math.max(0.1, scale - 0.5));
  };

  return (
    <div className="space-y-3">
      {/* Wave Parameters */}
      <div className="border border-gray-600 rounded p-3 bg-gray-800 shadow-lg" style={{width: '304px'}}>
        <h3 className="font-semibold text-gray-300 text-sm mb-2">Wave Parameters</h3>

        {/* Frequency and Amplitude */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Tooltip
            text={`Wave Frequency: ${frequency.toFixed(1)} Hz. Controls how fast the wave oscillates.\n\nRange: 0.1 - 2.0 Hz`}
            position="bottom"
          >
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-200">
                Frequency: <span className="text-blue-400">{frequency.toFixed(1)} Hz</span>
              </label>
              <div className="flex gap-1">
                <button onClick={decrementFrequency} className="px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▼</button>
                <button onClick={incrementFrequency} className="px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▲</button>
                <SplashButton
                  onStart={onSplashFrequencyStart}
                  onEnd={onSplashFrequencyEnd}
                  progress={splashProgress?.frequency?.progress || 0}
                  active={splashProgress?.frequency?.active || false}
                />
              </div>
            </div>
          </Tooltip>

          <Tooltip
            text={`Wave Amplitude: ${scale.toFixed(1)}x. Multiplies the wave amplitude.\n\nRange: 0.1x - 5.0x`}
            position="bottom"
          >
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-200">
                Amplitude: <span className="text-blue-400">{scale.toFixed(1)}x</span>
              </label>
              <div className="flex gap-1">
                <button onClick={decrementScale} className="px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▼</button>
                <button onClick={incrementScale} className="px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 text-sm">▲</button>
                <SplashButton
                  onStart={onSplashAmplitudeStart}
                  onEnd={onSplashAmplitudeEnd}
                  progress={splashProgress?.amplitude?.progress || 0}
                  active={splashProgress?.amplitude?.active || false}
                />
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Wave Type and Jitter */}
        <div className="grid grid-cols-2 gap-3">
          <Tooltip
            text={`Wave Type: ${waveType.charAt(0).toUpperCase() + waveType.slice(1)}. Determines the wave shape.\n\nOptions: Sine, Triangle, Square`}
            position="bottom"
          >
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-200">
                Type: <span className="text-blue-400">{waveType.charAt(0).toUpperCase() + waveType.slice(1)}</span>
              </label>
              <div className="flex">
                <button
                  onClick={() => onParameterChange('waveType', 'sine')}
                  className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                    waveType === 'sine' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } rounded-l`}
                  title="Sine"
                >
                  ∿
                </button>
                <button
                  onClick={() => onParameterChange('waveType', 'triangle')}
                  className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                    waveType === 'triangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Triangle"
                >
                  △
                </button>
                <button
                  onClick={() => onParameterChange('waveType', 'square')}
                  className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors ${
                    waveType === 'square' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } rounded-r`}
                  title="Square"
                >
                  ⊓⊔
                </button>
              </div>
            </div>
          </Tooltip>

          <Tooltip
            text={`Process Noise (Jitter): ${jitter.charAt(0).toUpperCase() + jitter.slice(1)}. Random perturbations to the true trajectory (Ornstein-Uhlenbeck process).`}
            position="bottom"
          >
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-200">
                Jitter: <span className="text-blue-400">{jitter.charAt(0).toUpperCase() + jitter.slice(1)}</span>
              </label>
              <LevelButtonGroup value={jitter} onChange={(v) => onParameterChange('jitter', v)} />
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Inertial Sensor */}
      <div className="border border-gray-600 rounded p-3 bg-gray-800 shadow-lg" style={{width: '304px'}}>
        <Tooltip
          text="Inertial Sensor (Accelerometer): Measures acceleration (second derivative of position). Examples: IMU, MEMS accelerometer in smartphones, drones, vehicles."
          position="top"
        >
          <h3 className="font-semibold text-gray-300 text-sm mb-2">Inertial Sensor</h3>
        </Tooltip>

        <div className="grid grid-cols-2 gap-3">
          {/* Noise Column */}
          <div>
            <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Noise</p>

            <Tooltip
              text={`Inertial Sensor Noise - TRUE: The actual noise level in the simulated sensor. Current: ${trueInertialNoise.charAt(0).toUpperCase() + trueInertialNoise.slice(1)}\n\nOptions: Zero, Low (0.05), Med (0.2), High (0.5)`}
              position="top"
            >
              <div className="mb-2">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueInertialNoise.charAt(0).toUpperCase() + trueInertialNoise.slice(1)}</span>
                </label>
                <LevelButtonGroup value={trueInertialNoise} onChange={(v) => onParameterChange('trueInertialNoise', v)} compact />
              </div>
            </Tooltip>

            <Tooltip
              text={`Inertial Sensor Noise - EKF: What the filter thinks the noise level is (process noise Q matrix). Current: ${ekfProcessNoise.charAt(0).toUpperCase() + ekfProcessNoise.slice(1)}\n\nOptions: Zero, Low (0.05), Med (0.2), High (0.5)`}
              position="top"
            >
              <div>
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfProcessNoise.charAt(0).toUpperCase() + ekfProcessNoise.slice(1)}</span>
                </label>
                <LevelButtonGroup value={ekfProcessNoise} onChange={(v) => onParameterChange('ekfProcessNoise', v)} compact />
              </div>
            </Tooltip>
          </div>

          {/* Bias Column */}
          <div>
            <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Bias</p>

            <Tooltip
              text={`Inertial Sensor Bias - TRUE: Constant offset error in accelerometer readings. Current: ${trueInertialBias.charAt(0).toUpperCase() + trueInertialBias.slice(1)}\n\nOptions: Zero, Low (0.1), Med (0.5), High (1.0)`}
              position="top"
            >
              <div className="mb-2">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueInertialBias.charAt(0).toUpperCase() + trueInertialBias.slice(1)}</span>
                </label>
                <LevelButtonGroup value={trueInertialBias} onChange={(v) => onParameterChange('trueInertialBias', v)} compact />
              </div>
            </Tooltip>

            <Tooltip
              text={`Inertial Sensor Bias - EKF: What the filter thinks the bias is. Current: ${ekfInertialBias.charAt(0).toUpperCase() + ekfInertialBias.slice(1)}\n\nOptions: Zero, Low (0.1), Med (0.5), High (1.0)`}
              position="top"
            >
              <div>
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfInertialBias.charAt(0).toUpperCase() + ekfInertialBias.slice(1)}</span>
                </label>
                <LevelButtonGroup value={ekfInertialBias} onChange={(v) => onParameterChange('ekfInertialBias', v)} compact />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* External Probe */}
      <div className="border border-gray-600 rounded p-3 bg-gray-800 shadow-lg" style={{width: '304px'}}>
        <Tooltip
          text="External Probe (Position Sensor): Directly measures position. Examples: GPS, ultrasonic rangefinder, laser distance meter. Provides reference measurements to correct drift."
          position="top"
        >
          <h3 className="font-semibold text-gray-300 text-sm mb-2">External Probe</h3>
        </Tooltip>

        <div className="grid grid-cols-2 gap-3">
          {/* Noise Column */}
          <div>
            <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Noise</p>

            <Tooltip
              text={`External Probe Noise - TRUE: The actual noise level in the simulated probe. Current: ${trueProbeNoise.charAt(0).toUpperCase() + trueProbeNoise.slice(1)}\n\nOptions: Zero, Low (0.02), Med (0.1), High (0.3)`}
              position="top"
            >
              <div className="mb-2">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueProbeNoise.charAt(0).toUpperCase() + trueProbeNoise.slice(1)}</span>
                </label>
                <LevelButtonGroup value={trueProbeNoise} onChange={(v) => onParameterChange('trueProbeNoise', v)} compact />
              </div>
            </Tooltip>

            <Tooltip
              text={`External Probe Noise - EKF: What the filter thinks the probe noise is (measurement noise R matrix). Current: ${ekfProbeNoise.charAt(0).toUpperCase() + ekfProbeNoise.slice(1)}\n\nOptions: Zero, Low (0.02), Med (0.1), High (0.3)`}
              position="top"
            >
              <div>
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfProbeNoise.charAt(0).toUpperCase() + ekfProbeNoise.slice(1)}</span>
                </label>
                <LevelButtonGroup value={ekfProbeNoise} onChange={(v) => onParameterChange('ekfProbeNoise', v)} compact />
              </div>
            </Tooltip>
          </div>

          {/* Bias Column */}
          <div>
            <p className="text-xs font-semibold mb-1 text-gray-200 text-center">Bias</p>

            <Tooltip
              text={`External Probe Bias - TRUE: Constant offset error in position sensor. Current: ${trueProbeBias.charAt(0).toUpperCase() + trueProbeBias.slice(1)}\n\nOptions: Zero, Low (0.05), Med (0.2), High (0.5)`}
              position="top"
            >
              <div className="mb-2">
                <label className="block text-xs mb-1 text-gray-200">
                  TRUE: <span className="text-blue-400">{trueProbeBias.charAt(0).toUpperCase() + trueProbeBias.slice(1)}</span>
                </label>
                <LevelButtonGroup value={trueProbeBias} onChange={(v) => onParameterChange('trueProbeBias', v)} compact />
              </div>
            </Tooltip>

            <Tooltip
              text={`External Probe Bias - EKF: What the filter thinks the probe bias is. Current: ${ekfProbeBias.charAt(0).toUpperCase() + ekfProbeBias.slice(1)}\n\nOptions: Zero, Low (0.05), Med (0.2), High (0.5)`}
              position="top"
            >
              <div>
                <label className="block text-xs mb-1 text-gray-200">
                  EKF: <span className="text-blue-400">{ekfProbeBias.charAt(0).toUpperCase() + ekfProbeBias.slice(1)}</span>
                </label>
                <LevelButtonGroup value={ekfProbeBias} onChange={(v) => onParameterChange('ekfProbeBias', v)} compact />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export to global scope
window.ParameterControls = ParameterControls;
