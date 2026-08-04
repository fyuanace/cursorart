/**
 * starter —
 * 1) 左/右 dock 图标挂到对应侧栏顶部横条
 * 2) 顶栏左右侧栏显隐按钮
 * 3) 主题设置（入口同插件：#barPlugins 菜单 → Starter 设置）
 * 4) 已选中 dock 图标再点不收起侧栏（仅拦 UI click，不改 toggleModel）
 */
(function () {
    const TOP_CLASS = "starter-dock--sidebar-top";
    const PANEL_CLASS = "starter-dock-panel--with-top";
    const TOGGLE_WRAP_ID = "starterSideToggles";
    const STORAGE_KEY = "starter-theme-config";
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
    let config = loadConfig();

    /** 每侧记住上一次选中的 dock type（展开时用） */
    const lastType = {
        leftDock: "file",
        rightDock: "outline",
    };

    function loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return {hiddenDockTypes: []};
            }
            const parsed = JSON.parse(raw);
            return {
                hiddenDockTypes: Array.isArray(parsed.hiddenDockTypes)
                    ? parsed.hiddenDockTypes.filter((t) => typeof t === "string")
                    : [],
            };
        } catch (e) {
            return {hiddenDockTypes: []};
        }
    }

    function saveConfig(next) {
        config = next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

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
  <div class="b3-dialog__header">Starter 设置</div>
  <div class="b3-dialog__body">
    <div class="b3-dialog__content" style="overflow:auto;max-height:calc(80vh - 100px)">
      <div class="b3-label" style="border-bottom:none;padding-bottom:0">
        侧栏工具显示
        <div class="b3-label__text">开关打开 = 显示该工具图标；关闭 = 隐藏（仅本主题生效）</div>
      </div>
      ${rows}
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
                saveConfig({hiddenDockTypes: hidden});
                applyHiddenDockTypes();
                onClose();
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
            label: "Starter 设置",
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
        document.getElementById(TOGGLE_WRAP_ID)?.remove();
    };

    const mountToggles = () => {
        const toolbar = document.getElementById("toolbar");
        const drag = document.getElementById("drag");
        if (!toolbar || !drag) {
            return false;
        }
        if (document.getElementById(TOGGLE_WRAP_ID)) {
            return true;
        }
        if (!window.siyuan?.layout?.leftDock) {
            return false;
        }

        sides.forEach((side) => {
            const dock = getDock(side.layoutKey);
            const active = dock && getActiveType(dock);
            if (active) {
                lastType[side.layoutKey] = active;
            }
        });

        const wrap = document.createElement("div");
        wrap.id = TOGGLE_WRAP_ID;
        wrap.className = "starter-side-toggles fn__flex";

        const mkBtn = (layoutKey, iconId, label) => {
            const btn = document.createElement("div");
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

        wrap.appendChild(mkBtn("leftDock", "iconPanelLeft", "显示/隐藏左侧栏"));
        wrap.appendChild(mkBtn("rightDock", "iconPanelRight", "显示/隐藏右侧栏"));
        toolbar.insertBefore(wrap, drag);
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

    const tryMount = () => {
        applyHiddenDockTypes();
        const okDocks = mountAllDocks();
        const okToggles = mountToggles();
        const okMenu = bindPluginsMenu();
        if (okDocks && okToggles && okMenu) {
            return;
        }
        const obs = new MutationObserver(() => {
            applyHiddenDockTypes();
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

    window.destroyTheme = async () => {
        document.removeEventListener("click", rememberDockClick, true);
        document.removeEventListener("click", suppressActiveDockCollapse, false);
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
