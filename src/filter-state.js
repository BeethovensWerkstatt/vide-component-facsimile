/**
 * FilterState - Centralized filter state management
 * Single source of truth for all filter-related state using sessionStorage
 * 
 * URL Format: filter:allPages;keySig:3f;meterSig:2/4;staves:1,2;length:short;meta:nav,clar;werk:Op.120
 * - Filters separated by semicolons
 * - Parameters follow colon after filter name
 * - Multiple values separated by commas
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
      restrictToCurrentPage: true,
      // Key signature filter: array of keySig values like ['3f', '2s', '0']
      keySig: [],
      keySigSupplied: null, // null = any, true = only supplied, false = only original
      // Meter signature filter: array of meter values like ['2/4', '3/4']
      meterSig: [],
      meterSigSupplied: null, // null = any, true = only supplied, false = only original
      // Staff count filter: array of staff counts like [1, 2, 3]
      staves: [],
      // Length filter: 'short' (<=5), 'medium' (6-10), 'long' (>10) or null
      length: [],
      // Metatext filters
      metaNavigation: null, // null = any, true = must have, false = must not have
      metaClarification: null,
      otherMeta: null,
      // Work relations filter: array of opus identifiers like ['Op.120', 'Op.125']
      workRelations: []
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
   * Parse filter spec from URL segment
   * Format: "allPages;keySig:3f,2s;meterSig:2/4;staves:1,2;length:short;meta:nav;werk:Op.120"
   * @param {string} filterSpec - URL filter specification
   * @returns {Object} Parsed filter object
   */
  parseFilterSpec(filterSpec) {
    const filters = this.getDefaults()
    
    if (!filterSpec) {
      return filters
    }

    // Split by semicolon for multiple filter types
    const parts = filterSpec.split(';')
    parts.forEach(part => {
      const trimmedPart = part.trim()
      if (!trimmedPart) return
      
      // Check for simple flags first
      if (trimmedPart === 'allPages') {
        filters.restrictToCurrentPage = false
        return
      }
      
      // Parse parameterized filters (format: name:value or name:val1,val2)
      const colonIdx = trimmedPart.indexOf(':')
      if (colonIdx === -1) return
      
      const filterName = trimmedPart.substring(0, colonIdx)
      const filterValue = trimmedPart.substring(colonIdx + 1)
      
      switch (filterName) {
        case 'keySig':
          filters.keySig = filterValue.split(',').filter(v => v)
          break
        case 'keySigSupplied':
          filters.keySigSupplied = filterValue === 'true' ? true : filterValue === 'false' ? false : null
          break
        case 'meterSig':
          filters.meterSig = filterValue.split(',').filter(v => v)
          break
        case 'meterSigSupplied':
          filters.meterSigSupplied = filterValue === 'true' ? true : filterValue === 'false' ? false : null
          break
        case 'staves':
          filters.staves = filterValue.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v))
          break
        case 'length':
          filters.length = filterValue.split(',').filter(v => ['short', 'medium', 'long'].includes(v))
          break
        case 'meta':
          // Format: meta:nav,clar,other or meta:!nav (! for must not have)
          filterValue.split(',').forEach(m => {
            if (m === 'nav') filters.metaNavigation = true
            else if (m === '!nav') filters.metaNavigation = false
            else if (m === 'clar') filters.metaClarification = true
            else if (m === '!clar') filters.metaClarification = false
            else if (m === 'other') filters.otherMeta = true
            else if (m === '!other') filters.otherMeta = false
          })
          break
        case 'werk':
          filters.workRelations = filterValue.split(',').filter(v => v)
          break
      }
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

    if (filters.keySig && filters.keySig.length > 0) {
      parts.push(`keySig:${filters.keySig.join(',')}`)
    }
    
    if (filters.keySigSupplied !== null) {
      parts.push(`keySigSupplied:${filters.keySigSupplied}`)
    }

    if (filters.meterSig && filters.meterSig.length > 0) {
      parts.push(`meterSig:${filters.meterSig.join(',')}`)
    }
    
    if (filters.meterSigSupplied !== null) {
      parts.push(`meterSigSupplied:${filters.meterSigSupplied}`)
    }
    
    if (filters.staves && filters.staves.length > 0) {
      parts.push(`staves:${filters.staves.join(',')}`)
    }
    
    if (filters.length && filters.length.length > 0) {
      parts.push(`length:${filters.length.join(',')}`)
    }
    
    // Meta filters
    const metaParts = []
    if (filters.metaNavigation === true) metaParts.push('nav')
    else if (filters.metaNavigation === false) metaParts.push('!nav')
    if (filters.metaClarification === true) metaParts.push('clar')
    else if (filters.metaClarification === false) metaParts.push('!clar')
    if (filters.otherMeta === true) metaParts.push('other')
    else if (filters.otherMeta === false) metaParts.push('!other')
    if (metaParts.length > 0) {
      parts.push(`meta:${metaParts.join(',')}`)
    }

    if (filters.workRelations && filters.workRelations.length > 0) {
      parts.push(`werk:${filters.workRelations.join(',')}`)
    }

    return parts.length > 0 ? parts.join(';') : null
  }

  /**
   * Check if any content filters are active (not just page restriction)
   * @returns {boolean} True if any content filters are active
   */
  hasActiveFilters() {
    const filters = this.getAll()
    return (
      (filters.keySig && filters.keySig.length > 0) ||
      filters.keySigSupplied !== null ||
      (filters.meterSig && filters.meterSig.length > 0) ||
      filters.meterSigSupplied !== null ||
      (filters.staves && filters.staves.length > 0) ||
      (filters.length && filters.length.length > 0) ||
      filters.metaNavigation !== null ||
      filters.metaClarification !== null ||
      filters.otherMeta !== null ||
      (filters.workRelations && filters.workRelations.length > 0)
    )
  }

  /**
   * Check if a zone passes all active filters
   * @param {Object} zone - Writing zone object with sketchProps and wzProps
   * @returns {boolean} True if zone passes all filters
   */
  matchesFilters(zone) {
    const filters = this.getAll()
    
    // Key signature filter
    if (filters.keySig && filters.keySig.length > 0) {
      const zoneKeySig = zone.sketchProps?.keySig?.val
      if (!zoneKeySig || !filters.keySig.includes(zoneKeySig)) {
        return false
      }
    }
    
    // Key signature supplied filter
    if (filters.keySigSupplied !== null) {
      const supplied = zone.sketchProps?.keySig?.supplied
      if (filters.keySigSupplied === true && supplied !== true) return false
      if (filters.keySigSupplied === false && supplied !== false) return false
    }
    
    // Meter signature filter
    if (filters.meterSig && filters.meterSig.length > 0) {
      const zoneMeterSig = zone.sketchProps?.meterSig?.val
      if (!zoneMeterSig || !filters.meterSig.includes(zoneMeterSig)) {
        return false
      }
    }
    
    // Meter signature supplied filter
    if (filters.meterSigSupplied !== null) {
      const supplied = zone.sketchProps?.meterSig?.supplied
      if (filters.meterSigSupplied === true && supplied !== true) return false
      if (filters.meterSigSupplied === false && supplied !== false) return false
    }
    
    // Staves filter (from sketchProps, which is the staff count for the sketch)
    if (filters.staves && filters.staves.length > 0) {
      const zoneStaves = zone.sketchProps?.staves
      if (zoneStaves === undefined || !filters.staves.includes(zoneStaves)) {
        return false
      }
    }
    
    // Length filter (based on atMeasures)
    if (filters.length && filters.length.length > 0) {
      const atMeasures = zone.sketchProps?.atMeasures || 0
      let lengthCategory = null
      if (atMeasures <= 5) lengthCategory = 'short'
      else if (atMeasures <= 10) lengthCategory = 'medium'
      else lengthCategory = 'long'
      
      if (!filters.length.includes(lengthCategory)) {
        return false
      }
    }
    
    // Meta navigation filter
    if (filters.metaNavigation !== null) {
      const hasNavigation = zone.wzProps?.metaNavigation === true
      if (filters.metaNavigation === true && !hasNavigation) return false
      if (filters.metaNavigation === false && hasNavigation) return false
    }
    
    // Meta clarification filter
    if (filters.metaClarification !== null) {
      const hasClarification = zone.wzProps?.metaClarification === true
      if (filters.metaClarification === true && !hasClarification) return false
      if (filters.metaClarification === false && hasClarification) return false
    }
    
    // Other meta filter
    if (filters.otherMeta !== null) {
      const hasOther = zone.wzProps?.otherMeta === true
      if (filters.otherMeta === true && !hasOther) return false
      if (filters.otherMeta === false && hasOther) return false
    }
    
    // Work relations filter
    if (filters.workRelations && filters.workRelations.length > 0) {
      const zoneWorks = zone.workRelations?.map(wr => wr.opus).filter(o => o) || []
      // Zone must have at least one matching work
      const hasMatchingWork = filters.workRelations.some(filterWork => 
        zoneWorks.includes(filterWork)
      )
      // Also check for "unbekannt" (unknown) - zones with no work relations
      const filterUnknown = filters.workRelations.includes('unbekannt')
      if (!hasMatchingWork && !(filterUnknown && zoneWorks.length === 0)) {
        return false
      }
    }
    
    return true
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
