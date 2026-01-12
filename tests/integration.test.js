import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FilterState } from '../src/filter-state.js'

describe('FilterState Integration', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  describe('URL round-trip scenarios', () => {
    it('should persist filters across page navigation', () => {
      // Simulate user loads page with filter
      const filterState1 = new FilterState()
      filterState1.applyFromUrl('allPages')
      
      // Verify state is stored
      expect(filterState1.restrictToCurrentPage).toBe(false)
      
      // Simulate navigation to new page (new FilterState instance)
      const filterState2 = new FilterState()
      
      // Filter should be persisted from sessionStorage
      expect(filterState2.restrictToCurrentPage).toBe(false)
      expect(filterState2.toUrlSpec()).toBe('allPages')
    })

    it('should handle filter toggle and URL update cycle', () => {
      const filterState = new FilterState()
      
      // Initial state: restrict to current page (default)
      expect(filterState.toUrlSpec()).toBeNull()
      
      // User toggles to all pages
      filterState.restrictToCurrentPage = false
      expect(filterState.toUrlSpec()).toBe('allPages')
      
      // User navigates to another page
      const newFilterState = new FilterState()
      expect(newFilterState.toUrlSpec()).toBe('allPages')
      
      // User toggles back
      newFilterState.restrictToCurrentPage = true
      expect(newFilterState.toUrlSpec()).toBeNull()
    })

    it('should handle complex multi-filter URLs', () => {
      const filterState = new FilterState()
      
      // Simulate URL with multiple filters
      filterState.applyFromUrl('allPages,byWork:op59')
      
      expect(filterState.restrictToCurrentPage).toBe(false)
      expect(filterState.getAll().workFilter).toBe('op59')
      
      // Verify URL regeneration
      expect(filterState.toUrlSpec()).toBe('allPages,byWork:op59')
    })

    it('should handle URL without filters, persisting previous state', () => {
      const filterState1 = new FilterState()
      
      // User sets filter
      filterState1.restrictToCurrentPage = false
      
      // User navigates to URL without filter spec
      const filterState2 = new FilterState()
      // The filter should still be false (persisted from sessionStorage)
      expect(filterState2.restrictToCurrentPage).toBe(false)
      
      // When generating URL, include filter spec to maintain state
      expect(filterState2.toUrlSpec()).toBe('allPages')
    })

    it('should support adding new filters without breaking existing ones', () => {
      const filterState = new FilterState()
      
      // Set initial filter
      filterState.restrictToCurrentPage = false
      
      // Add additional filter without breaking the first
      filterState.update({ workFilter: 'op59' })
      
      expect(filterState.restrictToCurrentPage).toBe(false)
      expect(filterState.getAll().workFilter).toBe('op59')
      expect(filterState.toUrlSpec()).toBe('allPages,byWork:op59')
    })
  })

  describe('State consistency scenarios', () => {
    it('should maintain consistency between property access and getAll', () => {
      const filterState = new FilterState()
      
      filterState.restrictToCurrentPage = false
      
      const allFilters = filterState.getAll()
      expect(allFilters.restrictToCurrentPage).toBe(false)
      expect(filterState.restrictToCurrentPage).toBe(false)
    })

    it('should handle concurrent filter updates correctly', () => {
      const filterState = new FilterState()
      
      // Simulate rapid updates
      filterState.restrictToCurrentPage = false
      filterState.update({ workFilter: 'op59' })
      filterState.restrictToCurrentPage = true
      
      // Last update should win
      expect(filterState.restrictToCurrentPage).toBe(true)
      expect(filterState.getAll().workFilter).toBe('op59')
    })
  })

  describe('Error recovery scenarios', () => {
    it('should recover from corrupted storage gracefully', () => {
      // Corrupt the storage
      sessionStorage.setItem('videFilters', 'not-json-{')
      
      // Should use defaults without throwing
      const filterState = new FilterState()
      expect(filterState.restrictToCurrentPage).toBe(true)
      
      // Should be able to update normally after recovery
      filterState.restrictToCurrentPage = false
      expect(filterState.toUrlSpec()).toBe('allPages')
    })

    it('should handle missing storage keys gracefully', () => {
      sessionStorage.removeItem('videFilters')
      
      const filterState = new FilterState()
      expect(filterState.restrictToCurrentPage).toBe(true)
    })
  })
})
