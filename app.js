// 密碼
const PASSWORD = '8899';

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

// 登入功能
function login(event) {
    event.preventDefault();
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('loginError');
    
    if (password === PASSWORD) {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('mainContainer').classList.remove('hidden');
        loadData();
        renderAllMonths();
    } else {
        errorDiv.textContent = '密碼錯誤，請重試';
        errorDiv.classList.remove('hidden');
    }
}

// 切換月份
function switchMonth(month) {
    // 更新 tab 樣式
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // 顯示對應月份
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
                    ${record.expenses.length > 0 ? record.expenses.map(exp => `<div class="expense-item">${exp}</div>`).join('') : '<div class="expense-item">無</div>'}
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
    document.getElementById('editExpenses').value = record.expenses.join('\n');
    document.getElementById('editTotal').value = record.total || '';
    document.getElementById('editBalance').value = record.balance || '';
    
    document.getElementById('editModal').classList.add('active');
}

// 刪除記錄
function deleteRecord(month, index) {
    if (confirm('確定要刪除這筆記錄嗎？')) {
        expenseData[month].splice(index, 1);
        saveData();
        renderMonth(month);
    }
}

// 保存記錄
function saveRecord(event) {
    event.preventDefault();
    
    const record = {
        date: document.getElementById('editDate').value,
        deposit: document.getElementById('editDeposit').value.trim(),
        expenses: document.getElementById('editExpenses').value.trim().split('\n').filter(e => e.trim()),
        total: document.getElementById('editTotal').value.trim(),
        balance: document.getElementById('editBalance').value.trim()
    };
    
    if (currentEditRecord !== null) {
        // 編輯現有記錄
        expenseData[currentEditMonth][currentEditRecord] = record;
    } else {
        // 新增記錄
        expenseData[currentEditMonth].push(record);
        // 按日期排序
        expenseData[currentEditMonth].sort((a, b) => a.date.localeCompare(b.date));
    }
    
    saveData();
    renderMonth(currentEditMonth);
    closeModal();
}

// 關閉 Modal
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

// 保存數據到 localStorage
function saveData() {
    localStorage.setItem('expenseData', JSON.stringify(expenseData));
}

// 從 localStorage 載入數據
function loadData() {
    const saved = localStorage.getItem('expenseData');
    if (saved) {
        expenseData = JSON.parse(saved);
    } else {
        // 首次載入，從 data.json 載入初始數據
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                expenseData = data;
                saveData();
                renderAllMonths();
            })
            .catch(error => console.error('載入數據失敗:', error));
    }
}

// 匯出數據功能
function exportData() {
    const dataStr = JSON.stringify(expenseData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // 使用當前日期作為檔名
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
