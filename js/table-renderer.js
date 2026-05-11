/**
 * Table Map Renderer
 * Renders a 2D grid layout of tables using CSS Grid
 */

const TableRenderer = {
    /**
     * Render the table map into a container element
     * @param {HTMLElement} container - Target DOM element
     * @param {Object} config - { totalTables, gridRows, gridCols }
     * @param {number|null} highlightTable - Table number to highlight (optional)
     */
    render(container, config, highlightTable = null) {
        const { totalTables, gridRows, gridCols } = config;

        // Clear container
        container.innerHTML = '';

        // Create stage marker
        const stage = document.createElement('div');
        stage.className = 'stage-marker';
        stage.textContent = '🎤 SÂN KHẤU';
        container.appendChild(stage);

        // Create map grid
        const mapGrid = document.createElement('div');
        mapGrid.className = 'table-map';
        mapGrid.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;

        // Render tables
        for (let i = 1; i <= totalTables; i++) {
            const tableEl = document.createElement('div');
            tableEl.className = 'table-map-item';
            tableEl.textContent = i;
            tableEl.setAttribute('data-table', i);

            if (highlightTable && i === highlightTable) {
                tableEl.classList.add('highlighted');
                tableEl.innerHTML = `<span>${i}</span>`;
            }

            mapGrid.appendChild(tableEl);
        }

        // Fill empty cells if totalTables < rows * cols
        const emptyCells = (gridRows * gridCols) - totalTables;
        for (let i = 0; i < emptyCells; i++) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'table-map-item';
            emptyEl.style.visibility = 'hidden';
            mapGrid.appendChild(emptyEl);
        }

        container.appendChild(mapGrid);

        // Add entrance marker
        const entrance = document.createElement('div');
        entrance.className = 'stage-marker';
        entrance.style.background = 'var(--gold)';
        entrance.textContent = '🚪 LỐI VÀO';
        container.appendChild(entrance);
    },

    /**
     * Render a compact mini-map for guest view
     */
    renderMini(container, config, highlightTable) {
        const { totalTables, gridRows, gridCols } = config;

        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${gridCols}, 1fr);
            gap: 6px;
            padding: 1rem;
            background: rgba(163, 177, 138, 0.08);
            border-radius: 12px;
            border: 1px solid var(--sage-light);
            max-width: 350px;
            margin: 0 auto;
        `;

        // Stage (spans all columns)
        const stage = document.createElement('div');
        stage.style.cssText = `
            grid-column: 1 / -1;
            background: var(--olive);
            color: white;
            padding: 4px;
            border-radius: 4px;
            text-align: center;
            font-size: 0.7rem;
            font-weight: 500;
        `;
        stage.textContent = 'Sân khấu';
        wrapper.appendChild(stage);

        for (let i = 1; i <= totalTables; i++) {
            const cell = document.createElement('div');
            const isHighlighted = i === highlightTable;
            
            cell.style.cssText = `
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: ${isHighlighted ? '0.8rem' : '0.65rem'};
                font-weight: ${isHighlighted ? '700' : '500'};
                background: ${isHighlighted ? 'linear-gradient(135deg, var(--terracotta), var(--gold))' : 'var(--warm-white)'};
                color: ${isHighlighted ? 'white' : 'var(--text-muted)'};
                border: ${isHighlighted ? '2px solid var(--terracotta-dark)' : '1.5px solid var(--sage-light)'};
                transform: ${isHighlighted ? 'scale(1.2)' : 'scale(1)'};
                box-shadow: ${isHighlighted ? '0 2px 10px rgba(193, 102, 107, 0.4)' : 'none'};
                transition: all 0.3s ease;
            `;
            cell.textContent = i;

            if (isHighlighted) {
                cell.style.animation = 'pulse-highlight 2s ease-in-out infinite';
            }

            wrapper.appendChild(cell);
        }

        container.appendChild(wrapper);
    }
};
