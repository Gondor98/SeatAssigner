/**
 * Overflow Checker & Auto Re-Assigner
 * Checks table capacity and moves overflow groups to new tables
 * 
 * Rules:
 * - Party members are NEVER separated across tables
 * - Overflow groups go to NEW tables (not existing ones)
 * - Original table assignments are preserved where possible
 * - Groups are processed in order; first ones stay, later ones spill over
 */

const OverflowChecker = {

    /**
     * Check and fix overflow for all tables
     * @param {Array} guests - Array of { name, partySize, table }
     * @param {number} maxPerTable - Maximum guests per table
     * @param {number} totalTables - Current total number of tables
     * @returns {Object} { fixedGuests, changes, newTotalTables, hasOverflow }
     */
    checkAndFix(guests, maxPerTable, totalTables) {
        // Group guests by table
        const tableGroups = this._groupByTable(guests);
        const changes = [];
        let nextNewTable = totalTables + 1;

        // Check each table for overflow
        const fixedGuests = [...guests];

        for (const [tableNum, groups] of Object.entries(tableGroups)) {
            const table = parseInt(tableNum);
            const totalPeople = groups.reduce((sum, g) => sum + g.partySize, 0);

            if (totalPeople > maxPerTable) {
                // Table overflows — reassign excess groups to new tables
                const result = this._redistributeTable(groups, maxPerTable, table, nextNewTable);
                
                // Apply changes to fixedGuests
                for (const change of result.moves) {
                    const guestIdx = fixedGuests.findIndex(g => 
                        g.name === change.name && g.table === table
                    );
                    if (guestIdx !== -1) {
                        fixedGuests[guestIdx] = { ...fixedGuests[guestIdx], table: change.newTable };
                    }
                }

                changes.push({
                    originalTable: table,
                    totalPeople: totalPeople,
                    maxAllowed: maxPerTable,
                    overflow: totalPeople - maxPerTable,
                    moves: result.moves,
                    newTablesCreated: result.newTablesUsed
                });

                nextNewTable = result.nextAvailableTable;
            }
        }

        return {
            fixedGuests,
            changes,
            newTotalTables: nextNewTable - 1,
            hasOverflow: changes.length > 0
        };
    },

    /**
     * Validate without fixing - just report issues
     */
    validate(guests, maxPerTable) {
        const tableGroups = this._groupByTable(guests);
        const issues = [];

        for (const [tableNum, groups] of Object.entries(tableGroups)) {
            const totalPeople = groups.reduce((sum, g) => sum + g.partySize, 0);
            if (totalPeople > maxPerTable) {
                issues.push({
                    table: parseInt(tableNum),
                    totalPeople,
                    maxAllowed: maxPerTable,
                    overflow: totalPeople - maxPerTable,
                    groupCount: groups.length
                });
            }
        }

        return issues;
    },

    /**
     * Redistribute groups from an overflowing table
     * Keep groups in order: first groups stay, later ones spill to new tables
     */
    _redistributeTable(groups, maxPerTable, originalTable, startNewTable) {
        let currentCount = 0;
        const moves = [];
        let currentNewTable = startNewTable;
        let currentNewTableCount = 0;

        for (const group of groups) {
            if (currentCount + group.partySize <= maxPerTable) {
                // Fits in original table — keep it
                currentCount += group.partySize;
            } else {
                // Doesn't fit — move to new table
                // Check if new table also overflows
                if (currentNewTableCount + group.partySize > maxPerTable) {
                    // Current new table is also full, create another new table
                    currentNewTable++;
                    currentNewTableCount = 0;
                }

                moves.push({
                    name: group.name,
                    partySize: group.partySize,
                    originalTable: originalTable,
                    newTable: currentNewTable
                });
                currentNewTableCount += group.partySize;
            }
        }

        const newTablesUsed = [];
        const uniqueNewTables = [...new Set(moves.map(m => m.newTable))];
        for (const t of uniqueNewTables) {
            const people = moves.filter(m => m.newTable === t).reduce((s, m) => s + m.partySize, 0);
            newTablesUsed.push({ table: t, people });
        }

        return {
            moves,
            newTablesUsed,
            nextAvailableTable: currentNewTable + 1
        };
    },

    /**
     * Group guests by their table number, preserving order
     */
    _groupByTable(guests) {
        const tables = {};
        for (const guest of guests) {
            if (!tables[guest.table]) {
                tables[guest.table] = [];
            }
            tables[guest.table].push(guest);
        }
        return tables;
    },

    /**
     * Generate a human-readable summary of changes (Vietnamese)
     */
    formatChanges(changes) {
        if (changes.length === 0) return '';

        let html = '<div class="overflow-report">';
        html += '<strong>⚠️ Phát hiện bàn vượt quá số lượng:</strong><ul>';

        for (const change of changes) {
            html += `<li>Bàn ${change.originalTable}: ${change.totalPeople} người (tối đa ${change.maxAllowed})`;
            html += '<ul>';
            for (const move of change.moves) {
                html += `<li>→ <strong>${move.name}</strong> (${move.partySize} người) chuyển sang <strong>Bàn ${move.newTable}</strong></li>`;
            }
            html += '</ul></li>';
        }

        html += '</ul></div>';
        return html;
    }
};
