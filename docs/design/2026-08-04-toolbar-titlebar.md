---
type: design-change
project: cursor-minimal
module: layout-regions
date: 2026-08-04
status: implemented
summary: >
  cursor极简：叠在 daylight/midnight 上的四分区布局；配色复用官方变量；仅覆盖间隙、直角面板与顶栏/分栏线。
related: []
tags: [layout, toolbar, regions, daylight]
---

# 四分区布局与顶栏分隔线

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-08-04 | 曾把线画在 `#toolbar` border 或 `layout-tab-container` 顶边，隐藏顶栏时被激活 Tab 盖住或无法形成全宽顶栏分割 |
| 2026-08-04 | 侧栏开关：折叠点当前激活 dock 项，展开还原隐藏前选中项；顶栏两按钮固定默认样式 |
| 2026-08-04 | 左按钮移到思源标题后，右按钮移到窗口最小化左侧 |
| 2026-08-04 | 显示名改为 cursor极简；`modes` 增加 dark（暗色叠 midnight） |
| 2026-08-04 | 隐藏顶栏时 `.layout-tab-bar` 高度收到 `--starter-topbar-height`，消除横线下多出的 Tab 行底边 |
| 2026-08-04 | 未聚焦 Tab 悬浮背景改用 `var(--b3-list-hover)`，与文件树 item 悬浮一致 |
| 2026-08-05 | 排除 `.item--readonly`：+ / 中间空白 / 下拉整条不再铺悬浮底 |
| 2026-08-05 | Tab 行高度恢复官方约 42px，不再压到 `--starter-topbar-height` |
| 2026-08-05 | `--starter-topbar-height` 改为 42px，`#toolbar` / 横线 / 侧栏顶边与官方 Tab 行对齐 |
| 2026-09-01 | 亮色右侧栏（`.layout__dockr`）底色改为与编辑区相同的 `#ffffff`；左侧栏与顶栏仍为 `#f8f8f8` |
| 2026-09-01 | 暗色右侧栏与编辑区同为 midnight 纸色 `#1e1e1e`；左侧栏与顶栏仍为 `#191a1b` |
| 2026-09-01 | 中栏文档 Tab 改为 VS Code 式：直角贴条、激活纸色、未激活 chrome、竖线分隔、取消斜体与上下留白 |
| 2026-09-01 | 激活 Tab 盖住底部分割线，与下方面包屑/编辑区连成一块；未激活与空白处仍保留 1px 横线 |
| 2026-09-01 | 隐藏顶栏时整条标题栏视觉高度 50px：Tab / 工具按钮 / 窗口控件同一行；CSS 高度按思源界面缩放反算，量到的仍是 50 |
| 2026-09-01 | 截图 70px 是 Tab 50 + 路径条 22；改为 Tab 行 30px + 路径条 20px，合计 50px；取消按 zoom 改写行高 |
| 2026-09-01 | 纠正：70 与 45 都不含路径条。45/30=1.5 为系统 150% DPI；标题栏按截图物理像素，CSS=目标/devicePixelRatio |
| 2026-09-01 | 标题栏截图目标改为 55 物理像素 |
| 2026-09-01 | Tab 条 `+` / 下拉垂直居中，且中间 `fn__flex-1` 空白重新拉开并作为窗口拖动区 |
| 2026-09-03 | 设置可分别隐藏 Tab 条「+」与页签下拉，空白拖动区仍在 |

## 背景信息

思源 DOM 并非 Cursor 那种现成四宫格容器，而是 `#toolbar` + `#dockLeft/Right` + `#layouts` 拼装。隐藏顶栏时 `#toolbar` 绝对定位，文档 Tab 仍在中栏 DOM 里，但视觉上属于顶栏。若把线画在 Tab 条或正文容器上，会出现「被激活 Tab 盖住」或「不是全宽顶栏分割」。

## 当前方案

四分区与选择器：

| 区 | 选择器 | 绘制要点 |
|----|--------|----------|
| ① | `#toolbar` | 高度 `--starter-topbar-height`（截图 55 物理像素，CSS=`55/dpr`）；`body::after` 画全宽 1px 底线；勿抬 `z-index`（否则挡 Tab 点击）。同一行：中间文档 Tab 铺满行高；左右普通工具保持官方小按钮并垂直居中；窗口最小/最大/关闭铺满行高并用 flex 居中图标 |
| ② | `#dockLeft`、`.layout__dockl` | `margin-top` / 高度与 ① 对齐 |
| ③ | 中栏 `.layout-tab-bar` + `.layout-tab-container` | Tab 行高与 ① 相同（截图 55 物理像素）；直角贴条；激活为编辑区纸色，未激活为 chrome；Tab 间 1px 竖线；取消斜体；只读条（+ / 空白）不铺底；底线画在 Tab 条背景上，激活项纸色盖住该 1px |
| ④ | `#dockRight`、`.layout__dockr` | 同 ②；底色与编辑区一致（亮 `#ffffff` / 暗 `#1e1e1e`） |

竖向：`.layout__resize--lr::after` 等，颜色 `var(--b3-border-color)`（daylight）。

取消圆角卡片（贴近直角分区，配色仍跟 daylight）：

- `--b3-layout-space` / `--b3-layout-space-margin` → `0`
- `--b3-body-background` → `var(--b3-theme-background)`（daylight 的白）
- `--b3-body-background-hl-opacity` → `0`，`body { background-image: none }`
- 仅对 `.layout__center`、`.layout__dockl/r/b` 设 `border-radius: 0`（不改 daylight 全局 `--b3-border-radius-*`，以免对话框等组件失圆角）

显示顶栏时：① 仅为 `#toolbar`（28px），底线同样 `var(--b3-border-color)`；Tab 仍用 `--starter-topbar-height`。

**标题栏高度**：

- 目标：只量 Tab/工具这一行，截图为 **55 物理像素**（不含路径条）
- `theme.js`：`--starter-topbar-height = 55 / devicePixelRatio`。150% DPI 时 CSS ≈ 36.67px，截图为 55
- 路径条跟官方面包屑行高，不锁 22px，不计入标题栏 55
- 同一行分工：Tab 铺满该行；普通 `.toolbar__item` 保持官方高度并垂直居中；`.toolbar__item--win/--close` 铺满行高
- Tab 只读条上的「+」与页签下拉可在设置里分别隐藏（`hideTabNewDoc` / `hideTabSwitch`），中间空白仍作窗口拖动

**顶栏侧栏开关（theme.js）**：

- 左：`#starterToggleLeft`，插在 `#barWorkspace`（思源标题）之后
- 右：`#starterToggleRight`，插在 `#windowControls`（最小化等）之前
- 控件：`div.toolbar__item`，始终默认样式（不切换 `--active`）
- 交互：`pointerdown`；语义等同再点一次 dock 图标：`toggleModel(type, false, true)`
- 折叠：对「当前选中」项执行（如标签 → 再点标签收起）
- 展开：对「上一次选中」项执行（记住隐藏前的面板；用户点过 dock 图标也会更新记忆）
- 仅当尚无记忆时才回落左 `file` / 右 `outline`

**左/右 dock 横条（theme.js）**：

- 左：`#dockLeft` → `.layout__dockl` 首子节点
- 右：`#dockRight` → `.layout__dockr` 首子节点
- 样式：侧栏纵向 flex；dock 横向条 + `border-bottom`
- 卸载：`window.destroyTheme` 两侧与顶栏按钮一并还原
- 注意：关闭对应侧栏时，该侧横条会一并隐藏

**原则**：本主题不定义独立色板；主色、边框、表面色全部来自下层 daylight。

## 其他模块引用约束

- 后续改标题栏截图高度只动 `theme.js` 的 `TOPBAR_SCREEN_PX`；dock 的 margin/height 继续用 `--starter-topbar-height`；勿再写死官方 42px
- 全宽顶栏线仍用 `body::after`（左/右 dock 顶边对齐）；中栏 Tab 条 `z-index` 高于该线，底部分割改由 Tab 条背景 1px 线承担，激活项铺纸色盖住，勿再让全宽线压在激活 Tab 上
- 隐藏顶栏时 `#toolbar` 保持 `z-index: auto` + 主体 `pointer-events: none`（子项再开），避免挡 Tab 点击
- 分区线颜色用 `var(--b3-border-color)`，勿另造色板变量
- 需要改配色时改 daylight 依赖或在本文件覆盖对应 `--b3-*` 变量，不要写死 hex（除确有必要的布局常量）

## 工程师测试验收方法

1. 主题选「cursor极简」，保持隐藏顶栏；外观中开启「加载主题 JS」；亮色/暗色主题均选本主题
2. Disable cache 后 `location.reload()`（或确认主题版本已升到带 `?v=` 缓存戳的新版本）
3. 顶栏下方应有一条贯穿左中右的 1px 横线；激活文档 Tab 底下无分割线，与面包屑/编辑区同色相连；未激活 Tab 与空白处仍有横线
3a. 只量 Tab 行（不含路径条）：系统 100% DPI 截图 55px，150% DPI 截图仍为 55px（不是 55×1.5）
3b. 中间 Tab 铺满该行高度；左右插件/工作区等小按钮垂直居中且明显矮于 Tab；最小化/最大化/关闭铺满行高且图标垂直居中
4. 文档 Tab 为 VS Code 式直角条：激活与编辑区同色、未激活与顶栏同灰、无斜体；仍可点击切换、关闭；只读条中间空白无整条悬浮底
5. 左栏 / 中栏 / 右栏之间竖线清晰；左栏、右栏顶边与顶栏底线对齐
5a. 右侧大纲等面板底色应与中间编辑区一致：亮色均为 `#ffffff`，暗色均为 `#1e1e1e`；左侧文档树仍为 chrome（亮 `#f8f8f8` / 暗 `#191a1b`）
6. 点顶栏左右面板图标：折叠收起当前面板；再点应恢复隐藏前选中的那一项（如标签不会变成文档树）；按钮本身无按下高亮
7. 关闭「隐藏顶栏」后，横线仍在 `#toolbar` 底边，高度约 28px

## 其他说明

无
