/**
 * ProblemTypeSelector Component
 * 2-column grid of problem type cards with gradient overlay effect
 */

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
              height: 'calc(3 * 3rem + 2 * 0.5rem)'  // 3 slots (h-12 = 3rem) + 2 gaps (gap-2 = 0.5rem)
            }}
            onClick={() => onProblemTypeChange(type.id)}
          >
            {/* Gradient overlay for sheen effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

            {/* Active indicator (subtle pulse) */}
            {isActive && (
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-white rounded-full opacity-90 shadow-lg" />
              </div>
            )}

            {/* Name */}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <span className="text-white font-bold text-sm text-center drop-shadow-lg">
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
