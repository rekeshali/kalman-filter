/**
 * Wave dynamics simulator
 * Computes analytical position, velocity, and acceleration for various wave types
 */

/**
 * Calculate the wave position analytically
 *
 * @param {number} t - Current time
 * @param {string} type - Wave type ('sine', 'triangle', 'square')
 * @param {number} freq - Frequency in Hz
 * @param {number} amp - Amplitude
 * @returns {number} Position at time t
 */
function getWavePosition(t, type, freq, amp) {
  const omega = 2 * Math.PI * freq;
  const phase = omega * t;

  switch(type) {
    case 'sine':
      // x(t) = A·sin(ωt)
      return amp * Math.sin(phase);
    case 'triangle':
      // Triangle wave oscillates between -A and +A
      const period = 1 / freq;
      const localTime = t % period;
      const halfPeriod = period / 2;
      if (localTime < halfPeriod) {
        // Rising edge: -A to +A
        return -amp + (4 * amp / period) * localTime;
      } else {
        // Falling edge: +A to -A
        return 3 * amp - (4 * amp / period) * localTime;
      }
    case 'square':
      // Square wave oscillates between -A and +A
      const sqPeriod = 1 / freq;
      const sqLocalTime = t % sqPeriod;
      return (sqLocalTime < sqPeriod / 2) ? amp : -amp;
    default:
      return 0;
  }
}

/**
 * Calculate the wave velocity analytically (first derivative)
 *
 * @param {number} t - Current time
 * @param {string} type - Wave type ('sine', 'triangle', 'square')
 * @param {number} freq - Frequency in Hz
 * @param {number} amp - Amplitude
 * @returns {number} Velocity at time t
 */
function getWaveVelocity(t, type, freq, amp) {
  const omega = 2 * Math.PI * freq;
  const phase = omega * t;

  switch(type) {
    case 'sine':
      // For x(t) = A·sin(ωt), velocity is v(t) = ω·A·cos(ωt)
      return omega * amp * Math.cos(phase);
    case 'triangle':
      // Triangle wave has constant velocity except at corners
      const period = 1 / freq;
      const localTime = t % period;
      const halfPeriod = period / 2;
      // Velocity is ±4Af (slope of triangle)
      return (localTime < halfPeriod) ? (4 * amp * freq) : (-4 * amp * freq);
    case 'square':
      // Square wave has zero velocity except at transitions (impulses)
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate the clean wave acceleration (second derivative of position)
 * WITHOUT jitter - this is the deterministic dynamics
 *
 * @param {number} t - Current time
 * @param {string} type - Wave type ('sine', 'triangle', 'square')
 * @param {number} freq - Frequency in Hz
 * @param {number} amp - Amplitude
 * @returns {number} Acceleration at time t
 */
function getWaveAccelerationClean(t, type, freq, amp) {
  const omega = 2 * Math.PI * freq;
  const phase = omega * t;

  switch(type) {
    case 'sine':
      // For x(t) = A·sin(ωt), acceleration is a(t) = -ω²·A·sin(ωt)
      return -amp * omega * omega * Math.sin(phase);
    case 'triangle':
      // Triangle wave has zero second derivative except at corners
      return 0;
    case 'square':
      // Square wave has zero second derivative except at transitions
      return 0;
    default:
      return 0;
  }
}

// Export to global scope
window.WaveSimulator = {
  getWavePosition,
  getWaveVelocity,
  getWaveAccelerationClean
};
