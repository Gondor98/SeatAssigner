/**
 * Guest Page Logic
 * Handles: name search, fetch from sheets, display results + map
 */

(function() {
    'use strict';

    // State
    let guestList = [];
    let tableConfig = null;
    let dataLoaded = false;

    // DOM Elements
    const nameInput = document.getElementById('name-input');
    const searchBtn = document.getElementById('search-btn');
    const suggestionsEl = document.getElementById('suggestions');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultContainer = document.getElementById('result-container');
    const notFoundContainer = document.getElementById('not-found-container');
    const resultName = document.getElementById('result-name');
    const resultTableNumber = document.getElementById('result-table-number');
    const guestTableMap = document.getElementById('guest-table-map');
    const retryBtn = document.getElementById('retry-btn');
    const eventNameEl = document.getElementById('event-name');

    // ============ INITIALIZATION ============

    async function init() {
        eventNameEl.textContent = CONFIG.APP.EVENT_NAME;

        // Load data on page load for faster search
        try {
            await loadData();
        } catch (err) {
            console.warn('Could not preload data:', err.message);
            // Data will be loaded on first search
        }
    }

    async function loadData() {
        if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            console.warn('API not configured. Using demo mode.');
            loadDemoData();
            return;
        }

        try {
            [guestList, tableConfig] = await Promise.all([
                SheetsAPI.fetchGuestList(),
                SheetsAPI.fetchTableConfig()
            ]);
            dataLoaded = true;
            console.log(`Loaded ${guestList.length} guests, config:`, tableConfig);
        } catch (err) {
            console.error('Failed to load data:', err);
            throw err;
        }
    }

    function loadDemoData() {
        // Demo data for testing without API
        guestList = [
            { id: 1, name: 'Nguyễn Văn An', partySize: 2, table: 1 },
            { id: 2, name: 'Trần Thị Bình', partySize: 3, table: 2 },
            { id: 3, name: 'Lê Hoàng Nam', partySize: 2, table: 3 },
            { id: 4, name: 'Phạm Minh Châu', partySize: 4, table: 1 },
            { id: 5, name: 'Võ Thanh Hải', partySize: 2, table: 5 },
            { id: 6, name: 'Đặng Thu Hương', partySize: 1, table: 4 },
            { id: 7, name: 'Bùi Quốc Việt', partySize: 3, table: 3 },
            { id: 8, name: 'Hoàng Mai Anh', partySize: 2, table: 2 },
        ];
        tableConfig = { totalTables: 10, gridRows: 2, gridCols: 5, maxPerTable: 10 };
        dataLoaded = true;
    }

    // ============ SEARCH ============

    searchBtn.addEventListener('click', performSearch);
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Live suggestions while typing
    nameInput.addEventListener('input', () => {
        const query = nameInput.value.trim();
        
        if (query.length < 2 || !dataLoaded) {
            suggestionsEl.style.display = 'none';
            return;
        }

        const suggestions = NameMatcher.getSuggestions(query, guestList, 5);
        
        if (suggestions.length > 0) {
            suggestionsEl.innerHTML = suggestions.map(g => 
                `<li data-name="${escapeAttr(g.name)}">${escapeHtml(g.name)} <small style="color: var(--text-muted);">(Bàn ${g.table})</small></li>`
            ).join('');
            suggestionsEl.style.display = 'block';
        } else {
            suggestionsEl.style.display = 'none';
        }
    });

    // Click suggestion
    suggestionsEl.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) {
            nameInput.value = li.dataset.name;
            suggestionsEl.style.display = 'none';
            performSearch();
        }
    });

    // Hide suggestions on blur
    nameInput.addEventListener('blur', () => {
        setTimeout(() => { suggestionsEl.style.display = 'none'; }, 200);
    });

    async function performSearch() {
        const query = nameInput.value.trim();
        if (!query) return;

        // Hide previous results
        resultContainer.classList.remove('visible');
        notFoundContainer.classList.remove('visible');
        suggestionsEl.style.display = 'none';

        // Show loading
        loadingSpinner.classList.add('visible');

        try {
            // Load data if not loaded yet
            if (!dataLoaded) {
                await loadData();
            }

            // Simulate a brief delay for UX
            await new Promise(r => setTimeout(r, 500));

            // Search
            const results = NameMatcher.search(query, guestList);

            loadingSpinner.classList.remove('visible');

            if (results.exact.length > 0) {
                showResult(results.exact[0]);
            } else if (results.partial.length === 1) {
                showResult(results.partial[0]);
            } else if (results.partial.length > 1) {
                // Show suggestions to pick from
                showMultipleResults(results.partial);
            } else {
                showNotFound();
            }
        } catch (err) {
            loadingSpinner.classList.remove('visible');
            console.error('Search error:', err);
            showNotFound();
        }
    }

    function showResult(guest) {
        resultName.textContent = `Xin chào, ${guest.name}! (${guest.partySize} người)`;
        resultTableNumber.textContent = `Bàn ${guest.table}`;

        // Render mini map
        if (tableConfig) {
            TableRenderer.renderMini(guestTableMap, tableConfig, guest.table);
        }

        resultContainer.classList.add('visible');
        notFoundContainer.classList.remove('visible');
    }

    function showMultipleResults(guests) {
        // Show as suggestions for user to pick
        suggestionsEl.innerHTML = `
            <li style="font-weight: 500; color: var(--olive); cursor: default; background: rgba(163,177,138,0.1);">
                Tìm thấy ${guests.length} kết quả. Bạn là ai?
            </li>
            ${guests.map(g => 
                `<li data-name="${escapeAttr(g.name)}">${escapeHtml(g.name)} <small style="color: var(--text-muted);">(${g.partySize} người)</small></li>`
            ).join('')}
        `;
        suggestionsEl.style.display = 'block';
    }

    function showNotFound() {
        notFoundContainer.classList.add('visible');
        resultContainer.classList.remove('visible');
    }

    // Retry button
    retryBtn.addEventListener('click', () => {
        notFoundContainer.classList.remove('visible');
        nameInput.value = '';
        nameInput.focus();
    });

    // ============ UTILITIES ============

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ============ START ============
    init();

})();
