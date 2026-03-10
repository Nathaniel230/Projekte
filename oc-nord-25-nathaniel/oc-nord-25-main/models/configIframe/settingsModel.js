// models/settingsModel.js
const STORAGE_KEY = 'oc_settings';

export let settings = {
    customerId: 'demo-tenant',
    name: 'Mein Betrieb',
    zeitzone: 1,                       // Europe/Zurich etc. (später per Map)
    hintergrundfarbe: '#ffffff',
    textfarbe: '#222222',
    schriftart: 'Arial',
    vorauswahlen: true,
    iframeSize: 'auto',                // auto | small | medium | large | custom
    customW: '',                       // nur bei custom
    customH: '',
    flags: { onlyStatus: false, onlyDay: false, showWeek: true, showReason: false },
    language: 'de'
};

export function loadSettings() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) settings = { ...settings, ...JSON.parse(raw) };
    return settings;
}

export function saveSettings(patch) {
    settings = { ...settings, ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return settings;
}
