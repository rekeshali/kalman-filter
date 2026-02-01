# Kalman Filter Mathematical Documentation

This document provides the mathematical derivation and verification of the Kalman filter implementation used in this simulation.

## Overview

Despite the class name `ExtendedKalmanFilter`, the implementation is a **standard linear Kalman filter** for a 2D state space (position, velocity) with acceleration as the control input. No nonlinear state transition or measurement functions are used, so Jacobian linearization is not required.

**Reference**: The equations follow Bar‑Shalom, Li, & Kirubarajan (2001) *Estimation with Applications to Tracking and Navigation*, Chapter 6.

> **Markdown rendering note (VS Code)**: all display math in this document uses `$$ ... $$` (KaTeX/Markdown convention). Do **not** use `\[ ... \]` in Markdown—VS Code’s Markdown parser treats `\[` and `\]` as escaped brackets.

---

## Filter Flowchart

```mermaid
flowchart TD
  A([Start / Initialize]) --> B[Initialize xhat0(+) and P0(+)]
  B --> C{{For each step k}}
  C --> D[Inputs: dt, accel a(k), accel bias b_a, measurement z(k+1) (optional), meas. bias b_z]
  D --> E[Compute control: u(k) = a(k) - b_a]
  E --> F[Build F(dt), B(dt), Q(dt), H, R]
  F --> G[Predict state: xhat(k+1)(-) = F xhat(k)(+) + B u(k)]
  G --> H[Predict covariance: P(k+1)(-) = F P(k)(+) F^T + Q]
  H --> I{Measurement available at k+1?}
  I -- No --> J[Skip update: xhat(k+1)(+) = xhat(k+1)(-) ; P(k+1)(+) = P(k+1)(-)]
  I -- Yes --> K[Bias-correct: zcorr(k+1) = z(k+1) - b_z]
  K --> L[Innovation: y(k+1) = zcorr(k+1) - H xhat(k+1)(-)]
  L --> M[Innovation cov: S(k+1) = H P(k+1)(-) H^T + R]
  M --> N[Kalman gain: K(k+1) = P(k+1)(-) H^T / S(k+1)]
  N --> O[Update state: xhat(k+1)(+) = xhat(k+1)(-) + K(k+1) y(k+1)]
  O --> P[Update covariance: P(k+1)(+) = (I - K(k+1) H) P(k+1)(-) (or Joseph)]
  P --> C
```

> **Indexing convention used in this document**:  
> The control input $u_k$ is applied over the interval $[t_k, t_{k+1}]$, producing the prediction at time $k+1$: $\hat{\mathbf{x}}_{k+1}^-$.

---

## State Space Model

### State Vector

$$
\mathbf{x}_k =
\begin{bmatrix}
p_k \\
v_k
\end{bmatrix}
$$

where:
- $p_k$ = position
- $v_k$ = velocity

### Discrete-Time State Transition

With constant acceleration over timestep $\Delta t$:

$$
\mathbf{x}_{k+1} = \mathbf{F}\mathbf{x}_k + \mathbf{B}u_k + \mathbf{w}_k
$$

**State transition matrix**:

$$
\mathbf{F} =
\begin{bmatrix}
1 & \Delta t \\
0 & 1
\end{bmatrix}
$$

**Control input matrix**:

$$
\mathbf{B} =
\begin{bmatrix}
\frac{1}{2}\Delta t^2 \\
\Delta t
\end{bmatrix}
$$

**Control input**: $u_k = a_k - b_a$ (bias‑corrected acceleration measurement)

---

### Integrated “side-by-side” expansion (holistic view)

$$
\underbrace{\begin{bmatrix} p_{k+1}\\ v_{k+1}\end{bmatrix}}_{\mathbf{x}_{k+1}}
=
\underbrace{\begin{bmatrix}1 & \Delta t\\ 0 & 1\end{bmatrix}}_{\mathbf{F}}
\underbrace{\begin{bmatrix} p_k\\ v_k\end{bmatrix}}_{\mathbf{x}_k}
+
\underbrace{\begin{bmatrix}\frac{1}{2}\Delta t^2\\ \Delta t\end{bmatrix}}_{\mathbf{B}}
\underbrace{u_k}_{\text{control}}
+
\underbrace{\begin{bmatrix} w_{p,k}\\ w_{v,k}\end{bmatrix}}_{\mathbf{w}_k}
$$

Expanding every index explicitly:

$$
\begin{aligned}
p_{k+1}
&= 1\cdot p_k + (\Delta t)\cdot v_k + \left(\tfrac{1}{2}\Delta t^2\right)u_k + w_{p,k} \\
v_{k+1}
&= 0\cdot p_k + 1\cdot v_k + (\Delta t)u_k + w_{v,k}
\end{aligned}
$$

The corresponding **prediction** equations (using estimated states) expand to:

- $\hat{p}_{k+1}^- = \hat{p}_k^+ + \hat{v}_k^+ \Delta t + \frac{1}{2}u_k\Delta t^2$
- $\hat{v}_{k+1}^- = \hat{v}_k^+ + u_k\Delta t$

> **Code reference**: [kalman-filter.js:56-61](filter/kalman-filter.js#L56-L61)

---

## Process Noise Model

The implementation uses an **acceleration disturbance** entering through the same kinematic mapping as the control input.

### Discrete-time acceleration disturbance model (matches the $\Delta t^4/4$ form)

Assume an additional random acceleration term $\epsilon_{a,k}$ applied each step:

$$
\mathbf{x}_{k+1} = \mathbf{F}\mathbf{x}_k + \mathbf{B}u_k + \mathbf{B}\epsilon_{a,k},
\qquad
\epsilon_{a,k}\sim\mathcal{N}(0,\sigma_a^2)
$$

Then the discrete-time process noise covariance is:

$$
\mathbf{Q} = \mathrm{Cov}(\mathbf{B}\epsilon_{a,k})
= \mathbf{B}\,\sigma_a^2\,\mathbf{B}^T
$$

Compute $\mathbf{B}\mathbf{B}^T$ explicitly:

$$
\mathbf{Q}
= \sigma_a^2
\begin{bmatrix}
\left(\tfrac{1}{2}\Delta t^2\right)^2 & \left(\tfrac{1}{2}\Delta t^2\right)(\Delta t) \\
(\Delta t)\left(\tfrac{1}{2}\Delta t^2\right) & (\Delta t)^2
\end{bmatrix}
=
\sigma_a^2
\begin{bmatrix}
\frac{\Delta t^4}{4} & \frac{\Delta t^3}{2} \\
\frac{\Delta t^3}{2} & \Delta t^2
\end{bmatrix}
$$

> **Code reference**: [kalman-filter.js:69-73](filter/kalman-filter.js#L69-L73)

### Note on CWNA (continuous white noise acceleration)

Some texts derive $\mathbf{Q}$ by integrating continuous-time white noise acceleration with spectral density $q$, yielding:

$$
\mathbf{Q}_{\text{CWNA}} = q
\begin{bmatrix}
\frac{\Delta t^3}{3} & \frac{\Delta t^2}{2}\\
\frac{\Delta t^2}{2} & \Delta t
\end{bmatrix}
$$

That is a **different noise model** from $\mathbf{Q}=\mathbf{B}\sigma_a^2\mathbf{B}^T$. Use the one that matches your implementation and parameter interpretation.

**Reference**: Welch & Bishop (2006), Section 5; Bar‑Shalom (2001), process noise models.

---

## Measurement Model

### Measurement Equation

Only position is directly observed:

$$
z_k = \mathbf{H}\mathbf{x}_k + \nu_k
$$

where $\nu_k$ is the measurement noise (using $\nu$ to avoid clashing with velocity $v_k$):

$$
\nu_k \sim \mathcal{N}(0, R),
\qquad
R=\sigma_z^2
$$

**Measurement matrix**:

$$
\mathbf{H} =
\begin{bmatrix}
1 & 0
\end{bmatrix}
$$

**Bias correction** (if present in the system):

$$
z_k^{\mathrm{corr}} = z_k - b_z
$$

> **Code reference**: [kalman-filter.js:106-107](filter/kalman-filter.js#L106-L107)

### Integrated measurement expansion

$$
z_k^{\mathrm{corr}}
=
\underbrace{\begin{bmatrix}1 & 0\end{bmatrix}}_{\mathbf{H}}
\underbrace{\begin{bmatrix}p_k\\v_k\end{bmatrix}}_{\mathbf{x}_k}
+ \nu_k
=
1\cdot p_k + 0\cdot v_k + \nu_k
$$

---

## Prediction Step

### Predicted State

$$
\hat{\mathbf{x}}_{k+1}^- = \mathbf{F}\hat{\mathbf{x}}_k^+ + \mathbf{B}u_k
$$

### Predicted Covariance

$$
\mathbf{P}_{k+1}^- = \mathbf{F}\mathbf{P}_k^+\mathbf{F}^T + \mathbf{Q}
$$

---

### Integrated covariance multiplication (side-by-side)

Let

$$
\mathbf{P}_k^+ =
\begin{bmatrix}
P_{pp}^+ & P_{pv}^+\\
P_{vp}^+ & P_{vv}^+
\end{bmatrix},
\qquad
\mathbf{F} =
\begin{bmatrix}
1 & \Delta t\\
0 & 1
\end{bmatrix},
\qquad
\mathbf{F}^T =
\begin{bmatrix}
1 & 0\\
\Delta t & 1
\end{bmatrix}
$$

Then:

$$
\mathbf{F}\mathbf{P}_k^+\mathbf{F}^T =
\begin{bmatrix}
1 & \Delta t\\
0 & 1
\end{bmatrix}
\begin{bmatrix}
P_{pp}^+ & P_{pv}^+\\
P_{vp}^+ & P_{vv}^+
\end{bmatrix}
\begin{bmatrix}
1 & 0\\
\Delta t & 1
\end{bmatrix}
$$

Fully expanded:

$$
\mathbf{F}\mathbf{P}_k^+\mathbf{F}^T =
\begin{bmatrix}
P_{pp}^+ + \Delta t(P_{pv}^+ + P_{vp}^+) + \Delta t^2 P_{vv}^+ &
P_{pv}^+ + \Delta t P_{vv}^+\\
P_{vp}^+ + \Delta t P_{vv}^+ &
P_{vv}^+
\end{bmatrix}
$$

Finally:

$$
\mathbf{P}_{k+1}^- = \mathbf{F}\mathbf{P}_k^+\mathbf{F}^T + \mathbf{Q}
$$

If you assume symmetry ($P_{pv}^+=P_{vp}^+$ and $Q_{12}=Q_{21}$), the common simplified form is:

$$
\mathbf{P}_{k+1}^- =
\begin{bmatrix}
P_{pp}^+ + 2\Delta t\,P_{pv}^+ + \Delta t^2 P_{vv}^+ + Q_{11} &
P_{pv}^+ + \Delta t P_{vv}^+ + Q_{12} \\
P_{vp}^+ + \Delta t P_{vv}^+ + Q_{21} &
P_{vv}^+ + Q_{22}
\end{bmatrix}
$$

> **Code reference**: [kalman-filter.js:75-92](filter/kalman-filter.js#L75-L92)

---

## Update Step

### Innovation (Measurement Residual)

Using the bias-corrected measurement:

$$
y_{k+1} = z_{k+1}^{\mathrm{corr}} - \mathbf{H}\hat{\mathbf{x}}_{k+1}^-
$$

Since $\mathbf{H}=[1\ \ 0]$:

$$
y_{k+1} = z_{k+1}^{\mathrm{corr}} - \hat{p}_{k+1}^-
$$

> **Code reference**: [kalman-filter.js:113](filter/kalman-filter.js#L113)

### Innovation Covariance

$$
S_{k+1} = \mathbf{H}\mathbf{P}_{k+1}^-\mathbf{H}^T + R
$$

With $\mathbf{H}=[1\ \ 0]$, this reduces to:

$$
S_{k+1} = P_{pp}^- + R
$$

> **Code reference**: [kalman-filter.js:116-117](filter/kalman-filter.js#L116-L117)

### Kalman Gain

$$
\mathbf{K}_{k+1} = \mathbf{P}_{k+1}^- \mathbf{H}^T S_{k+1}^{-1}
$$

Expand $\mathbf{H}^T=\begin{bmatrix}1\\0\end{bmatrix}$:

$$
\mathbf{P}_{k+1}^- \mathbf{H}^T =
\begin{bmatrix}
P_{pp}^- & P_{pv}^-\\
P_{vp}^- & P_{vv}^-
\end{bmatrix}
\begin{bmatrix}1\\0\end{bmatrix}
=
\begin{bmatrix}
P_{pp}^-\\
P_{vp}^-
\end{bmatrix}
$$

So:

$$
\mathbf{K}_{k+1}
=
\frac{1}{S_{k+1}}
\begin{bmatrix}
P_{pp}^-\\
P_{vp}^-
\end{bmatrix}
$$

> **Code reference**: [kalman-filter.js:119-123](filter/kalman-filter.js#L119-L123)

### Updated State Estimate

$$
\hat{\mathbf{x}}_{k+1}^+ = \hat{\mathbf{x}}_{k+1}^- + \mathbf{K}_{k+1}y_{k+1}
$$

Expanded:

$$
\begin{aligned}
\hat{p}_{k+1}^+ &= \hat{p}_{k+1}^- + K_1\,y_{k+1}\\
\hat{v}_{k+1}^+ &= \hat{v}_{k+1}^- + K_2\,y_{k+1}
\end{aligned}
$$

> **Code reference**: [kalman-filter.js:125-129](filter/kalman-filter.js#L125-L129)

### Updated Covariance

#### Simple (common) form

$$
\mathbf{P}_{k+1}^+ = (\mathbf{I} - \mathbf{K}_{k+1}\mathbf{H})\mathbf{P}_{k+1}^-
$$

Integrated expansion of $(\mathbf{I}-\mathbf{K}\mathbf{H})$:

$$
\mathbf{I}-\mathbf{K}\mathbf{H}
=
\begin{bmatrix}
1 & 0\\
0 & 1
\end{bmatrix}
-
\begin{bmatrix}
K_1\\
K_2
\end{bmatrix}
\begin{bmatrix}
1 & 0
\end{bmatrix}
=
\begin{bmatrix}
1-K_1 & 0\\
-K_2 & 1
\end{bmatrix}
$$

> **Code reference**: [kalman-filter.js:131-146](filter/kalman-filter.js#L131-L146)

#### Joseph stabilized form (recommended for numerical robustness)

$$
\mathbf{P}_{k+1}^+ =
(\mathbf{I}-\mathbf{K}_{k+1}\mathbf{H})\mathbf{P}_{k+1}^-(\mathbf{I}-\mathbf{K}_{k+1}\mathbf{H})^T
+ \mathbf{K}_{k+1}R\mathbf{K}_{k+1}^T
$$

> Note: Many implementations use the simple form for speed/simplicity. Joseph form better preserves symmetry/PSD under numerical error.

---

## Notation Summary

| Symbol | Meaning |
|---|---|
| $\mathbf{x}_k$ | State vector $[p_k,\ v_k]^T$ |
| $\mathbf{F}$ | State transition matrix |
| $\mathbf{B}$ | Control input matrix |
| $u_k$ | Control input (bias-corrected acceleration) |
| $\mathbf{H}$ | Measurement matrix |
| $\mathbf{P}_k$ | State covariance matrix |
| $\mathbf{Q}$ | Process noise covariance |
| $R$ | Measurement noise variance |
| $\mathbf{K}_{k+1}$ | Kalman gain |
| $y_{k+1}$ | Innovation (measurement residual) |
| $S_{k+1}$ | Innovation covariance |
| $\hat{\mathbf{x}}_{k+1}^-$ | Prior (predicted) state estimate |
| $\hat{\mathbf{x}}_{k+1}^+$ | Posterior (updated) state estimate |
| $\Delta t$ | Time step |
| $\sigma_a$ | Acceleration/process-noise std dev (discrete model) |
| $\sigma_z$ | Measurement noise std dev |
| $\nu_k$ | Measurement noise (scalar) |
| $b_a$ | Accel bias |
| $b_z$ | Measurement bias |

---

## Academic References

1. **Bar‑Shalom, Y., Li, X. R., & Kirubarajan, T.** (2001). *Estimation with Applications to Tracking and Navigation*. Wiley.  
   - Chapter 6: Discrete-time Kalman filter derivation  
   - Sections on process noise models  

2. **Welch, G., & Bishop, G.** (2006). *An Introduction to the Kalman Filter*. UNC Chapel Hill TR 95‑041.  
   - Section 5: Discrete Kalman filter algorithm and common covariance forms  

3. **Simon, D.** (2006). *Optimal State Estimation*. Wiley.  
   - Chapter 5: Kalman filter  
   - Chapter 13: Extended Kalman filter  

---

## Implementation Notes

### Why "Extended" Kalman Filter?

The class is named `ExtendedKalmanFilter` but implements a **linear** Kalman filter because:

1. The state transition $f(\mathbf{x},u)$ is linear in state and control  
2. The measurement $h(\mathbf{x})$ is linear (direct position observation)  
3. No Jacobians $\mathbf{F}_x = \partial f / \partial \mathbf{x}$ or $\mathbf{H}_x = \partial h / \partial \mathbf{x}$ are computed  

The EKF formulation would be needed if:
- The motion model were nonlinear (e.g., coordinated turn)
- The measurement were nonlinear (e.g., range/bearing observations)

### Numerical Stability

The implementation uses the standard covariance update:

$$
\mathbf{P}^+ = (\mathbf{I} - \mathbf{K}\mathbf{H})\mathbf{P}^-
$$

For improved numerical stability with ill-conditioned matrices, consider:

1. **Joseph form** (shown above)  
2. **Square-root filter** (propagate $\sqrt{\mathbf{P}}$ instead of $\mathbf{P}$)  
3. **UD factorization** ($\mathbf{P} = \mathbf{U}\mathbf{D}\mathbf{U}^T$)  

For this application (2×2 state, reasonable noise levels), the simple form is typically adequate.
