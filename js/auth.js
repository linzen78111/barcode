// 獲取 DOM 元素
const loginPage = document.getElementById('loginPage');
const mainPage = document.getElementById('mainPage');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

// Firebase 配置
const firebaseConfig = {
    // 您的 Firebase 配置
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 登入處理
googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    // 使用重定向登入
    firebase.auth().signInWithRedirect(provider);
});

// 檢查登入狀態
firebase.auth().getRedirectResult().then((result) => {
    if (result.credential) {
        // 登入成功
        const user = result.user;
        updateUI(user);
    }
}).catch((error) => {
    console.error('登入錯誤:', error);
});

// 監聽登入狀態變化
firebase.auth().onAuthStateChanged((user) => {
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
    document.getElementById('userName').textContent = user.displayName;
    document.getElementById('userAvatar').src = user.photoURL;
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
}

// 登出處理
logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut();
}); 