/**
 * ViewerManager - Manages OpenSeadragon viewer lifecycle and operations
 * Handles viewer creation, page positioning, clipping, and zoom controls
 */
export class ViewerManager {
  constructor() {
    this.viewer = null
    this.pagesToLoad = []
    this.currentlyDisplayedPages = []
    this.currentWorldBounds = null
    this.clipMargins = false
  }

  /**
   * Clean up OpenSeadragon viewer
   */
  cleanup() {
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
   * Initialize OpenSeadragon viewer
   * @param {Array} pages - Array of IIIF canvas objects to display
   * @param {Function} onReady - Callback when viewer is ready
   */
  init(pages, onReady) {
    this.pagesToLoad = pages

    // Load OpenSeadragon if not already loaded
    if (typeof OpenSeadragon === 'undefined') {
      const script = document.createElement('script')
      script.src = '/vide-component-facsimile/dist/vendor/openseadragon/openseadragon.min.js'
      script.onload = () => {
        this.createViewer()
        if (onReady) onReady()
      }
      document.head.appendChild(script)
    } else {
      this.createViewer()
      if (onReady) onReady()
    }
  }

  /**
   * Create OpenSeadragon viewer instance
   * @returns {Object} Object with viewer, currentPageIndices, and worldBounds
   */
  createViewer() {
    const viewerEl = document.getElementById('openseadragon-viewer')
    if (!viewerEl) return null

    // Clean up existing viewer first
    this.cleanup()

    const pages = this.pagesToLoad || []

    if (pages.length === 0) {
      console.warn('No pages to display')
      return null
    }

    // Calculate world bounds
    const { worldBounds, minX, maxX, minY, maxY } = this.calculateWorldBounds(pages)

    // Initialize viewer with empty world
    this.viewer = OpenSeadragon({
      id: 'openseadragon-viewer',
      prefixUrl: '/vide-component-facsimile/dist/vendor/openseadragon/images/',
      showNavigationControl: false,
      showFullPageControl: false,
      sequenceMode: false,
      homeFillsViewer: false,
      visibilityRatio: 0.1,
      constrainDuringPan: false,
      showRotationControl: true,
      gestureSettingsTouch: {
        pinchRotate: true
      },
      timeout: 120000,
      immediateRender: false,
      maxImageCacheCount: 200,
      preload: true,
      debugMode: false,
      silenceMultiImageWarnings: true
    })

    this.currentlyDisplayedPages = pages
    this.currentWorldBounds = worldBounds

    return this.viewer
  }

  /**
   * Add pages to the viewer
   * @param {Array} pages - Array of page objects
   * @param {Function} onComplete - Callback when all pages are loaded
   */
  addPages(pages, onComplete) {
    if (!this.viewer) return

    const worldBounds = this.currentWorldBounds

    pages.forEach((page, index) => {
      const pageConfig = this.calculatePagePosition(page)
      
      this.viewer.addTiledImage({
        tileSource: pageConfig.tileSource,
        x: pageConfig.x,
        y: pageConfig.y,
        width: pageConfig.width,
        degrees: pageConfig.degrees,
        success: () => {
          console.log(`Page ${index + 1} loaded successfully`)
          
          if (index === pages.length - 1) {
            this.viewer.viewport.fitBounds(worldBounds, true)
            
            const minZoom = this.viewer.viewport.getZoom() * 0.5
            const maxZoom = this.viewer.viewport.getZoom() * 20
            
            this.viewer.viewport.minZoomLevel = minZoom
            this.viewer.viewport.maxZoomLevel = maxZoom
            
            this.viewer.viewport.fitBounds(worldBounds, true)
            
            if (onComplete) onComplete()
          }
        },
        error: (event) => {
          console.error(`Error loading page ${index + 1}:`, event)
        }
      })
    })
  }

  /**
   * Remove all pages from the viewer
   */
  removeAllPages() {
    if (!this.viewer) return
    
    while (this.viewer.world.getItemCount() > 0) {
      this.viewer.world.removeItem(this.viewer.world.getItemAt(0))
    }
  }

  /**
   * Calculate world bounds for a set of pages
   * @param {Array} pages - Array of page objects
   * @returns {Object} World bounds and min/max coordinates
   */
  calculateWorldBounds(pages) {
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
    
    return { worldBounds, minX, maxX, minY, maxY }
  }

  /**
   * Calculate clip rectangle to hide center margins using setClip
   * @param {Object} page - Page object from edition.json
   * @param {boolean} hideCenter - Whether to hide center margins
   * @returns {Object|null} OpenSeadragon.Rect for clipping in pixel coordinates
   */
  calculateClipRect(page, hideCenter = false) {
    const { px, position } = page
    const { xywh, width: pxWidth, height: pxHeight } = px
    const isVerso = position.includes('verso')
    
    if (!hideCenter) {
      return null
    }
    
    if (isVerso) {
      return null
    }
    
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
    const { target, px, mm, position } = page
    const { xywh, rotation, width: pxWidth } = px
    const { width: mmWidth, height: mmHeight } = mm
    
    const isVerso = position.includes('verso')
    
    const pageWidthPx = xywh.w
    const mmPerPx = mmWidth / pageWidthPx
    
    const fullImageWidthMm = pxWidth * mmPerPx
    
    const xywhCenterPxX = xywh.x + xywh.w / 2
    const xywhCenterPxY = xywh.y + xywh.h / 2
    
    const xywhCenterMmX = xywhCenterPxX * mmPerPx
    const xywhCenterMmY = xywhCenterPxY * mmPerPx
    
    let pageTargetX
    if (isVerso) {
      pageTargetX = -mmWidth
    } else {
      pageTargetX = 0
    }
    
    const pageTargetY = 0
    
    const pageCenterX = pageTargetX + mmWidth / 2
    const pageCenterY = pageTargetY + mmHeight / 2
    
    const imageX = pageCenterX - xywhCenterMmX
    const imageY = pageCenterY - xywhCenterMmY
    
    const baseUrl = target.replace(/\.(jpg|tif|tiff)$/i, '')
    const tileSource = baseUrl + '/info.json'
    
    return {
      tileSource,
      x: imageX,
      y: imageY,
      width: fullImageWidthMm,
      degrees: -rotation
    }
  }

  /**
   * Toggle margin clipping on/off
   * @param {boolean} clipMargins - Whether to clip margins
   */
  toggleMarginClipping(clipMargins) {
    this.clipMargins = clipMargins
    
    if (!this.viewer || !this.currentlyDisplayedPages) return
    
    const pages = this.currentlyDisplayedPages
    
    pages.forEach((page, index) => {
      const tiledImage = this.viewer.world.getItemAt(index)
      if (tiledImage) {
        if (clipMargins) {
          const clipRect = this.calculateClipRect(page, true)
          tiledImage.setClip(clipRect)
        } else {
          tiledImage.setClip(null)
        }
      }
    })
  }

  /**
   * Zoom in
   */
  zoomIn() {
    if (this.viewer) {
      this.viewer.viewport.zoomBy(1.3)
      this.viewer.viewport.applyConstraints()
    }
  }

  /**
   * Zoom out
   */
  zoomOut() {
    if (this.viewer) {
      this.viewer.viewport.zoomBy(0.7)
      this.viewer.viewport.applyConstraints()
    }
  }

  /**
   * Fit to bounds
   */
  fitToBounds() {
    if (this.viewer && this.currentWorldBounds) {
      this.viewer.viewport.fitBounds(this.currentWorldBounds, true)
    }
  }

  /**
   * Get the viewer instance
   * @returns {Object|null} OpenSeadragon viewer
   */
  getViewer() {
    return this.viewer
  }
}
