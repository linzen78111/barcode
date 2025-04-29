// 獲取商品圖片
async function getProductImage(imageName) {
    try {
        // 從 GitHub 倉庫中獲取圖片
        const response = await fetch(`https://raw.githubusercontent.com/linzen78111/barcode/main/JPG/${imageName}.jpg`);
        if (response.ok) {
            return response.url;
        }
        return null;
    } catch (error) {
        console.error('獲取商品圖片失敗:', error);
        return null;
    }
}

// 上傳商品圖片
async function uploadProductImage(barcode, imageName) {
    try {
        const isOfficial = await isOfficialAccount();
        if (!isOfficial) {
            throw new Error('只有官方帳號可以上傳圖片');
        }

        // 從 GitHub 倉庫中獲取圖片
        const response = await fetch(`https://raw.githubusercontent.com/linzen78111/barcode/main/JPG/${imageName}.jpg`);
        if (!response.ok) {
            throw new Error('找不到指定的圖片');
        }

        // 將圖片保存到本地
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        return new Promise((resolve, reject) => {
            reader.onloadend = function() {
                const base64data = reader.result;
                resolve(base64data);
            };
            reader.onerror = reject;
        });
    } catch (error) {
        console.error('上傳商品圖片失敗:', error);
        throw error;
    }
}

// 導出函數
export {
    // ... existing exports ...
    getProductImage,
    uploadProductImage
}; 