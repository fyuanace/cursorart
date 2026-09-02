---
type: design-change
project: cursor-minimal
module: typography
date: 2026-09-02
status: implemented
summary: >
  文档引用用正文色、加粗、链接式下划线并显示文档图标；文字由 CSS 立刻定稿，图标能同步识别的当场画上。
related:
  - design/2026-09-01-inline-code.md
  - design/2026-08-04-theme-settings.md
tags: [typography, block-ref, document]
---

# 文档引用图标与加粗

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-02 | 仅当块引用 `data-id` 等于文档 `rootID` 时显示图标并 `font-weight: 700`；图标用 `::before`，不写入引用正文 |
| 2026-09-02 | 文档引用文字改为正文色 `var(--b3-theme-on-background)`，不再用官方紫色 |
| 2026-09-02 | 增加链接式下划线；未判定的引用先用正文色+加粗+下划线，等 idle/切文档后再批量打图标，避免打开时紫黑闪烁 |
| 2026-09-02 | 取消 idle 推迟：文档树能认出的图标当场画；其余等 getBlockInfo 返回立刻补，不再人为滞后 |
| 2026-09-02 | 下划线改为元素底边（border-bottom），避开 q/g/p/y 等降部 |
| 2026-09-02 | 下划线只画在文字下、不延伸到图标；颜色改为 `var(--b3-border-color)` |
| 2026-09-02 | 图标改占左侧 padding，下划线 `background-clip: content-box` 只铺文字，不再用估算宽度 |
| 2026-09-02 | 下划线与图标同一时刻出现，避免先满宽再让出图标造成的滑动感 |
| 2026-09-02 | 修正未就绪规则误盖住已就绪下划线 |
| 2026-09-02 | 设置「样式 → 链接样式」可关闭自定义引用；关则卸标并走官方样式 |

## 背景信息

官方文档引用（`((文档))` / `[[文档]]` 生成的 `block-ref`）与标题引用外观相同。用户希望文档引用能看出是一篇文档：前面有文档图标、文字加粗。

## 当前方案

- 用 `/api/block/getBlockInfo` 判断 `rootID === id`，是则视为文档引用
- 图标优先文档 IAL `rootIcon`（emoji 或 `/emojis/` 自定义图）；未设则用设置里的默认文档图标（`local-images.file`）
- 文字色用 `var(--b3-theme-on-background)`；下划线用浅色 `var(--b3-border-color)`，且 `background-clip: content-box`：图标在 padding 里，线只出现在文字 content 下
- 未打 skip 的引用先只改正文色+加粗；图标与下划线等 JS 打上 `--icon/--img` 后同时出现
- 图标：文档树已有该项则同步画出；否则 `getBlockInfo` 返回后马上补。不再用 idle 推迟
- 标题/段落引用打 `starter-doc-ref--skip` 后恢复官方紫色、无下划线
- 只给 span 加 `starter-doc-ref` 与 CSS 变量，用 `::before` 绘制；不往可编辑文本里插节点，避免存进 `.sy`
- 标题/段落等非文档引用打 `starter-doc-ref--skip`，不再请求
- 结果按 id 缓存；编辑器 DOM 变化与切文档时补打标

## 其他模块引用约束

- 必须开启「加载主题 JS」
- `customDocRefStyle === false` 时不要打自定义类，也不要给 `html` 加 `starter-custom-doc-ref`
- 不要给所有 `block-ref` 一律加文档图标
- 不要修改 `av__celltext` 或代码块内的引用 span 正文

## 工程师测试验收方法

1. 正文插入对另一篇**文档**的引用：名称加粗、正文黑色、链接式下划线，左侧为文档图标；打开文档时不应先闪紫色
2. 引用某**标题**或段落：无文档图标、不加粗、无下划线，仍为官方紫色
3. 点击文档引用仍能跳转；重新加载窗口后图标仍在
4. 切换主题离开后，引用恢复官方样式，文档内容未被写入图标字符

## 其他说明

无
