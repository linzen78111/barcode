// 自定義確認對話框函數
function showCustomConfirm(message, options = {}) {
    const title = options.title || "確認操作";
    const yesText = options.yesText || "確定";
    const noText = options.noText || "取消";
    const yesStyle = options.yesStyle || "primary"; // danger, primary, secondary
    
    return new Promise((resolve) => {
        // 創建自定義確認對話框
        const confirmDialog = document.createElement("div");
        confirmDialog.className = "custom-confirm-dialog";
        confirmDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 100000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // 設定按鈕顏色，預設使用藍色主題
        let yesBtnColor = "#3498db"; // 主題藍色
        if (yesStyle === "danger") {
            yesBtnColor = "#ff5252"; // 紅色
        } else if (yesStyle === "secondary") {
            yesBtnColor = "#6c757d"; // 灰色
        }
        
        confirmDialog.innerHTML = `
            <div style="
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                width: 300px;
                padding: 20px;
                text-align: center;
            ">
                <h3 style="
                    margin-top: 0;
                    color: #3498db;
                    font-size: 18px;
                ">${title}</h3>
                <p style="
                    margin: 15px 0;
                    color: #555;
                ">${message}</p>
                <div style="
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 20px;
                ">
                    <button id="confirmYes" style="
                        background-color: ${yesBtnColor};
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 8px 16px;
                        cursor: pointer;
                        font-weight: bold;
                    ">${yesText}</button>
                    <button id="confirmNo" style="
                        background-color: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 8px 16px;
                        cursor: pointer;
                    ">${noText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmDialog);
        
        // 綁定按鈕事件
        const yesBtn = confirmDialog.querySelector("#confirmYes");
        const noBtn = confirmDialog.querySelector("#confirmNo");
        
        yesBtn.addEventListener("click", function() {
            confirmDialog.remove();
            resolve(true);
        });
        
        noBtn.addEventListener("click", function() {
            confirmDialog.remove();
            resolve(false);
        });
        
        // 點擊背景也關閉對話框
        confirmDialog.addEventListener("click", function(e) {
            if (e.target === confirmDialog) {
                confirmDialog.remove();
                resolve(false);
            }
        });
    });
}

// 顯示頂層成功通知
function showTopNotification(message, options = {}) {
    const type = options.type || "success"; // success, error, info, warning
    
    // 使用藍色為主題色
    let bgColor = "#3498db"; // 主題藍色作為預設
    if (type === "error") {
        bgColor = "rgba(244, 67, 54, 0.9)"; // 紅色錯誤提示 
    } else if (type === "warning") {
        bgColor = "rgba(255, 152, 0, 0.9)"; // 橙色警告提示
    } else if (type === "success") {
        bgColor = "#3498db"; // 使用藍色替代綠色作為成功提示
    }
    
    const duration = options.duration || 3000; // 預設顯示3秒
    
    // 創建通知元素
    const notificationDialog = document.createElement("div");
    notificationDialog.className = `notification ${type}-notification`;
    notificationDialog.style.cssText = `
        position: fixed;
        top: 10%;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${bgColor};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        font-size: 16px;
        font-weight: bold;
        z-index: 200000;
        text-align: center;
    `;
    notificationDialog.textContent = message;
    
    document.body.appendChild(notificationDialog);
    
    // 設定時間後自動移除通知
    setTimeout(() => {
        notificationDialog.style.opacity = "0";
        notificationDialog.style.transition = "opacity 0.5s";
        
        setTimeout(() => {
            notificationDialog.remove();
        }, 500);
    }, duration);
    
    return notificationDialog;
} 