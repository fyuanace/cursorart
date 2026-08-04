# cursor极简

类 Cursor 的极简四分区布局：配色复用官方 **daylight**（亮）/ **midnight**（暗），本主题只改布局与交互。

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

- 默认层：亮色 `daylight/theme.css`；暗色 `midnight/theme.css`（思源按模式自动加载）
- 覆盖层：`theme.css` + `theme.js`（侧栏顶横条 dock；顶栏左右侧栏显隐；主题设置隐藏 dock 工具）
- 分区线颜色：`var(--b3-border-color)`
- 面板底色：`var(--b3-theme-background)`
- 自有令牌：仅 `--starter-topbar-height`
- 设置入口：顶栏 `#barPlugins` 菜单 →「cursor极简 设置」（见 [design/2026-08-04-theme-settings.md](design/2026-08-04-theme-settings.md)）
- 文件夹内部名仍为 `starter`（与 `theme.json` 的 `name` 一致）；界面显示名为 cursor极简
