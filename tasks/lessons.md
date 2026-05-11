# Wedding Seat Assigner - Lessons Learned

## Session: 2026-05-10

### Project Summary
Built a complete web-based wedding seat assignment app with:
- Admin page: Upload Excel, configure tables, push to Google Sheets, generate QR
- Guest page: Scan QR, enter name, confirm party size, dynamic table optimization
- Hosted on GitHub Pages (Gondor98/SeatAssigner)
- Database: Google Sheets (maitronghoang98@gmail.com)

### Key Credentials & URLs
- **GitHub**: https://github.com/Gondor98/SeatAssigner
- **Live Site**: https://gondor98.github.io/SeatAssigner/
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1KFPGKPi2ebYJ58RWXNZchtrWyWPmlxbs1OepzGACsUo/edit
- **API Key**: AIzaSyDK9uhwncly_1aSwsKtgqADS53xEsMjqQQ
- **OAuth Client ID**: 917388633534-fbc96ceit3nc36dpi9hf6ro0196884qi.apps.googleusercontent.com
- **Google Account**: maitronghoang98@gmail.com
- **GitHub Username**: Gondor98

### Bugs Encountered & Fixed

1. **GitHub push auth failure**
   - Problem: Password auth deprecated by GitHub
   - Fix: Install `gh` CLI, use `gh auth login` + `gh repo create`

2. **OAuth token not cached between API calls**
   - Problem: Admin page hung when pushing to Google Sheets (GuestList wrote, TableConfig didn't)
   - Fix: Combined into single `pushAllData()` method with one token request
   - Root cause: `_getAccessToken()` was re-triggering consent popup on second call

3. **OAuth "Access blocked" error**
   - Problem: App in testing mode, user not added as test user
   - Fix: Add maitronghoang98@gmail.com as test user in Google Cloud Console → OAuth consent screen → Audience

4. **QR code button did nothing**
   - Problem: CDN path `https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js` returned 404
   - Fix: Switched to `https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`
   - Also: Different API — `new QRCode(element, options)` instead of `QRCode.toCanvas()`

5. **GitHub Pages serving stale files**
   - Problem: Browser caching old JS despite new deployments
   - Fix: Add `?v=N` cache-busting query params to script tags, increment on changes

6. **Dynamic assigner moving guest away from their own table**
   - Problem: Algorithm sorted all tables by size, moved smallest (which was guest's table)
   - Root cause: When hth checked in with fewer people, Table 2 became "smallest" and got merged elsewhere
   - Fix: NEVER include the current guest's table in elimination candidates
   - Rule: `eliminationCandidates.filter(t => t.table !== guestOriginalTable)`

7. **No overflow checking on Excel upload**
   - Problem: Could assign 9 people to a 6-person table without warning
   - Fix: Created `overflow-checker.js` that detects and auto-reassigns overflow groups to new tables

### Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Backend | Google Sheets API | Free, no server, easy manual editing |
| Hosting | GitHub Pages | Free, HTTPS, works with QR codes |
| Auth (admin) | Google OAuth 2.0 | Only admin needs write access |
| Auth (guest) | None (API key read-only) | Guests only read data |
| Check-in storage | localStorage primary | Guests can't OAuth; local is reliable |
| Name matching | Custom Vietnamese diacritic removal | Standard libraries don't handle Vietnamese well |
| QR library | qrcodejs (davidshimjs) | Simple browser API, reliable CDN |
| Excel parsing | SheetJS (xlsx) | Client-side, no upload to server |

### Dynamic Assignment Algorithm (Final Version)

```
RULES:
1. Guest's table is PROTECTED — never moved
2. Only ELIMINATE entire tables (never partial moves)
3. Keep party members together
4. Prefer eliminating smaller tables (less disruption)

DECISION TREE:
1. Guest checks in with actualSize ≤ expectedSize
2. Recalculate occupancy: checked-in guests use actual, others use expected
3. For each table (smallest first), EXCLUDING guest's table:
   - Can ALL its people fit into ONE other table's free space?
   - YES → merge them there, table eliminated
   - NO → skip, try next
4. Guest stays at their original table always
```

### File Structure (Final)
```
SeatAssigner/
├── index.html                  # Landing page
├── admin.html                  # Admin: upload, config, push, QR
├── guest.html                  # Guest: search, party size, result
├── css/style.css               # Spanish garden theme
├── js/
│   ├── config.js               # API keys, sheet ID, URLs
│   ├── sheets-api.js           # Google Sheets read/write/check-in
│   ├── admin.js                # Admin page logic
│   ├── guest.js                # Guest page flow (3-step)
│   ├── name-matcher.js         # Vietnamese fuzzy matching
│   ├── table-renderer.js       # 2D table map (full + mini)
│   ├── overflow-checker.js     # Pre-upload capacity validation
│   └── dynamic-assigner.js     # Real-time optimization at check-in
├── Seat_assign_list_template.xlsx
├── SETUP_GUIDE.md
├── README.md
└── tasks/
    ├── todo.md
    └── lessons.md
```

### Google Sheet Structure
- **GuestList**: Họ tên | Số người đi | Bàn
- **TableConfig**: key | value (total_tables, grid_rows, grid_cols, max_per_table)
- **CheckIn**: Họ tên | Số người đăng ký | Số người thực tế | Bàn | Thời gian

### Deploy Workflow
```bash
cd /Users/hoangmai/Downloads/SeatAssigner
# Make changes...
git add -A && git commit -m "description" && git push
# Trigger build:
gh api repos/Gondor98/SeatAssigner/pages/builds -X POST
# Wait ~60s, then hard refresh browser
```

### Potential Future Enhancements
- [ ] Admin dashboard showing check-in progress (who arrived, who didn't)
- [ ] Export final seating to printable PDF
- [ ] Multiple events support (event ID in QR URL)
- [ ] Real-time sync between devices (WebSocket or polling)
- [ ] Undo check-in feature
- [ ] Admin password protection
- [ ] Custom event name/date on guest page
- [ ] Animated confetti on result reveal
