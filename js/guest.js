/**
 * Guest Page Logic
 * Flow: Search name → Confirm party size → Optimize → Show result
 */

(function() {
    'use strict';

    // State
    let guestList = [];
    let tableConfig = null;
    let checkIns = [];
    let dataLoaded = false;
    let currentGuest = null; // The guest being checked in

    // DOM Elements - Steps
    const stepSearch = document.getElementById('step-search');
    const stepPartySize = document.getElementById('step-party-size');
    const stepResult = document.getElementById('step-result');
    const stepNotFound = document.getElementById('step-not-found');
    const loadingSpinner = document.getElementById('loading-spinner');

    // DOM Elements - Search
    const nameInput = document.getElementById('name-input');
    const searchBtn = document.getElementById('search-btn');
    const suggestionsEl = document.getElementById('suggestions');

    // DOM Elements - Party Size
    const checkinName = document.getElementById('checkin-name');
    const expectedSize = document.getElementById('expected-size');
    const actualSizeInput = document.getElementById('actual-size-input');
    const confirmSizeBtn = document.getElementById('confirm-size-btn');

    // DOM Elements - Result
    const resultName = document.getElementById('result-name');
    const resultTableNumber = document.getElementById('result-table-number');
    const guestTableMap = document.getElementById('guest-table-map');
    const reassignmentNotice = document.getElementById('reassignment-notice');
    const reassignmentText = document.getElementById('reassignment-text');

    // DOM Elements - Not Found
    const retryBtn = document.getElementById('retry-btn');
    const eventNameEl = document.getElementById('event-name');

    // ============ INITIALIZATION ============

    async function init() {
        eventNameEl.textContent = CONFIG.APP.EVENT_NAME;
        try {
            await loadData();
        } catch (err) {
            console.warn('Could not preload data:', err.message);
        }
    }

    async function loadData() {
        if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            loadDemoData();
            return;
        }

        try {
            [guestList, tableConfig, checkIns] = await Promise.all([
                SheetsAPI.fetchGuestList(),
                SheetsAPI.fetchTableConfig(),
                SheetsAPI.getAllCheckIns()
            ]);
            dataLoaded = true;
            console.log(`Loaded ${guestList.length} guests, ${checkIns.length} check-ins`);
        } catch (err) {
            console.error('Failed to load data:', err);
            throw err;
        }
    }

    function loadDemoData() {
        guestList = [
            { id: 1, name: 'Nguyễn Văn An', partySize: 5, table: 1 },
            { id: 2, name: 'Trần Thị Bình', partySize: 3, table: 1 },
            { id: 3, name: 'Lê Hoàng Nam', partySize: 4, table: 2 },
            { id: 4, name: 'Phạm Minh Châu', partySize: 4, table: 2 },
            { id: 5, name: 'Võ Thanh Hải', partySize: 3, table: 3 },
            { id: 6, name: 'Đặng Thu Hương', partySize: 2, table: 3 },
            { id: 7, name: 'Bùi Quốc Việt', partySize: 3, table: 3 },
        ];
        tableConfig = { totalTables: 3, gridRows: 1, gridCols: 3, maxPerTable: 10 };
        checkIns = [];
        dataLoaded = true;
    }

    // ============ STEP MANAGEMENT ============

    function showStep(step) {
        stepSearch.style.display = 'none';
        stepPartySize.style.display = 'none';
        stepResult.style.display = 'none';
        stepNotFound.style.display = 'none';
        loadingSpinner.classList.remove('visible');

        if (step === 'search') stepSearch.style.display = 'block';
        else if (step === 'party-size') stepPartySize.style.display = 'block';
        else if (step === 'result') stepResult.style.display = 'block';
        else if (step === 'not-found') stepNotFound.style.display = 'block';
        else if (step === 'loading') loadingSpinner.classList.add('visible');
    }

    // ============ STEP 1: SEARCH ============

    searchBtn.addEventListener('click', performSearch);
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    nameInput.addEventListener('input', () => {
        const query = nameInput.value.trim();
        if (query.length < 2 || !dataLoaded) {
            suggestionsEl.style.display = 'none';
            return;
        }

        const suggestions = NameMatcher.getSuggestions(query, guestList, 5);
        if (suggestions.length > 0) {
            suggestionsEl.innerHTML = suggestions.map(g =>
                `<li data-name="${escapeAttr(g.name)}">${escapeHtml(g.name)} <small style="color: var(--text-muted);">(${g.partySize} người)</small></li>`
            ).join('');
            suggestionsEl.style.display = 'block';
        } else {
            suggestionsEl.style.display = 'none';
        }
    });

    suggestionsEl.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li) {
            nameInput.value = li.dataset.name;
            suggestionsEl.style.display = 'none';
            performSearch();
        }
    });

    nameInput.addEventListener('blur', () => {
        setTimeout(() => { suggestionsEl.style.display = 'none'; }, 200);
    });

    async function performSearch() {
        const query = nameInput.value.trim();
        if (!query) return;

        suggestionsEl.style.display = 'none';
        showStep('loading');

        try {
            if (!dataLoaded) await loadData();
            await new Promise(r => setTimeout(r, 400));

            const results = NameMatcher.search(query, guestList);

            if (results.exact.length > 0) {
                goToPartySize(results.exact[0]);
            } else if (results.partial.length === 1) {
                goToPartySize(results.partial[0]);
            } else if (results.partial.length > 1) {
                showMultipleResults(results.partial);
            } else {
                showStep('not-found');
            }
        } catch (err) {
            console.error('Search error:', err);
            showStep('not-found');
        }
    }

    function showMultipleResults(guests) {
        showStep('search');
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

    // ============ STEP 2: PARTY SIZE CONFIRMATION ============

    function goToPartySize(guest) {
        currentGuest = guest;

        // Check if already checked in
        const existing = checkIns.find(c => c.name === guest.name);
        if (existing) {
            // Already checked in — show result directly
            showFinalResult(guest, existing.assignedTable, false);
            return;
        }

        checkinName.textContent = `Xin chào, ${guest.name}!`;
        expectedSize.textContent = `${guest.partySize} người`;
        actualSizeInput.value = guest.partySize;
        actualSizeInput.max = guest.partySize; // Can't exceed registered size
        showStep('party-size');
        actualSizeInput.focus();
    }

    confirmSizeBtn.addEventListener('click', async () => {
        if (!currentGuest) return;

        const actualSize = parseInt(actualSizeInput.value) || currentGuest.partySize;
        
        showStep('loading');
        await new Promise(r => setTimeout(r, 300));

        // Run dynamic optimization
        const result = DynamicAssigner.optimize(
            guestList,
            checkIns,
            currentGuest.name,
            actualSize,
            tableConfig.maxPerTable
        );

        // Record check-in
        const finalTable = result.guestTable || currentGuest.table;
        await SheetsAPI.recordCheckIn(
            currentGuest.name,
            currentGuest.partySize,
            actualSize,
            finalTable
        );

        // Add to local check-ins state
        checkIns.push({ name: currentGuest.name, actualSize: actualSize });

        // Update guest list in memory with any reassignments
        for (const updated of result.updatedGuests) {
            const idx = guestList.findIndex(g => g.name === updated.name);
            if (idx !== -1) {
                guestList[idx].table = updated.table;
            }
        }

        // Show result
        const wasReassigned = finalTable !== currentGuest.table;
        const movesForGuest = result.moves.filter(m => m.name === currentGuest.name);
        
        showFinalResult(
            { ...currentGuest, actualSize },
            finalTable,
            wasReassigned,
            result.tablesEliminated,
            movesForGuest
        );
    });

    // ============ STEP 3: SHOW RESULT ============

    function showFinalResult(guest, table, wasReassigned, tablesEliminated = [], moves = []) {
        resultName.textContent = `${guest.name} (${guest.actualSize || guest.partySize} người)`;
        resultTableNumber.textContent = `Bàn ${table}`;

        // Show reassignment notice if table changed
        if (wasReassigned && moves.length > 0) {
            reassignmentText.textContent = 
                ` Bàn của bạn đã được chuyển từ Bàn ${moves[0].fromTable} sang Bàn ${moves[0].toTable} để tối ưu chỗ ngồi.`;
            reassignmentNotice.style.display = 'block';
        } else {
            reassignmentNotice.style.display = 'none';
        }

        // Render map
        if (tableConfig) {
            TableRenderer.renderMini(guestTableMap, tableConfig, table);
        }

        showStep('result');
    }

    // ============ RETRY ============

    retryBtn.addEventListener('click', () => {
        currentGuest = null;
        nameInput.value = '';
        showStep('search');
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
