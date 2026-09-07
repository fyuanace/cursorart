---
type: design-change
project: cursor-minimal
module: donate
date: 2026-09-04
status: implemented
summary: >
  顶栏前进按钮后加思源粉色爱心；点击打开支持页并计次。按电脑名记住是否点过，换设备或电脑名变化会再出现。
related:
  - design/2026-08-04-toolbar-titlebar.md
tags: [donate, toolbar, cloudflare]
---

# 捐赠爱心与支持页

## 变更记录

| 时间 | 说明 |
|------|------|
| 2026-09-07 | 支持页源码迁出主题仓库；爱心按电脑名记住是否点过，换电脑名或复位后再出现 |
| 2026-09-04 | 爱心改挂顶栏 `#barForward` 之后（前进按钮与文档 Tab 之间）；人数默认从 300 起显示 |
| 2026-09-04 | 设置「关于」增加复位捐助按钮：清掉本机标记后立刻重新显示爱心 |
| 2026-09-07 | 设置文案改为「复位喜欢按钮」 |
| 2026-09-04 | 点击先用系统浏览器打开 `/?from=theme`（由页面计次），爱心等浏览器调起后再消失；收款码在 QQ 群上方，三图按原图像素显示 |
| 2026-09-04 | QQ 群码前增加提示：加群备注赞助账户名与金额，或加群后私聊群主发赞助截图，作者才优先响应 |
| 2026-09-04 | 收款码缩小为 280 CSS 像素方格：微信与支付宝并排等大，QQ 群码同样缩小；浏览器标签用粉色爱心图标 |
| 2026-09-04 | 支持页称呼由「你」改为「您」 |
| 2026-09-04 | 微信与支付宝收款码始终左右同一行，窄窗口等比缩小不再上下叠 |

## 背景信息

主题上线后需要一个轻量入口：表达喜欢、加 QQ 群、看收款码。计数只统计「点了爱心」的人，避免把路过打开网页的流量算进去；同一台电脑点过一次就不再打扰，换电脑或电脑名变化再出现一次。

## 当前方案

**工具栏入口**

- 挂在顶栏 `#barForward`（前进）之后、`#drag` / 文档 Tab 之前，控件为 `div.toolbar__item`（不是左侧 dock）
- 图标复用思源集市赞助同款：`<svg class="ft__pink"><use xlink:href="#iconHeart">`
- 无 `data-type`，不进「cursor极简 设置」的 dock 显隐列表，也不走官方 `toggleModel`

**点击**

1. 立刻用系统浏览器打开 `https://siyuan.ysoft.site/?from=theme`（优先 Electron `shell.openExternal`，失败再 `window.open`）；主题侧不再 `fetch` 计次接口，避免本机访问捐赠页域名超时导致人数不加、页面也出不来
2. 浏览器调起成功后再记下当前电脑名，并去掉爱心（不在点击当下先藏）

电脑名优先读 Electron `os.hostname()`，没有则用思源 `config.system.name`。`localStorage["cursorart-donate-clicked-host"]` 等于当前电脑名时不再插入爱心；对不上（新设备、改名）则再显示。旧标志 `cursorart-donate-clicked=1` 启动时迁成「当前电脑名已点过」。不写入工作区 `config.json`，不随思源同步。

设置「侧栏 → 关于」有「复位喜欢按钮」：点「复位」会清掉电脑名记录并立刻重新插入爱心，不必保存、不必重启。复位只恢复显示，不会改 Cloudflare 上的人数。

**支持页（独立目录，不在主题包内）**

- 源码在本机桌面 `donate/`（Cloudflare Pages Functions + `public/`），用 Wrangler 发布，不随思源加载
- 账号：`fyuanace@qq.com`（Account ID `9ec83f561d163d6ed08d8a69a52c37f6`）
- Pages：`cursorart-donate`；页：https://siyuan.ysoft.site （备用 https://cursorart-donate.pages.dev ）
- DNSPod：`siyuan.ysoft.site` CNAME → `cursorart-donate.pages.dev`
- D1：`cursorart-likes`（`affb3152-f77d-4f97-9b82-7cf4cde47f30`），表 `likes(id=1, clicks)`；人数下限 300（库内小于 300 时按 300 显示，点爱心则从 301 起加）
- `GET /` 只读当前人数并渲染文案「已有 N 人和您一样都喜欢这个主题」
- `GET /?from=theme`：在渲染前加一次人数，HTML 里用 `history.replaceState` 把地址改回 `/`，刷新不会再加；直接打开无该参数的首页不加一
- 页面自上而下：人数 → 微信（左）/ 支付宝（右）收款码同一行等大方格（最大 280 CSS 像素，窄窗口等比缩小、不换行）→ QQ 群优先响应提示 → 群号 `1091105807` 与群码（同样最大 280 方格）
- 浏览器标签图标为粉色捐助爱心（`/favicon.svg`，与页内爱心同色同形）
- QQ 群提示文案：如果需要作者优先响应您的需求，请在加群时备注赞助付款账户名和金额，或加群后私聊群主发送赞助截图
- `POST /api/click` 仍保留：须带 `X-Cursorart-Like: 1`，无该请求头则 400 且不改库

`theme.json` 的 `funding.custom` 指向同一 URL，集市卡片也会出现官方粉色爱心。

## 其他模块引用约束

- 不要把「已点过爱心」写进 `config.json`（那会随工作区同步，别的设备也会提前藏掉入口）
- 爱心显隐只认本机电脑名与 `localStorage["cursorart-donate-clicked-host"]`；复位或电脑名变化才再显示
- 不要给爱心加真实 dock `data-type`，以免被隐藏 dock 规则误伤或当成面板
- 主题点击必须打开带 `from=theme` 的首页，不要先藏爱心再等网络；`GET /` 与 `GET /api/count` 只读；`POST /api/click` 仍须带 `X-Cursorart-Like: 1`

## 工程师测试验收方法

1. 本机未记下当前电脑名时加载主题：顶栏前进按钮右侧、文档 Tab 左侧应有粉色爱心
2. 点爱心：应立刻弹出系统浏览器；爱心在浏览器调起后再消失；支持页人数加一；同电脑名再 reload 主题仍不出现
3. 设置 → 侧栏 → 关于 →「复位」，或电脑名与记下的不一致：爱心应立刻回到顶栏同一位置；再点爱心会再计一次
4. 浏览器直接打开无 `from=theme` 的支持页：人数不变（默认至少显示 300）；无请求头的 `POST /api/click` 应 400；带 `from=theme` 打开一次加一，刷新不加
5. 支持页微信在左、支付宝在右，始终同一行等大；群码在收款码下方；群码前有优先响应提示；标签页为粉色爱心图标
6. `wrangler whoami` 应为 `fyuanace@qq.com`

## 其他说明

旧 Wrangler 会话曾落在 `fyuan3439@gmail.com`；现行发布以 `fyuanace@qq.com` 为准。
