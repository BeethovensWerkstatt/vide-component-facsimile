/**
 * Test1App Component
 * Main container component for the Test1 SPA island
 */
export class VideFacs extends HTMLElement {
  constructor () {
    super()
    this.router = null
    this.apiBase = null
    this.documents = null
  }

  connectedCallback () {
    // Create container
    const container = document.createElement('div')
    container.className = 'vide-facs-container'

    // Create and append content component
    const content = document.createElement('vide-facs-content')

    container.appendChild(content)
    this.appendChild(container)

    // Wait for child components to connect, then initialize router
    setTimeout(() => {
      // VideFacsRouter is imported globally via index.js
      const VideFacsRouter = window.VideFacsRouter
      this.router = new VideFacsRouter(this, this.getConfig())
      window.router = this.router
    }, 100)
  }

  getConfig () {
    const documents = this.getDocumentsConfig()

    return {
      apiBase: this.getAttribute('api-base') || this.apiBase || undefined,
      documents: Object.keys(documents).length > 0 ? documents : undefined
    }
  }

  getDocumentsConfig () {
    if (this.documents && typeof this.documents === 'object' && !Array.isArray(this.documents)) {
      return this.documents
    }

    const raw = this.getAttribute('documents')
    if (!raw) return {}

    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch (err) {
      console.error('[VideFacs] Invalid documents attribute JSON', err)
      return {}
    }
  }
}
