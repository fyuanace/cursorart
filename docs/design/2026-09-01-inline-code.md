---
type: design-change
project: cursor-minimal
module: typography
date: 2026-09-01
status: implemented
summary: >
  行内代码文字色改为 Notion 同款 #d6716a，代码块不高亮为该色。
related: []
tags: [typography, inline-code]
---

# 行内代码文字色

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-01 | 编辑区与预览的行内代码文字为 `#d6716a`；不改背景、字号与代码块高亮 |

## 背景信息

官方行内代码跟正文同色，只靠浅底区分。用户希望文字接近 Notion 行内代码的玫瑰红。

## 当前方案

- 编辑：`.protyle-wysiwyg [data-node-id] span[data-type~="code"]`（`~=` 覆盖与加粗等叠用）
- 预览/导出：`.b3-typography :not(pre) > code`
- 仅改 `color: #d6716a`；背景仍用官方 `--b3-protyle-code-background`
- 不选择 `.code-block`、`pre code`、`.hljs`

## 其他模块引用约束

- 不要把该色写到代码块或 `kbd`
- 亮暗模式共用同一色值（按 Notion）

## 工程师测试验收方法

1. 正文 `` `code` `` 文字为玫瑰红 `#d6716a`，浅底仍在
2. 行内代码再加粗时文字仍是该色
3. 围栏代码块语法高亮不变
4. 预览/导出里的行内代码同样变色

## 其他说明

无
