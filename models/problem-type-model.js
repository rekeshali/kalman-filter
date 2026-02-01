/**
 * Problem Type Model
 * Manages available problem types and active selection
 */
class ProblemTypeModel extends window.EventEmitter {
  constructor() {
    super();

    // Available problem types with visual styling
    this.problemTypes = [
      {
        id: 'simple-wave',
        name: 'Simple Wave',
        colorAccent: '#3b82f6'  // blue-500
      },
      {
        id: 'placeholder',
        name: 'Coming Soon',
        colorAccent: '#6b7280'  // gray-500
      }
    ];

    this.activeProblemTypeId = 'simple-wave';
  }

  /**
   * Set active problem type
   * @param {string} id - Problem type ID
   * @returns {boolean} Success
   */
  setProblemType(id) {
    const problemType = this.problemTypes.find(pt => pt.id === id);
    if (!problemType) {
      console.warn(`ProblemTypeModel: Problem type not found: ${id}`);
      return false;
    }

    const oldId = this.activeProblemTypeId;
    this.activeProblemTypeId = id;

    this.emit('problem-type-changed', {
      problemTypeId: id,
      oldProblemTypeId: oldId,
      problemType: problemType
    });

    return true;
  }

  /**
   * Get active problem type
   * @returns {Object} Active problem type object
   */
  getActiveProblemType() {
    return this.problemTypes.find(pt => pt.id === this.activeProblemTypeId);
  }

  /**
   * Get all problem types
   * @returns {Array} All problem types
   */
  getAllProblemTypes() {
    return [...this.problemTypes];
  }

  /**
   * Get problem type by ID
   * @param {string} id - Problem type ID
   * @returns {Object|null} Problem type object or null
   */
  getProblemType(id) {
    return this.problemTypes.find(pt => pt.id === id) || null;
  }
}

// Export to global scope
window.ProblemTypeModel = ProblemTypeModel;
