/**
 * Configuration for Google Sheets API
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.cloud.google.com
 * 2. Create project "WeddingSeatAssigner"
 * 3. Enable "Google Sheets API"
 * 4. Create an API Key (for read access)
 * 5. Create OAuth 2.0 Client ID (for write access from admin)
 * 6. Fill in the values below
 */

const CONFIG = {
    // Google Sheets API Key (read-only, restricted to your domains)
    API_KEY: 'YOUR_API_KEY_HERE',

    // Google Sheet ID (from the URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit)
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',

    // OAuth 2.0 Client ID (for admin write operations)
    CLIENT_ID: 'YOUR_CLIENT_ID_HERE',

    // Sheet names
    SHEETS: {
        GUEST_LIST: 'GuestList',
        TABLE_CONFIG: 'TableConfig'
    },

    // Discovery doc for Sheets API
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',

    // Scopes
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    SCOPES_READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',

    // Guest page URL (update after deploying to GitHub Pages)
    GUEST_PAGE_URL: 'https://YOUR_GITHUB_USERNAME.github.io/SeatAssigner/guest.html',

    // App Settings
    APP: {
        EVENT_NAME: 'Tiệc Cưới',
        LANGUAGE: 'vi'
    }
};

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.SHEETS);
Object.freeze(CONFIG.APP);
