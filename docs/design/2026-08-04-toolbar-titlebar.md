---
type: design-change
project: starter
module: layout-regions
date: 2026-08-04
status: implemented
summary: >
  叠在 daylight 上的四分区布局：配色复用官方亮色变量；仅覆盖间隙、直角面板与顶栏/分栏线。
related: []
tags: [layout, toolbar, regions, daylight]
---

# 四分区布局与顶栏分隔线

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-08-04 | 曾把线画在 `#toolbar` border 或 `layout-tab-container` 顶边，隐藏顶栏时被激活 Tab 盖住或无法形成全宽顶栏分割 |
| 2026-08-04 | 配色改为完全复用 daylight：去掉自有主色/硬编码白；分区线用 `--b3-border-color`，底色用 `--b3-theme-background` |

## 背景信息

思源 DOM 并非 Cursor 那种现成四宫格容器，而是 `#toolbar` + `#dockLeft/Right` + `#layouts` 拼装。隐藏顶栏时 `#toolbar` 绝对定位，文档 Tab 仍在中栏 DOM 里，但视觉上属于顶栏。若把线画在 Tab 条或正文容器上，会出现「被激活 Tab 盖住」或「不是全宽顶栏分割」。

## 当前方案

四分区与选择器：

| 区 | 选择器 | 绘制要点 |
|----|--------|----------|
| ① | `#toolbar` | 高度 `--starter-topbar-height`（38px）；`::after` 画全宽 1px 底线，`z-index: 20` |
| ② | `#dockLeft`、`.layout__dockl` | `margin-top` / 高度与 ① 对齐 |
| ③ | 中栏 `.layout-tab-container` 等 | 不再画顶边线，避免与 ① 底线双线；Tab 条 `border-bottom` 透明 |
| ④ | `#dockRight`、`.layout__dockr` | 同 ② |

竖向：`.layout__resize--lr::after` 等，颜色 `var(--b3-border-color)`（daylight）。

取消圆角卡片（贴近直角分区，配色仍跟 daylight）：

- `--b3-layout-space` / `--b3-layout-space-margin` → `0`
- `--b3-body-background` → `var(--b3-theme-background)`（daylight 的白）
- `--b3-body-background-hl-opacity` → `0`，`body { background-image: none }`
- 仅对 `.layout__center`、`.layout__dockl/r/b` 设 `border-radius: 0`（不改 daylight 全局 `--b3-border-radius-*`，以免对话框等组件失圆角）

显示顶栏时：① 仅为 `#toolbar`（28px），底线同样 `var(--b3-border-color)`；Tab 归 ③。

**原则**：本主题不定义独立色板；主色、边框、表面色全部来自下层 daylight。

## 其他模块引用约束

- 后续改顶栏高度只动 `--starter-topbar-height`，并保持 dock 的 margin/height 使用同一变量
- 禁止再给 `.layout-tab-bar` 画期望「不被 Tab 覆盖」的 `border-bottom` 作为 ① 区底线
- 分区线颜色用 `var(--b3-border-color)`，勿另造色板变量
- 需要改配色时改 daylight 依赖或在本文件覆盖对应 `--b3-*` 变量，不要写死 hex（除确有必要的布局常量）

## 工程师测试验收方法

1. 主题选「入门主题模板」，保持隐藏顶栏
2. Disable cache 后 `location.reload()`
3. 顶栏下方应有一条贯穿左中右的 1px 横线；激活文档 Tab 不能盖住该线
4. 左栏 / 中栏 / 右栏之间竖线清晰；左栏、右栏顶边与顶栏底线对齐
5. 关闭「隐藏顶栏」后，横线仍在 `#toolbar` 底边，高度约 28px

## 其他说明

无
