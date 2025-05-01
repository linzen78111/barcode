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
                const result = await firebase.auth().signInWithRedirect(provider);
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

// 在 DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', initializeAuth); 