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

// 檢查是否在 GitHub Pages 上
function isGitHubPages() {
    return window.location.hostname.includes('github.io') || 
           localStorage.getItem('is_github_pages') === 'true';
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
        // 添加除錯日誌
        console.log('PWA: 找到 Google 登入按鈕，正在綁定事件');
        googleLoginBtn.addEventListener('click', handlePwaGoogleLogin);
        
        // 額外添加觸控事件監聽，解決某些設備上點擊無反應問題
        googleLoginBtn.addEventListener('touchend', handlePwaGoogleLogin);
        
        // 額外添加強制點擊處理
        googleLoginBtn.addEventListener('mousedown', (e) => {
            console.log('PWA: 登入按鈕捕捉到 mousedown 事件');
            e.preventDefault();
        });
        
        console.log('PWA 模式：已設置 Google 登入按鈕行為');
    } else {
        console.warn('PWA 模式：找不到 Google 登入按鈕元素');
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
    
    // 檢查 URL 參數，看是否是從認證回調過來的
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('github_auth_callback') || urlParams.has('auth_success')) {
        console.log('檢測到認證回調參數，處理登入後流程');
        checkRedirectResult();
    }
}

// 移除所有事件監聽器以防止重複觸發
function removeAllEventListeners() {
    if (googleLoginBtn) {
        console.log('PWA: 移除 Google 登入按鈕上的所有事件');
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

// 新增：直接建立並打開重定向 URL
function directGoogleAuthRedirect() {
    try {
        console.log('執行直接 Google 認證重定向...');
        
        // 檢查是否在 iOS 上
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        console.log('裝置檢測: isIOS =', isIOS, 'isGitHubPages =', isGitHubPages);
        
        // 對所有環境使用直接重定向方法
        // 構建基本 URL
        const baseUrl = window.location.origin + window.location.pathname;
        console.log('基本 URL:', baseUrl);
        
        // 構建回調 URL
        const redirectUri = baseUrl + '?auth_success=true&source=pwa&time=' + Date.now();
        console.log('回調 URL:', redirectUri);
        
        // 儲存回調信息
        localStorage.setItem('auth_pending', 'true');
        localStorage.setItem('auth_pending_time', Date.now().toString());
        localStorage.setItem('auth_redirect_url', redirectUri);
        
        // 直接使用 Firebase 的重定向方法
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        console.log('使用 Firebase 重定向方法登入');
        firebase.auth().signInWithRedirect(provider)
            .then(() => {
                console.log('重定向請求已發送');
            })
            .catch(error => {
                console.error('重定向請求失敗:', error);
                alert('登入請求失敗: ' + error.message);
            });
        
        return true;
    } catch (error) {
        console.error('直接重定向方法失敗:', error);
        alert('無法啟動登入: ' + error.message);
        return false;
    }
}

// 修改 PWA 環境下的 Google 登入處理函數
async function handlePwaGoogleLogin(event) {
    // 添加除錯日誌
    console.log('PWA Google 登入按鈕被點擊', event.type);
    
    // 阻止原始事件
    event.preventDefault();
    event.stopPropagation();
    
    // 捕獲錯誤日誌
    try {
        // 模擬點擊效果，給用戶反饋
        if (googleLoginBtn) {
            googleLoginBtn.classList.add('button-clicked');
            setTimeout(() => {
                googleLoginBtn.classList.remove('button-clicked');
            }, 200);
        }
    } catch (err) {
        console.log('模擬點擊效果失敗:', err);
    }
    
    // 顯示載入狀態
    displayLoadingState();
    
    // 防止重複點擊和多重登入嘗試
    if (loginInProgress) {
        console.log('登入已在處理中，忽略重複請求');
        hideLoadingState();
        return;
    }
    
    // 設置標記，防止重複登入
    loginInProgress = true;
    
    try {
        console.log('啟動 PWA 登入流程');
        
        // 簡化登入邏輯，對所有設備使用相同的方式
        if (directGoogleAuthRedirect()) {
            console.log('已啟動重定向登入');
            // 保持載入狀態並等待重定向
            return;
        }
        
        console.log('直接重定向方法失敗，嘗試標準方法');
        
        // 如果直接重定向失敗，嘗試標準方法
        const auth = firebase.auth();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        // 檢測是否在 GitHub Pages 上
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        if (isGitHubPages) {
            // 對 GitHub Pages 使用重定向方式
            await auth.signInWithRedirect(provider);
            console.log('標準重定向方法已啟動');
        } else {
            // 對其他環境先嘗試彈窗
            try {
                const result = await auth.signInWithPopup(provider);
                console.log('彈窗登入成功');
                processSuccessfulLogin(result.user);
            } catch (popupError) {
                console.warn('彈窗登入失敗，降級為重定向方式:', popupError);
                await auth.signInWithRedirect(provider);
            }
        }
    } catch (error) {
        console.error('登入流程失敗:', error);
        hideLoadingState();
        localStorage.removeItem('auth_pending');
        localStorage.removeItem('auth_pending_time');
        loginInProgress = false;
        alert('登入失敗: ' + error.message);
    }
}

// 處理成功登入
function processSuccessfulLogin(user) {
    console.log('登入成功:', user.displayName);
    localStorage.removeItem('auth_pending');
    localStorage.removeItem('auth_pending_time');
    
    // 重置登入進行中標記
    loginInProgress = false;
    
    // 關閉載入指示
    hideLoadingState();
    
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

// 檢查登入重定向結果 - 增強重定向處理
async function checkRedirectResult() {
    try {
        console.log('檢查重定向登入結果...');
        const auth = firebase.auth();
        
        // 如果是 GitHub Pages 環境，特殊處理
        if (isGitHubPages()) {
            console.log('GitHub Pages 環境：特殊處理重定向結果');
            
            // 顯示載入狀態
            displayLoadingState();
            
            // 檢查當前用戶狀態
            const currentUser = auth.currentUser;
            if (currentUser) {
                console.log('用戶已登入狀態，直接處理:', currentUser.displayName);
                processSuccessfulLogin(currentUser);
                return;
            }
            
            // 從 URL 中提取參數
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('github_auth_callback') || urlParams.has('auth_success')) {
                console.log('偵測到認證回調，嘗試獲取認證結果');
                
                // 清除 URL 中的參數以防止循環
                const cleanUrl = window.location.pathname;
                history.replaceState(null, '', cleanUrl);
                
                // 監聽認證狀態變化
                const authUnsubscribe = auth.onAuthStateChanged(user => {
                    // 只執行一次
                    authUnsubscribe();
                    
                    if (user) {
                        console.log('成功獲取用戶:', user.displayName);
                        processSuccessfulLogin(user);
                    } else {
                        console.log('未能獲取用戶，嘗試手動檢查');
                        // 嘗試手動獲取重定向結果
                        auth.getRedirectResult().then(result => {
                            if (result && result.user) {
                                processSuccessfulLogin(result.user);
                            } else {
                                console.log('重定向登入失敗或被取消');
                                hideLoadingState();
                                loginInProgress = false;
                            }
                        }).catch(error => {
                            console.error('獲取重定向結果錯誤:', error);
                            hideLoadingState();
                            alert(`登入處理失敗: ${error.message}`);
                            loginInProgress = false;
                        });
                    }
                });
                
                // 設置超時，避免無限等待
                setTimeout(() => {
                    hideLoadingState();
                    if (loginInProgress) {
                        loginInProgress = false;
                        console.log('登入超時，請重試');
                    }
                }, 15000);
            }
        } else {
            // 標準重定向結果處理
            // 使用 try-catch 包裹 getRedirectResult
            let result;
            try {
                result = await auth.getRedirectResult();
            } catch (redirectError) {
                console.error('獲取重定向結果出錯:', redirectError);
                // 這裡仍然需要重置 loginInProgress
                hideLoadingState();
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
            window.location.href = './?source=pwa&logout=true';
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

// 在 DOM 加載完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('PWA: DOM 載入完成，檢查 googleLoginBtn 是否存在');
    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) {
        console.log('PWA: 找到登入按鈕，準備等待初始化');
    } else {
        console.warn('PWA: 無法找到登入按鈕元素');
    }

    // 初始化 PWA 認證
    setTimeout(() => {
        console.log('PWA: 延遲初始化認證環境');
        initPwaAuth();
    }, 500);
});

// 額外的全域點擊處理，以防直接綁定無效
window.addEventListener('click', (event) => {
    // 檢查點擊的是否是登入按鈕或其子元素
    if (!googleLoginBtn) return;
    
    if (googleLoginBtn === event.target || googleLoginBtn.contains(event.target)) {
        console.log('PWA: 通過全域點擊事件捕獲到登入按鈕點擊');
        // 只在 PWA 模式下處理
        if (isPwaMode()) {
            handlePwaGoogleLogin(event);
        }
    }
}); 