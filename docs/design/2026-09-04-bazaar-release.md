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

## 背景信息

思源集市要求主题仓库含 `theme.css`、`theme.json`、README、以及声明的图标与预览图。此前介绍仍是开发备忘，缺少面向用户的说明与截图。

**硬性上架规则（PR Check）**

- 根目录 Latest Release 必须含 `package.zip`
- `icon` ≤ 64KB，`preview` ≤ 512KB（推荐 160×160 / 1024×768）
- **新上架主题默认不允许包根存在 `theme.js`**（仅历史白名单仓库可保留）；功能须用纯 CSS，或拆成独立插件。见 [bazaar#1821](https://github.com/siyuan-note/bazaar/issues/1821)
- 首次上架向 [siyuan-note/bazaar](https://github.com/siyuan-note/bazaar) 的 `themes.txt` 追加一行 `fyuanace/cursorart`

## 当前方案

- 集市详情用根目录 `README.md`（英文）与 `README_zh_CN.md`（中文）
- 列表图标 `icon.png`（160×160，≤64KB）、卡片预览 `preview.png`（1024×768，≤512KB）；功能截图放在 `preview/`
- `theme.json` 的 `name` 与文件夹 / 仓库名 `cursorart` 一致；`url` 为 GitHub 仓库地址；当前版本 `2.0.2`
- 仓库根有 `LICENSE`（MIT）

## 其他模块引用约束

- 不要把 `docs/README.md` 改成集市文案（那是给开发者的模块地图）
- 截图相对路径写 `preview/...`，以便打包进 `package.zip` 后离线也能看
- 勿把 `cursor-app-icon.png`（>64KB）写进清单 `icon` 字段

## 工程师测试验收方法

1. `theme.json` 含 `icon`、`preview`、`url`、`zh-CN` 的 displayName / description / readme
2. 根目录存在 `icon.png`、`preview.png`、`README.md`、`README_zh_CN.md`、`LICENSE`
3. GitHub Release 标签与 `version` 一致（如 `v2.0.2`），附件为包根文件的 `package.zip`
4. 若含 `theme.js`：仅本地 / Release 分发可用；集市 PR Check 会失败，除非先拆插件或进入官方白名单

## 其他说明

上架还需在 GitHub 打 `vX.Y.Z` Release 并上传 `package.zip`；首次上架再向 [siyuan-note/bazaar](https://github.com/siyuan-note/bazaar) 提交 `themes.txt`。本主题功能依赖 `theme.js`，**当前无法按新主题规则直接过集市自动检查**。
