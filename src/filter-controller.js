/**
 * FilterController - Manages filter UI controls and interactions
 * Handles syncing UI with FilterState, applying filters, and populating dynamic filters
 */
export class FilterController {
  /**
   * @param {FilterState} filterState - The filter state instance
   */
  constructor (filterState) {
    this.filterState = filterState
    this.onFiltersApplied = null // Callback when filters are applied
    this.editionData = null
    this.restrictToCurrentPage = true
  }

  /**
   * Set edition data for populating dynamic filters
   * @param {Object} edition - Edition data object
   * @param {Array} pages - Array of page objects
   */
  setEditionData (edition, pages) {
    this.editionData = edition
    this.pages = pages
  }

  /**
   * Setup filter controls and event listeners
   */
  setup () {
    // Initialize all filter controls from current FilterState
    this.syncFilterUIFromState()

    // Populate work filters dynamically from edition data
    this.populateWorkFilters()

    // Apply Filter button
    const applyFilterBtn = document.getElementById('apply-filter-btn')
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', () => {
        this.applyFiltersFromUI()
        // Switch back to zones panel
        const sections = document.querySelectorAll('.panel-section')
        sections.forEach(s => s.classList.remove('active'))
        document.querySelector('.panel-section[data-panel="zones"]')?.classList.add('active')
      })
    }

    // Reset Filter button
    const resetFilterBtn = document.getElementById('reset-filter-btn')
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.filterState.reset()
        this.syncFilterUIFromState()
      })
    }
  }

  /**
   * Sync filter UI controls from FilterState
   */
  syncFilterUIFromState () {
    const filters = this.filterState.getAll()

    // Restrict to current page checkbox
    const restrictCheckbox = document.getElementById('filter-restrict-page')
    if (restrictCheckbox) {
      restrictCheckbox.checked = filters.restrictToCurrentPage
    }
    this.restrictToCurrentPage = filters.restrictToCurrentPage

    // Key signature checkboxes
    document.querySelectorAll('input[name="filter-keysig"]').forEach(cb => {
      cb.checked = filters.keySig && filters.keySig.includes(cb.value)
    })

    // Key signature supplied radio
    document.querySelectorAll('input[name="filter-keysig-supplied"]').forEach(radio => {
      if (filters.keySigSupplied === null && radio.value === 'any') radio.checked = true
      else if (filters.keySigSupplied === true && radio.value === 'supplied') radio.checked = true
      else if (filters.keySigSupplied === false && radio.value === 'original') radio.checked = true
    })

    // Meter signature checkboxes
    document.querySelectorAll('input[name="filter-metersig"]').forEach(cb => {
      cb.checked = filters.meterSig && filters.meterSig.includes(cb.value)
    })

    // Meter signature supplied radio
    document.querySelectorAll('input[name="filter-metersig-supplied"]').forEach(radio => {
      if (filters.meterSigSupplied === null && radio.value === 'any') radio.checked = true
      else if (filters.meterSigSupplied === true && radio.value === 'supplied') radio.checked = true
      else if (filters.meterSigSupplied === false && radio.value === 'original') radio.checked = true
    })

    // Length checkboxes
    document.querySelectorAll('input[name="filter-length"]').forEach(cb => {
      cb.checked = filters.length && filters.length.includes(cb.value)
    })

    // Staves checkboxes
    document.querySelectorAll('input[name="filter-staves"]').forEach(cb => {
      const val = parseInt(cb.value, 10)
      cb.checked = filters.staves && filters.staves.includes(val)
    })

    // Meta checkboxes
    const metaNavCb = document.querySelector('input[name="filter-meta-nav"]')
    if (metaNavCb) metaNavCb.checked = filters.metaNavigation === true

    const metaClarCb = document.querySelector('input[name="filter-meta-clar"]')
    if (metaClarCb) metaClarCb.checked = filters.metaClarification === true

    const metaOtherCb = document.querySelector('input[name="filter-meta-other"]')
    if (metaOtherCb) metaOtherCb.checked = filters.otherMeta === true

    // Work relations checkboxes
    document.querySelectorAll('input[name="filter-werk"]').forEach(cb => {
      cb.checked = filters.workRelations && filters.workRelations.includes(cb.value)
    })
  }

  /**
   * Read filter values from UI and apply them
   */
  applyFiltersFromUI () {
    const filters = this.filterState.getDefaults()

    // Restrict to current page
    const restrictCheckbox = document.getElementById('filter-restrict-page')
    filters.restrictToCurrentPage = restrictCheckbox ? restrictCheckbox.checked : true

    // Key signatures
    filters.keySig = []
    document.querySelectorAll('input[name="filter-keysig"]:checked').forEach(cb => {
      filters.keySig.push(cb.value)
    })

    // Key signature supplied
    const keySigSuppliedRadio = document.querySelector('input[name="filter-keysig-supplied"]:checked')
    if (keySigSuppliedRadio) {
      if (keySigSuppliedRadio.value === 'supplied') filters.keySigSupplied = true
      else if (keySigSuppliedRadio.value === 'original') filters.keySigSupplied = false
      else filters.keySigSupplied = null
    }

    // Meter signatures
    filters.meterSig = []
    document.querySelectorAll('input[name="filter-metersig"]:checked').forEach(cb => {
      filters.meterSig.push(cb.value)
    })

    // Meter signature supplied
    const meterSigSuppliedRadio = document.querySelector('input[name="filter-metersig-supplied"]:checked')
    if (meterSigSuppliedRadio) {
      if (meterSigSuppliedRadio.value === 'supplied') filters.meterSigSupplied = true
      else if (meterSigSuppliedRadio.value === 'original') filters.meterSigSupplied = false
      else filters.meterSigSupplied = null
    }

    // Length
    filters.length = []
    document.querySelectorAll('input[name="filter-length"]:checked').forEach(cb => {
      filters.length.push(cb.value)
    })

    // Staves
    filters.staves = []
    document.querySelectorAll('input[name="filter-staves"]:checked').forEach(cb => {
      const val = parseInt(cb.value, 10)
      if (!isNaN(val)) filters.staves.push(val)
    })

    // Meta filters
    const metaNavCb = document.querySelector('input[name="filter-meta-nav"]')
    filters.metaNavigation = metaNavCb && metaNavCb.checked ? true : null

    const metaClarCb = document.querySelector('input[name="filter-meta-clar"]')
    filters.metaClarification = metaClarCb && metaClarCb.checked ? true : null

    const metaOtherCb = document.querySelector('input[name="filter-meta-other"]')
    filters.otherMeta = metaOtherCb && metaOtherCb.checked ? true : null

    // Work relations
    filters.workRelations = []
    document.querySelectorAll('input[name="filter-werk"]:checked').forEach(cb => {
      filters.workRelations.push(cb.value)
    })

    // Update FilterState (persists to sessionStorage)
    this.filterState.setAll(filters)
    this.restrictToCurrentPage = filters.restrictToCurrentPage

    // Trigger callback if set
    if (this.onFiltersApplied) {
      this.onFiltersApplied(filters)
    }
  }

  /**
   * Populate work filters dynamically from edition data
   */
  populateWorkFilters () {
    const container = document.querySelector('.filter-werke')
    if (!container || !this.editionData) return

    // Collect all unique opus values from all zones
    const opusSet = new Set()
    let hasZonesWithoutWork = false

    if (this.pages) {
      this.pages.forEach(page => {
        if (page.writingZones) {
          page.writingZones.forEach(zone => {
            if (zone.workRelations && zone.workRelations.length > 0) {
              zone.workRelations.forEach(wr => {
                if (wr.opus) opusSet.add(wr.opus)
              })
            } else {
              hasZonesWithoutWork = true
            }
          })
        }
      })
    }

    // Sort opus values
    const opusList = Array.from(opusSet).sort()

    // Build filter list
    container.innerHTML = ''
    const currentFilters = this.filterState.getAll()

    opusList.forEach(opus => {
      const li = document.createElement('li')
      const isChecked = currentFilters.workRelations && currentFilters.workRelations.includes(opus)
      li.innerHTML = `<label><input type="checkbox" name="filter-werk" value="${opus}"${isChecked ? ' checked' : ''}> ${opus}</label>`
      container.appendChild(li)
    })

    // Add "unbekannt" option if there are zones without work relations
    if (hasZonesWithoutWork) {
      const li = document.createElement('li')
      const isChecked = currentFilters.workRelations && currentFilters.workRelations.includes('unbekannt')
      li.innerHTML = `<label><input type="checkbox" name="filter-werk" value="unbekannt"${isChecked ? ' checked' : ''}> unbekannt</label>`
      container.appendChild(li)
    }
  }

  /**
   * Apply filter settings from URL filter spec
   * @param {string} filterSpec - Filter specification (e.g., "allPages;keySig:3f")
   */
  applyFiltersFromUrl (filterSpec) {
    this.filterState.applyFromUrl(filterSpec)
    this.restrictToCurrentPage = this.filterState.restrictToCurrentPage

    // Update checkbox if it exists
    const restrictCheckbox = document.getElementById('filter-restrict-page')
    if (restrictCheckbox) {
      restrictCheckbox.checked = this.restrictToCurrentPage
    }
  }

  /**
   * Get current filter spec for URL
   * @returns {string|null} Filter spec or null if using defaults
   */
  getFilterSpec () {
    return this.filterState.toUrlSpec()
  }

  /**
   * Check if any content filters are active
   * @returns {boolean} True if content filters are active
   */
  hasActiveFilters () {
    return this.filterState.hasActiveFilters()
  }

  /**
   * Check if a zone matches current filters
   * @param {Object} zone - Zone object to check
   * @returns {boolean} True if zone matches all active filters
   */
  matchesFilters (zone) {
    return this.filterState.matchesFilters(zone)
  }
}
