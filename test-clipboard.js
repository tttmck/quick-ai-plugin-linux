// 测试剪贴板功能的脚本
const { app, BrowserWindow, ipcMain, clipboard } = require('electron');

function createTestWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            webviewTag: true
        }
    });

    // 测试系统剪贴板
    console.log('🧪 测试系统剪贴板功能...');
    
    // 写入测试
    clipboard.writeText('测试文本 - AI Chat Widget');
    const readText = clipboard.readText();
    console.log('📋 剪贴板内容:', readText);
    
    if (readText === '测试文本 - AI Chat Widget') {
        console.log('✅ 系统剪贴板功能正常');
    } else {
        console.log('❌ 系统剪贴板功能异常');
    }

    // 加载测试页面
    win.loadURL('data:text/html,<html><body><h1>剪贴板测试</h1><button onclick="testClipboard()">测试复制</button><script>function testClipboard(){navigator.clipboard.writeText("测试成功").then(()=>alert("复制成功")).catch(e=>alert("复制失败:"+e))}</script></body></html>');

    win.webContents.openDevTools();
}

app.whenReady().then(createTestWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
