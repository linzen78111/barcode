# 條碼掃描系統

這是一個基於 Web 的條碼掃描和管理系統，使用 Firebase 作為後端服務。

## 功能特點

- 使用者認證（Google 登入）
- 條碼掃描
- 本地暫存功能
- 批量上傳
- 檔案匯入
- 官方/個人資料區分

## 技術棧

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase (Authentication, Firestore)
- Html5-QRCode
- JsBarcode

## 安裝與使用

1. 克隆專案：
   ```bash
   git clone https://github.com/[您的用戶名]/[專案名稱].git
   ```

2. 配置 Firebase：
   - 在 Firebase Console 建立新專案
   - 啟用 Authentication 和 Firestore
   - 更新 `js/config.js` 中的 Firebase 配置

3. 部署：
   - 使用 GitHub Pages 部署
   - 或使用本地伺服器運行

## 注意事項

- 請確保已經正確配置 Firebase
- 相機權限需要在 HTTPS 環境下才能使用
- 建議使用最新版本的 Chrome 或 Firefox 瀏覽器

## 授權

MIT License 