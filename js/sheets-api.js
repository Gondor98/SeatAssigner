/**
 * Google Sheets API Wrapper
 * Handles both read (guest) and write (admin) operations
 */

const SheetsAPI = {
    tokenClient: null,
    gapiInited: false,
    gisInited: false,

    /**
     * Initialize the Google API client for READ-ONLY access (guest page)
     * Uses API Key only - no OAuth needed
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
     * Fetch table configuration
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
     * Write guest list to Google Sheets (Admin - requires OAuth)
     */
    async writeGuestList(guests) {
        const accessToken = await this._getAccessToken();
        
        // Prepare data: header + rows
        const values = [
            ['Họ tên', 'Số người đi', 'Bàn'],
            ...guests.map(g => [g.name, g.partySize, g.table])
        ];

        // Clear existing data first
        await this._clearSheet(CONFIG.SHEETS.GUEST_LIST, accessToken);

        // Write new data
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.GUEST_LIST}!A1?valueInputOption=RAW`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });

        if (!response.ok) {
            throw new Error(`Failed to write guest list: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Write table configuration to Google Sheets (Admin - requires OAuth)
     */
    async writeTableConfig(config) {
        const accessToken = await this._getAccessToken();

        const values = [
            ['key', 'value'],
            ['total_tables', config.totalTables],
            ['grid_rows', config.gridRows],
            ['grid_cols', config.gridCols],
            ['max_per_table', config.maxPerTable]
        ];

        await this._clearSheet(CONFIG.SHEETS.TABLE_CONFIG, accessToken);

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.TABLE_CONFIG}!A1?valueInputOption=RAW`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });

        if (!response.ok) {
            throw new Error(`Failed to write config: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Get OAuth access token using Google Identity Services
     */
    _getAccessToken() {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CONFIG.CLIENT_ID,
                    scope: CONFIG.SCOPES,
                    callback: (response) => {
                        if (response.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        resolve(response.access_token);
                    }
                });
            }

            // Check if we already have a valid token
            const existingToken = gapi?.client?.getToken?.();
            if (existingToken && existingToken.access_token) {
                resolve(existingToken.access_token);
            } else {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            }
        });
    },

    /**
     * Clear a sheet's content
     */
    async _clearSheet(sheetName, accessToken) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${sheetName}:clear`;
        
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    },

    /**
     * Parse raw sheet values into guest objects
     */
    _parseGuestData(values) {
        if (!values || values.length < 2) return [];

        // Skip header row
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
