/**
 * Google Sheets API Wrapper
 * Handles both read (guest) and write (admin) operations
 */

const SheetsAPI = {
    tokenClient: null,
    accessToken: null,

    /**
     * Fetch guest list (READ-ONLY - uses API Key, no OAuth)
     */
    async fetchGuestList() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.GUEST_LIST}?key=${CONFIG.API_KEY}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return this._parseGuestData(data.values);
        } catch (error) {
            console.error('Error fetching guest list:', error);
            throw error;
        }
    },

    /**
     * Fetch table configuration (READ-ONLY)
     */
    async fetchTableConfig() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.TABLE_CONFIG}?key=${CONFIG.API_KEY}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return this._parseConfigData(data.values);
        } catch (error) {
            console.error('Error fetching table config:', error);
            throw error;
        }
    },

    /**
     * Write guest list AND table config to Google Sheets (Admin)
     * Combined into one flow so OAuth only triggers once
     */
    async pushAllData(guests, config) {
        console.log('[SheetsAPI] Starting pushAllData...');
        
        const token = await this._getAccessToken();
        console.log('[SheetsAPI] Got access token:', token ? 'yes' : 'no');

        // 1. Write GuestList
        console.log('[SheetsAPI] Clearing GuestList...');
        await this._clearSheet(CONFIG.SHEETS.GUEST_LIST, token);
        
        console.log('[SheetsAPI] Writing GuestList...');
        const guestValues = [
            ['Họ tên', 'Số người đi', 'Bàn'],
            ...guests.map(g => [g.name, g.partySize, g.table])
        ];
        await this._writeSheet(CONFIG.SHEETS.GUEST_LIST, guestValues, token);
        console.log('[SheetsAPI] GuestList written successfully');

        // 2. Write TableConfig
        console.log('[SheetsAPI] Clearing TableConfig...');
        await this._clearSheet(CONFIG.SHEETS.TABLE_CONFIG, token);
        
        console.log('[SheetsAPI] Writing TableConfig...');
        const configValues = [
            ['key', 'value'],
            ['total_tables', config.totalTables],
            ['grid_rows', config.gridRows],
            ['grid_cols', config.gridCols],
            ['max_per_table', config.maxPerTable]
        ];
        await this._writeSheet(CONFIG.SHEETS.TABLE_CONFIG, configValues, token);
        console.log('[SheetsAPI] TableConfig written successfully');

        return { guestCount: guests.length, configWritten: true };
    },

    /**
     * Get OAuth access token using Google Identity Services
     */
    _getAccessToken() {
        return new Promise((resolve, reject) => {
            // Return cached token if we have one
            if (this.accessToken) {
                console.log('[SheetsAPI] Using cached token');
                resolve(this.accessToken);
                return;
            }

            console.log('[SheetsAPI] Requesting new access token...');

            try {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CONFIG.CLIENT_ID,
                    scope: CONFIG.SCOPES,
                    callback: (response) => {
                        console.log('[SheetsAPI] Token callback received:', response.error || 'success');
                        if (response.error) {
                            reject(new Error(`OAuth error: ${response.error}`));
                            return;
                        }
                        this.accessToken = response.access_token;
                        resolve(this.accessToken);
                    },
                    error_callback: (error) => {
                        console.error('[SheetsAPI] Token error_callback:', error);
                        reject(new Error(`OAuth failed: ${JSON.stringify(error)}`));
                    }
                });

                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (err) {
                console.error('[SheetsAPI] Failed to init token client:', err);
                reject(err);
            }
        });
    },

    /**
     * Clear a sheet
     */
    async _clearSheet(sheetName, token) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${sheetName}:clear`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`[SheetsAPI] Clear ${sheetName} failed:`, err);
            throw new Error(`Clear ${sheetName} failed: ${err}`);
        }
        console.log(`[SheetsAPI] Clear ${sheetName} OK`);
    },

    /**
     * Write values to a sheet
     */
    async _writeSheet(sheetName, values, token) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${sheetName}!A1?valueInputOption=RAW`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`[SheetsAPI] Write ${sheetName} failed:`, err);
            throw new Error(`Write ${sheetName} failed: ${err}`);
        }
        console.log(`[SheetsAPI] Write ${sheetName} OK`);
        return await response.json();
    },

    /**
     * Parse raw sheet values into guest objects
     */
    _parseGuestData(values) {
        if (!values || values.length < 2) return [];

        return values.slice(1).map((row, index) => ({
            id: index + 1,
            name: (row[0] || '').trim(),
            partySize: parseInt(row[1]) || 1,
            table: parseInt(row[2]) || 0
        })).filter(g => g.name.length > 0);
    },

    /**
     * Parse config sheet into object
     */
    _parseConfigData(values) {
        if (!values || values.length < 2) {
            return { totalTables: 20, gridRows: 4, gridCols: 5, maxPerTable: 10 };
        }

        const config = {};
        values.slice(1).forEach(row => {
            if (row[0] && row[1]) {
                config[row[0]] = parseInt(row[1]) || row[1];
            }
        });

        return {
            totalTables: config.total_tables || 20,
            gridRows: config.grid_rows || 4,
            gridCols: config.grid_cols || 5,
            maxPerTable: config.max_per_table || 10
        };
    }
};
