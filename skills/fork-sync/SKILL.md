---
name: fork-sync
description: "用于同步 GitHub fork 项目上游更新并自动应用中文汉化。当用户请求同步上游更新、同步fork、汉化修改}或更新分支}或推送代码时使用此技能。---

# Fork 同步与汉化技能

此技能用于自动化处理 Craft Agent 项目的上游同步、汉化和推送流程。

## 项目配置

- **上游仓库**: `https://github.com/lukilabs/craft-agents-oss/`
- **Fork 仓库**: 用户自己的 GitHub fork
- **汉化分支**: `chinese-localization`
- **主分支**: `main`

## 工作流程

### 1. 同步上游更新

```bash
# 切换到 main 分支
git checkout main

# 获取上游更新
git fetch upstream

# 重置到上游最新版本
git reset --hard upstream/main
```

### 2. 应用汉化修改

```bash
# 切换到汉化分支
git checkout chinese-localization

# Rebase 到最新的 main
git rebase main
```

### 3. 解决冲突

如果 rebase 过程中出现冲突:

1. 查看冲突文件: `git status`
2. 手动编辑冲突文件，3. 继续完成: `git rebase --continue`

### 4. 推送更新

```bash
# 强制推送（因为 rebase 会改写历史）
git push origin chinese-localization --force
```

## 需要汉化的文件列表

以下文件包含硬编码的英文文本，需要在新版本中重新应用汉化:

| 文件 | 汉化内容 |
|------|----------|
| `apps/electron/src/renderer/components/app-shell/SessionMenuParts.tsx` | 分享菜单、状态菜单、标签菜单 |
| `apps/electron/src/renderer/components/app-shell/SessionMenu.tsx` | 会话完整菜单 |
| `apps/electron/src/renderer/components/app-shell/ActiveOptionBadges.tsx` | 权限模式显示名称 |
| `apps/electron/src/renderer/components/ui/slash-command-menu.tsx` | 斜杠命令菜单 |
| `apps/electron/src/renderer/components/ui/session-status-menu.tsx` | 状态选择菜单 |

## 汉化翻译对照表

### 权限模式
| 英文 | 中文 |
|------|------|
| Explore | 探索 |
| Ask to Edit | 询问后编辑 |
| Execute | 执行 |
| Ultrathink | 深度思考 |

### 状态
| 英文 | 中文 |
|------|------|
| Backlog | 待办 |
| Todo | 待处理 |
| Needs Review | 需审核 |
| Done | 已完成 |
| Cancelled | 已取消 |
| In Progress | 进行中 |

### 会话菜单
| 英文 | 中文 |
|------|------|
| Share | 分享 |
| Shared | 已分享 |
| Status | 状态 |
| Labels | 标签 |
| Flag | 标记 |
| Unflag | 取消标记 |
| Archive | 归档 |
| Unarchive | 取消归档 |
| Mark as Unread | 标记为未读 |
| Rename | 重命名 |
| Regenerate Title | 重新生成标题 |
| Open in New Window | 在新窗口中打开 |
| Copy Path | 复制路径 |
| Delete | 删除 |

## 构建命令

完成汉化后，运行以下命令构建并打包:

```bash
# 1. 构建主进程
cd E:/claude_itme/craft-agent
bunx esbuild apps/electron/src/main/index.ts --bundle --platform=node --format=cjs --outfile=apps/electron/dist/main.cjs --external:electron

# 2. 构建预加载和渲染器
cd apps/electron
bun run build:preload
bun run build:renderer
bun run build:copy

# 3. 打包 exe
bunx electron-builder --win --x64
```

## 输出位置

打包完成后
exe 文件位于:
`apps/electron/release/Craft-Agent-x64.exe`
