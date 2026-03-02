import type { ActionDefinition } from './types'

export const actions = {
  // ═══════════════════════════════════════════
  // General
  // ═══════════════════════════════════════════
  'app.newChat': {
    id: 'app.newChat',
    label: '新建会话',
    description: '创建新聊天会话',
    defaultHotkey: 'mod+n',
    category: '通用',
  },
  'app.settings': {
    id: 'app.settings',
    label: '设置',
    description: '打开应用程序设置',
    defaultHotkey: 'mod+,',
    category: '通用',
  },
  'app.toggleTheme': {
    id: 'app.toggleTheme',
    label: '切换主题',
    description: '在浅色和深色模式之间切换',
    defaultHotkey: 'mod+shift+a',
    category: '通用',
  },
  'app.search': {
    id: 'app.search',
    label: '搜索',
    description: '打开搜索面板',
    defaultHotkey: 'mod+f',
    category: '通用',
  },
  'app.keyboardShortcuts': {
    id: 'app.keyboardShortcuts',
    label: '快捷键',
    description: '显示快捷键参考',
    defaultHotkey: 'mod+/',
    category: '通用',
  },
  'app.newWindow': {
    id: 'app.newWindow',
    label: '新建窗口',
    description: '打开新窗口',
    defaultHotkey: 'mod+shift+n',
    category: '通用',
  },
  'app.quit': {
    id: 'app.quit',
    label: '退出',
    description: '退出应用程序',
    defaultHotkey: 'mod+q',
    category: '通用',
  },

  // ═══════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════
  'nav.focusSidebar': {
    id: 'nav.focusSidebar',
    label: '聚焦侧边栏',
    defaultHotkey: 'mod+1',
    category: '导航',
  },
  'nav.focusSessionList': {
    id: 'nav.focusSessionList',
    label: '聚焦会话列表',
    defaultHotkey: 'mod+2',
    category: '导航',
  },
  'nav.focusChat': {
    id: 'nav.focusChat',
    label: '聚焦聊天',
    defaultHotkey: 'mod+3',
    category: '导航',
  },
  'nav.nextZone': {
    id: 'nav.nextZone',
    label: '聚焦下一个区域',
    defaultHotkey: 'tab',
    category: '导航',
  },
  'nav.goBack': {
    id: 'nav.goBack',
    label: '后退',
    description: '导航到上一个会话',
    defaultHotkey: 'mod+[',
    category: '导航',
  },
  'nav.goForward': {
    id: 'nav.goForward',
    label: '前进',
    description: '导航到下一个会话',
    defaultHotkey: 'mod+]',
    category: '导航',
  },
  'nav.goBackAlt': {
    id: 'nav.goBackAlt',
    label: '后退',
    description: '导航到上一个会话（方向键）',
    defaultHotkey: 'mod+left',
    category: '导航',
  },
  'nav.goForwardAlt': {
    id: 'nav.goForwardAlt',
    label: '前进',
    description: '导航到下一个会话（方向键）',
    defaultHotkey: 'mod+right',
    category: '导航',
  },

  // ═══════════════════════════════════════════
  // View
  // ═══════════════════════════════════════════
  'view.toggleSidebar': {
    id: 'view.toggleSidebar',
    label: '切换侧边栏',
    defaultHotkey: 'mod+b',
    category: '视图',
  },
  'view.toggleFocusMode': {
    id: 'view.toggleFocusMode',
    label: '切换专注模式',
    description: '隐藏两侧边栏以进行无干扰工作',
    defaultHotkey: 'mod+.',
    category: '视图',
  },

  // ═══════════════════════════════════════════
  // Session List (scoped)
  // ═══════════════════════════════════════════
  'sessionList.selectAll': {
    id: 'sessionList.selectAll',
    label: '全选会话',
    defaultHotkey: 'mod+a',
    category: '会话列表',
    scope: 'session-list',
  },
  'sessionList.clearSelection': {
    id: 'sessionList.clearSelection',
    label: '清除选择',
    defaultHotkey: 'escape',
    category: '会话列表',
    scope: 'session-list',
    inputSafe: true,  // Works even when typing in search/chat input
  },

  // ═══════════════════════════════════════════
  // Chat
  // ═══════════════════════════════════════════
  'chat.stopProcessing': {
    id: 'chat.stopProcessing',
    label: '停止处理',
    description: '取消当前代理任务（双击）',
    defaultHotkey: 'escape',
    category: '聊天',
    scope: 'chat',
    inputSafe: true,  // Must work while typing in chat input
  },
  'chat.cyclePermissionMode': {
    id: 'chat.cyclePermissionMode',
    label: '切换权限模式',
    description: '在探索、询问和执行模式之间切换',
    defaultHotkey: 'shift+tab',
    category: '聊天',
  },
  'chat.nextSearchMatch': {
    id: 'chat.nextSearchMatch',
    label: '下一个搜索结果',
    defaultHotkey: 'mod+g',
    category: '聊天',
    inputSafe: true,  // Must work while typing in search input
  },
  'chat.prevSearchMatch': {
    id: 'chat.prevSearchMatch',
    label: '上一个搜索结果',
    defaultHotkey: 'mod+shift+g',
    category: '聊天',
    inputSafe: true,  // Must work while typing in search input
  },

} as const satisfies Record<string, ActionDefinition>

// Type-safe action IDs
export type ActionId = keyof typeof actions

// Get all actions as array (for shortcuts page)
export const actionList = Object.values(actions)

// Get actions by category (for organized display)
export const actionsByCategory = actionList.reduce((acc, action) => {
  if (!acc[action.category]) acc[action.category] = []
  acc[action.category].push(action)
  return acc
}, {} as Record<string, ActionDefinition[]>)
