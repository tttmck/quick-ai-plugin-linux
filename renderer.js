// AI Chat Widget 渲染进程脚本 - 无工具栏版本
const { ipcRenderer, shell } = require('electron');

class AIChatWidgetNoToolbar {
    constructor() {
        this.webframe = null;
        this.websites = {
            'ChatGPT': 'https://chatgpt.com',
            'Claude': 'https://claude.ai',
            'Gemini': 'https://gemini.google.com',
            '文心一言': 'https://yiyan.baidu.com',
            '通义千问': 'https://chat.qwen.ai',
            'Kimi': 'https://kimi.moonshot.cn'
        };

        // 需要特殊处理的网站列表
        this.specialHandlingSites = {
            'chat.qwen.ai': {
                retryDelay: 3000,
                maxRetries: 3,
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            'yiyan.baidu.com': {
                retryDelay: 2000,
                maxRetries: 2,
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };
        this.currentWebsite = '';
        this.currentWebsiteName = '';
        this.isLoading = false;
        this._loadingCleanup = null; // 当前加载操作的清理函数

        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupElements();
            this.setupEventListeners();
            this.setupIPC();
        });
    }

    setupElements() {
        this.webframe = document.getElementById('webframe');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.contextMenu = document.getElementById('contextMenu');

        console.log('✅ DOM元素已初始化');
    }

    setupEventListeners() {
        // 欢迎界面的网站卡片
        document.querySelectorAll('.website-card').forEach(card => {
            card.addEventListener('click', () => {
                const websiteName = card.dataset.website;
                this.loadWebsite(websiteName);
            });
        });

        // 右键菜单
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        // 点击其他地方隐藏右键菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // 右键菜单项点击
        document.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleContextMenuAction(item.dataset.action);
                this.hideContextMenu();
            });
        });

        // webview加载事件
        this.webframe.addEventListener('dom-ready', () => {
            console.log('✅ webview DOM加载完成');
            this.hideLoading();
            this.hideWelcomeScreen();

            // 为ChatGPT等网站注入剪贴板支持脚本
            this.injectClipboardSupport();
        });

        // 处理新窗口请求（如第三方登录）
        this.webframe.addEventListener('new-window', (event) => {
            console.log('🔗 新窗口请求:', event.url);

            // 对于登录相关的URL，在同一个webview中打开
            if (this.isLoginUrl(event.url)) {
                console.log('🔐 检测到登录URL，在当前窗口打开');
                event.preventDefault();
                this.webframe.src = event.url;
            } else {
                // 其他链接在外部浏览器打开
                console.log('🌐 在外部浏览器打开');
                event.preventDefault();
                shell.openExternal(event.url);
            }
        });

        // 处理页面标题变化
        this.webframe.addEventListener('page-title-updated', (event) => {
            console.log('📄 页面标题:', event.title);
        });

        // 处理导航事件
        this.webframe.addEventListener('did-navigate', (event) => {
            console.log('🧭 页面导航到:', event.url);
        });

        // 处理导航失败
        this.webframe.addEventListener('did-fail-provisional-load', (event) => {
            console.error('❌ 页面导航失败:', event.errorDescription, event.errorCode);
            this.handleLoadError(event);
        });

        // 处理加载失败
        this.webframe.addEventListener('did-fail-load', (event) => {
            console.error('❌ 页面加载失败:', event.errorDescription, event.errorCode);
            this.handleLoadError(event);
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ipcRenderer.send('hide-window');
            }
            
            if (e.key === 'F5') {
                e.preventDefault();
                if (this.currentWebsiteName) {
                    this.loadWebsite(this.currentWebsiteName);
                }
            }

            // 数字键快速切换网站
            if (e.key >= '1' && e.key <= '6') {
                const websites = Object.keys(this.websites);
                const index = parseInt(e.key) - 1;
                if (websites[index]) {
                    this.loadWebsite(websites[index]);
                }
            }
        });

        console.log('✅ 事件监听器已设置');
    }

    setupIPC() {
        ipcRenderer.on('load-website-url', (event, url) => {
            const websiteName = Object.keys(this.websites).find(name => this.websites[name] === url);
            if (websiteName) {
                this.loadWebsite(websiteName);
            }
        });

        // 监听剪贴板操作结果
        ipcRenderer.on('clipboard-write-result', (event, result) => {
            if (result.success) {
                console.log('✅ 主进程剪贴板写入成功');
            } else {
                console.error('❌ 主进程剪贴板写入失败:', result.error);
            }
        });

        ipcRenderer.on('clipboard-read-result', (event, result) => {
            if (result.success) {
                console.log('✅ 主进程剪贴板读取成功');
            } else {
                console.error('❌ 主进程剪贴板读取失败:', result.error);
            }
        });

        // 监听来自webview的剪贴板请求
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'clipboard-write') {
                ipcRenderer.send('write-clipboard', event.data.text);
            } else if (event.data && event.data.type === 'clipboard-read') {
                ipcRenderer.send('read-clipboard');
            }
        });

        // 监听显示自定义URL对话框的请求
        ipcRenderer.on('show-custom-url-dialog', () => {
            this.showCustomUrlDialog();
        });

        // 监听自定义URL加载结果
        ipcRenderer.on('custom-url-result', (event, result) => {
            if (result.success) {
                console.log('✅ 自定义URL加载成功:', result.url);
                this.loadCustomUrlDirect(result.url);
                this.hideCustomUrlDialog();
                this.showSuccessMessage('网址加载成功！');
            } else {
                console.error('❌ 自定义URL加载失败:', result.error);
                this.showToast('加载失败: ' + result.error);
            }
        });

        console.log('✅ IPC通信已设置');
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

    // 处理加载错误
    handleLoadError(event) {
        this.hideLoading();

        const websiteName = event.websiteName || this.currentWebsiteName;
        const retryCount = event.retryCount || this.currentRetryCount || 0;
        const url = this.websites[websiteName];

        if (!url) return;

        const domain = new URL(url).hostname;
        const specialConfig = this.specialHandlingSites[domain];
        const maxRetries = specialConfig ? specialConfig.maxRetries : 1;

        console.log(`❌ 加载失败: ${websiteName}, 错误码: ${event.errorCode}, 重试次数: ${retryCount}/${maxRetries}`);

        // 如果还可以重试
        if (retryCount < maxRetries) {
            const retryDelay = specialConfig ? specialConfig.retryDelay : 2000;

            this.showRetryMessage(websiteName, retryCount + 1, maxRetries, retryDelay);

            setTimeout(() => {
                this.loadWebsite(websiteName, retryCount + 1);
            }, retryDelay);

            return;
        }

        // 已达到最大重试次数，显示错误信息
        if (event.errorCode === -3) { // ERR_ABORTED
            this.showErrorMessage('页面加载被中止', `${websiteName} 可能有访问限制，已尝试 ${maxRetries + 1} 次`);
        } else if (event.errorCode === -106) { // ERR_INTERNET_DISCONNECTED
            this.showErrorMessage('网络连接失败', '请检查网络连接后重试');
        } else if (event.errorCode === -105) { // ERR_NAME_NOT_RESOLVED
            this.showErrorMessage('域名解析失败', '无法访问该网站，请检查网络或稍后重试');
        } else if (event.errorCode === -7) { // 超时
            this.showErrorMessage('加载超时', `${websiteName} 响应时间过长，已尝试 ${maxRetries + 1} 次`);
        } else {
            this.showErrorMessage('加载失败', `${websiteName} 加载失败，错误代码: ${event.errorCode}`);
        }
    }

    // 显示重试消息
    showRetryMessage(websiteName, currentRetry, maxRetries, delay) {
        const retryDiv = document.createElement('div');
        retryDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffc107;
            color: #212529;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-size: 14px;
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        retryDiv.innerHTML = `
            <div style="font-weight: bold;">🔄 正在重试加载</div>
            <div style="margin-top: 4px;">${websiteName} (${currentRetry}/${maxRetries})</div>
        `;

        document.body.appendChild(retryDiv);

        setTimeout(() => {
            if (retryDiv.parentNode) {
                retryDiv.remove();
            }
        }, delay - 500);
    }

    // 显示错误消息
    showErrorMessage(title, message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #dc3545;">${title}</h3>
            <p style="margin: 0 0 15px 0; color: #6c757d;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="retryBtn" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                ">重试</button>
                <button id="openExternalBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                ">在浏览器中打开</button>
                <button id="closeErrorBtn" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                ">关闭</button>
            </div>
        `;

        document.body.appendChild(errorDiv);

        // 绑定按钮事件
        document.getElementById('retryBtn').onclick = () => {
            errorDiv.remove();
            if (this.currentWebsiteName) {
                this.loadWebsite(this.currentWebsiteName);
            }
        };

        document.getElementById('openExternalBtn').onclick = () => {
            errorDiv.remove();
            if (this.currentWebsite) {
                shell.openExternal(this.currentWebsite);
            }
        };

        document.getElementById('closeErrorBtn').onclick = () => {
            errorDiv.remove();
            this.showWelcomeScreen();
        };

        // 5秒后自动关闭
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }

    // 清理上一次加载操作的监听器和超时
    _cleanupLoading() {
        if (this._loadingCleanup) {
            this._loadingCleanup();
            this._loadingCleanup = null;
        }
    }

    loadWebsite(websiteName, retryCount = 0) {
        if (!this.websites[websiteName]) {
            console.error('❌ 未知的网站:', websiteName);
            return;
        }

        // 清理上一次的监听器
        this._cleanupLoading();

        const url = this.websites[websiteName];
        console.log(`🌐 加载网站: ${websiteName} - ${url} (尝试 ${retryCount + 1})`);

        this.currentWebsite = url;
        this.currentWebsiteName = websiteName;
        this.currentRetryCount = retryCount;

        this.hideWelcomeScreen();
        this.showLoading();

        // 检查是否需要特殊处理
        const domain = new URL(url).hostname;
        const specialConfig = this.specialHandlingSites[domain];

        // 设置用户代理（如果需要）
        if (specialConfig && specialConfig.userAgent) {
            this.webframe.setAttribute('useragent', specialConfig.userAgent);
        }

        const timeoutDuration = specialConfig ? 30000 : 20000;

        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            clearTimeout(loadingTimeout);
            this.webframe.removeEventListener('dom-ready', handleDomReady);
            this.webframe.removeEventListener('did-fail-load', handleLoadFail);
        };

        const loadingTimeout = setTimeout(() => {
            cleanup();
            console.log('⚠️ 加载超时');
            this.hideLoading();
            this.handleLoadError({
                errorCode: -7,
                errorDescription: '加载超时',
                websiteName: websiteName,
                retryCount: retryCount
            });
        }, timeoutDuration);

        const handleDomReady = () => {
            cleanup();
            this.hideLoading();
            console.log('✅ 网站加载成功:', websiteName);
        };

        const handleLoadFail = (event) => {
            cleanup();
            this.hideLoading();
            this.handleLoadError({
                ...event,
                websiteName: websiteName,
                retryCount: retryCount
            });
        };

        // 记录清理函数，供下一次调用时清理
        this._loadingCleanup = cleanup;

        this.webframe.addEventListener('dom-ready', handleDomReady);
        this.webframe.addEventListener('did-fail-load', handleLoadFail);

        // 对于特殊网站，添加延迟
        if (specialConfig && retryCount === 0) {
            setTimeout(() => {
                this.webframe.src = url;
            }, 1000);
        } else {
            this.webframe.src = url;
        }

        ipcRenderer.send('load-website', websiteName);
    }



    // 显示外部打开菜单
    showExternalOpenMenu() {
        const menuDiv = document.createElement('div');
        menuDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 16px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const websiteButtons = Object.keys(this.websites).map(name =>
            `<button class="external-website-btn" data-website="${name}" style="
                display: block;
                width: 100%;
                margin: 4px 0;
                padding: 8px 12px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
            ">${name}</button>`
        ).join('');

        menuDiv.innerHTML = `
            <h4 style="margin: 0 0 12px 0; color: #495057;">在浏览器中打开</h4>
            ${websiteButtons}
            <button id="cancelExternalBtn" style="
                display: block;
                width: 100%;
                margin: 8px 0 0 0;
                padding: 8px 12px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">取消</button>
        `;

        document.body.appendChild(menuDiv);

        // 绑定事件
        menuDiv.querySelectorAll('.external-website-btn').forEach(btn => {
            btn.onclick = () => {
                const websiteName = btn.dataset.website;
                const url = this.websites[websiteName];
                shell.openExternal(url);
                menuDiv.remove();
            };
        });

        document.getElementById('cancelExternalBtn').onclick = () => {
            menuDiv.remove();
        };

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menuDiv.contains(e.target)) {
                    menuDiv.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    showContextMenu(x, y) {
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    }

    handleContextMenuAction(action) {
        switch (action) {
            case 'refresh':
                if (this.currentWebsiteName) {
                    this.loadWebsite(this.currentWebsiteName);
                }
                break;
            case 'chatgpt':
                this.loadWebsite('ChatGPT');
                break;
            case 'claude':
                this.loadWebsite('Claude');
                break;
            case 'gemini':
                this.loadWebsite('Gemini');
                break;
            case 'wenxin':
                this.loadWebsite('文心一言');
                break;
            case 'tongyi':
                this.loadWebsite('通义千问');
                break;
            case 'kimi':
                this.loadWebsite('Kimi');
                break;
            case 'custom-url':
                this.showCustomUrlDialog();
                break;
            case 'external':
                if (this.currentWebsite) {
                    shell.openExternal(this.currentWebsite);
                } else {
                    // 如果没有当前网站，显示选择菜单
                    this.showExternalOpenMenu();
                }
                break;
            case 'clear':
                this.clearLoginData();
                break;
            case 'clear-all':
                this.clearAllData();
                break;
            case 'hide':
                ipcRenderer.send('hide-window');
                break;
        }
    }

    clearLoginData() {
        if (confirm('确定要清除登录数据吗？这将删除cookies和登录状态，但保留缓存以提高加载速度。')) {
            // 只清除主进程的登录相关数据（不清除webview的缓存）
            ipcRenderer.send('clear-session-data');

            if (this.currentWebsiteName) {
                this.webframe.src = 'about:blank';
                setTimeout(() => {
                    this.loadWebsite(this.currentWebsiteName);
                }, 1000);
            }

            this.showSuccessMessage('登录数据已清除，请重新登录');
        }
    }

    clearAllData() {
        if (confirm('确定要清除所有数据吗？这将删除所有cookies、缓存和存储数据，首次加载可能会较慢。')) {
            // 清除webview的所有存储数据
            if (this.webframe && this.webframe.clearStorageData) {
                this.webframe.clearStorageData({
                    storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
                });
            }

            // 清除主进程的所有数据
            ipcRenderer.send('clear-all-data');

            if (this.currentWebsiteName) {
                this.webframe.src = 'about:blank';
                setTimeout(() => {
                    this.loadWebsite(this.currentWebsiteName);
                }, 1500);
            }

            this.showSuccessMessage('所有数据已清除，请重新登录');
        }
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
        this.isLoading = true;
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
        this.isLoading = false;
    }

    hideWelcomeScreen() {
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.add('hidden');
        }
    }

    showWelcomeScreen() {
        if (this.welcomeScreen) {
            this.welcomeScreen.classList.remove('hidden');
        }
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    // 注入剪贴板支持脚本
    injectClipboardSupport() {
        try {
            const script = `
                // 修复剪贴板API
                (function() {
                    console.log('🔧 正在注入剪贴板支持...');

                    // 确保navigator.clipboard存在
                    if (!navigator.clipboard) {
                        navigator.clipboard = {};
                    }

                    // 重写writeText方法 - 使用多种方式确保复制成功
                    navigator.clipboard.writeText = function(text) {
                        return new Promise((resolve, reject) => {
                            // 方法1: 尝试使用原生API
                            if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
                                window.navigator.clipboard.writeText(text).then(resolve).catch(() => {
                                    // 方法2: 使用execCommand
                                    try {
                                        const textarea = document.createElement('textarea');
                                        textarea.value = text;
                                        textarea.style.position = 'fixed';
                                        textarea.style.left = '-999999px';
                                        textarea.style.top = '-999999px';
                                        document.body.appendChild(textarea);

                                        textarea.focus();
                                        textarea.select();
                                        const successful = document.execCommand('copy');
                                        document.body.removeChild(textarea);

                                        if (successful) {
                                            console.log('✅ 文本已复制到剪贴板 (execCommand)');
                                            resolve();
                                        } else {
                                            // 方法3: 通知主进程处理
                                            window.parent.postMessage({
                                                type: 'clipboard-write',
                                                text: text
                                            }, '*');
                                            console.log('✅ 已请求主进程复制文本');
                                            resolve();
                                        }
                                    } catch (err) {
                                        console.error('❌ 复制异常:', err);
                                        reject(err);
                                    }
                                });
                            } else {
                                // 直接使用execCommand方法
                                try {
                                    const textarea = document.createElement('textarea');
                                    textarea.value = text;
                                    textarea.style.position = 'fixed';
                                    textarea.style.left = '-999999px';
                                    textarea.style.top = '-999999px';
                                    document.body.appendChild(textarea);

                                    textarea.focus();
                                    textarea.select();
                                    const successful = document.execCommand('copy');
                                    document.body.removeChild(textarea);

                                    if (successful) {
                                        console.log('✅ 文本已复制到剪贴板');
                                        resolve();
                                    } else {
                                        console.error('❌ 复制失败');
                                        reject(new Error('复制失败'));
                                    }
                                } catch (err) {
                                    console.error('❌ 复制异常:', err);
                                    reject(err);
                                }
                            }
                        });
                    };

                    // 重写readText方法
                    navigator.clipboard.readText = function() {
                        return new Promise((resolve, reject) => {
                            try {
                                // 创建临时textarea元素
                                const textarea = document.createElement('textarea');
                                textarea.style.position = 'fixed';
                                textarea.style.left = '-999999px';
                                textarea.style.top = '-999999px';
                                document.body.appendChild(textarea);

                                // 尝试粘贴
                                textarea.focus();
                                const successful = document.execCommand('paste');
                                const text = textarea.value;
                                document.body.removeChild(textarea);

                                if (successful) {
                                    console.log('✅ 从剪贴板读取文本');
                                    resolve(text);
                                } else {
                                    console.log('⚠️ 无法读取剪贴板');
                                    resolve('');
                                }
                            } catch (err) {
                                console.error('❌ 读取剪贴板异常:', err);
                                resolve('');
                            }
                        });
                    };

                    // 增强复制按钮的点击事件
                    document.addEventListener('click', function(e) {
                        const target = e.target;

                        // 检查是否是复制按钮
                        if (target.matches('[data-testid*="copy"], .copy-button, [title*="Copy"], [aria-label*="Copy"], [title*="复制"], [aria-label*="复制"]') ||
                            target.closest('[data-testid*="copy"], .copy-button, [title*="Copy"], [aria-label*="Copy"], [title*="复制"], [aria-label*="复制"]')) {

                            console.log('🔍 检测到复制按钮点击');

                            // 延迟执行，确保原始复制逻辑先执行
                            setTimeout(() => {
                                // 尝试从选中的文本复制
                                const selection = window.getSelection();
                                if (selection && selection.toString()) {
                                    navigator.clipboard.writeText(selection.toString()).catch(console.error);
                                    return;
                                }

                                // 尝试从最近的代码块或文本容器复制
                                const codeBlock = target.closest('pre, code, .code-block, [class*="code"], [class*="message"]');
                                if (codeBlock) {
                                    const text = codeBlock.textContent || codeBlock.innerText;
                                    if (text) {
                                        navigator.clipboard.writeText(text).catch(console.error);
                                    }
                                }
                            }, 100);
                        }
                    });

                    // 监听键盘快捷键
                    document.addEventListener('keydown', function(e) {
                        // Ctrl+C 或 Cmd+C
                        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                            const selection = window.getSelection();
                            if (selection && selection.toString()) {
                                navigator.clipboard.writeText(selection.toString()).catch(console.error);
                            }
                        }
                    });

                    console.log('✅ 剪贴板支持已注入');
                })();
            `;

            this.webframe.executeJavaScript(script);
            console.log('✅ 剪贴板支持脚本已注入');
        } catch (error) {
            console.error('❌ 注入剪贴板支持失败:', error);
        }
    }

    // 显示自定义URL对话框
    showCustomUrlDialog() {
        const dialog = document.getElementById('customUrlDialog');
        const input = document.getElementById('customUrlInput');

        if (dialog && input) {
            dialog.classList.remove('hidden');
            input.focus();
            input.select();

            // 清理旧的监听器（如果有）
            if (this._customUrlKeyHandler) {
                input.removeEventListener('keydown', this._customUrlKeyHandler);
            }

            this._customUrlKeyHandler = (e) => {
                if (e.key === 'Enter') {
                    this.loadCustomUrl();
                } else if (e.key === 'Escape') {
                    this.hideCustomUrlDialog();
                }
            };

            input.addEventListener('keydown', this._customUrlKeyHandler);
            console.log('📝 显示自定义URL对话框');
        }
    }

    // 隐藏自定义URL对话框
    hideCustomUrlDialog() {
        const dialog = document.getElementById('customUrlDialog');
        const input = document.getElementById('customUrlInput');

        if (dialog) {
            dialog.classList.add('hidden');
        }

        if (input) {
            // 清理监听器
            if (this._customUrlKeyHandler) {
                input.removeEventListener('keydown', this._customUrlKeyHandler);
                this._customUrlKeyHandler = null;
            }
            input.value = '';
        }

        console.log('❌ 隐藏自定义URL对话框');
    }

    // 加载自定义URL
    loadCustomUrl() {
        const input = document.getElementById('customUrlInput');
        if (!input) return;

        const url = input.value.trim();
        if (!url) {
            this.showToast('请输入网址');
            return;
        }

        console.log('🌐 请求加载自定义URL:', url);
        ipcRenderer.send('load-custom-url', url);
    }

    // 直接加载自定义URL（跳过验证，用于已验证的URL）
    loadCustomUrlDirect(url) {
        this._cleanupLoading();

        this.currentWebsite = url;
        this.currentWebsiteName = '自定义网站';
        this.currentRetryCount = 0;

        this.hideWelcomeScreen();
        this.showLoading();

        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            clearTimeout(loadingTimeout);
            this.webframe.removeEventListener('dom-ready', handleDomReady);
            this.webframe.removeEventListener('did-fail-load', handleLoadFail);
        };

        const loadingTimeout = setTimeout(() => {
            cleanup();
            console.log('⚠️ 自定义URL加载超时');
            this.hideLoading();
            this.showToast('网站加载超时，请检查网址是否正确');
        }, 30000);

        const handleDomReady = () => {
            cleanup();
            this.hideLoading();
            console.log('✅ 自定义网站加载成功:', url);
        };

        const handleLoadFail = (event) => {
            cleanup();
            this.hideLoading();
            console.error('❌ 自定义网站加载失败:', event.errorDescription);
            this.showToast('网站加载失败: ' + event.errorDescription);
        };

        this._loadingCleanup = cleanup;

        this.webframe.addEventListener('dom-ready', handleDomReady);
        this.webframe.addEventListener('did-fail-load', handleLoadFail);

        this.webframe.src = url;
        console.log('🚀 开始加载自定义网站:', url);
    }

    // 显示简短提示消息
    showToast(message, type = 'error') {
        // 移除已有的 toast，避免叠加
        document.querySelectorAll('.app-toast').forEach(el => el.remove());

        const colors = {
            error: '#f44336',
            success: '#4CAF50',
            warning: '#ffc107',
            info: '#2196F3'
        };

        const tip = document.createElement('div');
        tip.className = 'app-toast';
        tip.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.error};
            color: ${type === 'warning' ? '#212529' : 'white'};
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-size: 14px;
            max-width: 300px;
        `;
        tip.textContent = message;

        document.body.appendChild(tip);

        setTimeout(() => {
            if (tip.parentNode) {
                tip.remove();
            }
        }, 4000);
    }
}

// 创建应用实例
const aiChatWidget = new AIChatWidgetNoToolbar();
window.aiChatWidget = aiChatWidget;

// 全局函数，供HTML调用
window.showCustomUrlDialog = () => aiChatWidget.showCustomUrlDialog();
window.hideCustomUrlDialog = () => aiChatWidget.hideCustomUrlDialog();
window.loadCustomUrl = () => aiChatWidget.loadCustomUrl();

console.log('🚀 AI Chat Widget 渲染进程已启动 (无工具栏版本)');
