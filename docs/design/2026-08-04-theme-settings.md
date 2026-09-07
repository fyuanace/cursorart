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
| 2026-09-07 | 窗口固定 80vh；非当前页 `display: none`，各页自己滚动，短页不再被最长页撑出空白滚动条 |
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
| 2026-09-07 | 并入原 fhelper：六页签（侧栏/样式/编辑/斜杠菜单/配置同步/关于）；去掉保存按钮，每项即时生效并写入 |
| 2026-09-07 | 设置入口改为官方插件项「cursor极简工具」（`openSetting`）；去掉菜单里重复的「cursor极简 设置」 |
| 2026-09-07 | 设置对话框样式改由插件注入，换其它主题时面板仍按 fhelper 卡片页签显示；页签改为侧栏 / 样式 / 关于 |
| 2026-09-07 | 侧栏页增加「自适应标题栏高度」「侧边工具放入内容视图」，且仅当前主题为 cursor极简 时可改；样式与关于任意主题可用 |
| 2026-09-07 | 「关于」独立页签：显示插件/主题版本、复位喜欢按钮、打开配置路径 |
| 2026-09-07 | 自适应标题栏关闭时才写 `starter-default-topbar`；默认顶栏布局由主题 CSS 直接生效 |
| 2026-09-07 | 安装默认配置对齐常用组合；关于页增加「恢复默认配置」（保留收藏与最近打开） |
| 2026-09-07 | 默认开启「链接样式」（`customDocRefStyle` true） |
| 2026-09-07 | 关于页「支持作者」「复位喜欢」单独成「支持」分组 |
| 2026-09-07 | 设置对话框固定全屏遮罩与顶层 z-index，换主题也不被顶栏挡住 |

## 背景信息

主题设置已并入配套插件 **cursorart-tools**。官方插件入口出现在两处：集市已下载卡片齿轮、顶栏 `#barPlugins` 菜单中的「cursor极简工具」（由 `Plugin.openSetting` 自动生成）。不再另外插入「cursor极简 设置」，以免两条齿轮菜单。

## 当前方案

**入口**

- `CursorArtTools.openSetting()` 打开同一 DIY 对话框；思源在插件菜单里自动列出「cursor极简工具」
- 不再监听 `#barPlugins` 去 `addItem` 第二条「cursor极简 设置」

**对话框**

- DIY `.b3-dialog` 挂到 `document.body`，插件 CSS 固定 `position: fixed; inset: 0; z-index: 100000`，遮罩与窗体分层，换其它主题时不被顶栏/侧栏盖住
- 页签/分组卡片样式由插件注入（`#cursorart-tools-setting-css`），对齐 fhelper：圆角底边高亮、区块圆角描边、行间细分隔；不依赖 cursor极简 `theme.css`，换其它主题时面板仍正常
- 页签：**侧栏**（布局开关 + dock 图标显隐，仅 cursor极简）、**样式**（文档树 / 默认图标 / Tab 栏 / 正文）、**编辑**（子文档导航植入 / 图片 / 输入者）、**斜杠菜单**、**配置同步**（含缓存路径）、**关于**（版本；支持：支持作者、复位喜欢；维护：恢复默认、配置文件路径）
- 窗口高度固定 80vh，切页签不改变外框。非当前页签 `display: none`；内容区单独滚动，短页没有滚动条、长页（斜杠菜单）在窗内滚。切页签时内容区滚回顶部
- **无保存按钮**；每个开关/滑杆立刻改界面并写入 `/data/storage/theme/cursorart/config.json`（滑杆写盘约 200ms 防抖）。Esc / 点遮罩只关窗、不回滚
- **侧栏**页仅当当前亮/暗主题文件夹为 `cursorart` 时可操作；否则提示并禁用。其余页签任意主题可用

**生效与持久化**

- 文件：`/data/storage/theme/cursorart/config.json`（工作区，经 `/api/file/getFile` / `putFile`）
- 内容：布局字段 + 编辑类 `disabled` / `imageScale` / `panguSpacing` / `childDocWidget` / `configSync` / `editorFeaturesMigrated`（见插件 docs）
- 对话框页签：**侧栏**（`adaptiveTopbarHeight` / `dockInContent` 缺省 `true`；默认隐藏 inbox / bookmark / agentChat；dock 图标显隐仅 cursor极简生效）、**样式**、**关于**（含恢复默认配置）。缺省：`customDocRefStyle` `true`，`plainTableHead` `true`，`blockLineHeight` `1.65`（范围 1.2–2.6），`hideNotebooks` `false`，`hideTabNewDoc` / `hideTabSwitch` `true`，`showRecentDocs` `false`，`showFavoriteDocs` `true`，`recentDocsMax` / `favoriteDocsMax` `8`（范围 1–32），`favoriteDocs` / `recentDocs` `[]`。编辑类缺省：`imageScale` 缩放与居中开启，`panguSpacing` 开启，`childDocWidget` 开启，斜杠 `disabled` 为空。无配置文件时按此写入。关于页「恢复默认配置」写回上述值并重开对话框，**不**清空收藏/最近打开名单；同时把官方 SVG 默认图标与隐藏状态栏设回开启
- 「默认使用 SVG 图标」不是主题配置项：读写官方 `fileTree.useSVGDefaultIcon`；开关立刻 POST `/api/setting/setFiletree`。当前思源没有该布尔字段时不显示此行
- 「隐藏底部状态栏」同样立刻写入官方 `appearance.hideStatusBar`
- 滑杆与开关都即时改界面并写盘；Esc / 点遮罩只关窗不回滚
- 若正在显示将被隐藏的 dock 面板，先按官方语义收起该面板
- 首次启用本主题（`config.json` 里还没有 `seededOfficialDefaults`）时，把官方设置改成主题默认一次：`useSVGDefaultIcon = true`、`hideStatusBar = true`，然后写下 `seededOfficialDefaults: true`。之后重启、切走再切回都不再改官方值；用户之后在主题设置或思源设置里改的，两边一起跟
- 滑杆拖动即时改行高、最近打开条数与收藏条数并防抖写盘；显示开关即时显隐文件树区块；Tab 栏按钮开关即时显隐「+」/ 下拉；表头开关即时预览并写盘
- 迁移顺序：新路径 → 旧路径 `/data/storage/theme/starter/config.json` → 旧版 `localStorage["starter-theme-config"]`；后两者读到后写入新路径并尽量清 localStorage
- `#starterHideDockStyle` 注入 `.dock__item[data-type="…"]{display:none!important}`
- 切换 dock 隐藏时若正在显示将被隐藏的面板，先按官方语义收起该面板
- 侧栏折叠/展开选类型时跳过已隐藏项

**卸载**

- `destroyTheme` 移除对话框、隐藏样式、设置/功能注入样式，以及 `starter-adaptive-topbar` / `starter-default-topbar` / `starter-plain-table-head` / `starter-block-line-height` / `starter-hide-notebook` / `starter-hide-tab-new` / `starter-hide-tab-more` 与 `--starter-block-line-height`

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
2. 点顶栏插件图标 → 菜单应有且仅有一条「cursor极简工具」（齿轮）；不应再出现「cursor极简 设置」。打开后页签为侧栏 / 样式 / 编辑 / 斜杠菜单 / 配置同步 / 关于；样式页签应分成文档树 / Tab 栏 / 正文三块卡片，块间距明显大于行间距
2b. 切任意页签时外框高度不变（约 80vh）；侧栏等短页无滚动条（底部可留白）；斜杠菜单等长页只在内容区滚动；切页签后滚动位置回到顶部
3. 换到其它主题后打开设置：页签与卡片仍应正常排版（不依赖 cursor极简 CSS）；对话框应盖住顶栏与侧栏，点遮罩可关闭；侧栏页应提示并禁用；样式与关于仍可操作
3b. 关于页签应显示版本、「支持」分组（支持作者、复位喜欢）、「维护」分组（恢复默认、配置路径及「打开」）；侧栏页不应再出现这些项
3c. 删掉 `config.json` 后重载：应写入默认（隐藏 inbox/bookmark/agentChat、开链接样式、隐藏 Tab +/下拉、关最近打开、开收藏、行高 1.65、图片缩放/居中与输入者开启）。关于页点「恢复默认」并确认：上述开关回到默认，收藏名单仍在；对话框重开后开关与默认一致
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
