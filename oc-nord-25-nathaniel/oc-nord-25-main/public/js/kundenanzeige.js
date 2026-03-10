/**
 * Kundenanzeige - JavaScript für Sortierung
 * Einfache Implementierung für Anfänger
 */

// Aktuelle Sortierung aus Server-Daten (wird von HTML übergeben)
let currentSortBy = '';
let currentSortOrder = '';

/**
 * Initialisierung - wird beim Laden der Seite aufgerufen
 */
function initKundenanzeige(sortBy, sortOrder) {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
}

/**
 * Nach einem Kriterium sortieren
 * @param {string} field - 'name', 'eintrittsdatum' oder 'ablaufdatum'
 */
function sortBy(field) {
    // Wenn das gleiche Feld nochmal geklickt wird, Reihenfolge umkehren
    if (currentSortBy === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        // Bei neuem Feld: Standard auf absteigend
        currentSortBy = field;
        currentSortOrder = 'desc';
    }
    
    // Seite mit neuen Parametern neu laden
    updatePage();
}

/**
 * Sortier-Reihenfolge umkehren (aufsteigend/absteigend)
 */
function toggleSortOrder() {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    updatePage();
}

/**
 * Seite mit neuen URL-Parametern neu laden
 */
function updatePage() {
    window.location.href = `/admin/kundenanzeige?sortBy=${currentSortBy}&sortOrder=${currentSortOrder}`;
}

/**
 * Kunden löschen mit Bestätigung
 * @param {string} customerId - ID des zu löschenden Kunden
 * @param {string} customerName - Name des Kunden
 */
function confirmDelete(customerId, customerName) {
    // Bestätigung anfordern
    const confirmed = confirm(`Möchten Sie den Kunden "${customerName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden!`);
    
    if (confirmed) {
        // Formular erstellen und absenden
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/admin/kundenanzeige/delete/${customerId}`;
        document.body.appendChild(form);
        form.submit();
    }
}
