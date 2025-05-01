// 這個腳本需要 Node.js 環境和 sharp 庫
// 安裝說明: npm install sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 確保輸出目錄存在
const outputDir = path.join(__dirname, '../assets/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 需要的尺寸列表
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// 源圖標
const sourceIcon = path.join(__dirname, '../assets/icon-512x512.png');

// 為每個尺寸創建圖標
async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(sourceIcon)
        .resize(size, size)
        .toFile(outputPath);
      console.log(`成功創建 ${size}x${size} 圖標`);
    } catch (error) {
      console.error(`創建 ${size}x${size} 圖標時出錯:`, error);
    }
  }
}

generateIcons().catch(console.error); 