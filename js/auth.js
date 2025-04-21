// 獲取 DOM 元素
const loginPage = document.getElementById('loginPage');
const mainPage = document.getElementById('mainPage');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyAw6yraVBiMPyF9ab4VtgMTaQfqEYhbtTE",
    authDomain: "chaoshangtiaoma.firebaseapp.com",
    projectId: "chaoshangtiaoma",
    storageBucket: "chaoshangtiaoma.firebasestorage.app",
    messagingSenderId: "995621789085",
    appId: "1:995621789085:web:8e893bb24c37e37f922374",
    measurementId: "G-Y5B9YRTKV1"
};

// 初始化 Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 檢查瀏覽器類型
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
console.log('瀏覽器類型:', isSafari ? 'Safari' : '其他瀏覽器');

// 登入處理
document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    console.log('點擊登入按鈕');
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        if (isSafari) {
            // Safari 使用重定向登入
            console.log('使用重定向登入（Safari）');
            await firebase.auth().signInWithRedirect(provider);
        } else {
            // 其他瀏覽器使用彈窗登入
            console.log('使用彈窗登入');
            const result = await firebase.auth().signInWithPopup(provider);
            console.log('登入成功:', result.user);
            updateUI(result.user);
        }
    } catch (error) {
        console.error('登入錯誤:', error);
        alert('登入失敗: ' + error.message);
    }
});

// 檢查登入狀態（特別針對 Safari 重定向）
firebase.auth().getRedirectResult().then((result) => {
    console.log('檢查重定向結果');
    if (result.credential) {
        console.log('登入成功:', result.user);
        updateUI(result.user);
    }
}).catch((error) => {
    console.error('重定向錯誤:', error);
    alert('登入失敗: ' + error.message);
});

// 監聽登入狀態變化
firebase.auth().onAuthStateChanged((user) => {
    console.log('登入狀態改變:', user);
    if (user) {
        updateUI(user);
    } else {
        // 未登入狀態
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('mainPage').classList.add('hidden');
    }
});

// 更新 UI
function updateUI(user) {
    console.log('更新 UI:', user);
    document.getElementById('userName').textContent = user.displayName;
    document.getElementById('userAvatar').src = user.photoURL;
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
}

// 登出處理
document.getElementById('logoutBtn').addEventListener('click', () => {
    firebase.auth().signOut()
        .then(() => {
            console.log('登出成功');
        })
        .catch((error) => {
            console.error('登出錯誤:', error);
        });
}); 