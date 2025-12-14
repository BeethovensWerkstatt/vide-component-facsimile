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
    // Store current route
    this.currentRoute = path

    // Parse path segments
    const segments = path.split('/').filter(s => s)

    // Route patterns:
    // /facs/ -> redirect to /facs/NK/
    // /facs/NK/ -> load manifest NK, show first page
    // /facs/NK/p2/ -> load manifest NK, show page 2
    // /facs/NK/p2-3/ -> load manifest NK, show pages 2-3 side by side
    // /facs/NK/p2/filter:allPages/ -> page 2 with filter
    // /facs/NK/p2/wz2.5/ -> load manifest NK, page 2, highlight zone 5
    // /facs/NK/p2/filter:allPages/wz2.5/ -> page 2 with filter and zone
    // /facs/NK/p8-9/wz9.1/ -> load manifest NK, pages 8-9, highlight zone 1 on page 9

    if (segments.length === 0) {
      // /facs/ - redirect to NK manifest
      this.navigate('/NK/')
    } else if (segments.length === 1) {
      // /facs/NK/ - load manifest and show first page
      const manifestId = segments[0]
      // Clean up viewer when changing manifest
      if (this.viewer && this.currentManifestId !== manifestId) {
        this.cleanupViewer()
      }
      this.loadManifestAndRender(manifestId)
    } else {
      // Parse remaining segments to extract: manifestId, pageSpec, filters, zoneSpec
      const manifestId = segments[0]
      let pageSpec = null
      let filterSpec = null
      let zoneSpec = null
      
      // segments[1] is always pageSpec (p2, p2-3, etc)
      if (segments[1] && segments[1].startsWith('p')) {
        pageSpec = segments[1].substring(1)
      }
      
      // Check remaining segments for filter: and wz
      for (let i = 2; i < segments.length; i++) {
        if (segments[i].startsWith('filter:')) {
          filterSpec = segments[i].substring(7) // Remove 'filter:' prefix
        } else if (segments[i].startsWith('wz')) {
          zoneSpec = segments[i].substring(2) // Remove 'wz' prefix
        }
      }
      
      // Apply filters if present
      if (filterSpec) {
        this.applyFiltersFromUrl(filterSpec)
      } else {
        // Reset to defaults if no filter in URL
        this.restrictToCurrentPage = true
      }
      
      // Parse zone spec if present
      let zoneLabel = null
      let zonePageIndex = null
      if (zoneSpec) {
        const [zonePageStr, zoneLabelStr] = zoneSpec.split('.')
        zonePageIndex = parseInt(zonePageStr, 10)
        zoneLabel = zoneLabelStr
      }
      
      // Check if we can optimize the update
      if (this.currentManifestId === manifestId && this.viewer) {
        // Same manifest, viewer exists
        if (this.currentPageSpec === pageSpec) {
          // Same page spread, just update zone highlight and/or filters
          if (zoneLabel) {
            this.updateActiveZone(zoneLabel, zonePageIndex)
          }
          // Update zones list if filter changed
          if (this.currentPageIndices && this.currentPageIndices.length > 0) {
            this.setupWritingZones(this.currentPageIndices)
          }
        } else {
          // Different page, same manifest - swap pages without recreating viewer
          this.currentPageSpec = pageSpec
          this.currentZoneLabel = zoneLabel
          this.currentZonePageIndex = zonePageIndex
          this.switchPages(pageSpec, zoneLabel, zonePageIndex)
        }
      } else {
        // Different manifest or no viewer yet - full reload
        if (this.viewer && this.currentManifestId !== manifestId) {
          this.cleanupViewer()
        }
        this.loadManifestAndRender(manifestId, pageSpec, zoneLabel, zonePageIndex)
      }
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
   * Load edition data and render pages
   * @param {string} manifestId - Manifest identifier (e.g., 'NK')
   * @param {string} pageSpec - Page specification (e.g., '2' or '2-3'), defaults to first page
   * @param {string} zoneLabel - Writing zone label (e.g., '5'), optional
   * @param {number} zonePageIndex - Page index for the zone (1-based), optional
   */
  async loadManifestAndRender(manifestId, pageSpec = null, zoneLabel = null, zonePageIndex = null) {
    // Map manifest IDs to edition data URLs
    const editionUrls = {
      'NK': '/temp/edition.json'
    }

    const editionUrl = editionUrls[manifestId]
    if (!editionUrl) {
      this.renderNotFound(`/facs/${manifestId}/`)
      return
    }

    try {
      // Show loading state
      this.contentEl.setContent(templates.loading('Loading edition data...'))

      // Fetch edition data
      const response = await fetch(editionUrl)
      if (!response.ok) throw new Error(`Failed to load edition data: ${response.status}`)

      const editionData = await response.json()
      
      // Extract the actual data (skip HTTP headers at indices 0-3, data is in array at index 4)
      // The structure is: [header, header, header, header, [actualData]]
      const dataArray = editionData.find(item => Array.isArray(item) && item.length > 0)
      if (!dataArray) throw new Error('Invalid edition data structure')
      
      const sourceData = dataArray[0]
      this.currentEdition = sourceData
      this.currentPages = sourceData.source.pages
      this.currentManifestId = manifestId
      this.currentPageSpec = pageSpec
      this.currentZoneLabel = zoneLabel
      this.currentZonePageIndex = zonePageIndex
      
      // Build lookup map: genDescId → {pageIndex, label}
      this.buildZoneLookupMap()

      // Parse page specification
      const pages = this.parsePageSpec(pageSpec)

      // Render viewer with pages
      this.renderViewer(pages)
      
      // Setup previews immediately after rendering (independent of OSD viewer)
      setTimeout(() => {
        const currentPageIndices = pages.map(p => this.currentPages.indexOf(p) + 1)
        this.setupPagePreviews(currentPageIndices)
      }, 100)

    } catch (error) {
      console.error('Error loading edition data:', error)
      this.contentEl.setContent(
        templates.error(
          'Error Loading Edition Data',
          `Could not load edition data: ${error.message}`,
          `${this.basePath}/`
        )
      )
    }
  }

  /**
   * Build lookup map for genDescId to zone location
   */
  buildZoneLookupMap() {
    this.zoneLookup = new Map()
    
    if (!this.currentPages) return
    
    this.currentPages.forEach((page, pageIdx) => {
      const pageIndex = pageIdx + 1
      if (page.writingZones) {
        page.writingZones.forEach(zone => {
          if (zone.identifier && zone.identifier.genDescId) {
            this.zoneLookup.set(zone.identifier.genDescId, {
              pageIndex,
              label: zone.label
            })
          }
        })
      }
    })
  }

  /**
   * Get the page spec (single or double page) for a given page index
   * Page 1 is alone, then pairs: 2-3, 4-5, 6-7, etc.
   * @param {number} pageIndex - 1-based page index
   * @returns {string} Page spec like '1', '2-3', '4-5'
   */
  getPageSpec(pageIndex) {
    if (pageIndex === 1) {
      return '1'
    }
    
    // For pages 2+, calculate the pair
    // Page 2 pairs with 3, page 4 with 5, etc.
    const isEven = pageIndex % 2 === 0
    if (isEven) {
      return `${pageIndex}-${pageIndex + 1}`
    } else {
      return `${pageIndex - 1}-${pageIndex}`
    }
  }

  /**
   * Parse page specification and return page objects
   * @param {string|null} pageSpec - Page specification ('2' or '2-3')
   * @returns {Array} Array of page objects from edition data
   */
  parsePageSpec(pageSpec) {
    if (!this.currentPages) return []

    if (!pageSpec) {
      // Default to first page
      return [this.currentPages[0]]
    }

    if (pageSpec.includes('-')) {
      // Double page view: '2-3'
      const [left, right] = pageSpec.split('-').map(n => parseInt(n, 10))
      return [
        this.currentPages[left - 1],
        this.currentPages[right - 1]
      ].filter(p => p) // Filter out undefined
    } else {
      // Single page view: '2'
      const pageNum = parseInt(pageSpec, 10)
      return [this.currentPages[pageNum - 1]].filter(p => p)
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
      script.src = '/vide-component-facsimile/dist/vendor/openseadragon/openseadragon.min.js'
      script.onload = () => this.createViewer()
      document.head.appendChild(script)
    } else {
      this.createViewer()
    }
  }

  /**
   * Calculate clip rectangle to hide center margins using setClip
   * The clip rect needs to be in IMAGE PIXEL coordinates
   * @param {Object} page - Page object from edition.json
   * @param {boolean} hideCenter - Whether to hide center margins
   * @returns {Object} OpenSeadragon.Rect for clipping in pixel coordinates
   */
  calculateClipRect(page, hideCenter = false, tiledImage, viewer) {
    const { px, position } = page
    const { xywh, width: pxWidth, height: pxHeight } = px
    const isVerso = position.includes('verso')
    
    if (!hideCenter) {
      // No clipping - return null
      return null
    }
    
    // Clip to hide center margins only
    // Since recto pages are rendered on top of verso pages, we only need to clip recto
    // The verso center margin will be naturally hidden by the overlapping recto page
    
    if (isVerso) {
      // Verso: no clipping needed, center margin hidden by recto overlay
      return null
    }
    
    // Recto: clip the left/center margin, keep page content and right margin
    // In image pixel space:
    // - xywh.x is where page content starts (= world x=0)
    // - Keep everything from xywh.x to the right edge of the image
    const clipX = xywh.x
    const clipY = 0
    const clipW = pxWidth - xywh.x
    const clipH = pxHeight
    
    return new OpenSeadragon.Rect(clipX, clipY, clipW, clipH)
  }

  /**
   * Calculate positioning for a page in mm coordinate space
   * @param {Object} page - Page object from edition.json
   * @returns {Object} Object with tileSource, x, y, width, degrees for OSD addTiledImage
   */
  calculatePagePosition(page) {
    // Extract data from page
    const { target, px, mm, position } = page
    const { xywh, rotation, width: pxWidth, height: pxHeight } = px
    const { width: mmWidth, height: mmHeight } = mm
    
    // Determine if this is a verso (left) or recto (right) page
    const isVerso = position.includes('verso')
    
    // Calculate scale factor from pixels to millimeters
    // The mm dimensions refer to the page content (after rotation, inside xywh)
    // We need to figure out the mm dimensions of the full image
    const pageWidthPx = xywh.w
    const pageHeightPx = xywh.h
    
    // Scale factor: mm per pixel (using the page dimensions as reference)
    const mmPerPx = mmWidth / pageWidthPx
    
    // Full image dimensions in mm
    const fullImageWidthMm = pxWidth * mmPerPx
    const fullImageHeightMm = pxHeight * mmPerPx
    
    // Center of xywh rect in pixels (relative to full image)
    const xywhCenterPxX = xywh.x + xywh.w / 2
    const xywhCenterPxY = xywh.y + xywh.h / 2
    
    // Center of xywh rect in mm (relative to full image origin)
    const xywhCenterMmX = xywhCenterPxX * mmPerPx
    const xywhCenterMmY = xywhCenterPxY * mmPerPx
    
    // The page content (mm dimensions) is centered within the xywh rect after rotation
    // Position the page so its inner edge aligns at x=0
    let pageTargetX
    if (isVerso) {
      // Verso page: right edge at x=0, so position at negative x
      pageTargetX = -mmWidth
    } else {
      // Recto page: left edge at x=0
      pageTargetX = 0
    }
    
    // Page top edge at y=0
    const pageTargetY = 0
    
    // The page center in our target coordinate space
    const pageCenterX = pageTargetX + mmWidth / 2
    const pageCenterY = pageTargetY + mmHeight / 2
    
    // Now work backwards: the xywh center is where the page center is
    // (since page is centered in xywh rect after rotation)
    // The full image's origin needs to be positioned such that its xywh center
    // ends up at pageCenterX, pageCenterY
    
    const imageX = pageCenterX - xywhCenterMmX
    const imageY = pageCenterY - xywhCenterMmY
    
    // Build IIIF image URL
    const baseUrl = target.replace(/\.(jpg|tif|tiff)$/i, '')
    const tileSource = baseUrl + '/info.json'
    
    return {
      tileSource,
      x: imageX,
      y: imageY,
      width: fullImageWidthMm,
      degrees: -rotation // Negate rotation to match coordinate system
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

    if (pages.length === 0) {
      console.warn('No pages to display')
      return
    }

    // Store page info for navigation
    const totalPages = this.currentPages.length

    // Determine current page(s) from pages array
    const currentPageIndices = pages.map(p =>
      this.currentPages.indexOf(p) + 1
    )

    // Calculate total bounds for our coordinate space
    // We need to know the extent of all pages to set up the world properly
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    
    pages.forEach(page => {
      const config = this.calculatePagePosition(page)
      // Image bounds in our coordinate space
      const imgMinX = config.x
      const imgMaxX = config.x + config.width
      const imgMinY = config.y
      const imgMaxY = config.y + (config.width * (page.px.height / page.px.width)) // maintain aspect ratio
      
      minX = Math.min(minX, imgMinX)
      maxX = Math.max(maxX, imgMaxX)
      minY = Math.min(minY, imgMinY)
      maxY = Math.max(maxY, imgMaxY)
    })
    
    // Add some padding
    const padding = 50 // 50mm padding
    minX -= padding
    maxX += padding
    minY -= padding
    maxY += padding

    // Store bounds for later use
    const worldBounds = new OpenSeadragon.Rect(minX, minY, maxX - minX, maxY - minY)
    
    // Initialize viewer with empty world (we'll add images programmatically)
    this.viewer = OpenSeadragon({
      id: 'openseadragon-viewer',
      prefixUrl: '/vide-component-facsimile/dist/vendor/openseadragon/images/',
      showNavigationControl: false,
      showFullPageControl: false,
      sequenceMode: false,
      // Use our mm coordinate space
      homeFillsViewer: false,
      visibilityRatio: 0.1,
      constrainDuringPan: false,
      showRotationControl: true,
      gestureSettingsTouch: {
        pinchRotate: true
      },
      // Increase timeouts and be more patient with loading
      timeout: 120000, // 2 minutes
      // Load more tiles at once
      immediateRender: false,
      maxImageCacheCount: 200,
      // Be more aggressive about loading
      preload: true,
      // OSD v5 specific: reduce assertion strictness during navigation
      debugMode: false,
      // Silently ignore getTileAtPoint errors during navigation
      silenceMultiImageWarnings: true
    })

    // Store pages and world bounds for later use (e.g., toggling margins)
    this.currentlyDisplayedPages = pages
    this.currentWorldBounds = worldBounds

    // Add each page with calculated positioning
    pages.forEach((page, index) => {
      const pageConfig = this.calculatePagePosition(page)
      
      this.viewer.addTiledImage({
        tileSource: pageConfig.tileSource,
        x: pageConfig.x,
        y: pageConfig.y,
        width: pageConfig.width,
        degrees: pageConfig.degrees,
        success: (event) => {
          console.log(`Page ${index + 1} loaded successfully`)
          
          // After all pages are loaded, fit viewport to show both pages
          if (index === pages.length - 1) {
            // Fit to our calculated world bounds
            this.viewer.viewport.fitBounds(worldBounds, true)
            
            // Calculate appropriate zoom constraints based on world size
            // Min zoom: fit entire world with padding
            const minZoom = this.viewer.viewport.getZoom() * 0.5
            // Max zoom: allow zooming in to ~1:1 pixel ratio (1mm = multiple screen pixels)
            const maxZoom = this.viewer.viewport.getZoom() * 20
            
            this.viewer.viewport.minZoomLevel = minZoom
            this.viewer.viewport.maxZoomLevel = maxZoom
            
            // Re-fit after setting constraints
            this.viewer.viewport.fitBounds(worldBounds, true)
          }
        },
        error: (event) => {
          console.error(`Error loading page ${index + 1}:`, event)
        }
      })
    })

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

    // Setup writing zones list
    this.setupWritingZones(currentPageIndices)
  }

  /**
   * Switch to different pages without recreating the viewer
   * @param {string} pageSpec - Page specification ('2' or '2-3')
   * @param {string|null} zoneLabel - Zone label to highlight
   * @param {number|null} zonePageIndex - Page index for the zone
   */
  switchPages(pageSpec, zoneLabel = null, zonePageIndex = null) {
    if (!this.viewer || !this.currentPages) return

    // Parse new pages
    const pages = this.parsePageSpec(pageSpec)
    if (pages.length === 0) return

    const currentPageIndices = pages.map(p => this.currentPages.indexOf(p) + 1)
    const totalPages = this.currentPages.length

    // Remove all existing tiled images
    while (this.viewer.world.getItemCount() > 0) {
      this.viewer.world.removeItem(this.viewer.world.getItemAt(0))
    }

    // Calculate world bounds for new pages
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    
    pages.forEach(page => {
      const config = this.calculatePagePosition(page)
      const imgMinX = config.x
      const imgMaxX = config.x + config.width
      const imgMinY = config.y
      const imgMaxY = config.y + (config.width * (page.px.height / page.px.width))
      
      minX = Math.min(minX, imgMinX)
      maxX = Math.max(maxX, imgMaxX)
      minY = Math.min(minY, imgMinY)
      maxY = Math.max(maxY, imgMaxY)
    })
    
    const padding = 50
    minX -= padding
    maxX += padding
    minY -= padding
    maxY += padding

    const worldBounds = new OpenSeadragon.Rect(minX, minY, maxX - minX, maxY - minY)
    this.currentWorldBounds = worldBounds
    this.currentlyDisplayedPages = pages

    // Add new pages
    pages.forEach((page, index) => {
      const pageConfig = this.calculatePagePosition(page)
      
      this.viewer.addTiledImage({
        tileSource: pageConfig.tileSource,
        x: pageConfig.x,
        y: pageConfig.y,
        width: pageConfig.width,
        degrees: pageConfig.degrees,
        success: (event) => {
          // After last page is loaded, fit viewport
          if (index === pages.length - 1) {
            this.viewer.viewport.fitBounds(worldBounds, true)
            
            const minZoom = this.viewer.viewport.getZoom() * 0.5
            const maxZoom = this.viewer.viewport.getZoom() * 20
            
            this.viewer.viewport.minZoomLevel = minZoom
            this.viewer.viewport.maxZoomLevel = maxZoom
            
            this.viewer.viewport.fitBounds(worldBounds, true)
          }
        },
        error: (event) => {
          console.error(`Error loading page ${index + 1}:`, event)
        }
      })
    })

    // Update stored indices
    this.currentPageIndices = currentPageIndices

    // Update UI components
    this.setupPageNavigation(currentPageIndices, totalPages)
    this.setupPagePreviews(currentPageIndices)
    this.setupWritingZones(currentPageIndices)

    // Update active zone if provided
    if (zoneLabel && zonePageIndex) {
      this.updateActiveZone(zoneLabel, zonePageIndex)
    }
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
    const filterSpec = this.getFilterSpec()

    if (prevPageSpec) {
      prevBtn.disabled = false
      prevBtn.onclick = () => {
        let path = `${this.basePath}/${manifestId}/p${prevPageSpec}/`
        if (filterSpec) {
          path += `filter:${filterSpec}/`
        }
        this.navigate(path)
      }
    } else {
      prevBtn.disabled = true
    }

    if (nextPageSpec) {
      nextBtn.disabled = false
      nextBtn.onclick = () => {
        let path = `${this.basePath}/${manifestId}/p${nextPageSpec}/`
        if (filterSpec) {
          path += `filter:${filterSpec}/`
        }
        this.navigate(path)
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
   * Get IIIF thumbnail URL for a page from edition data
   * @param {Object} page - Page object from edition.json
   * @returns {string} IIIF image URL for thumbnail
   */
  getIIIFThumbnail(page) {
    // Extract base URL from target (remove file extension)
    const baseUrl = page.target.replace(/\.(jpg|tif|tiff)$/i, '')
    
    // Get xywh region from px data
    const { x, y, w, h } = page.px.xywh
    const region = `${x},${y},${w},${h}`
    
    // Return IIIF thumbnail URL with region
    return `${baseUrl}/${region}/,90/0/default.jpg`
  }

  /**
   * Setup page preview panel with thumbnails
   * @param {Array} currentPages - Array of current page numbers
   */
  setupPagePreviews(currentPages = [1]) {
    const container = document.getElementById('page-preview-container')
    const panel = document.getElementById('page-preview-panel')
    const toggleBtn = document.getElementById('toggle-preview')

    if (!container || !this.currentPages) return

    const pages = this.currentPages
    const manifestId = this.getCurrentManifestId()
    const sourceLabel = this.currentEdition?.source?.label || ''

    // Clear existing thumbnails
    container.innerHTML = ''

    // Generate thumbnail groups: first page alone, then pairs
    let i = 0
    while (i < pages.length) {
      const groupDiv = document.createElement('div')
      groupDiv.classList.add('page-thumbnail-group')

      if (i === 0) {
        // First page alone
        const pageNum = 1
        const isActive = currentPages.includes(1)
        const thumbnail = this.getIIIFThumbnail(pages[0])

        const img = document.createElement('img')
        img.src = thumbnail
        img.alt = `Seite ${pageNum}`
        img.crossOrigin = 'anonymous'

        const label = document.createElement('div')
        label.className = 'page-label'
        label.textContent = sourceLabel ? `${sourceLabel} 1` : '1'

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
          this.navigate(`${this.basePath}/${manifestId}/p1/`)
        })

        i++
      } else {
        // Pair of pages (verso + recto)
        const leftPage = i + 1
        const rightPage = i + 2
        const isActive = currentPages.includes(leftPage) || (pages[i + 1] && currentPages.includes(rightPage))

        if (pages[i]) {
          const leftThumb = this.getIIIFThumbnail(pages[i])
          const leftImg = document.createElement('img')
          leftImg.src = leftThumb
          leftImg.alt = `Seite ${leftPage}`
          leftImg.crossOrigin = 'anonymous'
          groupDiv.appendChild(leftImg)
        }

        if (pages[i + 1]) {
          const rightThumb = this.getIIIFThumbnail(pages[i + 1])
          const rightImg = document.createElement('img')
          rightImg.src = rightThumb
          rightImg.alt = `Seite ${rightPage}`
          rightImg.crossOrigin = 'anonymous'
          groupDiv.appendChild(rightImg)
        }

        const label = document.createElement('div')
        label.className = 'page-label'
        if (pages[i + 1]) {
          const labelText = sourceLabel ? `${sourceLabel} ${leftPage}-${rightPage}` : `${leftPage}-${rightPage}`
          label.textContent = labelText
          groupDiv.dataset.pages = `${leftPage}-${rightPage}`
          groupDiv.dataset.pageCount = 'double'
        } else {
          const labelText = sourceLabel ? `${sourceLabel} ${leftPage}` : `${leftPage}`
          label.textContent = labelText
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
          this.navigate(`${this.basePath}/${manifestId}/p${pageSpec}/`)
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
    
    // Setup filter event listeners
    this.setupFilters()
  }

  /**
   * Setup filter controls and state
   */
  setupFilters() {
    const restrictCheckbox = document.getElementById('restrict-to-current-page')
    if (restrictCheckbox) {
      // Initialize state from URL or default
      if (this.restrictToCurrentPage !== undefined) {
        restrictCheckbox.checked = this.restrictToCurrentPage
      } else {
        this.restrictToCurrentPage = restrictCheckbox.checked
      }
      
      // Listen for changes
      restrictCheckbox.addEventListener('change', () => {
        this.restrictToCurrentPage = restrictCheckbox.checked
        // Update URL to reflect filter change
        this.updateUrlWithFilters()
        // Refresh zones list
        if (this.currentPageIndices && this.currentPageIndices.length > 0) {
          this.setupWritingZones(this.currentPageIndices)
        }
        // Update writingZones breadcrumb links
        this.updateWritingZoneLinks()
      })
    }
  }

  /**
   * Apply filter settings from URL filter spec
   * @param {string} filterSpec - Filter specification (e.g., "allPages")
   */
  applyFiltersFromUrl(filterSpec) {
    const filters = filterSpec.split(',')
    
    if (filters.includes('allPages')) {
      this.restrictToCurrentPage = false
    } else {
      this.restrictToCurrentPage = true
    }
  }

  /**
   * Get current filter spec for URL
   * @returns {string|null} Filter spec or null if using defaults
   */
  getFilterSpec() {
    const filters = []
    
    if (!this.restrictToCurrentPage) {
      filters.push('allPages')
    }
    
    return filters.length > 0 ? filters.join(',') : null
  }

  /**
   * Update URL to reflect current filter settings
   */
  updateUrlWithFilters() {
    if (!this.currentManifestId || !this.currentPageSpec) return
    
    const manifestId = this.currentManifestId
    const pageSpec = this.currentPageSpec
    const filterSpec = this.getFilterSpec()
    const zoneSpec = this.currentZoneLabel && this.currentZonePageIndex ? 
      `wz${this.currentZonePageIndex}.${this.currentZoneLabel}` : null
    
    // Build URL path
    let path = `/${manifestId}/p${pageSpec}/`
    if (filterSpec) {
      path += `filter:${filterSpec}/`
    }
    if (zoneSpec) {
      path += `${zoneSpec}/`
    }
    
    this.navigate(path)
  }

  /**
   * Update all writingZones breadcrumb links to reflect current filter settings
   */
  updateWritingZoneLinks() {
    const wzLinks = document.querySelectorAll('.wz-link')
    const filterSpec = this.getFilterSpec()
    
    wzLinks.forEach(link => {
      const pageIndex = parseInt(link.dataset.page, 10)
      const label = link.dataset.label
      const pageSpec = this.getPageSpec(pageIndex)
      
      let zonePath = `/${this.currentManifestId}/p${pageSpec}/`
      if (filterSpec) {
        zonePath += `filter:${filterSpec}/`
      }
      zonePath += `wz${pageIndex}.${label}/`
      
      link.href = `${this.basePath}${zonePath}`
    })
  }

  /**
   * Setup writing zones list from current pages
   * @param {Array} currentPageIndices - Array of current page numbers (currently visible)
   */
  setupWritingZones(currentPageIndices = [1]) {
    const zonesList = document.querySelector('.zones-list')
    if (!zonesList || !this.currentPages || !this.currentEdition) return

    const manifestId = this.getCurrentManifestId()
    const sourceLabel = this.currentEdition.source.label

    // Clear existing zones
    zonesList.innerHTML = ''

    // Determine which pages to show zones for
    let pagesToShow = []
    if (this.restrictToCurrentPage) {
      // Show only current page(s)
      pagesToShow = currentPageIndices
    } else {
      // Show all pages (1 to totalPages)
      const totalPages = this.currentPages.length
      pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Group pages into pairs for headings
    // Page 1 is alone, then pairs: 2/3, 4/5, 6/7, etc.
    const pagePairs = []
    if (pagesToShow.length > 0 && pagesToShow.includes(1)) {
      pagePairs.push([1])
    }
    for (let i = pagesToShow[0] === 1 ? 1 : 0; i < pagesToShow.length; i += 2) {
      const pageNum = pagesToShow[i]
      if (pageNum === 1) continue // Already handled
      
      const pair = [pageNum]
      if (i + 1 < pagesToShow.length) {
        pair.push(pagesToShow[i + 1])
      }
      pagePairs.push(pair)
    }

    // Render zones for each page pair
    pagePairs.forEach(pair => {
      // Add page pair heading if showing all pages
      if (!this.restrictToCurrentPage) {
        const headingLi = document.createElement('li')
        headingLi.className = 'page-pair-heading'
        const pairLabel = pair.length === 2 ? 
          `Seite ${pair[0]} / ${pair[1]}` : 
          `Seite ${pair[0]}`
        headingLi.textContent = pairLabel
        zonesList.appendChild(headingLi)
      }

      // Render zones for each page in the pair
      pair.forEach(pageIndex => {
        const page = this.currentPages[pageIndex - 1]
        if (!page || !page.writingZones) return

        // Sort zones by label (numeric sort)
        const sortedZones = [...page.writingZones].sort((a, b) => {
          const aNum = parseInt(a.label) || 0
          const bNum = parseInt(b.label) || 0
          return aNum - bNum
        })

        sortedZones.forEach(zone => {
          const li = document.createElement('li')
          li.className = 'zone-item'
          
          // Check if this zone is on a currently visible page
          const isOnCurrentPage = currentPageIndices.includes(pageIndex)
          if (!isOnCurrentPage) {
            li.classList.add('other-page')
          }
          
          // Label format: "NK 1/5" (source label, page number, zone label)
          const zoneFullLabel = `${sourceLabel} ${pageIndex}/${zone.label}`
          
          // Create preview container showing the page spread for this zone
          const previewContainer = document.createElement('span')
          previewContainer.className = 'previewContainer'
          
          // Calculate dimensions for double-page spread preview
          const frameHeight = 1 // rem
          
          // Determine which pages to show in preview (the pair containing this zone)
          let previewPageIndices
          if (this.restrictToCurrentPage) {
            // Show current spread
            previewPageIndices = currentPageIndices
          } else {
            // Show the spread containing this zone
            // Page 1 alone, then pairs: 2/3, 4/5, 6/7, etc.
            if (pageIndex === 1) {
              previewPageIndices = [1]
            } else {
              // For pages 2+, pair as: 2/3, 4/5, 6/7, etc.
              const pairStart = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1
              previewPageIndices = [pairStart]
              if (pairStart + 1 <= this.currentPages.length) {
                previewPageIndices.push(pairStart + 1)
              }
            }
          }
          
          // Create frame for each page in the preview
          previewPageIndices.forEach(previewPageIndex => {
            const previewPage = this.currentPages[previewPageIndex - 1]
            if (!previewPage) return
            
            const pageFrame = document.createElement('span')
            pageFrame.className = 'previewFrame'
            
            // Calculate aspect ratio for this page
            const pageAspectRatio = previewPage.mm.width / previewPage.mm.height
            const frameWidth = frameHeight * pageAspectRatio
            pageFrame.style.width = `${frameWidth}rem`
            pageFrame.style.height = `${frameHeight}rem`
            
            // Only show the zone on the page where it actually is
            if (previewPageIndex === pageIndex) {
              const actualPreview = document.createElement('span')
              actualPreview.className = isOnCurrentPage ? 'actualPreview' : 'actualPreview grey'
              
              // Check if zone has position data
              if (!zone.wzProps || !zone.wzProps.pos) {
                console.warn(`Zone ${zone.identifier?.zoneId} on page ${pageIndex} has no position data`)
                return // Skip this zone preview if no position data
              }
              
              // Calculate zone position as percentage of page dimensions
              // Zone coordinates are in pixels, relative to page.px.xywh content area
              // Validate page dimensions to avoid division by tiny or zero values
              if (page.px.xywh.h < 100 || page.px.xywh.w < 100) {
                console.warn(`Invalid page dimensions for page ${pageIndex}:`, page.px.xywh)
                return // Skip this zone preview if data is invalid
              }
              
              const zoneTop = (zone.wzProps.pos.y / page.px.xywh.h) * 100
              const zoneLeft = (zone.wzProps.pos.x / page.px.xywh.w) * 100
              const zoneWidth = (zone.wzProps.pos.w / page.px.xywh.w) * 100
              const zoneHeight = (zone.wzProps.pos.h / page.px.xywh.h) * 100
              
              // Validate percentages are within reasonable bounds
              if (zoneTop > 100 || zoneLeft > 100 || zoneWidth > 100 || zoneHeight > 100 ||
                  zoneTop < 0 || zoneLeft < 0 || zoneWidth < 0 || zoneHeight < 0) {
                console.warn(`Invalid zone percentages for zone ${zone.identifier.zoneId} on page ${pageIndex}:`, {
                  zoneTop, zoneLeft, zoneWidth, zoneHeight,
                  zonePos: zone.wzProps.pos,
                  pageXywh: page.px.xywh
                })
                return // Skip this zone preview if calculations are invalid
              }
              
              actualPreview.style.top = `${zoneTop}%`
              actualPreview.style.left = `${zoneLeft}%`
              actualPreview.style.width = `${zoneWidth}%`
              actualPreview.style.height = `${zoneHeight}%`
              
              pageFrame.appendChild(actualPreview)
            }
            
            
            previewContainer.appendChild(pageFrame)
          })
          
          // Add label text
          const labelSpan = document.createElement('span')
          labelSpan.className = 'zone-label-text'
          labelSpan.textContent = zoneFullLabel
          
          li.appendChild(labelSpan)
          li.appendChild(previewContainer)
          
          li.dataset.zone = zone.identifier.zoneId
          li.dataset.zoneLabel = zone.label
          li.dataset.pageIndex = pageIndex

          // Mark as active if this is the current zone (match both page and label)
          if (this.currentZoneLabel === zone.label && this.currentZonePageIndex === pageIndex) {
            li.classList.add('active')
          }

          // Click handler - navigate to zone
          li.addEventListener('click', () => {
            // Determine the appropriate page spread for this zone
            let targetPageSpec
            if (isOnCurrentPage) {
              // Zone is on current page, keep current spread
              targetPageSpec = currentPageIndices.length === 2 ? 
                `${currentPageIndices[0]}-${currentPageIndices[1]}` : 
                `${pageIndex}`
            } else {
              // Zone is on different page, navigate to that page's spread
              // Page 1 alone, then pairs: 2/3, 4/5, etc.
              if (pageIndex === 1) {
                targetPageSpec = '1'
              } else {
                const pairStart = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1
                if (pairStart + 1 <= this.currentPages.length) {
                  targetPageSpec = `${pairStart}-${pairStart + 1}`
                } else {
                  targetPageSpec = `${pairStart}`
                }
              }
            }
            
            // Build path with filters
            const filterSpec = this.getFilterSpec()
            let path = `${this.basePath}/${manifestId}/p${targetPageSpec}/`
            if (filterSpec) {
              path += `filter:${filterSpec}/`
            }
            path += `wz${pageIndex}.${zone.label}/`
            
            this.navigate(path)
          })

          // Hover handlers
          li.addEventListener('mouseenter', () => {
            // TODO: Highlight zone in viewer
            li.classList.add('hover')
          })

          li.addEventListener('mouseleave', () => {
            li.classList.remove('hover')
          })

          zonesList.appendChild(li)
          
          // If this is the active zone, add metadata right after it
          if (this.currentZoneLabel === zone.label && this.currentZonePageIndex === pageIndex) {
            const metadataLi = this.createZoneMetadata(zone)
            zonesList.appendChild(metadataLi)
            
            // Scroll the active zone into view
            setTimeout(() => {
              li.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }, 100)
          }
        })
      })
    })
    
    // Setup keyboard navigation
    this.setupZoneKeyboardNavigation()
  }

  /**
   * Update active zone without reloading the viewer
   * @param {string} zoneLabel - Writing zone label
   * @param {number} zonePageIndex - Page index for the zone (1-based)
   */
  updateActiveZone(zoneLabel, zonePageIndex) {
    // Update stored zone info
    this.currentZoneLabel = zoneLabel
    this.currentZonePageIndex = zonePageIndex
    
    // Rebuild zones list to move metadata to new active zone
    const currentPageIndices = this.currentPageIndices || []
    if (currentPageIndices.length > 0) {
      this.setupWritingZones(currentPageIndices)
    }
  }

  /**
   * Create metadata display element for a zone
   * @param {Object} zone - The zone object
   * @returns {HTMLElement} List item containing metadata
   */
  createZoneMetadata(zone) {
    const li = document.createElement('li')
    li.className = 'zone-metadata'

    // Build metadata HTML
    let html = '<div class="metadata-content">'

    // Sketch properties section
    html += '<div class="metadata-section sketch-properties">'
    html += '<div class="metadata-section-title">Skizze:</div>'
    
    if (zone.sketchProps) {
      const props = zone.sketchProps
      
      html += '<div class="metadata-section-content">'
      // Staves and measures
      html += '<div class="metadata-row">'
      if (props.staves) {
        const stavesLabel = props.staves === 1 ? 'System' : 'Systeme'
        html += `<span class="metadata-item"><strong>${props.staves}</strong> ${stavesLabel}</span>`
      }
      if (props.atMeasures) {
        const measuresLabel = props.atMeasures === 1 ? 'Takt' : 'Takte'
        html += `<span class="metadata-item">~<strong>${props.atMeasures}</strong> ${measuresLabel}</span>`
      }
      html += '</div>'

      // Key, meter, and tempo signatures
      html += '<div class="metadata-row">'
      if (props.keySig && props.keySig.val) {
        const keySupplied = props.keySig.supplied ? ' <span class="supplied-indicator" title="editorisch ergänzt">*</span>' : ''
        html += `<span class="metadata-item">Vorzeichnung: <strong>${this.formatKeySig(props.keySig.val)}</strong>${keySupplied}</span>`
      }
      if (props.meterSig && props.meterSig.val) {
        const meterSupplied = props.meterSig.supplied ? ' <span class="supplied-indicator" title="editorisch ergänzt">*</span>' : ''
        html += `<span class="metadata-item">Taktart: <strong>${props.meterSig.val}</strong>${meterSupplied}</span>`
      }
      if (props.tempo) {
        if (props.tempo.val) {
          const tempoSupplied = props.tempo.supplied ? ' <span class="supplied-indicator" title="editorisch ergänzt">*</span>' : ''
          html += `<span class="metadata-item">Tempo: <strong>${props.tempo.val}</strong>${tempoSupplied}</span>`
        } else {
          html += `<span class="metadata-item">Tempo: <strong>–</strong></span>`
        }
      }
      html += '</div>'
      
      // Writing zones sequence (if present)
      if (props.writingZones) {
        const wzSequence = Array.isArray(props.writingZones) ? props.writingZones : [props.writingZones]
        const currentGenDescId = zone.identifier?.genDescId
        
        html += '<div class="metadata-row wz-sequence">'
        html += '<span class="metadata-item">Schreibzone: '
        
        wzSequence.forEach((genDescId, idx) => {
          if (idx > 0) html += ' → '
          
          const zoneLoc = this.zoneLookup?.get(genDescId)
          if (zoneLoc) {
            const isActive = genDescId === currentGenDescId
            const sourceLabel = this.currentEdition?.source?.label || ''
            const zoneFullLabel = `${sourceLabel} ${zoneLoc.pageIndex}/${zoneLoc.label}`
            
            if (isActive) {
              html += `<strong class="active-wz">${zoneFullLabel}</strong>`
            } else {
              // Build link with current filter settings and proper page spec
              const filterSpec = this.getFilterSpec()
              const pageSpec = this.getPageSpec(zoneLoc.pageIndex)
              let zonePath = `/${this.currentManifestId}/p${pageSpec}/`
              if (filterSpec) {
                zonePath += `filter:${filterSpec}/`
              }
              zonePath += `wz${zoneLoc.pageIndex}.${zoneLoc.label}/`
              html += `<a href="${this.basePath}${zonePath}" class="wz-link" data-page="${zoneLoc.pageIndex}" data-label="${zoneLoc.label}">${zoneFullLabel}</a>`
            }
          } else {
            // genDescId not found in lookup
            html += `<span class="wz-unknown">${genDescId.substring(0, 8)}...</span>`
          }
        })
        
        html += '</span>'
        html += '</div>'
      }
      
      html += '</div>'
    } else {
      html += '<div class="no-sketch-props">–</div>'
    }
    html += '</div>'

    // Writing zone properties section
    html += '<div class="metadata-section wz-properties">'
    html += '<div class="metadata-section-title">Schreibzone:</div>'
    
    if (zone.wzProps) {
      const wzProps = zone.wzProps
      html += '<div class="metadata-section-content">'
      html += '<div class="metadata-row">'
      
      if (wzProps.staves) {
        html += `<span class="metadata-item"><span class="metadata-label">Zeile:</span> <strong>${wzProps.staves}</strong></span>`
      }
      
      // Layers count
      if (wzProps.layers && wzProps.layers.length > 0) {
        const layerLabel = wzProps.layers.length === 1 ? 'Schreibschicht' : 'Schreibschichten'
        html += `<span class="metadata-item"><span class="metadata-label">${layerLabel}:</span> <strong>${wzProps.layers.length}</strong></span>`
      }
      
      // Boolean properties - only show if true
      if (wzProps.metaNavigation) {
        html += `<span class="metadata-item"><span class="metadata-label">Verweiszeichen:</span> <strong>✓</strong></span>`
      }
      if (wzProps.metaClarification) {
        html += `<span class="metadata-item"><span class="metadata-label">Erläuterungen:</span> <strong>✓</strong></span>`
      }
      if (wzProps.otherMeta) {
        html += `<span class="metadata-item"><span class="metadata-label">Sonstige Metatexte:</span> <strong>✓</strong></span>`
      }
      
      html += '</div>'
      html += '</div>'
    } else {
      html += '<div class="no-wz-props">–</div>'
    }
    html += '</div>'

    // Work relations section (always show, even if empty)
    html += '<div class="metadata-section work-relations">'
    html += '<div class="metadata-section-title">Mögliche Werkbezüge:</div>'
    html += '<div class="metadata-section-content">'
    
    if (zone.workRelations && zone.workRelations.length > 0) {
      html += '<div class="metadata-section work-relations">'
      html += '<div class="metadata-section-title">Mögliche Werkbezüge:</div>'
      
      // Group all relations by work (opus + work title)
      const groupedRelations = new Map()
      
      zone.workRelations.forEach(relation => {
        const workKey = `${relation.opus || ''}|${relation.work || ''}`
        if (!groupedRelations.has(workKey)) {
          groupedRelations.set(workKey, {
            opus: relation.opus,
            work: relation.work,
            targets: []
          })
        }
        groupedRelations.get(workKey).targets.push({
          relationId: relation.relationId,
          target: relation.target
        })
      })
      
      // Render each work group
      groupedRelations.forEach((group, workKey) => {
        html += `<div class="work-relation-item">`
        
        // Work title
        if (group.opus || group.work) {
          html += `<div class="work-title">`
          if (group.opus) html += `<strong>${group.opus}</strong> `
          if (group.work) html += group.work
          html += `</div>`
        }
        
        // All targets for this work
        group.targets.forEach(({relationId, target}) => {
          if (target) {
            let targetText = ''
            
            // Get movement info from start/end or direct mdivPos
            let movementText = ''
            const mdivPos = target.mdivPos || 
                           (target.start && target.start.mdivPos) ||
                           (target.end && target.end.mdivPos)
            if (mdivPos) {
              movementText = `${mdivPos}. Satz`
            }
            
            // Show movement/section info based on what fields are present
            if (target.start && target.end) {
              // Measure range (has start/end)
              targetText = movementText ? `${movementText}, T. ${target.start.label}–${target.end.label}` : `T. ${target.start.label}–${target.end.label}`
            } else if (target.name === 'measure' && target.label) {
              // Single measure reference
              targetText = movementText ? `${movementText}, T. ${target.label}` : `T. ${target.label}`
            } else if (target.name === 'mdiv') {
              // Movement reference only (no measures)
              if (target.mdivLabel && target.mdivLabel.trim() !== '') {
                targetText = target.mdivLabel
              } else if (target.label) {
                targetText = `${target.label}. Satz`
              }
            } else if (movementText) {
              // Just movement info
              targetText = movementText
            }
            
            if (targetText) {
              html += `<div class="work-target" data-relation-id="${relationId || ''}">${targetText}</div>`
            }
          }
        })
        
        html += '</div>'
      })
    } else {
      // No work relations - show placeholder
      html += '<div class="no-work-relations">–</div>'
    }
    html += '</div>' // Close metadata-section-content
    html += '</div>' // Close metadata-section

    // Add button to open detail view
    if (zone.identifier && zone.identifier.atFilename) {
      html += '<div class="metadata-actions">'
      html += `<button class="open-detail-btn" data-at-filename="${zone.identifier.atFilename}">Zeige Transkriptionen</button>`
      html += '</div>'
    }

    html += '</div>'
    li.innerHTML = html
    
    // Add click handler for detail button
    setTimeout(() => {
      const detailBtn = li.querySelector('.open-detail-btn')
      if (detailBtn) {
        detailBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          const atFilename = detailBtn.dataset.atFilename
          alert(`Öffne ${atFilename}`)
        })
      }
    }, 0)
    
    return li
  }

  /**
   * Setup keyboard navigation for zones list
   */
  setupZoneKeyboardNavigation() {
    // Remove existing listener if any
    if (this.zoneKeyboardHandler) {
      document.removeEventListener('keydown', this.zoneKeyboardHandler)
    }
    
    this.zoneKeyboardHandler = (e) => {
      // Only handle if zones list is visible and not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      const zonesList = document.querySelector('.zones-list')
      if (!zonesList) return
      
      const zoneItems = Array.from(zonesList.querySelectorAll('.zone-item'))
      if (zoneItems.length === 0) return
      
      const activeIndex = zoneItems.findIndex(item => item.classList.contains('active'))
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Move to next zone
        const nextIndex = (activeIndex + 1) % zoneItems.length
        zoneItems[nextIndex].click()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Move to previous zone
        const prevIndex = activeIndex <= 0 ? zoneItems.length - 1 : activeIndex - 1
        zoneItems[prevIndex].click()
      }
    }
    
    document.addEventListener('keydown', this.zoneKeyboardHandler)
  }

  /**
   * Format key signature value for display
   * @param {string} keySig - Key signature (e.g., '3f', '2s', '0')
   * @returns {string} Formatted key signature
   */
  formatKeySig(keySig) {
    if (keySig === '0') return '0'
    const match = keySig.match(/^(\d+)([fs])$/)
    if (!match) return keySig
    const count = match[1]
    const type = match[2] === 'f' ? '♭' : '♯'
    return `${count}${type}`
  }

  /**
   * Populate the notebook modal with actual page data
   */
  populateNotebookModal() {
    const tbody = document.querySelector('#notebook-modal tbody')
    if (!tbody || !this.currentPages) return

    tbody.innerHTML = ''

    // Track surfaceDoc for color assignment (per page, not per row)
    let colorIndex = 0
    const surfaceDocColors = new Map()
    
    // Helper to get color class for a surfaceDoc
    const getColorClass = (surfaceDoc) => {
      if (!surfaceDoc) return ''
      if (!surfaceDocColors.has(surfaceDoc)) {
        surfaceDocColors.set(surfaceDoc, colorIndex % 8) // 8 colors for higher contrast
        colorIndex++
      }
      return `surface-group-${surfaceDocColors.get(surfaceDoc)}`
    }

    let i = 0
    while (i < this.currentPages.length) {
      const tr = document.createElement('tr')
      const manifestId = this.currentManifestId
      
      if (i === 0) {
        // First page (recto only, right side)
        const page = this.currentPages[0]
        const pageNum = 1
        const colorClass = getColorClass(page.surfaceDoc)
        
        // Empty verso cells
        const emptyPageCell = document.createElement('td')
        emptyPageCell.className = 'cell-page cell-empty'
        tr.appendChild(emptyPageCell)
        
        const emptySourceCell = document.createElement('td')
        emptySourceCell.className = 'cell-source cell-verso cell-empty'
        tr.appendChild(emptySourceCell)
        
        // Recto preview cell
        const rectoPreviewCell = document.createElement('td')
        rectoPreviewCell.className = `cell-source cell-recto cell-preview ${colorClass}`
        const rectoPreview = this.createPagePreview(page, pageNum)
        rectoPreviewCell.appendChild(rectoPreview)
        tr.appendChild(rectoPreviewCell)
        
        // Recto page number cell
        const rectoPageCell = document.createElement('td')
        rectoPageCell.className = `cell-page cell-right ${colorClass}`
        const pageLink = document.createElement('a')
        pageLink.href = `${this.basePath}/${manifestId}/p1/`
        pageLink.className = 'page-link page-number'
        pageLink.textContent = pageNum
        rectoPageCell.appendChild(pageLink)
        tr.appendChild(rectoPageCell)
        
        i++
      } else {
        // Pairs of pages (verso + recto)
        const versoPage = this.currentPages[i]
        const rectoPage = this.currentPages[i + 1]
        const versoPageNum = i + 1
        const rectoPageNum = i + 2
        const versoColorClass = versoPage ? getColorClass(versoPage.surfaceDoc) : ''
        const rectoColorClass = rectoPage ? getColorClass(rectoPage.surfaceDoc) : ''
        
        // Verso page number cell
        const versoPageCell = document.createElement('td')
        versoPageCell.className = `cell-page cell-right ${versoColorClass}`
        if (versoPage) {
          const pageLink = document.createElement('a')
          pageLink.href = `${this.basePath}/${manifestId}/p${versoPageNum}-${rectoPageNum}/`
          pageLink.className = 'page-link page-number'
          pageLink.textContent = versoPageNum
          versoPageCell.appendChild(pageLink)
        }
        tr.appendChild(versoPageCell)
        
        // Verso preview cell
        const versoPreviewCell = document.createElement('td')
        versoPreviewCell.className = `cell-source cell-verso cell-preview ${versoColorClass}`
        if (versoPage) {
          const versoPreview = this.createPagePreview(versoPage, versoPageNum)
          versoPreviewCell.appendChild(versoPreview)
        }
        tr.appendChild(versoPreviewCell)
        
        // Recto preview cell
        const rectoPreviewCell = document.createElement('td')
        rectoPreviewCell.className = `cell-source cell-recto cell-preview ${rectoColorClass}`
        if (rectoPage) {
          const rectoPreview = this.createPagePreview(rectoPage, rectoPageNum)
          rectoPreviewCell.appendChild(rectoPreview)
        }
        tr.appendChild(rectoPreviewCell)
        
        // Recto page number cell
        const rectoPageCell = document.createElement('td')
        rectoPageCell.className = `cell-page cell-right ${rectoColorClass}`
        if (rectoPage) {
          const pageLink = document.createElement('a')
          pageLink.href = `${this.basePath}/${manifestId}/p${versoPageNum}-${rectoPageNum}/`
          pageLink.className = 'page-link page-number'
          pageLink.textContent = rectoPageNum
          rectoPageCell.appendChild(pageLink)
        }
        tr.appendChild(rectoPageCell)
        
        i += 2
      }
      
      tbody.appendChild(tr)
    }
  }

  /**
   * Create a page preview element with thumbnail and label
   * @param {Object} page - Page data
   * @param {number} pageNum - Page number (1-based)
   * @returns {HTMLElement} Preview container
   */
  createPagePreview(page, pageNum) {
    const container = document.createElement('div')
    container.className = 'page-preview-wrapper'
    container.dataset.surfaceDoc = page.surfaceDoc || ''
    
    const thumbnail = this.getIIIFThumbnail(page)
    const img = document.createElement('img')
    img.src = thumbnail
    img.alt = '' // Empty alt for cleaner loading appearance
    img.crossOrigin = 'anonymous'
    img.className = 'page-preview-img'
    
    const label = document.createElement('div')
    label.className = 'page-preview-label'
    const surfaceDoc = page.surfaceDoc || ''
    const surfaceLabel = page.surfaceLabel || ''
    label.textContent = surfaceDoc && surfaceLabel ? `${surfaceDoc}: ${surfaceLabel}` : `Seite ${pageNum}`
    
    container.appendChild(img)
    container.appendChild(label)
    
    return container
  }

  /**
   * Setup zoom controls and modal
   */
  setupZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in')
    const zoomOutBtn = document.getElementById('zoom-out')
    const toggleMarginsBtn = document.getElementById('toggle-margins')
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

    // Toggle margin clipping
    if (toggleMarginsBtn) {
      toggleMarginsBtn.addEventListener('click', () => {
        // Toggle the clipping state
        this.clipMargins = !this.clipMargins
        
        // Update button appearance
        if (this.clipMargins) {
          toggleMarginsBtn.classList.add('active')
        } else {
          toggleMarginsBtn.classList.remove('active')
        }
        
        // Apply clipping to existing TiledImages using setClip
        if (this.viewer && this.currentlyDisplayedPages) {
          const pages = this.currentlyDisplayedPages
          const hideCenter = this.clipMargins
          
          pages.forEach((page, index) => {
            const tiledImage = this.viewer.world.getItemAt(index)
            if (tiledImage) {
              if (hideCenter) {
                // Calculate the clip rect in image pixel coordinates
                const clipRect = this.calculateClipRect(page, true, tiledImage, this.viewer)
                /* const isVerso = page.position.includes('verso')
                console.log(`Page ${index + 1} (${page.position}, isVerso=${isVerso}):`, {
                  clipRect,
                  xywh: page.px.xywh,
                  pxWidth: page.px.width,
                  pxHeight: page.px.height
                }) */
                tiledImage.setClip(clipRect)
              } else {
                // Remove clipping by passing null
                // console.log(`Page ${index + 1} (${page.position}) clipping disabled`)
                tiledImage.setClip(null)
              }
            }
          })
        }
      })
    }

    // Open modal
    if (openModalBtn && modal) {
      openModalBtn.addEventListener('click', () => {
        this.populateNotebookModal()
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
