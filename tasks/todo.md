# Wedding Seat Assigner App - Implementation Plan

## Overview
A web-based wedding seat assignment app that allows:
- **Admin**: Upload Excel guest list, configure table layout, generate QR code
- **Guest**: Scan QR code, enter name, see assigned table + 2D map location

## Data Structure (from Template)
The Excel template has 3 columns:
| Column | Vietnamese | English | Description |
|--------|-----------|---------|-------------|
| A | Họ tên | Full Name | Guest's full name |
| B | Số người đi | Party Size | Number of people in guest's group |
| C | Bàn | Table | Assigned table number |

---

## Architecture Decision

### Recommended Stack: **Static Frontend + Google Sheets as Backend**

**Why this architecture:**
- No server needed (free hosting via GitHub Pages/Netlify)
- Cross-device (Windows, Mac, mobile - just a browser)
- Google Sheets = free cloud database with API access
- Easy for non-technical users to update guest list
- QR code just links to a URL (no app install needed)

### Alternative Considered: OneDrive + Excel Online
- Microsoft Graph API requires Azure AD setup (complex)
- Auth flow is more involved for a simple wedding app
- Google Sheets API is simpler for read-only public data

---

## System Architecture

```
ADMIN FLOW:
Excel File (.xlsx) --> Admin Web GUI --> Google Sheet
                           |
                           |-- Configure tables (rows, cols, max guests)
                           |-- Upload guest list
                           +-- Generate QR Code

GUEST FLOW:
QR Code --> Guest Web Page --> Enter Name
                                   |
                                   v
                           Google Sheets API
                                   |
                                   v
                         Show Table # + 2D Map

DATA LAYER (Google Sheet):
  Sheet1: "GuestList" (Name, PartySize, Table)
  Sheet2: "TableConfig" (TotalTables, Rows, Cols, MaxPerTable)
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure
- [ ] 1.1 Initialize project structure (HTML/CSS/JS)
- [ ] 1.2 Set up Google Cloud project + enable Sheets API
- [ ] 1.3 Create Google Sheet with proper structure
- [ ] 1.4 Configure API key for read access (guest side)
- [ ] 1.5 Configure OAuth or service account for write access (admin side)

### Phase 2: Admin Interface
- [ ] 2.1 Build admin page layout (responsive HTML/CSS)
- [ ] 2.2 Implement Excel file upload + parsing (using SheetJS/xlsx library)
- [ ] 2.3 Implement table configuration form (total tables, rows, cols, max guests)
- [ ] 2.4 Build 2D table layout preview (canvas or SVG)
- [ ] 2.5 Implement "Push to Google Sheets" functionality
- [ ] 2.6 Implement QR code generation (using qrcode.js library)
- [ ] 2.7 Add QR code download/print button

### Phase 3: Guest Interface
- [ ] 3.1 Build guest lookup page (clean, mobile-friendly)
- [ ] 3.2 Implement name search with fuzzy matching (Vietnamese diacritics handling)
- [ ] 3.3 Fetch data from Google Sheets API on search
- [ ] 3.4 Display table number result
- [ ] 3.5 Render 2D table map with highlighted assigned table
- [ ] 3.6 Add animation/visual flair for result reveal

### Phase 4: Polish & Deployment
- [ ] 4.1 Add Vietnamese language support throughout UI
- [ ] 4.2 Add error handling (name not found, network issues)
- [ ] 4.3 Mobile responsiveness testing
- [ ] 4.4 Deploy to GitHub Pages (or Netlify)
- [ ] 4.5 Test end-to-end flow (admin upload -> QR -> guest lookup)
- [ ] 4.6 Create user documentation

---

## Detailed Technical Specifications

### File Structure
```
SeatAssigner/
|-- index.html              # Landing page (links to admin/guest)
|-- admin.html              # Admin interface
|-- guest.html              # Guest lookup page (QR target)
|-- css/
|   |-- style.css           # Shared styles
|   |-- admin.css           # Admin-specific styles
|   +-- guest.css           # Guest-specific styles
|-- js/
|   |-- config.js           # Google Sheets API config (Sheet ID, API key)
|   |-- admin.js            # Admin logic (upload, configure, QR gen)
|   |-- guest.js            # Guest logic (search, display)
|   |-- sheets-api.js       # Google Sheets read/write wrapper
|   |-- table-renderer.js   # 2D table map renderer (Canvas/SVG)
|   +-- name-matcher.js     # Fuzzy Vietnamese name matching
|-- lib/                    # Third-party libraries (vendored)
|   |-- xlsx.full.min.js    # SheetJS for Excel parsing
|   +-- qrcode.min.js      # QR code generation
|-- assets/
|   +-- wedding-bg.jpg      # Optional decorative background
|-- Seat_assign_list_template.xlsx  # Template file
+-- tasks/
    |-- todo.md             # This plan
    +-- lessons.md          # Lessons learned
```

### Google Sheets Structure

**Sheet: "GuestList"**
| Row | A (name) | B (party_size) | C (table) |
|-----|----------|----------------|-----------|
| 1   | Họ tên   | Số người đi    | Bàn       |
| 2   | Nguyễn Văn A | 2          | 5         |
| 3   | Trần Thị B   | 3          | 2         |

**Sheet: "TableConfig"**
| Key | Value |
|-----|-------|
| total_tables | 20 |
| grid_rows | 4 |
| grid_cols | 5 |
| max_per_table | 10 |

### Key Libraries (all client-side, no server needed)

| Library | Purpose | CDN |
|---------|---------|-----|
| SheetJS (xlsx) | Parse uploaded .xlsx files | cdnjs |
| qrcode.js | Generate QR codes client-side | cdnjs |
| Google Sheets API v4 | Read/write sheet data | googleapis |

### Vietnamese Name Matching Algorithm
```
Input: "nguyen van a"
Steps:
1. Normalize Unicode (NFC)
2. Remove diacritics: "nguyễn văn a" -> "nguyen van a"
3. Lowercase
4. Trim whitespace
5. Compare against all names in DB using same normalization
6. Return exact matches first, then partial matches
7. Show suggestions if no exact match found
```

### QR Code Content
The QR code will encode a URL:
  https://<your-domain>/guest.html?event=<event-id>
When scanned, it opens the guest lookup page directly.

### 2D Table Map Rendering
- Use HTML5 Canvas or CSS Grid
- Tables rendered as numbered circles/squares
- Grid layout: rows x cols (user-configured)
- Highlighted table: pulsing animation + different color
- Include stage/entrance markers for orientation

### Security Considerations
- Google Sheets API key: restricted to specific referrers
- No sensitive data (just names + table numbers)
- Admin page: optional simple password gate (localStorage)
- Read-only API key for guest page; write requires admin auth

---

## Google Cloud Setup Steps (Manual - One Time)

1. Go to https://console.cloud.google.com
2. Create new project "WeddingSeatAssigner"
3. Enable "Google Sheets API"
4. Create API Key (restrict to your domains)
5. Create OAuth 2.0 Client ID (for admin write access)
6. Create a Google Sheet, note the Sheet ID from URL
7. Share sheet as "Anyone with link can view" (for guest read)
8. Add Sheet ID + API Key to js/config.js

---

## Estimated Effort

| Phase | Time Estimate |
|-------|--------------|
| Phase 1: Setup | 1-2 hours |
| Phase 2: Admin | 3-4 hours |
| Phase 3: Guest | 2-3 hours |
| Phase 4: Polish | 2-3 hours |
| **Total** | **8-12 hours** |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google API quota exceeded | Guests can't look up | Cache data locally, batch reads |
| Vietnamese name spelling | No match found | Fuzzy matching + suggestions list |
| Guest has no internet | Can't scan QR | Provide printed backup list |
| Google account needed | Setup friction | Clear step-by-step guide |

---

## Status: AWAITING APPROVAL
