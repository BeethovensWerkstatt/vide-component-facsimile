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
│   ├── vide-facs-router.js   # Router with OpenSeadragon viewer
│   ├── styles.scss           # Component styles
│   └── styles.css            # Compiled styles (dev)
└── dist/
    ├── vide-facs.js          # Bundled component (production)
    └── vide-facs.css         # Compiled styles (production)
```

## License

AGPL-3.0-or-later
