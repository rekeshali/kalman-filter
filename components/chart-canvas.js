/**
 * ChartCanvas component
 * Simple canvas wrapper with ref forwarding for Chart.js
 */

const { forwardRef } = React;

/**
 * ChartCanvas - Canvas element wrapper for charts
 * @param {Object} props
 * @param {string} props.id - Canvas ID
 * @param {string} props.className - Additional CSS classes
 * @param {Object} ref - Forwarded ref for canvas element
 */
const ChartCanvas = forwardRef(function ChartCanvas({ id, className = '' }, ref) {
  return (
    <canvas
      ref={ref}
      id={id}
      className={className}
    />
  );
});

// Export to global scope
window.ChartCanvas = ChartCanvas;
