#!/bin/bash

# AI Chat Widget DEB包构建脚本

echo "🚀 开始构建 AI Chat Widget DEB包..."

# 尝试多种方式找到Node.js
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH"
export PATH="$HOME/.config/nvm/versions/node/$(ls $HOME/.config/nvm/versions/node/ 2>/dev/null | tail -1)/bin:$PATH"
export PATH="/usr/local/bin:/opt/node/bin:$PATH"

# 检查依赖
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到npm，尝试查找Node.js..."

    # 尝试常见的Node.js安装路径
    NODE_PATHS=(
        "$HOME/.nvm/versions/node/*/bin"
        "$HOME/.config/nvm/versions/node/*/bin"
        "/usr/local/bin"
        "/opt/node/bin"
        "/snap/bin"
    )

    for path in "${NODE_PATHS[@]}"; do
        if [ -f "$path/node" ] || [ -f "$path/npm" ]; then
            export PATH="$path:$PATH"
            echo "✅ 找到Node.js在: $path"
            break
        fi
    done

    if ! command -v npm &> /dev/null; then
        echo "❌ 仍未找到npm，请确保Node.js已正确安装"
        echo "当前PATH: $PATH"
        echo "请手动设置Node.js路径或使用以下命令安装："
        echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
        echo "sudo apt-get install -y nodejs"
        exit 1
    fi
fi

echo "✅ 找到npm: $(which npm)"
echo "✅ Node.js版本: $(node --version)"

# 检查electron-builder
if ! npm list electron-builder &> /dev/null; then
    echo "📦 安装electron-builder..."
    npm install electron-builder --save-dev
fi

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf dist/

# 构建DEB包
echo "🔨 构建DEB包..."
npm run build -- --linux deb

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEB包构建成功！"
    echo ""
    echo "📁 构建文件位置:"
    ls -la dist/*.deb 2>/dev/null || echo "在 dist/ 目录中查找 .deb 文件"
    echo ""
    echo "📦 安装方法:"
    echo "sudo dpkg -i dist/*.deb"
    echo "sudo apt-get install -f  # 如果有依赖问题"
    echo ""
    echo "🗑️ 卸载方法:"
    echo "sudo apt-get remove ai-chat-widget"
    echo ""
else
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi
