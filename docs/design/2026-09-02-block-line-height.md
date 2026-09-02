---
type: design-change
project: cursor-minimal
module: typography
date: 2026-09-02
status: implemented
summary: >
  设置「样式」用滑杆控制正文段落行高，默认与官方 1.625 一致。
related:
  - design/2026-08-04-theme-settings.md
  - design/2026-09-02-table-header.md
tags: [typography, line-height, settings]
---

# 块行间距

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-02 | 样式页签滑杆控制段落 `line-height`，范围 1.2–2.6 |

## 背景信息

用户希望在不改官方主题的前提下调节正文疏密。行高落在段落块上，避免给列表/标题整块再叠一层导致间距翻倍。

## 当前方案

- 配置 `blockLineHeight`（缺省 `1.625`，步进 0.05，夹在 1.2–2.6）
- 生效时 `html` 带 `starter-block-line-height`，令牌 `--starter-block-line-height`
- 作用范围：`.protyle-wysiwyg [data-node-id].p` 与 `.b3-typography p`
- 设置里拖滑杆即时预览；取消 / Esc / 点遮罩还原已保存值

## 其他模块引用约束

- 不要把行高扩到全部 `[data-node-id]`
- 不要用该令牌改块与块之间的 `margin`

## 工程师测试验收方法

1. 默认 1.625 时正文疏密接近官方
2. 拖到约 2.2：多行段落明显变疏；列表项之间不应再额外翻倍
3. 取消设置后行高回到保存值；保存后重启仍生效
4. 切换离开本主题：行高类与令牌被清掉

## 其他说明

无
