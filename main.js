const { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

class AIChatWidget {
    constructor() {
        this.mainWindow = null;
        this.tray = null;
        this.isVisible = false;
        this.hotkey = 'CommandOrControl+Space';
        this.hasShownTrayNotification = false;

        // 配置文件路径
        this.configPath = path.join(os.homedir(), '.ai-chat-widget-config.json');
        this.windowConfig = this.loadWindowConfig();

        // AI网站配置
        this.websites = {
            'ChatGPT': 'https://chat.openai.com',
            'Claude': 'https://claude.ai',
            'Gemini': 'https://gemini.google.com',
            '文心一言': 'https://yiyan.baidu.com',
            '通义千问': 'https://chat.qwen.ai',
            'Kimi': 'https://kimi.moonshot.cn'
        };

        this.currentWebsite = this.websites['ChatGPT'];
    }

    loadWindowConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                console.log('📁 已加载窗口配置:', config);
                return config;
            }
        } catch (error) {
            console.log('⚠️ 加载窗口配置失败:', error.message);
        }

        // 默认配置
        return {
            width: 1000,
            height: 700,
            x: undefined,
            y: undefined
        };
    }

    saveWindowConfig() {
        if (this.mainWindow) {
            const bounds = this.mainWindow.getBounds();
            const config = {
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y
            };

            try {
                fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
                console.log('💾 已保存窗口配置:', config);
            } catch (error) {
                console.log('⚠️ 保存窗口配置失败:', error.message);
            }
        }
    }

    createWindow() {
        // 创建浏览器窗口，使用保存的配置
        const windowOptions = {
            width: this.windowConfig.width,
            height: this.windowConfig.height,
            show: false, // 初始隐藏
            frame: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false, // 允许跨域
                allowRunningInsecureContent: true,
                webviewTag: true, // 启用webview标签
                partition: 'persist:ai-chat-widget', // 持久化存储分区
                experimentalFeatures: true, // 启用实验性功能
                plugins: true // 启用插件支持
            }
        };

        // 如果有保存的位置，则使用保存的位置
        if (this.windowConfig.x !== undefined && this.windowConfig.y !== undefined) {
            windowOptions.x = this.windowConfig.x;
            windowOptions.y = this.windowConfig.y;
        }

        this.mainWindow = new BrowserWindow(windowOptions);

        // 配置会话持久化
        this.setupSessionPersistence();

        // 加载应用的 index.html
        this.mainWindow.loadFile('index.html');

        // 窗口关闭时隐藏到托盘而不是退出
        this.mainWindow.on('close', (event) => {
            if (!app.isQuiting) {
                event.preventDefault();
                this.saveWindowConfig(); // 保存窗口配置
                this.hideWindow();

                // 首次隐藏到托盘时显示提示
                if (this.tray && !this.hasShownTrayNotification) {
                    this.tray.displayBalloon({
                        iconType: 'info',
                        title: 'AI Chat Widget',
                        content: '应用已最小化到系统托盘，使用 Ctrl+Space 快速显示'
                    });
                    this.hasShownTrayNotification = true;
                }
            }
        });

        // 窗口大小或位置改变时保存配置
        this.mainWindow.on('resize', () => {
            this.saveWindowConfig();
        });

        this.mainWindow.on('move', () => {
            this.saveWindowConfig();
        });

        // 失去焦点时可选择隐藏（取消注释下面的代码启用）
        // this.mainWindow.on('blur', () => {
        //     this.hideWindow();
        // });

        // 处理新窗口请求
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            console.log('🔗 新窗口请求:', url);

            // 对于登录相关的URL，允许在新窗口中打开
            if (this.isLoginUrl(url)) {
                console.log('🔐 允许登录窗口打开');
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        width: 800,
                        height: 600,
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            webSecurity: true
                        }
                    }
                };
            }

            // 其他链接在外部浏览器打开
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        });

        // 只有在明确指定开发模式时才打开开发者工具
        if (process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
            console.log('🔧 开发模式：已打开开发者工具');
        }

        console.log('🚀 AI Chat Widget 窗口已创建');
    }

    createTray() {
        // 创建托盘图标
        const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');

        // 如果图标文件不存在，创建一个简单的图标
        if (!fs.existsSync(iconPath)) {
            console.log('⚠️ 托盘图标不存在，使用默认图标');
            // 使用 Electron 的默认图标或创建一个简单的图标
            this.tray = new Tray(nativeImage.createEmpty());
        } else {
            this.tray = new Tray(iconPath);
            console.log('✅ 托盘图标加载成功');
        }

        // 设置托盘提示文本
        this.tray.setToolTip('AI Chat Widget - 按 Ctrl+Space 显示/隐藏');

        // 创建托盘右键菜单
        this.updateTrayMenu();

        // 托盘图标点击事件
        this.tray.on('click', () => {
            this.toggleWindow();
        });

        // 托盘图标双击事件
        this.tray.on('double-click', () => {
            this.showWindow();
        });

        console.log('📌 系统托盘已创建');
    }

    setupGlobalShortcuts() {
        // 注册全局快捷键
        const ret = globalShortcut.register(this.hotkey, () => {
            this.toggleWindow();
        });

        if (!ret) {
            console.log('❌ 快捷键注册失败');
        } else {
            console.log(`✅ 已注册快捷键: ${this.hotkey}`);
        }

        // 检查快捷键是否注册成功
        console.log(`快捷键 ${this.hotkey} 是否已注册:`, globalShortcut.isRegistered(this.hotkey));
    }

    setupIPC() {
        // 处理来自渲染进程的消息
        ipcMain.on('load-website', (event, websiteName) => {
            if (this.websites[websiteName]) {
                this.currentWebsite = this.websites[websiteName];
                console.log(`🔄 切换到: ${websiteName} - ${this.currentWebsite}`);
                event.reply('website-changed', this.currentWebsite);
            }
        });

        ipcMain.on('hide-window', () => {
            this.hideWindow();
        });

        ipcMain.on('get-websites', (event) => {
            event.reply('websites-list', this.websites);
        });

        ipcMain.on('get-current-website', (event) => {
            event.reply('current-website', this.currentWebsite);
        });

        ipcMain.on('clear-session-data', () => {
            this.clearSessionData();
        });

        ipcMain.on('clear-all-data', () => {
            this.clearAllData();
        });

        ipcMain.on('open-external', (event, url) => {
            require('electron').shell.openExternal(url);
        });

        // 处理剪贴板写入请求
        ipcMain.on('write-clipboard', (event, text) => {
            try {
                require('electron').clipboard.writeText(text);
                console.log('✅ 文本已写入系统剪贴板');
                event.reply('clipboard-write-result', { success: true });
            } catch (error) {
                console.error('❌ 写入剪贴板失败:', error);
                event.reply('clipboard-write-result', { success: false, error: error.message });
            }
        });

        // 处理剪贴板读取请求
        ipcMain.on('read-clipboard', (event) => {
            try {
                const text = require('electron').clipboard.readText();
                console.log('✅ 从系统剪贴板读取文本');
                event.reply('clipboard-read-result', { success: true, text });
            } catch (error) {
                console.error('❌ 读取剪贴板失败:', error);
                event.reply('clipboard-read-result', { success: false, error: error.message });
            }
        });

        // 处理自定义URL加载请求
        ipcMain.on('load-custom-url', (event, url) => {
            try {
                // 验证URL格式
                const validUrl = this.validateAndFormatUrl(url);
                if (validUrl) {
                    this.currentWebsite = validUrl;
                    console.log(`🌐 加载自定义URL: ${validUrl}`);
                    event.reply('custom-url-result', { success: true, url: validUrl });
                } else {
                    console.error('❌ 无效的URL格式:', url);
                    event.reply('custom-url-result', { success: false, error: '无效的URL格式' });
                }
            } catch (error) {
                console.error('❌ 加载自定义URL失败:', error);
                event.reply('custom-url-result', { success: false, error: error.message });
            }
        });
    }

    toggleWindow() {
        if (this.isVisible) {
            this.hideWindow();
        } else {
            this.showWindow();
        }
    }

    showWindow() {
        if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
            this.isVisible = true;
            console.log('👁️  窗口已显示');
        }
    }

    hideWindow() {
        if (this.mainWindow) {
            this.mainWindow.hide();
            this.isVisible = false;
            console.log('🙈 窗口已隐藏');
        }
    }

    setupMenu() {
        // 创建应用菜单
        const template = [
            {
                label: 'AI Chat Widget',
                submenu: [
                    {
                        label: '显示/隐藏',
                        accelerator: this.hotkey,
                        click: () => this.toggleWindow()
                    },
                    { type: 'separator' },
                    {
                        label: '退出',
                        accelerator: 'CommandOrControl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            ...Object.keys(this.websites).map(name => ({
                label: `🤖 ${name}`,
                click: () => {
                    this.currentWebsite = this.websites[name];
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('load-website-url', this.currentWebsite);
                    }
                }
            })),
            { type: 'separator' },
            {
                label: '🌐 自定义网址...',
                accelerator: 'CommandOrControl+U',
                click: () => {
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('show-custom-url-dialog');
                    }
                }
            },
            { type: 'separator' },
            {
                label: '开发',
                submenu: [
                    {
                        label: '重新加载',
                        accelerator: 'CommandOrControl+R',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.reload();
                            }
                        }
                    },
                    {
                        label: '开发者工具',
                        accelerator: 'F12',
                        click: () => {
                            if (this.mainWindow) {
                                this.mainWindow.webContents.toggleDevTools();
                            }
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupSessionPersistence() {
        try {
            // 获取持久化会话
            const session = this.mainWindow.webContents.session;

            // 配置权限
            session.setPermissionRequestHandler((webContents, permission, callback) => {
                // 允许存储相关权限和剪贴板权限
                if (permission === 'persistent-storage' ||
                    permission === 'storage-access' ||
                    permission === 'cookies' ||
                    permission === 'geolocation' ||
                    permission === 'notifications' ||
                    permission === 'clipboard-read' ||
                    permission === 'clipboard-write' ||
                    permission === 'clipboard-sanitized-write') {
                    console.log(`✅ 允许权限: ${permission}`);
                    callback(true);
                } else {
                    console.log(`❌ 拒绝权限: ${permission}`);
                    callback(false);
                }
            });

            // 设置更真实的用户代理
            const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            session.setUserAgent(userAgent);

            // 设置请求头
            session.webRequest.onBeforeSendHeaders((details, callback) => {
                details.requestHeaders['Accept'] = 'text/html,application/xhtml+xml,applic？ation/xml;q=0.9,image/webp,image/apng,*/*;q=0.8';
                details.requestHeaders['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
                details.requestHeaders['Cache-Control'] = 'no-cache';
                details.requestHeaders['Pragma'] = 'no-cache';

                // 移除可能暴露Electron的头部
                delete details.requestHeaders['User-Agent'];
                details.requestHeaders['User-Agent'] = userAgent;

                callback({ requestHeaders: details.requestHeaders });
            });

            // 设置预加载脚本路径（如果需要）
            session.setPreloads([]);

            // 设置剪贴板权限处理
            session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
                if (permission === 'clipboard-read' || permission === 'clipboard-write' || permission === 'clipboard-sanitized-write') {
                    console.log(`✅ 允许剪贴板权限: ${permission} for ${requestingOrigin}`);
                    return true;
                }
                return true; // 默认允许其他权限
            });

            // 设置设备权限处理
            session.setDevicePermissionHandler((details) => {
                if (details.deviceType === 'clipboard') {
                    console.log('✅ 允许剪贴板设备访问');
                    return true;
                }
                return false;
            });

            console.log('💾 会话持久化已配置');
        } catch (error) {
            console.error('⚠️ 会话持久化配置失败:', error.message);
        }
    }

    // 判断是否为登录相关的URL
    isLoginUrl(url) {
        const loginPatterns = [
            'github.com',
            'google.com',
            'accounts.google.com',
            'login.microsoftonline.com',
            'auth0.com',
            'oauth',
            'login',
            'signin',
            'auth',
            'sso',
            'openid'
        ];

        return loginPatterns.some(pattern => url.toLowerCase().includes(pattern));
    }

    // 验证和格式化URL
    validateAndFormatUrl(url) {
        try {
            // 如果没有协议，默认添加https://
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            // 验证URL格式
            const urlObj = new URL(url);

            // 检查协议是否为http或https
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                return null;
            }

            // 检查域名是否有效
            if (!urlObj.hostname || urlObj.hostname.length === 0) {
                return null;
            }

            console.log(`✅ URL验证通过: ${urlObj.href}`);
            return urlObj.href;
        } catch (error) {
            console.error('❌ URL验证失败:', error.message);
            return null;
        }
    }

    setAutoStart(enable) {
        // 设置开机启动
        app.setLoginItemSettings({
            openAtLogin: enable,
            openAsHidden: true, // 启动时隐藏窗口
            name: 'AI Chat Widget',
            path: process.execPath
        });

        console.log(`${enable ? '✅' : '❌'} 开机启动已${enable ? '启用' : '禁用'}`);

        // 重新创建托盘菜单以更新开机启动状态
        if (this.tray) {
            this.updateTrayMenu();
        }
    }

    updateTrayMenu() {
        // 创建托盘右键菜单
        const contextMenu = Menu.buildFromTemplate([
            {
                label: '显示/隐藏窗口',
                click: () => this.toggleWindow()
            },
            { type: 'separator' },
            ...Object.keys(this.websites).map(name => ({
                label: `🤖 ${name}`,
                click: () => {
                    this.currentWebsite = this.websites[name];
                    this.showWindow();
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('load-website-url', this.currentWebsite);
                    }
                }
            })),
            { type: 'separator' },
            {
                label: '🌐 自定义网址...',
                click: () => {
                    this.showWindow();
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('show-custom-url-dialog');
                    }
                }
            },
            { type: 'separator' },
            { type: 'separator' },
            {
                label: '开机启动',
                type: 'checkbox',
                checked: app.getLoginItemSettings().openAtLogin,
                click: (menuItem) => {
                    this.setAutoStart(menuItem.checked);
                }
            },
            { type: 'separator' },
            {
                label: '退出',
                click: () => {
                    app.quit();
                }
            }
        ]);

        this.tray.setContextMenu(contextMenu);
    }

    clearSessionData() {
        // 清除会话数据（仅清除登录相关数据，保留缓存）
        if (this.mainWindow && this.mainWindow.webContents) {
            const session = this.mainWindow.webContents.session;

            // 只清除cookies和localStorage，保留其他缓存
            session.clearStorageData({
                storages: ['cookies', 'localstorage', 'sessionstorage'],
                quotas: ['temporary', 'persistent', 'syncable']
            }).then(() => {
                console.log('🗑️ 登录数据已清除（保留缓存）');
            }).catch((error) => {
                console.error('❌ 清除登录数据失败:', error);
            });
        }
    }

    // 完全清除所有数据（包括缓存）
    clearAllData() {
        if (this.mainWindow && this.mainWindow.webContents) {
            const session = this.mainWindow.webContents.session;

            session.clearStorageData({
                storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
            }).then(() => {
                console.log('🗑️ 所有数据已清除');
            }).catch((error) => {
                console.error('❌ 清除所有数据失败:', error);
            });
        }
    }

    init() {
        // 当 Electron 完成初始化并准备创建浏览器窗口时调用
        app.whenReady().then(() => {
            this.createWindow();
            this.createTray();
            this.setupGlobalShortcuts();
            this.setupIPC();
            this.setupMenu();

            // 检查是否应该隐藏启动（开机启动时）
            if (app.getLoginItemSettings().wasOpenedAsHidden) {
                this.hideWindow();
                console.log('🔇 应用以隐藏模式启动');
            } else {
                // 首次启动时默认加载ChatGPT
                setTimeout(() => {
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('load-website-url', this.websites['ChatGPT']);
                        console.log('🤖 默认加载ChatGPT');
                    }
                }, 1000); // 延迟1秒确保页面完全加载
            }

            console.log('🚀 AI Chat Widget 已启动');
            console.log(`📱 使用 ${this.hotkey} 来显示/隐藏窗口`);
            console.log('💬 在窗口中直接与AI对话');
            console.log('⌨️  按 ESC 键也可以隐藏窗口');
            console.log('📌 应用已添加到系统托盘');
        });

        // 当所有窗口都关闭时不退出应用，保持在托盘运行
        app.on('window-all-closed', (event) => {
            // 阻止应用退出，保持托盘运行
            event.preventDefault();
        });

        app.on('activate', () => {
            // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
            // 通常在应用程序中重新创建一个窗口
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        // 应用退出前清理
        app.on('before-quit', () => {
            app.isQuiting = true;

            // 保存窗口配置
            this.saveWindowConfig();

            // 注销所有快捷键
            globalShortcut.unregisterAll();

            // 销毁托盘
            if (this.tray) {
                this.tray.destroy();
            }

            console.log('🧹 已清理资源');
        });
    }
}

// 创建应用实例并初始化
const aiChatWidget = new AIChatWidget();
aiChatWidget.init();
