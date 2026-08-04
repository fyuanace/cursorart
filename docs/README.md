# starter 主题

叠在官方 **daylight**（`themeDefaultStyle`）之上的布局主题：配色/字体/组件变量复用 daylight，本主题只改四分区布局。

## 分区地图

| 区 | 界面 | DOM 锚点 | 文档 |
|----|------|----------|------|
| ① 顶栏 | 全宽标题区（含文档 Tab） | `#toolbar` | [design/2026-08-04-toolbar-titlebar.md](design/2026-08-04-toolbar-titlebar.md) |
| ② 左侧栏 | 顶：横向左 dock；下：文档树 | `#dockLeft` + `.layout__dockl` | 同上 |
| ③ 中间区 | 编辑正文 | `.layout__center` / `.layout-tab-container` | 同上 |
| ④ 右侧栏 | 顶：横向右 dock；下：大纲等 | `#dockRight` + `.layout__dockr` | 同上 |

```
┌──────────────── ① 顶栏 ────────────────┐
├──────────┬───────────────┬─────────────┤
│ ② 左侧栏 │  ③ 中间编辑区  │  ④ 右侧栏   │
└──────────┴───────────────┴─────────────┘
```

## 整体架构

- 默认层：`appearance/themes/daylight/theme.css`（思源自动加载）
- 覆盖层：`theme.css` + `theme.js`（侧栏顶横条 dock；顶栏左右侧栏显隐；主题设置隐藏 dock 工具）
- 分区线颜色：`var(--b3-border-color)`（daylight）
- 面板底色：`var(--b3-theme-background)`（daylight）
- 自有令牌：仅 `--starter-topbar-height`
- 设置入口：顶栏 `#barPlugins` 菜单 →「Starter 设置」（见 [design/2026-08-04-theme-settings.md](design/2026-08-04-theme-settings.md)）
