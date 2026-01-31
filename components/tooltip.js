/**
 * Tooltip component with 1-second hover delay
 * Prevents tooltips from appearing on page load
 */

const { useState, useEffect } = React;

/**
 * Tooltip wrapper component
 * @param {Object} props
 * @param {string} props.text - Tooltip text
 * @param {string} props.position - Position: 'top' or 'bottom' (default: 'bottom')
 * @param {ReactNode} props.children - Child elements to wrap
 */
function Tooltip({ text, position = 'bottom', children }) {
  if (!text) {
    return children;
  }

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div className="tooltip-delay-group relative inline-block">
      {children}
      <div className={`tooltip-content absolute left-1/2 -translate-x-1/2 ${positionClasses} z-50 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg`}>
        {text}
      </div>
    </div>
  );
}

// Export to global scope
window.Tooltip = Tooltip;
