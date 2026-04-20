# OpenClose iFrame Konfiguration - Dokumentation

## 📋 Überblick

Das OpenClose Projekt ist eine Node.js/Express-basierte Web-Anwendung, die es Geschäftskunden ermöglicht, ihren Öffnungs- und Schließungsstatus zu verwalten. Der Schwerpunkt dieser Dokumentation liegt auf der **iFrame-Konfiguration**, da dass meine Hauptaufgabe bei dem Projekt war, ich habe auch andere Sachen wie z.b denn Wochenplan gemacht, wo die Kunden ihre Öffnungszeiten eintragen können, aber das war extra.

**Kernfunktion der iFrame:**
- Kunden können einen iFrame-Code auf ihrer eigenen Webseite einbetten
- Die iFrame zeigt den aktuellen Öffnungs-/Schließungsstatus an
- Kunden können Farben, Schriftarten und Zeitzone konfigurieren
- Der Status wird in Echtzeit von der OpenClose-Datenbank aktualisiert

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────┐
│   Kundenwebseite (Externe Website)      │
│   ┌───────────────────────────────────┐ │
│   │  Eingebettete iFrame              │ │
│   │  <iframe src="/homeIframe...">    │ │
│   │  - Zeigt Status an                │ │
│   │  - Aktualisiert sich automatisch  │ │
│   └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│   OpenClose Server (Backend)            │
│   ┌─────────────────────────────────┐   │
│   │ API Endpoints                   │   │
│   │ /api/iframe/settings            │   │
│   │ /api/public/week/current        │   │
│   │ /homeIframe (Public)            │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Database (MongoDB)              │   │
│   │ - iFrame_settings (je Kunde)    │   │
│   │ - Week-Pläne                    │   │
│   │ - Special Days                  │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 📁 Wichtigste Dateien & Komponenten

### 1. **Models** - Datenspeicherung

#### `models/configIframe/iframeSettingsModel.js`
Speichert die Konfigurationseinstellungen für jeden Kunden:

```javascript
{
  customerId: "user_id",                    // Eindeutige Kunden-ID
  zeitzone: 1,                              // Zeitzone (1 = Europe/Zurich)
  hintergrundfarbeOffen: "#ffffff",         // Hintergrundfarbe wenn offen
  hintergrundfarbeGeschlossen: "#e0e0e0",   // Hintergrundfarbe wenn geschlossen
  textfarbeOffen: "#000000",                // Textfarbe wenn offen
  textfarbeGeschlossen: "#333333",          // Textfarbe wenn geschlossen
  schriftartOffen: "Arial",                 // Schriftart wenn offen
  schriftartGeschlossen: "Arial",           // Schriftart wenn geschlossen
  vorauswahlen: false                       // Wochentag-Vorabauswahl
}
```

**Wichtige Funktionen:**
- `getOrCreateSettings(customerId)` - Lädt oder erstellt Einstellungen
- `saveSettings(customerId, data)` - Speichert Einstellungen in DB
- `loadSettings(customerId)` - Lädt bestehende Einstellungen

#### `models/configIframe/weekModel.js`
Verwaltet den Wochenplan (wann ist offen/geschlossen):
- Standard-Wochenplan pro Geschäft
- Special Days (Feiertage, Ausnahmen)
- Außerplanmäßige Einträge (spontane Schließungen)

---

### 2. **Controllers** - Geschäftslogik

#### `controllers/configIframe/configServerController.js`
Hauptcontroller für die iFrame-Konfiguration:

**API-Funktionen:**
- `renderConfig(req, res)` - Lädt die Konfigurationsseite (mit Auth)
- `getSettings(req, res)` - GET `/api/iframe/settings`
- `saveSettings(req, res)` - POST `/api/iframe/settings`
- `getOutofplanEntries(req, res)` - Lädt außerplanmäßige Einträge
- `saveOutofplanEntry(req, res)` - Speichert außerplanmäßige Einträge
- `deleteOutofplanEntry(req, res)` - Löscht außerplanmäßige Einträge

**Beispiel - Einstellungen speichern:**
```javascript
POST /api/iframe/settings
Content-Type: application/json
{
  "zeitzone": 1,
  "hintergrundfarbeOffen": "#ffffff",
  "textfarbeOffen": "#000000"
}
```

---

### 3. **Views** - Benutzeroberflächenkomponenten

#### `views/configIframe/config_Iframe.html`
Administrationspanel für Kunden (nur mit Login erreichbar):
- Farbauswahl für offen/geschlossen Status
- Schriftartauswahl
- Live-Vorschau der iFrame
- Embed-Code zum Kopieren
- Button zum Speichern und Vorschauen

#### `views/homeIframe.html` / `homeIframe2.html`
**Öffentliche iFrame** (keine Authentifizierung erforderlich):
- Wird auf Kundenwebseite eingebettet
- Lädt aktuelle Einstellungen von `/api/iframe/settings`
- Zeigt aktuellen Status (OFFEN/GESCHLOSSEN)
- Aktualisiert sich automatisch (z.B. stündlich)
- Responsive und benutzerfreundlich

**Funktionsweise:**
```html
<iframe src="https://openclose.com/homeIframe?customerId=xyz" 
        width="300" height="100">
</iframe>
```

---

### 4. **Routes** - API Endpoints

#### Definiert in `routes/index.js`:

| Route | Methode | Auth | Beschreibung |
|-------|---------|------|-------------|
| `/configIframe/config_Iframe` | GET | Ja | Konfigurationsseite |
| `/api/iframe/settings` | GET | Nein* | Lädt Einstellungen |
| `/api/iframe/settings` | POST | Ja | Speichert Einstellungen |
| `/api/iframe/outofplan` | GET | Nein | Außerplanmäßige Einträge |
| `/api/iframe/outofplan` | POST | Ja | Neue Ausnahme erstellen |
| `/api/iframe/outofplan/:id` | DELETE | Ja | Ausnahme löschen |
| `/homeIframe` | GET | Nein | Öffentliche iFrame |
| `/api/public/week/current` | GET | Nein | Aktueller Wochenplan |

*GET Settings werden mit customerId als Query-Parameter autorisiert

---

## 🎯 Workflow - Wie funktioniert die iFrame-Einbettung?

### Step 1: Kunde konfiguriert sein Profil
```
1. Kunde loggt sich in OpenClose ein
2. Navigiert zu "/configIframe/config_Iframe"
3. Wählt Farben und Schriftarten
4. Klickt "Speichern" → Daten werden in DB gespeichert
5. Kopiert den Embed-Code
```

### Step 2: Kunde baut iFrame auf seiner Website ein
```html
<!-- Auf der Kundenwebseite -->
<iframe src="https://openclose.de/homeIframe?customerId=abc123"
        width="300" height="100"
        style="border: none;">
</iframe>
```

### Step 3: iFrame lädt Daten
```javascript
// homeIframe.js lädt:
1. customerId aus URL
2. GET /api/iframe/settings?customerId=abc123
3. GET /api/public/week/current?customerId=abc123
4. Rendert HTML mit aktuellen Farben und Status
5. Installiert Auto-Refresh (z.B. jede Stunde)
```

### Step 4: iFrame zeigt Status an
```
┌─────────────────────┐
│  OFFEN              │     ← Farbe: #ffffff (weiß)
│  Öffnungszeiten...  │     ← Textfarbe: #000000 (schwarz)
└─────────────────────┘
```

---

## 🎨 Konfigurierbare Einstellungen

| Einstellung | Typ | Beschreibung | Standard |
|------------|------|-------------|---------|
| `zeitzone` | Number | Zeitzone des Geschäfts | 1 (Zurich) |
| `hintergrundfarbeOffen` | Color | Hintergrund wenn offen | #ffffff |
| `hintergrundfarbeGeschlossen` | Color | Hintergrund wenn zu | #e0e0e0 |
| `textfarbeOffen` | Color | Text wenn offen | #000000 |
| `textfarbeGeschlossen` | Color | Text wenn zu | #333333 |
| `schriftartOffen` | Font | Schriftart wenn offen | Arial |
| `schriftartGeschlossen` | Font | Schriftart wenn zu | Arial |
| `vorauswahlen` | Boolean | Vorab Wochentag wählen | false |

---

## 🔐 Sicherheit & Authentifizierung

### Geschützte Routes (mit Login erforderlich):
- `GET /configIframe/config_Iframe` - Admin-Panel
- `POST /api/iframe/settings` - Einstellungen speichern
- `POST /api/iframe/outofplan` - Außerplanmäßig erstellen
- `DELETE /api/iframe/outofplan/:id` - Außerplanmäßig löschen

**Authentifizierung via:**
- Session-Cookies
- Middleware: `requireAuth` prüft `req.session.loggedIn`

### Öffentliche Routes (keine Auth erforderlich):
- `GET /homeIframe` - iFrame Display
- `GET /api/iframe/settings?customerId=xyz` - Settings (public Read)
- `GET /api/public/week/current` - Wochenplan

---

## 💾 Datenbankstruktur

### iFrame_settings Collection (MongoDB)
```javascript
{
  _id: ObjectId,
  customerId: String (Index, Unique),
  zeitzone: Number,
  hintergrundfarbeOffen: String,
  hintergrundfarbeGeschlossen: String,
  textfarbeOffen: String,
  textfarbeGeschlossen: String,
  schriftartOffen: String,
  schriftartGeschlossen: String,
  vorauswahlen: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🛠️ Wichtige Code-Snippets

### Einstellungen laden (JavaScript Frontend)
```javascript
async function loadSettings() {
  const customerId = new URLSearchParams(window.location.search).get('customerId');
  const response = await fetch(`/api/iframe/settings?customerId=${customerId}`);
  const data = await response.json();
  
  if (data.success) {
    applyStyles(data.data);
  }
}
```

### Wochenplan abrufen (Backend)
```javascript
// GET /api/public/week/current?customerId=abc123
const week = await weekModel.getCurrentWeek(customerId);
// Gibt Status für jeden Wochentag zurück: { tag, isOpen, zeiten }
```

### Farben anwenden (Frontend)
```javascript
function applyStyles(settings) {
  const statusDiv = document.getElementById('status');
  const isOpen = checkIfOpen(settings);
  
  if (isOpen) {
    statusDiv.style.backgroundColor = settings.hintergrundfarbeOffen;
    statusDiv.style.color = settings.textfarbeOffen;
    statusDiv.style.fontFamily = settings.schriftartOffen;
  } else {
    statusDiv.style.backgroundColor = settings.hintergrundfarbeGeschlossen;
    statusDiv.style.color = settings.textfarbeGeschlossen;
    statusDiv.style.fontFamily = settings.schriftartGeschlossen;
  }
}
```

---

## 📊 Status-Logik

Der Status wird basierend auf folgendem Ablauf bestimmt:

```
1. Prüfe aktuellen Wochentag
2. Prüfe "Special Days" (Feiertage, Ausnahmen)
3. Prüfe "Outside-of-Plan" (spontane Schließungen)
4. Vergleiche aktuelle Zeit mit Öffnungszeiten
5. Bestimme: OFFEN oder GESCHLOSSEN
```

---

## 🚀 Testing

Test-iFrames zum Entwickeln:

| Route | Zweck |
|-------|-------|
| `/test-iframe1` | Test iFrame - Geschlossen |
| `/test-iframe2` | Test iFrame - Geöffnet |
| `/test-iframe3` | Test iFrame - Einbettung |

---

## 🔄 Auto-Refresh & Performance

**iFrame-Aktualisierung:**
- Standard-Interval: 1 Stunde
- Kann konfiguriert werden im Frontend-Code
- Spart Datenbankzugriffe durch Caching

**Skalierbarkeit:**
- Jeder Kunde hat eigene Settings (indexed nach customerId)
- Public API ist optimiert für externe Anfragen
- MongoDB Indexes auf customerId für schnelle Lookups

---

## 📝 Zusammenfassung der Verantwortlichkeiten

### Frontend (iFrame auf Kundenwebseite):
- HTML-Template: `views/homeIframe.html`
- JavaScript-Logik: Farben anwenden, Status prüfen, Auto-Refresh

### Backend (OpenClose Server):
- API Endpoints: Einstellungen laden/speichern
- Datenbankoperationen: MongoDB
- Authentifizierung: Session-Management

### Admin-Panel (für Kunden):
- HTML-Seite: `views/configIframe/config_Iframe.html`
- Benutzerinteraktion: Farben auswählen, speichern, Vorschau
- Embed-Code generieren zum Kopieren

---

## 🐛 Debugging-Tipps

### iFrame wird nicht aktualisiert?
1. Prüfe Browser-Konsole auf JavaScript-Fehler
2. Prüfe Network-Tab: Wird `/api/iframe/settings` aufgerufen?
3. Prüfe customerId Parameter in URL

### Settings werden nicht gespeichert?
1. Prüfe ob Nutzer eingeloggt ist
2. Prüfe POST-Request in Network-Tab
3. Prüfe MongoDB Connection in Logs

### Farben werden nicht angewendet?
1. Prüfe CSS-Spezifität
2. Prüfe ob Farb-HEX-Codes korrekt sind
3. Prüfe Browser-Cache (F5 oder Ctrl+Shift+R)

---

**Bearbeitet von:** Nathaniel  
**Verantwortung:** iFrame-Konfiguration & Einbettung  
**Letzte Aktualisierung:** April 2026
