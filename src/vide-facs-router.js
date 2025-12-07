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
    // /facs/NK/p2/wz2.5/ -> load manifest NK, page 2, highlight zone 5
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
    } else if (segments.length === 2) {
      // /facs/NK/p2/ or /facs/NK/p2-3/
      const manifestId = segments[0]
      const pageSpec = segments[1].startsWith('p') ? segments[1].substring(1) : segments[1]
      // Clean up viewer when changing manifest or page
      if (this.viewer && (this.currentManifestId !== manifestId || this.currentPageSpec !== pageSpec)) {
        this.cleanupViewer()
      }
      this.loadManifestAndRender(manifestId, pageSpec)
    } else if (segments.length === 3) {
      // /facs/NK/p2/wz2.5/ - page with zone
      const manifestId = segments[0]
      const pageSpec = segments[1].startsWith('p') ? segments[1].substring(1) : segments[1]
      const zoneSpec = segments[2].startsWith('wz') ? segments[2].substring(2) : segments[2]
      // Parse zone spec: "9.1" -> page 9, zone label "1"
      const [zonePageStr, zoneLabel] = zoneSpec.split('.')
      const zonePageIndex = parseInt(zonePageStr, 10)
      
      // Check if we're staying on the same page spread - if so, just update the active zone
      if (this.currentManifestId === manifestId && this.currentPageSpec === pageSpec && this.viewer) {
        // Same page spread, just update zone highlight
        console.log('Zone-only navigation - not reloading viewer')
        this.updateActiveZone(zoneLabel, zonePageIndex)
      } else {
        // Different page or no viewer yet, full reload
        console.log('Full reload needed - manifest, page, or viewer changed')
        // Clean up viewer when changing manifest or page
        if (this.viewer) {
          this.cleanupViewer()
        }
        this.loadManifestAndRender(manifestId, pageSpec, zoneLabel, zonePageIndex)
      }
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
        this.navigate(`${this.basePath}/${manifestId}/p${prevPageSpec}/`)
      }
    } else {
      prevBtn.disabled = true
    }

    if (nextPageSpec) {
      nextBtn.disabled = false
      nextBtn.onclick = () => {
        this.navigate(`${this.basePath}/${manifestId}/p${nextPageSpec}/`)
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
  }

  /**
   * Setup writing zones list from current pages
   * @param {Array} currentPageIndices - Array of current page numbers
   */
  setupWritingZones(currentPageIndices = [1]) {
    const zonesList = document.querySelector('.zones-list')
    if (!zonesList || !this.currentPages || !this.currentEdition) return

    const manifestId = this.getCurrentManifestId()
    const sourceLabel = this.currentEdition.source.label

    // Clear existing zones
    zonesList.innerHTML = ''

    // Collect all writing zones from currently displayed pages
    currentPageIndices.forEach(pageIndex => {
      const page = this.currentPages[pageIndex - 1]
      if (!page || !page.writingZones) return

      page.writingZones.forEach(zone => {
        const li = document.createElement('li')
        li.className = 'zone-item'
        
        // Label format: "NK 1/5" (source label, page number, zone label)
        const zoneFullLabel = `${sourceLabel} ${pageIndex}/${zone.label}`
        
        // Create preview container showing both pages side by side
        const previewContainer = document.createElement('span')
        previewContainer.className = 'previewContainer'
        
        // Calculate dimensions for double-page spread preview
        const frameHeight = 1 // rem (reduced from 1.5)
        
        // For each page in the current spread, create a frame
        currentPageIndices.forEach(currentPageIndex => {
          const currentPage = this.currentPages[currentPageIndex - 1]
          if (!currentPage) return
          
          const pageFrame = document.createElement('span')
          pageFrame.className = 'previewFrame'
          
          // Calculate aspect ratio for this page
          const pageAspectRatio = currentPage.mm.width / currentPage.mm.height
          const frameWidth = frameHeight * pageAspectRatio
          pageFrame.style.width = `${frameWidth}rem`
          pageFrame.style.height = `${frameHeight}rem`
          
          // Only show the zone on the page where it actually is
          if (currentPageIndex === pageIndex) {
            const actualPreview = document.createElement('span')
            actualPreview.className = 'actualPreview'
            
            // Calculate zone position as percentage of page dimensions
            // Zone coordinates are in pixels, relative to page.px.xywh content area
            const zoneTop = (zone.pos.y / page.px.xywh.h) * 100
            const zoneLeft = (zone.pos.x / page.px.xywh.w) * 100
            const zoneWidth = (zone.pos.w / page.px.xywh.w) * 100
            const zoneHeight = (zone.pos.h / page.px.xywh.h) * 100
            
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
          const pageSpec = currentPageIndices.length === 2 ? 
            `${currentPageIndices[0]}-${currentPageIndices[1]}` : 
            `${pageIndex}`
          const zoneSpec = `wz${pageIndex}.${zone.label}`
          this.navigate(`${this.basePath}/${manifestId}/p${pageSpec}/${zoneSpec}/`)
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
      })
    })
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
    
    // Update active class on zone items
    const zonesList = document.querySelector('.zones-list')
    if (!zonesList) return
    
    const zoneItems = zonesList.querySelectorAll('.zone-item')
    zoneItems.forEach(item => {
      const itemZoneLabel = item.dataset.zoneLabel
      const itemPageIndex = parseInt(item.dataset.pageIndex, 10)
      
      if (itemZoneLabel === zoneLabel && itemPageIndex === zonePageIndex) {
        item.classList.add('active')
      } else {
        item.classList.remove('active')
      }
    })
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
