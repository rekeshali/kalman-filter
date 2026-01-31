/**
 * Noise generation utilities for sensor simulation
 */

/**
 * Generate a sample from a standard normal distribution using Box-Muller transform
 * @returns {number} A random number from N(0,1)
 */
function randn() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Export to global scope
window.NoiseUtils = { randn };
