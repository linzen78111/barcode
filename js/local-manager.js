// 顯示本地暫存管理器
function showLocalDataManager() {
    console.log("開始執行 showLocalDataManager 函數");
    
    // 直接創建一個全新的模態視窗，替換現有的
    let oldModal = document.getElementById("localDataManager");
    if (oldModal) {
        oldModal.remove();
    }
    
    console.log("創建新的管理器模態視窗");
    const managerModal = document.createElement("div");
    managerModal.id = "localDataManager";
    managerModal.className = "modal";
    
    // 設置一個標記，用於跟踪是否執行了清空操作
    window.didClearAllData = false;
    
    // 設置內聯樣式確保顯示
    managerModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: auto;
        visibility: visible;
        opacity: 1;
    `;
    
    managerModal.innerHTML = `
        <div class="modal-content" style="
            background-color: #fff; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); 
            max-width: 90%; 
            width: 500px; 
            padding: 20px; 
            max-height: 80vh; 
            overflow: hidden; 
            display: flex; 
            flex-direction: column; 
            margin: 50px auto; 
            position: relative;
        ">
            <h2 style="margin-top: 0; margin-bottom: 16px; color: #3498db; font-size: 1.5rem; text-align: center;">
                管理暫存資料 (<span id="managerCount">0</span>)
            </h2>
            
            <!-- 搜索框 -->
            <div style="margin-bottom: 15px;">
                <input type="text" id="searchBarcode" placeholder="搜尋條碼或商品名稱..." style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.9rem;
                    box-sizing: border-box;
                ">
            </div>
            
            <div id="managerList" style="overflow-y: auto; max-height: 50vh; margin-bottom: 16px;"></div>
            <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="clearAllLocalData" class="btn-delete" style="
                    background-color: #ff5252; 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    padding: 8px 16px; 
                    cursor: pointer; 
                    font-size: 0.9rem;
                ">清空所有</button>
                <button class="btn-cancel" style="
                    background-color: #3498db; 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    padding: 8px 16px; 
                    cursor: pointer; 
                    font-size: 0.9rem;
                ">關閉</button>
            </div>
        </div>
    `;
    
    // 確保模態視窗添加到 body 的最後位置
    document.body.appendChild(managerModal);
    console.log("管理器模態視窗已添加到文檔");
    
    // 關閉按鈕事件
    const closeBtn = managerModal.querySelector(".btn-cancel");
    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            console.log("點擊了關閉按鈕");
            // 只有在沒有清空所有數據時才恢復原始數據
            if (!window.didClearAllData && window.originalBarcodes) {
                localBarcodes = [...window.originalBarcodes];
                console.log("關閉時恢復原始數據");
            }
            window.originalBarcodes = null;
            window.didClearAllData = false;
            managerModal.remove();
        });
        console.log("已綁定關閉按鈕事件");
    } else {
        console.error("無法找到關閉按鈕");
    }
    
    // 清空所有按鈕事件
    const clearBtn = managerModal.querySelector("#clearAllLocalData");
    if (clearBtn) {
        clearBtn.addEventListener("click", async function() {
            console.log("點擊了清空所有按鈕");
            
            const result = await showCustomConfirm("確定要清空所有暫存資料嗎？此操作無法撤銷。", {
                title: "確認清空暫存",
                yesText: "確定清空",
                noText: "取消",
                yesStyle: "danger"
            });
            
            if (result) {
                // 清空數據並標記已清空
                localBarcodes = [];
                window.originalBarcodes = [];
                window.didClearAllData = true;
                saveLocalBarcodes();
                updateManagerList(1);
                
                // 使用通用的頂層通知函數
                showTopNotification("已清空所有暫存資料");
            }
        });
        console.log("已綁定清空所有按鈕事件");
    } else {
        console.error("無法找到清空所有按鈕");
    }
    
    // 搜索功能事件監聽
    const searchInput = managerModal.querySelector("#searchBarcode");
    if (searchInput) {
        // 儲存原始條碼數據的副本
        window.originalBarcodes = [...localBarcodes];
        
        searchInput.addEventListener("input", function() {
            const searchTerm = searchInput.value.trim().toLowerCase();
            
            if (searchTerm === "") {
                // 如果搜索框為空，恢復原始數據
                localBarcodes = [...window.originalBarcodes];
            } else {
                // 過濾符合搜索條件的條碼
                localBarcodes = window.originalBarcodes.filter(barcode => {
                    return (barcode.name && barcode.name.toLowerCase().includes(searchTerm)) || 
                           (barcode.code && barcode.code.toLowerCase().includes(searchTerm)) ||
                           (barcode.description && barcode.description.toLowerCase().includes(searchTerm));
                });
            }
            
            // 更新列表顯示，從第一頁開始
            updateManagerList(1);
        });
        
        console.log("已綁定搜索框事件");
    } else {
        console.error("無法找到搜索框");
    }
    
    // 更新列表
    updateManagerList(1);
    
    console.log("顯示管理器模態視窗，當前顯示狀態:", managerModal.style.display);
    
    // 增加點擊外部關閉功能
    managerModal.addEventListener("click", function(e) {
        if (e.target === managerModal) {
            console.log("點擊背景關閉模態視窗");
            // 只有在沒有清空所有數據時才恢復原始數據
            if (!window.didClearAllData && window.originalBarcodes) {
                localBarcodes = [...window.originalBarcodes];
                console.log("背景點擊關閉時恢復原始數據");
            }
            window.originalBarcodes = null;
            window.didClearAllData = false;
            managerModal.remove();
        }
    });
}

// 更新管理器列表
function updateManagerList(page = 1) {
    console.log("開始執行 updateManagerList 函數");
    console.log("當前暫存資料數量:", localBarcodes.length);
    
    const managerList = document.getElementById("managerList");
    const managerCount = document.getElementById("managerCount");
    
    if (!managerList || !managerCount) {
        console.error("找不到必要的管理器元素", {
            managerList: !!managerList,
            managerCount: !!managerCount
        });
        return;
    }
    
    // 每頁顯示數量和頁數計算
    const itemsPerPage = 10;
    const totalPages = Math.ceil(localBarcodes.length / itemsPerPage);
    
    // 確保當前頁在有效範圍內
    const currentPage = Math.max(1, Math.min(page, totalPages)) || 1;
    
    // 計算當前頁的開始和結束索引
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, localBarcodes.length);
    
    console.log("更新管理器數量:", localBarcodes.length);
    console.log("當前頁/總頁數:", currentPage, "/", totalPages);
    
    // 更新數量
    managerCount.textContent = localBarcodes.length;
    
    // 清空列表
    managerList.innerHTML = "";
    
    // 如果沒有資料，顯示提示
    if (localBarcodes.length === 0) {
        console.log("暫存中沒有條碼資料");
        
        const noData = document.createElement("div");
        noData.className = "no-data";
        noData.style.textAlign = "center";
        noData.style.padding = "20px";
        noData.style.color = "#888";
        noData.style.fontStyle = "italic";
        noData.textContent = "沒有暫存資料";
        
        managerList.appendChild(noData);
        console.log("已添加無資料提示");
        return;
    }
    
    // 添加當前頁的條碼項目
    for (let i = startIndex; i < endIndex; i++) {
        const barcode = localBarcodes[i];
        const index = i;
        
        console.log("添加條碼項目:", index, barcode.name);
        
        const item = document.createElement("div");
        item.className = "local-data-item";
        item.style.border = "1px solid #e0e0e0";
        item.style.borderRadius = "6px";
        item.style.padding = "12px";
        item.style.marginBottom = "10px";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.backgroundColor = "#f9f9f9";
        
        item.innerHTML = `
            <div class="local-data-info" style="flex: 1;">
                <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 1.1rem; color: #333;">${barcode.name || '未命名商品'}</h3>
                <p style="margin: 4px 0; color: #555; font-size: 0.9rem;">條碼: ${barcode.code || '無'}</p>
                <p style="margin: 4px 0; color: #555; font-size: 0.9rem;">價格: $${barcode.price || 0}</p>
                <p style="margin: 4px 0; color: #555; font-size: 0.9rem;">商店: ${barcode.store || '未知'}</p>
                ${barcode.description ? `<p style="margin: 4px 0; color: #555; font-size: 0.9rem;">描述: ${barcode.description}</p>` : ''}
            </div>
            <div class="local-data-actions" style="display: flex; align-items: flex-start;">
                <button class="btn-delete" data-index="${index}" style="background-color: #ff5252; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 0.9rem;">
                    刪除
                </button>
            </div>
        `;
        
        // 刪除按鈕事件
        const deleteBtn = item.querySelector(".btn-delete");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", async function() {
                console.log('點擊刪除按鈕，索引:', index);
                
                const result = await showCustomConfirm(`確定要刪除「${barcode.name || '未命名商品'}」嗎？`, {
                    title: "確認刪除",
                    yesText: "確定刪除",
                    noText: "取消",
                    yesStyle: "danger"
                });
                
                if (result) {
                    localBarcodes.splice(index, 1);
                    saveLocalBarcodes();
                    updateManagerList(currentPage);
                    
                    // 使用通用的頂層通知函數
                    showTopNotification(`已刪除「${barcode.name || '未命名商品'}」`);
                }
            });
            console.log("已綁定刪除按鈕事件");
        } else {
            console.error("找不到刪除按鈕");
        }
        
        managerList.appendChild(item);
        console.log("條碼項目已添加到列表");
    }
    
    // 添加分頁控制
    if (totalPages > 1) {
        const paginationContainer = document.createElement("div");
        paginationContainer.className = "pagination";
        paginationContainer.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 15px;
            padding: 10px;
            gap: 5px;
        `;
        
        // 添加頁碼資訊
        const pageInfo = document.createElement("div");
        pageInfo.style.cssText = `
            margin: 0 10px;
            color: #3498db;
            font-size: 0.9rem;
            font-weight: bold;
        `;
        pageInfo.textContent = `${currentPage} / ${totalPages} 頁`;
        
        // 添加上一頁按鈕
        const prevBtn = document.createElement("button");
        prevBtn.className = "pagination-btn";
        prevBtn.textContent = "上一頁";
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.cssText = `
            padding: 5px 10px;
            background-color: ${currentPage === 1 ? '#e0e0e0' : '#3498db'};
            color: ${currentPage === 1 ? '#888' : 'white'};
            border: none;
            border-radius: 4px;
            cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};
        `;
        if (currentPage > 1) {
            prevBtn.addEventListener("click", function() {
                updateManagerList(currentPage - 1);
            });
        }
        
        // 添加下一頁按鈕
        const nextBtn = document.createElement("button");
        nextBtn.className = "pagination-btn";
        nextBtn.textContent = "下一頁";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.cssText = `
            padding: 5px 10px;
            background-color: ${currentPage === totalPages ? '#e0e0e0' : '#3498db'};
            color: ${currentPage === totalPages ? '#888' : 'white'};
            border: none;
            border-radius: 4px;
            cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};
        `;
        if (currentPage < totalPages) {
            nextBtn.addEventListener("click", function() {
                updateManagerList(currentPage + 1);
            });
        }
        
        // 添加到分頁容器
        paginationContainer.appendChild(prevBtn);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextBtn);
        
        // 添加到列表底部
        managerList.appendChild(paginationContainer);
    }
    
    console.log("更新管理器列表完成");
} 