// 獲取 DOM 元素
let loginPage, mainPage, googleLoginBtn, logoutBtn, userAvatar, userName;

// 初始化函數
function initializeAuth() {
    // 獲取 DOM 元素
    loginPage = document.getElementById('loginPage');
    mainPage = document.getElementById('mainPage');
    googleLoginBtn = document.getElementById('googleLoginBtn');
    logoutBtn = document.getElementById('logoutBtn');
    userAvatar = document.getElementById('userAvatar');
    userName = document.getElementById('userName');
    
    // 檢查初始頁面狀態
    checkInitialPageState();

    // Google 登入
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                // 顯示載入中狀態
                if (googleLoginBtn) {
                    googleLoginBtn.disabled = true;
                    googleLoginBtn.innerHTML = '<img src="assets/google-icon.svg" alt="Google Logo"> 正在登入...';
                }
                
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({
                    prompt: 'select_account'
                });
                
                // 不再檢測裝置類型，直接使用重定向方式登入
                console.log('使用重定向方式登入');
                // 儲存當前狀態，以便在重定向後恢復
                sessionStorage.setItem('loginAttempt', 'true');
                
                // 顯示加載提示
                const loadingMsg = document.createElement('div');
                loadingMsg.id = 'login-loading-msg';
                loadingMsg.style.position = 'fixed';
                loadingMsg.style.top = '50%';
                loadingMsg.style.left = '50%';
                loadingMsg.style.transform = 'translate(-50%, -50%)';
                loadingMsg.style.padding = '20px';
                loadingMsg.style.background = 'rgba(0,0,0,0.7)';
                loadingMsg.style.color = 'white';
                loadingMsg.style.borderRadius = '10px';
                loadingMsg.style.zIndex = '10000';
                loadingMsg.textContent = '正在重定向至 Google 登入...';
                document.body.appendChild(loadingMsg);
                
                // 使用 setTimeout 確保用戶能看到提示
                setTimeout(async () => {
                    try {
                        await firebase.auth().signInWithRedirect(provider);
                    } catch (error) {
                        console.error('重定向登入失敗:', error);
                        document.body.removeChild(loadingMsg);
                        
                        googleLoginBtn.disabled = false;
                        googleLoginBtn.innerHTML = '<img src="assets/google-icon.svg" alt="Google Logo"> 使用 Google 帳號登入';
                        
                        if (typeof showCustomAlert === 'function') {
                            showCustomAlert(`登入失敗: ${error.message}`, 'error');
                        } else {
                            alert(`登入失敗: ${error.message}`);
                        }
                    }
                }, 500);
                
            } catch (error) {
                console.error('登入失敗:', error);
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(`登入失敗: ${error.message}`, 'error');
                } else {
                    alert(`登入失敗: ${error.message}`);
                }
                // 恢復按鈕狀態
                if (googleLoginBtn) {
                    googleLoginBtn.disabled = false;
                    googleLoginBtn.innerHTML = '<img src="assets/google-icon.svg" alt="Google Logo"> 使用 Google 帳號登入';
                }
            }
        });
    }

    // 登出
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // 顯示載入中狀態
                if (logoutBtn) {
                    logoutBtn.disabled = true;
                    logoutBtn.innerHTML = '<span class="icon">🚪</span> 正在登出...';
                }
                
                await firebase.auth().signOut();
                console.log('登出成功');
                
                // 清除本地緩存
                localStorage.removeItem('lastActiveSession');
                sessionStorage.clear();
                
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('已成功登出', 'success');
                }
            } catch (error) {
                console.error('登出失敗:', error);
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(`登出失敗: ${error.message}`, 'error');
                } else {
                    alert(`登出失敗: ${error.message}`);
                }
            } finally {
                // 恢復按鈕狀態
                if (logoutBtn) {
                    logoutBtn.disabled = false;
                    logoutBtn.innerHTML = '<span class="icon">🚪</span> 登出';
                }
            }
        });
    }
    
    // 確保 5 秒後檢查登入頁面顯示情況
    setTimeout(() => {
        checkInitialPageState();
    }, 5000);
    
    // 檢查是否從重定向回來
    checkRedirectResult();
}

// 確保頁面狀態正確
function checkInitialPageState() {
    // 檢查用戶是否已登入
    const user = firebase.auth().currentUser;
    console.log('檢查初始頁面狀態，當前用戶:', user);
    
    if (!loginPage || !mainPage) {
        console.error('找不到必要的頁面元素');
        return;
    }
    
    if (user) {
        // 用戶已登入，顯示主頁面
        loginPage.classList.add('hidden');
        mainPage.classList.remove('hidden');
        console.log('用戶已登入，顯示主頁面');
    } else {
        // 用戶未登入，顯示登入頁面
        loginPage.classList.remove('hidden');
        mainPage.classList.add('hidden');
        console.log('用戶未登入，顯示登入頁面');
    }
    
    // 如果兩個頁面都被隱藏，顯示登入頁面
    if (loginPage.classList.contains('hidden') && mainPage.classList.contains('hidden')) {
        console.warn('檢測到兩個頁面都被隱藏，強制顯示登入頁面');
        loginPage.classList.remove('hidden');
    }
}

// 檢查從 Google 重定向回來的結果
async function checkRedirectResult() {
    try {
        console.log('檢查重定向登入結果...');
        // 取得重定向結果
        const result = await firebase.auth().getRedirectResult();
        if (result.user) {
            console.log('重定向登入成功:', result.user);
            
            // 強制顯示主頁面，隱藏登入頁面
            if (loginPage) loginPage.classList.add('hidden');
            if (mainPage) mainPage.classList.remove('hidden');
            
            // 更新使用者資訊
            if (userAvatar) userAvatar.src = result.user.photoURL || 'assets/default-avatar.png';
            if (userName) {
                userName.textContent = result.user.displayName || '使用者';
            }
            
            // 手動觸發資料初始化
            if (typeof initializeData === 'function') {
                try {
                    await initializeData();
                    console.log('登入後資料初始化成功');
                } catch (error) {
                    console.error('登入後資料初始化失敗:', error);
                }
            }
            
            // 清除登入嘗試標記
            sessionStorage.removeItem('loginAttempt');
            
            // 顯示成功提示
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('登入成功', 'success');
            }
        } else {
            console.log('無重定向登入結果或使用者未登入');
        }
    } catch (error) {
        console.error('處理重定向結果時發生錯誤:', error);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(`登入失敗: ${error.message}`, 'error');
        } else {
            alert(`登入失敗: ${error.message}`);
        }
        // 清除登入嘗試標記
        sessionStorage.removeItem('loginAttempt');
    }
}

// 監聽登入狀態
firebase.auth().onAuthStateChanged(async (user) => {
    console.log('登入狀態改變:', user);
    
    // 如果是從重定向登入回來，則讓 checkRedirectResult 處理
    if (sessionStorage.getItem('loginAttempt') === 'true') {
        console.log('檢測到重定向登入嘗試，等待 checkRedirectResult 處理');
        return;
    }
    
    try {
        if (user) {
            // 使用者已登入
            if (loginPage) loginPage.classList.add('hidden');
            if (mainPage) mainPage.classList.remove('hidden');
            
            // 更新使用者資訊
            if (userAvatar) userAvatar.src = user.photoURL || 'assets/default-avatar.png';
            if (userName) {
                userName.textContent = user.displayName || '使用者';
                
                // 檢查是否為官方帳號，先確認barcodeService是否存在
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
            
            // 記錄最後活躍會話時間
            localStorage.setItem('lastActiveSession', new Date().toISOString());
            
            // 初始化資料（在 app.js 中定義）
            if (typeof initializeData === 'function') {
                try {
                    await initializeData();
                } catch (error) {
                    console.error('初始化資料失敗:', error);
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('資料載入失敗，請重新整理頁面', 'error');
                    }
                }
            }
        } else {
            // 使用者未登入
            if (loginPage) loginPage.classList.remove('hidden');
            if (mainPage) mainPage.classList.add('hidden');
            
            // 清除會話狀態
            localStorage.removeItem('lastActiveSession');
        }
    } catch (error) {
        console.error('處理登入狀態改變時發生錯誤:', error);
        // 確保頁面仍然可見
        if (loginPage && mainPage) {
            if (loginPage.classList.contains('hidden') && mainPage.classList.contains('hidden')) {
                loginPage.classList.remove('hidden');
            }
        }
    }
});

// 添加頁面錯誤處理
window.addEventListener('unhandledrejection', (event) => {
    console.error('未處理的 Promise 拒絕:', event.reason);
    // 如果錯誤原因中包含 auth 相關字串，顯示錯誤提示
    if (event.reason && event.reason.toString().includes('auth')) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('認證錯誤，請重新登入', 'error');
        }
    }
});

// 在 DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', initializeAuth); 