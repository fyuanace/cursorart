---
type: design-change
project: cursor-minimal
module: typography
date: 2026-09-02
status: implemented
summary: >
  表格表头不加粗由设置「样式」开关控制，默认开启。
related:
  - design/2026-09-01-inline-code.md
  - design/2026-08-04-theme-settings.md
tags: [typography, table]
---

# 表格表头不加粗

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-02 | 编辑区与预览中 `table th` 的 `font-weight` 改为 400 |
| 2026-09-02 | 改为 `thead th` 并 `!important`，压过官方强制粗体 |
| 2026-09-02 | 改为设置「样式」开关，由 `html.starter-plain-table-head` 门控 |

## 背景信息

浏览器与官方主题把表头画成粗体。用户希望表头和表体一样是常规字重，例如「三代框架中传入 / 意义」这类两列表头不再加粗。

## 当前方案

- 配置 `plainTableHead`（缺省 `true`）；开启时给 `html` 打 `starter-plain-table-head`
- 仅该类存在时：`.b3-typography table thead th`、`.protyle-wysiwyg table thead th { font-weight: 400 !important }`
- 表头内非 `strong` 子节点继承该字重，避免官方内层再加粗
- 关闭开关 = 官方强制加粗；不改单元格边框、底色与对齐
- 表头里用户再套加粗标记时，仍走官方 `strong` 样式

## 其他模块引用约束

- 不要把该规则扩到 `td` 或数据库属性视图表头

## 工程师测试验收方法

1. 设置「样式」默认开启「表格表头不加粗」：表头与表体同粗细
2. 关闭该开关并保存：表头恢复官方加粗
3. 预览/导出 HTML 在开关开启时表头同样不加粗
4. 表头单元格内再加粗的片段仍应加粗

## 其他说明

无
