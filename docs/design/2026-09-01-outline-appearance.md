---
type: design-change
project: cursor-minimal
module: outline
date: 2026-09-01
status: implemented
summary: >
  大纲列表不显示文档名与 H1–H6 级别图标，一级标题文字加粗。
related:
  - design/2026-09-01-outline-follow.md
tags: [outline, appearance]
---

# 大纲列表外观

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-01 | 隐藏钉住大纲顶栏下的文档名行；隐藏标题前 H1–H6 图标；`data-subtype="h1"` 的标题文字加粗 |
| 2026-09-02 | 标题第一次出现子标题时大纲默认展开；用户手动折叠的项保持折叠 |

## 背景信息

官方大纲在标题前画 `#iconH1` 等标记，钉住的右侧大纲还会在工具条下单独一行显示当前文档名。用户只想看标题层级文字，一级标题用字重区分。

## 当前方案

- 文档名：`.sy__outline > .b3-list-item`（钉住大纲时 `updateDocTitle` 写在工具条下一行）；并隐藏 `data-type="NodeDocument"` 项
- 级别标记：隐藏大纲项上的 `.b3-list-item__graphic`（官方 `#iconH1`–`#iconH6` SVG），保留展开箭头
- 一级标题：`.b3-list-item[data-subtype="h1"] .b3-list-item__text { font-weight: 700 }`
- 仅 CSS，不改大纲数据与点击跳转
- 大纲树更新后：某标题**第一次**带上子标题时自动展开并写入官方 `saveExpendIds`；已见过的父标题尊重用户折叠。打开文档时若全部折叠（官方空 `expandIds` 会全折），则展开一次；若有开有关则保持现状

## 其他模块引用约束

- 不要对大纲树里所有 `.b3-list-item__graphic` 一律 `display:none` 扩到文档树
- 不要去掉 `.b3-list-item__toggle`，否则无法折叠子标题
- 不要在每次大纲刷新时 `expandAll`，以免盖掉用户折叠

## 工程师测试验收方法

1. 右侧打开大纲，钉住面板：工具条下不应再出现当前文档名
2. 标题行左侧不应出现 H1/H2 等字样或对应图标，折叠箭头仍在
3. 一级标题文字明显加粗，二至六级保持常规字重
4. 点击大纲项仍跳转正文；展开/折叠仍可用
5. 新建一级标题后再建二级：大纲里一级应展开并露出二级；手动折叠后再改标题文字，不应被强制展开

## 其他说明

无
