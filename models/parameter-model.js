/**
 * Parameter validation, transformation, and state management
 * Manages all 13 simulation parameters with validation and scaling
 */
class ParameterModel extends window.EventEmitter {
  /**
   * @param {Object} initialParams - Initial parameter values
   */
  constructor(initialParams = {}) {
    super();
    this.params = { ...window.Config.DEFAULTS, ...initialParams };
  }

  /**
   * Validate a parameter value
   * @param {string} name - Parameter name
   * @param {*} value - Parameter value
   * @returns {boolean} True if valid
   */
  validate(name, value) {
    const validators = {
      frequency: (v) => typeof v === 'number' && v >= 0.1 && v <= 2.0,
      scale: (v) => typeof v === 'number' && v >= 0.1 && v <= 5.0,
      trueInertialNoise: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      trueInertialBias: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      ekfProcessNoise: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      ekfInertialBias: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      trueProbeNoise: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      trueProbeBias: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      ekfProbeNoise: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      ekfProbeBias: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      jitter: (v) => ['zero', 'low', 'med', 'high'].includes(v),
      waveType: (v) => ['sine', 'triangle', 'square'].includes(v)
    };

    return validators[name] ? validators[name](value) : true;
  }

  /**
   * Set a parameter value
   * @param {string} name - Parameter name
   * @param {*} value - Parameter value
   * @returns {boolean} True if set successfully
   */
  setParameter(name, value) {
    if (!this.validate(name, value)) {
      console.warn(`ParameterModel: Invalid parameter: ${name} = ${value}`);
      return false;
    }

    const oldValue = this.params[name];
    this.params[name] = value;

    // Emit event for change
    this.emit('parameter-changed', { name, value, oldValue });

    return true;
  }

  /**
   * Get a parameter value
   * @param {string} name - Parameter name
   * @returns {*} Parameter value
   */
  getParameter(name) {
    return this.params[name];
  }

  /**
   * Get all parameters
   * @returns {Object} All parameter values
   */
  getAllParameters() {
    return { ...this.params };
  }

  /**
   * Get scaled parameters (map string values to numbers from Config)
   * @returns {Object} Scaled parameter values
   */
  getScaledParameters() {
    const scale = this.params.scale || 1.0;

    return {
      // Inertial sensor parameters
      trueInertialNoise: window.Config.NOISE_LEVELS[this.params.trueInertialNoise] * scale,
      trueInertialBias: window.Config.BIAS_LEVELS[this.params.trueInertialBias] * scale,
      ekfProcessNoise: window.Config.NOISE_LEVELS[this.params.ekfProcessNoise] * scale,
      ekfInertialBias: window.Config.BIAS_LEVELS[this.params.ekfInertialBias] * scale,

      // External probe parameters
      trueProbeNoise: window.Config.PROBE_NOISE_LEVELS[this.params.trueProbeNoise] * scale,
      trueProbeBias: window.Config.PROBE_BIAS_LEVELS[this.params.trueProbeBias] * scale,
      ekfProbeNoise: window.Config.PROBE_NOISE_LEVELS[this.params.ekfProbeNoise] * scale,
      ekfProbeBias: window.Config.PROBE_BIAS_LEVELS[this.params.ekfProbeBias] * scale,

      // Wave parameters
      jitter: window.Config.JITTER_LEVELS[this.params.jitter] * scale,
      frequency: this.params.frequency,
      waveType: this.params.waveType,
      scale: scale
    };
  }

  /**
   * Reset to default parameters
   */
  resetToDefaults() {
    const oldParams = { ...this.params };
    this.params = { ...window.Config.DEFAULTS };
    this.emit('parameters-reset', { oldParams, newParams: this.params });
  }
}

// Export to global scope
window.ParameterModel = ParameterModel;
