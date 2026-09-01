---
type: design-change
project: cursor-minimal
module: outline
date: 2026-09-01
status: implemented
summary: >
  正文滚动或光标移动时，右侧大纲自动聚焦到当前标题；复用官方 Outline.setCurrent，不改写内核。
related:
  - design/2026-08-04-toolbar-titlebar.md
tags: [outline, protyle, theme.js]
---

# 大纲跟随正文位置

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-01 | 滚动按视口顶部标题同步大纲；点击/选区按光标所在块的上一标题同步 |

## 背景信息

官方大纲会在点击正文或方向键移动光标时调用 `Outline.setCurrent`，但**滚动阅读**时不会更新。用户希望大纲实时反映当前读到/编到的标题。

## 当前方案

- 监听中栏 `.protyle-content` 的捕获阶段 `scroll`：取视口顶部约 48px 处及以上的最后一个可用标题，调用匹配文档的 `outline.setCurrent(heading)`
- 监听 `selectionchange`：光标在中栏编辑器内时，用光标块自身或之前的标题
- 文档切换（`switch-protyle` / `loaded-protyle-static`）再同步一次
- 可用标题：`data-type="NodeHeading"`，排除引用块、callout、嵌入块内标题
- 同一标题已是 `.b3-list-item--focus` 则不再调用，避免大纲被反复居中滚动
- 只同步 `blockId` 与当前文档根 id 一致的大纲实例
- 不 hook / 不改写 `Outline.setCurrent`；卸载主题时移除监听

## 其他模块引用约束

- 必须开启「加载主题 JS」
- 不要用文档树 `Files.setCurrent`（同名方法）；大纲实例用 `setCurrentByPreview` 区分
- 不要在滚动回调里 `preventDefault`

## 工程师测试验收方法

1. 开启加载主题 JS，打开带多级标题的长文档，右侧打开大纲
2. 滚动正文：大纲高亮应随当前可见标题切换，并在列表中保持可见
3. 点击某段正文：大纲应聚焦该段所属标题
4. 用方向键在标题间移动：大纲应跟上
5. 点击大纲项仍应跳转正文；切换主题离开后跟随应停止
6. 分栏打开另一篇文档时，滚动那一篇不应改写当前大纲（root id 不一致）

## 其他说明

无
