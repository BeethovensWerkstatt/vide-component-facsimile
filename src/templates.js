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
        <div class="page-preview-container" id="page-preview-container">
          <!-- Thumbnails will be inserted here -->
        </div>
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
            <!-- Writing zones will be populated dynamically -->
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
      <div class="filterbox" class="filterbox">
        <label><input type="checkbox" name="suchraum" value="current-page"> Auf aktuelle Doppelseite beschränken</label>
      </div>
      <h4>Vorzeichnung</h4>
      <div class="filterbox" class="filterbox filter-vorzeichnung">
        <div class="vorzeichnung-controls">
          <div id="vorzeichnung-current" class="vorzeichnung-value">0</div>
          <input type="range" id="vorzeichnung-slider" name="vorzeichnung" min="0" max="14" value="7" step="1" class="vorzeichnung-slider">
        </div>
        <div class="filter-checkboxes">
          <label><input type="checkbox" id="vorzeichnung-ergaenzt" name="vorzeichnung-extra"> original</label>
          <label><input type="checkbox" id="vorzeichnung-nicht-notiert" name="vorzeichnung-missing"> ergänzt</label>
        </div>
        <script>
          (function() {
            const slider = document.getElementById('vorzeichnung-slider')
            const label = document.getElementById('vorzeichnung-current')
            const values = [
              '7&#9837;', '6&#9837;', '5&#9837;', '4&#9837;', '3&#9837;', '2&#9837;', '1&#9837;', '0',
              '1&#9839;', '2&#9839;', '3&#9839;', '4&#9839;', '5&#9839;', '6&#9839;', '7&#9839;'
            ]
            function updateLabel() {
              label.innerHTML = values[slider.value]
            }
            slider.addEventListener('input', updateLabel)
            updateLabel()
          })()
        </script>
      </div>
      <h4>Taktart</h4>
      <div class="filterbox">
        <div class="filter-grid">
          <label><input type="checkbox" name="meter" value="4/4"> 4/4</label>
          <label><input type="checkbox" name="meter" value="3/4"> 3/4</label>
          <label><input type="checkbox" name="meter" value="2/4"> 2/4</label>
          <label><input type="checkbox" name="meter" value="2/2"> 2/2</label>
          <label><input type="checkbox" name="meter" value="2/8"> 2/8</label>
          <label><input type="checkbox" name="meter" value="3/8"> 3/8</label>
          <label><input type="checkbox" name="meter" value="6/8"> 6/8</label>
          <label><input type="checkbox" name="meter" value="9/8"> 9/8</label>
        </div>
        <div class="filter-checkboxes">
          <label><input type="checkbox" id="vorzeichnung-ergaenzt" name="vorzeichnung-extra"> ergänzt</label>
          <label><input type="checkbox" id="vorzeichnung-nicht-notiert" name="vorzeichnung-missing"> nicht notiert</label>
        </div>
      </div>
      <h4>Schlüssel (kann weg?)</h4>
      <div class="filterbox">
        <ul>
          <li><input type="checkbox" id="clef-treble" name="clef" value="treble"> <label for="clef-treble">Violinschlüssel</label></li>
          <li><input type="checkbox" id="clef-bass" name="clef" value="bass"> <label for="clef-bass">Bassschlüssel</label></li>
          <li><input type="checkbox" id="clef-c" name="clef" value="c"> <label for="clef-c">C-Schlüssel</label></li>
          <li><input type="checkbox" id="clef-unset" name="clef" value="unset"> <label for="clef-unset">Nicht festgelegt</label></li>
        </ul>
      </div>
      <h4>Länge</h4>
      <div class="filterbox">
        <ul>
          <li><input type="checkbox" id="length-short" name="length" value="short"> <label for="length-short">bis fünf Takte</label></li>
          <li><input type="checkbox" id="length-medium" name="length" value="medium"> <label for="length-medium">sechs bis zehn Takte</label></li>
          <li><input type="checkbox" id="length-long" name="length" value="long"> <label for="length-long">mehr als zehn Takte</label></li>
        </ul>
      </div>
      <h4>Anzahl Systeme</h4>
      <div class="filterbox">
        <div class="filter-horizontal">
          <label><input type="checkbox" name="row-checkbox" value="1"> 1</label>
          <label><input type="checkbox" name="row-checkbox" value="2"> 2</label>
          <label><input type="checkbox" name="row-checkbox" value="3"> 3</label>
        </div>                
      </div>
      <h4>Verbalanmerkungen</h4>
      <div class="filterbox" class="filter-horizontal">
        <label><input type="checkbox" name="verbalanmerkung" value="vorhanden"> vorhanden</label>
        <label><input type="checkbox" name="verbalanmerkung" value="nicht-vorhanden"> ohne</label>
      </div>
      <h4>Verweiszeichen</h4>
      <div class="filterbox" class="filter-horizontal">
        <label><input type="checkbox" name="verweiszeichen" value="vorhanden"> vorhanden</label>
        <label><input type="checkbox" name="verweiszeichen" value="nicht-vorhanden"> ohne</label>
      </div>
      <h4>Werkbezug</h4>
      <div class="filterbox">
        <ul class="zones-list">
          <li><label><input type="checkbox" name="werkbezug" value="Op.120"> Op.120</label></li>
          <li><label><input type="checkbox" name="werkbezug" value="Op.125"> Op.125</label></li>
          <li class="sub-item"><label><input type="checkbox" name="werkbezug" value="Op.125-1"> 1. Satz</label></li>
          <li class="sub-item"><label><input type="checkbox" name="werkbezug" value="Op.125-2"> 2. Satz</label></li>
          <li class="sub-item"><label><input type="checkbox" name="werkbezug" value="Op.125-3"> 3. Satz</label></li>
          <li class="sub-item"><label><input type="checkbox" name="werkbezug" value="Op.125-4"> 4. Satz</label></li>
          <li><label><input type="checkbox" name="werkbezug" value="unbekannt"> unbekannt</label></li>
        </ul>
      </div>
      
      <!--<div style="text-align: center; font-size: 3rem; line-height: 1.3;">
        ✨🎄✨<br>
        🎁🎁🎁<br>
        ⭐✨⭐✨⭐
      </div>
      <p style="text-align: center; font-style: italic; color: #666; margin-top: 1rem;">
        "Früher war mehr Lametta…" 🎀
      </p>-->
      <!-- Apply Filter Button -->
      <button id="apply-filter-btn" class="apply-filter-btn">Filter anwenden</button>
    </div>
  `
}
