---
type: design-change
project: cursor-minimal
module: file-tree
date: 2026-09-03
status: implemented
summary: >
  主题设置可配置默认笔记本图标、无子文档/有子文档的默认文档图标；仅作未设图标时的回退渲染，不写入文档或笔记本 IAL。
related:
  - design/2026-08-04-theme-settings.md
  - design/2026-09-02-doc-ref-icon.md
  - design/2026-09-03-file-tree-recent-docs.md
  - design/2026-09-03-file-tree-favorites.md
tags: [file-tree, icon, settings]
---

# 默认笔记本 / 文档图标

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-03 | 样式页文档树增加三个回退图标；选择器用思源 `openEmoji`（type `av`）；有/无子文档分开 |
| 2026-09-03 | 主题脚本拿不到插件 require 时，按函数源码找回官方面板；再不行则借文件树入口并拦截假 id 的写属性请求 |

## 背景信息

思源对「未设图标」的项用三套默认：笔记本、无子文档、有子文档。用户希望在主题设置里改这三套显示，并沿用官方选文档图标的面板；改的是回退绘制，不能 `setBlockAttrs` / `setNotebookIcon` 写进文档或笔记本。

## 当前方案

配置键（空字符串 = 跟思源当前 `local-images` 快照）：

- `defaultNoteIcon`：笔记本
- `defaultFileIcon`：文档且无子文档
- `defaultFolderIcon`：文档且有子文档

值与思源图标字段相同：emoji 的 hex（如 `1f4c4`）、自定义 `/emojis/` 相对路径，或动态图标 `api/icon/getDynamicIcon…`。

选择：设置里的图标按钮优先走插件 API `openEmoji`（内部 `openEmojiPanel("", "av", …)`，不写块属性）。主题拿不到 `import`，会 `require("siyuan")`、扫 webpack 模块（含压缩后的导出），或临时点文件树里一颗假文档图标打开同一套面板，并拦截该假 id 的 `setBlockAttrs` / `setNotebookIcon`，避免写进真实文档。

渲染：

- 启动时记下官方 `window.siyuan.storage["local-images"]` 的 `note` / `file` / `folder`，主题加载期间只改内存，不 `setLocalStorage`，卸载时还原
- 文件树只改「默认图标」项：有 `data-default-icon` 的 li，或当前绘制仍等于官方/主题回退（含 SVG 默认）
- 有自定义 IAL 图标的项不动
- 有无子文档看 `data-default-icon`、笔记本 `navigation-root`、或 toggle/箭头是否 `fn__hidden`
- 最近打开、收藏、文档引用在自身图标为空时用同一套回退；引用指向有子文档的文档时用 folder 回退

## 其他模块引用约束

- 禁止把主题默认图标写成文档/笔记本 `icon` 属性
- 禁止为选图标去点文件树上的真实文档图标（会走 `doc`/`notebook` 类型并写属性）
- 不要把主题回退持久化进思源「默认图标」存储；卸载主题后应回到进入主题前的官方回退
- `customDocRefStyle === false` 时文档引用仍走官方，不读这三套主题回退

## 工程师测试验收方法

1. 开启「加载主题 JS」，打开设置 → 样式 → 文档树，应看到三个图标按钮与「恢复」
2. 点按钮应弹出思源官方图标面板；选完后文件树里未设图标的笔记本/无子文档/有子文档应分别变成所选图标，已设自定义图标的项不变
3. 打开任意未设图标的文档，确认文档属性里的图标仍为空
4. 点「恢复」并保存：回退回到思源原来的默认
5. 取消 / Esc：未保存的选择应还原；图标面板打开时 Esc 应先关面板，不关设置
6. 保存后重启：三套回退仍在；切换离开本主题后文件树回退恢复为官方

## 其他说明

无
