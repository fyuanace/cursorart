/**
 * cursor极简 —
 * 1) 左/右 dock 图标挂到对应侧栏顶部横条
 * 2) 顶栏左右侧栏显隐：左在「思源」标题后，右在窗口最小化左侧
 * 3) 主题设置（入口同插件：#barPlugins 菜单 → cursor极简 设置）
 * 4) 已选中 dock 图标再点不收起侧栏（仅拦 UI click，不改 toggleModel）
 * 5) 正文滚动/光标位置同步右侧大纲当前项（复用官方 Outline.setCurrent）
 * 6) 面包屑改为文档路径（笔记本/文件夹/文档），不再显示页内块层级
 * 7) 标题栏截图高度 55 物理像素：CSS = 55 / devicePixelRatio
 */
(function () {
    /** 截图/屏幕上量到的标题栏高度（设备像素），不含路径条 */
    const TOPBAR_SCREEN_PX = 55;
    const TOP_CLASS = "starter-dock--sidebar-top";
    const PANEL_CLASS = "starter-dock-panel--with-top";
    const TOGGLE_LEFT_ID = "starterToggleLeft";
    const TOGGLE_RIGHT_ID = "starterToggleRight";
    /** 工作区持久化（重启不丢）；勿用 petal 插件目录 */
    const CONFIG_PATH = "/data/storage/theme/cursorart/config.json";
    /** 旧版路径（文件夹改名前）；读到后迁入 CONFIG_PATH */
    const LEGACY_CONFIG_PATH = "/data/storage/theme/starter/config.json";
    const LEGACY_STORAGE_KEY = "starter-theme-config";
    const HIDE_STYLE_ID = "starterHideDockStyle";
    const DIALOG_ID = "starterSettingsDialog";
    const MENU_ITEM_ID = "starter-theme-settings";

    const sides = [
        {
            dockId: "dockLeft",
            panelSelector: "#layouts .layout__dockl",
            placeholderId: "starter-dockLeft-ph",
            layoutKey: "leftDock",
            fallbackType: "file",
        },
        {
            dockId: "dockRight",
            panelSelector: "#layouts .layout__dockr",
            placeholderId: "starter-dockRight-ph",
            layoutKey: "rightDock",
            fallbackType: "outline",
        },
    ];

    /** @type {{ hiddenDockTypes: string[] }} */
    let config = {hiddenDockTypes: []};

    /** 每侧记住上一次选中的 dock type（展开时用） */
    const lastType = {
        leftDock: "file",
        rightDock: "outline",
    };

    const normalizeConfig = (parsed) => ({
        hiddenDockTypes: Array.isArray(parsed?.hiddenDockTypes)
            ? parsed.hiddenDockTypes.filter((t) => typeof t === "string")
            : [],
    });

    const readLegacyLocal = () => {
        try {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (!raw) {
                return null;
            }
            return normalizeConfig(JSON.parse(raw));
        } catch (e) {
            return null;
        }
    };

    const loadConfigFromFile = async (path = CONFIG_PATH) => {
        try {
            const res = await fetch("/api/file/getFile", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({path}),
            });
            const text = await res.text();
            if (!text) {
                return null;
            }
            const parsed = JSON.parse(text);
            // 文件不存在等：内核返回 { code, msg, data }
            if (parsed && typeof parsed.code === "number" && !("hiddenDockTypes" in parsed)) {
                return null;
            }
            return normalizeConfig(parsed);
        } catch (e) {
            return null;
        }
    };

    const saveConfigToFile = async (next) => {
        config = normalizeConfig(next);
        const blob = new Blob([JSON.stringify(config, null, 2)], {type: "application/json"});
        const fd = new FormData();
        fd.append("path", CONFIG_PATH);
        fd.append("file", new File([blob], "config.json", {type: "application/json"}));
        fd.append("isDir", "false");
        fd.append("modTime", String(Date.now()));
        try {
            const res = await fetch("/api/file/putFile", {method: "POST", body: fd});
            const result = await res.json();
            if (result && typeof result.code === "number" && result.code !== 0) {
                console.warn("[starter] 保存配置失败", result);
                return false;
            }
            try {
                localStorage.removeItem(LEGACY_STORAGE_KEY);
            } catch (e) {
                /* ignore */
            }
            return true;
        } catch (e) {
            console.warn("[starter] 保存配置失败", e);
            return false;
        }
    };

    const initConfig = async () => {
        const fromFile = await loadConfigFromFile(CONFIG_PATH);
        if (fromFile) {
            config = fromFile;
            return;
        }
        const fromLegacyFile = await loadConfigFromFile(LEGACY_CONFIG_PATH);
        if (fromLegacyFile) {
            config = fromLegacyFile;
            await saveConfigToFile(fromLegacyFile);
            return;
        }
        const legacy = readLegacyLocal();
        if (legacy && legacy.hiddenDockTypes.length) {
            config = legacy;
            await saveConfigToFile(legacy);
            return;
        }
        config = {hiddenDockTypes: []};
    };

    const getDock = (layoutKey) => window.siyuan?.layout?.[layoutKey];

    const isHiddenType = (type) => config.hiddenDockTypes.includes(type);

    const isPanelOpen = (dock) => {
        if (!dock?.layout?.element) {
            return false;
        }
        const el = dock.layout.element;
        if (el.classList.contains("fn__none")) {
            return false;
        }
        if ((el.style.width || "").startsWith("0") || (el.style.height || "").startsWith("0")) {
            return false;
        }
        return el.clientWidth > 8 || el.clientHeight > 8;
    };

    const getActiveType = (dock) => {
        for (const group of dock.elements || []) {
            const active = group?.querySelector?.(".dock__item--active[data-type]");
            if (active) {
                return active.getAttribute("data-type") || "";
            }
        }
        return "";
    };

    const pickOpenType = (dock, layoutKey, fallbackType) => {
        const candidates = [lastType[layoutKey], fallbackType, ...Object.keys(dock.data || {})];
        for (const type of candidates) {
            if (type && dock.data?.[type] && !isHiddenType(type)) {
                return type;
            }
        }
        return "";
    };

    /** 与官方 dock 图标点击相同：toggleModel(type, false, true) */
    const clickDockType = (dock, type) => {
        if (!type || typeof dock.toggleModel !== "function") {
            return;
        }
        dock.toggleModel(type, false, true);
    };

    const toggleSidePanel = (layoutKey, fallbackType) => {
        const dock = getDock(layoutKey);
        if (!dock) {
            return;
        }
        if (isPanelOpen(dock)) {
            const active = getActiveType(dock);
            const type = active || lastType[layoutKey] || fallbackType;
            if (active) {
                lastType[layoutKey] = active;
            }
            clickDockType(dock, type);
            return;
        }
        const type = pickOpenType(dock, layoutKey, fallbackType);
        if (type) {
            lastType[layoutKey] = type;
        }
        clickDockType(dock, type);
    };

    const rememberDockClick = (e) => {
        const item = e.target?.closest?.(".dock__item[data-type]");
        if (!item || item.classList.contains("dock__item--pin")) {
            return;
        }
        const type = item.getAttribute("data-type");
        if (!type) {
            return;
        }
        for (const side of sides) {
            const dock = getDock(side.layoutKey);
            if (!dock?.elements) {
                continue;
            }
            if (dock.elements.some((group) => group?.contains?.(item))) {
                lastType[side.layoutKey] = type;
                break;
            }
        }
    };

    /**
     * 表层限制：已激活的 dock 图标再点时，拦住 click 冒泡到 window.globalClick，
     * 从而不会走 toggleModel(type, false, true) 收起侧栏。
     * 不改写 Dock.toggleModel / 不 hook 官方逻辑 → 顶栏两按钮直接调 API 仍可折叠。
     * 监听在 document 冒泡阶段（早于 window 上的 globalClick）。
     */
    const suppressActiveDockCollapse = (e) => {
        const item = e.target?.closest?.(".dock__item[data-type]");
        if (!item || item.classList.contains("dock__item--pin")) {
            return;
        }
        if (!item.classList.contains("dock__item--active")) {
            return;
        }
        e.stopPropagation();
    };

    /** 若正在显示将被隐藏的面板，先收起 */
    const closeIfActiveHidden = (hiddenTypes) => {
        const set = new Set(hiddenTypes);
        for (const side of sides) {
            const dock = getDock(side.layoutKey);
            if (!dock || !isPanelOpen(dock)) {
                continue;
            }
            const active = getActiveType(dock);
            if (active && set.has(active)) {
                lastType[side.layoutKey] = active;
                clickDockType(dock, active);
            }
        }
    };

    const applyHiddenDockTypes = () => {
        let style = document.getElementById(HIDE_STYLE_ID);
        if (!style) {
            style = document.createElement("style");
            style.id = HIDE_STYLE_ID;
            document.head.appendChild(style);
        }
        const rules = config.hiddenDockTypes
            .map((type) => {
                const safe = type.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
                return `.dock__item[data-type="${safe}"]{display:none!important}`;
            })
            .join("");
        style.textContent = rules;
    };

    const listDockTools = () => {
        const map = new Map();
        document.querySelectorAll(".dock__item[data-type]").forEach((el) => {
            if (el.classList.contains("dock__item--pin")) {
                return;
            }
            const type = el.getAttribute("data-type");
            if (!type || map.has(type)) {
                return;
            }
            let label = el.getAttribute("data-title") || el.getAttribute("aria-label") || type;
            label = String(label).split("\n")[0].trim();
            // 去掉快捷键后缀「 ⇧⌘A」之类
            label = label.replace(/\s+[⇧⌃⌥⌘↑↓←→\dA-Za-z+\-]+$/u, "").trim() || type;
            map.set(type, {type, label});
        });
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "zh"));
    };

    const closeSettingsDialog = () => {
        document.getElementById(DIALOG_ID)?.remove();
    };

    const openSettingsDialog = () => {
        closeSettingsDialog();
        const tools = listDockTools();
        const cancelText = window.siyuan?.languages?.cancel || "取消";
        const saveText = window.siyuan?.languages?.save || "保存";

        const rows = tools.length
            ? tools
                  .map(({type, label}) => {
                      // 开关打开 = 显示（当前可见则为开）
                      const checked = isHiddenType(type) ? "" : " checked";
                      return `<label class="fn__flex b3-label config-item">
  <div class="fn__flex-1">
    ${label}
    <div class="b3-label__text">data-type: ${type}</div>
  </div>
  <input class="b3-switch fn__flex-center" type="checkbox" data-starter-hide-type="${type}"${checked}>
</label>`;
                  })
                  .join("")
            : `<div class="b3-label">未检测到侧栏工具图标，请稍后再试。</div>`;

        const dialog = document.createElement("div");
        dialog.id = DIALOG_ID;
        dialog.className = "b3-dialog b3-dialog--open";
        dialog.innerHTML = `
<div class="b3-dialog__scrim" data-starter-dlg="scrim"></div>
<div class="b3-dialog__container" style="width:min(520px,92vw);max-height:80vh">
  <div class="b3-dialog__header">cursor极简 设置</div>
  <div class="b3-dialog__body">
    <div class="b3-dialog__content" style="overflow:auto;max-height:calc(80vh - 100px)">
      <div class="b3-label" style="border-bottom:none;padding-bottom:0">
        侧栏工具显示
        <div class="b3-label__text">开关打开 = 显示该工具图标；关闭 = 隐藏（仅本主题生效）</div>
      </div>
      ${rows}
      <div class="b3-label" style="margin-top:8px">
        配置保存位置
        <div class="b3-label__text" style="word-break:break-all;user-select:text">${CONFIG_PATH}</div>
      </div>
    </div>
    <div class="b3-dialog__action">
      <button class="b3-button b3-button--cancel" data-starter-dlg="cancel">${cancelText}</button>
      <div class="fn__space"></div>
      <button class="b3-button b3-button--text" data-starter-dlg="save">${saveText}</button>
    </div>
  </div>
</div>`;

        const onClose = () => {
            dialog.removeEventListener("click", onClick);
            document.removeEventListener("keydown", onKey, true);
            closeSettingsDialog();
        };
        const onClick = (e) => {
            const t = e.target?.closest?.("[data-starter-dlg]");
            if (!t) {
                return;
            }
            const act = t.getAttribute("data-starter-dlg");
            if (act === "scrim" || act === "cancel") {
                onClose();
                return;
            }
            if (act === "save") {
                const hidden = [];
                dialog.querySelectorAll("[data-starter-hide-type]").forEach((input) => {
                    if (!input.checked) {
                        hidden.push(input.getAttribute("data-starter-hide-type"));
                    }
                });
                closeIfActiveHidden(hidden);
                saveConfigToFile({hiddenDockTypes: hidden}).then((ok) => {
                    applyHiddenDockTypes();
                    onClose();
                    if (!ok && window.siyuan?.languages) {
                        /* 失败已 console.warn；仍关闭对话框以免卡死 */
                    }
                });
            }
        };
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            }
        };
        dialog.addEventListener("click", onClick);
        document.addEventListener("keydown", onKey, true);
        document.body.appendChild(dialog);
    };

    const injectPluginsMenuItem = () => {
        const menu = window.siyuan?.menus?.menu;
        if (!menu || typeof menu.addItem !== "function") {
            return;
        }
        const el = menu.element;
        if (!el || el.classList.contains("fn__none")) {
            return;
        }
        if (el.querySelector(`[data-id="${MENU_ITEM_ID}"]`)) {
            return;
        }
        if (typeof menu.addSeparator === "function") {
            menu.addSeparator({id: "starter-theme-settings-sep"});
        }
        menu.addItem({
            id: MENU_ITEM_ID,
            icon: "iconSettings",
            label: "cursor极简 设置",
            click() {
                openSettingsDialog();
            },
        });
    };

    const onBarPluginsClick = () => {
        // 等官方插件菜单建完再插入（与插件「配置」同级入口）
        requestAnimationFrame(() => {
            setTimeout(injectPluginsMenuItem, 0);
        });
    };

    const bindPluginsMenu = () => {
        const bar = document.getElementById("barPlugins");
        if (!bar || bar.dataset.starterSettingsBound === "1") {
            return !!bar;
        }
        bar.dataset.starterSettingsBound = "1";
        bar.addEventListener("click", onBarPluginsClick);
        return true;
    };

    const unbindPluginsMenu = () => {
        const bar = document.getElementById("barPlugins");
        if (bar) {
            bar.removeEventListener("click", onBarPluginsClick);
            delete bar.dataset.starterSettingsBound;
        }
    };

    const unmountToggles = () => {
        document.getElementById(TOGGLE_LEFT_ID)?.remove();
        document.getElementById(TOGGLE_RIGHT_ID)?.remove();
        // 兼容旧版合并容器
        document.getElementById("starterSideToggles")?.remove();
    };

    const mountToggles = () => {
        const toolbar = document.getElementById("toolbar");
        const barWorkspace = document.getElementById("barWorkspace");
        const windowControls = document.getElementById("windowControls");
        if (!toolbar || !barWorkspace || !windowControls) {
            return false;
        }
        if (document.getElementById(TOGGLE_LEFT_ID) && document.getElementById(TOGGLE_RIGHT_ID)) {
            return true;
        }
        if (!window.siyuan?.layout?.leftDock) {
            return false;
        }

        // 清掉旧位置/半残留
        unmountToggles();

        sides.forEach((side) => {
            const dock = getDock(side.layoutKey);
            const active = dock && getActiveType(dock);
            if (active) {
                lastType[side.layoutKey] = active;
            }
        });

        const mkBtn = (id, layoutKey, iconId, label) => {
            const btn = document.createElement("div");
            btn.id = id;
            btn.className = "toolbar__item ariaLabel starter-side-toggle";
            btn.dataset.starterSide = layoutKey;
            btn.setAttribute("aria-label", label);
            btn.setAttribute("role", "button");
            btn.setAttribute("tabindex", "0");
            btn.style.webkitAppRegion = "no-drag";
            btn.innerHTML = `<svg><use xlink:href="#${iconId}"></use></svg>`;

            const run = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const conf = sides.find((s) => s.layoutKey === layoutKey);
                toggleSidePanel(layoutKey, conf?.fallbackType || "file");
            };
            btn.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) {
                    return;
                }
                run(e);
            });
            btn.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    run(e);
                }
            });
            return btn;
        };

        // 左栏：紧挨「思源」标题（#barWorkspace）之后
        const leftBtn = mkBtn(TOGGLE_LEFT_ID, "leftDock", "iconPanelLeft", "显示/隐藏左侧栏");
        barWorkspace.insertAdjacentElement("afterend", leftBtn);

        // 右栏：最小化等窗口按钮（#windowControls）左侧
        const rightBtn = mkBtn(TOGGLE_RIGHT_ID, "rightDock", "iconPanelRight", "显示/隐藏右侧栏");
        toolbar.insertBefore(rightBtn, windowControls);
        return true;
    };

    const unmountOne = ({dockId, placeholderId}) => {
        const dock = document.getElementById(dockId);
        const ph = document.getElementById(placeholderId);
        if (dock) {
            const panel = dock.closest("." + PANEL_CLASS);
            if (panel) {
                panel.classList.remove(PANEL_CLASS);
            }
            dock.classList.remove(TOP_CLASS);
            delete dock.dataset.starterMounted;
        }
        if (!dock || !ph || !ph.parentNode) {
            return;
        }
        ph.parentNode.insertBefore(dock, ph);
        ph.remove();
    };

    const mountOne = ({dockId, panelSelector, placeholderId}) => {
        const dock = document.getElementById(dockId);
        const panel = document.querySelector(panelSelector);
        if (!dock || !panel) {
            return false;
        }
        if (dock.dataset.starterMounted === "1" && dock.parentElement === panel) {
            panel.classList.add(PANEL_CLASS);
            dock.classList.add(TOP_CLASS);
            return true;
        }

        if (!document.getElementById(placeholderId) && dock.parentElement !== panel) {
            const ph = document.createElement("div");
            ph.id = placeholderId;
            ph.setAttribute("hidden", "");
            dock.parentNode.insertBefore(ph, dock);
        }

        if (dock.parentElement !== panel) {
            panel.insertBefore(dock, panel.firstChild);
        } else if (panel.firstChild !== dock) {
            panel.insertBefore(dock, panel.firstChild);
        }

        dock.classList.add(TOP_CLASS);
        panel.classList.add(PANEL_CLASS);
        dock.dataset.starterMounted = "1";
        return true;
    };

    const mountAllDocks = () => sides.every((side) => mountOne(side));

    /** 大纲跟随：视口顶部附近的标题 → 官方 Outline.setCurrent */
    const OUTLINE_FOLLOW_TOP_SLOP = 8;
    const OUTLINE_FOLLOW_NEAR_BAND = 140;
    const OUTLINE_JUMP_IGNORE_MS = 500;
    let outlineFollowRaf = 0;
    let outlineFollowPending = null;
    let outlineJumpUntil = 0;

    const isOutlineModel = (model) =>
        !!(model && typeof model.setCurrent === "function" && typeof model.setCurrentByPreview === "function");

    const isUsableHeading = (el) => {
        if (!el || el.getAttribute("data-type") !== "NodeHeading") {
            return false;
        }
        if (el.closest(".bq, .callout-content, [data-type='NodeBlockQueryEmbed']")) {
            return false;
        }
        return true;
    };

    const collectOutlineModels = () => {
        const list = [];
        const seen = new Set();
        const push = (model) => {
            if (!isOutlineModel(model) || seen.has(model)) {
                return;
            }
            seen.add(model);
            list.push(model);
        };
        for (const key of ["leftDock", "rightDock", "bottomDock"]) {
            push(window.siyuan?.layout?.[key]?.data?.outline);
        }
        const walk = (node) => {
            if (!node) {
                return;
            }
            if (node.model) {
                push(node.model);
            }
            const children = node.children;
            if (Array.isArray(children)) {
                children.forEach(walk);
            }
        };
        walk(window.siyuan?.layout?.layout);
        return list;
    };

    const getProtyleRootId = (protyleEl) =>
        protyleEl?.querySelector?.(".protyle-title")?.getAttribute("data-node-id") || "";

    const headingBeforeOrSelf = (block) => {
        if (!block) {
            return null;
        }
        if (isUsableHeading(block)) {
            return block;
        }
        const wysiwyg = block.closest(".protyle-wysiwyg");
        if (!wysiwyg) {
            return null;
        }
        const headings = wysiwyg.querySelectorAll('[data-type="NodeHeading"]');
        let best = null;
        for (const h of headings) {
            if (!isUsableHeading(h)) {
                continue;
            }
            if (h === block || (h.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                best = h;
            }
        }
        return best;
    };

    const findViewportHeading = (protyleEl) => {
        const content = protyleEl.querySelector(".protyle-content");
        const wysiwyg = protyleEl.querySelector(".protyle-wysiwyg");
        if (!content || !wysiwyg) {
            return null;
        }
        const contentTop = content.getBoundingClientRect().top;
        const passedY = contentTop + OUTLINE_FOLLOW_TOP_SLOP;
        const bandY = contentTop + OUTLINE_FOLLOW_NEAR_BAND;
        const headings = wysiwyg.querySelectorAll('[data-type="NodeHeading"]');
        let lastPassed = null;
        let firstInBand = null;
        for (const h of headings) {
            if (!isUsableHeading(h)) {
                continue;
            }
            const top = h.getBoundingClientRect().top;
            if (top <= passedY) {
                lastPassed = h;
                continue;
            }
            if (!firstInBand && top <= bandY) {
                firstInBand = h;
            }
        }
        return firstInBand || lastPassed;
    };

    const getCaretHeading = (protyleEl) => {
        const wysiwyg = protyleEl.querySelector(".protyle-wysiwyg");
        const sel = window.getSelection();
        if (!wysiwyg || !sel || sel.rangeCount === 0) {
            return null;
        }
        const node = sel.getRangeAt(0).startContainer;
        if (!wysiwyg.contains(node)) {
            return null;
        }
        const el = node.nodeType === 1 ? node : node.parentElement;
        const block = el?.closest?.("[data-node-id]");
        return headingBeforeOrSelf(block);
    };

    const syncOutlineFromProtyle = (protyleEl, preferCaret) => {
        if (!protyleEl || protyleEl.classList.contains("fn__none")) {
            return;
        }
        const rootId = getProtyleRootId(protyleEl);
        if (!rootId) {
            return;
        }
        const heading = (preferCaret && getCaretHeading(protyleEl)) || findViewportHeading(protyleEl);
        if (!heading) {
            return;
        }
        const id = heading.getAttribute("data-node-id");
        if (!id) {
            return;
        }
        for (const outline of collectOutlineModels()) {
            if (outline.blockId && outline.blockId !== rootId) {
                continue;
            }
            const focused = outline.element?.querySelector?.(".b3-list-item--focus");
            if (focused?.getAttribute("data-node-id") === id) {
                continue;
            }
            outline.setCurrent(heading);
        }
    };

    const scheduleOutlineFollow = (protyleEl, preferCaret) => {
        outlineFollowPending = {protyleEl, preferCaret};
        if (outlineFollowRaf) {
            return;
        }
        outlineFollowRaf = requestAnimationFrame(() => {
            outlineFollowRaf = 0;
            const job = outlineFollowPending;
            outlineFollowPending = null;
            if (job) {
                syncOutlineFromProtyle(job.protyleEl, job.preferCaret);
            }
        });
    };

    const onOutlineJumpPointer = (e) => {
        const t = e.target;
        if (!(t instanceof Element)) {
            return;
        }
        if (!t.closest(".sy__outline .b3-list-item[data-node-id]")) {
            return;
        }
        outlineJumpUntil = Date.now() + OUTLINE_JUMP_IGNORE_MS;
    };

    const onEditorScrollCapture = (e) => {
        const t = e.target;
        if (!(t instanceof Element) || !t.classList.contains("protyle-content")) {
            return;
        }
        if (t.closest(".sy__outline")) {
            return;
        }
        if (!t.closest("#layouts .layout__center")) {
            return;
        }
        if (Date.now() < outlineJumpUntil) {
            return;
        }
        const protyleEl = t.closest(".protyle");
        scheduleOutlineFollow(protyleEl, false);
    };

    const onSelectionOutlineFollow = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            return;
        }
        const node = sel.getRangeAt(0).startContainer;
        const el = node.nodeType === 1 ? node : node.parentElement;
        const protyleEl = el?.closest?.("#layouts .layout__center .protyle");
        if (!protyleEl) {
            return;
        }
        scheduleOutlineFollow(protyleEl, true);
    };

    const onProtyleSwitchOutlineFollow = () => {
        const el =
            document.querySelector("#layouts .layout__center .layout__wnd--active .protyle:not(.fn__none)") ||
            document.querySelector("#layouts .layout__center .protyle:not(.fn__none)");
        if (el) {
            scheduleOutlineFollow(el, true);
        }
    };

    const startOutlineFollow = () => {
        document.addEventListener("pointerdown", onOutlineJumpPointer, true);
        document.addEventListener("scroll", onEditorScrollCapture, {capture: true, passive: true});
        document.addEventListener("selectionchange", onSelectionOutlineFollow);
        document.addEventListener("loaded-protyle-static", onProtyleSwitchOutlineFollow);
        document.addEventListener("switch-protyle", onProtyleSwitchOutlineFollow);
    };

    const stopOutlineFollow = () => {
        document.removeEventListener("pointerdown", onOutlineJumpPointer, true);
        document.removeEventListener("scroll", onEditorScrollCapture, true);
        document.removeEventListener("selectionchange", onSelectionOutlineFollow);
        document.removeEventListener("loaded-protyle-static", onProtyleSwitchOutlineFollow);
        document.removeEventListener("switch-protyle", onProtyleSwitchOutlineFollow);
        if (outlineFollowRaf) {
            cancelAnimationFrame(outlineFollowRaf);
            outlineFollowRaf = 0;
        }
        outlineFollowPending = null;
        outlineJumpUntil = 0;
    };

    /** 面包屑：隐藏官方块级条，在旁边画文档路径（避免官方异步 render 盖掉） */
    const PATH_BAR_CLASS = "starter-doc-path";
    const pathCrumbCache = new Map();
    const pathCrumbInflight = new Map();
    let pathBarHostObs = null;
    let pathBarTitleObs = null;
    let pathBarRaf = 0;

    const postJson = async (url, body) => {
        const res = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body),
        });
        return res.json();
    };

    const escapeHtml = (s) =>
        String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    const parsePathIds = (path) => {
        const ids = [];
        const re = /(\d{14}-[0-9a-z]+)/gi;
        let m = re.exec(path);
        while (m) {
            ids.push(m[1]);
            m = re.exec(path);
        }
        return ids;
    };

    const openDocById = (id) => {
        if (!id) {
            return;
        }
        if (typeof window.openFileByURL === "function") {
            window.openFileByURL(`siyuan://blocks/${id}`);
            return;
        }
        const treeItem = document.querySelector(`#layouts .sy__file .b3-list-item[data-node-id="${id}"]`);
        if (treeItem) {
            treeItem.click();
            return;
        }
        const a = document.createElement("a");
        a.href = `siyuan://blocks/${id}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const loadPathCrumbs = async (rootId) => {
        if (!rootId) {
            return null;
        }
        if (pathCrumbCache.has(rootId)) {
            return pathCrumbCache.get(rootId);
        }
        if (pathCrumbInflight.has(rootId)) {
            return pathCrumbInflight.get(rootId);
        }
        const job = (async () => {
            const [fullRes, pathRes] = await Promise.all([
                postJson("/api/filetree/getFullHPathByID", {id: rootId}),
                postJson("/api/filetree/getPathByID", {id: rootId}),
            ]);
            if (fullRes?.code !== 0 || pathRes?.code !== 0) {
                return null;
            }
            const names = String(fullRes.data || "")
                .split("/")
                .map((s) => s.trim())
                .filter(Boolean);
            const pathData = pathRes.data || {};
            const ids = parsePathIds(pathData.path || "");
            const box = pathData.notebook || "";
            if (!names.length) {
                return null;
            }
            const crumbs = names.map((name, index) => {
                const last = index === names.length - 1;
                const id = index === 0 ? box : ids[index - 1] || (last ? rootId : "");
                return {name, box, id};
            });
            pathCrumbCache.set(rootId, crumbs);
            return crumbs;
        })();
        pathCrumbInflight.set(rootId, job);
        try {
            return await job;
        } finally {
            pathCrumbInflight.delete(rootId);
        }
    };

    const crumbsHtml = (crumbs, rootId) => {
        const n = crumbs.length;
        return crumbs
            .map((c, index) => {
                const last = index === n - 1;
                const keep = n <= 3 || index === 0 || index >= n - 2;
                const idAttr = c.id ? ` data-starter-doc-id="${c.id}"` : "";
                const item = `<span class="starter-doc-path__item${keep ? " starter-doc-path__item--keep" : " starter-doc-path__item--mid"}" data-starter-path-item="1"${idAttr} data-starter-root="${rootId}" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</span>`;
                if (last) {
                    return item;
                }
                return `${item}<span class="starter-doc-path__sep">/</span>`;
            })
            .join("");
    };

    const ensurePathBar = (host) => {
        let bar = host.querySelector(`:scope > .${PATH_BAR_CLASS}`);
        if (bar) {
            return bar;
        }
        const official = host.querySelector(":scope > .protyle-breadcrumb__bar");
        if (!official) {
            return null;
        }
        bar = document.createElement("div");
        bar.className = `protyle-breadcrumb__bar ${PATH_BAR_CLASS}`;
        official.insertAdjacentElement("afterend", bar);
        bar.addEventListener(
            "wheel",
            (event) => {
                bar.scrollLeft += event.deltaY;
            },
            {passive: true}
        );
        return bar;
    };

    const bindPathTitle = (title) => {
        if (!pathBarTitleObs || !title || title.dataset.starterPathBound === "1") {
            return;
        }
        title.dataset.starterPathBound = "1";
        pathBarTitleObs.observe(title, {attributes: true, attributeFilter: ["data-node-id"]});
    };

    const fillPathBar = async (bar, rootId) => {
        if (!bar || !rootId) {
            return;
        }
        const req = String((Number(bar.dataset.starterPathReq) || 0) + 1);
        bar.dataset.starterPathReq = req;
        const crumbs = await loadPathCrumbs(rootId);
        if (bar.dataset.starterPathReq !== req || !crumbs || !bar.isConnected) {
            return;
        }
        if (bar.dataset.starterPathRoot === rootId && bar.querySelector("[data-starter-path-item]")) {
            return;
        }
        bar.innerHTML = crumbsHtml(crumbs, rootId);
        bar.dataset.starterPathRoot = rootId;
    };

    const refreshAllPathBars = () => {
        document.querySelectorAll("#layouts .layout__center .protyle-breadcrumb").forEach((host) => {
            const protyleEl = host.closest(".protyle");
            const title = protyleEl?.querySelector(".protyle-title");
            bindPathTitle(title);
            const rootId = title?.getAttribute("data-node-id") || "";
            const bar = ensurePathBar(host);
            if (bar && rootId) {
                fillPathBar(bar, rootId);
            }
        });
    };

    const schedulePathBars = () => {
        if (pathBarRaf) {
            return;
        }
        pathBarRaf = requestAnimationFrame(() => {
            pathBarRaf = 0;
            refreshAllPathBars();
        });
    };

    const onProtylePathBreadcrumb = () => {
        schedulePathBars();
    };

    const onPathCrumbClick = (e) => {
        const item = e.target?.closest?.("[data-starter-path-item]");
        if (!item || !item.closest(`#layouts .layout__center .${PATH_BAR_CLASS}`)) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const docId = item.getAttribute("data-starter-doc-id");
        const rootId = item.getAttribute("data-starter-root");
        if (docId && docId !== rootId) {
            openDocById(docId);
        }
    };

    const startPathBreadcrumb = () => {
        pathBarTitleObs = new MutationObserver(schedulePathBars);
        pathBarHostObs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const n of m.addedNodes) {
                    if (n.nodeType !== 1) {
                        continue;
                    }
                    if (n.classList?.contains("protyle-breadcrumb") || n.querySelector?.(".protyle-breadcrumb")) {
                        schedulePathBars();
                        return;
                    }
                }
            }
        });
        const center = document.querySelector("#layouts .layout__center") || document.body;
        pathBarHostObs.observe(center, {childList: true, subtree: true});
        document.addEventListener("click", onPathCrumbClick, true);
        document.addEventListener("loaded-protyle-static", onProtylePathBreadcrumb);
        document.addEventListener("switch-protyle", onProtylePathBreadcrumb);
        schedulePathBars();
    };

    const stopPathBreadcrumb = () => {
        document.removeEventListener("click", onPathCrumbClick, true);
        document.removeEventListener("loaded-protyle-static", onProtylePathBreadcrumb);
        document.removeEventListener("switch-protyle", onProtylePathBreadcrumb);
        pathBarHostObs?.disconnect();
        pathBarTitleObs?.disconnect();
        pathBarHostObs = null;
        pathBarTitleObs = null;
        if (pathBarRaf) {
            cancelAnimationFrame(pathBarRaf);
            pathBarRaf = 0;
        }
        document.querySelectorAll(`.${PATH_BAR_CLASS}`).forEach((el) => el.remove());
        document.querySelectorAll(".protyle-title[data-starter-path-bound]").forEach((el) => {
            delete el.dataset.starterPathBound;
        });
        pathCrumbCache.clear();
        pathCrumbInflight.clear();
    };

    const applyTopbarHeight = () => {
        const dpr = window.devicePixelRatio || 1;
        const cssPx = TOPBAR_SCREEN_PX / dpr;
        document.documentElement.style.setProperty(
            "--starter-topbar-height",
            `${Number(cssPx.toFixed(4))}px`
        );
    };

    const startTopbarHeight = () => {
        applyTopbarHeight();
        window.addEventListener("resize", applyTopbarHeight);
        window.visualViewport?.addEventListener("resize", applyTopbarHeight);
    };

    const stopTopbarHeight = () => {
        window.removeEventListener("resize", applyTopbarHeight);
        window.visualViewport?.removeEventListener("resize", applyTopbarHeight);
        document.documentElement.style.removeProperty("--starter-topbar-height");
    };

    const tryMount = async () => {
        await initConfig();
        applyTopbarHeight();
        applyHiddenDockTypes();
        startOutlineFollow();
        startPathBreadcrumb();
        const okDocks = mountAllDocks();
        const okToggles = mountToggles();
        const okMenu = bindPluginsMenu();
        if (okDocks && okToggles && okMenu) {
            return;
        }
        const obs = new MutationObserver(() => {
            applyHiddenDockTypes();
            schedulePathBars();
            const d = mountAllDocks();
            const t = mountToggles();
            const m = bindPluginsMenu();
            if (d && t && m) {
                obs.disconnect();
            }
        });
        obs.observe(document.body, {childList: true, subtree: true});
        setTimeout(() => obs.disconnect(), 15000);
    };

    document.addEventListener("click", rememberDockClick, true);
    document.addEventListener("click", suppressActiveDockCollapse, false);
    startTopbarHeight();

    window.destroyTheme = async () => {
        document.removeEventListener("click", rememberDockClick, true);
        document.removeEventListener("click", suppressActiveDockCollapse, false);
        stopTopbarHeight();
        stopOutlineFollow();
        stopPathBreadcrumb();
        unbindPluginsMenu();
        closeSettingsDialog();
        document.getElementById(HIDE_STYLE_ID)?.remove();
        unmountToggles();
        sides.forEach(unmountOne);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tryMount, {once: true});
    } else {
        tryMount();
    }
})();
