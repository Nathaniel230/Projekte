let specialDays = [];
let outofplanEntries = [];

// Helper to get ISO week and year
function getISOWeekAndYear(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { week: weekNo, year: d.getUTCFullYear() };
}

const today = new Date();
const currentISO = getISOWeekAndYear(today);

let currentWeek = currentISO.week;
let currentYear = currentISO.year;

// Keep track of real current time for restrictions
const realCurrentWeek = currentISO.week;
const realCurrentYear = currentISO.year;

let standardWeekData = null;
let standardHasOpenButNoTimes = false;
let isStandardWeekMode = false;
let decoupledWeeks = {}; // Format: "year_week": true

// Globale Variable für mehrsprachige Gründe bei Spezialtagen
let specialReasonCache = {
    de: '',
    en: '',
    fr: '',
    it: '',
    es: ''
};
let currentSpecialLanguage = 'de';

// Sprach-Labels
const languageLabels = {
    de: 'Deutsch',
    en: 'Englisch',
    fr: 'Französisch',
    it: 'Italienisch',
    es: 'Spanisch'
};

// Set minimum date to today for date inputs
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('specialFromDate').min = today;
    document.getElementById('specialToDate').min = today;
}

let decoupledLoadPromise = null;

// Load decoupled weeks from API
async function loadDecoupledWeeks() {
    try {
        // Add timestamp to prevent caching
        const response = await fetch('/api/week/decoupled?t=' + new Date().getTime());
        if (response.ok) {
            decoupledWeeks = await response.json();
            console.log('Loaded decoupled weeks:', decoupledWeeks);
        }
    } catch (e) {
        console.error('Error loading decoupled weeks', e);
    }
}

// Load special days from API
async function loadSpecialDays() {
    try {
        const response = await fetch('/api/week/special-days');
        if (response.ok) {
            specialDays = await response.json();
            renderSpecialDays();
        }
    } catch (e) {
        console.error('Error loading special days', e);
    }
}

// Load out of plan entries from API
async function loadOutofplanEntries() {
    try {
        const response = await fetch('/api/iframe/outofplan');
        if (response.ok) {
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                outofplanEntries = result.data;
            } else {
                console.error('Invalid data format for outofplan entries', result);
                outofplanEntries = [];
            }
        }
    } catch (e) {
        console.error('Error loading out of plan entries', e);
        outofplanEntries = [];
    }
}

// Call setMinDate when page loads
document.addEventListener('DOMContentLoaded', async function () {
    setMinDate();
    decoupledLoadPromise = loadDecoupledWeeks();
    await decoupledLoadPromise;
    await loadSpecialDays();
    await loadOutofplanEntries();
    await loadStandardWeekData(); // Load standard week data for overview checks
    updateWeekDisplay();
    loadWeekData(); // Load initial data
});

async function loadStandardWeekData() {
    try {
        const response = await fetch('/api/week/0/0?t=' + new Date().getTime());
        if (response.ok) {
            const data = await response.json();
            standardWeekData = data.weekData || {};
            standardHasOpenButNoTimes = hasOpenDayWithoutTimesForStandard(standardWeekData);
            renderStandardWarning();
        }
    } catch (e) {
        console.error('Error loading standard week data', e);
    }
}

// Helper für Picker-Warnung: offen & keine Zeiten ODER unvollständige Slots
function hasOpenDayWithoutTimesForWarning(weekData) {
    if (!weekData) return false;
    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
    return days.some(day => {
        const d = weekData[day];
        if (!d) return false;
        if (d.closed) return false;
        const slots = d.timeSlots || [];
        if (slots.length === 0) return true; // offen aber gar keine Zeiten
        // Check for open/close (API) OR start/end (Legacy/UI)
        const hasValid = slots.some(s => s && ((s.open && s.close) || (s.start && s.end)));
        if (!hasValid) return true; // nur unvollständige Slots
        return false;
    });
}

// Helper für Standardwarnung: offen & (keine Zeiten oder unvollständige Slots)
function hasOpenDayWithoutTimesForStandard(weekData) {
    if (!weekData) return false;
    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
    return days.some(day => {
        const d = weekData[day];
        if (!d) return false;
        if (d.closed) return false;
        const slots = d.timeSlots || [];
        if (slots.length === 0) return true;
        const hasValid = slots.some(s => s && ((s.open && s.close) || (s.start && s.end)));
        return !hasValid;
    });
}

// Show warning near header when standard week has open days without times
function renderStandardWarning() {
    const box = document.getElementById('standard-week-warning');
    if (!box) return;

    if (standardHasOpenButNoTimes) {
        box.style.display = 'block';
        box.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> In der Standardwoche fehlt mindestens eine Öffnungszeit.';
    } else {
        box.style.display = 'none';
        box.innerHTML = '';
    }
}

function isPastWeek() {
    if (isStandardWeekMode) return false;
    return (currentYear < realCurrentYear) ||
        (currentYear === realCurrentYear && currentWeek < realCurrentWeek);
}

// Helper to get total ISO weeks in a year
function getWeeksInYear(year) {
    const d = new Date(year, 11, 28);
    return getISOWeekAndYear(d).week === 53 ? 53 : 52;
}

// Week navigation with proper date calculation
async function changeWeek(direction) {
    console.log('changeWeek called with direction:', direction, 'isStandardWeekMode:', isStandardWeekMode);

    // Don't change week if in standard mode
    if (isStandardWeekMode) {
        alert('Verlassen Sie zuerst den Standardwoche-Modus um zu anderen Wochen zu navigieren.');
        return;
    }

    // Prevent navigating before 2025
    if (direction < 0 && currentYear === 2025 && currentWeek === 1) {
        return;
    }

    currentWeek += direction;

    // Handle year transitions
    if (direction > 0) {
        const maxWeeks = getWeeksInYear(currentYear);
        if (currentWeek > maxWeeks) {
            currentWeek = 1;
            currentYear++;
        }
    } else {
        if (currentWeek < 1) {
            currentYear--;
            // Safety check: enforce min year 2025
            if (currentYear < 2025) {
                currentYear = 2025;
                currentWeek = 1;
            } else {
                currentWeek = getWeeksInYear(currentYear);
            }
        }
    }

    console.log('New currentWeek:', currentWeek, 'Year:', currentYear);
    updateWeekDisplay();
    loadWeekData();
}

function updateWeekDisplay() {
    const weekDisplay = document.getElementById('current-week');
    const decoupleContainer = document.getElementById('decouple-container');
    const decoupleCheckbox = document.getElementById('decouple-week-checkbox');

    if (isStandardWeekMode) {
        weekDisplay.textContent = 'STANDARDWOCHE';
        weekDisplay.style.backgroundColor = '#ffc107';
        weekDisplay.style.color = '#000';
        weekDisplay.style.cursor = 'default';
        weekDisplay.onclick = null;
        decoupleContainer.style.setProperty('display', 'none', 'important');

        // Reset to just day names for standard week
        const ths = document.querySelectorAll('.weekly-schedule thead th');
        const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
        ths.forEach((th, index) => {
            th.innerHTML = days[index];
        });
    } else {
        weekDisplay.textContent = `KW ${currentWeek} ${currentYear}`;
        weekDisplay.style.backgroundColor = 'white';
        weekDisplay.style.color = 'var(--bs-primary)';
        weekDisplay.style.cursor = 'pointer';
        weekDisplay.onclick = openWeekPicker;
        weekDisplay.title = "Klicken für Übersicht";

        // Show decouple control
        decoupleContainer.style.display = 'flex';
        decoupleContainer.style.setProperty('display', 'flex', 'important');

        // Never auto-check: only user action can check
        const key = `${currentYear}_${currentWeek}`;
        decoupleCheckbox.checked = !!decoupledWeeks[key];

        // Update dates in table headers
        const simpleDate = new Date(Date.UTC(currentYear, 0, 4));
        const dayOfWeek = simpleDate.getUTCDay() || 7;
        const week1Monday = new Date(simpleDate);
        week1Monday.setUTCDate(simpleDate.getUTCDate() - dayOfWeek + 1);
        const currentMonday = new Date(week1Monday);
        currentMonday.setUTCDate(currentMonday.getUTCDate() + (currentWeek - 1) * 7);

        const ths = document.querySelectorAll('.weekly-schedule thead th');
        const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

        ths.forEach((th, index) => {
            const date = new Date(currentMonday);
            date.setUTCDate(date.getUTCDate() + index);
            const dayStr = date.getUTCDate().toString().padStart(2, '0');
            const monthStr = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            th.innerHTML = `${days[index]} <br><small style="font-weight:normal; font-size:0.8em">${dayStr}.${monthStr}.</small>`;
        });
    }
}

function toggleDecoupleWeek() {
    const checkbox = document.getElementById('decouple-week-checkbox');
    const key = `${currentYear}_${currentWeek}`;
    console.log('Toggling decouple:', checkbox.checked, key);

    const targetState = checkbox.checked;

    // Optimistically update local state immediately
    if (targetState) {
        decoupledWeeks[key] = true;
    } else {
        delete decoupledWeeks[key];
    }

    // Force save with the specific decoupled state from the checkbox
    saveWeekData(targetState).then(success => {
        if (success) {
            console.log('Decouple/Recouple saved successfully');
            alert(targetState ? 'Woche wurde abgekoppelt und gesichert.' : 'Woche wurde wieder angekoppelt (Standardplan aktiv).');
        } else {
            console.error('Decouple/Recouple save failed');
            alert('Fehler beim Speichern des Entkoppelungs-Status.');
            // Revert UI on failure
            checkbox.checked = !targetState;
            if (!targetState) decoupledWeeks[key] = true; // Revert map
            else delete decoupledWeeks[key]; // Revert map
        }
    });
}

// Week Picker Logic
let pickerYear = new Date().getFullYear();
let weekPickerModal = null;

async function openWeekPicker() {
    if (isStandardWeekMode) return;

    // Clear decoupled weeks locally to avoid stale state
    decoupledWeeks = {};

    // Reload decoupled weeks to ensure we have the latest status and fix potential initial load issues
    try {
        await loadDecoupledWeeks();
    } catch (e) {
        console.error('Error reloading decoupled weeks:', e);
    }

    pickerYear = currentYear;
    if (!weekPickerModal) {
        weekPickerModal = new bootstrap.Modal(document.getElementById('weekPickerModal'));
    }
    renderWeekPicker();
    weekPickerModal.show();
}

function changePickerYear(delta) {
    const newYear = pickerYear + delta;
    if (newYear < 2025) return;
    pickerYear = newYear;
    renderWeekPicker();
}

function renderWeekPicker() {
    document.getElementById('pickerYearDisplay').textContent = pickerYear;
    const grid = document.getElementById('weekGrid');
    grid.innerHTML = '';

    // Calculate total weeks in this year (usually 52, sometimes 53)
    // Simple approximation: check if Dec 28th is in week 53
    const d = new Date(pickerYear, 11, 28);
    const totalWeeks = getISOWeekAndYear(d).week === 53 ? 53 : 52;

    for (let i = 1; i <= totalWeeks; i++) {
        const col = document.createElement('div');
        // 10 weeks per row = 10% width
        col.style.width = '10%';
        col.style.padding = '0.25rem';

        const btn = document.createElement('button');
        btn.className = 'btn w-100 p-2 btn-sm';
        btn.textContent = i;

        // Styling based on state
        const isCurrent = (i === currentWeek && pickerYear === currentYear);
        const isRealCurrent = (i === realCurrentWeek && pickerYear === realCurrentYear);
        const isPast = (pickerYear < realCurrentYear) || (pickerYear === realCurrentYear && i < realCurrentWeek);
        const isDecoupled = decoupledWeeks[`${pickerYear}_${i}`];
        const hasWarning = checkWeekWarning(pickerYear, i);

        let skipHighlight = false;

        if (isCurrent) {
            btn.classList.add('btn-primary');
        } else if (isRealCurrent) {
            btn.classList.add('btn-outline-primary');
            btn.style.borderWidth = '2px';
        } else if (isPast) {
            btn.classList.add('btn-outline-secondary', 'text-muted');
            skipHighlight = true;
        } else {
            btn.classList.add('btn-outline-secondary');
        }

        if (!skipHighlight && hasWarning) {
            btn.classList.remove('btn-outline-secondary', 'btn-light', 'text-muted');
            btn.classList.add('btn-warning');
            btn.title = "Warnung: Öffnungszeiten fehlen!";
            if (isCurrent) {
                // If current is warning, maybe show a border or something?
                // But current is primary (blue). Let's keep it blue but add warning icon or border?
                // User asked for "yellow".
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-warning');
                btn.style.border = '2px solid var(--bs-primary)';
            }
        }

        if (!skipHighlight && isDecoupled) {
            if (!hasWarning) {
                btn.style.backgroundColor = '#e3f2fd'; // Light blue background for decoupled
                if (isCurrent) btn.style.backgroundColor = 'var(--bs-primary)'; // Keep primary if selected
            }
            btn.style.borderColor = '#90caf9';
            if (!btn.title) btn.title = "Entkoppelt von Standardwoche";
        }

        btn.onclick = () => selectWeek(pickerYear, i);

        col.appendChild(btn);
        grid.appendChild(col);
    }
}

function checkWeekWarning(year, week) {
    // Removed live DOM check to ensure consistent behavior with standard week warnings
    /*
    if (year === currentYear && week === currentWeek) {
        const warnings = document.querySelectorAll('.warning-overlay');
        if (warnings.length > 0) return true;
    }
    */

    const decoupledInfo = decoupledWeeks[`${year}_${week}`];
    let isDecoupled = false;
    let daysWithTimes = [];

    // Warn if decoupled and open-but-no-times detected
    if (decoupledInfo && decoupledInfo.hasOpenButNoTimes) {
        return true;
    }

    if (decoupledInfo) {
        isDecoupled = true;
        if (typeof decoupledInfo === 'object' && 'daysWithTimes' in decoupledInfo) {
            daysWithTimes = decoupledInfo.daysWithTimes;
        } else if (typeof decoupledInfo === 'object' && 'hasTimes' in decoupledInfo) {
            // Legacy fallback
            if (decoupledInfo.hasTimes) {
                // We don't know which days, so we assume all to avoid false positives
                // Or we assume none? Better to assume none if we want to be strict.
                // But let's stick to the new logic: if we don't have the list, we can't verify.
                // Let's assume it's fine if hasTimes is true, but this is imperfect.
                // Ideally we reload.
                daysWithTimes = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
            }
        } else {
            // Fallback for locally toggled or legacy data
            daysWithTimes = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
        }
    } else {
        if (!standardWeekData) return false;
        // If standard week has warnings, coupled weeks should NOT show warning (as per user request)
        // if (standardHasOpenButNoTimes) return true;
    }

    // Calculate dates for this week
    // ISO 8601: Week 1 is the week with the first Thursday of the year (Jan 4th is always in Week 1)
    const simpleDate = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = simpleDate.getUTCDay() || 7; // 1=Mon, 7=Sun
    const week1Monday = new Date(simpleDate);
    week1Monday.setUTCDate(simpleDate.getUTCDate() - dayOfWeek + 1);

    const currentMonday = new Date(week1Monday);
    currentMonday.setUTCDate(currentMonday.getUTCDate() + (week - 1) * 7);

    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentMonday);
        date.setUTCDate(date.getUTCDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[i];

        // Check Special Days
        const specialDay = specialDays.find(sd => dateStr >= sd.fromDate && dateStr <= sd.toDate);
        if (specialDay && specialDay.status === 'offen') {
            if (isDecoupled) {
                if (!daysWithTimes.includes(dayName)) return true;
            } else {
                // If forced open, check if standard week has times
                const dayData = standardWeekData[dayName];
                // If dayData is closed OR has no time slots
                if (!dayData || dayData.closed || !dayData.timeSlots || dayData.timeSlots.length === 0) {
                    return true;
                }
            }
        }

        // Check Out of Plan
        if (Array.isArray(outofplanEntries)) {
            const outofplan = outofplanEntries.find(entry => {
                if (!entry.datumVon || !entry.datumBis) return false;
                const from = entry.datumVon.split('T')[0];
                const to = entry.datumBis.split('T')[0];
                return dateStr >= from && dateStr <= to && entry.offen;
            });

            if (outofplan) {
                if (isDecoupled) {
                    if (!daysWithTimes.includes(dayName)) return true;
                } else {
                    const dayData = standardWeekData[dayName];
                    if (!dayData || dayData.closed || !dayData.timeSlots || dayData.timeSlots.length === 0) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

async function selectWeek(year, week) {
    currentYear = year;
    currentWeek = week;

    // Close modal
    weekPickerModal.hide();

    // Update view
    updateWeekDisplay();
    loadWeekData();
}

function checkPastRestriction() {
    const container = document.querySelector('.weekly-schedule');
    const inputs = container.querySelectorAll('input, button');
    const isPast = isPastWeek();

    inputs.forEach(el => {
        el.disabled = isPast;
    });

    if (isPast) {
        container.style.opacity = '0.6';
        container.title = "Vergangene Wochen können nicht bearbeitet werden";
    } else {
        container.style.opacity = '1';
        container.title = "";
        // Re-apply closed day styling if needed
        const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
        days.forEach(day => {
            const checkbox = document.getElementById(`${day}-closed`);
            if (checkbox && checkbox.checked) {
                toggleDayClosed(day);
            }
        });
    }
}

// Toggle standard week mode
async function toggleStandardWeekMode() {
    const checkbox = document.getElementById('standard-week-checkbox');
    const saveBtn = document.getElementById('save-standard-btn');
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');

    isStandardWeekMode = checkbox.checked;

    if (isStandardWeekMode) {
        // Switch to standard week mode
        saveBtn.style.display = 'inline-block';
        prevBtn.style.display = 'none'; // Hide previous week button
        nextBtn.style.display = 'none'; // Hide next week button

        // Load existing standard week data
        try {
            const response = await fetch('/api/week/0/0');
            if (response.ok) {
                const data = await response.json();
                loadDataIntoForm(data.weekData || {});
                applySpecialDaysLogic(); // Clear overlays
            }
        } catch (e) {
            console.error('Error loading standard week', e);
        }
    } else {
        // Switch back to normal week mode
        saveBtn.style.display = 'none';
        prevBtn.style.display = 'inline-block'; // Show previous week button
        nextBtn.style.display = 'inline-block'; // Show next week button
        loadWeekData(); // Load current week data
    }

    updateWeekDisplay();
    // Ensure restriction check runs after toggling
    if (!isStandardWeekMode) {
        checkPastRestriction();
    } else {
        // Enable everything in standard mode
        const container = document.querySelector('.weekly-schedule');
        const inputs = container.querySelectorAll('input, button');
        inputs.forEach(el => el.disabled = false);
        container.style.opacity = '1';
        // Re-apply closed day styling
        const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
        days.forEach(day => {
            const checkbox = document.getElementById(`${day}-closed`);
            if (checkbox && checkbox.checked) {
                toggleDayClosed(day);
            }
        });

        // Remove special day overlays in standard mode
        document.querySelectorAll('.special-day-overlay').forEach(el => el.remove());
    }
}

// Save current configuration as standard week
async function saveStandardWeek() {
    if (!isStandardWeekMode) {
        alert('Bitte aktivieren Sie zuerst den Standardwoche-Modus.');
        return;
    }

    const weekData = getCurrentWeekData();

    try {
        const response = await fetch('/api/week/standard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekData, currentYear })
        });

        if (response.ok) {
            standardHasOpenButNoTimes = hasOpenDayWithoutTimesForStandard(weekData);
            renderStandardWarning();
            alert('✅ Standardwoche gespeichert und für alle Kalenderwochen übernommen!');
        } else {
            alert('Fehler beim Speichern der Standardwoche.');
        }
    } catch (e) {
        console.error(e);
        alert('Fehler beim Speichern.');
    }
}

// Get current week data from form
function getCurrentWeekData() {
    const data = {};
    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

    days.forEach(day => {
        const checkbox = document.getElementById(`${day}-closed`);
        const container = document.querySelector(`#${day}-cell .time-slots-container`);

        if (checkbox.checked) {
            data[day] = { closed: true };
        } else {
            const timeSlots = [];
            const slots = container.querySelectorAll('.time-slot');

            slots.forEach(slot => {
                const inputs = slot.querySelectorAll('input[type="time"]');
                if (inputs[0].value && inputs[1].value) {
                    timeSlots.push({
                        open: inputs[0].value,
                        close: inputs[1].value
                    });
                }
            });

            data[day] = { closed: false, timeSlots: timeSlots };
        }
    });

    return data;
}

// Load data into form
function loadDataIntoForm(data) {
    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

    // Determine if we are in the current real-time week
    const isCurrentRealWeek = (currentYear === realCurrentYear && currentWeek === realCurrentWeek);
    // Get today's index (0=Monday, 6=Sunday)
    let todayIndex = new Date().getDay() - 1;
    if (todayIndex === -1) todayIndex = 6;

    // Check if editing should be globally allowed for this week
    const key = `${currentYear}_${currentWeek}`;
    const isDecoupled = decoupledWeeks[key] || false;

    // Logic: 
    // If standard mode -> Editable
    // If specific week -> Editable ONLY if Decoupled checked
    const isWeekLocked = !isStandardWeekMode && !isDecoupled;

    days.forEach((day, dayIndex) => {
        const checkbox = document.getElementById(`${day}-closed`);
        const container = document.querySelector(`#${day}-cell .time-slots-container`);
        const addButton = document.querySelector(`button[onclick="addOpening('${day}')"]`);

        // Check if this day is in the past relative to today (only applies if we are in the current week AND not in standard mode)
        let isPastDay = false;
        // Leverage isPastDay to also lock inputs if week is locked
        if ((!isStandardWeekMode && isCurrentRealWeek && (dayIndex < todayIndex)) || isWeekLocked) {
            isPastDay = true;
        }

        // Clear existing time slots
        container.innerHTML = '';

        if (data[day] && data[day].closed) {
            checkbox.checked = true;
            toggleDayClosed(day);
        } else {
            checkbox.checked = false;

            const timeSlots = data[day] ? data[day].timeSlots : [{}];
            if (timeSlots.length === 0) timeSlots.push({}); // Ensure at least one slot

            timeSlots.forEach((slot, index) => {
                const newSlot = document.createElement('div');
                // Use mt-2 for subsequent slots to match addOpening behavior and ensure proper spacing
                newSlot.className = index > 0 ? 'time-slot mt-2' : 'time-slot';

                // Disable inputs if past day
                const disabledAttr = isPastDay ? 'disabled' : '';
                const readOnlyStyle = isPastDay ? 'background-color: #e9ecef; cursor: not-allowed;' : '';

                newSlot.innerHTML = `
                    <input type="time" class="form-control mb-2" placeholder="Öffnet" value="${slot.open || ''}" onchange="validateTimeSlot(this)" ${disabledAttr} style="${readOnlyStyle}">
                    <input type="time" class="form-control mb-2" placeholder="Schliesst" value="${slot.close || ''}" onchange="validateTimeSlot(this)" ${disabledAttr} style="${readOnlyStyle}">
                    ${index > 0 && !isPastDay ? `<button class="btn btn-outline-danger btn-sm remove-slot" 
                        onclick="removeTimeSlot('${day}', this)" title="Zeitslot entfernen">
                        🗑️ Entfernen
                    </button>` : ''}
                `;
                container.appendChild(newSlot);
            });

            toggleDayClosed(day); // Apply styling
        }

        // Disable main controls for past days
        if (isPastDay) {
            checkbox.disabled = true;
            if (addButton) addButton.disabled = true;
            // Add visual indicator
            const cell = document.getElementById(`${day}-cell`);
            if (cell) {
                cell.style.opacity = '0.7';
                cell.title = isWeekLocked ? "Bitte Woche entkoppeln, um Änderungen vorzunehmen." : "Vergangene Tage können nicht bearbeitet werden.";
            }
        } else {
            checkbox.disabled = false;
            if (addButton) addButton.disabled = false;
            const cell = document.getElementById(`${day}-cell`);
            if (cell) {
                cell.style.opacity = '1';
                cell.title = "";
            }
        }
    });
}

// Save/load week data
async function saveWeekData(explicitDecoupledState = null) {
    const weekData = getCurrentWeekData();
    const key = `${currentYear}_${currentWeek}`;

    let isDecoupled;
    if (explicitDecoupledState !== null) {
        isDecoupled = explicitDecoupledState;
    } else {
        // Fallback to reading the map (checking keys or object presence)
        // !!decoupledWeeks[key] works whether it's boolean true or an object
        isDecoupled = !!decoupledWeeks[key];
    }

    console.log('Saving week:', key, 'Decoupled:', isDecoupled, 'Explicit:', explicitDecoupledState);

    // Update local cache structure if we are decoupled
    if (isDecoupled) {
        const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
        const daysWithTimes = days.filter(day => {
            const d = weekData[day];
            return d && !d.closed && d.timeSlots && d.timeSlots.length > 0;
        });

        const hasOpenButNoTimes = hasOpenDayWithoutTimesForWarning(weekData);

        decoupledWeeks[key] = {
            decoupled: true,
            daysWithTimes: daysWithTimes,
            hasOpenButNoTimes: hasOpenButNoTimes
        };
    } else {
        delete decoupledWeeks[key];
    }

    try {
        const response = await fetch(`/api/week/${currentYear}/${currentWeek}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekData, decoupled: isDecoupled })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Reload to refresh warnings and UI state
        // This ensures the checkbox reflects the TRUE server state
        await loadWeekData();

        return true;
    } catch (e) {
        console.error('Error saving week', e);
        return false;
    }
}

async function loadWeekData() {
    checkPastRestriction();
    try {
        const response = await fetch(`/api/week/${currentYear}/${currentWeek}`);
        if (response.ok) {
            const data = await response.json();
            const key = `${currentYear}_${currentWeek}`;

            // Zeige echten Backend-Status: entkoppelte Wochen werden markiert.
            // WICHTIG: Die aktuelle Woche wird NICHT mehr automatisch als entkoppelt dargestellt.
            // Der User muss explizit entkoppeln und speichern.
            if (data.decoupled) {
                const weekData = data.weekData || {};
                const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
                const daysWithTimes = days.filter(day => {
                    const d = weekData[day];
                    return d && !d.closed && d.timeSlots && d.timeSlots.length > 0;
                });
                const hasOpenButNoTimes = hasOpenDayWithoutTimesForWarning(weekData);

                decoupledWeeks[key] = {
                    decoupled: true,
                    daysWithTimes,
                    hasOpenButNoTimes
                };
            } else {
                delete decoupledWeeks[key];
            }

            loadDataIntoForm(data.weekData || {});
            updateWeekDisplay();
        } else {
            loadDataIntoForm({});
        }
    } catch (e) {
        console.error('Error loading week', e);
        loadDataIntoForm({});
    }

    // Check for special days overlay
    applySpecialDaysLogic();
}

function addOpening(day) {
    // Check for past day
    const isCurrentRealWeek = (currentYear === realCurrentYear && currentWeek === realCurrentWeek);
    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
    const dayIndex = days.indexOf(day);
    let todayIndex = new Date().getDay() - 1;
    if (todayIndex === -1) todayIndex = 6;

    if (isCurrentRealWeek && dayIndex < todayIndex) {
        return; // Do nothing for past days
    }

    const container = document.querySelector(`#${day}-cell .time-slots-container`);
    const slots = container.querySelectorAll('.time-slot');

    // Create new time slot
    const newSlot = document.createElement('div');
    newSlot.className = 'time-slot mt-2';
    newSlot.innerHTML = `
        <input type="time" class="form-control mb-2" placeholder="Öffnet" onchange="validateTimeSlot(this)">
        <input type="time" class="form-control mb-2" placeholder="Schliesst" onchange="validateTimeSlot(this)">
        <button class="btn btn-outline-danger btn-sm remove-slot" 
            onclick="removeTimeSlot('${day}', this)" title="Zeitslot entfernen">
            🗑️ Entfernen
        </button>
    `;

    container.appendChild(newSlot);
}

function removeTimeSlot(day, buttonElement) {
    const timeSlot = buttonElement.closest('.time-slot');
    const container = timeSlot.parentNode;

    // Don't remove the first time slot (always keep at least one)
    if (container.querySelectorAll('.time-slot').length > 1) {
        timeSlot.remove();
    }
}

function toggleDayClosed(dayName) {
    const checkbox = document.getElementById(`${dayName}-closed`);
    const container = document.querySelector(`#${dayName}-cell .time-slots-container`);

    // Determine if we are in the current real-time week
    const isCurrentRealWeek = (currentYear === realCurrentYear && currentWeek === realCurrentWeek);

    // Calculate isPastDay
    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
    const dayIndex = days.indexOf(dayName);
    let todayIndex = new Date().getDay() - 1;
    if (todayIndex === -1) todayIndex = 6;

    const isPastDay = !isStandardWeekMode && isCurrentRealWeek && (dayIndex < todayIndex);

    // If past week OR past day in current week, keep disabled
    if (isPastWeek() || isPastDay) {
        container.style.opacity = '0.5';
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);
        return;
    }

    if (checkbox.checked) {
        container.style.opacity = '0.5';
        // Disable inputs
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);
    } else {
        container.style.opacity = '1';
        // Re-enable inputs
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => input.disabled = false);
    }
}

function toggleSpecialDayForm() {
    const form = document.getElementById('specialDayForm');
    const btn = document.getElementById('newSpecialDayBtn');

    if (form.style.display === 'none') {
        // Opening form
        clearSpecialDayForm(); // Ensure clean state for new entry
        form.style.display = 'block';
        btn.style.display = 'none'; // Hide button while form is open
        setMinDate(); // Reset min date when opening form
    } else {
        // Closing form
        form.style.display = 'none';
        btn.style.display = 'block'; // Show button again
    }
}

// Sprache wechseln für Spezialtage
function switchSpecialLanguage() {
    // Aktuelle Grund-Beschreibung speichern, bevor wir wechseln
    const currentReason = document.getElementById('specialReason').value;
    specialReasonCache[currentSpecialLanguage] = currentReason;

    // Neue Sprache auswählen
    const selector = document.getElementById('specialLanguageSelector');
    currentSpecialLanguage = selector.value;

    // Label aktualisieren
    document.getElementById('currentSpecialLangLabel').textContent = languageLabels[currentSpecialLanguage];

    // Grund für neue Sprache laden
    document.getElementById('specialReason').value = specialReasonCache[currentSpecialLanguage] || '';
}

function cancelSpecialDay() {
    document.getElementById('specialDayForm').style.display = 'none';
    document.getElementById('newSpecialDayBtn').style.display = 'block'; // Show button again
    clearSpecialDayForm();
}

function clearSpecialDayForm() {
    document.getElementById('specialFromDate').value = '';
    document.getElementById('specialToDate').value = '';
    document.getElementById('specialStatus').value = 'offen';
    document.getElementById('specialReason').value = '';
    document.getElementById('specialLanguageSelector').value = 'de';
    currentSpecialLanguage = 'de';

    // Clear edit ID
    delete document.getElementById('specialDayForm').dataset.editId;

    // Cache zurücksetzen
    specialReasonCache = {
        de: '',
        en: '',
        fr: '',
        it: '',
        es: ''
    };

    document.getElementById('currentSpecialLangLabel').textContent = 'Deutsch';
    document.getElementById('saveSpecialDayBtn').textContent = 'Speichern';
}

async function saveSpecialDay() {
    const fromDate = document.getElementById('specialFromDate').value;
    const toDate = document.getElementById('specialToDate').value;
    const status = document.getElementById('specialStatus').value;
    const reason = document.getElementById('specialReason').value;
    const editId = document.getElementById('specialDayForm').dataset.editId;

    if (!fromDate || !toDate) {
        alert('Bitte füllen Sie alle Datumsfelder aus.');
        return;
    }

    // Validate dates are not in the past
    const today = new Date().toISOString().split('T')[0];
    if (fromDate < today || toDate < today) {
        alert('Das Datum darf nicht in der Vergangenheit liegen.');
        return;
    }

    // Validate toDate is not before fromDate
    if (toDate < fromDate) {
        alert('Das "Bis"-Datum muss nach oder gleich dem "Von"-Datum sein.');
        return;
    }

    // Validate reason length
    if (reason && reason.length > 50) {
        alert('Der Grund darf maximal 50 Zeichen lang sein.');
        return;
    }

    // Capture current reason into cache
    specialReasonCache[currentSpecialLanguage] = reason;

    // Filter out empty strings from cache to ensure we only save valid data
    const cleanReasons = {};
    Object.keys(specialReasonCache).forEach(key => {
        if (specialReasonCache[key] && specialReasonCache[key].trim() !== '') {
            cleanReasons[key] = specialReasonCache[key].trim();
        }
    });

    // Prefer German for the display 'reason' property, otherwise use current or first available
    let displayReason = '';
    if (cleanReasons['de']) {
        displayReason = cleanReasons['de'];
    } else if (cleanReasons[currentSpecialLanguage]) {
        displayReason = cleanReasons[currentSpecialLanguage];
    } else {
        const values = Object.values(cleanReasons);
        if (values.length > 0) {
            displayReason = values[0];
        }
    }

    const specialDayData = {
        id: editId ? editId : Date.now(), // Use existing ID if editing
        fromDate,
        toDate,
        status,
        reason: displayReason,
        reasons: cleanReasons
    };

    if (editId) {
        // Update existing
        const index = specialDays.findIndex(d => d.id == editId);
        if (index !== -1) {
            specialDays[index] = specialDayData;
        }
    } else {
        // Create new
        specialDays.push(specialDayData);
    }

    // Auto-save to backend
    await persistSpecialDays();

    // Reload special days from backend to ensure IDs and state are synced
    await loadSpecialDays();

    cancelSpecialDay();

    // Reload week view to show changes
    loadWeekData();
}

function renderSpecialDays() {
    const container = document.getElementById('specialDaysList');

    // Filter past days (keep days that end today or in the future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSpecialDays = specialDays.filter(day => {
        const endDate = new Date(day.toDate);
        // Reset time part of endDate to ensure fair comparison
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
    });

    if (activeSpecialDays.length === 0) {
        container.innerHTML = '<p class="text-muted">Keine aktuellen Spezialtage erfasst</p>';
        return;
    }

    let html = '<table class="table table-striped table-hover"><thead><tr><th>Datum</th><th>Status</th><th>Grund</th><th>Aktion</th><th>✓</th></tr></thead><tbody>';

    activeSpecialDays.forEach(day => {
        const dateDisplay = day.fromDate === day.toDate ? day.fromDate : `${day.fromDate} - ${day.toDate}`;
        // Ensure ID is treated as string for the function call
        const idStr = String(day.id);
        html += `
            <tr onclick="editSpecialDay('${idStr}')" style="cursor: pointer;" title="Klicken zum Bearbeiten">
                <td>${dateDisplay}</td>
                <td><span class="badge ${day.status === 'offen' ? 'bg-success' : 'bg-danger'}">${day.status}</span></td>
                <td>${day.reason || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); editSpecialDay('${idStr}')" title="Bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
                <td onclick="event.stopPropagation()"><input type="checkbox" value="${idStr}"></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function deleteSelectedSpecialDays() {
    const checkboxes = document.querySelectorAll('#specialDaysList input[type="checkbox"]:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => {
        // Handle both string IDs (from DB) and number IDs (from Date.now())
        const val = cb.value;
        return isNaN(val) ? val : parseInt(val);
    });

    specialDays = specialDays.filter(day => !idsToDelete.includes(day.id));

    // Auto-save to backend
    await persistSpecialDays();

    // Reload special days from backend to ensure IDs and state are synced
    await loadSpecialDays();

    // Reload week view to show changes
    loadWeekData();
}

async function persistSpecialDays() {
    try {
        const response = await fetch('/api/week/special-days', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ specialDays })
        });
        if (!response.ok) {
            console.error('Failed to save special days', response.status);
        }
    } catch (e) {
        console.error('Error saving special days', e);
    }
}

async function saveAll() {
    // Save special days (always)
    await persistSpecialDays();

    if (isStandardWeekMode) {
        await saveStandardWeek();
    } else {
        // Save current week data
        if (!isPastWeek()) {
            const success = await saveWeekData();
            if (success) {
                alert(`✅ Änderungen für KW ${currentWeek} ${currentYear} gespeichert!`);
            } else {
                alert(`❌ Fehler beim Speichern für KW ${currentWeek} ${currentYear}. Bitte versuchen Sie es erneut.`);
            }
        } else {
            alert(`✅ Spezialtage gespeichert! (Wochenplan in der Vergangenheit nicht änderbar)`);
        }
    }
}

function validateTimeSlot(input) {
    const slotDiv = input.closest('.time-slot');
    const inputs = slotDiv.querySelectorAll('input[type="time"]');
    const start = inputs[0].value;
    const end = inputs[1].value;

    // 1. Check if end time is before start time (same slot)
    if (start && end && end <= start) {
        alert('Die Endzeit muss nach der Startzeit liegen.');
        inputs[1].value = ''; // Reset end time
        return;
    }

    // 2. Check for overlap with previous slot
    const container = slotDiv.closest('.time-slots-container');
    const allSlots = Array.from(container.querySelectorAll('.time-slot'));
    const currentIndex = allSlots.indexOf(slotDiv);

    if (currentIndex > 0) {
        const prevSlot = allSlots[currentIndex - 1];
        const prevInputs = prevSlot.querySelectorAll('input[type="time"]');
        const prevEnd = prevInputs[1].value;

        if (start && prevEnd && start < prevEnd) {
            alert(`Der neue Zeitraum darf nicht vor dem Ende des vorherigen Zeitraums (${prevEnd}) beginnen.`);
            inputs[0].value = ''; // Reset start time
            return;
        }
    }
    
    // 3. Check if next slot starts before this ends (if user edits a middle slot)
    if (currentIndex < allSlots.length - 1) {
        const nextSlot = allSlots[currentIndex + 1];
        const nextInputs = nextSlot.querySelectorAll('input[type="time"]');
        const nextStart = nextInputs[0].value;

        if (end && nextStart && end > nextStart) {
            alert(`Dieser Zeitraum darf nicht nach dem Start des nächsten Zeitraums (${nextStart}) enden.`);
            inputs[1].value = ''; // Reset end time
            return;
        }
    }
}

function editSpecialDay(id) {
    // Find day by ID (handle both string and number IDs)
    const day = specialDays.find(d => d.id == id);
    if (!day) return;

    document.getElementById('specialFromDate').value = day.fromDate;
    document.getElementById('specialToDate').value = day.toDate;
    document.getElementById('specialStatus').value = day.status;

    // Handle reasons/languages
    specialReasonCache = day.reasons || { de: day.reason };
    currentSpecialLanguage = 'de';
    document.getElementById('specialLanguageSelector').value = 'de';
    document.getElementById('specialReason').value = specialReasonCache['de'] || '';
    document.getElementById('currentSpecialLangLabel').textContent = 'Deutsch';

    // Store ID being edited
    document.getElementById('specialDayForm').dataset.editId = day.id;
    document.getElementById('saveSpecialDayBtn').textContent = 'Aktualisieren';

    // Hide "New" button
    document.getElementById('newSpecialDayBtn').style.display = 'none';

    // Show form
    document.getElementById('specialDayForm').style.display = 'block';
    // Scroll to form
    document.getElementById('specialDayForm').scrollIntoView({ behavior: 'smooth' });
}

function applySpecialDaysLogic() {
    console.log('applySpecialDaysLogic called');
    const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

    // Always clear existing overlays first
    days.forEach(dayName => {
        const cell = document.getElementById(`${dayName}-cell`);
        if (cell) {
            cell.querySelectorAll('.special-day-overlay, .outofplan-overlay, .warning-overlay').forEach(el => el.remove());
            cell.classList.remove('bg-warning-subtle');
        }
    });

    // Logic applies to both standard and decoupled weeks when viewing them
    if (isStandardWeekMode) return;

    // Ensure currentWeek/currentYear are valid
    if (!currentWeek || !currentYear) return;

    // Calculate Monday of Week 1 for currentYear
    // ISO 8601: Week 1 is the week with the first Thursday of the year (Jan 4th is always in Week 1)
    const simpleDate = new Date(Date.UTC(currentYear, 0, 4));
    const dayOfWeek = simpleDate.getUTCDay() || 7; // 1=Mon, 7=Sun
    const week1Monday = new Date(simpleDate);
    week1Monday.setUTCDate(simpleDate.getUTCDate() - dayOfWeek + 1);

    // Calculate Monday of current week
    const currentMonday = new Date(week1Monday);
    currentMonday.setUTCDate(currentMonday.getUTCDate() + (currentWeek - 1) * 7);

    // const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag']; // Already declared above

    days.forEach((dayName, index) => {
        const date = new Date(currentMonday);
        date.setUTCDate(date.getUTCDate() + index);
        const dateStr = date.toISOString().split('T')[0];

        const cell = document.getElementById(`${dayName}-cell`);
        const checkbox = document.getElementById(`${dayName}-closed`);

        // Safety check if elements exist
        if (!cell || !checkbox) return;

        const timeSlotsContainer = cell.querySelector('.time-slots-container');

        // Remove any existing overlays and warnings (redundant but safe)
        cell.querySelectorAll('.special-day-overlay, .outofplan-overlay, .warning-overlay').forEach(el => el.remove());
        cell.classList.remove('bg-warning-subtle');

        // Re-enable controls by default (overlay might disable them later)
        if (!checkbox.disabled) timeSlotsContainer.style.opacity = '1';
        if (!checkbox.disabled) timeSlotsContainer.style.pointerEvents = 'auto';


        // --- 1. Special Days ---
        if (Array.isArray(specialDays)) {
            const specialDay = specialDays.find(sd => dateStr >= sd.fromDate && dateStr <= sd.toDate);
            if (specialDay) {
                // Visualize conflict/override without destroying underlying data
                // We use an overlay to indicate the Special Day status
                const overlay = document.createElement('div');
                overlay.className = 'special-day-overlay alert alert-info mt-2 mb-0 p-2';
                overlay.style.fontSize = '0.9em';

                if (specialDay.status === 'geschlossen') {
                    overlay.className = 'special-day-overlay alert alert-danger mt-2 mb-0 p-2';
                    overlay.innerHTML = `<i class="bi bi-calendar-event"></i> <strong>Spezialtag (Geschlossen)</strong><br>${specialDay.reason || ''}`;

                    // Do NOT force change the checkbox or clear HTML to avoid permanent data loss on save
                    // Instead, disable the container controls visually
                    // We also disable the checkbox so user can't toggle it while Special Day is active
                    checkbox.disabled = true;
                    timeSlotsContainer.style.opacity = '0.5';
                    timeSlotsContainer.style.pointerEvents = 'none';

                    // Add overlay to cell
                    cell.appendChild(overlay);

                } else if (specialDay.status === 'offen') {
                    overlay.className = 'special-day-overlay alert alert-success mt-2 mb-0 p-2';
                    overlay.innerHTML = `<i class="bi bi-calendar-event"></i> <strong>Spezialtag (Offen)</strong><br>${specialDay.reason || ''}`;

                    cell.appendChild(overlay);
                }
            }
        }

        // --- 2. Out of Plan ---
        if (Array.isArray(outofplanEntries)) {
            const relevantEntries = outofplanEntries.filter(entry => {
                if (!entry.datumVon || !entry.datumBis) return false;
                const from = entry.datumVon.split('T')[0];
                const to = entry.datumBis.split('T')[0];
                return dateStr >= from && dateStr <= to;
            });

            relevantEntries.forEach(entry => {
                // Use Overlay instead of destructive changes
                const overlay = document.createElement('div');
                const desc = entry.beschreibungen && entry.beschreibungen.de ? entry.beschreibungen.de : '';

                if (entry.offen) {
                    overlay.className = 'outofplan-overlay alert alert-success mt-2 mb-0 p-2';
                    overlay.innerHTML = `<i class="bi bi-clock-history"></i> <strong>Sonderöffnung</strong><br>${entry.zeitVon} - ${entry.zeitBis}<br>${desc}`;
                    cell.appendChild(overlay);
                } else {
                    // Force Closed VISUAL ONLY
                    overlay.className = 'outofplan-overlay alert alert-danger mt-2 mb-0 p-2';
                    overlay.innerHTML = `<i class="bi bi-slash-circle"></i> <strong>Sonderschliessung</strong><br>${desc}`;

                    checkbox.disabled = true;
                    timeSlotsContainer.style.opacity = '0.5';
                    timeSlotsContainer.style.pointerEvents = 'none';

                    cell.appendChild(overlay);
                }
            });
        }
    });
}




function adjustTimeSlotsForClosure(container, closedStart, closedEnd, dayName) {
    const slots = Array.from(container.querySelectorAll('.time-slot'));
    const newSlots = [];

    slots.forEach(slot => {
        const inputs = slot.querySelectorAll('input[type="time"]');
        const start = inputs[0].value;
        const end = inputs[1].value;

        if (!start || !end) return;

        // Check overlap
        if (start >= closedEnd || end <= closedStart) {
            // No overlap
            newSlots.push({ start, end });
        } else {
            // Overlap
            // 1. Part before closure
            if (start < closedStart) {
                newSlots.push({ start, end: closedStart });
            }
            // 2. Part after closure
            if (end > closedEnd) {
                newSlots.push({ start: closedEnd, end });
            }
        }
    });

    // Re-render slots
    container.innerHTML = '';
    if (newSlots.length > 0) {
        newSlots.forEach(s => {
            const newSlot = document.createElement('div');
            newSlot.className = 'time-slot mt-2';
            newSlot.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <input type="time" class="form-control form-control-sm" value="${s.start}" onchange="validateTimeSlot(this)">
                    <span>-</span>
                    <input type="time" class="form-control form-control-sm" value="${s.end}" onchange="validateTimeSlot(this)">
                    <button class="btn btn-outline-danger btn-sm" onclick="removeTimeSlot('${dayName}', this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(newSlot);
        });
    }
}

function goBack() {
    window.location.href = '/configIframe/config_Iframe';
}
