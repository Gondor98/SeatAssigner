# 🔧 Setup Guide - Wedding Seat Assigner

## Step 1: Create Google Sheet (Database)

1. Go to https://sheets.google.com (logged in as maitronghoang98@gmail.com)
2. Create a new blank spreadsheet
3. Rename it to: **"Wedding Seat Assigner DB"**
4. Rename the first sheet tab to: **GuestList**
5. Add a second sheet tab named: **TableConfig**
6. In the **GuestList** sheet, add header row:
   - A1: `Họ tên`
   - B1: `Số người đi`  
   - C1: `Bàn`
7. In the **TableConfig** sheet, add:
   - A1: `key` | B1: `value`
   - A2: `total_tables` | B2: `20`
   - A3: `grid_rows` | B3: `4`
   - A4: `grid_cols` | B4: `5`
   - A5: `max_per_table` | B5: `10`
8. Click **Share** → Change to **"Anyone with the link"** → **Viewer**
9. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SPREADSHEET_ID]/edit
   ```

---

## Step 2: Set Up Google Cloud Project

1. Go to https://console.cloud.google.com
2. Sign in with **maitronghoang98@gmail.com**
3. Click **"Select a project"** → **"New Project"**
   - Name: `WeddingSeatAssigner`
   - Click **Create**
4. Wait for project to be created, then select it

### Enable Google Sheets API:
5. In the sidebar: **APIs & Services** → **Library**
6. Search for **"Google Sheets API"**
7. Click it → Click **"Enable"**

### Create API Key (for guest read access):
8. Go to **APIs & Services** → **Credentials**
9. Click **"+ CREATE CREDENTIALS"** → **"API key"**
10. Copy the API key
11. Click **"Edit API key"** (recommended restrictions):
    - Under **"Application restrictions"**: select **HTTP referrers**
    - Add your GitHub Pages URL: `https://YOUR_USERNAME.github.io/*`
    - Also add `http://localhost:*` (for testing)
    - Under **"API restrictions"**: select **"Restrict key"**
    - Select: **Google Sheets API**
    - Click **Save**

### Create OAuth 2.0 Client (for admin write access):
12. Go to **APIs & Services** → **Credentials**
13. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
14. If prompted, configure **OAuth consent screen** first:
    - User Type: **External** → Create
    - App name: `Wedding Seat Assigner`
    - User support email: `maitronghoang98@gmail.com`
    - Developer contact: `maitronghoang98@gmail.com`
    - Click **Save and Continue** through all steps
    - Under **"Test users"**, add: `maitronghoang98@gmail.com`
    - Click **Save and Continue** → **Back to Dashboard**
15. Now create the OAuth client:
    - Application type: **Web application**
    - Name: `SeatAssigner Web`
    - Authorized JavaScript origins:
      - `https://YOUR_USERNAME.github.io`
      - `http://localhost:8080`
    - Authorized redirect URIs:
      - `https://YOUR_USERNAME.github.io/SeatAssigner/admin.html`
      - `http://localhost:8080/admin.html`
    - Click **Create**
16. Copy the **Client ID**

---

## Step 3: Update config.js

Open `js/config.js` and fill in your values:

```javascript
const CONFIG = {
    API_KEY: 'AIzaSy...',           // From step 10
    SPREADSHEET_ID: '1abc...',      // From step 9 of Sheet setup
    CLIENT_ID: '123456...apps.googleusercontent.com',  // From step 16
    // ...
};
```

---

## Step 4: Deploy to GitHub Pages

### Create repository:
```bash
cd /Users/hoangmai/Downloads/SeatAssigner
git init
git add .
git commit -m "Initial commit: Wedding Seat Assigner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SeatAssigner.git
git push -u origin main
```

### Enable GitHub Pages:
1. Go to your repo on GitHub: `https://github.com/YOUR_USERNAME/SeatAssigner`
2. Click **Settings** → **Pages** (in sidebar)
3. Under "Source": select **Deploy from a branch**
4. Branch: **main** / **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes, your site will be at:
   ```
   https://YOUR_USERNAME.github.io/SeatAssigner/
   ```

### Update config with real URL:
After deploying, update `GUEST_PAGE_URL` in `js/config.js`:
```javascript
GUEST_PAGE_URL: 'https://YOUR_USERNAME.github.io/SeatAssigner/guest.html'
```

Then commit and push again.

---

## Step 5: Test End-to-End

1. Open admin page → upload your Excel file
2. Configure tables → Push to Google Sheets
3. Verify data appears in your Google Sheet
4. Generate QR code → scan with phone
5. Enter a guest name → verify table + map shows correctly

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key not valid" | Check API key restrictions, add your domain |
| "Request had insufficient auth" | Make sure OAuth consent has test user added |
| "Sheet not found" | Verify sheet names match exactly: GuestList, TableConfig |
| QR code leads to 404 | Wait for GitHub Pages to deploy (can take 2 min) |
| CORS error | Add localhost to Authorized origins in OAuth settings |

