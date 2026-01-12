import { describe, it, expect, beforeEach, vi } from 'vitest'
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
      const filters = filterState.parseFilterSpec('byWork:op59')
      expect(filters.workFilter).toBe('op59')
    })

    it('should parse multiple filters', () => {
      const filters = filterState.parseFilterSpec('allPages,byWork:op59')
      expect(filters.restrictToCurrentPage).toBe(false)
      expect(filters.workFilter).toBe('op59')
    })

    it('should apply filters from URL and persist them', () => {
      filterState.applyFromUrl('allPages')
      
      expect(filterState.restrictToCurrentPage).toBe(false)
      
      // Verify persistence
      const stored = JSON.parse(sessionStorage.getItem('videFilters'))
      expect(stored.restrictToCurrentPage).toBe(false)
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
      filterState.update({ workFilter: 'op59' })
      expect(filterState.toUrlSpec()).toBe('byWork:op59')
    })

    it('should generate spec for multiple filters', () => {
      filterState.update({
        restrictToCurrentPage: false,
        workFilter: 'op59'
      })
      expect(filterState.toUrlSpec()).toBe('allPages,byWork:op59')
    })
  })

  describe('reset and clear', () => {
    it('should reset to defaults', () => {
      filterState.update({
        restrictToCurrentPage: false,
        workFilter: 'op59'
      })
      
      filterState.reset()
      
      const filters = filterState.getAll()
      expect(filters.restrictToCurrentPage).toBe(true)
      expect(filters.workFilter).toBeUndefined()
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
      const inputSpec = 'allPages,byWork:op59'
      
      filterState.applyFromUrl(inputSpec)
      const outputSpec = filterState.toUrlSpec()
      
      expect(outputSpec).toBe(inputSpec)
    })
  })
})
