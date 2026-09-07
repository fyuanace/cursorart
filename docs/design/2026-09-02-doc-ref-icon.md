---
type: design-change
project: cursor-minimal
module: typography
date: 2026-09-02
status: implemented
summary: >
  文档引用用正文色、链接式下划线并显示文档图标，字重与正文一致；文字由 CSS 立刻定稿，图标能同步识别的当场画上。
related:
  - design/2026-09-01-inline-code.md
  - design/2026-08-04-theme-settings.md
tags: [typography, block-ref, document]
---

# 文档引用图标与下划线

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
| 2026-09-02 | 图标改由 `#starterDocRefStyle` 按 `data-id` 注入；禁止写 span.style，避免回车把 IAL 存进正文 |
| 2026-09-04 | 未设 IAL 图标时跟官方文件树：开启 SVG 默认则画 `#iconFile` / `#iconFileText`，不再用旧 📄 |
| 2026-09-04 | 文档引用里的 SVG 默认改为线框 mask（fill none + stroke），避免 `::before` 把填充路径涂成实心黑块 |
| 2026-09-04 | 改文档图标后，已打开正文里的引用链接立刻换图标，不必重启 |
| 2026-09-07 | 普通文档引用不再加粗；默认开启链接样式 |

## 背景信息

官方文档引用（`((文档))` / `[[文档]]` 生成的 `block-ref`）与标题引用外观相同。用户希望文档引用能看出是一篇文档：前面有文档图标、浅色下划线；字重与正文一致、不加粗。

## 当前方案

- 用 `/api/block/getBlockInfo` 判断 `rootID === id`，是则视为文档引用
- 图标优先文档 IAL `rootIcon`（emoji 或 `/emojis/` 自定义图）。未设时：若官方 `fileTree.useSVGDefaultIcon` 为真，用文件树同一套 SVG（叶子 `#iconFile`，树里能认出有子文档则 `#iconFileText`）。引用 span 不能插入 `<svg>`，故把官方 symbol 抽成描边 data URI，经 `::before` 的 alpha mask 画成线框，颜色跟文字 `currentColor`；不要按原路径填充，否则会变成实心黑块。未开 SVG 默认则仍用 `local-images.file` 转成的 emoji
- 文字色用 `var(--b3-theme-on-background)`；下划线用浅色 `var(--b3-border-color)`，且 `background-clip: content-box`：图标在 padding 里，线只出现在文字 content 下
- 未判定的引用先只改正文色；确认是文档后由 `#starterDocRefStyle` 按官方 `data-id` 画图标与下划线
- 图标：文档树已有该项则同步写入样式表；否则 `getBlockInfo` 返回后马上补。不再用 idle 推迟
- 文档图标变更后立刻失效缓存：内核 `transactions` / `updateAttrs` 里 `icon` 变化时按 id 清缓存并走 `getBlockInfo` 重画；文件树图标节点的 MutationObserver 在树 DOM 更新后再读一次。关文档重开不够，是因为旧缓存还在；重启才会空缓存
- 标题/段落引用在样式表里按 id 复位为官方紫色、无下划线
- 不改 span 的 `class` / `style` / 正文；`::before` 只活在 document 样式表里，避免回车时 Lute 把 `{: style=...}` 写进块
- 打开文档时清掉旧版残留的 `--starter-doc-ref-*` 行内样式，以及已漏进正文的 `{: style="--starter-doc-ref-…"}`
- 结果按 id 缓存；编辑器 DOM 变化与切文档时补规则
- 块上带 `custom-fhelper-child-nav` 的引用（子文档导航）排除在外：不收集、不注入图标/下划线，保持导航块自己的样式。原生段落里的同名文档引用仍优化

## 其他模块引用约束

- 必须开启「加载主题 JS」
- `customDocRefStyle === false` 时不要打自定义类，也不要给 `html` 加 `starter-custom-doc-ref`
- 不要给所有 `block-ref` 一律加文档图标
- 不要修改 `av__celltext` 或代码块内的引用 span 正文
- 不要给可编辑 `block-ref` 写 `style` 或自定义 `data-*`（回车会序列化成 IAL）
- 不要改 `custom-fhelper-child-nav` 块里的引用外观

## 工程师测试验收方法

1. 正文插入对另一篇**文档**的引用：正文黑色、链接式下划线，左侧为文档图标，字重与正文相同（不加粗）；未设自定义图标时应与文件树默认图标同为**线框** SVG，不是实心黑块，也不是旧的蓝色 📄；打开文档时不应先闪紫色
2. 引用某**标题**或段落：无文档图标、无下划线，仍为官方紫色
3. 点击文档引用仍能跳转；重新加载窗口后图标仍在
4. 切换主题离开后，引用恢复官方样式，文档内容未被写入图标字符
5. 在文档引用所在行按回车：新段落正常，引用旁不应出现 `{: style="--starter-doc-ref-glyph:…"}`
6. 带 `custom-fhelper-child-nav` 的标题导航引用：不套主题文档引用样式；同一篇文档在普通段落里的原生引用仍应有图标与下划线、不加粗
7. 改某文档图标后，其它已打开文档里指向它的引用应马上换成新图标；关文档再开也应一致，不必重启思源

## 其他说明

无
