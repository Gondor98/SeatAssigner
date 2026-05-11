/**
 * Google Sheets API Wrapper
 * Handles read (guest), write (admin), and check-in operations
 */

const SheetsAPI = {
    tokenClient: null,
    accessToken: null,

    // ============ READ METHODS (API Key - no auth needed) ============

    async fetchGuestList() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.GUEST_LIST}?key=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return this._parseGuestData(data.values);
    },

    async fetchTableConfig() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.TABLE_CONFIG}?key=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return this._parseConfigData(data.values);
    },

    async fetchCheckIns() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.CHECK_IN}?key=${CONFIG.API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) return [];
            const data = await response.json();
            return this._parseCheckInData(data.values);
        } catch (error) {
            console.warn('CheckIn sheet not available:', error.message);
            return [];
        }
    },

    // ============ ADMIN WRITE (OAuth required) ============

    async pushAllData(guests, config) {
        console.log('[SheetsAPI] Starting pushAllData...');
        const token = await this._getAccessToken();
        console.log('[SheetsAPI] Got access token');

        // Write GuestList
        console.log('[SheetsAPI] Writing GuestList...');
        const guestValues = [
            ['Họ tên', 'Số người đi', 'Bàn'],
            ...guests.map(g => [g.name, g.partySize, g.table])
        ];
        await this._clearSheet(CONFIG.SHEETS.GUEST_LIST, token);
        await this._writeSheet(CONFIG.SHEETS.GUEST_LIST, guestValues, token);

        // Write TableConfig
        console.log('[SheetsAPI] Writing TableConfig...');
        const configValues = [
            ['key', 'value'],
            ['total_tables', config.totalTables],
            ['grid_rows', config.gridRows],
            ['grid_cols', config.gridCols],
            ['max_per_table', config.maxPerTable]
        ];
        await this._clearSheet(CONFIG.SHEETS.TABLE_CONFIG, token);
        await this._writeSheet(CONFIG.SHEETS.TABLE_CONFIG, configValues, token);

        // Ensure CheckIn sheet has header
        console.log('[SheetsAPI] Initializing CheckIn sheet...');
        try {
            await this._writeSheet(CONFIG.SHEETS.CHECK_IN, 
                [['Họ tên', 'Số người đăng ký', 'Số người thực tế', 'Bàn', 'Thời gian']], token);
        } catch (e) {
            console.warn('CheckIn header write skipped:', e.message);
        }

        console.log('[SheetsAPI] All data pushed successfully');
        return { guestCount: guests.length, configWritten: true };
    },

    // ============ CHECK-IN (Guest - localStorage + optional cloud) ============

    async recordCheckIn(name, expectedSize, actualSize, assignedTable) {
        const timestamp = new Date().toISOString();
        
        // Always store locally (works without auth)
        this._storeCheckInLocally(name, expectedSize, actualSize, assignedTable);

        // Try cloud append (will work if sheet is set to "Anyone with link = Editor")
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEETS.CHECK_IN}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&key=${CONFIG.API_KEY}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [[name, expectedSize, actualSize, assignedTable, timestamp]] })
            });
            if (response.ok) return { stored: 'cloud' };
        } catch (e) {
            // Silent fail — localStorage is the primary store
        }
        return { stored: 'local' };
    },

    async getAllCheckIns() {
        const cloudCheckIns = await this.fetchCheckIns();
        const localCheckIns = JSON.parse(localStorage.getItem('wedding_checkins') || '[]');
        
        // Merge, dedup by name (cloud takes priority)
        const merged = [...cloudCheckIns];
        for (const local of localCheckIns) {
            if (!merged.find(c => c.name === local.name)) {
                merged.push(local);
            }
        }
        return merged;
    },

    _storeCheckInLocally(name, expectedSize, actualSize, assignedTable) {
        const checkIns = JSON.parse(localStorage.getItem('wedding_checkins') || '[]');
        // Replace if exists, otherwise add
        const idx = checkIns.findIndex(c => c.name === name);
        const entry = { name, expectedSize, actualSize, assignedTable, time: new Date().toISOString() };
        if (idx !== -1) {
            checkIns[idx] = entry;
        } else {
            checkIns.push(entry);
        }
        localStorage.setItem('wedding_checkins', JSON.stringify(checkIns));
    },

    // ============ INTERNAL HELPERS ============

    _getAccessToken() {
        return new Promise((resolve, reject) => {
            if (this.accessToken) {
                resolve(this.accessToken);
                return;
            }
            try {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CONFIG.CLIENT_ID,
                    scope: CONFIG.SCOPES,
                    callback: (response) => {
                        if (response.error) {
                            reject(new Error(`OAuth error: ${response.error}`));
                            return;
                        }
                        this.accessToken = response.access_token;
                        resolve(this.accessToken);
                    },
                    error_callback: (error) => {
                        reject(new Error(`OAuth failed: ${JSON.stringify(error)}`));
                    }
                });
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (err) {
                reject(err);
            }
        });
    },

    async _clearSheet(sheetName, token) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${sheetName}:clear`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Clear ${sheetName} failed: ${err}`);
        }
    },

    async _writeSheet(sheetName, values, token) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${sheetName}!A1?valueInputOption=RAW`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Write ${sheetName} failed: ${err}`);
        }
        return await response.json();
    },

    _parseGuestData(values) {
        if (!values || values.length < 2) return [];
        return values.slice(1).map((row, index) => ({
            id: index + 1,
            name: (row[0] || '').trim(),
            partySize: parseInt(row[1]) || 1,
            table: parseInt(row[2]) || 0
        })).filter(g => g.name.length > 0);
    },

    _parseConfigData(values) {
        if (!values || values.length < 2) {
            return { totalTables: 20, gridRows: 4, gridCols: 5, maxPerTable: 10 };
        }
        const config = {};
        values.slice(1).forEach(row => {
            if (row[0] && row[1]) config[row[0]] = parseInt(row[1]) || row[1];
        });
        return {
            totalTables: config.total_tables || 20,
            gridRows: config.grid_rows || 4,
            gridCols: config.grid_cols || 5,
            maxPerTable: config.max_per_table || 10
        };
    },

    _parseCheckInData(values) {
        if (!values || values.length < 2) return [];
        return values.slice(1).map(row => ({
            name: (row[0] || '').trim(),
            expectedSize: parseInt(row[1]) || 0,
            actualSize: parseInt(row[2]) || 0,
            assignedTable: parseInt(row[3]) || 0,
            time: row[4] || ''
        })).filter(c => c.name.length > 0);
    }
};
