import { describe, it, expect, beforeEach } from 'vitest'
import { FilterState } from '../src/filter-state.js'

describe('FilterState', () => {
  let filterState

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    filterState = new FilterState()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const filters = filterState.getAll()
      expect(filters.restrictToCurrentPage).toBe(true)
    })

    it('should load stored values from sessionStorage', () => {
      // Pre-populate storage
      sessionStorage.setItem('videFilters', JSON.stringify({
        restrictToCurrentPage: false
      }))

      const newFilterState = new FilterState()
      expect(newFilterState.restrictToCurrentPage).toBe(false)
    })

    it('should handle corrupted storage gracefully', () => {
      sessionStorage.setItem('videFilters', 'invalid-json{')
      const newFilterState = new FilterState()
      expect(newFilterState.restrictToCurrentPage).toBe(true)
    })
  })

  describe('getters and setters', () => {
    it('should get and set restrictToCurrentPage', () => {
      expect(filterState.restrictToCurrentPage).toBe(true)

      filterState.restrictToCurrentPage = false
      expect(filterState.restrictToCurrentPage).toBe(false)

      // Verify it's persisted
      const stored = JSON.parse(sessionStorage.getItem('videFilters'))
      expect(stored.restrictToCurrentPage).toBe(false)
    })

    it('should update partial filters', () => {
      filterState.update({ restrictToCurrentPage: false })
      expect(filterState.restrictToCurrentPage).toBe(false)
    })
  })

  describe('URL spec parsing', () => {
    it('should parse empty filter spec to defaults', () => {
      const filters = filterState.parseFilterSpec('')
      expect(filters.restrictToCurrentPage).toBe(true)
    })

    it('should parse "allPages" filter', () => {
      const filters = filterState.parseFilterSpec('allPages')
      expect(filters.restrictToCurrentPage).toBe(false)
    })

    it('should parse work filter', () => {
      const filters = filterState.parseFilterSpec('werk:Op.120')
      expect(filters.workRelations).toContain('Op.120')
    })

    it('should parse multiple filters', () => {
      const filters = filterState.parseFilterSpec('allPages;werk:Op.120')
      expect(filters.restrictToCurrentPage).toBe(false)
      expect(filters.workRelations).toContain('Op.120')
    })

    it('should apply filters from URL and persist them', () => {
      filterState.applyFromUrl('allPages')

      expect(filterState.restrictToCurrentPage).toBe(false)

      // Verify persistence
      const stored = JSON.parse(sessionStorage.getItem('videFilters'))
      expect(stored.restrictToCurrentPage).toBe(false)
    })

    it('should parse all advanced filter families', () => {
      const filters = filterState.parseFilterSpec(
        'allPages;keySig:3f,2s;keySigSupplied:true;meterSig:2/4,3/4;meterSigSupplied:false;staves:1,2,foo;length:short,medium,bad;meta:nav,!clar,other;werk:Op.120,Op.125'
      )

      expect(filters.restrictToCurrentPage).toBe(false)
      expect(filters.keySig).toEqual(['3f', '2s'])
      expect(filters.keySigSupplied).toBe(true)
      expect(filters.meterSig).toEqual(['2/4', '3/4'])
      expect(filters.meterSigSupplied).toBe(false)
      expect(filters.staves).toEqual([1, 2])
      expect(filters.length).toEqual(['short', 'medium'])
      expect(filters.metaNavigation).toBe(true)
      expect(filters.metaClarification).toBe(false)
      expect(filters.otherMeta).toBe(true)
      expect(filters.workRelations).toEqual(['Op.120', 'Op.125'])
    })

    it('should parse tristate supplied values including null fallback', () => {
      const trueFilters = filterState.parseFilterSpec('keySigSupplied:true;meterSigSupplied:true')
      expect(trueFilters.keySigSupplied).toBe(true)
      expect(trueFilters.meterSigSupplied).toBe(true)

      const falseFilters = filterState.parseFilterSpec('keySigSupplied:false;meterSigSupplied:false')
      expect(falseFilters.keySigSupplied).toBe(false)
      expect(falseFilters.meterSigSupplied).toBe(false)

      const nullFilters = filterState.parseFilterSpec('keySigSupplied:maybe;meterSigSupplied:maybe')
      expect(nullFilters.keySigSupplied).toBeNull()
      expect(nullFilters.meterSigSupplied).toBeNull()
    })
  })

  describe('URL spec generation', () => {
    it('should return null for default filters', () => {
      expect(filterState.toUrlSpec()).toBeNull()
    })

    it('should generate spec for allPages filter', () => {
      filterState.restrictToCurrentPage = false
      expect(filterState.toUrlSpec()).toBe('allPages')
    })

    it('should generate spec for work filter', () => {
      filterState.update({ workRelations: ['Op.120'] })
      expect(filterState.toUrlSpec()).toBe('werk:Op.120')
    })

    it('should generate spec for multiple filters', () => {
      filterState.update({
        restrictToCurrentPage: false,
        workRelations: ['Op.120']
      })
      expect(filterState.toUrlSpec()).toBe('allPages;werk:Op.120')
    })

    it('should generate URL spec for all non-default filters', () => {
      filterState.update({
        restrictToCurrentPage: false,
        keySig: ['3f'],
        keySigSupplied: false,
        meterSig: ['2/4'],
        meterSigSupplied: true,
        staves: [1, 3],
        length: ['short', 'long'],
        metaNavigation: false,
        metaClarification: true,
        otherMeta: false,
        workRelations: ['Op.120', 'unbekannt']
      })

      expect(filterState.toUrlSpec()).toBe(
        'allPages;keySig:3f;keySigSupplied:false;meterSig:2/4;meterSigSupplied:true;staves:1,3;length:short,long;meta:!nav,clar,!other;werk:Op.120,unbekannt'
      )
    })
  })

  describe('content filter behavior', () => {
    const zone = {
      sketchProps: {
        keySig: { val: '3f', supplied: true },
        meterSig: { val: '2/4', supplied: false },
        staves: 2,
        atMeasures: 4
      },
      wzProps: {
        metaNavigation: true,
        metaClarification: false,
        otherMeta: true
      },
      workRelations: [{ opus: 'Op.120' }]
    }

    it('should detect active content filters', () => {
      expect(filterState.hasActiveFilters()).toBe(false)
      filterState.update({ meterSig: ['2/4'] })
      expect(filterState.hasActiveFilters()).toBe(true)
    })

    it('should match a zone when all configured filters pass', () => {
      filterState.update({
        keySig: ['3f'],
        keySigSupplied: true,
        meterSig: ['2/4'],
        meterSigSupplied: false,
        staves: [2],
        length: ['short'],
        metaNavigation: true,
        metaClarification: false,
        otherMeta: true,
        workRelations: ['Op.120']
      })

      expect(filterState.matchesFilters(zone)).toBe(true)
    })

    it('should reject zones when each individual filter mismatches', () => {
      filterState.update({ keySig: ['2s'] })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ keySigSupplied: false })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ meterSig: ['3/4'] })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ meterSigSupplied: true })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ staves: [1] })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ length: ['long'] })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ metaNavigation: false })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ metaClarification: true })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ otherMeta: false })
      expect(filterState.matchesFilters(zone)).toBe(false)

      filterState.reset()
      filterState.update({ workRelations: ['Op.125'] })
      expect(filterState.matchesFilters(zone)).toBe(false)
    })

    it('should support unknown work filter for zones without opus', () => {
      const unknownZone = { ...zone, workRelations: [] }
      filterState.update({ workRelations: ['unbekannt'] })
      expect(filterState.matchesFilters(unknownZone)).toBe(true)
    })
  })

  describe('reset and clear', () => {
    it('should reset to defaults', () => {
      filterState.update({
        restrictToCurrentPage: false,
        workRelations: ['Op.120']
      })

      filterState.reset()

      const filters = filterState.getAll()
      expect(filters.restrictToCurrentPage).toBe(true)
      expect(filters.workRelations).toEqual([])
    })

    it('should clear storage', () => {
      filterState.restrictToCurrentPage = false
      expect(sessionStorage.getItem('videFilters')).not.toBeNull()

      filterState.clear()
      expect(sessionStorage.getItem('videFilters')).toBeNull()
    })
  })

  describe('integration scenarios', () => {
    it('should maintain state across multiple operations', () => {
      // User loads page with filter
      filterState.applyFromUrl('allPages')
      expect(filterState.restrictToCurrentPage).toBe(false)

      // User navigates (new FilterState instance simulates page navigation)
      const newFilterState = new FilterState()
      expect(newFilterState.restrictToCurrentPage).toBe(false)

      // Filter should persist
      expect(newFilterState.toUrlSpec()).toBe('allPages')
    })

    it('should handle URL → storage → URL round-trip', () => {
      const inputSpec = 'allPages;werk:Op.120'

      filterState.applyFromUrl(inputSpec)
      const outputSpec = filterState.toUrlSpec()

      expect(outputSpec).toBe(inputSpec)
    })
  })
})
