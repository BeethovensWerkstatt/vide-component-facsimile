# VideFacs - Digital Facsimile Web Component

A reusable web component for displaying digital facsimiles with OpenSeadragon viewer and IIIF manifest support.

## Features

- 🖼️ OpenSeadragon-based image viewer with zoom and pan
- 📱 Responsive design with side panels
- 🔍 Filter system for writing zones
- 📖 Modal dialog for notebook information
- 🎨 Customizable styling via CSS
- ⚡ Pure Web Components - no framework required

## Usage

### Installation

Add as a git submodule:

```bash
git submodule add https://github.com/BeethovensWerkstatt/vide-component-facsimile.git
```

### Build

```bash
cd vide-component-facsimile
npm install
npm run build
```

This creates:
- `dist/vide-facs.js` - Bundled component
- `dist/vide-facs.css` - Styles

### Integration

In your HTML page:

```html
<!-- CSS -->
<link rel="stylesheet" href="vide-component-facsimile/dist/vide-facs.css">

<!-- Component -->
<vide-facs></vide-facs>

<!-- JavaScript module -->
<script type="module" src="vide-component-facsimile/dist/index.js"></script>
```

To point the component at a different API root, pass `base-api` on the root element:

```html
<vide-facs base-api="https://example.org/exist/apps/api/document"></vide-facs>
```

To override the manifest-to-URL mapping, pass `edition-urls` as JSON:

```html
<vide-facs
    base-api="https://example.org/exist/apps/api/document"
    edition-urls='{"NK":"m57bab171-9222-451d-8f7d-7fe7db6064bb/overview.json"}'
></vide-facs>
```

## Development

### Watch mode for CSS

```bash
npm run watch:css
```

### Build commands

```bash
npm run build        # Build both JS and CSS (copies src/ to dist/)
npm run build:js     # Copy source files to dist/
npm run build:css    # Build CSS from SCSS
```

**Note:** The build copies all source files to `dist/` as ES modules. The `dist/index.js` serves as the entry point that imports all components.

## Structure

```
vide-component-facsimile/
├── src/
│   ├── index.js              # Entry point & component registration
│   ├── vide-facs.js          # Main container component
│   ├── vide-facs-nav.js      # Navigation component
│   ├── vide-facs-content.js  # Content wrapper component
│   ├── vide-facs-router.js   # SPA router with page navigation
│   ├── viewer-manager.js     # OpenSeadragon viewer lifecycle
│   ├── filter-controller.js  # Filter UI sync and interactions
│   ├── filter-state.js       # Filter state persistence (sessionStorage)
│   ├── templates.js          # HTML templates for views
│   └── styles.scss           # Component styles (SCSS source)
├── tests/
│   ├── filter-state.test.js  # Unit tests for FilterState
│   └── integration.test.js   # Integration tests
└── dist/
    ├── *.js                  # Copied source files (ES modules)
    └── vide-facs.css         # Compiled styles (production)
```

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| `vide-facs-router.js` | SPA routing, page navigation, zone list rendering |
| `viewer-manager.js` | OpenSeadragon viewer creation, page positioning, zoom controls |
| `filter-controller.js` | Filter panel UI, syncing UI ↔ state, applying filters |
| `filter-state.js` | Filter persistence via sessionStorage, URL parsing/generation |
| `templates.js` | HTML template functions for views (loading, error, viewer, panels) |

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## License

AGPL-3.0-or-later
