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
  - design/2026-09-03-file-tree-hide-notebook.md
  - design/2026-09-03-file-tree-recent-docs.md
  - design/2026-09-03-file-tree-favorites.md
  - design/2026-09-04-donate-heart.md
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
| 2026-09-03 | 侧栏页签增加「隐藏笔记本」，文件树可把文档提到第一级 |
| 2026-09-03 | 侧栏页签增加「最近打开」条数滑杆，文件树顶部可列出最近文档 |
| 2026-09-03 | 配置增加 `favoriteDocs`；保存其它项时合并写入，不冲掉收藏 |
| 2026-09-03 | 侧栏增加「收藏」默认显示条数；0–32，超出可在文件树点「更多」 |
| 2026-09-03 | 最近打开改为主题 `recentDocs`，打开文档即写入，保存设置时按条数裁切 |
| 2026-09-03 | 「隐藏笔记本 / 最近打开 / 收藏」从侧栏页签挪到样式页签 |
| 2026-09-03 | 样式增加「显示最近打开 / 显示收藏」开关；条数滑杆不再用 0 表示隐藏 |
| 2026-09-03 | 样式增加「隐藏 Tab 栏新建文档」「隐藏 Tab 栏页签切换」，两个按钮分开配置 |
| 2026-09-03 | 设置界面改成与 fhelper 相近的卡片分组：文档树 / Tab 栏 / 正文分块，块间距加大 |
| 2026-09-03 | 配置路径改到侧栏「关于」分组，不再钉在对话框底部 |
| 2026-09-04 | 样式「文档树」增加「默认使用 SVG 图标」：快捷开关，读写思源官方 `fileTree.useSVGDefaultIcon`，不写入主题配置 |
| 2026-09-04 | 侧栏「关于」增加「复位捐助按钮」，点一下立刻重新显示爱心 |
| 2026-09-07 | 复位捐助按钮改为清掉本机电脑名记录；换电脑名也会再显示爱心 |
| 2026-09-07 | 「关于」文案由「复位捐助按钮」改为「复位喜欢按钮」 |

## 背景信息

主题不是 Plugin，不能走 `this.setting` / 集市齿轮。用户仍希望有「和插件一样」的设置入口。官方插件设置出现在两处：集市已下载卡片齿轮、顶栏 `#barPlugins` 菜单；主题只能复用后者。

## 当前方案

**入口**

- 监听 `#barPlugins` click，在官方菜单建完后 `menus.menu.addItem({ id, icon: iconSettings, label: "cursor极简 设置", click })`
- 与带 `openSetting` 的插件配置项同菜单、同图标语义

**对话框**

- DIY `.b3-dialog`（取消 / 保存），不依赖 `import { Dialog, Setting } from "siyuan"`
- 页签样式与分组卡片对齐 fhelper：圆角底边高亮、区块圆角描边、行间细分隔；**侧栏**为「侧栏工具」与「关于」，**样式**拆成「文档树 / Tab 栏 / 正文」，块间距 24px
- 列出当前 DOM 中全部 `.dock__item[data-type]`（排除 pin）；开关打开 = 显示，关闭 = 隐藏
- 「关于」中展示配置保存路径 `CONFIG_PATH`（可复制），以及「复位喜欢按钮」（只清本机电脑名下的爱心记录，立刻重新显示，不写配置、不改云端人数；换电脑名也会再出现）

**生效与持久化**

- 文件：`/data/storage/theme/cursorart/config.json`（工作区，经 `/api/file/getFile` / `putFile`）
- 内容：`{ hiddenDockTypes: string[], customDocRefStyle: boolean, plainTableHead: boolean, blockLineHeight: number, hideNotebooks: boolean, hideTabNewDoc: boolean, hideTabSwitch: boolean, showRecentDocs: boolean, showFavoriteDocs: boolean, recentDocsMax: number, favoriteDocsMax: number, favoriteDocs: {id, title, icon}[], recentDocs: {id, title, icon}[], seededOfficialDefaults: boolean }`
- 对话框页签：**侧栏**（dock 图标显隐）、**样式**（隐藏笔记本、隐藏 Tab 栏新建文档/页签切换、最近打开/收藏的显示与条数、链接样式、表格表头不加粗、块行间距、默认使用 SVG 图标、隐藏底部状态栏）；`customDocRefStyle` / `plainTableHead` 缺省为 `true`，`blockLineHeight` 缺省 `1.625`（范围 1.2–2.6），`hideNotebooks` / `hideTabNewDoc` / `hideTabSwitch` 缺省 `false`，`showRecentDocs` / `showFavoriteDocs` 缺省 `true`，`recentDocsMax` / `favoriteDocsMax` 缺省 `8`（范围 1–32），`favoriteDocs` / `recentDocs` 缺省 `[]`（面包屑五角星维护收藏；打开文档维护最近打开）。旧配置若条数为 0 且没有显隐字段，视为关闭对应区块并把条数恢复为 8
- 「默认使用 SVG 图标」不是主题配置项：打开设置时读 `window.siyuan.config.fileTree.useSVGDefaultIcon`；保存时把完整 `fileTree` 对象 POST 到 `/api/setting/setFiletree`（只改这一字段），与思源「设置 → 文档树」同名开关写入同一处。拖动开关即时预览官方树默认图标以及收藏 / 最近打开 / 文档引用；取消则还原。当前思源没有该布尔字段时不显示此行
- 「隐藏底部状态栏」同样不是主题配置项：读写官方 `appearance.hideStatusBar`，POST 完整 `appearance` 到 `/api/setting/setAppearance`；只切整条 `#status` 的 `fn__none` 与底栏边距，不改状态栏里显示哪些消息。当前思源没有该字段时不显示此行
- 首次启用本主题（`config.json` 里还没有 `seededOfficialDefaults`）时，把官方设置改成主题默认一次：`useSVGDefaultIcon = true`、`hideStatusBar = true`，然后写下 `seededOfficialDefaults: true`。之后重启、切走再切回都不再改官方值；用户之后在主题设置或思源设置里改的，两边一起跟
- 滑杆拖动即时改行高、最近打开条数与收藏条数；显示开关即时显隐文件树区块；Tab 栏按钮开关即时显隐「+」/ 下拉；表头开关即时预览；取消 / Esc / 点遮罩则还原未保存值；保存时与现有配置合并，保留 `favoriteDocs` / `recentDocs` / `seededOfficialDefaults`
- 迁移顺序：新路径 → 旧路径 `/data/storage/theme/starter/config.json` → 旧版 `localStorage["starter-theme-config"]`；后两者读到后写入新路径并尽量清 localStorage
- `#starterHideDockStyle` 注入 `.dock__item[data-type="…"]{display:none!important}`
- 保存时若正在显示将被隐藏的面板，先按官方语义收起该面板
- 侧栏折叠/展开选类型时跳过已隐藏项

**卸载**

- `destroyTheme` 移除菜单监听、对话框、隐藏样式，以及 `starter-plain-table-head` / `starter-block-line-height` / `starter-hide-notebook` / `starter-hide-tab-new` / `starter-hide-tab-more` 与 `--starter-block-line-height`

**已选中图标再点**

- 不 hook / 不改写 `Dock.toggleModel`
- 仅在 `document` 冒泡阶段拦截 `.dock__item--active` 的 click（`stopPropagation`），使 `window` 上 `globalClick` 收不到事件，故不会 `toggleModel(type, false, true)` 收起
- 顶栏左右显隐仍直接调用 `toggleModel`，不受影响；切换到其它未选中图标仍走官方逻辑

## 其他模块引用约束

- 隐藏只动图标显示，不删 DOM、不改思源 layout 数据
- 配置落在 `/data/storage/theme/cursorart/`，不要写进 `petal` 插件目录，也不要只依赖 localStorage
- 不要在每次加载主题时覆盖官方 `useSVGDefaultIcon` / `hideStatusBar`；只允许无 `seededOfficialDefaults` 时写一次默认
- 卸载主题不要把状态栏或 SVG 默认改回去（那是思源设置，不是主题私有状态）

## 工程师测试验收方法

1. 开启「加载主题 JS」，reload
2. 点顶栏插件图标 → 菜单末应有「cursor极简 设置」；样式页签应分成文档树 / Tab 栏 / 正文三块卡片，块间距明显大于行间距
3. 打开设置，侧栏页签底部「关于」应显示配置路径 `/data/storage/theme/cursorart/config.json`；切到样式页签后该块不应再出现
4. 打开设置，关闭「标签」「收集箱」等开关并保存 → 对应侧栏图标消失
5. 再打开设置打开开关并保存 → 图标恢复
6. 切换主题离开 starter → 隐藏样式与菜单挂钩应被 `destroyTheme` 清掉
7. 再点已选中的侧栏工具图标，侧栏不应收起；仅顶栏左右面板按钮可折叠

8. 保存后重启思源，隐藏配置应仍在（检查工作区 `data/storage/theme/cursorart/config.json`）
9. 若工作区仅有旧 `data/storage/theme/starter/config.json`，首次加载后应出现新路径文件且设置仍生效
10. 样式页签关闭「链接样式」并保存：文档引用恢复官方紫色、无图标/下划线；再打开应回到自定义样式
11. 样式页签关闭「表格表头不加粗」并保存：表头恢复官方加粗；再打开应与单元格同字重
12. 样式页签拖动「块行间距」应即时改变正文段落行高；取消后应回到保存值；保存后重启仍生效
13. 样式打开「隐藏笔记本」并保存：文件树不见笔记本名、文档顶到第一级；关闭后恢复
14. 样式关闭「显示最近打开」：文件树顶部区块消失，条数滑杆变灰；再打开应恢复列表；取消后回到保存值；保存后重启仍生效
15. 面包屑收藏若干文档后保存其它设置：`favoriteDocs` 应仍在配置文件中
16. 样式关闭「显示收藏」：收藏区块消失，面包屑五角星仍可点；再打开应看到已收藏项；拖动「收藏条数」只影响默认列出条数
17. 样式分别打开「隐藏 Tab 栏新建文档」「隐藏 Tab 栏页签切换」：对应「+」或右侧下拉消失，另一个仍在；两个都开则都隐藏；取消后还原
18. 样式打开/关闭「默认使用 SVG 图标」并保存：未设图标的文件树 / 收藏 / 最近打开 / 文档引用应跟着变；思源「设置 → 文档树」里同名开关应同步；取消则两边都回到打开设置前的值；`config.json` 里不应出现该字段
19. 样式打开/关闭「隐藏底部状态栏」并保存：底部 `#status` 应显隐；思源「设置 → 外观」里同名开关应同步；不出现「显示哪些状态」的子项；取消则还原
20. 删除主题 `config.json` 后首次加载：应写入官方默认（隐藏状态栏、默认 SVG），并出现 `seededOfficialDefaults: true`；再 reload 或切走切回不应再次改官方值

## 其他说明

插件设置入口创建方法已记入 MemPalace（wing `siyuanplugin` / room `howto`）。主题若将来需要集市卡片齿轮，需伴生插件。
