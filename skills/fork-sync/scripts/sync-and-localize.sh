#!/bin/bash
# ============================================================================
# Fork Sync and Localization Script
# 用于同步上游更新并应用汉化修改
# ============================================================================

set -e

# 配置
UPSTREAM_REPO="https://github.com/lukilabs/craft-agents-oss/"
MAIN_BRANCH="main"
LOCALIZE_BRANCH="chinese-localization"
PROJECT_ROOT="E:/claude_itme/craft-agent"

echo "🚀 Fork 同步与汉化脚本"
echo "================================"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 检查是否有未提交的修改
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未提交的修改，请先提交或暂存"
    git status --short
    exit 1
fi

# 确保上游仓库已配置
if ! git remote | grep -q "^upstream$"; then
    echo "➕ 添加上游仓库..."
    git remote add upstream "$UPSTREAM_REPO"
fi

echo ""
echo "📥 步骤 1: 同步上游更新"
echo "----------------------------"

# 切换到 main 分支
git checkout "$MAIN_BRANCH"

# 获取上游更新
echo "🔄 获取上游更新..."
git fetch upstream

# 重置到上游最新版本
echo "⏩ 重置到上游最新版本..."
git reset --hard "upstream/$MAIN_BRANCH"

echo ""
echo "📥 步骤 2: 应用汉化修改"
echo "------------------------------"

# 切换到汉化分支
git checkout "$LOCALIZE_BRANCH"

# Rebase 到最新的 main
echo "🔀 Rebase 到最新的 main..."
if git rebase "$MAIN_BRANCH"; then
    echo "✅ Rebase 成功，无冲突"
else
    echo "⚠️  检测到冲突，需要手动解决"
    echo ""
    echo "冲突文件列表:"
    git diff --name-only --diff-filter=U
    echo ""
    echo "请手动解决冲突后运行:"
    echo "  git rebase --continue"
    echo "  git push origin $LOCALIZE_BRANCH --force"
    exit 1
fi

echo ""
echo "📤 步骤 3: 推送到远程"
echo "------------------------------"

# 强制推送（因为 rebase 会改写历史）
echo "🚀 推送到远程仓库..."
git push origin "$LOCALIZE_BRANCH" --force

echo ""
echo "✅ 同步完成！"
echo "================================"
echo "汉化分支已更新并推送到 GitHub"
echo "分支: $LOCALIZE_BRANCH"
