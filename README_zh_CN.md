# cursor极简

主打**极简风**。参考 [Cursor](https://cursor.com) 与 [Notion](https://www.notion.so) 的布局习惯，把思源做成更干净的四分区工作区：少装饰、少干扰，长时间写笔记更舒服。

亮色叠在官方 **daylight** 上，暗色叠在官方 **midnight** 上，配色仍走官方变量，本主题只做布局与交互优化。

使用前请在 **设置 → 外观** 的亮色 / 暗色主题中都选择 **cursor极简**。

交互功能（设置面板、收藏、最近打开、喜欢按钮、侧栏顶栏 dock 等）已拆到配套插件 **[cursor极简工具](https://github.com/fyuanace/cursorart-tools)**，请一并安装并启用。

## 外观

暗色与亮色都可用，侧栏、顶栏、编辑区层次清楚，选中态只用一块浅底，不抢正文。

**暗色**

<img src="preview/dark.png" alt="暗色界面" width="480">

**亮色**

<img src="preview/light.png" alt="亮色界面" width="480">

## 主要功能

### 隐藏侧栏工具

顶栏插件菜单 → **cursor极简 设置** →「侧栏」。关掉不常用的标签、关系图、收集箱等图标，侧栏只留你真正会点的工具。

<img src="preview/settings-dock.png" alt="隐藏侧栏工具" width="360">

### 收藏与最近打开

文件树顶部可列出「收藏」和「最近打开」，条数可调。当前文档用面包屑左侧的五角星收藏 / 取消收藏。点到哪一条，左侧就只高亮那一条；文档删除后，名单里会自动去掉。

<img src="preview/settings-tree.png" alt="收藏与最近打开设置" width="360">

<img src="preview/favorites.png" alt="收藏与最近打开" width="480">

### 文档链接

正文里的文档引用带上文档图标，并加粗显示，扫一眼能分清「这是一篇文档」而不是普通文字。

<img src="preview/doc-ref.png" alt="文档链接" width="420">

### 大纲

大纲去掉文档名和 H1–H6 标记，一级标题加粗，层级更干净；滚动正文时大纲会跟着当前位置。

<img src="preview/outline.png" alt="大纲" width="240">

## 其他优化

- 顶栏文档 Tab 接近 VS Code 的用法；可分别隐藏「新建文档」和「页签切换」
- 面包屑改为文档路径，便于跳转上级
- 可选隐藏笔记本名称，文档提到文件树第一级
- 表格表头可与正文同字重；块行间距可调

## 版本更新

### v2.0.3

- 按集市新规移除 `theme.js`；交互改由配套插件 [cursorart-tools](https://github.com/fyuanace/cursorart-tools) 提供

### v2.0.2

- 集市图标改为 Cursor App 标志
- 设置文案「复位喜欢按钮」
- 喜欢/支持页与域名相关调整

### v2.0.1

首次以完整产品形态发布。

- 亮色 / 暗色四分区极简布局（叠 daylight / midnight）
- 主题设置：隐藏侧栏工具、最近打开与收藏、隐藏笔记本、Tab 栏按钮、文档引用样式、表头与行高
- 文件树「收藏」「最近打开」；点哪条高亮哪条；删除文档后自动从名单移除
- 文档链接图标与加粗；大纲精简并跟随正文
- 路径面包屑、VS Code 式 Tab、侧栏顶横条 dock
