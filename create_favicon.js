const fs = require('fs');

// 創建一個簡單的16x16 favicon
const faviconBuffer = Buffer.from([
    0x00, 0x00, // reserved
    0x01, 0x00, // ico type
    0x01, 0x00, // number of images
    
    // Image directory
    0x10, // width (16)
    0x10, // height (16)
    0x00, // color palette
    0x00, // reserved
    0x01, 0x00, // color planes
    0x20, 0x00, // bits per pixel
    0x68, 0x04, 0x00, 0x00, // size of image data
    0x16, 0x00, 0x00, 0x00, // offset to image data
    
    // BMP Header
    0x28, 0x00, 0x00, 0x00, // header size
    0x10, 0x00, 0x00, 0x00, // width
    0x20, 0x00, 0x00, 0x00, // height (double for ico)
    0x01, 0x00, // planes
    0x20, 0x00, // bits per pixel
    0x00, 0x00, 0x00, 0x00, // compression
    0x00, 0x04, 0x00, 0x00, // image size
    0x00, 0x00, 0x00, 0x00, // x pixels per meter
    0x00, 0x00, 0x00, 0x00, // y pixels per meter
    0x00, 0x00, 0x00, 0x00, // colors used
    0x00, 0x00, 0x00, 0x00, // important colors
    
    // Pixel data (16x16 = 256 pixels, 4 bytes each for 32-bit)
    ...Array(1024).fill(0x00), // black pixels
    
    // AND mask (16x16 bits = 32 bytes)
    ...Array(32).fill(0x00) // no transparency
]);

fs.writeFileSync('./public/favicon.ico', faviconBuffer);
console.log('✅ Favicon created successfully!');