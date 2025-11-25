/**
 * VideFacsNav Component
 * Navigation component for the Digital Facsimile SPA
 */
export class VideFacsNav extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <nav class="spa-nav">
        <a href="/facs/" data-spa-link data-nav="home">Home</a>
        <a href="/facs/NK/" data-spa-link data-nav="NK">NK</a>
      </nav>
    `;
  }

  setActive(section) {
    const links = this.querySelectorAll('a[data-nav]');
    links.forEach(link => {
      const navSection = link.getAttribute('data-nav');
      if (navSection === section) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}
