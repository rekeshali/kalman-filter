/**
 * ProblemTypeSelector Component
 * 2-column grid of problem type cards with custom icons and gradient overlay effect
 */

/**
 * Get icon path for a problem type
 * @param {string} problemTypeId - Problem type ID
 * @returns {string|null} Icon path or null
 */
function getProblemTypeIconPath(problemTypeId) {
  const iconMap = {
    'simple-wave': 'assets/icons/problem-types/wave_problem_icon.png',
    'placeholder': 'assets/icons/problem-types/under_construction.png'
  };
  return iconMap[problemTypeId] || null;
}

/**
 * ProblemTypeSelector - Visual problem type selection cards
 * @param {Object} props
 * @param {Array} props.problemTypes - Array of {id, name, colorAccent}
 * @param {string} props.activeProblemTypeId - Currently active problem type ID
 * @param {Function} props.onProblemTypeChange - Change handler (problemTypeId)
 */
function ProblemTypeSelector({ problemTypes, activeProblemTypeId, onProblemTypeChange }) {
  return (
    <div className="grid grid-cols-2 gap-3 w-64">
      {problemTypes.map(type => {
        const isActive = type.id === activeProblemTypeId;
        const iconPath = getProblemTypeIconPath(type.id);

        return (
          <div
            key={type.id}
            className={`
              relative rounded-lg overflow-hidden cursor-pointer
              transition-all duration-200 border-2
              ${isActive
                ? 'border-blue-400 brightness-110 shadow-lg'
                : 'border-gray-600 hover:border-gray-400 hover:scale-102 shadow-md'
              }
            `}
            style={{
              backgroundColor: type.colorAccent,
              height: 'calc(3 * 3rem + 2 * 0.5rem)',  // 3 slots (h-12 = 3rem) + 2 gaps (gap-2 = 0.5rem)
              backgroundImage: iconPath ? `url('${iconPath}')` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            onClick={() => onProblemTypeChange(type.id)}
          >
            {/* Gradient overlay for depth and readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/50 pointer-events-none" />

            {/* Color gradient overlay - stronger at bottom */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-current opacity-60 pointer-events-none"
              style={{ color: type.colorAccent }}
            />

            {/* Name - positioned at bottom for better readability over icon */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <span className="text-white font-semibold text-xs uppercase tracking-wider text-center drop-shadow-lg block">
                {type.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Export to global scope
window.ProblemTypeSelector = ProblemTypeSelector;
