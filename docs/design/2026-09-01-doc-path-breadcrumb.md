---
type: design-change
project: cursor-minimal
module: breadcrumb
date: 2026-09-01
status: implemented
summary: >
  编辑器面包屑改为文档路径（笔记本/文件夹/文档），不再显示页内标题/块层级。
related:
  - design/2026-08-04-toolbar-titlebar.md
tags: [breadcrumb, path, theme.js]
---

# 文档路径面包屑

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-01 | 替换官方块级面包屑为笔记本→父文档→当前文档；点击父级打开对应文档 |
| 2026-09-01 | 改为隐藏官方 `.protyle-breadcrumb__bar`，另插文档路径条，避免跳转/编辑后被官方异步 render 盖掉 |
| 2026-09-01 | 纯文字 `笔记本/父文档/当前文档`；无图标；各级可点（笔记本 ID 即顶层文档）；过长时前面省略、末尾两级完整 |
| 2026-09-01 | 省略策略：≤3 级完整且不撑开空隙；>3 级时第一级+末尾两级优先完整，中间先省略；标题仍放不下则该项末尾省略 |
| 2026-09-01 | 路径条强制单行：nowrap + 固定 22px 高，过长只省略不换行 |
| 2026-09-01 | 取消 22px 锁高：路径条与官方面包屑行、右侧按钮同一行垂直居中；字号回到官方 14px |

## 背景信息

官方 `.protyle-breadcrumb__bar` 是**块级面包屑**：随光标显示「文档图标 → H1 → H2 → …」。用户需要的是文档树路径，例如 `项目 / qtcreator 开发 / xf04 qtcreator 开发记录`。

## 当前方案

- 仅处理中栏 `#layouts .layout__center` 的编辑器
- **不改写** `breadcrumb.render`：官方块级条继续更新，但用 CSS `display:none` 藏起
- 在官方条后插入 `.starter-doc-path`，只往这条里画文档路径
- 路径来自 `/api/filetree/getFullHPathByID`（含笔记本名）与 `/api/filetree/getPathByID`（物理路径中的文档 ID）；第一级用笔记本 ID 打开（笔记本当文档时 rootID = 笔记本 ID）
- 只显示纯文字与 `/` 分隔，不画图标、不复用官方块级 item
- 悬浮用 `var(--b3-list-hover)`；每一级（含笔记本）点击 `openFileByURL`
- 过长省略：≤3 级不省略、不 `flex-grow`；>3 级时第一级与末尾两级 `--keep`，中间 `--mid` 先收缩出 `...`；单项标题过长则 `text-overflow: ellipsis` 加在标题末尾
- 路径条不锁高度：跟官方 `.protyle-breadcrumb` 同行、`align-items: center`，与右侧锁定/文档/更多按钮垂直对齐；字号 14px
- 按文档根 ID 缓存；新编辑器 / 切文档靠 `loaded-protyle-static`、`switch-protyle`、标题 `data-node-id` 与面包屑 DOM 出现时刷新
- 右侧锁定、文档菜单、更多按钮不动
- 当前文档项点击不跳转；卸载主题时移除路径条，官方条随 CSS 卸载重新显示

## 其他模块引用约束

- 必须开启「加载主题 JS」
- 不要给路径项写 `data-node-id`，否则官方 click 会按当前文档 `zoomOut`
- 不要改面包屑右侧 `data-type="more|doc|readonly|exit-focus"` 按钮
- 不要往官方 `.protyle-breadcrumb__bar` 里写路径 HTML（会被 `render` 的异步回调覆盖）

## 工程师测试验收方法

1. 打开嵌套文档，面包屑应为笔记本→文件夹→当前文档名，而不是 H1/H2
2. 在正文里移动光标，路径不随标题变化
3. 点击中间的文件夹项，应打开该父文档
4. 点击笔记本名应打开该笔记本文档（需开启「笔记本作为文档」）
5. 三级路径应完整显示且级与级之间空隙均匀；四级及以上第一级与末尾两级完整，中间可 `...`
6. 某一级标题本身过长时，省略号加在该标题末尾
6. 悬浮任一级应有浅底；无文件夹/H1 等图标
7. 右侧「更多」「文档」按钮仍可用，且与左侧路径文字垂直居中、行高一致
8. 切换主题离开后，官方块级面包屑恢复
9. 从文档树/反链跳到另一篇、以及编辑正文后，仍应显示文档路径而不是 H1/H2

## 其他说明

无
