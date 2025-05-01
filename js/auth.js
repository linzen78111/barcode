// 獲取 DOM 元素
let loginPage, mainPage, googleLoginBtn, logoutBtn, userAvatar, userName;

// 檢查是否在 PWA 模式下運行
function isPwaMode() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

// 顯示主頁面
function showMainPage(user) {
    if (!user) return;
    
    console.log('顯示主頁面，使用者:', user.displayName);
    
    // 確保 DOM 元素已獲取
    loginPage = loginPage || document.getElementById('loginPage');
    mainPage = mainPage || document.getElementById('mainPage');
    userAvatar = userAvatar || document.getElementById('userAvatar');
    userName = userName || document.getElementById('userName');
    
    // 使用 classList.add/remove 前先檢查元素存在
    if (loginPage) loginPage.classList.add('hidden');
    if (mainPage) mainPage.classList.remove('hidden');
    
    // 更新使用者資訊
    if (userAvatar) userAvatar.src = user.photoURL || 'assets/icon-192x192.png';
    if (userName) {
        userName.textContent = user.displayName || '使用者';
    }
    
    // 檢查是否為官方帳號
    checkIfOfficialAccount(user);
    
    // 初始化資料
    if (typeof initializeData === 'function') {
        try {
            initializeData();
        } catch (error) {
            console.error('初始化資料失敗:', error);
        }
    }
}

// 檢查是否為官方帳號
async function checkIfOfficialAccount(user) {
    if (!userName) return;
    
    try {
        if (typeof barcodeService !== 'undefined' && barcodeService) {
            const isOfficial = await barcodeService.isOfficialAccount();
            if (isOfficial) {
                userName.innerHTML = `${user.displayName || '使用者'} <span class="official-badge">官方帳號</span>`;
            }
        }
    } catch (error) {
        console.error('檢查官方帳號失敗:', error);
    }
}

// 初始化函數
function initializeAuth() {
    console.log('初始化認證系統...');
    
    // 獲取 DOM 元素
    loginPage = document.getElementById('loginPage');
    mainPage = document.getElementById('mainPage');
    googleLoginBtn = document.getElementById('googleLoginBtn');
    logoutBtn = document.getElementById('logoutBtn');
    userAvatar = document.getElementById('userAvatar');
    userName = document.getElementById('userName');
    
    // 檢查用戶是否已登入
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
        console.log('用戶已登入，顯示主頁面');
        showMainPage(currentUser);
    }

    // 如果在 PWA 模式下，跳過瀏覽器模式的事件綁定
    if (isPwaMode()) {
        console.log('在 PWA 模式下，由 auth-pwa.js 處理認證');
        return;
    }

    // 瀏覽器模式的 Google 登入
    if (googleLoginBtn) {
        // 確保先清除可能存在的所有點擊事件
        const newGoogleLoginBtn = googleLoginBtn.cloneNode(true);
        googleLoginBtn.parentNode.replaceChild(newGoogleLoginBtn, googleLoginBtn);
        googleLoginBtn = newGoogleLoginBtn;
        
        console.log('為瀏覽器模式綁定 Google 登入事件');
        googleLoginBtn.addEventListener('click', async (event) => {
            // 阻止可能的重複點擊
            event.preventDefault();
            event.stopPropagation();
            
            console.log('瀏覽器模式: Google登入按鈕被點擊');
            
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({
                    prompt: 'select_account'
                });
                
                console.log('嘗試使用彈窗登入方式');
                const result = await firebase.auth().signInWithPopup(provider);
                console.log('登入成功:', result.user);
                
                // 確保登入後顯示主頁面
                showMainPage(result.user);
            } catch (error) {
                console.error('登入失敗:', error);
                
                // 如果彈出視窗被阻擋，嘗試使用重定向
                if (error.code === 'auth/popup-blocked') {
                    console.log("彈出視窗被阻擋，嘗試使用重定向");
                    try {
                        const auth = firebase.auth();
                        const provider = new firebase.auth.GoogleAuthProvider();
                        await auth.signInWithRedirect(provider);
                    } catch (redirectError) {
                        console.error('重定向登入也失敗:', redirectError);
                        alert(`登入失敗: ${redirectError.message}`);
                    }
                } else {
                    alert(`登入失敗: ${error.message}`);
                }
            }
        });
    }

    // 登出
    if (logoutBtn) {
        // 移除可能已附加的事件監聽器
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        logoutBtn = newLogoutBtn;
        
        logoutBtn.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                console.log('登出成功');
                
                // 確保登出後顯示登入頁面
                if (loginPage) loginPage.classList.remove('hidden');
                if (mainPage) mainPage.classList.add('hidden');
                
                // 重載頁面以清除狀態
                window.location.reload();
            } catch (error) {
                console.error('登出失敗:', error);
                alert(`登出失敗: ${error.message}`);
            }
        });
    }
}

// 確保用戶狀態與 UI 一致
function ensureAuthStateConsistency() {
    const currentUser = firebase.auth().currentUser;
    
    if (currentUser) {
        // 使用者已登入，但主頁面隱藏中
        const loginPageHidden = loginPage && loginPage.classList.contains('hidden');
        const mainPageVisible = mainPage && !mainPage.classList.contains('hidden');
        
        if (!loginPageHidden || !mainPageVisible) {
            console.log('修正 UI：使用者已登入但介面不正確');
            showMainPage(currentUser);
        }
    } else {
        // 使用者未登入，但主頁面顯示中
        const loginPageVisible = loginPage && !loginPage.classList.contains('hidden');
        const mainPageHidden = mainPage && mainPage.classList.contains('hidden');
        
        if (!loginPageVisible || !mainPageHidden) {
            console.log('修正 UI：使用者未登入但介面不正確');
            if (loginPage) loginPage.classList.remove('hidden');
            if (mainPage) mainPage.classList.add('hidden');
        }
    }
}

// 監聽登入狀態
firebase.auth().onAuthStateChanged(user => {
    console.log('認證狀態變更:', user ? `已登入 (${user.displayName})` : '未登入');
    
    if (user) {
        // 使用者已登入
        showMainPage(user);
    } else {
        // 使用者未登入
        loginPage = loginPage || document.getElementById('loginPage');
        mainPage = mainPage || document.getElementById('mainPage');
        
        if (loginPage) loginPage.classList.remove('hidden');
        if (mainPage) mainPage.classList.add('hidden');
    }
});

// 在 DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 載入完成，初始化認證系統');
    initializeAuth();
    
    // 定期檢查 UI 狀態與認證狀態是否一致
    setInterval(ensureAuthStateConsistency, 2000);
});

// 在頁面載入完成後也進行一次檢查
window.addEventListener('load', () => {
    console.log('頁面載入完成，檢查認證狀態');
    
    // 檢查是否有重定向結果
    try {
        firebase.auth().getRedirectResult().then(result => {
            if (result.user) {
                console.log('重定向登入成功:', result.user);
                showMainPage(result.user);
            }
        }).catch(error => {
            console.error('處理重定向結果錯誤:', error);
        });
    } catch (error) {
        console.error('嘗試獲取重定向結果時出錯:', error);
    }
    
    setTimeout(() => {
        ensureAuthStateConsistency();
    }, 1000);
}); 