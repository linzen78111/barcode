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

    // Google 登入
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({
                    prompt: 'select_account'
                });
                const result = await firebase.auth().signInWithPopup(provider);
                console.log('登入成功:', result.user);
            } catch (error) {
                console.error('登入失敗:', error);
                alert(`登入失敗: ${error.message}`);
            }
        });
    }

    // 登出
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                console.log('登出成功');
            } catch (error) {
                console.error('登出失敗:', error);
                alert(`登出失敗: ${error.message}`);
            }
        });
    }
}

// 監聽登入狀態
firebase.auth().onAuthStateChanged(async (user) => {
    console.log('登入狀態改變:', user);
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
        
        // 初始化資料（在 app.js 中定義）
        if (typeof initializeData === 'function') {
            initializeData();
        }
    } else {
        // 使用者未登入
        if (loginPage) loginPage.classList.remove('hidden');
        if (mainPage) mainPage.classList.add('hidden');
    }
});

// 在 DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', initializeAuth); 