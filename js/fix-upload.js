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
  
  // 修復公告功能，確保內容不會重置
  function fixAnnouncementContent() {
    // 首先檢查是否在localStorage中保存了公告內容
    try {
      // 將公告內容保存到localStorage中
      const saveAnnouncementContent = () => {
        const announcementContent = document.getElementById('announcementContent');
        if (announcementContent && announcementContent.innerHTML) {
          localStorage.setItem('savedAnnouncementContent', announcementContent.innerHTML);
          console.log('已保存公告內容到localStorage');
        }
      };
      
      // 從localStorage中恢復公告內容
      const restoreAnnouncementContent = () => {
        const announcementContent = document.getElementById('announcementContent');
        const savedContent = localStorage.getItem('savedAnnouncementContent');
        
        if (announcementContent && savedContent) {
          // 確保顯示本地保存的內容
          announcementContent.innerHTML = savedContent;
          console.log('已從localStorage恢復公告內容');
          
          // 設置編輯權限
          const user = firebase.auth().currentUser;
          const isOfficial = user && user.email === 'apple0902303636@gmail.com';
          
          if (isOfficial) {
            console.log('恢復內容後設置為編輯模式');
            announcementContent.contentEditable = true;
            announcementContent.classList.add('editable');
            if (announcementContent.dataset) {
              announcementContent.dataset.isEditing = 'true';
            }
          } else {
            console.log('恢復內容後設置為唯讀模式');
            announcementContent.contentEditable = false;
            announcementContent.classList.remove('editable');
            if (announcementContent.dataset) {
              announcementContent.dataset.isEditing = 'false';
            }
          }
          
          return true;
        }
        return false;
      };
      
      // 保存到Firebase的函數
      const saveToFirebase = async () => {
        try {
          const user = firebase.auth().currentUser;
          if (!user) {
            console.log('用戶未登入，無法保存到Firebase');
            return false;
          }
          
          const isOfficial = user.email === 'apple0902303636@gmail.com';
          if (!isOfficial) {
            console.log('非官方帳號，不保存到Firebase');
            return false;
          }
          
          const announcementContent = document.getElementById('announcementContent');
          if (!announcementContent || !announcementContent.innerHTML) {
            console.log('公告內容不存在或為空');
            return false;
          }
          
          console.log('儲存公告內容到Firebase:', announcementContent.innerHTML);
          await barcodeService.db.collection('official').doc('announcement').set({
            content: announcementContent.innerHTML,
            lastUpdated: firebase.firestore.Timestamp.fromDate(new Date())
          });
          console.log('公告內容已成功保存到Firebase');
          return true;
        } catch (error) {
          console.error('保存到Firebase失敗:', error);
          return false;
        }
      };
      
      // 修改showAnnouncement函數，優先使用localStorage中的內容
      if (typeof window.showAnnouncement === 'function') {
        const originalShowAnnouncement = window.showAnnouncement;
        
        window.showAnnouncement = async function() {
          console.log('調用修改後的showAnnouncement函數');
          
          // 檢查是否今天已經選擇了不再顯示
          const lastShown = localStorage.getItem('lastShownAnnouncement');
          const today = new Date().toDateString();
          
          if (lastShown === today) {
            console.log('用戶選擇今天不再顯示公告，跳過顯示');
            return Promise.resolve();
          }
          
          // 顯示公告前嘗試從localStorage恢復內容
          const announcementModal = document.getElementById('developerAnnouncement');
          const announcementOverlay = document.getElementById('announcementOverlay');
          const announcementContent = document.getElementById('announcementContent');
          
          // 檢查用戶是否為官方帳號
          const user = firebase.auth().currentUser;
          const isOfficial = user && user.email === 'apple0902303636@gmail.com';
          console.log('是否為官方帳號(修復版):', isOfficial);
          
          // 設置編輯權限
          if (announcementContent) {
            if (isOfficial) {
              console.log('啟用編輯模式(修復版)');
              announcementContent.contentEditable = true;
              announcementContent.classList.add('editable');
              announcementContent.dataset.isEditing = 'true';
            } else {
              console.log('設置為唯讀模式(修復版)');
              announcementContent.contentEditable = false;
              announcementContent.classList.remove('editable');
              announcementContent.dataset.isEditing = 'false';
            }
          }
          
          // 顯示公告
          if (announcementModal && announcementOverlay) {
            // 先嘗試恢復內容
            const restored = restoreAnnouncementContent();
            
            // 如果沒有恢復成功，則調用原始函數
            if (!restored) {
              await originalShowAnnouncement();
              
              // 然後保存從Firebase加載的內容到localStorage
              saveAnnouncementContent();
              
              // 再次設置編輯權限，因為原始函數可能已經設置過了
              if (announcementContent && isOfficial) {
                console.log('再次啟用編輯模式(修復版)');
                announcementContent.contentEditable = true;
                announcementContent.classList.add('editable');
                announcementContent.dataset.isEditing = 'true';
              }
            } else {
              // 直接顯示公告視窗
              announcementModal.classList.add('active');
              announcementOverlay.classList.add('active');
            }
            
            return Promise.resolve();
          }
          
          // 如果找不到公告元素，則調用原始函數
          return originalShowAnnouncement();
        };
      }
      
      // 修改公告關閉按鈕的點擊事件，保存內容
      const closeButton = document.getElementById('closeAnnouncement');
      const dontShowCheckbox = document.getElementById('dontShowToday');
      
      if (closeButton && !closeButton._contentFixed) {
        closeButton._contentFixed = true;
        
        // 完全覆蓋原有的點擊事件，確保我們的代碼先執行
        closeButton.addEventListener('click', async function(e) {
          console.log('公告關閉按鈕被點擊（修復版）');
          
          // 1. 保存公告內容到localStorage
          saveAnnouncementContent();
          
          // 2. 對於官方帳號，確保保存到Firebase
          const savedToFirebase = await saveToFirebase();
          
          // 3. 處理"今天不再顯示"選項
          if (dontShowCheckbox && dontShowCheckbox.checked) {
            localStorage.setItem('lastShownAnnouncement', new Date().toDateString());
            console.log('設置今天不再顯示');
          }
          
          // 4. 關閉公告視窗
          const announcementModal = document.getElementById('developerAnnouncement');
          const announcementOverlay = document.getElementById('announcementOverlay');
          
          if (announcementModal && announcementOverlay) {
            announcementModal.classList.remove('active');
            announcementOverlay.classList.remove('active');
            console.log('公告視窗已關閉');
          }
          
          // 5. 重置編輯狀態
          const announcementContent = document.getElementById('announcementContent');
          if (announcementContent) {
            announcementContent.contentEditable = false;
            announcementContent.classList.remove('editable');
            if (announcementContent.dataset) {
              announcementContent.dataset.isEditing = 'false';
            }
            console.log('編輯狀態已重置');
          }
          
          // 6. 切換到官方資料頁面（保持與原始行為一致）
          console.log('切換到官方資料頁面');
          // 隱藏所有頁面
          document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            if (p.style) p.style.display = 'none';
          });
          
          // 顯示主頁面
          const mainPage = document.getElementById('mainPage');
          if (mainPage) {
            mainPage.classList.remove('hidden');
            if (mainPage.style) mainPage.style.display = 'block';
          }
          
          // 移除所有導航項目的 active 類
          const navItems = document.querySelectorAll('.nav-item');
          navItems.forEach(nav => nav.classList.remove('active'));
          
          // 設置官方資料頁籤為活動狀態
          const officialTab = document.querySelector('[data-page="official"]');
          if (officialTab) {
            officialTab.classList.add('active');
            // 載入條碼資料
            if (window.loadBarcodes) {
              try {
                await window.loadBarcodes();
              } catch (error) {
                console.error('載入條碼資料失敗:', error);
              }
            }
          }
          
          return false; // 阻止原有的點擊事件
        }, true); // 使用捕獲階段，確保我們的代碼先執行
      }
      
      // 修改公告編輯功能，確保編輯後的內容能夠保存
      const announcementContent = document.getElementById('announcementContent');
      if (announcementContent) {
        // 監聽內容變化
        announcementContent.addEventListener('input', () => {
          saveAnnouncementContent();
        });
        
        // 監聽失去焦點事件，嘗試保存到Firebase
        announcementContent.addEventListener('blur', async () => {
          console.log('公告內容編輯區域失去焦點');
          const user = firebase.auth().currentUser;
          if (user && user.email === 'apple0902303636@gmail.com') {
            console.log('官方帳號，自動保存到Firebase');
            await saveToFirebase();
          }
        });
      }
      
      // 在頁面載入時嘗試恢復內容
      setTimeout(restoreAnnouncementContent, 500);
    } catch (e) {
      console.error('修復公告功能失敗:', e);
    }
  }
  
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
  
  // 確保公告內容可編輯權限的函數
  const ensureEditableIfOfficial = () => {
    try {
      console.log('確認公告可編輯權限');
      const user = firebase.auth().currentUser;
      if (!user) {
        console.log('用戶未登入，不設置編輯權限');
        return;
      }
      
      const isOfficial = user.email === 'apple0902303636@gmail.com';
      const announcementContent = document.getElementById('announcementContent');
      
      if (!announcementContent) {
        console.log('找不到公告內容元素');
        return;
      }
      
      if (isOfficial) {
        console.log('官方帳號，設置為可編輯');
        announcementContent.contentEditable = true;
        announcementContent.classList.add('editable');
        if (announcementContent.dataset) {
          announcementContent.dataset.isEditing = 'true';
        }
      } else {
        console.log('非官方帳號，設置為唯讀');
        announcementContent.contentEditable = false;
        announcementContent.classList.remove('editable');
        if (announcementContent.dataset) {
          announcementContent.dataset.isEditing = 'false';
        }
      }
    } catch (e) {
      console.error('設置編輯權限失敗:', e);
    }
  };
  
  // 執行所有修復
  function applyAllFixes() {
    muteSpecificSounds();
    fixUploadButtonClick();
    fixModalUploadButtonClick();
    fixManualForm();
    fixAnnouncementContent();
    // 確保公告可編輯（對於官方帳號）
    ensureEditableIfOfficial();
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
  
  // 在頁面載入完成後檢查一次
  setTimeout(ensureEditableIfOfficial, 1000);
  
  // 監聽公告視窗顯示事件
  const announcementModal = document.getElementById('developerAnnouncement');
  if (announcementModal) {
    // 使用MutationObserver監聽公告視窗的顯示狀態
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && 
            announcementModal.classList.contains('active')) {
          console.log('檢測到公告視窗顯示');
          // 確保編輯權限
          ensureEditableIfOfficial();
        }
      });
    });
    
    observer.observe(announcementModal, { attributes: true });
  }
  
  // 修改側邊欄公告按鈕點擊事件
  const showAnnouncementBtn = document.getElementById('showAnnouncementBtn');
  if (showAnnouncementBtn && !showAnnouncementBtn._fixed) {
    showAnnouncementBtn._fixed = true;
    
    // 添加點擊後強制檢查編輯權限的邏輯
    showAnnouncementBtn.addEventListener('click', () => {
      console.log('公告按鈕被點擊（修復版）');
      // 延遲檢查編輯權限，確保公告視窗已顯示
      setTimeout(ensureEditableIfOfficial, 300);
    }, true);
  }
}); 