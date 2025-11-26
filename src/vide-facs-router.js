import { templates } from './templates.js'

/**
 * Test1Router
 * Client-side router using the History API for the Digital Facsimile SPA island
 */
export class VideFacsRouter {
  constructor(appElement) {
    this.basePath = '/facs'
    this.app = appElement
    this.contentEl = appElement.querySelector('vide-facs-content')

    if (!this.contentEl) {
      console.error('SPA content component not found')
      return
    }

    this.init()
  }

  init() {
    // Check for ?_path parameter (from 404 redirect)
    const urlParams = new URLSearchParams(window.location.search)
    const pathParam = urlParams.get('_path')

    if (pathParam) {
      // Restore clean URL and route
      const cleanUrl = this.basePath + pathParam
      history.replaceState({ path: pathParam }, '', cleanUrl)
      this.route(pathParam)
    } else {
      // Normal initial route
      this.route(this.getCurrentPath())
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.route(this.getCurrentPath())
    })

    // Intercept clicks on SPA links (use delegation on app element)
    this.app.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-spa-link]')
      if (link) {
        e.preventDefault()
        const path = link.getAttribute('href')
        this.navigate(path)
      }
    })
  }

  /**
   * Get the current path relative to basePath
   */
  getCurrentPath() {
    const fullPath = window.location.pathname

    // Remove basePath from the beginning
    if (fullPath.startsWith(this.basePath)) {
      return fullPath.slice(this.basePath.length) || '/'
    }

    return '/'
  }

  /**
   * Navigate to a new path within the SPA
   * @param {string} path - Path (can be absolute or relative to basePath)
   */
  navigate(path) {
    // If path includes basePath, extract the relative portion
    if (path.startsWith(this.basePath)) {
      path = path.slice(this.basePath.length) || '/'
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path
    }

    const fullUrl = this.basePath + path

    // Update browser history
    history.pushState({ path }, '', fullUrl)

    // Route to new content
    this.route(path)
  }

  /**
   * Route to the appropriate view based on path
   * @param {string} path - Current path
   */
  route(path) {
    // Clean up OpenSeadragon viewer if navigating away
    if (this.viewer && this.currentRoute !== path) {
      this.cleanupViewer()
    }

    // Store current route
    this.currentRoute = path

    // Parse path segments
    const segments = path.split('/').filter(s => s)

    // Route patterns:
    // /facs/ -> redirect to /facs/NK/
    // /facs/NK/ -> load manifest NK, show first page
    // /facs/NK/2/ -> load manifest NK, show page 2
    // /facs/NK/2-3/ -> load manifest NK, show pages 2-3 side by side

    if (segments.length === 0) {
      // /facs/ - redirect to NK manifest
      this.navigate('/NK/')
    } else if (segments.length === 1) {
      // /facs/NK/ - load manifest and show first page
      const manifestId = segments[0]
      this.loadManifestAndRender(manifestId)
    } else if (segments.length === 2) {
      // /facs/NK/2/ or /facs/NK/2-3/
      const manifestId = segments[0]
      const pageSpec = segments[1]
      this.loadManifestAndRender(manifestId, pageSpec)
    } else {
      this.renderNotFound(path)
    }
  }

  /**
   * Clean up OpenSeadragon viewer
   */
  cleanupViewer() {
    if (this.viewer) {
      try {
        this.viewer.destroy()
      } catch (e) {
        console.warn('Error destroying viewer:', e)
      }
      this.viewer = null
    }
  }

  /**
   * Load IIIF manifest and render pages
   * @param {string} manifestId - Manifest identifier (e.g., 'NK')
   * @param {string} pageSpec - Page specification (e.g., '2' or '2-3'), defaults to first page
   */
  async loadManifestAndRender(manifestId, pageSpec = null) {
    // Map manifest IDs to URLs
    const manifestUrls = {
      'NK': 'https://api.beethovens-werkstatt.de/iiif/document/r24d1c005-acee-43a0-acfa-5dae796b7ec4/manifest.json'
    }

    const manifestUrl = manifestUrls[manifestId]
    if (!manifestUrl) {
      this.renderNotFound(`/facs/${manifestId}/`)
      return
    }

    try {
      // Show loading state
      this.contentEl.setContent(templates.loading('Loading manifest...'))

      // Fetch manifest
      const response = await fetch(manifestUrl)
      if (!response.ok) throw new Error(`Failed to load manifest: ${response.status}`)

      const manifest = await response.json()
      this.currentManifest = manifest

      // Parse page specification
      const pages = this.parsePageSpec(pageSpec, manifest)

      // Render viewer with pages
      this.renderViewer(pages)

    } catch (error) {
      console.error('Error loading manifest:', error)
      this.contentEl.setContent(
        templates.error(
          'Error Loading Manifest',
          `Could not load manifest: ${error.message}`,
          `${this.basePath}/`
        )
      )
    }
  }

  /**
   * Parse page specification and return canvas objects
   * @param {string|null} pageSpec - Page specification ('2' or '2-3')
   * @param {object} manifest - IIIF manifest
   * @returns {Array} Array of canvas objects
   */
  parsePageSpec(pageSpec, manifest) {
    const canvases = manifest.sequences[0].canvases

    if (!pageSpec) {
      // Default to first page
      return [canvases[0]]
    }

    if (pageSpec.includes('-')) {
      // Double page view: '2-3'
      const [left, right] = pageSpec.split('-').map(n => parseInt(n, 10))
      return [
        canvases[left - 1],
        canvases[right - 1]
      ].filter(c => c) // Filter out undefined
    } else {
      // Single page view: '2'
      const pageNum = parseInt(pageSpec, 10)
      return [canvases[pageNum - 1]].filter(c => c)
    }
  }

  /**
   * Render OpenSeadragon viewer with specified pages
   * @param {Array} pages - Array of IIIF canvas objects
   */
  renderViewer(pages) {
    this.contentEl.setContent(templates.facsimileViewer())

    // Initialize OpenSeadragon with pages
    setTimeout(() => this.initOpenSeadragon(pages), 0)
  }



  /**
   * Initialize OpenSeadragon viewer
   * @param {Array} pages - Array of IIIF canvas objects to display
   */
  initOpenSeadragon(pages = []) {
    this.pagesToLoad = pages

    // Load OpenSeadragon if not already loaded
    if (typeof OpenSeadragon === 'undefined') {
      const script = document.createElement('script')
      script.src = '/assets/js/vendor/openseadragon/openseadragon.min.js'
      script.onload = () => this.createViewer()
      document.head.appendChild(script)
    } else {
      this.createViewer()
    }
  }

  /**
   * Create OpenSeadragon viewer instance
   */
  createViewer() {
    const viewerEl = document.getElementById('openseadragon-viewer')
    if (!viewerEl) return

    // Clean up existing viewer first
    this.cleanupViewer()

    const pages = this.pagesToLoad || []

    // Build tileSources from IIIF canvases
    const tileSources = pages.map(canvas => {
      // Get the first image from the canvas
      const image = canvas.images[0]
      const resource = image.resource

      // Use IIIF Image API info.json URL
      if (resource['@id']) {
        return resource.service['@id'] + '/info.json'
      }
      return null
    }).filter(ts => ts)

    if (tileSources.length === 0) {
      console.warn('No tile sources to display')
      return
    }

    // Store manifest info for navigation
    const manifest = this.currentManifest
    const totalPages = manifest.sequences[0].canvases.length

    // Determine current page(s) from pages array
    const currentPageIndices = pages.map(p =>
      manifest.sequences[0].canvases.indexOf(p) + 1
    )

    // For double-page view, use multi-image layout with side-by-side positioning
    if (tileSources.length === 2) {
      this.viewer = OpenSeadragon({
        id: 'openseadragon-viewer',
        prefixUrl: '/assets/js/vendor/openseadragon/images/',
        crossOriginPolicy: 'Anonymous',
        ajaxWithCredentials: false,
        showNavigationControl: false,
        showFullPageControl: false,
        sequenceMode: false,
        defaultZoomLevel: 0,
        minZoomLevel: 0.5,
        maxZoomLevel: 10,
        visibilityRatio: 1.0,
        constrainDuringPan: false,
        tileSources: [{
          tileSource: tileSources[0],
          x: 0,
          y: 0,
          width: 0.5
        }, {
          tileSource: tileSources[1],
          x: 0.5,
          y: 0,
          width: 0.5
        }]
      })
    } else {
      /**
       * Initialize Vorzeichnung slider label and update on input
       */
      // Single page view
      this.viewer = OpenSeadragon({
        id: 'openseadragon-viewer',
        prefixUrl: '/assets/js/vendor/openseadragon/images/',
        tileSources: tileSources[0],
        crossOriginPolicy: 'Anonymous',
        ajaxWithCredentials: false,
        showNavigationControl: false,
        showFullPageControl: false,
        defaultZoomLevel: 0,
        minZoomLevel: 0.5,
        maxZoomLevel: 10,
        visibilityRatio: 1.0,
        constrainDuringPan: false
      })
    }

    // Store current page indices for navigation
    this.currentPageIndices = currentPageIndices

    // Setup page navigation
    this.setupPageNavigation(currentPageIndices, totalPages)

    // Setup page preview panel
    this.setupPagePreviews(currentPageIndices)

    // Setup zoom controls
    this.setupZoomControls()

    // Setup side panel
    this.setupSidePanel()
  }

  /**
   * Setup page navigation controls
   */
  setupPageNavigation(currentPages, totalPages) {
    const prevBtn = document.getElementById('prev-page')
    const nextBtn = document.getElementById('next-page')
    const pageInfo = document.getElementById('page-info')

    if (!prevBtn || !nextBtn || !pageInfo) return

    // Update page info display
    if (currentPages.length === 2) {
      pageInfo.textContent = `Seiten ${currentPages[0]}-${currentPages[1]} von ${totalPages}`
    } else {
      pageInfo.textContent = `Seite ${currentPages[0]} von ${totalPages}`
    }

    // Determine previous/next page specs
    let prevPageSpec = null
    let nextPageSpec = null

    if (currentPages.length === 2) {
      // Double page mode
      const leftPage = currentPages[0]
      const rightPage = currentPages[1]

      if (leftPage > 2) {
        prevPageSpec = `${leftPage - 2}-${leftPage - 1}`
      } else if (leftPage === 2) {
        prevPageSpec = '1'
      }

      if (rightPage < totalPages - 1) {
        nextPageSpec = `${rightPage + 1}-${rightPage + 2}`
      } else if (rightPage === totalPages - 1) {
        nextPageSpec = `${totalPages}`
      }
    } else {
      // Single page mode
      const page = currentPages[0]

      if (page > 1) {
        prevPageSpec = `${page - 1}`
      }

      if (page < totalPages) {
        nextPageSpec = `${page + 1}`
      }
    }

    // Setup button states and handlers
    const manifestId = this.getCurrentManifestId()

    if (prevPageSpec) {
      prevBtn.disabled = false
      prevBtn.onclick = () => {
        this.navigate(`${this.basePath}/${manifestId}/${prevPageSpec}/`)
      }
    } else {
      prevBtn.disabled = true
    }

    if (nextPageSpec) {
      nextBtn.disabled = false
      nextBtn.onclick = () => {
        this.navigate(`${this.basePath}/${manifestId}/${nextPageSpec}/`)
      }
    } else {
      nextBtn.disabled = true
    }
  }

  /**
   * Get current manifest ID from URL
   */
  getCurrentManifestId() {
    const path = this.getCurrentPath()
    const segments = path.split('/').filter(s => s)
    return segments.length > 0 ? segments[0] : 'NK'
  }

  /**
   * Setup page preview panel with thumbnails
   * @param {Array} currentPages - Array of current page numbers
   */
  setupPagePreviews(currentPages = [1]) {
    const container = document.getElementById('page-preview-container')
    const panel = document.getElementById('page-preview-panel')
    const toggleBtn = document.getElementById('toggle-preview')

    if (!container || !this.currentManifest) return

    const canvases = this.currentManifest.sequences[0].canvases
    const manifestId = this.getCurrentManifestId()

    // Clear existing thumbnails
    container.innerHTML = ''

    // Generate thumbnail groups: first page alone, then pairs
    let i = 0
    while (i < canvases.length) {
      const groupDiv = document.createElement('div')
      groupDiv.classList.add('page-thumbnail-group')

      if (i === 0) {
        // First page alone
        const pageNum = 1
        const isActive = currentPages.includes(1)
        const thumbnail = canvases[0].images[0].resource.service['@id'] + '/full/,90/0/default.jpg'

        const img = document.createElement('img')
        img.src = thumbnail
        img.alt = `Seite ${pageNum}`
        img.crossOrigin = 'anonymous'

        const label = document.createElement('div')
        label.className = 'page-label'
        label.textContent = '1'

        groupDiv.appendChild(img)
        groupDiv.appendChild(label)
        groupDiv.dataset.pages = '1'
        groupDiv.dataset.pageCount = 'single'

        // Mark as active if showing this page
        if (isActive) {
          groupDiv.classList.add('active')
        }

        // Click handler
        groupDiv.addEventListener('click', () => {
          this.navigate(`${this.basePath}/${manifestId}/1/`)
        })

        i++
      } else {
        // Pair of pages (verso + recto)
        const leftPage = i + 1
        const rightPage = i + 2
        const isActive = currentPages.includes(leftPage) || (canvases[i + 1] && currentPages.includes(rightPage))

        if (canvases[i]) {
          const leftThumb = canvases[i].images[0].resource.service['@id'] + '/full/,90/0/default.jpg'
          const leftImg = document.createElement('img')
          leftImg.src = leftThumb
          leftImg.alt = `Seite ${leftPage}`
          leftImg.crossOrigin = 'anonymous'
          groupDiv.appendChild(leftImg)
        }

        if (canvases[i + 1]) {
          const rightThumb = canvases[i + 1].images[0].resource.service['@id'] + '/full/,90/0/default.jpg'
          const rightImg = document.createElement('img')
          rightImg.src = rightThumb
          rightImg.alt = `Seite ${rightPage}`
          rightImg.crossOrigin = 'anonymous'
          groupDiv.appendChild(rightImg)
        }

        const label = document.createElement('div')
        label.className = 'page-label'
        if (canvases[i + 1]) {
          label.textContent = `${leftPage}-${rightPage}`
          groupDiv.dataset.pages = `${leftPage}-${rightPage}`
          groupDiv.dataset.pageCount = 'double'
        } else {
          label.textContent = `${leftPage}`
          groupDiv.dataset.pages = `${leftPage}`
          groupDiv.dataset.pageCount = 'single'
        }

        groupDiv.appendChild(label)

        // Mark as active if showing these pages
        if (isActive) {
          groupDiv.classList.add('active')
        }

        // Click handler
        groupDiv.addEventListener('click', () => {
          const pageSpec = groupDiv.dataset.pages
          this.navigate(`${this.basePath}/${manifestId}/${pageSpec}/`)
        })

        i += 2
      }

      container.appendChild(groupDiv)
    }

    // Toggle panel visibility
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed')
        toggleBtn.textContent = panel.classList.contains('collapsed') ? '▼' : '▲'
      })
    }

    // Prevent swipe-to-navigate-back when scrolling horizontally at the left edge
    if (panel) {
      let startX = 0
      let scrollLeft = 0

      panel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX
        scrollLeft = panel.scrollLeft
      }, { passive: true })

      panel.addEventListener('wheel', (e) => {
        // If scrolling horizontally and not at left edge, prevent default navigation
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && panel.scrollLeft > 0) {
          e.preventDefault()
        }
        // If at left edge but trying to scroll right (into content), also prevent
        if (panel.scrollLeft === 0 && e.deltaX < 0) {
          e.preventDefault()
        }
      }, { passive: false })

      panel.addEventListener('touchmove', (e) => {
        const currentX = e.touches[0].pageX
        const diff = startX - currentX

        // If scrolling right (into content) or not at left edge, prevent navigation
        if (diff < 0 || scrollLeft > 0) {
          e.stopPropagation()
        }
      }, { passive: true })
    }

    // Scroll active thumbnail into view
    setTimeout(() => {
      const activeThumb = container.querySelector('.page-thumbnail.active')
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }, 100)
  }

  /**
   * Setup side panel with tabs and panel switching
   */
  setupSidePanel() {
    const sidePanel = document.getElementById('side-panel')
    const tabs = document.querySelectorAll('.side-panel-tab')
    const sections = document.querySelectorAll('.panel-section')
    const panelContent = document.getElementById('side-panel-content')
    const showFilterBtn = document.getElementById('show-filter-btn')
    const applyFilterBtn = document.getElementById('apply-filter-btn')

    if (!sidePanel || !tabs.length) return

    // Switch to filter panel
    if (showFilterBtn) {
      showFilterBtn.addEventListener('click', () => {
        sections.forEach(s => s.classList.remove('active'))
        document.querySelector('.panel-section[data-panel="filter"]').classList.add('active')
      })
    }

    // Switch back to zones panel (apply filters)
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', () => {
        sections.forEach(s => s.classList.remove('active'))
        document.querySelector('.panel-section[data-panel="zones"]').classList.add('active')
      })
    }

    // Cancel button - switch back without applying filters
    const cancelFilterBtn = document.getElementById('cancel-filter-btn')
    if (cancelFilterBtn) {
      cancelFilterBtn.addEventListener('click', () => {
        sections.forEach(s => s.classList.remove('active'))
        document.querySelector('.panel-section[data-panel="zones"]').classList.add('active')
      })
    }

    // Forward pointer and wheel events to OSD viewer if not handled by a child
    if (panelContent) {
      const osdViewer = document.getElementById('openseadragon-viewer')
      const forwardEvent = (event) => {
        // Only forward if event target is panelContent itself (not a child)
        if (event.target === panelContent && osdViewer) {
          // Clone and dispatch event to OSD viewer
          const newEvent = new event.constructor(event.type, event)
          osdViewer.dispatchEvent(newEvent)
        }
      }
      panelContent.addEventListener('pointerdown', forwardEvent)
      panelContent.addEventListener('pointerup', forwardEvent)
      panelContent.addEventListener('pointermove', forwardEvent)
      panelContent.addEventListener('wheel', forwardEvent)
    }

    // Track if panel was manually interacted with
    let wasOpen = true

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const panelName = tab.dataset.panel
        // If clicking the active tab, toggle collapse
        if (tab.classList.contains('active') && wasOpen) {
          sidePanel.classList.add('collapsed')
          wasOpen = false
        } else {
          // Open panel and switch to this tab
          sidePanel.classList.remove('collapsed')
          wasOpen = true

          // Update active tab
          tabs.forEach(t => t.classList.remove('active'))
          tab.classList.add('active')

          // Update active section
          sections.forEach(s => s.classList.remove('active'))
          const activeSection = document.querySelector(`.panel-section[data-panel="${panelName}"]`)
          if (activeSection) {
            activeSection.classList.add('active')
          }
        }
      })
    })
  }

  /**
   * Setup zoom controls and modal
   */
  setupZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in')
    const zoomOutBtn = document.getElementById('zoom-out')
    const openModalBtn = document.getElementById('open-modal')
    const closeModalBtn = document.getElementById('close-modal')
    const modal = document.getElementById('notebook-modal')

    if (zoomInBtn && this.viewer) {
      zoomInBtn.addEventListener('click', () => {
        this.viewer.viewport.zoomBy(1.3)
        this.viewer.viewport.applyConstraints()
      })
    }

    if (zoomOutBtn && this.viewer) {
      zoomOutBtn.addEventListener('click', () => {
        this.viewer.viewport.zoomBy(0.7)
        this.viewer.viewport.applyConstraints()
      })
    }

    // Open modal
    if (openModalBtn && modal) {
      openModalBtn.addEventListener('click', () => {
        modal.style.display = 'flex'
      })
    }

    // Close modal
    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none'
      })
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
        modal.style.display = 'none'
      }
    })
  }

  /**
   * Render 404 page
   */
  renderNotFound(path) {
    this.contentEl.setContent(
      templates.error(
        '404 - Not Found',
        `The path <code>${path}</code> was not found.`,
        `${this.basePath}/`
      )
    )
  }
}
