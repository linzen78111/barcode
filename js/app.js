// 獲取 DOM 元素
const menuToggleBtn = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');
const searchInput = document.getElementById('searchInput');
const storeFilter = document.getElementById('storeFilter');
const barcodeList = document.getElementById('barcodeList');
const navItems = document.querySelectorAll('.nav-item');

// 上傳相關元素
const uploadButton = document.getElementById('uploadButton');
const uploadModal = document.getElementById('uploadModal');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewArea = document.querySelector('.upload-preview');
const previewTable = document.querySelector('.preview-table');
const btnUpload = document.querySelector('.btn-upload');

// 音效物件
const confirmSound = new Audio('SystemMessage_warning1.wav');
const processingSound = new Audio('SystemMessage_warning2.wav');
const errorSound = new Audio('ERROR.WAV');

// 手動輸入相關元素
const manualModal = document.getElementById('manualModal');
const manualForm = document.getElementById('manualForm');
const addManualBtn = document.getElementById('addManualBtn');
const uploadLocalDataBtn = document.getElementById('uploadLocalDataBtn');
const localDataList = document.getElementById('localDataList');
const localDataCount = document.getElementById('localDataCount');

// 條碼資料類別
class BarcodeData {
    constructor(data) {
        this.code = data.code || '';
        this.createdAt = data.createdAt || Date.now();
        this.description = data.description || '';
        this.fromOfficial = data.fromOfficial || false;
        this.id = data.id || 0;
        this.lastSyncTime = data.lastSyncTime || Date.now();
        this.last_updated = data.last_updated ? new Date(data.last_updated) : new Date();
        this.name = data.name || '';
        this.price = data.price || 0;
        this.store = data.store || '';
        this.syncStatus = data.syncStatus || 0;
        this.type = data.type || 'EAN-13';
        this.updatedAt = data.updatedAt || Date.now();
        this.user_id = data.user_id || '';
    }

    toFirestore() {
        return {
            code: this.code,
            createdAt: this.createdAt,
            description: this.description,
            fromOfficial: this.fromOfficial,
            id: this.id,
            lastSyncTime: this.lastSyncTime,
            last_updated: firebase.firestore.Timestamp.fromDate(this.last_updated),
            name: this.name,
            price: this.price,
            store: this.store,
            syncStatus: this.syncStatus,
            type: this.type,
            updatedAt: this.updatedAt,
            user_id: this.user_id
        };
    }

    static fromFirestore(doc) {
        const data = doc.data();
        return new BarcodeData({
            ...data,
            last_updated: data.last_updated?.toDate()
        });
    }
}

// 條碼服務
const barcodeService = {
    db: firebase.firestore(),
    
    // 載入條碼資料
    async loadBarcodes(store) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('請先登入');
            
            const barcodes = [];
            
            // 查詢官方 711 商店的條碼資料
            console.log('載入官方資料...');
            const officialSnapshot = await this.db
                .collection('official')
                .doc('data')
                .collection('stores')
                .doc(store)
                .collection('barcodes')
                .get();
            
            officialSnapshot.forEach(doc => {
                const data = doc.data();
                barcodes.push({
                    id: doc.id,
                    ...data,
                    fromOfficial: true
                });
            });
            
            console.log('載入的官方條碼資料數量:', officialSnapshot.size);
            
            // 查詢個人的 711 商店條碼資料
            console.log('載入個人資料...');
            const userSnapshot = await this.db
                .collection('users')
                .doc(user.uid)
                .collection('stores')
                .doc(store)
                .collection('barcodes')
                .get();
            
            userSnapshot.forEach(doc => {
                const data = doc.data();
                barcodes.push({
                    id: doc.id,
                    ...data,
                    fromOfficial: false
                });
            });
            
            console.log('載入的個人條碼資料數量:', userSnapshot.size);
            console.log('總共載入資料數量:', barcodes.length);
            
            return barcodes;
        } catch (error) {
            console.error('載入條碼資料時發生錯誤:', error);
            throw error;
        }
    },
    
    // 儲存條碼資料
    async saveBarcode(barcodeData) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('請先登入');
        
        const isOfficial = await this.isOfficialAccount();
        const store = barcodeData.store;
        
        // 根據是否為官方帳號決定儲存路徑
        let docRef;
        if (isOfficial) {
            docRef = this.db
                .collection('official')
                .doc('data')
                .collection('stores')
                .doc(store)
                .collection('barcodes')
                .doc(barcodeData.code);
                
            barcodeData.fromOfficial = true;
        } else {
            docRef = this.db
                .collection('users')
                .doc(user.uid)
                .collection('stores')
                .doc(store)
                .collection('barcodes')
                .doc(barcodeData.code);
                
            barcodeData.fromOfficial = false;
            barcodeData.user_id = user.uid;
        }
        
        // 添加時間戳和其他必要欄位
        barcodeData.createdAt = barcodeData.createdAt || firebase.firestore.Timestamp.now();
        barcodeData.updatedAt = firebase.firestore.Timestamp.now();
        
        await docRef.set(barcodeData, { merge: true });
    },
    
    // 批量上傳條碼資料
    async bulkUploadBarcodes(data) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('請先登入');
            
            const isOfficial = await this.isOfficialAccount();
            const batch = this.db.batch();
            const timestamp = firebase.firestore.Timestamp.now();
            
            // 將條碼資料按商店分組
            const storeGroups = {};
            data.forEach(barcode => {
                if (!storeGroups[barcode.store]) {
                    storeGroups[barcode.store] = [];
                }
                storeGroups[barcode.store].push(barcode);
            });
            
            // 批次處理每個商店的條碼
            for (const [store, storeBarcodes] of Object.entries(storeGroups)) {
                for (const barcode of storeBarcodes) {
                    // 根據用戶身份決定存儲路徑
                    let docRef;
                    if (isOfficial) {
                        docRef = this.db
                            .collection('official')
                            .doc('data')
                            .collection('stores')
                            .doc(store)
                            .collection('barcodes')
                            .doc(barcode.code);
                    } else {
                        docRef = this.db
                            .collection('users')
                            .doc(user.uid)
                            .collection('stores')
                            .doc(store)
                            .collection('barcodes')
                            .doc(barcode.code);
                    }
                    
                    const barcodeData = {
                        ...barcode,
                        fromOfficial: isOfficial,
                        createdAt: timestamp,
                        updatedAt: timestamp,
                        user_id: user.uid
                    };
                    
                    batch.set(docRef, barcodeData, { merge: true });
                }
            }
            
            await batch.commit();
        } catch (error) {
            console.error('批量上傳失敗:', error);
            throw error;
        }
    },
    
    // 獲取條碼資料
    async getBarcode(code, store) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('請先登入');
        
        // 先查詢官方資料
        const officialDoc = await this.db.doc(`official/data/stores/${store}/barcodes/${code}`).get();
        if (officialDoc.exists) {
            return new BarcodeData(officialDoc.data());
        }
        
        // 再查詢使用者資料
        const userDoc = await this.db.doc(`users/${user.uid}/stores/${store}/barcodes/${code}`).get();
        if (userDoc.exists) {
            return new BarcodeData(userDoc.data());
        }
        
        return null;
    },
    
    // 刪除條碼資料
    async deleteBarcode(code, store) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('請先登入');
        
        const isOfficial = await this.isOfficialAccount();
        if (isOfficial) {
            await this.db.doc(`official/data/stores/${store}/barcodes/${code}`).delete();
        } else {
            await this.db.doc(`users/${user.uid}/stores/${store}/barcodes/${code}`).delete();
        }
    },

    // 檢查是否為官方帳號
    async isOfficialAccount() {
        const user = firebase.auth().currentUser;
        if (!user) return false;
        
        // 指定官方帳號的 email
        const officialEmail = 'apple0902303636@gmail.com';
        return user.email === officialEmail;
    }
};

// 載入條碼資料
async function loadBarcodes() {
    try {
        console.log('開始執行 loadBarcodes 函數');
        
        const searchText = searchInput.value.toLowerCase().trim();
        const store = storeFilter.value;
        const currentPage = document.querySelector('.nav-item.active').dataset.page;
        
        // 只有在初次載入或切換頁面時才顯示載入動畫
        const isSearching = searchText !== '' || document.activeElement === searchInput;
        if (!isSearching) {
            await showCustomAlert('', 'loading');
        }
        
        console.log('搜尋條件:', { searchText, store, currentPage });
        
        // 清空現有列表
        const container = document.getElementById('barcodeList');
        container.innerHTML = '';
        
        // 載入資料
        const barcodes = await barcodeService.loadBarcodes(store);
        
        // 儲存完整的條碼資料到全局變數，供搜尋使用
        window.currentBarcodes = barcodes;
        
        // 根據當前頁面過濾資料
        let filteredBarcodes = barcodes.filter(barcode => {
            // 根據頁面類型過濾
            if (currentPage === 'official' && !barcode.fromOfficial) return false;
            if (currentPage === 'personal' && barcode.fromOfficial) return false;
            
            // 搜尋文字過濾
            if (!searchText) return true;
            
            // 將所有可搜尋的欄位轉為小寫，避免 null 或 undefined
            const name = (barcode.name || '').toLowerCase();
            const code = (barcode.code || '').toLowerCase();
            const description = (barcode.description || '').toLowerCase();
            const store = (barcode.store || '').toLowerCase();
            
            // 檢查是否符合搜尋條件
            return name.includes(searchText) || 
                   code.includes(searchText) || 
                   description.includes(searchText) ||
                   store.includes(searchText);
        });
        
        console.log('過濾後資料數量:', filteredBarcodes.length);
        
        // 只有在非搜尋時才確保載入動畫顯示足夠時間
        if (!isSearching) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 關閉載入動畫
        document.querySelector('.browser-dialog')?.remove();
        document.querySelector('.browser-dialog-overlay')?.remove();
        
        // 分批顯示資料
        const BATCH_SIZE = 50;
        for (let i = 0; i < filteredBarcodes.length; i += BATCH_SIZE) {
            const batch = filteredBarcodes.slice(i, i + BATCH_SIZE);
            batch.forEach(barcode => {
                const barcodeItem = renderBarcodeItem(barcode);
                if (barcodeItem) {
                    const item = barcodeItem.querySelector('.barcode-item');
                    if (item) {
                        item.addEventListener('click', () => showBarcodeDetails(barcode));
                    }
                    container.appendChild(barcodeItem);
                }
            });
        }
        
        // 如果沒有資料，顯示提示訊息
        if (filteredBarcodes.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-data';
            noData.textContent = '沒有找到相關資料';
            container.appendChild(noData);
        }
        
    } catch (error) {
        console.error('載入條碼資料失敗:', error);
        // 關閉載入動畫
        document.querySelector('.browser-dialog')?.remove();
        document.querySelector('.browser-dialog-overlay')?.remove();
        await showCustomAlert('載入條碼資料失敗，請稍後再試', 'error');
    }
}

// 顯示條碼資料
function displayBarcodes(barcodes) {
    const container = document.getElementById('barcodeList');
    container.innerHTML = '';
    
    if (barcodes.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'no-data';
        noData.textContent = '沒有找到相關資料';
        container.appendChild(noData);
        return;
    }
    
    barcodes.forEach(barcode => {
        const barcodeItem = renderBarcodeItem(barcode);
        
        // 為每個卡片添加點擊事件
        const item = barcodeItem.querySelector('.barcode-item');
        if (item) {
            item.addEventListener('click', () => showBarcodeDetails(barcode));
        }
        
        container.appendChild(barcodeItem);
    });
}

// 顯示條碼詳細資訊
function showBarcodeDetails(barcode) {
    console.log('顯示條碼詳情:', barcode);
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <h2>條碼詳情</h2>
            <div class="barcode-details">
                <div class="barcode-image-container">
                    <svg id="barcode-${barcode.code}"></svg>
                </div>
                <div class="barcode-info">
                    <p><strong>商品名稱：</strong>${barcode.name || '未命名商品'}</p>
                    <p><strong>條碼：</strong>${barcode.code || '無'}</p>
                    <p><strong>價格：</strong>$${barcode.price || 0}</p>
                    <p><strong>商店：</strong>${barcode.store || '未知'}</p>
                    ${barcode.description ? `<p><strong>描述：</strong>${barcode.description}</p>` : ''}
                </div>
            </div>
            <div class="form-actions">
                <button class="btn-cancel">關閉</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailsModal);
    
    // 顯示條碼
    if (barcode.code) {
        try {
            // 根據條碼長度決定格式
            let format;
            const code = barcode.code.replace(/\D/g, ''); // 移除非數字字符
            
            switch (code.length) {
                case 8:
                    format = "EAN8";
                    break;
                case 13:
                    format = "EAN13";
                    break;
                case 14:
                    format = "ITF14";
                    break;
                default:
                    format = "CODE128";
            }
            
            JsBarcode(`#barcode-${barcode.code}`, code, {
                format: format,
                width: 2,
                height: 100,
                displayValue: true,
                fontSize: 16,
                margin: 10,
                background: "#ffffff",
                lineColor: "#000000",
                textAlign: "center",
                textPosition: "bottom",
                textMargin: 6,
                font: "monospace"
            });
        } catch (error) {
            console.error('生成條碼失敗:', error);
            const barcodeContainer = detailsModal.querySelector('.barcode-image-container');
            barcodeContainer.innerHTML = '<p class="error">無法生成條碼圖片</p>';
        }
    }
    
    // 顯示對話框
    setTimeout(() => {
        detailsModal.style.display = 'flex';
        detailsModal.style.opacity = '1';
        detailsModal.style.visibility = 'visible';
    }, 10);
    
    // 關閉按鈕事件
    const closeBtn = detailsModal.querySelector('.btn-cancel');
    closeBtn.addEventListener('click', () => {
        detailsModal.style.opacity = '0';
        detailsModal.style.visibility = 'hidden';
        setTimeout(() => {
            document.body.removeChild(detailsModal);
        }, 300);
    });
}

// 側邊欄切換
function toggleSidebar() {
    console.log('切換側邊欄');
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('sidebar-active');
}

// 確保 DOM 元素已載入
if (menuToggleBtn && sidebar && mainContent) {
    // 點擊漢堡選單按鈕
    menuToggleBtn.addEventListener('click', (e) => {
        console.log('點擊漢堡選單按鈕');
        e.stopPropagation();  // 防止事件冒泡
        toggleSidebar();
    });

    // 點擊側邊欄內部不關閉
    sidebar.addEventListener('click', (e) => {
        console.log('點擊側邊欄');
        e.stopPropagation();
    });

    // 點擊文件任何地方關閉選單
    document.addEventListener('click', (e) => {
        console.log('點擊文件');
        // 如果點擊的不是側邊欄或漢堡選單按鈕，且側邊欄是開啟狀態
        if (!sidebar.contains(e.target) && 
            !menuToggleBtn.contains(e.target) && 
            sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });

    // 處理視窗大小改變
    window.addEventListener('resize', () => {
        console.log('視窗大小改變');
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            mainContent.classList.remove('sidebar-active');
        }
    });
}

// 開發者公告按鈕點擊事件
const showAnnouncementBtn = document.getElementById('showAnnouncementBtn');
if (showAnnouncementBtn) {
    showAnnouncementBtn.addEventListener('click', () => {
        const announcementModal = document.getElementById('developerAnnouncement');
        announcementModal.classList.add('active');
        
        // 在手機版時，點擊後關閉側邊欄
    if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            mainContent.classList.remove('sidebar-active');
    }
});
}

// 初始化公告功能
initializeAnnouncement();

// 搜尋功能相關
let searchTimeout;
searchInput.addEventListener('input', () => {
    // 清除之前的計時器
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // 設置新的計時器，延遲 300ms 執行搜尋
    searchTimeout = setTimeout(() => {
        const searchText = searchInput.value.toLowerCase().trim();
        const store = storeFilter.value;
        const currentPage = document.querySelector('.nav-item.active').dataset.page;
        
        // 從已載入的資料中過濾
        const container = document.getElementById('barcodeList');
        
        // 清空現有列表
        container.innerHTML = '';
        
        // 根據當前頁面過濾資料
        let filteredBarcodes = window.currentBarcodes.filter(barcode => {
            // 根據頁面類型過濾
            if (currentPage === 'official' && !barcode.fromOfficial) return false;
            if (currentPage === 'personal' && barcode.fromOfficial) return false;
            
            // 如果沒有搜尋文字，返回所有符合頁面類型的資料
            if (!searchText) return true;
            
            // 將所有可搜尋的欄位轉為小寫，避免 null 或 undefined
            const name = (barcode.name || '').toLowerCase();
            const code = (barcode.code || '').toLowerCase();
            const description = (barcode.description || '').toLowerCase();
            const store = (barcode.store || '').toLowerCase();
            
            // 檢查是否符合搜尋條件
            return name.includes(searchText) || 
                   code.includes(searchText) || 
                   description.includes(searchText) ||
                   store.includes(searchText);
        });
        
        // 分批顯示過濾後的資料
        const BATCH_SIZE = 50;
        for (let i = 0; i < filteredBarcodes.length; i += BATCH_SIZE) {
            const batch = filteredBarcodes.slice(i, i + BATCH_SIZE);
            batch.forEach(barcode => {
                const barcodeItem = renderBarcodeItem(barcode);
                if (barcodeItem) {
                    const item = barcodeItem.querySelector('.barcode-item');
                    if (item) {
                        item.addEventListener('click', () => showBarcodeDetails(barcode));
                    }
                    container.appendChild(barcodeItem);
                }
            });
        }
        
        // 如果沒有資料，顯示提示訊息
        if (filteredBarcodes.length === 0) {
            const noData = document.createElement('div');
            noData.className = 'no-data';
            noData.textContent = '沒有找到相關資料';
            container.appendChild(noData);
        }
    }, 300);
});

storeFilter.addEventListener('change', () => {
    loadBarcodes();
});

// 掃描相關變數
let html5QrcodeScanner = null;
const scanPage = document.getElementById('scanPage');
const scanResult = document.getElementById('scanResult');
const barcodeForm = document.getElementById('barcodeForm');
const codeInput = document.getElementById('code');
const nameInput = document.getElementById('name');
const priceInput = document.getElementById('price');
const storeInput = document.getElementById('store');
const descriptionInput = document.getElementById('description');

// 初始化掃描器
function initializeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
    
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", 
        { 
            fps: 10,
            qrbox: {width: 250, height: 250},
            aspectRatio: 1.0
        }
    );
    
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

// 清理掃描器
function clearScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
}

// 掃描成功處理
function onScanSuccess(decodedText, decodedResult) {
    console.log('條碼掃描成功:', decodedText);
    html5QrcodeScanner.pause();
    
    // 填入表單
    codeInput.value = decodedText;
    scanResult.classList.remove('hidden');
    
    // 查詢是否已有此條碼資料
    barcodeService.getBarcode(decodedText, storeInput.value)
        .then(existingBarcode => {
            if (existingBarcode) {
                nameInput.value = existingBarcode.name || '';
                priceInput.value = existingBarcode.price || '';
                descriptionInput.value = existingBarcode.description || '';
            }
        })
        .catch(error => {
            console.error('查詢條碼資料失敗:', error);
        });
}

// 掃描失敗處理
function onScanFailure(error) {
    // console.warn('條碼掃描失敗:', error);
}

// 表單提交處理
barcodeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const barcodeData = {
            code: codeInput.value,
            name: nameInput.value,
            price: Number(priceInput.value),
            store: storeInput.value,
            description: descriptionInput.value,
            type: 'EAN13',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('新增掃描資料到本地暫存:', barcodeData);
        localBarcodes.push(barcodeData);
        saveLocalBarcodes(); // 儲存更新後的暫存資料
        updateLocalDataList();
        
        // 重置表單
        barcodeForm.reset();
        scanResult.classList.add('hidden');
        
        // 重新開始掃描
        html5QrcodeScanner.resume();
        
        await showCustomAlert('條碼已加入暫存清單！');
    } catch (error) {
        console.error('儲存條碼資料失敗:', error);
        await showCustomAlert('儲存失敗：' + error.message, 'error');
    }
});

// 取消按鈕處理
document.querySelector('.btn-cancel').addEventListener('click', () => {
    scanPage.classList.add('hidden');
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
});

// 重新掃描按鈕處理
document.querySelector('.btn-rescan').addEventListener('click', () => {
    scanResult.classList.add('hidden');
    barcodeForm.reset();
    html5QrcodeScanner.resume();
});

// 掃描頁面的返回按鈕
document.querySelector('#scanPage .btn-back').addEventListener('click', () => {
    console.log('點擊掃描頁面返回按鈕');
    scanPage.classList.add('hidden');
    document.querySelector('.main-content').style.display = 'block';
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
    document.querySelector('[data-page="official"]').click();
});

// 側邊欄導航點擊事件
navItems.forEach(item => {
    item.addEventListener('click', async () => {
        const page = item.getAttribute('data-page');
        console.log('切換到頁面:', page);
        
        // 隱藏所有頁面
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        
        // 移除所有導航項目的 active 類
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // 添加當前導航項目的 active 類
        item.classList.add('active');
        
        // 根據頁面類型顯示對應內容
        switch (page) {
            case 'official':
                console.log('顯示官方資料頁面');
                document.getElementById('mainPage').classList.remove('hidden');
                clearScanner();
                loadBarcodes();
                break;
                
            case 'personal':
                console.log('顯示個人資料頁面');
                document.getElementById('mainPage').classList.remove('hidden');
                clearScanner();
                loadBarcodes();
                break;
                
            case 'scan':
                console.log('顯示掃描頁面');
                document.getElementById('scanPage').classList.remove('hidden');
                initializeScanner();
                break;
                
            case 'manual':
                console.log('顯示手動輸入頁面');
                document.getElementById('manualPage').classList.remove('hidden');
                clearScanner();
                break;
                
            case 'upload':
                console.log('顯示上傳確認對話框');
                if (localBarcodes.length === 0) {
                    errorSound.play();
                    await showCustomAlert('沒有可上傳的資料！', 'error');
                    document.querySelector('[data-page="manual"]').click();
                    return;
                }
                document.getElementById('mainPage').classList.remove('hidden');
                // 播放確認音效
                confirmSound.play();
                uploadModal.classList.remove('hidden');
                uploadModal.style.display = 'flex';
                uploadModal.style.opacity = '1';
                uploadModal.style.visibility = 'visible';
                updateUploadPreview();
                clearScanner();
                break;
        }
        
        // 在手機版時，點擊選單項目後關閉側邊欄
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            mainContent.classList.remove('sidebar-active');
        }
    });
});

// 手動輸入頁面的返回按鈕
document.querySelector('#manualPage .btn-back').addEventListener('click', () => {
    console.log('點擊手動輸入頁面返回按鈕');
    document.getElementById('manualPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
    document.querySelector('[data-page="official"]').click();
});

// 手動輸入頁面的取消按鈕
document.querySelector('#manualPage .btn-cancel').addEventListener('click', () => {
    console.log('點擊手動輸入頁面取消按鈕');
    document.getElementById('manualPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
    document.querySelector('[data-page="official"]').click();
});

// 處理上傳確認
document.querySelector('.btn-upload').addEventListener('click', async () => {
    console.log('確認上傳');
    const modal = document.getElementById('uploadModal');
    
    try {
        // 隱藏上傳確認對話框
        modal.classList.remove('active');
        modal.style.display = 'none';
        
        // 顯示等待彈窗並播放處理中音效
        processingSound.play();
        await showCustomAlert('資料處理中,請稍候...', 'loading');
        
        console.log('開始上傳本地暫存資料...');
        for (const barcode of localBarcodes) {
            console.log('上傳條碼:', barcode);
            await barcodeService.saveBarcode({
                ...barcode,
                createdAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            });
        }

        // 添加延遲，讓等待彈窗顯示更久
        await new Promise(resolve => setTimeout(resolve, 3800));

        // 關閉等待彈窗並顯示成功訊息
        document.querySelector('.browser-dialog')?.remove();
        document.querySelector('.browser-dialog-overlay')?.remove();
        await showCustomAlert('上傳成功！');
        
        localBarcodes = []; // 清空本地暫存
        saveLocalBarcodes(); // 儲存清空後的暫存資料
        updateLocalDataList(); // 更新本地暫存列表顯示
        loadBarcodes(); // 重新載入主頁面資料
        
        // 返回主頁面
        document.querySelector('[data-page="official"]').click();
    } catch (error) {
        console.error('上傳失敗:', error);
        // 關閉等待彈窗並顯示錯誤訊息
        document.querySelector('.browser-dialog')?.remove();
        document.querySelector('.browser-dialog-overlay')?.remove();
        await showCustomAlert('上傳失敗：' + error.message, 'error');
    }
});

// 更新上傳預覽
function updateUploadPreview() {
    const uploadCount = document.getElementById('uploadCount');
    uploadCount.textContent = localBarcodes.length;
}

// 上傳按鈕永遠顯示（移除檢查邏輯）
async function checkAndShowUploadButton() {
    uploadButton.classList.remove('hidden');
}

// 本地暫存的條碼資料
let localBarcodes = [];

// 從 localStorage 載入暫存資料
function loadLocalBarcodes() {
    const savedBarcodes = localStorage.getItem('localBarcodes');
    if (savedBarcodes) {
        try {
            localBarcodes = JSON.parse(savedBarcodes);
            updateLocalDataList();
        } catch (error) {
            console.error('載入暫存資料失敗:', error);
            localBarcodes = [];
        }
    }
}

// 儲存暫存資料到 localStorage
function saveLocalBarcodes() {
    try {
        localStorage.setItem('localBarcodes', JSON.stringify(localBarcodes));
    } catch (error) {
        console.error('儲存暫存資料失敗:', error);
    }
}

// 更新本地暫存列表
function updateLocalDataList() {
    console.log('更新本地暫存列表');
    const localDataList = document.getElementById('localDataList');
    const localDataCount = document.getElementById('localDataCount');
    
    if (!localDataList || !localDataCount) {
        console.error('找不到必要的 DOM 元素');
        return;
    }
    
    // 更新數量
    localDataCount.textContent = localBarcodes.length;
    
    // 清空列表
    localDataList.innerHTML = '';
    
    // 添加條碼項目
    localBarcodes.forEach((barcode, index) => {
        const item = document.createElement('div');
        item.className = 'local-data-item';
        item.innerHTML = `
            <div class="local-data-info">
                <h3>${barcode.name || '未命名商品'}</h3>
                <p>條碼: ${barcode.code || '無'}</p>
                <p>價格: $${barcode.price || 0}</p>
                <p>商店: ${barcode.store || '未知'}</p>
                ${barcode.description ? `<p class="description-preview">描述: ${barcode.description}</p>` : ''}
            </div>
            <div class="local-data-actions">
                <button class="btn-delete" data-index="${index}">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
        `;
        
        // 為新添加的刪除按鈕綁定事件
        const deleteBtn = item.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('刪除條碼，索引:', index);
            localBarcodes.splice(index, 1);
            saveLocalBarcodes(); // 儲存更新後的暫存資料
            updateLocalDataList();
        });
        
        localDataList.appendChild(item);
    });
}

// 處理手動輸入表單提交
manualForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('手動輸入表單提交');
    
    const barcodeData = {
        code: document.getElementById('manualCode').value,
        name: document.getElementById('manualName').value,
        price: Number(document.getElementById('manualPrice').value),
        store: document.getElementById('manualStore').value,
        description: document.getElementById('manualDescription').value,
        type: 'EAN13',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    console.log('新增暫存資料:', barcodeData);
    localBarcodes.push(barcodeData);
    saveLocalBarcodes(); // 儲存更新後的暫存資料
    
    // 更新本地暫存列表
    updateLocalDataList();
    
    // 顯示成功訊息
    await showCustomAlert('條碼已加入暫存清單！');
    
    // 重置表單並關閉對話框
    manualForm.reset();
    hideManualModal();
    
    // 確保本地暫存頁面顯示
    document.getElementById('localDataPage').classList.remove('hidden');
});

// 處理取消按鈕
document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
        console.log('點擊取消按鈕');
        if (btn.closest('#manualModal')) {
            hideManualModal();
        } else if (btn.closest('#uploadModal')) {
            uploadModal.classList.add('hidden');
            uploadModal.style.display = 'none';
            uploadModal.style.opacity = '0';
            uploadModal.style.visibility = 'hidden';
        }
    });
});

// 點擊對話框背景關閉
manualModal.addEventListener('click', (e) => {
    if (e.target === manualModal) {
        hideManualModal();
    }
});

// 新增條碼按鈕點擊事件
if (addManualBtn) {
    addManualBtn.addEventListener('click', () => {
        console.log('點擊新增條碼按鈕');
        showManualModal();
    });
} else {
    console.error('找不到新增條碼按鈕');
}

// 上傳全部按鈕
uploadLocalDataBtn.addEventListener('click', async () => {
    console.log('點擊上傳全部按鈕');
    if (localBarcodes.length === 0) {
        await showCustomAlert('沒有可上傳的資料！', 'error');
        return;
    }
    // 更新上傳預覽
    updateUploadPreview();
    // 顯示上傳確認對話框
    uploadModal.classList.remove('hidden');
    uploadModal.style.display = 'flex';
    uploadModal.style.opacity = '1';
    uploadModal.style.visibility = 'visible';
    document.getElementById('localDataPage').classList.remove('hidden');
});

// 請求全螢幕
function requestFullscreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('全螢幕請求被拒絕:', err);
        });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeDropZone();
    checkAndShowUploadButton();
    
    // 確保側邊欄初始狀態為收合
    sidebar.classList.add('collapsed');
    mainContent.classList.add('expanded');

    // 監聽所有可能的點擊事件，嘗試進入全螢幕
    document.addEventListener('click', () => {
        requestFullscreen();
    });

    // 監聽螢幕方向變化
    window.addEventListener('orientationchange', () => {
        setTimeout(requestFullscreen, 300);
    });

    // 初次載入時請求全螢幕
    requestFullscreen();

    // 在頁面載入時載入暫存資料
    loadLocalBarcodes();
});

// 在頁面載入時檢查登入狀態
window.addEventListener('load', async () => {
    try {
        // 檢查是否有重定向結果
        const result = await firebase.auth().getRedirectResult();
        if (result.user) {
            console.log("重定向登入成功");
            await handleLoginSuccess(result.user);
        }

        // 請求全螢幕
        requestFullscreen();
    } catch (error) {
        console.error("處理登入狀態時發生錯誤:", error);
    }
});

// 登入按鈕點擊事件
document.getElementById('googleLoginBtn').addEventListener('click', () => {
    console.log('點擊登入按鈕');
    googleLogin().catch(error => {
        console.error('登入過程發生錯誤:', error);
    });
});

// Firebase 身份驗證狀態變更監聽
firebase.auth().onAuthStateChanged(async (user) => {
    console.log('身份驗證狀態變更:', user ? '已登入' : '未登入');
    if (user) {
        await handleLoginSuccess(user);
    } else {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('mainPage').classList.add('hidden');
    }
});

// 開發者公告功能
async function showAnnouncement() {
    try {
        const user = firebase.auth().currentUser;
        console.log('檢查用戶登入狀態:', user ? '已登入' : '未登入');
        if (!user) {
            console.log('用戶未登入');
        return;
    }
    
        console.log('開始讀取公告文件');
        // 從 official/announcement 讀取公告
        const announcementDoc = await barcodeService.db.collection('official').doc('announcement').get();
        console.log('公告文件讀取結果:', {
            exists: announcementDoc.exists,
            data: announcementDoc.exists ? announcementDoc.data() : null
        });

        const announcementModal = document.getElementById('developerAnnouncement');
        const announcementOverlay = document.getElementById('announcementOverlay');
        const announcementContent = document.getElementById('announcementContent');
        
        console.log('檢查 DOM 元素:', {
            modal: !!announcementModal,
            overlay: !!announcementOverlay,
            content: !!announcementContent
        });
        
        console.log('目前登入的用戶:', user.email);
        const isOfficial = user.email === 'apple0902303636@gmail.com';
        console.log('是否為官方帳號:', isOfficial);

        // 設置公告內容
        if (announcementDoc.exists && announcementDoc.data()?.content) {
            const data = announcementDoc.data();
            console.log('設置現有公告內容:', data.content);
            announcementContent.innerHTML = data.content;
        } else {
            console.log('公告不存在或內容為空');
            // 如果是官方帳號且公告不存在，建立預設公告
            if (isOfficial) {
                console.log('建立預設公告');
                const defaultAnnouncement = {
                    content: '歡迎使用條碼系統！',
                    lastUpdated: firebase.firestore.Timestamp.fromDate(new Date('2025-04-06T05:16:21Z'))  // UTC+8 13:16:21
                };
                
                try {
                    await barcodeService.db.collection('official').doc('announcement').set(defaultAnnouncement, { merge: true });
                    console.log('預設公告建立成功');
                    announcementContent.innerHTML = defaultAnnouncement.content;
                } catch (error) {
                    console.error('建立預設公告失敗:', error);
                    announcementContent.innerHTML = '建立預設公告失敗';
                }
            } else {
                console.log('設置暫無公告訊息');
                announcementContent.innerHTML = '暫無公告';
            }
        }

        // 只有官方帳號可以編輯
        if (isOfficial) {
            console.log('啟用編輯模式');
            announcementContent.contentEditable = true;
            announcementContent.classList.add('editable');
            announcementContent.dataset.isEditing = 'true';
        } else {
            console.log('設置為唯讀模式');
            announcementContent.contentEditable = false;
            announcementContent.classList.remove('editable');
            announcementContent.dataset.isEditing = 'false';
        }

        // 顯示公告
        console.log('顯示公告視窗');
        announcementModal.classList.add('active');
        announcementOverlay.classList.add('active');
    } catch (error) {
        console.error('載入公告時發生錯誤:', error);
        await showCustomAlert('載入公告失敗：' + error.message, 'error');
    }
}

// 初始化公告功能
async function initializeAnnouncement() {
    console.log('開始初始化公告功能');
    
    const closeButton = document.getElementById('closeAnnouncement');
    const dontShowCheckbox = document.getElementById('dontShowToday');
    const announcementContent = document.getElementById('announcementContent');
    const showAnnouncementBtn = document.getElementById('showAnnouncementBtn');
    const announcementModal = document.getElementById('developerAnnouncement');
    const announcementOverlay = document.getElementById('announcementOverlay');

    // 檢查元素是否存在
    console.log('關閉按鈕存在:', !!closeButton);
    console.log('公告視窗存在:', !!announcementModal);

    // 初始化編輯狀態
    if (announcementContent) {
        announcementContent.dataset.isEditing = 'false';
    }

    // 關閉按鈕事件
    if (closeButton) {
        closeButton.addEventListener('click', async () => {
            console.log('關閉按鈕被點擊');
            
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('用戶未登入');
                return;
            }

            const isOfficial = user.email === 'apple0902303636@gmail.com';
            console.log('關閉時檢查 - 是否為官方帳號:', isOfficial);

            try {
                // 如果是官方帳號，儲存修改
                if (isOfficial) {
                    console.log('儲存公告內容:', announcementContent.innerHTML);
                    await barcodeService.db.collection('official').doc('announcement').set({
                        content: announcementContent.innerHTML,
                        lastUpdated: firebase.firestore.Timestamp.fromDate(new Date('2025-04-06T05:16:21Z'))
                    });
                    console.log('公告已更新');
                }

                // 處理「今天不再顯示」選項
                if (dontShowCheckbox && dontShowCheckbox.checked) {
                    console.log('用戶選擇今天不再顯示');
                    localStorage.setItem('lastShownAnnouncement', new Date().toDateString());
                }

                // 關閉公告視窗
                if (announcementModal && announcementOverlay) {
                    announcementModal.classList.remove('active');
                    announcementOverlay.classList.remove('active');
                    console.log('公告視窗已關閉');
                }
                
                // 重置編輯狀態
                if (announcementContent) {
                    announcementContent.contentEditable = false;
                    announcementContent.classList.remove('editable');
                    announcementContent.dataset.isEditing = 'false';
                    console.log('編輯狀態已重置');
                }

                // 切換到官方資料頁面
                console.log('切換到官方資料頁面');
                // 隱藏所有頁面
                document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
                // 顯示主頁面
                document.getElementById('mainPage').classList.remove('hidden');
                // 移除所有導航項目的 active 類
                navItems.forEach(nav => nav.classList.remove('active'));
                // 設置官方資料頁籤為活動狀態
                const officialTab = document.querySelector('[data-page="official"]');
                if (officialTab) {
                    officialTab.classList.add('active');
                    // 載入條碼資料
                    await loadBarcodes();
                }
            } catch (error) {
                console.error('處理公告關閉時發生錯誤:', error);
                await showCustomAlert('處理失敗：' + error.message, 'error');
            }
        });
        console.log('關閉按鈕事件已綁定');
    }

    // 點擊遮罩層關閉公告
    if (announcementOverlay) {
        announcementOverlay.addEventListener('click', async () => {
            console.log('遮罩層被點擊');
            
            const user = firebase.auth().currentUser;
            const isOfficial = user && user.email === 'apple0902303636@gmail.com';

            try {
                // 如果是官方帳號，儲存修改
                if (isOfficial) {
                    console.log('儲存公告內容:', announcementContent.innerHTML);
                    await barcodeService.db.collection('official').doc('announcement').set({
                        content: announcementContent.innerHTML,
                        lastUpdated: firebase.firestore.Timestamp.fromDate(new Date('2025-04-06T05:16:21Z'))
                    });
                    console.log('公告已更新');
                }

                // 處理「今天不再顯示」選項
                if (dontShowCheckbox && dontShowCheckbox.checked) {
                    console.log('用戶選擇今天不再顯示');
                    localStorage.setItem('lastShownAnnouncement', new Date().toDateString());
                }

                // 關閉公告視窗
                if (announcementModal) {
                    announcementModal.classList.remove('active');
                    announcementOverlay.classList.remove('active');
                    console.log('透過遮罩層關閉公告視窗');
                }
                
                // 重置編輯狀態
                if (announcementContent) {
                    announcementContent.contentEditable = false;
                    announcementContent.classList.remove('editable');
                    announcementContent.dataset.isEditing = 'false';
                }

                // 切換到官方資料頁面
                console.log('切換到官方資料頁面');
                // 隱藏所有頁面
                document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
                // 顯示主頁面
                document.getElementById('mainPage').classList.remove('hidden');
                // 移除所有導航項目的 active 類
                navItems.forEach(nav => nav.classList.remove('active'));
                // 設置官方資料頁籤為活動狀態
                const officialTab = document.querySelector('[data-page="official"]');
                if (officialTab) {
                    officialTab.classList.add('active');
                    // 載入條碼資料
                    await loadBarcodes();
                }
            } catch (error) {
                console.error('處理公告關閉時發生錯誤:', error);
                await showCustomAlert('處理失敗：' + error.message, 'error');
            }
        });
        console.log('遮罩層事件已綁定');
    }

    // 側邊欄公告按鈕點擊事件
    if (showAnnouncementBtn) {
        showAnnouncementBtn.addEventListener('click', () => {
            console.log('側邊欄公告按鈕被點擊');
            showAnnouncement();
        });
        console.log('側邊欄公告按鈕事件已綁定');
    }
    
    console.log('公告功能初始化完成');
}

// 初始化系統設定
async function initializeSystemSettings() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('用戶未登入');
            return;
        }

        console.log('開始初始化系統設定');
        const isOfficial = user.email === 'apple0902303636@gmail.com';
        
        // 檢查 announcement 文件是否存在
        const announcementDoc = await barcodeService.db.collection('official').doc('announcement').get();
        
        // 如果文件不存在或是官方帳號，則建立/更新文件
        if (!announcementDoc.exists || isOfficial) {
            console.log('建立/更新 announcement 文件');
            await barcodeService.db.collection('official').doc('announcement').set({
                content: '歡迎使用條碼系統！',
                lastUpdated: firebase.firestore.Timestamp.fromDate(new Date('2025-04-06T05:16:21Z'))
            }, { merge: true });
            console.log('announcement 文件已建立/更新');
        }
        
        console.log('系統設定初始化完成');
    } catch (error) {
        console.error('初始化系統設定失敗:', error);
        throw error;
    }
}

// 登入成功後的處理
async function handleLoginSuccess(user) {
    try {
        console.log('開始處理登入成功');
        // 更新用戶資訊
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (userAvatar && user.photoURL) {
            userAvatar.src = user.photoURL;
        }
        
        if (userName && user.displayName) {
            userName.textContent = user.displayName;
        }
        
        // 隱藏登入頁面
        document.getElementById('loginPage').classList.add('hidden');
        
        // 初始化系統設定
        await initializeSystemSettings();
        
        // 初始化公告功能
        await initializeAnnouncement();
        
        // 確保所有頁面都是隱藏的
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        
        // 移除所有導航項目的 active 類
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // 顯示主頁面並設置官方資料頁籤為活動狀態
        document.getElementById('mainPage').classList.remove('hidden');
        const officialTab = document.querySelector('[data-page="official"]');
        if (officialTab) {
            officialTab.classList.add('active');
        }
        
        // 立即載入官方資料
        await loadBarcodes();
        
        // 檢查是否今天選擇了不再顯示公告
        const lastShown = localStorage.getItem('lastShownAnnouncement');
        const today = new Date().toDateString();
        
        console.log('檢查公告顯示狀態:', { lastShown, today });
        
        if (lastShown !== today) {
            console.log('顯示今日公告');
            // 確保 DOM 元素已經完全載入
            setTimeout(async () => {
                try {
                    await showAnnouncement();
                    console.log('公告已顯示');
                } catch (error) {
                    console.error('顯示公告時發生錯誤:', error);
                }
            }, 1000);
        } else {
            console.log('用戶選擇今天不再顯示公告');
        }
        
        console.log('登入成功處理完成');
    } catch (error) {
        console.error('登入後處理失敗:', error);
        await showCustomAlert('初始化失敗：' + error.message, 'error');
    }
}

// Google 登入
async function googleLogin() {
    try {
        console.log("開始 Google 登入流程");
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        const auth = firebase.auth();
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        const result = await auth.signInWithPopup(provider);
        if (result.user) {
            console.log("登入成功");
            await handleLoginSuccess(result.user);
        }
    } catch (error) {
        console.error("登入錯誤:", error);
        // 如果彈出視窗被阻擋，嘗試使用重定向
        if (error.code === 'auth/popup-blocked') {
            console.log("彈出視窗被阻擋，嘗試使用重定向");
            const auth = firebase.auth();
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithRedirect(provider);
        } else {
            await showCustomAlert("登入失敗：" + error.message, 'error');
        }
    }
}

// 自定義 alert 函數
async function showCustomAlert(message, type = 'info') {
    return new Promise((resolve) => {
        // 移除任何現有的對話框
        const existingDialogs = document.querySelectorAll('.browser-dialog, .browser-dialog-overlay');
        existingDialogs.forEach(dialog => dialog.remove());

        // 創建新的對話框
        const dialog = document.createElement('div');
        dialog.className = 'browser-dialog';
        dialog.setAttribute('data-type', type);
        
        // 根據類型設置不同的內容
        if (type === 'loading') {
            dialog.innerHTML = `
                <div class="browser-dialog-content" style="width: 100vw; height: 100vh; max-width: none; margin: 0; padding: 0; border-radius: 0; background: #fff; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                    <div class="browser-dialog-body" style="text-align: center; padding: 0; width: 100%; height: 100%;">
                        <img src="SystemProcessing.bmp" alt="處理中" style="width: 100%; height: 100%; object-fit: fill;">
                    </div>
                </div>
            `;
            
            // 為 loading 類型設置特殊樣式
            dialog.style.width = '100vw';
            dialog.style.height = '100vh';
            dialog.style.maxWidth = 'none';
            dialog.style.maxHeight = 'none';
            dialog.style.margin = '0';
            dialog.style.padding = '0';
            dialog.style.borderRadius = '0';
            dialog.style.transform = 'none';
            dialog.style.top = '0';
            dialog.style.left = '0';
            dialog.style.background = '#fff';
        } else {
            dialog.innerHTML = `
                <div class="browser-dialog-content">
                    ${type === 'error' ? '<div class="browser-dialog-header"><h3>錯誤</h3></div>' : ''}
                    <div class="browser-dialog-body">
                        ${message}
                    </div>
                    ${type !== 'loading' ? `
                        <div class="browser-dialog-footer">
                            <button class="browser-dialog-btn browser-dialog-btn-primary" id="alertConfirmBtn">確定</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const overlay = document.createElement('div');
        overlay.className = 'browser-dialog-overlay';
        
        // 如果是 loading 類型，設置遮罩層樣式
        if (type === 'loading') {
            overlay.style.background = '#fff';
            overlay.style.opacity = '1';
        }

        // 添加到 body
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        // 顯示動畫
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            dialog.classList.add('active');
        });

        // 如果不是 loading 類型，才添加關閉功能
        if (type !== 'loading') {
            // 綁定按鈕事件
            const confirmBtn = dialog.querySelector('#alertConfirmBtn');
            const closeDialog = () => {
                dialog.classList.remove('active');
                overlay.classList.remove('active');
                setTimeout(() => {
                    dialog.remove();
                    overlay.remove();
                    resolve();
                }, 300);
            };

            // 點擊確定按鈕關閉
            confirmBtn.onclick = closeDialog;

            // ESC 鍵關閉
            document.addEventListener('keydown', function escListener(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escListener);
                    closeDialog();
                }
            });

            // 點擊背景不關閉，但會有視覺反饋
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    dialog.style.transform = 'translate(-50%, -50%) scale(0.98)';
                    setTimeout(() => {
                        dialog.style.transform = 'translate(-50%, -50%) scale(1)';
                    }, 100);
                }
            };
        } else {
            // 如果是 loading 類型，立即 resolve
            resolve();
        }
    });
}

// 替換原生的 alert
window.alert = async function(message, type = 'info') {
    await showCustomAlert(message, type);
};

// 渲染條碼項目
function renderBarcodeItem(data) {
    const template = document.getElementById('barcodeItemTemplate');
    const clone = template.content.cloneNode(true);
    
    // 設置商品名稱
    clone.querySelector('.product-name').textContent = data.name || '未命名商品';
    
    // 設置商店標籤
    clone.querySelector('.store-badge').textContent = data.store || '未知商店';
    
    // 設置條碼號碼
    clone.querySelector('.barcode-number').textContent = data.code || '無條碼';
    
    // 設置價格
    clone.querySelector('.price').textContent = data.price ? `$${data.price}` : '$0';
    
    // 設置描述文字（如果有的話）
    const descriptionEl = clone.querySelector('.description-text');
    if (data.description && data.description.trim()) {
        descriptionEl.textContent = data.description;
        descriptionEl.style.display = 'block';
    } else {
        descriptionEl.style.display = 'none';
    }
    
    return clone;
}

// 更新條碼列表
function updateBarcodeList(barcodes) {
    const container = document.getElementById('barcodeList');
    container.innerHTML = '';
    
    if (barcodes.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'no-data';
        noData.textContent = '沒有找到相關條碼';
        container.appendChild(noData);
        return;
    }
    
    barcodes.forEach(barcode => {
        container.appendChild(renderBarcodeItem(barcode));
    });
}

// 顯示上傳確認對話框
function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    const uploadCount = document.getElementById('uploadCount');
    const loadingText = document.getElementById('loadingText');
    const uploadPreview = modal.querySelector('.upload-preview');
    const formActions = modal.querySelector('.form-actions');
    
    // 重置狀態
    loadingText.classList.remove('active');
    uploadPreview.classList.remove('loading');
    formActions.style.display = 'flex';
    
    // 設置待上傳數量
    const count = getLocalBarcodeCount();
    uploadCount.textContent = count;
    
    // 顯示對話框
    modal.classList.add('active');
}

// 開始上傳
async function startUpload() {
    const modal = document.getElementById('uploadModal');
    const loadingText = document.getElementById('loadingText');
    const uploadPreview = modal.querySelector('.upload-preview');
    const formActions = modal.querySelector('.form-actions');
    
    try {
        // 顯示加載狀態
        loadingText.classList.add('active');
        uploadPreview.classList.add('loading');
        formActions.style.display = 'none';
        
        // 執行上傳操作
        await uploadLocalBarcodes();
        
        // 上傳成功後關閉對話框
        modal.classList.remove('active');
        
        // 顯示成功提示
        showMessage('上傳成功！');
        
    } catch (error) {
        console.error('上傳失敗:', error);
        showMessage('上傳失敗: ' + error.message, 'error');
        
    } finally {
        // 重置狀態
        loadingText.classList.remove('active');
        uploadPreview.classList.remove('loading');
        formActions.style.display = 'flex';
    }
}

// 綁定上傳按鈕事件
document.querySelector('#uploadModal .btn-upload').addEventListener('click', startUpload); 