// views/week-editorView.js
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function render(root, data) {
    root.innerHTML = `
    <section>
      <h2>Wochenplan-Editor</h2>
      <div id="weekTable" class="week-grid">
        ${DAYS.map((d, i) => `
          <div class="day-col" data-day="${i + 1}">
            <h4>${d}</h4>
            <div class="slots"></div>
            <button class="addSlot">+ Öffnung</button>
          </div>
        `).join('')}
      </div>

      <h3>Neuer Spezialtag</h3>
      <div class="row">
        <input type="date" id="sFrom"><input type="date" id="sTo">
        <select id="sOpen"><option value="true">Öffnen (nach Standard)</option><option value="false">Schliessen</option></select>
        <input id="sReason" placeholder="Grund (DE)">
        <button id="sAdd">Speichern</button>
      </div>

      <h3>Nächste Spezialtage</h3>
      <div id="specialList"></div>

      <div class="row"><button id="saveWeek">Speichern</button></div>
    </section>`;

    // bestehende Slots rendern
    Object.entries(data.week).forEach(([day, slots]) => {
        const col = document.querySelector(`.day-col[data-day="${day}"] .slots`);
        slots.forEach(s => col.insertAdjacentHTML('beforeend', slotRowHtml(s.start, s.end)));
    });
}

export function wireHandlers({ onAddSlot, onSaveWeek, onAddSpecial, onDeleteSpecial }) {
    document.querySelectorAll('.addSlot').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = +btn.closest('.day-col').dataset.day;
            const slotsDiv = btn.previousElementSibling;
            slotsDiv.insertAdjacentHTML('beforeend', slotRowHtml());
            onAddSlot?.(day);
        });
    });

    document.querySelector('#saveWeek').addEventListener('click', () => onSaveWeek(readWeekFromDom()));

    document.querySelector('#sAdd').addEventListener('click', () => {
        const item = {
            from: document.querySelector('#sFrom').value,
            to: document.querySelector('#sTo').value,
            allDay: true,
            start: null,
            end: null,
            open: document.querySelector('#sOpen').value === 'true',
            reason: [{ lang: 'de', text: document.querySelector('#sReason').value.trim() }]
        };
        onAddSpecial(item);
    });

}

export function renderSpecials(list) {
    const host = document.querySelector('#specialList');
    host.innerHTML = list.length ? '' : '<p>Keine Einträge.</p>';
    list.forEach((it, idx) => {
        host.insertAdjacentHTML('beforeend', `
      <div class="special-item">
        <label><input type="checkbox" data-del-idx="${idx}"> ${it.from} – ${it.to} • ${it.open ? 'Offen' : 'Geschlossen'} • ${it.reason?.[0]?.text || ''}</label>
      </div>`);
    });
}

export function wireDeleteSpecials(onDelete) {
    document.querySelectorAll('[data-del-idx]').forEach(cb => {
        cb.addEventListener('change', () => onDelete(+cb.dataset.delIdx));
    });
}

// --- helpers (DOM <-> data)
function slotRowHtml(start = '', end = '') {
    return `<div class="slot"><input type="time" class="start" value="${start}"> – <input type="time" class="end" value="${end}"></div>`;
}

function readWeekFromDom() {
    const out = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    document.querySelectorAll('.day-col').forEach(col => {
        const day = +col.dataset.day;
        out[day] = Array.from(col.querySelectorAll('.slot')).map(s => ({
            start: s.querySelector('.start').value,
            end: s.querySelector('.end').value
        })).filter(x => x.start && x.end);
    });
    return out;
}
