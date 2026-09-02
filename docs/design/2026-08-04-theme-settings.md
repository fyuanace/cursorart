---
type: design-change
project: cursor-minimal
module: theme-settings
date: 2026-08-04
status: implemented
summary: >
  cursor极简设置入口挂在 #barPlugins；可配置隐藏 dock 工具，写入工作区文件持久化。
related:
  - design/2026-08-04-toolbar-titlebar.md
  - design/2026-09-02-table-header.md
  - design/2026-09-02-block-line-height.md
tags: [settings, dock, theme.js]
---

# 主题设置：隐藏侧栏工具

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-08-04 | 首版：#barPlugins 菜单项 + DIY 对话框；按 data-type 隐藏 dock 图标 |
| 2026-08-04 | 开关语义改为：打开=显示，关闭=隐藏（与当前可见状态一致） |
| 2026-08-04 | 已选中 dock 图标再点：document 冒泡阶段 stopPropagation，不收起侧栏；折叠仅由顶栏两按钮经 toggleModel 完成 |
| 2026-08-04 | 配置改为 `/api/file` 写入 `/data/storage/theme/starter/config.json`；启动时读文件，并迁移旧 localStorage |
| 2026-08-04 | 配置路径改为 `/data/storage/theme/cursorart/config.json`；启动时若仅有旧 `starter` 路径则迁入新路径 |
| 2026-08-05 | 设置对话框底部显示配置保存路径 |
| 2026-09-02 | 设置增加「侧栏 / 样式」页签；样式里可开关自定义文档引用 |
| 2026-09-02 | 两个页签叠在同一窗格里切换，窗口高度不随内容变 |
| 2026-09-02 | 样式页签增加「表格表头不加粗」开关与「块行间距」滑杆 |

## 背景信息

主题不是 Plugin，不能走 `this.setting` / 集市齿轮。用户仍希望有「和插件一样」的设置入口。官方插件设置出现在两处：集市已下载卡片齿轮、顶栏 `#barPlugins` 菜单；主题只能复用后者。

## 当前方案

**入口**

- 监听 `#barPlugins` click，在官方菜单建完后 `menus.menu.addItem({ id, icon: iconSettings, label: "cursor极简 设置", click })`
- 与带 `openSetting` 的插件配置项同菜单、同图标语义

**对话框**

- DIY `.b3-dialog`（取消 / 保存），不依赖 `import { Dialog, Setting } from "siyuan"`
- 列出当前 DOM 中全部 `.dock__item[data-type]`（排除 pin）；开关打开 = 显示，关闭 = 隐藏
- 底部「配置保存位置」展示工作区相对路径 `CONFIG_PATH`（可复制）

**生效与持久化**

- 文件：`/data/storage/theme/cursorart/config.json`（工作区，经 `/api/file/getFile` / `putFile`）
- 内容：`{ hiddenDockTypes: string[], customDocRefStyle: boolean, plainTableHead: boolean, blockLineHeight: number }`
- 对话框页签：**侧栏**（原 dock 图标显隐）、**样式**（链接样式、表格表头不加粗、块行间距）；`customDocRefStyle` / `plainTableHead` 缺省为 `true`，`blockLineHeight` 缺省 `1.625`（范围 1.2–2.6）
- 滑杆拖动即时改行高；表头开关即时预览；取消 / Esc / 点遮罩则还原未保存值
- 迁移顺序：新路径 → 旧路径 `/data/storage/theme/starter/config.json` → 旧版 `localStorage["starter-theme-config"]`；后两者读到后写入新路径并尽量清 localStorage
- `#starterHideDockStyle` 注入 `.dock__item[data-type="…"]{display:none!important}`
- 保存时若正在显示将被隐藏的面板，先按官方语义收起该面板
- 侧栏折叠/展开选类型时跳过已隐藏项

**卸载**

- `destroyTheme` 移除菜单监听、对话框、隐藏样式，以及 `starter-plain-table-head` / `starter-block-line-height` 与 `--starter-block-line-height`

**已选中图标再点**

- 不 hook / 不改写 `Dock.toggleModel`
- 仅在 `document` 冒泡阶段拦截 `.dock__item--active` 的 click（`stopPropagation`），使 `window` 上 `globalClick` 收不到事件，故不会 `toggleModel(type, false, true)` 收起
- 顶栏左右显隐仍直接调用 `toggleModel`，不受影响；切换到其它未选中图标仍走官方逻辑

## 其他模块引用约束

- 隐藏只动图标显示，不删 DOM、不改思源 layout 数据
- 配置落在 `/data/storage/theme/cursorart/`，不要写进 `petal` 插件目录，也不要只依赖 localStorage

## 工程师测试验收方法

1. 开启「加载主题 JS」，reload
2. 点顶栏插件图标 → 菜单末应有「cursor极简 设置」
3. 打开设置，对话框底部应显示配置路径 `/data/storage/theme/cursorart/config.json`
4. 打开设置，关闭「标签」「收集箱」等开关并保存 → 对应侧栏图标消失
5. 再打开设置打开开关并保存 → 图标恢复
6. 切换主题离开 starter → 隐藏样式与菜单挂钩应被 `destroyTheme` 清掉
7. 再点已选中的侧栏工具图标，侧栏不应收起；仅顶栏左右面板按钮可折叠

8. 保存后重启思源，隐藏配置应仍在（检查工作区 `data/storage/theme/cursorart/config.json`）
9. 若工作区仅有旧 `data/storage/theme/starter/config.json`，首次加载后应出现新路径文件且设置仍生效
10. 样式页签关闭「链接样式」并保存：文档引用恢复官方紫色、无图标/下划线；再打开应回到自定义样式
11. 样式页签关闭「表格表头不加粗」并保存：表头恢复官方加粗；再打开应与单元格同字重
12. 样式页签拖动「块行间距」应即时改变正文段落行高；取消后应回到保存值；保存后重启仍生效

## 其他说明

插件设置入口创建方法已记入 MemPalace（wing `siyuanplugin` / room `howto`）。主题若将来需要集市卡片齿轮，需伴生插件。
