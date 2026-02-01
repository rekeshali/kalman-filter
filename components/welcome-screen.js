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

            <div className="mt-6 p-6 bg-gray-900 rounded border border-gray-600">
              <h3 className="font-semibold text-gray-200 mb-4">Extended Kalman Filter Block Diagram</h3>

              {/* Row 1: Initialization and Reality Simulation */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Initial Conditions */}
                <div className="relative group">
                  <div className="h-16 bg-indigo-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    Initial Conditions<br/>x₀, P₀
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] w-80 p-4 bg-gray-800 border border-indigo-400 rounded-lg shadow-xl top-full mt-2 left-0 text-xs text-gray-200">
                    <strong className="text-indigo-400 block mb-2">Initialization:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      x₀ = [p₀, v₀]ᵀ = [0, 0]ᵀ<br/>
                      P₀ = diag([σ²ₚ₀, σ²ᵥ₀])
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Set initial state estimate and uncertainty.</p>
                    <p><strong>Intuition:</strong> Start with high uncertainty (large P₀). As measurements arrive, filter converges to true state.</p>
                  </div>
                </div>

                {/* Simulation (Reality) */}
                <div className="relative group">
                  <div className="h-16 bg-gray-600 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    True Trajectory<br/>(Simulation)
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] w-80 p-4 bg-gray-800 border border-gray-400 rounded-lg shadow-xl top-full mt-2 right-0 text-xs text-gray-200">
                    <strong className="text-gray-300 block mb-2">Reality Simulation:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      x(t) = A·sin(ωt) + η(t)<br/>
                      η: OU process noise
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Generate ground truth with realistic disturbances.</p>
                    <p><strong>Intuition:</strong> Black line in charts. The "reality" our filter tries to track despite never directly observing it.</p>
                  </div>
                </div>
              </div>

              {/* Row 2: Prediction Step */}
              <div className="text-center text-gray-400 text-sm mb-2">↓ PREDICTION STEP ↓</div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Inertial Propagation */}
                <div className="relative group">
                  <div className="h-16 bg-purple-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    Inertial<br/>Propagation
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-purple-400 rounded-lg shadow-xl top-full mt-2 left-0 w-96 text-xs text-gray-200">
                    <strong className="text-purple-400 block mb-2">State Prediction:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      x̄ₖ = F·xₖ₋₁ + B·uₖ<br/>
                      F = [1  dt; 0  1], B = [½dt²; dt]<br/>
                      uₖ = accelerometer measurement
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Use acceleration measurement to predict next position and velocity.</p>
                    <p><strong>Intuition:</strong> Dead reckoning - where do we think we are based on motion? Uncertainty grows due to imperfect model.</p>
                  </div>
                </div>

                {/* Jacobian */}
                <div className="relative group">
                  <div className="h-16 bg-pink-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    Jacobian<br/>Linearization
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-pink-400 rounded-lg shadow-xl top-full mt-2 left-0 w-96 text-xs text-gray-200">
                    <strong className="text-pink-400 block mb-2">Linearization Matrices:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      F = ∂f/∂x (state transition)<br/>
                      H = ∂h/∂x (measurement model)<br/>
                      For linear case: F constant, H=[1 0]
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Linearize nonlinear dynamics for Gaussian propagation.</p>
                    <p><strong>Intuition:</strong> EKF approximates nonlinear system as locally linear. For our linear model, Jacobians are exact.</p>
                  </div>
                </div>

                {/* Covariance Prediction */}
                <div className="relative group">
                  <div className="h-16 bg-violet-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    Covariance<br/>Prediction
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-violet-400 rounded-lg shadow-xl top-full mt-2 left-0 w-96 text-xs text-gray-200">
                    <strong className="text-violet-400 block mb-2">Uncertainty Propagation:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      P̄ₖ = F·Pₖ₋₁·Fᵀ + Q<br/>
                      Q = process noise covariance
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Grow uncertainty during prediction due to process noise.</p>
                    <p><strong>Intuition:</strong> Uncertainty grows when we predict without measurements. Q represents model imperfections. See Uncertainty chart.</p>
                  </div>
                </div>
              </div>

              {/* Row 3: Update Step */}
              <div className="text-center text-gray-400 text-sm mb-2">↓ UPDATE STEP ↓</div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {/* Kalman Gain */}
                <div className="relative group">
                  <div className="h-16 bg-yellow-600 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    Kalman<br/>Gain
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-yellow-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                    <strong className="text-yellow-400 block mb-2">Optimal Weighting:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      K = P̄·Hᵀ·(H·P̄·Hᵀ + R)⁻¹<br/>
                      R = measurement noise covariance
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Balance trust between prediction and measurement.</p>
                    <p className="mb-1"><strong>Intuition:</strong> K→1: trust measurement (low P̄, high R). K→0: trust prediction (high P̄, low R).</p>
                    <p><strong>Chart:</strong> Kalman Gain chart shows K over time. Watch it adapt to changing uncertainty!</p>
                  </div>
                </div>

                {/* Innovation */}
                <div className="relative group">
                  <div className="h-16 bg-orange-600 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    Innovation<br/>(Residual)
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-orange-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                    <strong className="text-orange-400 block mb-2">Measurement Residual:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      ỹ = zₖ - H·x̄ₖ<br/>
                      = (measured pos) - (predicted pos)
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Quantify prediction error using measurement.</p>
                    <p className="mb-1"><strong>Intuition:</strong> How surprised are we by the measurement? Large innovation means poor prediction.</p>
                    <p><strong>Chart:</strong> Innovation chart should be zero-mean white noise if filter is tuned correctly.</p>
                  </div>
                </div>

                {/* State Correction */}
                <div className="relative group">
                  <div className="h-16 bg-green-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    State<br/>Correction
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-green-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                    <strong className="text-green-400 block mb-2">Posterior State Estimate:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      xₖ = x̄ₖ + K·ỹ<br/>
                      = prediction + correction
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Fuse prediction with measurement for optimal estimate.</p>
                    <p className="mb-1"><strong>Intuition:</strong> Pull prediction toward measurement by K·ỹ. This is the magic of Kalman filtering!</p>
                    <p><strong>Chart:</strong> Red line (EKF estimate) tracks black (true) by correcting predictions with measurements.</p>
                  </div>
                </div>

                {/* Covariance Update */}
                <div className="relative group">
                  <div className="h-16 bg-teal-700 rounded-lg flex items-center justify-center text-white font-medium text-xs px-2 text-center">
                    Covariance<br/>Update
                  </div>
                  <div className="absolute hidden group-hover:block z-[999999] p-4 bg-gray-800 border border-teal-400 rounded-lg shadow-xl bottom-full mb-2 left-0 w-96 text-xs text-gray-200">
                    <strong className="text-teal-400 block mb-2">Uncertainty Reduction:</strong>
                    <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded">
                      Pₖ = (I - K·H)·P̄ₖ<br/>
                      I = identity matrix
                    </div>
                    <p className="mb-1"><strong>Purpose:</strong> Reduce uncertainty after incorporating measurement.</p>
                    <p className="mb-1"><strong>Intuition:</strong> Measurements give us information, reducing uncertainty. Uncertainty decreases after update, grows after prediction.</p>
                    <p><strong>Chart:</strong> Uncertainty chart shows σ decreasing as filter converges, then stabilizing.</p>
                  </div>
                </div>
              </div>

              {/* Feedback arrow */}
              <div className="text-center text-gray-400 text-sm">
                ↑ Feedback Loop: Updated state becomes input to next prediction ↑
              </div>
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
