// 註冊Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('Service Worker 註冊成功:', registration);
      })
      .catch((error) => {
        console.error('Service Worker 註冊失敗:', error);
      });
  });
}

// 提示使用者安裝PWA的功能
let deferredPrompt;
const addBtn = document.createElement('button');
addBtn.style.display = 'none';
addBtn.classList.add('install-button');
addBtn.textContent = '安裝應用程式';

// 當瀏覽器觸發beforeinstallprompt時，儲存事件以供稍後使用
window.addEventListener('beforeinstallprompt', (e) => {
  // 防止Chrome 67及更早版本自動顯示安裝提示
  e.preventDefault();
  // 儲存事件，以便稍後觸發
  deferredPrompt = e;
  // 顯示自定義的安裝按鈕
  addBtn.style.display = 'block';
  
  // 將安裝按鈕添加到DOM中的適當位置
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.appendChild(addBtn);
  }
});

// 當使用者點擊安裝按鈕時，觸發安裝提示
addBtn.addEventListener('click', (e) => {
  // 隱藏按鈕，因為不再需要
  addBtn.style.display = 'none';
  // 顯示安裝提示
  deferredPrompt.prompt();
  // 等待使用者回應提示
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('使用者接受安裝PWA');
    } else {
      console.log('使用者拒絕安裝PWA');
    }
    // 清除儲存的prompt事件，因為它只能被使用一次
    deferredPrompt = null;
  });
});

// 監聽PWA安裝完成的事件
window.addEventListener('appinstalled', (e) => {
  console.log('PWA 已成功安裝');
});

// 為了解決不同手機差異問題，添加重置Service Worker的功能
// 創建一個重置按鈕，直接顯示在側邊欄中
const resetBtn = document.createElement('button');
resetBtn.classList.add('nav-item', 'reset-button');
resetBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 重置應用程式';
resetBtn.style.backgroundColor = '#d9534f';
resetBtn.style.color = 'white';

// 在DOM載入完成後將重置按鈕添加到側邊欄
document.addEventListener('DOMContentLoaded', () => {
  // 等待側邊欄載入
  setTimeout(() => {
    const sidebar = document.querySelector('.sidebar');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navMenu) {
      navMenu.appendChild(resetBtn);
    } else if (sidebar) {
      sidebar.appendChild(resetBtn);
    }
  }, 1000);
});

// 重置按鈕點擊事件
resetBtn.addEventListener('click', async () => {
  // 顯示確認對話框
  if (confirm('確定要重置應用程式嗎？這將清除所有快取和本地數據，並需要重新登入。')) {
    try {
      if ('serviceWorker' in navigator) {
        // 獲取所有已註冊的Service Worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        // 註銷所有Service Worker
        for (let registration of registrations) {
          await registration.unregister();
        }
        
        // 清除所有快取
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        }
        
        // 顯示成功訊息
        alert('應用程式已重置。頁面將重新載入。');
        // 重新整理頁面
        window.location.reload();
      }
    } catch (error) {
      console.error('重置失敗:', error);
      alert('重置失敗，請嘗試手動清除瀏覽器資料。');
    }
  }
}); 