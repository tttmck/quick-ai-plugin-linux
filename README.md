# AI Chat Widget

<div align="center">

![AI Chat Widget](assets/tray-icon.svg)

**一个轻量级的桌面AI聊天工具，支持快捷键快速访问多个AI网站**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.3.3-blue.svg)](https://electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Linux-green.svg)](https://github.com/ai-chat-widget/ai-chat-widget)

[下载](#下载) • [功能特性](#功能特性) • [安装](#安装) • [使用方法](#使用方法) • [开发](#开发)

</div>

## 📖 简介

AI Chat Widget 是一个基于 Electron 的桌面应用程序，让您能够通过简单的快捷键（`Ctrl+Space`）快速访问各种AI聊天网站。无需在浏览器中切换标签页，一键即可与AI助手对话。

> 🤖 **AI生成项目**: 本项目完全由AI助手生成，包括代码实现、功能设计、文档编写等。这是一个展示AI编程能力的实际案例。

## ✨ 功能特性

### 🚀 核心功能
- **全局快捷键**: 使用 `Ctrl+Space` 快速显示/隐藏窗口
- **多AI平台支持**: 内置支持 ChatGPT、Claude、Gemini、文心一言、通义千问、Kimi
- **自定义网址**: 支持添加任意AI网站或聊天服务
- **系统托盘**: 最小化到系统托盘，不占用任务栏空间
- **会话保持**: 自动保存登录状态和聊天历史

### 🎯 便捷操作
- **ESC键隐藏**: 按 ESC 键快速隐藏窗口
- **F5刷新**: 快速刷新当前AI网站
- **数字键切换**: 使用 1-6 数字键快速切换AI网站
- **右键菜单**: 丰富的上下文菜单操作
- **剪贴板支持**: 支持复制AI回复到系统剪贴板

### 🔧 高级功能
- **窗口记忆**: 自动记住窗口位置和大小
- **登录数据管理**: 可选择性清除登录数据或全部缓存
- **开机启动**: 支持开机自动启动（隐藏模式）
- **多语言界面**: 中文界面，用户友好

## 📥 下载

### 预编译版本

从 [Releases](https://github.com/ai-chat-widget/ai-chat-widget/releases) 页面下载最新版本：

- **DEB包**: `ai-chat-widget_1.1.1_amd64.deb` (Ubuntu/Debian系列)

### 系统要求

- **操作系统**: Linux (x64)
- **依赖**: GTK3, libnotify, NSS, XSS, XTST等 (DEB包会自动处理依赖)

## 🛠 安装

### 方法一：DEB包安装 (推荐)

```bash
# 下载DEB包后安装
sudo dpkg -i ai-chat-widget_1.1.1_amd64.deb

# 如果有依赖问题，运行：
sudo apt-get install -f
```
### 卸载

```bash
# DEB包卸载
sudo apt-get remove ai-chat-widget
```

## 🎮 使用方法

### 基本操作

1. **启动应用**: 安装后从应用菜单启动，或使用命令 `ai-chat-widget`
2. **显示/隐藏**: 按 `Ctrl+Space` 切换窗口显示状态
3. **选择AI**: 点击欢迎界面的AI网站卡片，或使用菜单切换
4. **快速隐藏**: 按 `ESC` 键快速隐藏窗口

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Space` | 显示/隐藏主窗口 |
| `ESC` | 隐藏窗口 |
| `F5` | 刷新当前网站 |
| `1-6` | 快速切换到对应AI网站 |
| `Ctrl+U` | 打开自定义网址对话框 |
| `Ctrl+Q` | 退出应用 |

### 支持的AI平台

- **ChatGPT** - OpenAI的GPT聊天界面
- **Claude** - Anthropic的Claude AI助手
- **Gemini** - Google的Gemini AI
- **文心一言** - 百度的AI聊天助手
- **通义千问** - 阿里巴巴的AI助手
- **Kimi** - 月之暗面的AI助手

### 自定义网址

1. 使用 `Ctrl+U` 或右键菜单选择"自定义网址"
2. 输入任意AI聊天网站的URL
3. 应用会自动加载并保存该网址

## 🔧 开发

### 环境要求

- Node.js 18+
- npm 或 yarn
- Linux开发环境

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/ai-chat-widget/ai-chat-widget.git
cd ai-chat-widget

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产模式运行
npm start
```

### 构建

```bash
# 构建所有格式
npm run build

# 仅构建DEB包
npm run build -- --linux deb

# 仅构建AppImage
npm run build -- --linux AppImage

# 使用构建脚本
./build-deb.sh
```

### 项目结构

```
├── main.js          # 主进程文件
├── renderer.js      # 渲染进程文件
├── index.html       # 主界面HTML
├── style.css        # 样式文件
├── package.json     # 项目配置
├── assets/          # 资源文件
│   ├── tray-icon.png
│   └── tray-icon.svg
├── build/           # 构建脚本
└── dist/           # 构建输出目录
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [electron-builder](https://www.electron.build/) - 应用打包工具
- 各AI平台提供的优秀服务
- **AI助手** - 本项目的完整代码实现和文档均由AI生成

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](https://github.com/ai-chat-widget/ai-chat-widget/issues) 页面
2. 提交新的 Issue
3. 发送邮件至 ai-chat-widget@example.com

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给个星标支持！**

Made with ❤️ by AI Chat Widget Team

</div>
