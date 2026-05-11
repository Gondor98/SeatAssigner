/**
 * Configuration for Google Sheets API
 * Wedding Seat Assigner - Production Config
 */

const CONFIG = {
    // Google Sheets API Key (read-only)
    API_KEY: 'AIzaSyDK9uhwncly_1aSwsKtgqADS53xEsMjqQQ',

    // Google Sheet ID
    SPREADSHEET_ID: '1KFPGKPi2ebYJ58RWXNZchtrWyWPmlxbs1OepzGACsUo',

    // OAuth 2.0 Client ID (for admin write operations)
    CLIENT_ID: '917388633534-fbc96ceit3nc36dpi9hf6ro0196884qi.apps.googleusercontent.com',

    // Sheet names
    SHEETS: {
        GUEST_LIST: 'GuestList',
        TABLE_CONFIG: 'TableConfig',
        CHECK_IN: 'CheckIn'
    },

    // Discovery doc for Sheets API
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',

    // Scopes
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    SCOPES_READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',

    // Guest page URL (GitHub Pages)
    GUEST_PAGE_URL: 'https://gondor98.github.io/SeatAssigner/guest.html',

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
