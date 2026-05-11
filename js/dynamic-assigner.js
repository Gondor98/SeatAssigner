/**
 * Dynamic Seat Assigner
 * Re-optimizes table assignments based on actual check-in party sizes
 * 
 * RULES:
 * 1. The guest who just checked in ALWAYS stays at their original table
 * 2. Only move groups if it completely ELIMINATES a table
 * 3. Never split party members across tables
 * 4. Never eliminate the current guest's table
 * 5. Prefer eliminating tables with fewer groups (less disruption)
 * 
 * DECISION TREE:
 * 1. Guest checks in with actualSize ≤ expectedSize
 * 2. Recalculate actual occupancy for all tables
 * 3. For each table (smallest first), EXCLUDING the guest's own table:
 *    a. Can ALL people on this table fit into ONE other table's free space?
 *    b. If yes → move them there → table eliminated
 * 4. Guest always stays at their own table
 */

const DynamicAssigner = {

    /**
     * @param {Array} allGuests - [{name, partySize, table}]
     * @param {Array} checkIns - [{name, actualSize}]
     * @param {string} guestName - Current guest checking in
     * @param {number} actualSize - Actual party size
     * @param {number} maxPerTable - Max per table
     * @returns {Object} { updatedGuests, guestTable, tablesEliminated, moves }
     */
    optimize(allGuests, checkIns, guestName, actualSize, maxPerTable) {
        // 1. Find the current guest's table (this will NEVER change)
        const currentGuestOriginal = allGuests.find(g => g.name === guestName);
        const guestOriginalTable = currentGuestOriginal ? currentGuestOriginal.table : null;

        // 2. Build working copy with actual sizes
        const working = allGuests.map(g => {
            const checkIn = checkIns.find(c => c.name === g.name);
            if (checkIn) {
                return { ...g, actualSize: checkIn.actualSize };
            }
            if (g.name === guestName) {
                return { ...g, actualSize: actualSize };
            }
            return { ...g, actualSize: g.partySize };
        });

        // 3. Calculate actual occupancy per table
        const tableOccupancy = {};
        for (const g of working) {
            if (!tableOccupancy[g.table]) {
                tableOccupancy[g.table] = { table: g.table, guests: [], totalActual: 0 };
            }
            tableOccupancy[g.table].guests.push(g);
            tableOccupancy[g.table].totalActual += g.actualSize;
        }

        console.log('[DynamicAssigner] Guest:', guestName, '→ Table', guestOriginalTable, '(PROTECTED)');
        console.log('[DynamicAssigner] Table occupancy:');
        for (const t of Object.values(tableOccupancy)) {
            const free = maxPerTable - t.totalActual;
            console.log(`  Table ${t.table}: ${t.totalActual} people, ${free} free${t.table === guestOriginalTable ? ' ★' : ''}`);
        }

        // 4. Try to eliminate tables — EXCLUDING the guest's table
        const moves = [];
        const tablesEliminated = [];

        // Candidates for elimination: all tables EXCEPT the guest's table
        const eliminationCandidates = Object.values(tableOccupancy)
            .filter(t => t.table !== guestOriginalTable) // NEVER eliminate guest's table
            .sort((a, b) => a.totalActual - b.totalActual); // smallest first

        for (const sourceTable of eliminationCandidates) {
            if (tablesEliminated.includes(sourceTable.table)) continue;

            const sourceSize = sourceTable.totalActual;
            if (sourceSize === 0) continue;

            // Find a target table that can absorb ALL of source's people
            const potentialTargets = Object.values(tableOccupancy)
                .filter(t => t.table !== sourceTable.table && !tablesEliminated.includes(t.table));

            for (const targetTable of potentialTargets) {
                // Compute target's CURRENT occupancy (accounts for previous merges in this loop)
                const currentTargetSize = working
                    .filter(g => g.table === targetTable.table)
                    .reduce((sum, g) => sum + g.actualSize, 0);
                const freeSpace = maxPerTable - currentTargetSize;

                if (sourceSize <= freeSpace) {
                    // ✓ Eliminate source table
                    console.log(`[DynamicAssigner] ✓ Eliminating Table ${sourceTable.table} (${sourceSize} people) → merge into Table ${targetTable.table} (${freeSpace} free)`);

                    for (const guest of working) {
                        if (guest.table === sourceTable.table) {
                            moves.push({
                                name: guest.name,
                                partySize: guest.actualSize,
                                fromTable: sourceTable.table,
                                toTable: targetTable.table
                            });
                            guest.table = targetTable.table;
                        }
                    }
                    tablesEliminated.push(sourceTable.table);
                    break;
                }
            }
        }

        // 5. Guest's final table is ALWAYS their original table
        const guestFinalTable = guestOriginalTable;

        if (tablesEliminated.length > 0) {
            console.log(`[DynamicAssigner] Tables eliminated: ${tablesEliminated.join(', ')}`);
            console.log(`[DynamicAssigner] Moves:`, moves.map(m => `${m.name}: ${m.fromTable}→${m.toTable}`).join(', '));
        } else {
            console.log('[DynamicAssigner] No tables can be eliminated.');
        }
        console.log(`[DynamicAssigner] Guest ${guestName} stays at Table ${guestFinalTable}`);

        return {
            updatedGuests: working,
            guestTable: guestFinalTable,
            tablesEliminated,
            moves
        };
    }
};
