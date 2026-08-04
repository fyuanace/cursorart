# cursor极简

类 Cursor 的极简四分区布局主题：

- **亮色**：叠在官方 **daylight** 上
- **暗色**：叠在官方 **midnight** 上

配色与组件变量复用下层官方主题，本主题只改布局与交互增强。

## 开始

1. 编辑 `theme.css`（只加布局覆盖；改颜色请优先依赖官方变量）
2. 思源：**设置 → 外观** → 亮色主题 / 暗色主题均选 **cursor极简**
3. `Ctrl+Shift+I` → Network 勾选 Disable cache → 控制台 `location.reload()`

## 文件

| 文件 | 作用 |
|------|------|
| `theme.json` | 元数据（`modes` 含 light、dark） |
| `theme.css` | 布局覆盖 |
| `theme.js` | dock 横条、侧栏显隐、主题设置 |
| `icon.png` | 图标 |
| `preview.png` | 预览图 |

官方样板：https://github.com/siyuan-note/theme-sample
