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