---
type: design-change
project: starter
module: theme-settings
date: 2026-08-04
status: implemented
summary: >
  主题设置仿插件入口挂在 #barPlugins 菜单；可配置隐藏哪些侧栏 dock 工具，localStorage 持久化。
related:
  - design/2026-08-04-toolbar-titlebar.md
tags: [settings, dock, theme.js]
---

# 主题设置：隐藏侧栏工具

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-08-04 | 首版：#barPlugins 菜单项 + DIY 对话框；按 data-type 隐藏 dock 图标 |
| 2026-08-04 | 开关语义改为：打开=显示，关闭=隐藏（与当前可见状态一致） |

## 背景信息

主题不是 Plugin，不能走 `this.setting` / 集市齿轮。用户仍希望有「和插件一样」的设置入口。官方插件设置出现在两处：集市已下载卡片齿轮、顶栏 `#barPlugins` 菜单；主题只能复用后者。

## 当前方案

**入口**

- 监听 `#barPlugins` click，在官方菜单建完后 `menus.menu.addItem({ id, icon: iconSettings, label: "Starter 设置", click })`
- 与带 `openSetting` 的插件配置项同菜单、同图标语义

**对话框**

- DIY `.b3-dialog`（取消 / 保存），不依赖 `import { Dialog, Setting } from "siyuan"`
- 列出当前 DOM 中全部 `.dock__item[data-type]`（排除 pin）；开关打开 = 显示，关闭 = 隐藏

**生效与持久化**

- `localStorage["starter-theme-config"]` → `{ hiddenDockTypes: string[] }`
- `#starterHideDockStyle` 注入 `.dock__item[data-type="…"]{display:none!important}`
- 保存时若正在显示将被隐藏的面板，先按官方语义收起该面板
- 侧栏折叠/展开选类型时跳过已隐藏项

**卸载**

- `destroyTheme` 移除菜单监听、对话框、隐藏样式

## 其他模块引用约束

- 隐藏只动图标显示，不删 DOM、不改思源 layout 数据
- 勿把主题配置写进 petal 插件存储；保持 localStorage（或日后主题目录文件）

## 工程师测试验收方法

1. 开启「加载主题 JS」，reload
2. 点顶栏插件图标 → 菜单末应有「Starter 设置」
3. 打开设置，关闭「标签」「收集箱」等开关并保存 → 对应侧栏图标消失
4. 再打开设置打开开关并保存 → 图标恢复
5. 切换主题离开 starter → 隐藏样式与菜单挂钩应被 `destroyTheme` 清掉

## 其他说明

插件设置入口创建方法已记入 MemPalace（wing `siyuanplugin` / room `howto`）。主题若将来需要集市卡片齿轮，需伴生插件。
