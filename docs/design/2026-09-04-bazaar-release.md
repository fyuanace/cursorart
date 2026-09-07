---
type: design-change
project: cursor-minimal
module: bazaar
date: 2026-09-04
status: implemented
summary: >
  首次以 v2.0.1 面向集市发布：补齐 icon / preview、仓库 URL 与中英文介绍。
related: []
tags: [bazaar, readme]
---

# 集市发布说明

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-04 | 版本定为 v2.0.1；补齐 `icon.png` / `preview.png`、中英文 README 与 `theme.json` 元数据 |
| 2026-09-07 | 发布 v2.0.2：`icon` 用 ≤64KB 的 `icon.png`；补 `LICENSE`；说明新主题禁止 `theme.js` |
| 2026-09-07 | 发布 v2.0.3：主题去 `theme.js`；交互迁至配套插件 `fyuanace/cursorart-tools` |
| 2026-09-07 | 发布 v2.0.5：自适应标题栏高度改为可开关；设置对话框 CSS 移出主题 |
| 2026-09-07 | 主题与插件共用一份用户介绍；亮色 / 暗色预览换成当前界面截图 |
| 2026-09-07 | 用户介绍截图改到 `image/`；集市卡片仍用根目录 `preview.png` |
| 2026-09-07 | 集市卡片与详情开篇改为 Cursor/Notion 风格简介，并强调插件与主题一起用 |

## 背景信息

思源集市要求主题仓库含 `theme.css`、`theme.json`、README、以及声明的图标与预览图。此前介绍仍是开发备忘，缺少面向用户的说明与截图。

**硬性上架规则（PR Check）**

- 根目录 Latest Release 必须含 `package.zip`
- `icon` ≤ 64KB，`preview` ≤ 512KB（推荐 160×160 / 1024×768）
- **新上架主题默认不允许包根存在 `theme.js`**（仅历史白名单仓库可保留）；功能须用纯 CSS，或拆成独立插件。见 [bazaar#1821](https://github.com/siyuan-note/bazaar/issues/1821)
- 首次上架向 [siyuan-note/bazaar](https://github.com/siyuan-note/bazaar) 的 `themes.txt` 追加一行 `fyuanace/cursorart`

## 当前方案

- 集市详情用根目录 `README.md`（英文）与 `README_zh_CN.md`（中文），与插件介绍同一份文案；正文源在 `docs/instruction/`
- 列表图标 `icon.png`（160×160，≤64KB）、卡片预览 `preview.png`（用亮色全界面截图，留在仓库根）；介绍正文截图在 `image/`（含亮 / 暗预览 `image/light.png`、`image/dark.png`）
- `theme.json` 的 `name` 与文件夹 / 仓库名 `cursorart` 一致；`url` 为 GitHub 仓库地址；当前版本 `2.0.8`
- 仓库根有 `LICENSE`（MIT）
- 交互能力在独立插件仓库 `fyuanace/cursorart-tools`（集市 `plugins.txt` 另 PR）
- 主题 `package.zip` **不含** `theme.js`

## 其他模块引用约束

- 不要把 `docs/README.md` 改成集市文案（那是给开发者的模块地图）
- 介绍截图相对路径写 `image/...`（`docs/instruction/` 里写 `../../image/...`），以便打包进 `package.zip` 后离线也能看
- 集市列表卡片仍用根目录 `preview.png`，不要改成 `image/` 路径
- 勿把 `cursor-app-icon.png`（>64KB）写进清单 `icon` 字段

## 工程师测试验收方法

1. `theme.json` 含 `icon`、`preview`、`url`、`zh-CN` 的 displayName / description / readme
2. 根目录存在 `icon.png`、`preview.png`、`README.md`、`README_zh_CN.md`、`LICENSE`
3. GitHub Release 标签与 `version` 一致（如 `v2.0.2`），附件为包根文件的 `package.zip`
4. 主题包根不得含 `theme.js`；交互由 `cursorart-tools` 插件提供

## 其他说明

上架：GitHub Release 上传 `package.zip`；首次向 [siyuan-note/bazaar](https://github.com/siyuan-note/bazaar) 的 `themes.txt` 追加 `fyuanace/cursorart`（每个 PR 只能加 1 个包；插件另提 `plugins.txt`）。
