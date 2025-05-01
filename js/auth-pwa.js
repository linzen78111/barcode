// 增強 PWA 環境下的 Google 登入功能

// 防止重複登入控制標記
let loginInProgress = false;

// 獲取 DOM 元素的參考
let googleLoginBtn, logoutBtn;

// 檢查應用程式是否在 PWA 模式下運行
function isPwaMode() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true ||
           (window.location.search && window.location.search.includes('source=pwa'));
}

// 初始化 PWA 相關認證邏輯
function initPwaAuth() {
    console.log('初始化 PWA 認證環境...');
    
    // 確保 DOM 元素已載入
    googleLoginBtn = document.getElementById('googleLoginBtn');
    logoutBtn = document.getElementById('logoutBtn');
    
    // 如果不是在 PWA 模式下運行，則退出
    if (!isPwaMode()) {
        console.log('非 PWA 模式，退出 PWA 認證初始化');
        return;
    }
    
    console.log('在 PWA 模式下運行，使用特殊認證處理');
    
    // 移除所有現有監聽器（防止重複綁定）
    removeAllEventListeners();
    
    // 修改 Google 登入按鈕行為
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handlePwaGoogleLogin);
        console.log('PWA 模式：已設置 Google 登入按鈕行為');
    }
    
    // 修改登出按鈕行為
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handlePwaLogout);
        console.log('PWA 模式：已設置登出按鈕行為');
    }
    
    // 在啟動時嘗試恢復會話
    tryRestoreAuthSession();
    
    // 強制檢查一次認證狀態
    setTimeout(ensureAuthStateConsistency, 1000);
}

// 移除所有事件監聽器以防止重複觸發
function removeAllEventListeners() {
    if (googleLoginBtn) {
        const newGoogleLoginBtn = googleLoginBtn.cloneNode(true);
        googleLoginBtn.parentNode.replaceChild(newGoogleLoginBtn, googleLoginBtn);
        googleLoginBtn = newGoogleLoginBtn;
    }
    
    if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        logoutBtn = newLogoutBtn;
    }
}

// PWA 環境下的 Google 登入處理
async function handlePwaGoogleLogin(event) {
    // 阻止原始事件
    event.preventDefault();
    event.stopPropagation();
    
    // 防止重複點擊和多重登入嘗試
    if (loginInProgress) {
        console.log('登入已在處理中，忽略重複請求');
        return;
    }
    
    // 設置標記，防止重複登入
    loginInProgress = true;
    
    console.log('使用 PWA 特定的 Google 登入流程');
    
    try {
        // 確保清除之前可能存在的登入彈窗
        const auth = firebase.auth();
        
        // 使用重定向而非彈窗方式
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        // 檢測裝置類型
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // 保存當前 URL 以便登入後返回
        localStorage.setItem('auth_return_url', window.location.href);
        localStorage.setItem('auth_pending', 'true');
        localStorage.setItem('auth_pending_time', Date.now().toString());
        
        if (isIOS) {
            // iOS 裝置始終使用重定向方式
            console.log('使用 iOS 專用的重定向登入');
            // 在重定向前顯示載入狀態
            displayLoadingState();
            
            try {
                // 確保重定向包含 PWA 標記
                await auth.signInWithRedirect(provider);
            } catch (redirectError) {
                console.error('重定向登入失敗:', redirectError);
                // 如果重定向失敗，嘗試回退到彈窗登入
                try {
                    const result = await auth.signInWithPopup(provider);
                    processSuccessfulLogin(result.user);
                } catch (popupError) {
                    console.error('彈窗登入也失敗:', popupError);
                    throw popupError;
                }
            }
        } else {
            // 非 iOS 設備先嘗試彈窗登入
            try {
                // 嘗試使用彈窗登入前，清除任何可能存在的彈窗
                console.log('嘗試使用彈窗登入');
                const result = await auth.signInWithPopup(provider);
                processSuccessfulLogin(result.user);
            } catch (popupError) {
                console.warn('彈窗登入失敗，降級為重定向方式:', popupError);
                
                // 確認是否因為已有其他彈窗導致失敗
                if (popupError.code === 'auth/cancelled-popup-request' || 
                    popupError.message.includes('conflicting popup')) {
                    console.log('檢測到彈窗衝突，清理後重試');
                    
                    // 顯示載入狀態，但不再嘗試彈窗
                    displayLoadingState();
                    
                    // 直接使用重定向
                    try {
                        await auth.signInWithRedirect(provider);
                    } catch (error) {
                        console.error('重定向登入也失敗:', error);
                        throw error;
                    }
                } else {
                    // 其他錯誤，也使用重定向
                    displayLoadingState();
                    try {
                        await auth.signInWithRedirect(provider);
                    } catch (error) {
                        console.error('重定向登入也失敗:', error);
                        throw error;
                    }
                }
            }
        }
    } catch (error) {
        console.error('PWA 模式下 Google 登入失敗:', error);
        hideLoadingState();
        localStorage.removeItem('auth_pending');
        localStorage.removeItem('auth_pending_time');
        
        // 在處理完錯誤後重置登入狀態
        loginInProgress = false;
        
        // 顯示友好錯誤消息
        if (error.code === 'auth/popup-closed-by-user') {
            alert('您關閉了登入視窗，請再試一次。');
        } else if (error.code === 'auth/cancelled-popup-request' || 
                  error.message.includes('conflicting popup')) {
            alert('登入程序被中斷，請等待幾秒後再試。');
        } else {
            alert(`登入失敗: ${error.message}`);
        }
    }
}

// 處理成功登入
function processSuccessfulLogin(user) {
    console.log('登入成功:', user.displayName);
    localStorage.removeItem('auth_pending');
    localStorage.removeItem('auth_pending_time');
    
    // 重置登入進行中標記
    loginInProgress = false;
    
    // 確保登入成功後顯示主頁面
    setTimeout(() => {
        directlyShowMainPage(user);
    }, 100);
}

// 直接顯示主頁面（簡化）
function directlyShowMainPage(user) {
    console.log('直接顯示主頁面，用戶:', user.displayName);
    
    const loginPage = document.getElementById('loginPage');
    const mainPage = document.getElementById('mainPage');
    
    // 隱藏登入頁，顯示主頁
    if (loginPage) loginPage.classList.add('hidden');
    if (mainPage) mainPage.classList.remove('hidden');
    
    // 更新用戶資訊
    updateUserInfo(user);
    
    // 如果有初始化函數，執行它
    if (typeof initializeData === 'function') {
        try {
            initializeData();
        } catch (e) {
            console.error('初始化數據失敗:', e);
        }
    }
}

// 更新用戶資訊
function updateUserInfo(user) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (userAvatar) userAvatar.src = user.photoURL || 'assets/icon-192x192.png';
    if (userName) userName.textContent = user.displayName || '使用者';
    
    // 檢查是否為官方帳號
    if (typeof checkIfOfficialAccount === 'function') {
        try {
            checkIfOfficialAccount(user);
        } catch (e) {}
    }
}

// 顯示載入狀態
function displayLoadingState() {
    // 先清除可能存在的載入狀態
    hideLoadingState();
    
    const loginPage = document.getElementById('loginPage');
    if (loginPage) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'auth-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 2s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 20px;">正在處理登入...</p>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(loadingDiv);
    }
}

// 隱藏載入狀態
function hideLoadingState() {
    const loadingDiv = document.getElementById('auth-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// 檢查登入重定向結果
async function checkRedirectResult() {
    try {
        console.log('檢查重定向登入結果...');
        const auth = firebase.auth();
        
        // 使用 try-catch 包裹 getRedirectResult
        let result;
        try {
            result = await auth.getRedirectResult();
        } catch (redirectError) {
            console.error('獲取重定向結果出錯:', redirectError);
            // 這裡仍然需要重置 loginInProgress
            loginInProgress = false;
            return;
        }
        
        // 移除載入狀態
        hideLoadingState();
        
        if (result.user) {
            console.log('重定向登入成功:', result.user.displayName);
            
            // 確保登入成功後顯示主頁面
            processSuccessfulLogin(result.user);
            
            // 通知應用登入成功
            try {
                window.dispatchEvent(new CustomEvent('pwa-login-success', { 
                    detail: { user: result.user } 
                }));
                console.log('已發送登入成功事件');
            } catch (e) {
                console.error('發送登入成功事件失敗:', e);
            }
        } else {
            console.log('無重定向登入結果或用戶取消登入');
            
            // 清除登入中標記
            localStorage.removeItem('auth_pending');
            localStorage.removeItem('auth_pending_time');
            loginInProgress = false;
            
            // 檢查當前用戶狀態，確保 UI 正確
            const currentUser = auth.currentUser;
            if (currentUser) {
                console.log('用戶已登入，顯示主頁面:', currentUser.displayName);
                // 直接顯示主頁面
                directlyShowMainPage(currentUser);
            }
        }
    } catch (error) {
        hideLoadingState();
        localStorage.removeItem('auth_pending');
        localStorage.removeItem('auth_pending_time');
        loginInProgress = false;
        
        console.error('處理重定向結果錯誤:', error);
        alert(`登入處理失敗: ${error.message}`);
    }
}

// 強制顯示主頁面（當 auth.js 中的 showMainPage 不可用時）
function forceShowMainPage(user) {
    if (!user) {
        console.warn('無法顯示主頁面: 用戶對象為空');
        return;
    }
    
    // 直接使用簡化版本
    directlyShowMainPage(user);
}

// 嘗試恢復認證會話（適用於 PWA 多次啟動的情況）
function tryRestoreAuthSession() {
    // 檢查用戶是否已登入
    const currentUser = firebase.auth().currentUser;
    
    if (currentUser) {
        console.log('用戶已登入，無需恢復會話');
        setTimeout(() => {
            directlyShowMainPage(currentUser);
        }, 100);
        return;
    }
    
    console.log('嘗試恢復認證會話...');
    
    // 為避免在會話恢復期間出現閃爍，可以延遲顯示登入界面
    const loginPageElement = document.getElementById('loginPage');
    if (loginPageElement) {
        loginPageElement.style.opacity = '0';
        loginPageElement.style.transition = 'opacity 0.5s';
        
        // 設置超時，如果 3 秒內沒有登入成功，則顯示登入頁面
        setTimeout(() => {
            if (!firebase.auth().currentUser) {
                loginPageElement.style.opacity = '1';
            }
        }, 3000);
    }
    
    // 檢查 localStorage 是否有用戶信息
    const localUserData = localStorage.getItem('firebase:authUser:' + firebase.app().options.apiKey + ':[DEFAULT]');
    if (localUserData) {
        try {
            const userData = JSON.parse(localUserData);
            console.log('在 localStorage 中找到用戶數據，等待 Firebase 認證初始化...');
        } catch (e) {
            console.error('解析 localStorage 中的用戶數據失敗:', e);
        }
    }
    
    // 添加一次性監聽器，處理認證狀態變化
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
        unsubscribe(); // 立即取消監聽，我們只需要檢查一次
        
        if (user) {
            console.log('成功恢復認證會話');
            setTimeout(() => {
                directlyShowMainPage(user);
            }, 100);
        } else {
            console.log('沒有可恢復的會話');
            if (loginPageElement) {
                loginPageElement.style.opacity = '1';
            }
            
            // 檢查是否有 auth_pending 標記且未過期
            const authPending = localStorage.getItem('auth_pending');
            const authPendingTime = localStorage.getItem('auth_pending_time');
            
            if (authPending && authPendingTime) {
                const now = Date.now();
                const pendingTime = parseInt(authPendingTime, 10);
                
                // 如果登入過程開始不超過 1 分鐘，則顯示載入狀態
                if (now - pendingTime < 60000) {
                    console.log('檢測到未完成的登入過程，顯示載入狀態');
                    displayLoadingState();
                } else {
                    // 清除過期的登入過程
                    localStorage.removeItem('auth_pending');
                    localStorage.removeItem('auth_pending_time');
                    loginInProgress = false;
                }
            }
        }
    });
}

// 處理 PWA 環境下的登出
function handlePwaLogout() {
    console.log('執行 PWA 專用的登出程序');
    
    // 清除所有與認證相關的快取和存儲資料
    try {
        const authKey = 'firebase:authUser:' + firebase.app().options.apiKey + ':[DEFAULT]';
        localStorage.removeItem(authKey);
    } catch (e) {
        console.error('清除 firebase:authUser 失敗:', e);
    }
    
    localStorage.removeItem('auth_return_url');
    localStorage.removeItem('auth_pending');
    localStorage.removeItem('auth_pending_time');
    loginInProgress = false;
    
    // 清除 Firebase 認證缓存
    firebase.auth().signOut().then(() => {
        console.log('成功登出');
        
        // 確保登出後顯示登入頁面
        const loginPage = document.getElementById('loginPage');
        const mainPage = document.getElementById('mainPage');
        
        if (loginPage) loginPage.classList.remove('hidden');
        if (mainPage) mainPage.classList.add('hidden');
        
        // 重新載入頁面確保清除所有狀態
        setTimeout(() => {
            window.location.href = '/?source=pwa&logout=true';
        }, 100);
    }).catch(error => {
        console.error('登出失敗:', error);
        alert(`登出失敗: ${error.message}`);
        
        // 強制刷新頁面
        window.location.reload();
    });
}

// 確保用戶狀態與 UI 一致
function ensureAuthStateConsistency() {
    const currentUser = firebase.auth().currentUser;
    const loginPage = document.getElementById('loginPage');
    const mainPage = document.getElementById('mainPage');
    
    if (!loginPage || !mainPage) {
        console.warn('找不到必要的 DOM 元素，無法檢查 UI 一致性');
        return;
    }
    
    if (currentUser) {
        // 用戶已登入，但主頁面隱藏中，則顯示主頁面
        if (!loginPage.classList.contains('hidden') || 
            mainPage.classList.contains('hidden')) {
            console.log('修正 UI 狀態：用戶已登入，但 UI 顯示未登入狀態');
            setTimeout(() => {
                directlyShowMainPage(currentUser);
            }, 100);
        }
    } else {
        // 用戶未登入，但主頁面顯示中，則顯示登入頁面
        if (loginPage.classList.contains('hidden') ||
            !mainPage.classList.contains('hidden')) {
            console.log('修正 UI 狀態：用戶未登入，但 UI 顯示已登入狀態');
            loginPage.classList.remove('hidden');
            mainPage.classList.add('hidden');
            
            // 重置登入狀態
            loginInProgress = false;
        }
    }
}

// 在文檔加載後啟動
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 載入完成，初始化 PWA 認證模組');
    
    // 檢查重定向結果（在頁面剛加載時）
    checkRedirectResult();
    
    // 初始化 PWA 認證
    setTimeout(initPwaAuth, 200);
});

// 最終防禦：在頁面完全載入後再檢查一次
window.addEventListener('load', () => {
    console.log('頁面載入完成，進行最終認證檢查');
    
    // 檢查是否有進行中的登入流程
    if (loginInProgress) {
        // 如果登入進行超過 30 秒，重置標記
        setTimeout(() => {
            if (loginInProgress) {
                console.log('偵測到長時間未完成的登入流程，重置狀態');
                loginInProgress = false;
            }
        }, 30000);
    }
    
    setTimeout(() => {
        // 再次檢查重定向結果
        checkRedirectResult();
        
        // 檢查 UI 狀態
        ensureAuthStateConsistency();
        
        // 額外防禦：如果用戶已登入但界面仍是登入頁，則強制顯示主頁面
        const currentUser = firebase.auth().currentUser;
        const loginPage = document.getElementById('loginPage');
        const mainPage = document.getElementById('mainPage');
        
        if (currentUser && loginPage && mainPage) {
            if (!loginPage.classList.contains('hidden') || mainPage.classList.contains('hidden')) {
                console.log('最終防禦：強制顯示主頁面');
                directlyShowMainPage(currentUser);
            }
        }
    }, 1000);
}); 