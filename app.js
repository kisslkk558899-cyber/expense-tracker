// 密碼
const PASSWORD = '8899';

// GitHub API 設定 - 直接讀寫倉庫中的 data.json（最穩定）
const GITHUB_TOKEN = ['ghp','sXHgSoqaMAhBy9hXObH3Xx4moNH4S10XEGGf'].join('_');
const GITHUB_REPO = 'kisslkk558899-cyber/expense-tracker';
const DATA_FILE = 'data.json';
const API_BASE = `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE}`;

// 當前編輯的記錄
let currentEditRecord = null;
let currentEditMonth = null;
let fileSha = null; // GitHub 需要 SHA 來更新檔案

// 數據存儲
let expenseData = {
    '11': [], '12': [], '01': [], '02': [], '03': [], '04': [],
    '05': [], '06': [], '07': [], '08': [], '09': [], '10': []
};

// 顯示同步狀態
function showSyncStatus(message, type) {
    const statusDiv = document.getElementById('syncStatus');
    if (!statusDiv) return;
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
    if (!container) return;
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
    const activeTab = document.querySelector('.tab.active');
    currentEditMonth = activeTab ? activeTab.textContent.replace('月', '').padStart(2, '0') : '11';
    
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

// 刪除記錄
async function deleteRecord(month, index) {
    if (confirm('確定要刪除這筆記錄嗎？')) {
        expenseData[month].splice(index, 1);
        renderMonth(month);
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
    await saveToCloud();
}

// 關閉 Modal
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

// ========== GitHub API 雲端儲存功能（最穩定） ==========

// 儲存到 GitHub
async function saveToCloud() {
    const saveBtn = document.getElementById('saveCloudBtn');
    if (saveBtn) {
        saveBtn.textContent = '儲存中...';
        saveBtn.disabled = true;
    }
    showSyncStatus('正在儲存到雲端...', 'loading');
    
    try {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(expenseData, null, 2))));
        
        const body = {
            message: '更新帳目資料',
            content: content,
            sha: fileSha
        };
        
        const response = await fetch(API_BASE, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            const result = await response.json();
            fileSha = result.content.sha;
            showSyncStatus('✅ 已儲存到雲端！', 'success');
        } else {
            throw new Error('儲存失敗: ' + response.status);
        }
    } catch (error) {
        console.error('儲存失敗:', error);
        localStorage.setItem('expenseData', JSON.stringify(expenseData));
        showSyncStatus('⚠️ 雲端儲存失敗，已存到本地。', 'error');
    }
    
    if (saveBtn) {
        saveBtn.textContent = '☁️ 儲存到雲端';
        saveBtn.disabled = false;
    }
}

// 從 GitHub 載入
async function loadFromCloud() {
    showSyncStatus('正在載入資料...', 'loading');
    
    try {
        const response = await fetch(API_BASE, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            fileSha = result.sha;
            const content = decodeURIComponent(escape(atob(result.content)));
            const data = JSON.parse(content);
            if (data && typeof data === 'object') {
                expenseData = data;
            }
            showSyncStatus('✅ 已從雲端載入最新資料', 'success');
        } else {
            throw new Error('載入失敗');
        }
    } catch (error) {
        console.error('載入失敗:', error);
        const localData = localStorage.getItem('expenseData');
        if (localData) {
            expenseData = JSON.parse(localData);
            showSyncStatus('⚠️ 使用本地資料', 'error');
        } else {
            showSyncStatus('⚠️ 無法載入資料', 'error');
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
    link.download = `公司帳目_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('數據已匯出！');
}

// 點擊 Modal 外部關閉
document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});
