#!/bin/bash
# ============================================================================
# Build EXE Script
# 构建并打包 Windows exe 文件
# ============================================================================

set -e

PROJECT_ROOT="E:/claude_itme/craft-agent"
ELECTRON_APP="$PROJECT_ROOT/apps/electron"

echo "🔨 构建 Windows EXE"
echo "===================="

# 切换到项目根目录
cd "$PROJECT_ROOT"

echo ""
echo "📦 步骤 1: 安装依赖"
echo "--------------------"
bun install

echo ""
echo "🔨 步骤 2: 构建主进程"
echo "------------------------"
bunx esbuild apps/electron/src/main/index.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --outfile=apps/electron/dist/main.cjs \
    --external:electron

echo ""
echo "🔨 步骤 3: 构建预加载和渲染器"
echo "------------------------------------"
cd "$ELECTRON_APP"
bun run build:preload
bun run build:renderer

echo ""
echo "📋 步骤 4: 复制资源"
echo "------------------------"
bun run build:copy

echo ""
echo "📦 步骤 5: 打包 EXE"
echo "------------------------"
# 创建 node_modules 符号链接（如果需要）
if [ ! -L "node_modules" ]; then
    rm -rf node_modules 2>/dev/null || true
    ln -s ../../node_modules node_modules
fi

bunx electron-builder --win --x64

echo ""
echo "✅ 构建完成！"
echo "===================="
echo "输出文件: $ELECTRON_APP/release/Craft-Agent-x64.exe"
ls -la "$ELECTRON_APP/release/"*.exe 2>/dev/null || echo "未找到 exe 文件"
