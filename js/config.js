// 檢查是否為 iOS 設備
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isGitHubPages = window.location.hostname.includes('github.io');

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyB1nLKcXpnuSpRvqFWuZwdIVQIhYmDdDfo",
    authDomain: isGitHubPages ? "barcode-system-4a6c9.firebaseapp.com" : "barcode-system-4a6c9.firebaseapp.com",
    projectId: "barcode-system-4a6c9",
    storageBucket: "barcode-system-4a6c9.appspot.com",
    messagingSenderId: "208580818980",
    appId: "1:208580818980:web:f88a6c9c2c8bd9fe51feaf",
    measurementId: "G-LXXQ1KYGE2"
};

// 初始化 Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 啟用 Firestore 快取
firebase.firestore().enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('快取啟用失敗：多個分頁開啟');
        } else if (err.code == 'unimplemented') {
            console.log('瀏覽器不支援快取');
        }
    });

// 初始化 Firestore
const db = firebase.firestore();

// 初始化 Auth
const auth = firebase.auth();

// 設定 Auth 語言
auth.useDeviceLanguage();

// 初始化 Analytics
firebase.analytics();

// 創建 barcodeService 全局對象
const barcodeService = {
    db: db,
    isIOS: isIOS,
    isGitHubPages: isGitHubPages,
    
    // 在 iOS 上強制使用重定向方式
    forceRedirectAuth: isIOS || isGitHubPages
};

// 針對 iOS 和 GitHub Pages 環境進行特殊處理
if (isIOS || isGitHubPages) {
    console.log('iOS 或 GitHub Pages 環境檢測到，應用特殊登入處理');
    // 這些設置會被 auth-pwa.js 使用
    localStorage.setItem('force_redirect_auth', 'true');
}

// 導出 barcodeService
window.barcodeService = barcodeService; 