/**
 * Admin Page Logic
 * Handles: Excel upload, table config, push to sheets, QR generation
 */

(function() {
    'use strict';

    // State
    let guestData = [];
    let tableConfig = {
        totalTables: 20,
        gridRows: 4,
        gridCols: 5,
        maxPerTable: 10
    };

    // DOM Elements
    const fileDropArea = document.getElementById('file-drop-area');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const dataPreview = document.getElementById('data-preview');
    const previewTable = document.getElementById('preview-table').querySelector('tbody');
    const guestCount = document.getElementById('guest-count');

    const totalTablesInput = document.getElementById('total-tables');
    const gridRowsInput = document.getElementById('grid-rows');
    const gridColsInput = document.getElementById('grid-cols');
    const maxPerTableInput = document.getElementById('max-per-table');
    const previewLayoutBtn = document.getElementById('preview-layout-btn');
    const layoutPreview = document.getElementById('layout-preview');
    const tableMapPreview = document.getElementById('table-map-preview');

    const pushToSheetsBtn = document.getElementById('push-to-sheets-btn');
    const generateQrBtn = document.getElementById('generate-qr-btn');
    const deployStatus = document.getElementById('deploy-status');
    const qrDisplay = document.getElementById('qr-display');
    const qrCode = document.getElementById('qr-code');
    const downloadQrBtn = document.getElementById('download-qr-btn');

    // ============ FILE UPLOAD ============

    // Click to upload
    fileDropArea.addEventListener('click', () => fileInput.click());

    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.classList.add('dragover');
    });

    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('dragover');
    });

    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.name.match(/\.xlsx?$/i)) {
            showStatus(uploadStatus, 'error', '❌ Vui lòng chọn file Excel (.xlsx)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                parseExcelData(jsonData);
                showStatus(uploadStatus, 'success', `✅ Đã tải file "${file.name}" thành công!`);
            } catch (err) {
                console.error(err);
                showStatus(uploadStatus, 'error', `❌ Lỗi đọc file: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function parseExcelData(data) {
        if (data.length < 2) {
            showStatus(uploadStatus, 'error', '❌ File không có dữ liệu');
            return;
        }

        // Skip header row, parse data
        guestData = data.slice(1)
            .filter(row => row[0] && String(row[0]).trim().length > 0)
            .map((row, idx) => ({
                id: idx + 1,
                name: String(row[0] || '').trim(),
                partySize: parseInt(row[1]) || 1,
                table: parseInt(row[2]) || 0
            }));

        renderPreview();
    }

    function renderPreview() {
        previewTable.innerHTML = '';
        guestCount.textContent = guestData.length;

        guestData.forEach((guest, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${escapeHtml(guest.name)}</td>
                <td>${guest.partySize}</td>
                <td>${guest.table || '—'}</td>
            `;
            previewTable.appendChild(tr);
        });

        dataPreview.style.display = 'block';
    }

    // ============ TABLE CONFIGURATION ============

    previewLayoutBtn.addEventListener('click', () => {
        tableConfig = {
            totalTables: parseInt(totalTablesInput.value) || 20,
            gridRows: parseInt(gridRowsInput.value) || 4,
            gridCols: parseInt(gridColsInput.value) || 5,
            maxPerTable: parseInt(maxPerTableInput.value) || 10
        };

        layoutPreview.style.display = 'block';
        TableRenderer.render(
            document.querySelector('#layout-preview'),
            tableConfig
        );
    });

    // ============ PUSH TO GOOGLE SHEETS ============

    pushToSheetsBtn.addEventListener('click', async () => {
        if (guestData.length === 0) {
            showStatus(deployStatus, 'error', '❌ Chưa có dữ liệu khách mời. Vui lòng tải file Excel trước.');
            return;
        }

        if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            showStatus(deployStatus, 'error', '❌ Chưa cấu hình Google Sheets API. Vui lòng cập nhật file js/config.js');
            return;
        }

        pushToSheetsBtn.disabled = true;
        pushToSheetsBtn.textContent = '⏳ Đang đẩy dữ liệu...';

        try {
            // Update table config from current form values
            tableConfig = {
                totalTables: parseInt(totalTablesInput.value) || 20,
                gridRows: parseInt(gridRowsInput.value) || 4,
                gridCols: parseInt(gridColsInput.value) || 5,
                maxPerTable: parseInt(maxPerTableInput.value) || 10
            };

            const result = await SheetsAPI.pushAllData(guestData, tableConfig);

            showStatus(deployStatus, 'success', '✅ Đã đẩy dữ liệu lên Google Sheets thành công!');
        } catch (err) {
            console.error(err);
            showStatus(deployStatus, 'error', `❌ Lỗi: ${err.message}`);
        } finally {
            pushToSheetsBtn.disabled = false;
            pushToSheetsBtn.textContent = '☁️ Đẩy lên Google Sheets';
        }
    });

    // ============ QR CODE GENERATION ============

    generateQrBtn.addEventListener('click', () => {
        const guestUrl = CONFIG.GUEST_PAGE_URL;

        if (guestUrl.includes('YOUR_GITHUB_USERNAME')) {
            showStatus(deployStatus, 'info', 
                '⚠️ Chưa cập nhật URL trang khách. Vui lòng cập nhật GUEST_PAGE_URL trong js/config.js');
            return;
        }

        qrCode.innerHTML = '';
        
        // Generate QR code using qrcodejs library
        try {
            new QRCode(qrCode, {
                text: guestUrl,
                width: 280,
                height: 280,
                colorDark: '#3D2C2E',
                colorLight: '#FFFDF5',
                correctLevel: QRCode.CorrectLevel.H
            });
            qrDisplay.style.display = 'block';
            showStatus(deployStatus, 'success', '✅ Đã tạo mã QR thành công!');
        } catch (error) {
            console.error('QR generation error:', error);
            showStatus(deployStatus, 'error', `❌ Lỗi tạo QR: ${error.message}`);
        }
    });

    // Download QR
    downloadQrBtn.addEventListener('click', () => {
        const canvas = qrCode.querySelector('canvas');
        const img = qrCode.querySelector('img');
        
        const link = document.createElement('a');
        link.download = 'wedding-seat-qr.png';
        
        if (canvas) {
            link.href = canvas.toDataURL('image/png');
        } else if (img) {
            link.href = img.src;
        } else {
            return;
        }
        link.click();
    });

    // ============ UTILITIES ============

    function showStatus(container, type, message) {
        container.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
