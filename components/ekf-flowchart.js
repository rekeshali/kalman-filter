/**
 * EKFFlowchart component
 * Reusable EKF block diagram with vertical (welcome) and horizontal (header) layouts
 */

// Block definitions shared between layouts
const EKF_BLOCKS = [
  {
    id: 'init',
    label: 'Initial Conditions',
    sublabel: 'x₀, P₀',
    color: 'bg-indigo-700',
    borderColor: 'border-indigo-400',
    textColor: 'text-indigo-400',
    row: 1,
    tooltip: {
      title: 'Initialization:',
      formula: 'x₀ = [p₀, v₀]ᵀ = [0, 0]ᵀ\n\nP₀ = [σ²ₚ₀   0  ]\n     [  0   σ²ᵥ₀]',
      purpose: 'Set initial state estimate and uncertainty.',
      intuition: 'Start with high uncertainty (large P₀). As measurements arrive, filter converges to true state.'
    }
  },
  {
    id: 'reality',
    label: 'True Trajectory',
    sublabel: '(Simulation)',
    color: 'bg-gray-600',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-300',
    row: 1,
    tooltip: {
      title: 'Reality Simulation:',
      formula: 'x(t) = A·sin(ωt) + η(t)\nη: OU process noise (mean-reverting)',
      purpose: 'Generate ground truth with realistic disturbances.',
      intuition: 'Black line in charts. The "reality" our filter tries to track despite never directly observing it.'
    }
  },
  {
    id: 'inertial',
    label: 'Inertial',
    sublabel: 'Propagation',
    color: 'bg-purple-700',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-400',
    row: 2,
    tooltip: {
      title: 'State Prediction:',
      formula: 'x̂ₖ₊₁⁻ = F·x̂ₖ⁺ + B·uₖ\n\nF = [1  Δt]    B = [½Δt²]\n    [0   1]        [ Δt ]\n\nExpanded:\np̂ₖ₊₁⁻ = p̂ₖ⁺ + v̂ₖ⁺·Δt + ½uₖ·Δt²\nv̂ₖ₊₁⁻ = v̂ₖ⁺ + uₖ·Δt\n\nuₖ = aₘₑₐₛ - bₐ (bias-corrected accel)',
      purpose: 'Use acceleration measurement to predict next position and velocity.',
      intuition: 'Dead reckoning - where do we think we are based on motion? Uncertainty grows due to imperfect model.'
    }
  },
  {
    id: 'jacobian',
    label: 'Jacobian',
    sublabel: 'Linearization',
    color: 'bg-pink-700',
    borderColor: 'border-pink-400',
    textColor: 'text-pink-400',
    row: 2,
    tooltip: {
      title: 'Linearization Matrices:',
      formula: 'F = ∂f/∂x = [1  Δt]  (state transition)\n            [0   1]\n\nH = ∂h/∂x = [1  0]  (measurement)\n\nFor our linear model, Jacobians are exact\n(no linearization error).',
      purpose: 'Linearize nonlinear dynamics for Gaussian propagation.',
      intuition: 'EKF approximates nonlinear system as locally linear. For our linear model, Jacobians are exact.'
    }
  },
  {
    id: 'covPred',
    label: 'Covariance',
    sublabel: 'Prediction',
    color: 'bg-violet-700',
    borderColor: 'border-violet-400',
    textColor: 'text-violet-400',
    row: 2,
    tooltip: {
      title: 'Uncertainty Propagation:',
      formula: 'P̄ₖ₊₁ = F·Pₖ·Fᵀ + Q\n\nQ = σₐ²·B·Bᵀ = σₐ²·[Δt⁴/4  Δt³/2]\n                   [Δt³/2   Δt² ]\n\nExpanded P̄:\nP̄ₚₚ = Pₚₚ + 2Δt·Pₚᵥ + Δt²·Pᵥᵥ + Qₚₚ\nP̄ₚᵥ = Pₚᵥ + Δt·Pᵥᵥ + Qₚᵥ\nP̄ᵥᵥ = Pᵥᵥ + Qᵥᵥ',
      purpose: 'Grow uncertainty during prediction due to process noise.',
      intuition: 'Uncertainty grows when we predict without measurements. Q represents model imperfections. See Uncertainty chart.'
    }
  },
  {
    id: 'kalmanGain',
    label: 'Kalman',
    sublabel: 'Gain',
    color: 'bg-yellow-600',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-400',
    row: 3,
    tooltip: {
      title: 'Optimal Weighting:',
      formula: 'K = P̄·Hᵀ·S⁻¹\n\nS = H·P̄·Hᵀ + R = P̄ₚₚ + R  (scalar)\n\nK = [P̄ₚₚ/S]  = [K₁]\n    [P̄ᵥₚ/S]    [K₂]\n\nK₁: position gain, K₂: velocity gain',
      purpose: 'Balance trust between prediction and measurement.',
      intuition: 'K→1: trust measurement (low R). K→0: trust prediction (high R). S is innovation covariance.',
      chart: 'Kalman Gain chart shows K over time. Watch it adapt to changing uncertainty!'
    }
  },
  {
    id: 'innovation',
    label: 'Innovation',
    sublabel: '(Residual)',
    color: 'bg-orange-600',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-400',
    row: 3,
    tooltip: {
      title: 'Measurement Residual:',
      formula: 'y = zᶜᵒʳʳ - H·x̂⁻\n\nzᶜᵒʳʳ = zₘₑₐₛ - bᵤ  (bias-corrected)\n\nSince H = [1  0]:\ny = zᶜᵒʳʳ - p̂⁻  (scalar)',
      purpose: 'Quantify prediction error using measurement.',
      intuition: 'How surprised are we by the measurement? Large innovation means poor prediction.',
      chart: 'Innovation chart should be zero-mean white noise if filter is tuned correctly.'
    }
  },
  {
    id: 'stateCorr',
    label: 'State',
    sublabel: 'Correction',
    color: 'bg-green-700',
    borderColor: 'border-green-400',
    textColor: 'text-green-400',
    row: 3,
    tooltip: {
      title: 'Posterior State Estimate:',
      formula: 'x̂⁺ = x̂⁻ + K·y\n\nExpanded:\np̂⁺ = p̂⁻ + K₁·y\nv̂⁺ = v̂⁻ + K₂·y\n\nCorrection = Gain × Innovation',
      purpose: 'Fuse prediction with measurement for optimal estimate.',
      intuition: 'Pull prediction toward measurement by K·y. This is the magic of Kalman filtering!',
      chart: 'Red line (EKF estimate) tracks black (true) by correcting predictions with measurements.'
    }
  },
  {
    id: 'covUpdate',
    label: 'Covariance',
    sublabel: 'Update',
    color: 'bg-teal-700',
    borderColor: 'border-teal-400',
    textColor: 'text-teal-400',
    row: 3,
    tooltip: {
      title: 'Uncertainty Reduction:',
      formula: 'P⁺ = (I - K·H)·P̄\n\nI - K·H = [1-K₁  0]\n          [-K₂   1]\n\nReduced uncertainty after measurement:\nP⁺ₚₚ = (1-K₁)·P̄ₚₚ\nP⁺ₚᵥ = (1-K₁)·P̄ₚᵥ\nP⁺ᵥᵥ = -K₂·P̄ᵥₚ + P̄ᵥᵥ',
      purpose: 'Reduce uncertainty after incorporating measurement.',
      intuition: 'Measurements give us information, reducing uncertainty. Uncertainty decreases after update, grows after prediction.',
      chart: 'Uncertainty chart shows σ decreasing as filter converges, then stabilizing.'
    }
  }
];

/**
 * Single EKF block with tooltip
 */
function EKFBlock({ block, direction, compact, skinny = false }) {
  const isHorizontal = direction === 'horizontal';
  // Match simulation slot height (h-12) for header blocks
  const blockHeight = isHorizontal ? 'h-12' : 'h-16';
  const textSize = isHorizontal ? (skinny ? 'text-[9px]' : 'text-[10px]') : 'text-xs';
  const tooltipWidth = compact ? 'w-72' : 'w-96';

  // Tooltip positioning based on direction and row
  const getTooltipPosition = () => {
    // Vertical: row 3 tooltips go above, others go below
    if (block.row === 3) {
      return 'bottom-full mb-2 left-0';
    }
    return 'top-full mt-2 left-0';
  };

  // For horizontal layout - black with colored border by default, white fill on hover
  if (isHorizontal) {
    // Map border color classes to actual border color values
    const borderColorMap = {
      'border-indigo-400': '#818cf8',
      'border-gray-400': '#9ca3af',
      'border-purple-400': '#c084fc',
      'border-pink-400': '#f472b6',
      'border-violet-400': '#a78bfa',
      'border-yellow-400': '#facc15',
      'border-orange-400': '#fb923c',
      'border-green-400': '#4ade80',
      'border-teal-400': '#2dd4bf'
    };
    // Map border color classes to matching text colors for hover state
    const textColorMap = {
      'border-indigo-400': '#4338ca',
      'border-gray-400': '#4b5563',
      'border-purple-400': '#7e22ce',
      'border-pink-400': '#be185d',
      'border-violet-400': '#6d28d9',
      'border-yellow-400': '#a16207',
      'border-orange-400': '#c2410c',
      'border-green-400': '#15803d',
      'border-teal-400': '#0f766e'
    };
    const borderColor = borderColorMap[block.borderColor] || '#9ca3af';
    const hoverTextColor = textColorMap[block.borderColor] || '#4b5563';

    return (
      <div className="relative group ekf-block-hover">
        <div
          className={`${blockHeight} rounded-lg flex items-center justify-center font-medium ${textSize} px-1 text-center leading-tight transition-colors border-2`}
          style={{
            backgroundColor: '#000000',  // black default
            color: '#d1d5db',  // gray-300 default
            borderColor: '#000000'  // black border default
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = hoverTextColor; e.currentTarget.style.borderColor = borderColor; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#000000'; e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.borderColor = '#000000'; }}
        >
          {block.label}<br/>{block.sublabel}
        </div>
        {/* Tooltip - appears below, white background with colored border */}
        <div className={`absolute hidden group-hover:block z-[999999] ${tooltipWidth} p-4 bg-white border-2 rounded-lg shadow-xl text-xs text-gray-900`}
             style={{ top: '100%', marginTop: '8px', left: '0', borderColor: borderColor }}>
          <strong className="block mb-2" style={{ color: hoverTextColor }}>{block.tooltip.title}</strong>
          <div className="font-mono text-xs mb-2 bg-gray-700 p-2 rounded whitespace-pre-line text-gray-100">
            {block.tooltip.formula}
          </div>
          <p className="mb-1"><strong>Purpose:</strong> {block.tooltip.purpose}</p>
          <p className="mb-1"><strong>Intuition:</strong> {block.tooltip.intuition}</p>
          {block.tooltip.chart && <p><strong>Chart:</strong> {block.tooltip.chart}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className={`${blockHeight} ${block.color} rounded-lg flex items-center justify-center text-white font-medium ${textSize} px-2 text-center`}>
        {block.label}<br/>{block.sublabel}
      </div>
      <div className={`absolute hidden group-hover:block z-[999999] ${tooltipWidth} p-4 bg-gray-800 border ${block.borderColor} rounded-lg shadow-xl ${getTooltipPosition()} text-xs text-gray-200`}>
        <strong className={`${block.textColor} block mb-2`}>{block.tooltip.title}</strong>
        <div className="font-mono text-xs mb-2 bg-gray-900 p-2 rounded whitespace-pre-line">
          {block.tooltip.formula}
        </div>
        <p className="mb-1"><strong>Purpose:</strong> {block.tooltip.purpose}</p>
        <p className="mb-1"><strong>Intuition:</strong> {block.tooltip.intuition}</p>
        {block.tooltip.chart && <p><strong>Chart:</strong> {block.tooltip.chart}</p>}
      </div>
    </div>
  );
}

/**
 * EKFFlowchart - Reusable EKF block diagram
 * @param {Object} props
 * @param {string} props.direction - 'vertical' (welcome page) or 'horizontal' (header)
 * @param {boolean} props.compact - Use compact sizing for header
 */
function EKFFlowchart({ direction = 'vertical', compact = false }) {
  const isHorizontal = direction === 'horizontal';

  // Group blocks by row
  const row1 = EKF_BLOCKS.filter(b => b.row === 1);
  const row2 = EKF_BLOCKS.filter(b => b.row === 2);
  const row3 = EKF_BLOCKS.filter(b => b.row === 3);

  if (isHorizontal) {
    // Horizontal layout: 4 stacked rows matching vertical structure
    // Row 1: 2 blocks (Init, Reality) - each half width
    // Row 2: 3 blocks (Inertial, Jacobian, CovPred) - each third width
    // Row 3: 4 blocks (Kalman, Innovation, StateCorr, CovUpdate) - each quarter width, skinnier
    // Row 4: Feedback indicator

    return (
      <div className="flex flex-col gap-2 w-60">
        {/* Row 1: Init + Reality (2 blocks) */}
        <div className="grid grid-cols-2 gap-1">
          {row1.map(block => (
            <EKFBlock key={block.id} block={block} direction={direction} compact={compact} />
          ))}
        </div>
        {/* Row 2: Prediction (3 blocks) */}
        <div className="grid grid-cols-3 gap-1">
          {row2.map(block => (
            <EKFBlock key={block.id} block={block} direction={direction} compact={compact} />
          ))}
        </div>
        {/* Row 3: Update (4 blocks) */}
        <div className="grid grid-cols-4 gap-1">
          {row3.map(block => (
            <EKFBlock key={block.id} block={block} direction={direction} compact={compact} skinny={true} />
          ))}
        </div>
      </div>
    );
  }

  // Vertical layout (original welcome page style)
  return (
    <div className="p-6 bg-gray-900 rounded border border-gray-600">
      {/* Row 1: Initialization and Reality Simulation */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {row1.map(block => (
          <EKFBlock key={block.id} block={block} direction={direction} compact={compact} />
        ))}
      </div>

      {/* Row 2: Prediction Step */}
      <div className="text-center text-gray-400 text-sm mb-2">↓ PREDICTION STEP ↓</div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {row2.map(block => (
          <EKFBlock key={block.id} block={block} direction={direction} compact={compact} />
        ))}
      </div>

      {/* Row 3: Update Step */}
      <div className="text-center text-gray-400 text-sm mb-2">↓ UPDATE STEP ↓</div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {row3.map(block => (
          <EKFBlock key={block.id} block={block} direction={direction} compact={compact} />
        ))}
      </div>

      {/* Feedback arrow */}
      <div className="text-center text-gray-400 text-sm">
        ↑ Feedback Loop: Updated state becomes input to next prediction ↑
      </div>
    </div>
  );
}

// Export to global scope
window.EKFFlowchart = EKFFlowchart;
window.EKF_BLOCKS = EKF_BLOCKS;
