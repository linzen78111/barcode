// 臨時修復腳本，解決 barcodeService 導入問題和送信按鈕的問題
document.addEventListener('DOMContentLoaded', function() {
  // 初始化時僅輸出一次
  console.log('條碼系統修復腳本已載入');
  
  // 是否已完成初始化
  let initialized = false;
  
  // 只靜音特定的音效，而不是覆蓋全局Audio構造函數
  function muteSpecificSounds() {
    // 只在首次執行時輸出
    if (!initialized) {
      console.log('已設置特定音效靜音');
    }
    
    // 直接靜音已存在的音效對象
    if (window.errorSound) {
      window.errorSound.volume = 0;
      window.errorSound.play = function() { return Promise.resolve(); };
    }
    
    if (window.confirmSound) {
      window.confirmSound.volume = 0;
      window.confirmSound.play = function() { return Promise.resolve(); };
    }
    
    if (window.processingSound) {
      window.processingSound.volume = 0;
      window.processingSound.play = function() { return Promise.resolve(); };
    }
    
    // 不再覆蓋全局Audio構造函數，改為使用代理模式攔截特定音效
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      if (tagName.toLowerCase() === 'audio') {
        // 為新創建的音頻元素添加攔截
        const originalPlay = element.play;
        element.play = function() {
          // 檢查來源，如果是ERROR.WAV或SystemMessage_warning1.wav則靜音
          if (element.src && (
              element.src.includes('ERROR.WAV') || 
              element.src.includes('SystemMessage_warning') || 
              element.src.includes('SystemProcessing'))) {
            element.volume = 0;
            return Promise.resolve();
          }
          return originalPlay.call(this);
        };
      }
      return element;
    };
  }
  
  // 檢查是否有資料需要上傳的輔助函數
  function hasDataToUpload() {
    // 檢查全局變數
    if (typeof window.localBarcodes !== 'undefined' && 
        Array.isArray(window.localBarcodes) && 
        window.localBarcodes.length > 0) {
      console.log('檢測到資料：', window.localBarcodes.length, '筆');
      return true;
    }
    
    // 如果window.localBarcodes不存在或是空的，嘗試從localStorage取得
    try {
      const savedBarcodes = localStorage.getItem('localBarcodes');
      if (savedBarcodes) {
        const parsedBarcodes = JSON.parse(savedBarcodes);
        if (Array.isArray(parsedBarcodes) && parsedBarcodes.length > 0) {
          // 更新全局變數
          window.localBarcodes = parsedBarcodes;
          console.log('從localStorage檢測到資料：', parsedBarcodes.length, '筆');
          return true;
        }
      }
    } catch (e) {
      console.error('檢查localStorage失敗:', e);
    }
    
    console.log('沒有檢測到資料');
    return false;
  }
  
  // 修復側邊欄的上傳按鈕點擊行為
  const fixUploadButtonClick = () => {
    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
      // 移除多餘日誌
      uploadButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // 使用輔助函數檢查是否有資料
        if (!hasDataToUpload()) {
          // 無資料情況
          showNoDataAlert();
          return false;
        }
        
        // 有資料才顯示上傳對話框
        const modal = document.getElementById('uploadModal');
        if (modal) {
          modal.classList.add('active');
          modal.style.display = 'flex';
          modal.style.opacity = '1';
          modal.style.visibility = 'visible';
          
          // 設置上傳數量
          const uploadCount = document.getElementById('uploadCount');
          if (uploadCount) {
            uploadCount.textContent = window.localBarcodes.length;
          }
        }
        
        return false;
      };
    }
  };
  
  // 修復送信按鈕點擊事件
  const fixModalUploadButtonClick = () => {
    const uploadBtn = document.querySelector('.btn-upload');
    if (uploadBtn) {
      // 移除多餘日誌
      uploadBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // 使用輔助函數檢查是否有資料
        if (!hasDataToUpload()) {
          // 無資料情況
          
          // 關閉送信模態窗口
          const modal = document.getElementById('uploadModal');
          if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
          }
          
          // 顯示錯誤訊息
          showNoDataAlert();
          
          return false;
        }
        
        // 有資料則正常執行送信程序
        if (window.startUpload) {
          window.startUpload();
        }
        
        return false;
      };
    }
  };
  
  // 覆蓋app.js中的showUploadModal函數，確保在無資料時不顯示對話框
  if (window.showUploadModal) {
    const originalShowUploadModal = window.showUploadModal;
    window.showUploadModal = function() {
      // 使用輔助函數檢查是否有資料
      if (!hasDataToUpload()) {
        return Promise.resolve();
      }
      
      // 有資料才調用原始函數
      return originalShowUploadModal();
    };
  }
  
  // 修復manualForm事件，確保手動輸入功能正常
  function fixManualForm() {
    const manualForm = document.getElementById('manualForm');
    if (manualForm && !manualForm._fixed) {
      manualForm._fixed = true; // 標記已修復，避免重複修復
      
      // 確保手動輸入表單能夠正常工作
      const originalSubmit = manualForm.onsubmit;
      
      // 不覆蓋原有的submit事件，但確保手動輸入功能正常
      // 這裡不需要做任何事，只是確保不影響原有功能
    }
  }
  
  // 執行所有修復
  function applyAllFixes() {
    muteSpecificSounds();
    fixUploadButtonClick();
    fixModalUploadButtonClick();
    fixManualForm();
    initialized = true;
  }
  
  // 首次執行修復
  applyAllFixes();
  
  // 確保在完全載入後再次執行修復，但不重複輸出日誌
  setTimeout(applyAllFixes, 1000);
  
  // 監視DOM變化，確保新添加的按鈕也被正確處理，但不重複輸出日誌
  const observer = new MutationObserver(function(mutations) {
    let needsFix = false;
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        needsFix = true;
      }
    });
    
    if (needsFix) {
      applyAllFixes();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 專用於顯示無資料警告的函數
  function showNoDataAlert() {
    // 檢查是否已存在警告對話框
    const existingDialogs = document.querySelectorAll('.browser-dialog, .browser-dialog-overlay');
    existingDialogs.forEach(dialog => dialog.remove());
    
    // 創建新的對話框
    const dialog = document.createElement('div');
    dialog.className = 'browser-dialog';
    dialog.setAttribute('data-type', 'error');
    
    dialog.innerHTML = `
      <div class="browser-dialog-content">
        <div class="browser-dialog-header"><h3>錯誤</h3></div>
        <div class="browser-dialog-body">無送信資料！</div>
        <div class="browser-dialog-footer">
          <button class="browser-dialog-btn browser-dialog-btn-primary" id="alertConfirmBtn">確定</button>
        </div>
      </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.className = 'browser-dialog-overlay';
    
    // 添加到 body
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // 顯示動畫
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      dialog.classList.add('active');
    });
    
    // 關閉對話框的函數
    const closeDialog = () => {
      dialog.classList.remove('active');
      overlay.classList.remove('active');
      setTimeout(() => {
        dialog.remove();
        overlay.remove();
        
        // 確保所有頁面都隱藏，再顯示主頁面
        document.querySelectorAll('.page').forEach(p => {
          p.classList.add('hidden');
          p.style.display = 'none';
        });
        
        const mainPage = document.getElementById('mainPage');
        if (mainPage) {
          mainPage.classList.remove('hidden');
          mainPage.style.display = 'block';
        }
        
        // 確保主內容區域可見
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.style.display = 'block';
        }
        
        // 顯示頂部搜尋區域
        const contentHeader = document.querySelector('.content-header');
        if (contentHeader) {
          contentHeader.style.display = 'flex';
        }
        
        // 顯示條碼列表區域
        const barcodeList = document.getElementById('barcodeList');
        if (barcodeList) {
          barcodeList.style.display = 'block';
        }
        
        // 確保側邊欄導航項目正確激活
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(nav => nav.classList.remove('active'));
        const officialNavItem = document.querySelector('[data-page="official"]');
        if (officialNavItem) {
          officialNavItem.classList.add('active');
        }
        
        // 嘗試重新載入資料
        if (window.loadBarcodes) {
          window.loadBarcodes().catch(e => console.error("重新載入資料失敗:", e));
        }
      }, 300);
    };
    
    // 點擊確定按鈕關閉
    const confirmBtn = dialog.querySelector('#alertConfirmBtn');
    if (confirmBtn) {
      confirmBtn.onclick = closeDialog;
    }
    
    // ESC 鍵關閉
    const escListener = function(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escListener);
        closeDialog();
      }
    };
    document.addEventListener('keydown', escListener);
    
    // 點擊背景不關閉，但會有視覺反饋
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        dialog.style.transform = 'translate(-50%, -50%) scale(0.98)';
        setTimeout(() => {
          dialog.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
      }
    };
  }
}); 