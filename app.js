// 密碼
const PASSWORD = '8899';

// JSONBin 設定 - 雲端儲存
const JSONBIN_BIN_ID = '697fe1f8d0ea881f4099998a';
const JSONBIN_API_KEY = '$2a$10$L/JCi3focRp9YLHAMZwKpOYB1cMJI7xOskG9YmLZoEbDYqXXh9W12';

// 當前編輯的記錄
let currentEditRecord = null;
let currentEditMonth = null;

// 數據存儲
let expenseData = {
    '11': [],
    '12': [],
    '01': [],
    '02': [],
    '03': [],
    '04': [],
    '05': [],
    '06': [],
    '07': [],
    '08': [],
    '09': [],
    '10': []
};

// 顯示同步狀態
function showSyncStatus(message, type) {
    const statusDiv = document.getElementById('syncStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'sync-status ' + type;
    statusDiv.classList.remove('hidden');
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
}

// 登入功能
function login(event) {
    event.preventDefault();
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('loginError');
    
    if (password === PASSWORD) {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('mainContainer').classList.remove('hidden');
        loadFromCloud();
    } else {
        errorDiv.textContent = '密碼錯誤，請重試';
        errorDiv.classList.remove('hidden');
    }
}

// 切換月份
function switchMonth(month) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.month-section').forEach(section => section.classList.remove('active'));
    document.getElementById(`month-${month}`).classList.add('active');
}

// 渲染所有月份
function renderAllMonths() {
    const months = ['11', '12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    months.forEach(month => renderMonth(month));
}

// 渲染單個月份
function renderMonth(month) {
    const container = document.getElementById(`month-${month}`);
    const records = expenseData[month] || [];
    
    if (records.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">暫無記錄</p>';
        return;
    }
    
    let html = '';
    records.forEach((record, index) => {
        html += `
            <div class="record">
                <div class="record-header">
                    <div class="record-date">日期：${record.date}</div>
                    <div class="record-actions">
                        <button class="btn btn-primary" onclick="editRecord('${month}', ${index})">編輯</button>
                        <button class="btn btn-danger" onclick="deleteRecord('${month}', ${index})">刪除</button>
                    </div>
                </div>
                <div class="record-content">
                    ${record.deposit ? `<div><strong>入款：</strong>${record.deposit}</div>` : ''}
                    <div><strong>開銷明細：</strong></div>
                    ${record.expenses && record.expenses.length > 0 ? record.expenses.map(exp => `<div class="expense-item">${exp}</div>`).join('') : '<div class="expense-item">無</div>'}
                    ${record.total ? `<div><strong>當日開銷總計：</strong>${record.total}</div>` : ''}
                    ${record.balance ? `<div class="balance">餘額：${record.balance}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 顯示新增 Modal
function showAddModal() {
    currentEditRecord = null;
    currentEditMonth = document.querySelector('.tab.active').textContent.replace('月', '').padStart(2, '0');
    
    document.getElementById('modalTitle').textContent = '新增記錄';
    document.getElementById('editDate').value = '';
    document.getElementById('editDeposit').value = '';
    document.getElementById('editExpenses').value = '';
    document.getElementById('editTotal').value = '';
    document.getElementById('editBalance').value = '';
    
    document.getElementById('editModal').classList.add('active');
}

// 編輯記錄
function editRecord(month, index) {
    currentEditRecord = index;
    currentEditMonth = month;
    
    const record = expenseData[month][index];
    
    document.getElementById('modalTitle').textContent = '編輯記錄';
    document.getElementById('editDate').value = record.date;
    document.getElementById('editDeposit').value = record.deposit || '';
    document.getElementById('editExpenses').value = (record.expenses || []).join('\n');
    document.getElementById('editTotal').value = record.total || '';
    document.getElementById('editBalance').value = record.balance || '';
    
    document.getElementById('editModal').classList.add('active');
}

// 刪除記錄 - 同時刪除雲端
async function deleteRecord(month, index) {
    if (confirm('確定要刪除這筆記錄嗎？\n刪除後會同步到雲端，所有人都會看到刪除後的結果。')) {
        expenseData[month].splice(index, 1);
        renderMonth(month);
        
        // 自動同步到雲端
        await saveToCloud();
    }
}

// 保存記錄
async function saveRecord(event) {
    event.preventDefault();
    
    const record = {
        date: document.getElementById('editDate').value,
        deposit: document.getElementById('editDeposit').value.trim() || null,
        expenses: document.getElementById('editExpenses').value.trim().split('\n').filter(e => e.trim()),
        total: document.getElementById('editTotal').value.trim() || null,
        balance: document.getElementById('editBalance').value.trim() || null
    };
    
    if (currentEditRecord !== null) {
        expenseData[currentEditMonth][currentEditRecord] = record;
    } else {
        expenseData[currentEditMonth].push(record);
        expenseData[currentEditMonth].sort((a, b) => a.date.localeCompare(b.date));
    }
    
    renderMonth(currentEditMonth);
    closeModal();
    
    // 自動同步到雲端
    await saveToCloud();
}

// 關閉 Modal
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

// ========== 雲端儲存功能（使用 JSONBin） ==========

// 儲存到雲端（JSONBin）
async function saveToCloud() {
    const saveBtn = document.getElementById('saveCloudBtn');
    saveBtn.textContent = '儲存中...';
    saveBtn.disabled = true;
    showSyncStatus('正在儲存到雲端...', 'loading');
    
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(expenseData)
        });
        
        if (response.ok) {
            showSyncStatus('✅ 已儲存到雲端！任何人打開網頁都會看到最新資料。', 'success');
        } else {
            throw new Error('儲存失敗');
        }
    } catch (error) {
        console.error('儲存失敗:', error);
        // 如果雲端失敗，使用備用方案：localStorage
        localStorage.setItem('expenseData', JSON.stringify(expenseData));
        showSyncStatus('⚠️ 雲端儲存失敗，已存到本地。請稍後再試。', 'error');
    }
    
    saveBtn.textContent = '☁️ 儲存到雲端';
    saveBtn.disabled = false;
}

// 從雲端載入（JSONBin）
async function loadFromCloud() {
    showSyncStatus('正在載入資料...', 'loading');
    
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            expenseData = data.record;
            showSyncStatus('✅ 已從雲端載入最新資料', 'success');
        } else {
            throw new Error('載入失敗');
        }
    } catch (error) {
        console.error('載入失敗:', error);
        // 嘗試從 localStorage 載入
        const localData = localStorage.getItem('expenseData');
        if (localData) {
            expenseData = JSON.parse(localData);
            showSyncStatus('⚠️ 使用本地資料', 'error');
        } else {
            showSyncStatus('⚠️ 無法載入資料，使用空白資料', 'error');
        }
    }
    
    renderAllMonths();
}

// 匯出數據功能
function exportData() {
    const dataStr = JSON.stringify(expenseData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    link.download = `公司帳目_${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('數據已匯出！');
}

// 點擊 Modal 外部關閉
document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});
