/**
 * Test1App Component
 * Main container component for the Test1 SPA island
 */
export class VideFacs extends HTMLElement {
  constructor() {
    super();
    this.router = null;
  }

  connectedCallback() {
    // Create container
    const container = document.createElement('div');
    container.className = 'vide-facs-container';

    // Create and append content component
    const content = document.createElement('vide-facs-content');

    container.appendChild(content);
    this.appendChild(container);

    // Wait for child components to connect, then initialize router
    setTimeout(() => {
      // VideFacsRouter is imported globally via index.js
      const VideFacsRouter = window.VideFacsRouter;
      this.router = new VideFacsRouter(this);
      window.router = this.router;
    }, 100);
  }
}
