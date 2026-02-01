/**
 * WelcomeScreen component
 * Welcome tab content with Kalman Filter explanation
 */

/**
 * WelcomeScreen - Informational welcome screen
 * @param {Object} props
 * @param {Function} props.onCreateSimulation - Handler for creating new simulation
 * @param {Object} props.problemType - Current problem type {id, name, colorAccent}
 */
function WelcomeScreen({ onCreateSimulation, problemType }) {
  // Coming Soon placeholder
  if (problemType && problemType.id === 'placeholder') {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-12 shadow-lg text-center">
            <div className="text-6xl mb-6">🚧</div>
            <h2 className="text-3xl font-bold mb-4 text-white">Coming Soon</h2>
            <p className="text-gray-300 text-lg mb-6">
              This problem type is under development. Check back later for new physics simulations!
            </p>
            <div className="text-gray-400 text-sm">
              Future problem types may include: projectile motion, orbital mechanics, robot navigation, and more.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple Wave welcome screen
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT SIDE: Kalman Filter Explanation */}
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-white">How a Kalman Filter Works</h2>
            <p className="text-gray-200 mb-4">
              The Kalman filter is an optimal recursive algorithm for estimating the state of a system from noisy measurements.
              It operates in two steps:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded border-l-4 border-blue-500">
                <h3 className="font-semibold text-blue-400 mb-2">1. Prediction Step</h3>
                <p className="text-gray-200 text-sm">
                  Uses the system dynamics model to predict the next state based on the current estimate and control inputs (acceleration measurements).
                  Uncertainty grows due to process noise.
                </p>
              </div>

              <div className="bg-gray-700 p-4 rounded border-l-4 border-green-500">
                <h3 className="font-semibold text-green-400 mb-2">2. Update Step</h3>
                <p className="text-gray-200 text-sm">
                  Fuses the prediction with new measurements (position from external probe) using the Kalman gain.
                  The gain balances trust between the model and measurements. Uncertainty decreases.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <EKFFlowchart direction="vertical" />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Problem Description */}
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-white">The Tracking Problem</h2>
            <p className="text-gray-200 mb-6">
              We simulate a mass oscillating along a wave trajectory. The goal is to estimate its position and velocity
              using noisy, biased sensors.
            </p>

            {/* Two-column grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Wave Dynamics */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">Wave Dynamics</h3>
                  <p className="text-gray-200 text-sm mb-2">
                    The true motion follows one of three wave patterns:
                  </p>
                  <div className="bg-gray-700 p-3 rounded font-mono text-xs text-gray-200 space-y-1">
                    <div><strong className="text-blue-300">Sine:</strong> x(t) = A·sin(ωt)</div>
                    <div><strong className="text-blue-300">Triangle:</strong> x(t) = piecewise linear ramp</div>
                    <div><strong className="text-blue-300">Square:</strong> x(t) = ±A (step function)</div>
                  </div>
                </div>

                {/* Process Noise */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">Process Noise (Jitter)</h3>
                  <p className="text-gray-200 text-sm mb-2">
                    Random perturbations using an Ornstein-Uhlenbeck (OU) process - a mean-reverting stochastic process.
                  </p>
                  <div className="bg-gray-700 p-3 rounded font-mono text-xs text-gray-200">
                    dx = -α·x·dt + σ·dW<br/>
                    <span className="text-gray-400">α = 2.0, σ = jitter level</span>
                  </div>
                </div>

                {/* State Space */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">State Space</h3>
                  <p className="text-gray-200 text-sm mb-2">
                    The filter estimates a 2D state vector:
                  </p>
                  <div className="bg-gray-700 p-3 rounded font-mono text-xs text-gray-200">
                    <strong className="text-blue-300">State:</strong> x = [position, velocity]<sup>T</sup><br/>
                    <strong className="text-blue-300">Dynamics:</strong> x<sub>k+1</sub> = F·x<sub>k</sub> + B·u<sub>k</sub> + w<sub>k</sub><br/>
                    <strong className="text-blue-300">Measurement:</strong> z<sub>k</sub> = H·x<sub>k</sub> + v<sub>k</sub>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Sensor Suite */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">Sensor Suite</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 p-3 rounded">
                      <h4 className="font-semibold text-green-400 text-sm mb-1">Inertial Sensor (Accelerometer)</h4>
                      <p className="text-gray-200 text-xs mb-2">
                        Measures acceleration directly. Used in the prediction step.
                        Subject to measurement noise and constant bias.
                      </p>
                      <div className="font-mono text-xs text-gray-300">
                        z<sub>accel</sub> = a<sub>true</sub> + b<sub>accel</sub> + n<sub>accel</sub>
                      </div>
                    </div>

                    <div className="bg-gray-700 p-3 rounded">
                      <h4 className="font-semibold text-purple-400 text-sm mb-1">External Probe (Position Sensor)</h4>
                      <p className="text-gray-200 text-xs mb-2">
                        Measures position directly. Used in the update step to correct predictions.
                        Also subject to noise and bias.
                      </p>
                      <div className="font-mono text-xs text-gray-300">
                        z<sub>pos</sub> = x<sub>true</sub> + b<sub>pos</sub> + n<sub>pos</sub>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Model Mismatch */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-400">Model Mismatch</h3>
                  <p className="text-gray-200 text-sm">
                    The "TRUE" parameters represent reality. The "EKF" parameters represent the filter's assumptions.
                    Mismatch between them demonstrates how robust the filter is to incorrect models.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-600 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2 text-white">Ready to Explore?</h3>
            <p className="text-gray-200 text-sm mb-4">
              Click the button below or the <strong className="text-blue-300">+</strong> button next to the Welcome tab to create a new simulation.
              You can create multiple simulations and rename them by hovering over the tab name. Try changing parameters in real-time and watch how the filter responds!
            </p>
            <button
              onClick={onCreateSimulation}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium transition-colors"
            >
              Create New Simulation →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Export to global scope
window.WelcomeScreen = WelcomeScreen;
