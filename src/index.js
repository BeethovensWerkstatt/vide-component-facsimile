/**
 * VideFacs - Digital Facsimile Web Component
 * 
 * A reusable web component for displaying digital facsimiles with OpenSeadragon.
 * Single-page application (SPA) with History API routing.
 * 
 * Requirements: Web server (does not work with file:// protocol)
 * 
 * Usage:
 *   <link rel="stylesheet" href="vide-component-facsimile/dist/vide-facs.css">
 *   <vide-facs></vide-facs>
 *   <script type="module" src="vide-component-facsimile/dist/vide-facs.js"></script>
 */

import { VideFacs } from './vide-facs.js';
import { VideFacsNav } from './vide-facs-nav.js';
import { VideFacsContent } from './vide-facs-content.js';
import { VideFacsRouter } from './vide-facs-router.js';

// Make VideFacsRouter globally accessible for programmatic navigation
window.VideFacsRouter = VideFacsRouter;

// Register Custom Elements
// Only register if not already defined (prevents errors on hot reload)
if (!customElements.get('vide-facs')) {
  customElements.define('vide-facs', VideFacs);
}
if (!customElements.get('vide-facs-nav')) {
  customElements.define('vide-facs-nav', VideFacsNav);
}
if (!customElements.get('vide-facs-content')) {
  customElements.define('vide-facs-content', VideFacsContent);
}
if (!customElements.get('vide-facs-router')) {
  customElements.define('vide-facs-router', VideFacsRouter);
}

console.log('[VideFacs] Component loaded successfully');

// Export for programmatic usage
export { VideFacs, VideFacsNav, VideFacsContent, VideFacsRouter };
