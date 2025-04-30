// 在 DOM 載入完成後初始化
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");
    if (sidebar && mainContent) {
        sidebar.classList.add("collapsed");
        mainContent.classList.add("expanded");
    }
    // 點擊對話框背景關閉
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            const localDataPage = document.getElementById("localDataPage");
            if (localDataPage) {
                localDataPage.classList.add("hidden");
