// views/config_IframeView.js
export function render(root, data) {
    root.innerHTML = `
  <section>
    <h2>iFrame-Konfiguration</h2>

    <div class="row">
      <label>Betriebsname <input id="name" value="${data.name ?? ''}"></label>
    </div>

    <div class="row">
      <label>Sprache
        <select id="lang">
          <option value="de" ${data.language === 'de' ? 'selected' : ''}>DE</option>
          <option value="en" ${data.language === 'en' ? 'selected' : ''}>EN</option>
          <option value="fr" ${data.language === 'fr' ? 'selected' : ''}>FR</option>
        </select>
      </label>

      <label>Zeitzone
        <select id="tz">
          <option value="1" ${+data.zeitzone === 1 ? 'selected' : ''}>Europe/Zurich</option>
          <option value="2" ${+data.zeitzone === 2 ? 'selected' : ''}>Europe/Berlin</option>
        </select>
      </label>
    </div>

    <div class="row">
      <label>Hintergrund <input type="color" id="bg" value="${data.hintergrundfarbe}"></label>
      <label>Textfarbe <input type="color" id="text" value="${data.textfarbe}"></label>
      <label>Schriftart
        <select id="font">
          <option ${data.schriftart === 'Arial' ? 'selected' : ''}>Arial</option>
          <option ${data.schriftart === 'Roboto' ? 'selected' : ''}>Roboto</option>
          <option ${data.schriftart === 'Inter' ? 'selected' : ''}>Inter</option>
        </select>
      </label>
      <span id="contrastWarn"></span>
    </div>

    <div class="row">
      <label><input type="checkbox" id="onlyStatus" ${data.flags.onlyStatus ? 'checked' : ''}> Nur Status</label>
      <label><input type="checkbox" id="onlyDay" ${data.flags.onlyDay ? 'checked' : ''}> Nur aktueller Tag</label>
      <label><input type="checkbox" id="showWeek" ${data.flags.showWeek ? 'checked' : ''}> Wochenplan</label>
      <label><input type="checkbox" id="showReason" ${data.flags.showReason ? 'checked' : ''}> Grund anzeigen</label>
    </div>

    <div class="row">
      <label>iFrame-Größe
        <select id="size">
          ${['auto', 'small', 'medium', 'large', 'custom'].map(s => `<option ${data.iframeSize === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </label>
      <label>W <input type="number" id="cw" value="${data.customW || ''}" placeholder="Breite"></label>
      <label>H <input type="number" id="ch" value="${data.customH || ''}" placeholder="Höhe"></label>
    </div>

    <div class="row">
      <button id="save">Speichern</button>
      <button id="previewBtn">Vorschau</button>
    </div>

    <h3>Vorschau</h3>
    <div id="preview" style="border:1px solid #ccc;min-height:120px;padding:1rem"></div>

    <h3>Embed-Code</h3>
    <pre id="embed"></pre>

    <hr>
    <h3>Ausserplanmässig schliessen/öffnen</h3>
    <div class="row">
      <input type="date" id="aFromDate"><input type="time" id="aFromTime">
      <input type="date" id="aToDate"><input type="time" id="aToTime">
      <select id="aOpen">
        <option value="true">Öffnen</option>
        <option value="false">Schliessen</option>
      </select>
      <select id="aLang"><option value="de">DE</option><option value="en">EN</option></select>
      <input id="aReason" placeholder="Beschreibung">
      <button id="aSave">Speichern</button>
    </div>
  </section>`;
}

export function readForm() {
    return {
        name: document.querySelector('#name').value.trim(),
        language: document.querySelector('#lang').value,
        zeitzone: +document.querySelector('#tz').value,
        hintergrundfarbe: document.querySelector('#bg').value,
        textfarbe: document.querySelector('#text').value,
        schriftart: document.querySelector('#font').value,
        iframeSize: document.querySelector('#size').value,
        customW: document.querySelector('#cw').value,
        customH: document.querySelector('#ch').value,
        flags: {
            onlyStatus: document.querySelector('#onlyStatus').checked,
            onlyDay: document.querySelector('#onlyDay').checked,
            showWeek: document.querySelector('#showWeek').checked,
            showReason: document.querySelector('#showReason').checked
        }
    };
}

export function readOutOfPlan() {
    return {
        fromDate: document.querySelector('#aFromDate').value || null,
        fromTime: document.querySelector('#aFromTime').value || null,
        toDate: document.querySelector('#aToDate').value || null,
        toTime: document.querySelector('#aToTime').value || null,
        open: document.querySelector('#aOpen').value === 'true',
        lang: document.querySelector('#aLang').value,
        reason: document.querySelector('#aReason').value.trim()
    };
}

export function updatePreview(data) {
    const box = document.querySelector('#preview');
    box.style.background = data.hintergrundfarbe;
    box.style.color = data.textfarbe;
    box.style.fontFamily = data.schriftart;
    box.innerHTML = `
    <div><strong>${data.name || 'Betriebsname'}</strong></div>
    <div>Status-Vorschau: ${data.flags.onlyStatus ? 'Nur Status' : (data.flags.onlyDay ? 'Aktueller Tag' : (data.flags.showWeek ? 'Woche' : '—'))}</div>
  `;
}

export function updateEmbed(data) {
    const size = data.iframeSize === 'custom'
        ? `width="${data.customW || 400}" height="${data.customH || 300}"`
        : `data-size="${data.iframeSize}"`;
    const code = `<iframe src="https://example.com/openclose?tenant=${encodeURIComponent(data.customerId)}" ${size} style="border:0"></iframe>`;
    document.querySelector('#embed').textContent = code;
}

export function warnContrast(bg, fg) {
    const ratio = contrastRatio(bg, fg);
    const el = document.querySelector('#contrastWarn');
    el.textContent = ratio < 4.5 ? `⚠️ Kontrast niedrig (${ratio.toFixed(2)}:1)` : '';
}

// --- kleine Hilfen ---
function hexToRgb(h) { const x = parseInt(h.slice(1), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255]; }
function luminance([r, g, b]) { const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function contrastRatio(bg, fg) { const L1 = luminance(hexToRgb(bg)) + 0.05; const L2 = luminance(hexToRgb(fg)) + 0.05; return Math.max(L1, L2) / Math.min(L1, L2); }
