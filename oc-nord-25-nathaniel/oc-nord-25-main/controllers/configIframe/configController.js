// controllers/configController.js
import { loadSettings, saveSettings, settings } from '../../models/settingsModel.js';
import { addOutOfPlan } from '../../models/weekModel.js';
import * as view from '../../views/configIframe/config_IframeView.js';

export function init(root) {
    loadSettings();
    view.render(root, settings);
    view.updatePreview(settings);
    view.updateEmbed(settings);
    view.warnContrast(settings.hintergrundfarbe, settings.textfarbe);

    // Buttons
    root.querySelector('#save').addEventListener('click', () => {
        const form = view.readForm();
        saveSettings(form);
        view.updatePreview(settings);
        view.updateEmbed(settings);
        view.warnContrast(settings.hintergrundfarbe, settings.textfarbe);
        toast('Konfiguration gespeichert');
    });

    root.querySelector('#previewBtn').addEventListener('click', () => {
        const form = view.readForm();
        saveSettings(form); // als Draft lokal sichern
        view.updatePreview(settings);
        view.updateEmbed(settings);
    });

    root.querySelector('#aSave').addEventListener('click', () => {
        const item = view.readOutOfPlan();
        addOutOfPlan(item);
        toast('Ausserplanmässiger Eintrag gespeichert');
    });

    // Live-Kontrast beim Farbwechsel
    ['#bg', '#text'].forEach(sel => {
        root.querySelector(sel).addEventListener('input', () => {
            const form = view.readForm();
            view.warnContrast(form.hintergrundfarbe, form.textfarbe);
        });
    });
}

function toast(msg) { console.log(msg); }
