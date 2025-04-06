const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { JSDOM } = require('jsdom');
const svg2img = require('svg2img');

// Convert SVG to PNG
function convertSVGtoPNG(svgPath, pngPath, width, height) {
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    svg2img(svgContent, {
        width: width,
        height: height
    }, function(error, buffer) {
        if (error) {
            console.error(`Error converting ${svgPath}:`, error);
            return;
        }
        fs.writeFileSync(pngPath, buffer);
        console.log(`Successfully converted ${svgPath} to ${pngPath}`);
    });
}

// Convert both icons
convertSVGtoPNG(
    'assets/icon-192x192.svg',
    'assets/icon-192x192.png',
    192,
    192
);

convertSVGtoPNG(
    'assets/icon-512x512.svg',
    'assets/icon-512x512.png',
    512,
    512
); 