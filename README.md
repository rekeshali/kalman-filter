# Extended Kalman Filter: Wave Tracking

An interactive learning tool for understanding Extended Kalman Filters through real-time wave simulation. Explore how sensor fusion works, what happens during model mismatch, and how filter performance evolves—all with adjustable parameters and live visualization.

## Key Concepts

**Extended Kalman Filter**: Combines noisy sensor measurements to estimate a system's true state. Uses linearization to handle nonlinear dynamics (integrating acceleration to position).

**Sensor Fusion**: High-rate inertial measurements (accelerometer) are fused with occasional position corrections (external probe) to achieve better estimates than either sensor alone.

**Ornstein-Uhlenbeck Process**: Mean-reverting random walk that creates bounded perturbations to the true trajectory, simulating realistic process noise.

**Model Mismatch**: When the filter's assumptions (EKF parameters) don't match reality (TRUE parameters), performance degrades. Adjust both independently to explore these effects.

## Quick Start

### Running in VSCode

1. **Install Live Server Extension**
   - Open Extensions (Cmd+Shift+X)
   - Search for "Live Server" by Ritwick Dey
   - Click Install

2. **Launch the Application**
   - Right-click `index.html` in the file explorer
   - Select "Open with Live Server"
   - The app opens in your default browser at `http://127.0.0.1:5500`

3. **Start Exploring**
   - Click "Create Your First Simulation"
   - Press the ▶ Start button
   - Adjust parameters in real-time to see their effects

### Running with Python (Alternative)

```bash
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

## How to Use

### Controls

- **▶ Start**: Begin the simulation
- **❚❚ Pause**: Stop without clearing data
- **↺ Reset**: Clear all data and stop
- **↻ Restart**: Clear data and start fresh

### Tabs

Create multiple simulations with different parameter configurations. Each tab maintains independent state, allowing direct comparison of different scenarios.

### Parameters

**Wave Parameters**
- Frequency, scale, type (sine/triangle/square), and jitter (process noise)

**Inertial Sensor (Accelerometer)**
- TRUE: Actual sensor characteristics
- EKF: What the filter assumes

**External Probe (Position Sensor)**
- TRUE: Actual sensor characteristics
- EKF: What the filter assumes

Adjust noise and bias for each sensor to create model mismatch and observe how the filter adapts.

### Charts

1. **Wave Position Tracking**: Compare true position, probe measurements, process model, and EKF estimate
2. **Wave Acceleration**: True acceleration vs. inertial measurements
3. **Velocity Tracking**: True velocity vs. EKF estimate
4. **Measurement Residual**: Innovation (measurement - prediction)
5. **Kalman Gain**: How much the filter trusts measurements vs. predictions
6. **Filter Uncertainty**: Convergence of position and velocity estimates
7. **Position Error**: Filter performance metric

## Architecture

Built with a clean MVC pattern:

```
/components/     → React UI components
/models/         → State management (ParameterModel, TabModel, SimulationState)
/services/       → Chart management, localStorage, data collection
/controllers/    → SimulationController (coordinates models and views)
/views/          → Main React application
/physics/        → Wave generation
/filter/         → Extended Kalman Filter implementation
/utils/          → Noise generation, event emitter
```

## Technical Stack

- React (via CDN, no build system)
- Chart.js for real-time visualization
- Vanilla JavaScript with ES6+ features
- Browser-native module architecture
- LocalStorage for state persistence

## License

MIT
