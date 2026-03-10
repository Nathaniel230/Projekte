// JavaScript für die iFrame-Konfigurationsseite
// Ausgelagerter Code aus views/configIframe/config_Iframe.html

// Lade Einstellungen beim Start
document.addEventListener('DOMContentLoaded', async function () {
    await loadSettings();
    await loadOutofplanEntries();
});

let outofplanEntries = [];

// Ausserplanmässig laden
async function loadOutofplanEntries() {
    try {
        const response = await fetch('/api/iframe/outofplan');
        if (response.ok) {
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                outofplanEntries = result.data;
                renderOutofplanList();
            } else {
                document.getElementById('outofplanList').innerHTML = '<div class="text-center text-muted p-3">Keine Einträge gefunden.</div>';
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden der Ausserplanmässig-Einträge:', error);
        document.getElementById('outofplanList').innerHTML = '<div class="text-center text-danger p-3">Fehler beim Laden.</div>';
    }
}

function renderOutofplanList() {
    const container = document.getElementById('outofplanList');

    // Filter past entries (keep entries that end today or in the future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeEntries = outofplanEntries.filter(entry => {
        const endDate = new Date(entry.datumBis);
        // Reset time part of endDate to ensure fair comparison if it has time
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
    });

    if (activeEntries.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">Keine aktuellen Einträge vorhanden.</div>';
        return;
    }

    let html = '';
    activeEntries.forEach(entry => {
        const fromDate = new Date(entry.datumVon).toLocaleDateString('de-DE');
        const toDate = new Date(entry.datumBis).toLocaleDateString('de-DE');
        const dateStr = fromDate === toDate ? fromDate : `${fromDate} - ${toDate}`;
        const timeStr = `${entry.zeitVon} - ${entry.zeitBis}`;
        const statusBadge = entry.offen ? '<span class="badge bg-success">Offen</span>' : '<span class="badge bg-danger">Geschlossen</span>';
        const desc = entry.beschreibungen && entry.beschreibungen.de ? entry.beschreibungen.de : (Object.values(entry.beschreibungen || {})[0] || '-');

        html += `
                <div class="list-group-item p-3 border-bottom">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <div class="fw-bold">${dateStr}</div>
                            <small class="text-muted">${timeStr}</small>
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="mb-2 text-truncate" style="max-width: 200px;">${desc}</div>
                    <div class="d-flex gap-2 justify-content-end">
                        <!-- Edit button removed as requested -->
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteOutofplan('${entry._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
    });
    container.innerHTML = html;
}

function editOutofplan(id) {
    const entry = outofplanEntries.find(e => e._id === id);
    if (!entry) return;

    document.getElementById('outofplanDateFrom').value = entry.datumVon.split('T')[0];
    document.getElementById('outofplanDateTo').value = entry.datumBis.split('T')[0];

    // Time inputs removed from UI
    // document.getElementById('outofplanTimeFrom').value = entry.zeitVon;
    // document.getElementById('outofplanTimeTo').value = entry.zeitBis;

    // Set status button
    const btn = document.getElementById('toggleBtn');
    if (entry.offen) {
        btn.textContent = 'Öffnen';
    } else {
        btn.textContent = 'Schliessen';
    }

    // Load descriptions
    beschreibungenCache = entry.beschreibungen || { de: '', en: '', fr: '', it: '', es: '' };
    currentLanguage = 'de';
    document.getElementById('languageSelector').value = 'de';
    document.getElementById('outofplanDescription').value = beschreibungenCache['de'] || '';
    document.getElementById('currentLangLabel').textContent = 'Deutsch';

    // Set edit mode
    document.getElementById('saveOutofplanBtn').innerHTML = '<i class="bi bi-check-circle"></i> Aktualisieren';
    document.getElementById('saveOutofplanBtn').dataset.editId = id;
}

async function deleteOutofplan(id) {
    if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) return;

    try {
        const response = await fetch(`/api/iframe/outofplan/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadOutofplanEntries();
        } else {
            alert('Fehler beim Löschen.');
        }
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
    }
}

// Einstellungen vom Server laden
async function loadSettings() {
    try {
        const response = await fetch('/api/iframe/settings');
        const result = await response.json();

        if (result.success && result.data) {
            const settings = result.data;

            // Felder mit geladenen Werten befüllen
            document.getElementById('bgColorOpen').value = settings.hintergrundfarbeOffen || '#ffffff';
            document.getElementById('bgColorClosed').value = settings.hintergrundfarbeGeschlossen || '#e0e0e0';
            document.getElementById('textColorOpen').value = settings.textfarbeOffen || '#000000';
            document.getElementById('textColorClosed').value = settings.textfarbeGeschlossen || '#333333';
            document.getElementById('fontFamilyOpen').value = settings.schriftartOffen || 'Arial';
            document.getElementById('fontFamilyClosed').value = settings.schriftartGeschlossen || 'Arial';
            document.getElementById('vorauswahlen').checked = settings.vorauswahlen || false;

            // Zeitzone
            const timezoneSelector = document.getElementById('timezoneSelector');
            if (settings.zeitzone && settings.zeitzone > 0 && settings.zeitzone <= timezoneSelector.options.length) {
                timezoneSelector.selectedIndex = settings.zeitzone - 1;
            }

            // Update Preview after loading settings
            updatePreview();
        }
    } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
    }
}

// Einstellungen speichern
async function saveSettings() {
    try {
        const settingsData = {
            zeitzone: document.getElementById('timezoneSelector').selectedIndex + 1,
            hintergrundfarbeOffen: document.getElementById('bgColorOpen').value,
            hintergrundfarbeGeschlossen: document.getElementById('bgColorClosed').value,
            textfarbeOffen: document.getElementById('textColorOpen').value,
            textfarbeGeschlossen: document.getElementById('textColorClosed').value,
            schriftartOffen: document.getElementById('fontFamilyOpen').value,
            schriftartGeschlossen: document.getElementById('fontFamilyClosed').value,
            vorauswahlen: document.getElementById('vorauswahlen').checked
        };

        const response = await fetch('/api/iframe/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settingsData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Einstellungen erfolgreich gespeichert!');
        } else {
            alert('Fehler beim Speichern: ' + result.error);
        }
    } catch (error) {
        console.error('Fehler beim Speichern der Einstellungen:', error);
        alert('Fehler beim Speichern der Einstellungen.');
    }
}

function toggleButtonText(btn) {
    // Einfaches Toggle zwischen den zwei Zuständen
    const previewBtn = document.getElementById('previewToggleBtn');

    if (btn.textContent === 'Schliessen') {
        btn.textContent = 'Öffnen';
        // Sync with Preview: Öffnen implies Open status
        // We set Preview toggle to "Offen" (Open)
        if (previewBtn.textContent.trim() !== 'Offen') {
            // togglePreviewStatus() toggles logic, so we call it if needed
            // But better to set state directly to avoid recursion or side effects
            previewBtn.textContent = 'Offen';
            previewBtn.classList.remove('btn-danger');
            previewBtn.classList.add('btn-success');
        }
    } else {
        btn.textContent = 'Schliessen';
        // Sync with Preview: Schliessen implies Closed status
        if (previewBtn.textContent.trim() === 'Offen') {
            previewBtn.textContent = 'Geschlossen';
            previewBtn.classList.remove('btn-success');
            previewBtn.classList.add('btn-danger');
        }
    }
    updatePreview();
}

// Preview Status Toggle
function togglePreviewStatus() {
    const btn = document.getElementById('previewToggleBtn');
    if (btn.textContent.trim() === 'Offen') {
        btn.textContent = 'Geschlossen';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-danger');
    } else {
        btn.textContent = 'Offen';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-success');
    }
    updatePreview();
}

// Translations
const translations = {
    de: { open: 'Geöffnet', closed: 'Geschlossen', currentOpen: 'Wir haben momentan offen', currentClosed: 'Wir haben momentan geschlossen', week: 'Öffnungszeiten', until: 'Bis', opens: 'Öffnet', closedVacation: 'In den Ferien', thankYou: 'Vielen Dank', mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag', fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag' },
    en: { open: 'Open', closed: 'Closed', currentOpen: 'We are currently open', currentClosed: 'We are currently closed', week: 'Opening Hours', until: 'Until', opens: 'Opens', closedVacation: 'On vacation', thankYou: 'Thank you', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' },
    fr: { open: 'Ouvert', closed: 'Fermé', currentOpen: 'Nous sommes actuellement ouverts', currentClosed: 'Nous sommes actuellement fermés', week: "Heures d'ouverture", until: 'Jusqu\'à', opens: 'Ouvre', closedVacation: 'En vacances', thankYou: 'Merci', mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi', fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche' },
    it: { open: 'Aperto', closed: 'Chiuso', currentOpen: 'Siamo attualmente aperti', currentClosed: 'Siamo attualmente chiusi', week: 'Orari di apertura', until: 'Fino alle', opens: 'Apre', closedVacation: 'In vacanza', thankYou: 'Grazie', mon: 'Lunedì', tue: 'Martedì', wed: 'Mercoledì', thu: 'Giovedì', fri: 'Venerdì', sat: 'Sabato', sun: 'Domenica' },
    es: { open: 'Abierto', closed: 'Cerrado', currentOpen: 'Estamos abiertos actualmente', currentClosed: 'Estamos cerrados actualmente', week: 'Horario de apertura', until: 'Hasta', opens: 'Abre', closedVacation: 'De vacaciones', thankYou: 'Gracias', mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' }
};

// Event Listeners für Live-Preview
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('previewSizeSelector').addEventListener('change', updatePreview);
    document.getElementById('previewLanguageSelector').addEventListener('change', updatePreview);
    document.getElementById('bgColorOpen').addEventListener('input', updatePreview);
    document.getElementById('bgColorClosed').addEventListener('input', updatePreview);
    document.getElementById('textColorOpen').addEventListener('input', updatePreview);
    document.getElementById('textColorClosed').addEventListener('input', updatePreview);
    document.getElementById('fontFamilyOpen').addEventListener('change', updatePreview);
    document.getElementById('fontFamilyClosed').addEventListener('change', updatePreview);
    // Event Listeners für Out-of-Plan Inputs, damit die Vorschau updated
    document.getElementById('outofplanDescription').addEventListener('input', updatePreview);
    document.getElementById('toggleBtn').addEventListener('click', updatePreview); // Assuming toggleBtn changes status
    document.getElementById('vorauswahlen').addEventListener('change', togglePresets);
});

let previousSettings = {};

function togglePresets() {
    const checkbox = document.getElementById('vorauswahlen');

    if (checkbox.checked) {
        // Save current settings
        previousSettings = {
            lang: document.getElementById('previewLanguageSelector').value,
            bgOpen: document.getElementById('bgColorOpen').value,
            bgClosed: document.getElementById('bgColorClosed').value,
            textOpen: document.getElementById('textColorOpen').value,
            textClosed: document.getElementById('textColorClosed').value,
            fontOpen: document.getElementById('fontFamilyOpen').value,
            fontClosed: document.getElementById('fontFamilyClosed').value
        };

        // Apply presets (User Requested: Open=GreenBG/WhiteText, Closed=RedBG/WhiteText, Arial)
        document.getElementById('previewLanguageSelector').value = 'de';

        document.getElementById('bgColorOpen').value = '#198754';     // Green Background
        document.getElementById('bgColorClosed').value = '#dc3545';   // Red Background

        document.getElementById('textColorOpen').value = '#ffffff';   // White Text
        document.getElementById('textColorClosed').value = '#ffffff'; // White Text

        document.getElementById('fontFamilyOpen').value = 'Arial';
        document.getElementById('fontFamilyClosed').value = 'Arial';
    } else {
        // Restore previous settings if available
        if (Object.keys(previousSettings).length > 0) {
            document.getElementById('previewLanguageSelector').value = previousSettings.lang;
            document.getElementById('bgColorOpen').value = previousSettings.bgOpen;
            document.getElementById('bgColorClosed').value = previousSettings.bgClosed;
            document.getElementById('textColorOpen').value = previousSettings.textOpen;
            document.getElementById('textColorClosed').value = previousSettings.textClosed;
            document.getElementById('fontFamilyOpen').value = previousSettings.fontOpen;
            document.getElementById('fontFamilyClosed').value = previousSettings.fontClosed;
        }
    }
    updatePreview();
}

function updatePreview() {
    const size = document.getElementById('previewSizeSelector').value;
    const lang = document.getElementById('previewLanguageSelector').value;
    const t = translations[lang] || translations['de'];
    const isOpen = document.getElementById('previewToggleBtn').textContent.trim() === 'Offen';
    const previewBox = document.getElementById('previewBox');

    // Styles holen
    const bgOpen = document.getElementById('bgColorOpen').value;
    const bgClosed = document.getElementById('bgColorClosed').value;
    const textOpen = document.getElementById('textColorOpen').value;
    const textClosed = document.getElementById('textColorClosed').value;
    const fontOpen = document.getElementById('fontFamilyOpen').value;
    const fontClosed = document.getElementById('fontFamilyClosed').value;

    const currentBg = isOpen ? bgOpen : bgClosed;
    const currentText = isOpen ? textOpen : textClosed;
    let currentFont = isOpen ? fontOpen : fontClosed;

    // Font-Family Fallbacks
    if (currentFont === 'Roboto') currentFont = "'Roboto', sans-serif";
    else if (currentFont === 'Inter') currentFont = "'Inter', sans-serif";
    else currentFont = 'Arial, sans-serif';

    // Container Styles reset
    previewBox.style = '';
    previewBox.style.backgroundColor = '#f8f9fa'; // Hintergrund der Vorschau-Area (nicht des Iframes)
    previewBox.style.display = 'flex';
    previewBox.style.justifyContent = 'center';
    previewBox.style.alignItems = 'center';
    previewBox.style.minHeight = '300px';
    previewBox.style.padding = '2rem';
    // previewBox.style.overflow = 'auto'; // Entfernt, damit keine Scrollbalken entstehen
    previewBox.style.border = '1px solid #ddd';
    previewBox.style.borderRadius = '8px';
    previewBox.style.marginBottom = '2rem';

    // Iframe-Simulation Container
    const iframeSim = document.createElement('div');
    iframeSim.style.backgroundColor = currentBg;
    iframeSim.style.color = currentText;
    iframeSim.style.fontFamily = currentFont;
    iframeSim.style.transition = 'all 0.3s ease';
    // iframeSim.style.overflow = 'hidden'; // Entfernt, damit Inhalt nicht abgeschnitten wird
    iframeSim.style.position = 'relative';

    let content = '';

    if (size === 'large') {
        // Gross: Wochenplan
        iframeSim.style.width = '100%';
        iframeSim.style.padding = '1rem';
        // Keine Box-Shadow oder Border-Radius für "Gross", damit es flach aussieht

        const statusText = isOpen ? t.currentOpen : t.currentClosed;

        content = `
                <div style="text-align: center; font-family: inherit;">
                    <h4 style="margin-bottom: 0.5rem; font-weight: 600; color: inherit; font-family: inherit;">${t.week}</h4>
                    <p style="margin-bottom: 1.5rem; font-size: 1.1rem; opacity: 0.9;">${statusText}</p>
                    
                    <!-- First Table (Mon-Thu) -->
                    <div style="margin-bottom: 2rem;">
                        <table style="width: 100%; border-collapse: collapse; color: inherit; font-family: inherit; background: transparent;">
                            <thead>
                                <tr style="border-bottom: 1px solid currentColor;">
                                    <th style="padding: 0.5rem; font-weight: 600; opacity: 0.9;">${t.mon}</th>
                                    <th style="padding: 0.5rem; font-weight: 600; opacity: 0.9;">${t.tue}</th>
                                    <th style="padding: 0.5rem; font-weight: 600; opacity: 0.9;">${t.wed}</th>
                                    <th style="padding: 0.5rem; font-weight: 600; opacity: 0.9;">${t.thu}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 0.5rem; white-space: nowrap;">10:00 - 19:00</td>
                                    <td style="padding: 0.5rem; white-space: nowrap;">10:00 - 19:00</td>
                                    <td style="padding: 0.5rem; white-space: nowrap;">10:00 - 19:00</td>
                                    <td style="padding: 0.5rem; white-space: nowrap;">10:00 - 19:00</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Second Table (Fri-Sun) -->
                    <div>
                        <table style="width: 100%; border-collapse: collapse; color: inherit; font-family: inherit; background: transparent;">
                            <thead>
                                <tr style="border-bottom: 1px solid currentColor;">
                                    <th style="padding: 0.5rem; font-weight: 600; opacity: 0.9;">${t.fri}</th>
                                    <th style="padding: 0.5rem; font-weight: 600; opacity: 0.9;">${t.sat}</th>
                                    <th style="padding: 0.5rem; font-weight: 600; opacity: 0.9;">${t.sun}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 0.5rem; white-space: nowrap;">09:00 - 20:00</td>
                                    <td style="padding: 0.5rem; white-space: nowrap;">09:00 - 20:00</td>
                                    <td style="padding: 0.5rem; white-space: nowrap;">${t.closed}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
    } else if (size === 'medium') {
        // Mittel: Box mit Status und Zeit
        iframeSim.style.width = '100%';
        iframeSim.style.maxWidth = '300px';
        iframeSim.style.minHeight = '200px';
        iframeSim.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        iframeSim.style.borderRadius = '12px';
        iframeSim.style.display = 'flex';
        iframeSim.style.flexDirection = 'column';
        iframeSim.style.justifyContent = 'center';
        iframeSim.style.alignItems = 'center';
        iframeSim.style.textAlign = 'center';
        iframeSim.style.padding = '1rem';
        iframeSim.style.border = '1px solid rgba(0,0,0,0.1)';

        if (isOpen) {
            // Check if reason is typed (also for Open state)
            const reasonInput = document.getElementById('outofplanDescription');
            const reasonText = reasonInput && reasonInput.value ? reasonInput.value : '';
            const reasonHtml = reasonText ? `<p style="margin: 0; font-size: 1.1rem; color: inherit; font-family: inherit; font-weight: normal; opacity: 0.9;">${reasonText}</p>` : '';

            content = `
                    <h3 style="margin: 0 0 ${reasonText ? '0.5rem' : '1rem'} 0; font-size: 1.8rem; color: inherit; font-family: inherit;">${t.open}</h3>
                    ${reasonHtml}
                    <p style="margin: 0.5rem 0 0 0; font-size: 1.5rem; font-weight:bold; color: inherit; font-family: inherit;">06:00 - 18:00</p>
                `;
        } else {
            // Check if reason is typed in out-of-plan input, this simulates the user test
            const reasonInput = document.getElementById('outofplanDescription');
            const reasonText = reasonInput && reasonInput.value ? reasonInput.value : '';

            let additionalContent = '';
            if (reasonText) {
                additionalContent = `<p style="margin: 0 0 1rem 0; font-size: 1.1rem; color: inherit; font-family: inherit; font-weight: normal; opacity: 0.9;">${reasonText}</p>`;
            } else {
                additionalContent = `
                    <p style="margin: 0; font-size: 1rem; color: inherit; font-family: inherit;">${t.opens} ${t.mon} 06.01</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 1.5rem; font-weight:bold; color: inherit; font-family: inherit;">08:00</p>
                `;
            }

            content = `
                    <h3 style="margin: 0 0 ${reasonText ? '0.5rem' : '1rem'} 0; font-size: 1.8rem; color: inherit; font-family: inherit;">${t.closed}</h3>
                    ${additionalContent}
                `;
        }
    } else if (size === 'small') {
        // Klein: Kompakt
        iframeSim.style.width = '100%';
        iframeSim.style.maxWidth = '200px';
        iframeSim.style.minHeight = '150px';
        iframeSim.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        iframeSim.style.borderRadius = '12px';
        iframeSim.style.display = 'flex';
        iframeSim.style.flexDirection = 'column';
        iframeSim.style.justifyContent = 'center';
        iframeSim.style.alignItems = 'center';
        iframeSim.style.textAlign = 'center';
        iframeSim.style.padding = '1rem';
        iframeSim.style.border = '1px solid rgba(0,0,0,0.1)';

        if (isOpen) {
            content = `
                    <h4 style="margin: 0 0 0.5rem 0; font-size: 1.4rem; color: inherit; font-family: inherit;">${t.open}</h4>
                    <p style="margin: 0; font-size: 0.9rem; color: inherit; font-family: inherit;">${t.until} 19:00</p>
                `;
        } else {
            content = `
                    <h4 style="margin: 0 0 0.5rem 0; font-size: 1.4rem; color: inherit; font-family: inherit;">${t.closed}</h4>
                    <p style="margin: 0; font-size: 0.85rem; line-height: 1.5; color: inherit; font-family: inherit;">${t.opens} ${t.mon} 06.01<br><span style="font-size: 1.2em; font-weight: 600;">08:00</span></p>
                `;
        }
    }

    iframeSim.innerHTML = content;
    previewBox.innerHTML = '';
    previewBox.appendChild(iframeSim);

    updateIframeUrl();
}

function updateIframeUrl() {
    const size = document.getElementById('previewSizeSelector').value;
    const lang = document.getElementById('previewLanguageSelector').value;
    const isOpen = document.getElementById('previewToggleBtn').textContent.trim() === 'Offen';
    const status = isOpen ? 'open' : 'closed';

    // Styles
    const bgOpen = encodeURIComponent(document.getElementById('bgColorOpen').value);
    const bgClosed = encodeURIComponent(document.getElementById('bgColorClosed').value);
    const textOpen = encodeURIComponent(document.getElementById('textColorOpen').value);
    const textClosed = encodeURIComponent(document.getElementById('textColorClosed').value);
    const fontOpen = encodeURIComponent(document.getElementById('fontFamilyOpen').value);
    const fontClosed = encodeURIComponent(document.getElementById('fontFamilyClosed').value);

    // Basis-URL (angenommen)
    const baseUrl = window.location.origin + '/homeIframe';

    // User ID holen (aus dem Hidden Field im HTML)
    const userId = document.getElementById('currentUserId') ? document.getElementById('currentUserId').value : '';

    // Parameter hinzufügen
    let url = `${baseUrl}?size=${size}&lang=${lang}&status=${status}&bgOpen=${bgOpen}&bgClosed=${bgClosed}&textOpen=${textOpen}&textClosed=${textClosed}&fontOpen=${fontOpen}&fontClosed=${fontClosed}`;

    if (userId) {
        url += `&uid=${userId}`;
    }

    document.getElementById('iframeUrlInput').value = url;
}

function copyIframeUrl() {
    const copyText = document.getElementById('iframeUrlInput');
    copyText.select();
    copyText.setSelectionRange(0, 99999); // Für mobile Geräte
    navigator.clipboard.writeText(copyText.value).then(() => {
        alert('URL kopiert: ' + copyText.value);
    });
}

// Globale Variable für mehrsprachige Beschreibungen
let beschreibungenCache = {
    de: '',
    en: '',
    fr: '',
    it: '',
    es: ''
};
let currentLanguage = 'de';

// Sprach-Labels
const languageLabels = {
    de: 'Deutsch',
    en: 'Englisch',
    fr: 'Französisch',
    it: 'Italienisch',
    es: 'Spanisch'
};

// Sprache wechseln
function switchLanguage() {
    // Aktuelle Beschreibung speichern, bevor wir wechseln
    const currentDesc = document.getElementById('outofplanDescription').value;
    beschreibungenCache[currentLanguage] = currentDesc;

    // Neue Sprache auswählen
    const selector = document.getElementById('languageSelector');
    currentLanguage = selector.value;

    // Label aktualisieren
    document.getElementById('currentLangLabel').textContent = languageLabels[currentLanguage];

    // Beschreibung für neue Sprache laden
    document.getElementById('outofplanDescription').value = beschreibungenCache[currentLanguage] || '';
}

// Ausserplanmässig speichern
async function saveOutofplan() {
    try {
        // Aktuelle Beschreibung im Cache speichern
        const currentDesc = document.getElementById('outofplanDescription').value;
        beschreibungenCache[currentLanguage] = currentDesc;

        // Daten sammeln
        const dateFrom = document.getElementById('outofplanDateFrom').value;
        const dateTo = document.getElementById('outofplanDateTo').value;
        // Default to full day since time inputs are removed
        const timeFrom = "00:00";
        const timeTo = "23:59";
        const toggleBtn = document.getElementById('toggleBtn');
        const offen = toggleBtn.textContent === 'Öffnen';

        // Validierung
        if (!dateFrom || !dateTo) {
            alert('Bitte füllen Sie alle Datumsfelder aus.');
            return;
        }

        // Prüfe ob Datum/Zeit in der Zukunft liegen
        const now = new Date();
        const dateTimeFromStr = `${dateFrom}T${timeFrom}`;
        const dateTimeToStr = `${dateTo}T${timeTo}`;
        const dateTimeFrom = new Date(dateTimeFromStr);
        const dateTimeTo = new Date(dateTimeToStr);

        // Relaxed validation: Allow today as long as it's not in the past relative to whole days (optional)
        // Or keep strict logic. Let's assume strict logic based on existing code.
        // But since we use 00:00 and 23:59, check against dates only if possible?
        // Existing code checked date+time. If timeFrom is 00:00, it effectively checks start of day.

        // If start date is today, 00:00 is technically in the past.
        // We should just check dates for "not in past before today"? 
        // Or simply allow "Today".
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDateFrom = new Date(dateFrom);

        if (inputDateFrom < today) {
            alert('Das Start-Datum muss in der Zukunft (oder heute) liegen.');
            return;
        }

        if (dateTimeTo <= now) {
            // If end date is today, 23:59 is future. So this check is fine.
            if (new Date(dateTo) < today) {
                alert('Das End-Datum muss in der Zukunft (oder heute) liegen.');
                return;
            }
        }

        if (dateTo < dateFrom) {
            alert('Das End-Datum muss nach oder gleich dem Start-Datum sein.');
            return;
        }

        // Nur Beschreibungen mit Inhalt übermitteln
        const beschreibungen = {};
        for (const [lang, text] of Object.entries(beschreibungenCache)) {
            if (text && text.trim() !== '') {
                beschreibungen[lang] = text.trim();
            }
        }

        const outofplanData = {
            datumVon: dateFrom,
            datumBis: dateTo,
            zeitVon: timeFrom,
            zeitBis: timeTo,
            offen: offen,
            beschreibungen: beschreibungen
        };

        const editId = document.getElementById('saveOutofplanBtn').dataset.editId;

        if (editId) {
            await fetch(`/api/iframe/outofplan/${editId}`, { method: 'DELETE' });
        }

        console.log('Sending outofplan data:', outofplanData);

        const response = await fetch('/api/iframe/outofplan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(outofplanData)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            alert('Fehler beim Speichern: ' + errorText);
            return;
        }

        const result = await response.json();
        console.log('Response result:', result);

        if (result.success) {
            alert('Ausserplanmässig erfolgreich gespeichert!');
            cancelOutofplan(); // Formular zurücksetzen
            await loadOutofplanEntries(); // Liste neu laden
        } else {
            alert('Fehler beim Speichern: ' + result.error);
        }
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Fehler beim Speichern: ' + error.message);
    }
}

// Formular abbrechen/zurücksetzen
function cancelOutofplan() {
    document.getElementById('outofplanDateFrom').value = '';
    document.getElementById('outofplanDateTo').value = '';
    // Time inputs removed
    // document.getElementById('outofplanTimeFrom').value = '';
    // document.getElementById('outofplanTimeTo').value = '';
    document.getElementById('outofplanDescription').value = '';
    document.getElementById('languageSelector').value = 'de';
    currentLanguage = 'de';

    // Cache zurücksetzen
    beschreibungenCache = {
        de: '',
        en: '',
        fr: '',
        it: '',
        es: ''
    };

    document.getElementById('currentLangLabel').textContent = 'Deutsch';
    document.getElementById('toggleBtn').textContent = 'Schliessen';

    // Reset Edit Mode
    const saveBtn = document.getElementById('saveOutofplanBtn');
    saveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Speichern';
    delete saveBtn.dataset.editId;
}
