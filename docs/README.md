# cursor极简

类 Cursor 的极简四分区布局：配色复用官方 **daylight**（亮）/ **midnight**（暗），本主题只改布局与交互。

## 分区地图

| 区 | 界面 | DOM 锚点 | 文档 |
|----|------|----------|------|
| ① 顶栏 | 全宽标题区（含文档 Tab） | `#toolbar` | [design/2026-08-04-toolbar-titlebar.md](design/2026-08-04-toolbar-titlebar.md) |
| ② 左侧栏 | 顶：横向左 dock；下：文档树 | `#dockLeft` + `.layout__dockl` | 同上 |
| ③ 中间区 | 编辑正文 | `.layout__center` / `.layout-tab-container` | 同上；路径面包屑见 [design/2026-09-01-doc-path-breadcrumb.md](design/2026-09-01-doc-path-breadcrumb.md)；行内代码见 [design/2026-09-01-inline-code.md](design/2026-09-01-inline-code.md) |
| ④ 右侧栏 | 顶：横向右 dock；下：大纲等 | `#dockRight` + `.layout__dockr` | 同上；大纲跟随见 [design/2026-09-01-outline-follow.md](design/2026-09-01-outline-follow.md)；大纲外观见 [design/2026-09-01-outline-appearance.md](design/2026-09-01-outline-appearance.md) |

```
┌──────────────── ① 顶栏 ────────────────┐
├──────────┬───────────────┬─────────────┤
│ ② 左侧栏 │  ③ 中间编辑区  │  ④ 右侧栏   │
└──────────┴───────────────┴─────────────┘
```

## 整体架构

- 默认层：亮色 `daylight/theme.css`；暗色 `midnight/theme.css`（思源按模式自动加载）
- 覆盖层：`theme.css` + `theme.js`（侧栏顶横条 dock；顶栏左右侧栏显隐；主题设置隐藏 dock 工具；大纲跟随正文位置；大纲隐藏文档名与 H1–H6 标记、一级标题加粗；面包屑为文档路径）
- 分区线颜色：`var(--b3-border-color)`
- 面板底色：左侧栏 / 顶栏用 chrome（亮 `#f8f8f8` / 暗 `#191a1b`）；右侧栏与编辑区同色（亮 `#ffffff` / 暗 `#1e1e1e`）
- 自有令牌：仅 `--starter-topbar-height`
- 设置入口：顶栏 `#barPlugins` 菜单 →「cursor极简 设置」（见 [design/2026-08-04-theme-settings.md](design/2026-08-04-theme-settings.md)）
- 文件夹名为 `cursorart`；`theme.json` 的 `name` 必须与文件夹名一致（思源 3.8+ 集市校验）；界面显示名为 cursor极简（`displayName`）
- 安装目录：工作区 `conf/appearance/themes/cursorart/`（思源当前只从此目录加载主题；**不会**从 `data/themes` 加载）
- 配置文件：工作区 `data/storage/theme/cursorart/config.json`（配置在 `data/` 下，可随工作区同步；主题 CSS/JS 本身不随云端同步）
