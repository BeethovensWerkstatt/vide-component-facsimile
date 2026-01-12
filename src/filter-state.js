/**
 * FilterState - Centralized filter state management
 * Single source of truth for all filter-related state using sessionStorage
 */
export class FilterState {
  constructor() {
    this.storage = sessionStorage
    this.storageKey = 'videFilters'
  }

  /**
   * Get all filters as an object
   * @returns {Object} Filter state object
   */
  getAll() {
    const stored = this.storage.getItem(this.storageKey)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.warn('Failed to parse stored filters, using defaults', e)
      }
    }
    return this.getDefaults()
  }

  /**
   * Get default filter values
   * @returns {Object} Default filter state
   */
  getDefaults() {
    return {
      restrictToCurrentPage: true
    }
  }

  /**
   * Set all filters
   * @param {Object} filters - Filter state object
   */
  setAll(filters) {
    this.storage.setItem(this.storageKey, JSON.stringify(filters))
  }

  /**
   * Update specific filter(s)
   * @param {Object} updates - Partial filter updates
   */
  update(updates) {
    const current = this.getAll()
    this.setAll({ ...current, ...updates })
  }

  /**
   * Get restrictToCurrentPage filter
   * @returns {boolean}
   */
  get restrictToCurrentPage() {
    return this.getAll().restrictToCurrentPage
  }

  /**
   * Set restrictToCurrentPage filter
   * @param {boolean} value
   */
  set restrictToCurrentPage(value) {
    this.update({ restrictToCurrentPage: value })
  }

  /**
   * Parse filter spec from URL segment (e.g., "allPages,byWork:op59")
   * @param {string} filterSpec - URL filter specification
   * @returns {Object} Parsed filter object
   */
  parseFilterSpec(filterSpec) {
    const filters = this.getDefaults()
    
    if (!filterSpec) {
      return filters
    }

    const parts = filterSpec.split(',')
    parts.forEach(part => {
      if (part === 'allPages') {
        filters.restrictToCurrentPage = false
      } else if (part.startsWith('byWork:')) {
        filters.workFilter = part.substring(7)
      }
      // Add more filter parsing here as needed
    })

    return filters
  }

  /**
   * Apply filters from URL spec and store them
   * @param {string} filterSpec - URL filter specification
   */
  applyFromUrl(filterSpec) {
    const filters = this.parseFilterSpec(filterSpec)
    this.setAll(filters)
  }

  /**
   * Generate URL filter spec from current state
   * @returns {string|null} Filter spec for URL or null if default
   */
  toUrlSpec() {
    const filters = this.getAll()
    const parts = []

    // Only include non-default values in URL
    if (!filters.restrictToCurrentPage) {
      parts.push('allPages')
    }

    if (filters.workFilter) {
      parts.push(`byWork:${filters.workFilter}`)
    }

    // Add more filter serialization here as needed

    return parts.length > 0 ? parts.join(',') : null
  }

  /**
   * Reset all filters to defaults
   */
  reset() {
    this.setAll(this.getDefaults())
  }

  /**
   * Clear all stored filter state
   */
  clear() {
    this.storage.removeItem(this.storageKey)
  }
}
