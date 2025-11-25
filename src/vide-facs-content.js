/**
 * VideFacsContent Component
 * Content container for the Digital Facsimile viewer
 */
export class VideFacsContent extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const wrapper = document.createElement('div');
    wrapper.className = 'spa-content-wrapper';
    this.appendChild(wrapper);
  }

  /**
   * Set the HTML content of the view
   * @param {string} html - HTML content to display
   */
  setContent(html) {
    const wrapper = this.querySelector('.spa-content-wrapper');
    if (wrapper) {
      wrapper.innerHTML = html;
    }
  }

  /**
   * Get the content wrapper element
   * @returns {HTMLElement}
   */
  getWrapper() {
    return this.querySelector('.spa-content-wrapper');
  }
}
