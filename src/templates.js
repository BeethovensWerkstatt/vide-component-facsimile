/**
 * HTML Templates for VideFacs Components
 * Separates presentation from logic
 */

export const templates = {
  /**
   * Loading state template
   */
  loading: (message = 'Loading...') => `
    <div class="facsimile-view">
      <div class="loading-state">${message}</div>
    </div>
  `,

  /**
   * Error state template
   */
  error: (title, message, backLink = '/') => `
    <div class="spa-view error-view">
      <h1>${title}</h1>
      <p class="error-message">${message}</p>
      <p><a href="${backLink}" data-spa-link class="back-link">← Return to Home</a></p>
    </div>
  `,

  /**
   * Complete facsimile viewer (main container)
   */
  facsimileViewer: () => `
    <div class="spa-view facsimile-view">
      <div class="page-preview-panel" id="page-preview-panel">
        <ul class="page-preview-container" id="page-preview-container">
          <!-- Thumbnails will be inserted here -->
        </ul>
      </div>
      <div id="openseadragon-viewer">
        ${templates.viewerControls()}
        <div class="page-info-overlay" id="page-info"></div>
      </div>
      ${templates.notebookModal()}
      ${templates.sidePanel()}
    </div>
  `,

  /**
   * Viewer overlay controls
   */
  viewerControls: () => `
    <div class="viewer-overlay-controls">
      <button id="toggle-preview" class="control-button" title="Seitennavigation ein-/ausblenden">▲</button>
      <button id="toggle-margins" class="control-button" title="Ränder ein-/ausblenden">⬌</button>
      <button id="zoom-out" class="control-button" title="Zoom out">−</button>
      <button id="zoom-in" class="control-button" title="Zoom in">+</button>
      <button id="prev-page" class="control-button" title="Previous page">&lt;</button>
      <button id="next-page" class="control-button" title="Next page">&gt;</button>
      <button id="open-modal" class="control-button" title="Notirungsbuch öffnen">☰</button>
    </div>
  `,

  /**
   * Notebook modal template (hardcoded data for now)
   */
  notebookModal: () => `
    <!-- Modal -->
    <div id="notebook-modal" class="notebook-modal" hidden>
      <div class="modal-header">
        <h2 class="modal-title">Ludwig van Beethoven: Notirungsbuch K</h2>
        <button id="close-modal" class="modal-close-btn">✕ Schließen</button>
      </div>
      <div class="modal-content">
        <table class="pages-table">
          <thead>
            <tr class="table-header-main">
              <th colspan="2" class="header-verso">Verso</th>
              <th colspan="2" class="header-recto">Recto</th>
            </tr>
            <tr class="table-header-sub">
              <th class="col-page">Seite</th>
              <th class="col-source col-verso">Quelle mit Seitenzählung</th>
              <th class="col-source col-recto">Quelle mit Seitenzählung</th>
              <th class="col-page">Seite</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-highlighted">
              <td class="cell-page cell-right"></td>
              <td class="cell-source cell-verso"></td>
              <td class="cell-page cell-right"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 1</a></td>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">1</a></td>
            </tr>
            <tr>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">2</a></td>
              <td class="cell-source cell-verso"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 2</a></td>
              <td class="cell-page cell-right"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 3</a></td>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">3</a></td>
            </tr>
            <tr>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">4</a></td>
              <td class="cell-source cell-verso"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 4</a></td>
              <td class="cell-page cell-right"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 5</a></td>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">5</a></td>
            </tr>
            <tr>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">6</a></td>
              <td class="cell-source cell-verso"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 6</a></td>
              <td class="cell-page cell-right"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 7</a></td>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">7</a></td>
            </tr>
            <tr>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">8</a></td>
              <td class="cell-source cell-verso"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 8</a></td>
              <td class="cell-page cell-right"><a href="#" class="source-link">D-BNba, HCB BSk 21/69: 1r</a></td>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">9</a></td>
            </tr>
            <tr>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">10</a></td>
              <td class="cell-source cell-verso"><a href="#" class="source-link">D-BNba, HCB BSk 21/69: 1v</a></td>
              <td class="cell-page cell-right"><a href="#" class="source-link">D-BNba, HCB MH 60 ("Engelmann"): 9</a></td>
              <td class="cell-page cell-right"><a href="#" class="page-link page-number">11</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,

  /**
   * Side panel with zones list and filters
   */
  sidePanel: () => `
    <div class="side-panel" id="side-panel">
      <div class="side-panel-tabs">
        <button class="side-panel-tab active" data-panel="zones">
          <span class="tab-label">Schreibzonen</span>
        </button>
      </div>
      <div class="side-panel-content" id="side-panel-content">
        <!-- Panel 1: Writing Zones List -->
        <div class="panel-section active" data-panel="zones">
          <button id="show-filter-btn" class="filter-btn">Filter</button>
          <ul class="zones-list">
            <!-- Writing zones and metadata will be populated dynamically -->
          </ul>
        </div>
        <!-- Panel 2: Filter Panel -->
        ${templates.filterPanel()}
      </div>
    </div>
  `,

  /**
   * Filter panel (complete)
   */
  filterPanel: () => `
    <div class="panel-section" data-panel="filter">
      <div class="filter-header">
        <button id="cancel-filter-btn" title="Abbrechen" class="cancel-filter-btn">×</button>
      </div>
      <h4>Suchraum</h4>
      <div class="filterbox">
        <label><input type="checkbox" id="filter-restrict-page" name="suchraum" value="current-page" checked> Auf aktuelle Doppelseite beschränken</label>
      </div>
      <h4>Vorzeichnung</h4>
      <div class="filterbox filter-vorzeichnung">
        <div class="filter-grid">
          <label><input type="checkbox" name="filter-keysig" value="7f"> 7♭</label>
          <label><input type="checkbox" name="filter-keysig" value="6f"> 6♭</label>
          <label><input type="checkbox" name="filter-keysig" value="5f"> 5♭</label>
          <label><input type="checkbox" name="filter-keysig" value="4f"> 4♭</label>
          <label><input type="checkbox" name="filter-keysig" value="3f"> 3♭</label>
          <label><input type="checkbox" name="filter-keysig" value="2f"> 2♭</label>
          <label><input type="checkbox" name="filter-keysig" value="1f"> 1♭</label>
          <label><input type="checkbox" name="filter-keysig" value="0"> 0</label>
          <label><input type="checkbox" name="filter-keysig" value="1s"> 1♯</label>
          <label><input type="checkbox" name="filter-keysig" value="2s"> 2♯</label>
          <label><input type="checkbox" name="filter-keysig" value="3s"> 3♯</label>
          <label><input type="checkbox" name="filter-keysig" value="4s"> 4♯</label>
          <label><input type="checkbox" name="filter-keysig" value="5s"> 5♯</label>
          <label><input type="checkbox" name="filter-keysig" value="6s"> 6♯</label>
          <label><input type="checkbox" name="filter-keysig" value="7s"> 7♯</label>
        </div>
        <div class="filter-checkboxes">
          <label><input type="radio" name="filter-keysig-supplied" value="original"> original</label>
          <label><input type="radio" name="filter-keysig-supplied" value="supplied"> ergänzt</label>
          <label><input type="radio" name="filter-keysig-supplied" value="any" checked> beides</label>
        </div>
      </div>
      <h4>Taktart</h4>
      <div class="filterbox">
        <div class="filter-grid">
          <label><input type="checkbox" name="filter-metersig" value="4/4"> 4/4</label>
          <label><input type="checkbox" name="filter-metersig" value="3/4"> 3/4</label>
          <label><input type="checkbox" name="filter-metersig" value="2/4"> 2/4</label>
          <label><input type="checkbox" name="filter-metersig" value="2/2"> 2/2</label>
          <label><input type="checkbox" name="filter-metersig" value="2/8"> 2/8</label>
          <label><input type="checkbox" name="filter-metersig" value="3/8"> 3/8</label>
          <label><input type="checkbox" name="filter-metersig" value="6/8"> 6/8</label>
          <label><input type="checkbox" name="filter-metersig" value="9/8"> 9/8</label>
        </div>
        <div class="filter-checkboxes">
          <label><input type="radio" name="filter-metersig-supplied" value="original"> original</label>
          <label><input type="radio" name="filter-metersig-supplied" value="supplied"> ergänzt</label>
          <label><input type="radio" name="filter-metersig-supplied" value="any" checked> beides</label>
        </div>
      </div>
      <h4>Länge (Takte)</h4>
      <div class="filterbox">
        <div class="filter-horizontal">
          <label><input type="checkbox" name="filter-length" value="short"> ≤5</label>
          <label><input type="checkbox" name="filter-length" value="medium"> 6–10</label>
          <label><input type="checkbox" name="filter-length" value="long"> >10</label>
        </div>
      </div>
      <h4>Anzahl Systeme</h4>
      <div class="filterbox">
        <div class="filter-horizontal">
          <label><input type="checkbox" name="filter-staves" value="1"> 1</label>
          <label><input type="checkbox" name="filter-staves" value="2"> 2</label>
          <label><input type="checkbox" name="filter-staves" value="3"> 3+</label>
        </div>                
      </div>
      <h4>Metatexte</h4>
      <div class="filterbox">
        <div class="filter-checkboxes meta-filter">
          <label><input type="checkbox" name="filter-meta-nav" value="true"> Verweiszeichen</label>
          <label><input type="checkbox" name="filter-meta-clar" value="true"> Erläuterungen</label>
          <label><input type="checkbox" name="filter-meta-other" value="true"> Sonstige</label>
        </div>
      </div>
      <h4>Werkbezug</h4>
      <div class="filterbox" id="filter-werkbezug-container">
        <ul class="zones-list filter-werke">
          <!-- Work filters will be populated dynamically from edition data -->
        </ul>
      </div>
      
      <!-- Filter Actions -->
      <div class="filter-actions">
        <button id="reset-filter-btn" class="reset-filter-btn">Filter zurücksetzen</button>
        <button id="apply-filter-btn" class="apply-filter-btn">Filter anwenden</button>
      </div>
    </div>
  `
}
