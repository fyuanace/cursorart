/**
 * cursor极简 —
 * 1) 左/右 dock 图标挂到对应侧栏顶部横条
 * 2) 顶栏左右侧栏显隐：左在「思源」标题后，右在窗口最小化左侧
 * 3) 主题设置（入口同插件：#barPlugins 菜单 → cursor极简 设置）
 * 4) 已选中 dock 图标再点不收起侧栏（仅拦 UI click，不改 toggleModel）
 * 5) 正文滚动/光标位置同步右侧大纲当前项（复用官方 Outline.setCurrent）
 * 6) 面包屑改为文档路径（笔记本/文件夹/文档），不再显示页内块层级
 * 7) 标题栏截图高度 55 物理像素：CSS = 55 / devicePixelRatio
 * 8) 指向文档的块引用显示文档图标并加粗（不改标题/段落引用）
 * 9) 文件树顶部「最近打开」区块
 * 10) 面包屑收藏按钮 + 文件树「收藏」区块
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

    const DEFAULT_BLOCK_LH = 1.625;
    const DEFAULT_RECENT_MAX = 8;
    const DEFAULT_FAV_MAX = 8;
    const clampBlockLh = (n) => {
        const x = Number(n);
        if (!Number.isFinite(x)) {
            return DEFAULT_BLOCK_LH;
        }
        return Math.min(2.6, Math.max(1.2, Math.round(x * 20) / 20));
    };
    const clampListMax = (n) => {
        const x = Number(n);
        if (!Number.isFinite(x)) {
            return DEFAULT_RECENT_MAX;
        }
        return Math.min(32, Math.max(0, Math.round(x)));
    };
    const listShowFromParsed = (explicit, maxRaw, defaultMax) => {
        const max = clampListMax(maxRaw ?? defaultMax);
        if (typeof explicit === "boolean") {
            return {show: explicit, max: max > 0 ? max : defaultMax};
        }
        if (max <= 0) {
            return {show: false, max: defaultMax};
        }
        return {show: true, max};
    };

    const MAX_FAVORITE_DOCS = 100;
    const normalizeFavoriteDocs = (list) => {
        if (!Array.isArray(list)) {
            return [];
        }
        const seen = new Set();
        const out = [];
        for (const item of list) {
            const id = typeof item === "string" ? item : item?.id;
            if (!id || typeof id !== "string" || seen.has(id)) {
                continue;
            }
            seen.add(id);
            out.push({
                id,
                title: typeof item?.title === "string" ? item.title : "",
                icon: typeof item?.icon === "string" ? item.icon : "",
            });
            if (out.length >= MAX_FAVORITE_DOCS) {
                break;
            }
        }
        return out;
    };

    /** @type {{ hiddenDockTypes: string[], customDocRefStyle: boolean, plainTableHead: boolean, blockLineHeight: number, hideNotebooks: boolean, hideTabNewDoc: boolean, hideTabSwitch: boolean, showRecentDocs: boolean, showFavoriteDocs: boolean, recentDocsMax: number, favoriteDocsMax: number, favoriteDocs: {id: string, title: string, icon: string}[], recentDocs: {id: string, title: string, icon: string}[] }} */
    let config = {
        hiddenDockTypes: [],
        customDocRefStyle: true,
        plainTableHead: true,
        blockLineHeight: DEFAULT_BLOCK_LH,
        hideNotebooks: false,
        hideTabNewDoc: false,
        hideTabSwitch: false,
        showRecentDocs: true,
        showFavoriteDocs: true,
        recentDocsMax: DEFAULT_RECENT_MAX,
        favoriteDocsMax: DEFAULT_FAV_MAX,
        favoriteDocs: [],
        recentDocs: [],
    };
    let applyDocRefFeature = () => {};
    let applyStyleFeatures = () => {};
    let applyHideNotebooks = () => {};
    let applyRecentDocs = () => {};
    let applyFavoriteDocs = () => {};
    let syncFavButtons = () => {};
    /** 设置对话框拖动时的临时条数/显隐；null 表示用已保存配置 */
    let previewRecentMax = null;
    let previewFavoriteMax = null;
    let previewShowRecentDocs = null;
    let previewShowFavoriteDocs = null;

    /** 每侧记住上一次选中的 dock type（展开时用） */
    const lastType = {
        leftDock: "file",
        rightDock: "outline",
    };

    const normalizeConfig = (parsed) => {
        const recentMeta = listShowFromParsed(
            parsed?.showRecentDocs,
            parsed?.recentDocsMax,
            DEFAULT_RECENT_MAX
        );
        const favMeta = listShowFromParsed(
            parsed?.showFavoriteDocs,
            parsed?.favoriteDocsMax,
            DEFAULT_FAV_MAX
        );
        return {
            hiddenDockTypes: Array.isArray(parsed?.hiddenDockTypes)
                ? parsed.hiddenDockTypes.filter((t) => typeof t === "string")
                : [],
            customDocRefStyle: parsed?.customDocRefStyle !== false,
            plainTableHead: parsed?.plainTableHead !== false,
            blockLineHeight: clampBlockLh(parsed?.blockLineHeight ?? DEFAULT_BLOCK_LH),
            hideNotebooks: parsed?.hideNotebooks === true,
            hideTabNewDoc: parsed?.hideTabNewDoc === true,
            hideTabSwitch: parsed?.hideTabSwitch === true,
            showRecentDocs: recentMeta.show,
            showFavoriteDocs: favMeta.show,
            recentDocsMax: recentMeta.max,
            favoriteDocsMax: favMeta.max,
            favoriteDocs: normalizeFavoriteDocs(parsed?.favoriteDocs),
            recentDocs: normalizeFavoriteDocs(parsed?.recentDocs).slice(0, recentMeta.max),
        };
    };

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
        config = normalizeConfig({...config, ...next});
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
        config = normalizeConfig({});
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

        const settingRow = (title, desc, controlHtml) => `<div class="starter-settings-row">
  <div class="starter-settings-text">
    <div class="starter-settings-title">${title}</div>
    ${desc ? `<div class="starter-settings-desc">${desc}</div>` : ""}
  </div>
  ${controlHtml ? `<div class="starter-settings-action">${controlHtml}</div>` : ""}
</div>`;
        const settingSection = (title, desc, rowsHtml) => `<div class="starter-settings-section">
  <div class="starter-settings-section__title">${title}</div>
  ${desc ? `<div class="starter-settings-section__desc">${desc}</div>` : ""}
  ${rowsHtml}
</div>`;
        const switchHtml = (attr, checked) =>
            `<input class="b3-switch fn__flex-center" type="checkbox" ${attr}${checked}>`;
        const sliderHtml = (attr, min, max, step, value, valAttr) =>
            `<div class="fn__flex starter-settings-lh">
  <input class="b3-slider" type="range" min="${min}" max="${max}" step="${step}" value="${value}" ${attr}>
  <span class="starter-settings-lh__val" ${valAttr}>${value}</span>
</div>`;

        const rows = tools.length
            ? tools
                  .map(({type, label}) => {
                      const checked = isHiddenType(type) ? "" : " checked";
                      return settingRow(
                          label,
                          `data-type: ${type}`,
                          switchHtml(`data-starter-hide-type="${type}"`, checked)
                      );
                  })
                  .join("")
            : `<div class="starter-settings-empty">未检测到侧栏工具图标，请稍后再试。</div>`;

        const docRefChecked = config.customDocRefStyle !== false ? " checked" : "";
        const tableHeadChecked = config.plainTableHead !== false ? " checked" : "";
        const hideNbChecked = config.hideNotebooks === true ? " checked" : "";
        const hideTabNewChecked = config.hideTabNewDoc === true ? " checked" : "";
        const hideTabSwitchChecked = config.hideTabSwitch === true ? " checked" : "";
        const showRecentChecked = config.showRecentDocs !== false ? " checked" : "";
        const showFavChecked = config.showFavoriteDocs !== false ? " checked" : "";
        const blockLh = clampBlockLh(config.blockLineHeight);
        const recentMax = Math.max(1, clampListMax(config.recentDocsMax));
        const favMax = Math.max(1, clampListMax(config.favoriteDocsMax));

        const dialog = document.createElement("div");
        dialog.id = DIALOG_ID;
        dialog.className = "b3-dialog b3-dialog--open";
        dialog.innerHTML = `
<div class="b3-dialog__scrim" data-starter-dlg="scrim"></div>
<div class="b3-dialog__container starter-settings-window">
  <div class="b3-dialog__header">cursor极简 设置</div>
  <div class="b3-dialog__body">
    <div class="b3-dialog__content starter-settings-content">
      <div class="starter-settings-tabs">
        <button type="button" class="starter-settings-tab starter-settings-tab--active" data-starter-dlg="tab" data-starter-tab="dock">侧栏</button>
        <button type="button" class="starter-settings-tab" data-starter-dlg="tab" data-starter-tab="style">样式</button>
      </div>
      <div class="starter-settings-panes">
      <div data-starter-pane="dock" class="starter-settings-pane--active">
        ${settingSection(
            "侧栏工具",
            "开关打开 = 显示该工具图标；关闭 = 隐藏（仅本主题生效）",
            rows
        )}
        ${settingSection(
            "关于",
            "",
            settingRow(
                "配置保存位置",
                `<span class="starter-settings-path__val">${CONFIG_PATH}</span>`
            )
        )}
      </div>
      <div data-starter-pane="style">
        ${settingSection(
            "文档树",
            "",
            settingRow(
                "隐藏笔记本",
                "文件树不显示笔记本名称，其中文档作为第一级列出",
                switchHtml("data-starter-hide-notebook", hideNbChecked)
            ) +
            settingRow(
                "显示最近打开",
                "文件树顶部列出最近打开的文档",
                switchHtml("data-starter-show-recent", showRecentChecked)
            ) +
            settingRow(
                "最近打开条数",
                "最多显示几条",
                sliderHtml("data-starter-recent-max", 1, 32, 1, recentMax, "data-starter-recent-max-val")
            ) +
            settingRow(
                "显示收藏",
                "文件树顶部列出收藏的文档；面包屑五角星仍可用来收藏",
                switchHtml("data-starter-show-fav", showFavChecked)
            ) +
            settingRow(
                "收藏条数",
                "默认显示条数，超出可点「更多」展开",
                sliderHtml("data-starter-fav-max", 1, 32, 1, favMax, "data-starter-fav-max-val")
            )
        )}
        ${settingSection(
            "Tab 栏",
            "",
            settingRow(
                "隐藏新建文档",
                "藏掉文档 Tab 条上的「+」",
                switchHtml("data-starter-hide-tab-new", hideTabNewChecked)
            ) +
            settingRow(
                "隐藏页签切换",
                "藏掉文档 Tab 条右侧的下拉按钮",
                switchHtml("data-starter-hide-tab-switch", hideTabSwitchChecked)
            )
        )}
        ${settingSection(
            "正文",
            "",
            settingRow(
                "链接样式",
                "开启 = 文档引用显示图标、加粗与下划线；关闭 = 思源原生块引用",
                switchHtml("data-starter-doc-ref-style", docRefChecked)
            ) +
            settingRow(
                "表格表头不加粗",
                "开启 = 表头与单元格同字重；关闭 = 官方强制加粗",
                switchHtml("data-starter-plain-table-head", tableHeadChecked)
            ) +
            settingRow(
                "块行间距",
                "正文行高倍数，官方约 1.625",
                sliderHtml("data-starter-block-lh", 1.2, 2.6, 0.05, blockLh.toFixed(2), "data-starter-block-lh-val")
            )
        )}
      </div>
      </div>
    </div>
    <div class="b3-dialog__action starter-settings-footer">
      <button class="b3-button b3-button--cancel" data-starter-dlg="cancel">${cancelText}</button>
      <div class="fn__space"></div>
      <button class="b3-button b3-button--text" data-starter-dlg="save">${saveText}</button>
    </div>
  </div>
</div>`;

        const onClose = (revert) => {
            previewRecentMax = null;
            previewFavoriteMax = null;
            previewShowRecentDocs = null;
            previewShowFavoriteDocs = null;
            if (revert) {
                applyStyleFeatures();
                applyHideNotebooks();
                applyRecentDocs();
                applyFavoriteDocs();
            }
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
                onClose(true);
                return;
            }
            if (act === "tab") {
                const tab = t.getAttribute("data-starter-tab");
                dialog.querySelectorAll("[data-starter-tab]").forEach((btn) => {
                    btn.classList.toggle("starter-settings-tab--active", btn.getAttribute("data-starter-tab") === tab);
                });
                dialog.querySelectorAll("[data-starter-pane]").forEach((pane) => {
                    pane.classList.toggle(
                        "starter-settings-pane--active",
                        pane.getAttribute("data-starter-pane") === tab
                    );
                });
                return;
            }
            if (act === "save") {
                const hidden = [];
                dialog.querySelectorAll("[data-starter-hide-type]").forEach((input) => {
                    if (!input.checked) {
                        hidden.push(input.getAttribute("data-starter-hide-type"));
                    }
                });
                const customDocRefStyle = !!dialog.querySelector("[data-starter-doc-ref-style]")?.checked;
                const plainTableHead = !!dialog.querySelector("[data-starter-plain-table-head]")?.checked;
                const hideNotebooks = !!dialog.querySelector("[data-starter-hide-notebook]")?.checked;
                const hideTabNewDoc = !!dialog.querySelector("[data-starter-hide-tab-new]")?.checked;
                const hideTabSwitch = !!dialog.querySelector("[data-starter-hide-tab-switch]")?.checked;
                const showRecentDocs = !!dialog.querySelector("[data-starter-show-recent]")?.checked;
                const showFavoriteDocs = !!dialog.querySelector("[data-starter-show-fav]")?.checked;
                const blockLineHeight = clampBlockLh(dialog.querySelector("[data-starter-block-lh]")?.value);
                const recentDocsMax = Math.max(1, clampListMax(dialog.querySelector("[data-starter-recent-max]")?.value));
                const favoriteDocsMax = Math.max(1, clampListMax(dialog.querySelector("[data-starter-fav-max]")?.value));
                closeIfActiveHidden(hidden);
                previewRecentMax = null;
                previewFavoriteMax = null;
                previewShowRecentDocs = null;
                previewShowFavoriteDocs = null;
                saveConfigToFile({
                    hiddenDockTypes: hidden,
                    customDocRefStyle,
                    plainTableHead,
                    hideNotebooks,
                    hideTabNewDoc,
                    hideTabSwitch,
                    showRecentDocs,
                    showFavoriteDocs,
                    blockLineHeight,
                    recentDocsMax,
                    favoriteDocsMax,
                    recentDocs: normalizeFavoriteDocs(config.recentDocs).slice(0, recentDocsMax),
                }).then((ok) => {
                    applyHiddenDockTypes();
                    applyDocRefFeature();
                    applyStyleFeatures();
                    applyHideNotebooks();
                    applyRecentDocs();
                    applyFavoriteDocs();
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
                onClose(true);
            }
        };
        dialog.addEventListener("click", onClick);
        document.addEventListener("keydown", onKey, true);
        document.body.appendChild(dialog);
        const lhInput = dialog.querySelector("[data-starter-block-lh]");
        const lhVal = dialog.querySelector("[data-starter-block-lh-val]");
        lhInput?.addEventListener("input", () => {
            const v = clampBlockLh(lhInput.value);
            if (lhVal) {
                lhVal.textContent = v.toFixed(2);
            }
            document.documentElement.classList.add("starter-block-line-height");
            document.documentElement.style.setProperty("--starter-block-line-height", String(v));
        });
        dialog.querySelector("[data-starter-plain-table-head]")?.addEventListener("change", (e) => {
            document.documentElement.classList.toggle("starter-plain-table-head", !!e.target.checked);
        });
        dialog.querySelector("[data-starter-hide-notebook]")?.addEventListener("change", (e) => {
            const on = !!e.target.checked;
            document.documentElement.classList.toggle("starter-hide-notebook", on);
            if (on) {
                startHideNotebooks();
            } else {
                stopHideNotebooks();
            }
        });
        dialog.querySelector("[data-starter-hide-tab-new]")?.addEventListener("change", (e) => {
            document.documentElement.classList.toggle("starter-hide-tab-new", !!e.target.checked);
        });
        dialog.querySelector("[data-starter-hide-tab-switch]")?.addEventListener("change", (e) => {
            document.documentElement.classList.toggle("starter-hide-tab-more", !!e.target.checked);
        });
        const recentInput = dialog.querySelector("[data-starter-recent-max]");
        const recentVal = dialog.querySelector("[data-starter-recent-max-val]");
        const syncRecentControls = () => {
            const on = !!dialog.querySelector("[data-starter-show-recent]")?.checked;
            if (recentInput) {
                recentInput.disabled = !on;
            }
            previewShowRecentDocs = on;
            applyRecentDocs();
        };
        dialog.querySelector("[data-starter-show-recent]")?.addEventListener("change", syncRecentControls);
        syncRecentControls();
        recentInput?.addEventListener("input", () => {
            const v = Math.max(1, clampListMax(recentInput.value));
            if (recentVal) {
                recentVal.textContent = String(v);
            }
            previewRecentMax = v;
            applyRecentDocs();
        });
        const favMaxInput = dialog.querySelector("[data-starter-fav-max]");
        const favMaxVal = dialog.querySelector("[data-starter-fav-max-val]");
        const syncFavControls = () => {
            const on = !!dialog.querySelector("[data-starter-show-fav]")?.checked;
            if (favMaxInput) {
                favMaxInput.disabled = !on;
            }
            previewShowFavoriteDocs = on;
            applyFavoriteDocs();
        };
        dialog.querySelector("[data-starter-show-fav]")?.addEventListener("change", syncFavControls);
        syncFavControls();
        favMaxInput?.addEventListener("input", () => {
            const v = Math.max(1, clampListMax(favMaxInput.value));
            if (favMaxVal) {
                favMaxVal.textContent = String(v);
            }
            previewFavoriteMax = v;
            applyFavoriteDocs();
        });
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
        startOutlineDefaultExpand();
    };

    const stopOutlineFollow = () => {
        document.removeEventListener("pointerdown", onOutlineJumpPointer, true);
        document.removeEventListener("scroll", onEditorScrollCapture, true);
        document.removeEventListener("selectionchange", onSelectionOutlineFollow);
        document.removeEventListener("loaded-protyle-static", onProtyleSwitchOutlineFollow);
        document.removeEventListener("switch-protyle", onProtyleSwitchOutlineFollow);
        stopOutlineDefaultExpand();
        if (outlineFollowRaf) {
            cancelAnimationFrame(outlineFollowRaf);
            outlineFollowRaf = 0;
        }
        outlineFollowPending = null;
        outlineJumpUntil = 0;
    };

    /** 大纲：第一次成为父标题时默认展开，不改用户已折叠的项 */
    const outlineKnownParents = new Set();
    const outlinePrimedRoots = new Set();
    let outlineExpandObs = null;
    let outlineExpandRaf = 0;

    const outlineIsFiltering = (outlineEl) => {
        const input = outlineEl
            ?.closest?.(".sy__outline, .fn__flex-1")
            ?.querySelector?.("input.b3-text-field.search__label");
        return !!(input && input.value);
    };

    const expandOutlineLi = (li) => {
        const arrow = li.querySelector(".b3-list-item__arrow");
        arrow?.classList.add("b3-list-item__arrow--open");
        const next = li.nextElementSibling;
        if (next && next.tagName === "UL") {
            next.classList.remove("fn__none");
        }
        if (next?.nextElementSibling?.tagName === "UL") {
            next.nextElementSibling.classList.remove("fn__none");
        }
    };

    const expandNewOutlineParents = () => {
        for (const outline of collectOutlineModels()) {
            const el = outline.element;
            if (!(el instanceof HTMLElement) || outlineIsFiltering(el)) {
                continue;
            }
            const rootId = outline.blockId || "";
            const parents = [];
            el.querySelectorAll("li.b3-list-item[data-node-id]").forEach((li) => {
                const next = li.nextElementSibling;
                const id = li.getAttribute("data-node-id");
                if (!id) {
                    return;
                }
                if (next && next.tagName === "UL") {
                    parents.push({
                        li,
                        id,
                        collapsed: next.classList.contains("fn__none"),
                    });
                } else {
                    outlineKnownParents.delete(id);
                }
            });
            if (!outlinePrimedRoots.has(rootId)) {
                const allCollapsed = parents.length > 0 && parents.every((p) => p.collapsed);
                if (allCollapsed) {
                    parents.forEach((p) => {
                        expandOutlineLi(p.li);
                        outlineKnownParents.add(p.id);
                    });
                    if (typeof outline.saveExpendIds === "function") {
                        outline.saveExpendIds();
                    }
                } else {
                    parents.forEach((p) => outlineKnownParents.add(p.id));
                }
                outlinePrimedRoots.add(rootId);
                continue;
            }
            let changed = false;
            parents.forEach((p) => {
                if (outlineKnownParents.has(p.id)) {
                    return;
                }
                outlineKnownParents.add(p.id);
                if (p.collapsed) {
                    expandOutlineLi(p.li);
                    changed = true;
                }
            });
            if (changed && typeof outline.saveExpendIds === "function") {
                outline.saveExpendIds();
            }
        }
    };

    const scheduleOutlineDefaultExpand = () => {
        if (outlineExpandRaf) {
            return;
        }
        outlineExpandRaf = requestAnimationFrame(() => {
            outlineExpandRaf = 0;
            expandNewOutlineParents();
        });
    };

    const startOutlineDefaultExpand = () => {
        outlineExpandObs?.disconnect();
        const host = document.querySelector("#layouts") || document.body;
        outlineExpandObs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                const t = m.target;
                if (t instanceof Element && t.closest(".sy__outline")) {
                    scheduleOutlineDefaultExpand();
                    return;
                }
                for (const n of m.addedNodes) {
                    if (n.nodeType === 1 && (n.classList?.contains("sy__outline") || n.querySelector?.(".sy__outline"))) {
                        scheduleOutlineDefaultExpand();
                        return;
                    }
                }
            }
        });
        outlineExpandObs.observe(host, {childList: true, subtree: true});
        scheduleOutlineDefaultExpand();
    };

    const stopOutlineDefaultExpand = () => {
        outlineExpandObs?.disconnect();
        outlineExpandObs = null;
        if (outlineExpandRaf) {
            cancelAnimationFrame(outlineExpandRaf);
            outlineExpandRaf = 0;
        }
        outlineKnownParents.clear();
        outlinePrimedRoots.clear();
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
            syncFavButtons();
        });
    };

    const schedulePathBars = () => {
        if (pathBarRaf) {
            return;
        }
        pathBarRaf = requestAnimationFrame(() => {
            pathBarRaf = 0;
            refreshAllPathBars();
            scheduleRecentDocs(true);
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
        document.querySelectorAll("#layouts .layout__center .starter-fav-btn").forEach((el) => el.remove());
        document.querySelectorAll(".protyle-title[data-starter-path-bound]").forEach((el) => {
            delete el.dataset.starterPathBound;
        });
        pathCrumbCache.clear();
        pathCrumbInflight.clear();
    };

    /** 文档块引用：识别 rootID===id；图标写进 document 样式表，禁止改 span.style / 正文 */
    const DOC_REF_SEL =
        ".b3-typography span[data-type~='block-ref'][data-id], " +
        "#layouts .layout__center .protyle-wysiwyg span[data-type~='block-ref'][data-id]";
    const DOC_REF_STYLE_ID = "starterDocRefStyle";
    const DOC_REF_LEAK_RE = /\{:[^}]*--starter-doc-ref-[^}]*\}/g;
    const DOC_REF_CLASSES = [
        "starter-doc-ref",
        "starter-doc-ref--skip",
        "starter-doc-ref--icon",
        "starter-doc-ref--img",
    ];
    const docRefCache = new Map();
    const docRefInflight = new Map();
    /** @type {Map<string, {kind: "skip"|"icon"|"img", glyph?: string, src?: string}>} */
    const docRefPainted = new Map();
    let docRefObs = null;
    let docRefTimer = 0;
    let docRefStarted = false;
    let docRefCleaning = false;

    const hexToEmoji = (icon) => {
        if (!icon || /[./]/.test(icon)) {
            return "";
        }
        try {
            return String.fromCodePoint(
                ...String(icon)
                    .split("-")
                    .map((p) => parseInt(p, 16))
            );
        } catch {
            return "";
        }
    };

    const defaultDocGlyph = () => {
        const raw = window.siyuan?.storage?.["local-images"]?.file || "1f4c4";
        return hexToEmoji(raw) || "📄";
    };

    const loadDocRefMeta = (id) => {
        if (docRefCache.has(id)) {
            return Promise.resolve(docRefCache.get(id));
        }
        if (docRefInflight.has(id)) {
            return docRefInflight.get(id);
        }
        const job = (async () => {
            const tree = metaFromFileTree(id);
            if (tree) {
                docRefCache.set(id, tree);
                return tree;
            }
            const res = await postJson("/api/block/getBlockInfo", {id});
            const isDoc = res?.code === 0 && res.data?.rootID === id;
            const meta = {isDoc, icon: isDoc ? res.data?.rootIcon || "" : ""};
            docRefCache.set(id, meta);
            return meta;
        })();
        docRefInflight.set(id, job);
        return job.finally(() => docRefInflight.delete(id));
    };

    const metaFromFileTree = (id) => {
        const li = document.querySelector(`#layouts .sy__file .b3-list-item[data-node-id="${id}"]`);
        if (!li) {
            return null;
        }
        const wrap = li.querySelector(":scope > .b3-list-item__icon");
        const img = wrap?.querySelector("img");
        const src = img?.getAttribute("src") || "";
        if (src.includes("/emojis/")) {
            return {isDoc: true, icon: src.split("/emojis/")[1].split("?")[0]};
        }
        if (src.includes("api/icon")) {
            return {isDoc: true, icon: src.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "")};
        }
        const emoji = wrap?.textContent?.trim() || "";
        return {isDoc: true, icon: emoji};
    };

    const collectDocRefSpans = () => {
        const spans = [];
        document.querySelectorAll(DOC_REF_SEL).forEach((span) => {
            if (!(span instanceof HTMLElement)) {
                return;
            }
            if (span.classList.contains("av__celltext") || span.closest(".code-block, .hljs")) {
                return;
            }
            if (!span.getAttribute("data-id")) {
                return;
            }
            spans.push(span);
        });
        return spans;
    };

    const glyphFromIcon = (icon) => {
        const hex = hexToEmoji(icon);
        if (hex) {
            return hex;
        }
        if (icon && !/[./]/.test(icon) && !/^[0-9a-f-]{4,}$/i.test(icon)) {
            return icon;
        }
        return defaultDocGlyph();
    };

    const escCssId = (id) => (window.CSS?.escape ? CSS.escape(id) : String(id));

    const cssContent = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;

    const docRefSels = (ids, pseudo = "") =>
        ids
            .flatMap((id) => {
                const e = escCssId(id);
                return [
                    `html.starter-custom-doc-ref .b3-typography span[data-type~="block-ref"][data-id="${e}"]:not(.av__celltext)${pseudo}`,
                    `html.starter-custom-doc-ref .protyle-wysiwyg [data-node-id] span[data-type~="block-ref"][data-id="${e}"]:not(.av__celltext)${pseudo}`,
                ];
            })
            .join(",\n");

    const metaToPaint = (meta) => {
        if (!meta.isDoc) {
            return {kind: "skip"};
        }
        const icon = (meta.icon || "").trim();
        if (icon && (icon.includes(".") || icon.startsWith("api/"))) {
            const src = icon.startsWith("api/") || icon.startsWith("/")
                ? `/${icon.replace(/^\//, "")}`
                : `/emojis/${icon}`;
            return {kind: "img", src};
        }
        return {kind: "icon", glyph: glyphFromIcon(icon)};
    };

    const rememberDocRef = (id, meta) => {
        const next = metaToPaint(meta);
        const prev = docRefPainted.get(id);
        if (prev && prev.kind === next.kind && prev.glyph === next.glyph && prev.src === next.src) {
            return false;
        }
        docRefPainted.set(id, next);
        return true;
    };

    const renderDocRefSheet = () => {
        let el = document.getElementById(DOC_REF_STYLE_ID);
        if (!el) {
            el = document.createElement("style");
            el.id = DOC_REF_STYLE_ID;
            document.head.appendChild(el);
        }
        const skips = [];
        const docs = [];
        const icons = new Map();
        const imgs = new Map();
        for (const [id, info] of docRefPainted) {
            if (info.kind === "skip") {
                skips.push(id);
                continue;
            }
            docs.push(id);
            if (info.kind === "icon") {
                const list = icons.get(info.glyph) || [];
                list.push(id);
                icons.set(info.glyph, list);
            } else if (info.src) {
                const list = imgs.get(info.src) || [];
                list.push(id);
                imgs.set(info.src, list);
            }
        }
        const parts = [];
        if (skips.length) {
            parts.push(`${docRefSels(skips)} {
    font-weight: inherit;
    color: var(--b3-protyle-inline-blockref-color);
    text-decoration: none;
    border-bottom: none;
    padding: 0;
    background-image: none;
}`);
        }
        if (docs.length) {
            parts.push(`${docRefSels(docs)} {
    position: relative;
    padding-left: 1.28em;
    padding-bottom: 0.14em;
    font-weight: 700;
    color: var(--b3-theme-on-background);
    text-decoration: none;
    background-image: linear-gradient(var(--b3-border-color), var(--b3-border-color));
    background-repeat: no-repeat;
    background-size: 100% 1px;
    background-position: 0 100%;
    background-origin: content-box;
    background-clip: content-box;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    transition: none;
}`);
            parts.push(`${docRefSels(docs, "::before")} {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    display: block;
    width: 1.05em;
    margin: 0;
    pointer-events: none;
    background-image: none;
}`);
        }
        for (const [glyph, ids] of icons) {
            parts.push(`${docRefSels(ids, "::before")} {
    content: ${cssContent(glyph)};
    font-weight: 400;
    font-family: var(--b3-font-family-emoji);
    line-height: 1;
    text-align: center;
    speak: never;
}`);
        }
        for (const [src, ids] of imgs) {
            const url = String(src).replace(/\\/g, "/").replace(/"/g, "%22");
            parts.push(`${docRefSels(ids, "::before")} {
    content: "";
    width: 1.05em;
    height: 1.05em;
    vertical-align: -0.18em;
    background: url("${url}") center / contain no-repeat;
}`);
        }
        el.textContent = parts.join("\n");
    };

    const stripDocRefPollution = (span) => {
        let textChanged = false;
        span.style.removeProperty("--starter-doc-ref-glyph");
        span.style.removeProperty("--starter-doc-ref-img");
        if (span.getAttribute("style") === "") {
            span.removeAttribute("style");
        }
        span.classList.remove(...DOC_REF_CLASSES);
        const cleanText = (node) => {
            if (!node || node.nodeType !== Node.TEXT_NODE) {
                return;
            }
            const next = node.textContent.replace(DOC_REF_LEAK_RE, "");
            if (next !== node.textContent) {
                node.textContent = next;
                textChanged = true;
            }
        };
        span.childNodes.forEach(cleanText);
        cleanText(span.nextSibling);
        return textChanged;
    };

    const refreshDocRefs = async () => {
        const spans = collectDocRefSpans();
        if (!spans.length && !docRefPainted.size) {
            return;
        }
        docRefCleaning = true;
        const dirtyHosts = new Set();
        try {
            for (const span of spans) {
                if (stripDocRefPollution(span)) {
                    const host = span.closest(".protyle-wysiwyg");
                    if (host) {
                        dirtyHosts.add(host);
                    }
                }
            }
            dirtyHosts.forEach((host) => {
                host.dispatchEvent(new InputEvent("input", {bubbles: true, cancelable: true}));
            });
        } finally {
            requestAnimationFrame(() => {
                docRefCleaning = false;
            });
        }
        let sheetDirty = false;
        const needApi = [];
        for (const span of spans) {
            const id = span.getAttribute("data-id");
            let meta = docRefCache.get(id);
            if (!meta) {
                const tree = metaFromFileTree(id);
                if (tree) {
                    docRefCache.set(id, tree);
                    meta = tree;
                }
            }
            if (meta) {
                if (rememberDocRef(id, meta)) {
                    sheetDirty = true;
                }
            } else {
                needApi.push(id);
            }
        }
        if (sheetDirty) {
            renderDocRefSheet();
        }
        if (!needApi.length) {
            return;
        }
        const ids = [...new Set(needApi)];
        await Promise.all(ids.map((id) => loadDocRefMeta(id)));
        let afterDirty = false;
        for (const id of ids) {
            const meta = docRefCache.get(id);
            if (meta && rememberDocRef(id, meta)) {
                afterDirty = true;
            }
        }
        if (afterDirty) {
            renderDocRefSheet();
        }
    };

    const scheduleDocRefs = () => {
        if (docRefCleaning || docRefTimer) {
            return;
        }
        docRefTimer = requestAnimationFrame(() => {
            docRefTimer = 0;
            refreshDocRefs();
        });
    };

    const startDocRefs = () => {
        if (docRefStarted) {
            refreshDocRefs();
            return;
        }
        docRefStarted = true;
        document.addEventListener("loaded-protyle-static", scheduleDocRefs);
        document.addEventListener("switch-protyle", scheduleDocRefs);
        const host = document.querySelector("#layouts .layout__center") || document.body;
        docRefObs = new MutationObserver(scheduleDocRefs);
        docRefObs.observe(host, {childList: true, subtree: true});
        refreshDocRefs();
    };

    const stopDocRefs = () => {
        document.removeEventListener("loaded-protyle-static", scheduleDocRefs);
        document.removeEventListener("switch-protyle", scheduleDocRefs);
        docRefObs?.disconnect();
        docRefObs = null;
        if (docRefTimer) {
            cancelAnimationFrame(docRefTimer);
            docRefTimer = 0;
        }
        document.getElementById(DOC_REF_STYLE_ID)?.remove();
        document.querySelectorAll(DOC_REF_SEL).forEach((el) => {
            if (!(el instanceof HTMLElement)) {
                return;
            }
            el.classList.remove(...DOC_REF_CLASSES);
            el.style.removeProperty("--starter-doc-ref-glyph");
            el.style.removeProperty("--starter-doc-ref-img");
            if (el.getAttribute("style") === "") {
                el.removeAttribute("style");
            }
        });
        docRefCache.clear();
        docRefInflight.clear();
        docRefPainted.clear();
        docRefStarted = false;
    };

    applyDocRefFeature = () => {
        const on = config.customDocRefStyle !== false;
        document.documentElement.classList.toggle("starter-custom-doc-ref", on);
        if (on) {
            startDocRefs();
        } else {
            stopDocRefs();
        }
    };

    const FILE_TREE_SEL = "#layouts .sy__file";
    let fileTreeObs = null;
    let fileTreeRaf = 0;

    const expandFileTreeNotebooks = () => {
        document.querySelectorAll(`${FILE_TREE_SEL} ul[data-url] > li[data-type="navigation-root"]`).forEach((li) => {
            const arrow = li.querySelector(":scope > .b3-list-item__toggle .b3-list-item__arrow");
            if (arrow && !arrow.classList.contains("b3-list-item__arrow--open")) {
                li.querySelector(":scope > .b3-list-item__toggle")?.click();
            }
        });
    };

    const refreshHideNotebooks = () => {
        if (!document.documentElement.classList.contains("starter-hide-notebook")) {
            return;
        }
        expandFileTreeNotebooks();
    };

    const scheduleHideNotebooks = () => {
        if (fileTreeRaf) {
            return;
        }
        fileTreeRaf = requestAnimationFrame(() => {
            fileTreeRaf = 0;
            refreshHideNotebooks();
        });
    };

    const startHideNotebooks = () => {
        if (!fileTreeObs) {
            const host = document.querySelector("#layouts") || document.body;
            fileTreeObs = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    const t = m.target;
                    if (t instanceof Element && t.closest(".sy__file")) {
                        scheduleHideNotebooks();
                        return;
                    }
                    for (const n of m.addedNodes) {
                        if (
                            n.nodeType === 1 &&
                            (n.classList?.contains("sy__file") || n.querySelector?.(".sy__file"))
                        ) {
                            scheduleHideNotebooks();
                            return;
                        }
                    }
                }
            });
            fileTreeObs.observe(host, {childList: true, subtree: true});
        }
        expandFileTreeNotebooks();
    };

    const stopHideNotebooks = () => {
        fileTreeObs?.disconnect();
        fileTreeObs = null;
        if (fileTreeRaf) {
            cancelAnimationFrame(fileTreeRaf);
            fileTreeRaf = 0;
        }
    };

    applyHideNotebooks = () => {
        const on = config.hideNotebooks === true;
        document.documentElement.classList.toggle("starter-hide-notebook", on);
        if (on) {
            startHideNotebooks();
        } else {
            stopHideNotebooks();
        }
    };

    const RECENT_HOST_CLASS = "starter-recent-docs";
    const FAV_HOST_CLASS = "starter-fav-docs";
    const FAV_BTN_CLASS = "starter-fav-btn";
    const SCROLL_CLASS = "starter-file-scroll";
    const STAR_SVG =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.1l3.25 6.58 7.26.8-5.48 5.07 1.54 7.23L12 17.2 5.43 20.78l1.54-7.23L1.49 8.48l7.26-.8L12 1.1z"/></svg>';
    const TREE_TOGGLE_SPACE =
        '<span class="b3-list-item__toggle"><svg class="b3-list-item__arrow fn__hidden"><use xlink:href="#iconRight"></use></svg></span>';
    const isRecentShown = () => (previewShowRecentDocs ?? config.showRecentDocs) !== false;
    const isFavShown = () => (previewShowFavoriteDocs ?? config.showFavoriteDocs) !== false;
    const getRecentMax = () => (isRecentShown() ? clampListMax(previewRecentMax ?? config.recentDocsMax) : 0);
    const getFavMax = () => (isFavShown() ? clampListMax(previewFavoriteMax ?? config.favoriteDocsMax) : 0);

    const isClosedNotebookList = (el, fileEl) =>
        el === fileEl.lastElementChild &&
        el.tagName === "UL" &&
        el.classList.contains("b3-list") &&
        !el.getAttribute("data-url");

    const ensureFileScroll = (fileEl) => {
        const icons = fileEl.querySelector(":scope > .block__icons");
        if (!icons) {
            return fileEl.querySelector(`:scope > .${SCROLL_CLASS}`);
        }
        let scroll = fileEl.querySelector(`:scope > .${SCROLL_CLASS}`);
        if (!scroll) {
            if (!icons.nextElementSibling) {
                return null;
            }
            const toMove = [];
            for (let el = icons.nextElementSibling; el; el = el.nextElementSibling) {
                if (el.classList.contains(SCROLL_CLASS) || isClosedNotebookList(el, fileEl)) {
                    break;
                }
                toMove.push(el);
            }
            scroll = document.createElement("div");
            scroll.className = SCROLL_CLASS;
            icons.insertAdjacentElement("afterend", scroll);
            toMove.forEach((el) => scroll.appendChild(el));
        }
        const stray = [];
        for (let el = scroll.nextElementSibling; el; el = el.nextElementSibling) {
            if (isClosedNotebookList(el, fileEl) || el.classList.contains(SCROLL_CLASS)) {
                break;
            }
            stray.push(el);
        }
        stray.forEach((el) => scroll.appendChild(el));
        return scroll;
    };

    const unwrapFileScroll = () => {
        document.querySelectorAll(`#layouts .sy__file > .${SCROLL_CLASS}`).forEach((scroll) => {
            const parent = scroll.parentElement;
            if (!parent) {
                scroll.remove();
                return;
            }
            while (scroll.firstChild) {
                parent.insertBefore(scroll.firstChild, scroll);
            }
            scroll.remove();
        });
    };

    const isTreeChild = (el) =>
        el &&
        !el.classList.contains(FAV_HOST_CLASS) &&
        !el.classList.contains(RECENT_HOST_CLASS) &&
        !el.classList.contains(SCROLL_CLASS);
    let recentRecordTimer = 0;
    let recentMountObs = null;
    let recentStarted = false;
    let recentCollapsed = false;
    let recentRenderKey = "";

    const getActiveDocId = () => {
        const title =
            document.querySelector(
                "#layouts .layout__center .layout__wnd--active .protyle:not(.fn__none) .protyle-title"
            ) || document.querySelector("#layouts .layout__center .protyle:not(.fn__none) .protyle-title");
        const fromTitle = title?.getAttribute("data-node-id") || "";
        if (fromTitle) {
            return fromTitle;
        }
        const tab =
            document.querySelector(
                "#layouts .layout__center .layout__wnd--active .layout-tab-bar .item--focus:not(.item--readonly)"
            ) ||
            document.querySelector("#layouts .layout__center .layout-tab-bar .item--focus:not(.item--readonly)");
        const raw = tab?.getAttribute("data-initdata");
        if (!raw) {
            return "";
        }
        try {
            const data = JSON.parse(raw);
            return data.rootId || data.rootID || "";
        } catch (err) {
            return "";
        }
    };

    const snapshotDoc = (id, hintEl) => {
        const titleEl =
            hintEl?.querySelector?.(".protyle-title") ||
            document.querySelector(`#layouts .layout__center .protyle-title[data-node-id="${id}"]`);
        const name = titleEl?.querySelector(".protyle-title__input")?.textContent?.trim() || "";
        const hintName = hintEl?.querySelector?.(":scope > .b3-list-item__text")?.textContent?.trim() || "";
        const treeLi = document.querySelector(`#layouts .sy__file .b3-list-item[data-node-id="${id}"]`);
        const treeName = treeLi?.querySelector(":scope > .b3-list-item__text")?.textContent?.trim() || "";
        const tree = metaFromFileTree(id);
        const known =
            config.favoriteDocs.find((d) => d.id === id) || config.recentDocs.find((d) => d.id === id);
        return {
            id,
            title: name || hintName || treeName || known?.title || "",
            icon: tree?.icon || known?.icon || "",
        };
    };

    const recentIconInner = (icon) => {
        const paint = metaToPaint({isDoc: true, icon: (icon || "").trim()});
        if (paint.kind === "img" && paint.src) {
            return `<img src="${escapeHtml(paint.src)}" alt="">`;
        }
        return escapeHtml(paint.glyph || defaultDocGlyph());
    };

    const removeRecentHosts = () => {
        document.querySelectorAll(`#layouts .sy__file .${RECENT_HOST_CLASS}`).forEach((el) => el.remove());
        recentRenderKey = "";
    };

    const onRecentHostClick = (e) => {
        const host = e.currentTarget;
        const from = e.target instanceof Element ? e.target : e.target?.parentElement;
        const toggle = from?.closest?.("[data-starter-recent='toggle']");
        if (toggle && host.contains(toggle)) {
            e.preventDefault();
            e.stopPropagation();
            recentCollapsed = !host.classList.contains("starter-recent-docs--collapsed");
            host.classList.toggle("starter-recent-docs--collapsed", recentCollapsed);
            host.querySelector(".starter-recent-docs__head .b3-list-item__arrow")
                ?.classList.toggle("b3-list-item__arrow--open", !recentCollapsed);
            return;
        }
        const item = from?.closest?.("[data-starter-recent-doc]");
        if (!item || !host.contains(item)) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        openDocById(item.getAttribute("data-node-id"));
    };

    const ensureRecentHost = (fileEl) => {
        const scroll = ensureFileScroll(fileEl);
        if (!scroll) {
            return null;
        }
        let host = scroll.querySelector(`:scope > .${RECENT_HOST_CLASS}`);
        if (host) {
            return host;
        }
        host = document.createElement("div");
        host.className = RECENT_HOST_CLASS;
        host.innerHTML = `<div class="b3-list-item starter-recent-docs__head" data-starter-recent="toggle">
  <span class="b3-list-item__toggle">
    <svg class="b3-list-item__arrow b3-list-item__arrow--open"><use xlink:href="#iconRight"></use></svg>
  </span>
  <span class="b3-list-item__text">最近打开</span>
</div>
<ul class="b3-list b3-list--background starter-recent-docs__list"></ul>`;
        host.addEventListener("click", onRecentHostClick);
        const fav = scroll.querySelector(`:scope > .${FAV_HOST_CLASS}`);
        const tree = [...scroll.children].find(isTreeChild);
        if (fav) {
            fav.insertAdjacentElement("afterend", host);
        } else if (tree) {
            scroll.insertBefore(host, tree);
        } else {
            scroll.appendChild(host);
        }
        return host;
    };

    const renderRecentHosts = (items) => {
        const max = getRecentMax();
        if (max <= 0 || !items.length) {
            removeRecentHosts();
            return;
        }
        const currentId = getActiveDocId();
        const shown = items.slice(0, max);
        const key = `${max}|${recentCollapsed ? 1 : 0}|${currentId}|${shown
            .map((d) => `${d.id || ""}\t${d.title || ""}\t${d.icon || ""}`)
            .join("|")}`;
        const files = document.querySelectorAll(FILE_TREE_SEL);
        if (!files.length) {
            return;
        }
        files.forEach((fileEl) => {
            const host = ensureRecentHost(fileEl);
            if (!host) {
                return;
            }
            host.classList.toggle("starter-recent-docs--collapsed", recentCollapsed);
            const arrow = host.querySelector(".starter-recent-docs__head .b3-list-item__arrow");
            arrow?.classList.toggle("b3-list-item__arrow--open", !recentCollapsed);
            const list = host.querySelector(".starter-recent-docs__list");
            if (!list) {
                return;
            }
            if (key === recentRenderKey && list.childElementCount) {
                list.querySelectorAll("[data-starter-recent-doc]").forEach((li) => {
                    li.classList.toggle(
                        "starter-recent-docs__item--current",
                        li.getAttribute("data-node-id") === currentId
                    );
                });
                return;
            }
            list.innerHTML = shown
                .map((item) => {
                    const id = item.id || "";
                    const title = item.title || "无标题";
                    const current = id && id === currentId ? " starter-recent-docs__item--current" : "";
                    return `<li class="b3-list-item${current}" data-node-id="${escapeHtml(id)}" data-starter-recent-doc>
  ${TREE_TOGGLE_SPACE}
  <span class="b3-list-item__icon">${recentIconInner(item.icon)}</span>
  <span class="b3-list-item__text">${escapeHtml(title)}</span>
</li>`;
                })
                .join("");
        });
        recentRenderKey = key;
    };

    const renderStoredRecentDocs = () => {
        renderRecentHosts(config.recentDocs);
    };

    const recordRecentDocById = async (id, hintEl) => {
        const persistMax = clampListMax(config.recentDocsMax);
        if (persistMax <= 0) {
            renderStoredRecentDocs();
            return;
        }
        if (!id) {
            renderStoredRecentDocs();
            return;
        }
        const item = snapshotDoc(id, hintEl);
        const prev = config.recentDocs[0];
        if (
            prev?.id === item.id &&
            prev.title === item.title &&
            prev.icon === item.icon &&
            config.recentDocs.length <= persistMax
        ) {
            renderStoredRecentDocs();
            return;
        }
        const next = [item, ...config.recentDocs.filter((d) => d.id !== id)].slice(0, persistMax);
        const save = saveConfigToFile({recentDocs: next});
        renderStoredRecentDocs();
        await save;
    };

    const recordRecentDoc = () => recordRecentDocById(getActiveDocId());

    let pendingRecordId = "";
    let pendingRecordHint = null;
    let recentRenderTimer = 0;
    let recentPollTimer = 0;
    const scheduleRecord = (id, hintEl) => {
        if (id) {
            pendingRecordId = id;
            pendingRecordHint = hintEl || null;
        }
        if (recentRecordTimer) {
            clearTimeout(recentRecordTimer);
        }
        recentRecordTimer = setTimeout(() => {
            recentRecordTimer = 0;
            const recId = pendingRecordId || getActiveDocId();
            const hint = pendingRecordHint;
            pendingRecordId = "";
            pendingRecordHint = null;
            recordRecentDocById(recId, hint);
        }, 150);
    };

    const scheduleRecentDocs = (record) => {
        if (record) {
            scheduleRecord("", null);
            return;
        }
        if (recentRenderTimer) {
            clearTimeout(recentRenderTimer);
        }
        recentRenderTimer = setTimeout(() => {
            recentRenderTimer = 0;
            renderStoredRecentDocs();
        }, 80);
    };

    const onProtyleRecentDocs = (e) => {
        const protyle = e?.detail?.protyle;
        const id = protyle?.block?.rootID || protyle?.options?.blockId || "";
        scheduleRecord(id, protyle?.element);
    };

    const getSiyuanPlugins = () => {
        const list = window.siyuan?.ws?.app?.plugins || window.siyuan?.app?.plugins;
        return Array.isArray(list) ? list : [];
    };

    const recentBusBinds = [];
    let recentBusPoll = 0;
    let recentCustomBus = null;
    const bindPluginBuses = () => {
        const register = window.siyuan?.registerCustomEventBus;
        if (!recentCustomBus && typeof register === "function") {
            try {
                recentCustomBus = register("cursorart-recent");
                recentCustomBus?.on?.("switch-protyle", onProtyleRecentDocs);
                recentCustomBus?.on?.("loaded-protyle-static", onProtyleRecentDocs);
            } catch (err) {
                recentCustomBus = null;
            }
        }
        getSiyuanPlugins().forEach((p) => {
            if (!p?.eventBus?.on || recentBusBinds.some((b) => b.bus === p.eventBus)) {
                return;
            }
            p.eventBus.on("switch-protyle", onProtyleRecentDocs);
            p.eventBus.on("loaded-protyle-static", onProtyleRecentDocs);
            recentBusBinds.push({bus: p.eventBus});
        });
    };
    const unbindPluginBuses = () => {
        recentBusBinds.forEach(({bus}) => {
            bus.off?.("switch-protyle", onProtyleRecentDocs);
            bus.off?.("loaded-protyle-static", onProtyleRecentDocs);
        });
        recentBusBinds.length = 0;
        recentCustomBus?.off?.("switch-protyle", onProtyleRecentDocs);
        recentCustomBus?.off?.("loaded-protyle-static", onProtyleRecentDocs);
        recentCustomBus = null;
        if (recentBusPoll) {
            clearInterval(recentBusPoll);
            recentBusPoll = 0;
        }
    };

    const tabRootId = (tab) => {
        const raw = tab?.getAttribute?.("data-initdata");
        if (!raw) {
            return "";
        }
        try {
            const data = JSON.parse(raw);
            return data.rootId || data.rootID || "";
        } catch (err) {
            return "";
        }
    };

    const onRecentOpenPointer = (e) => {
        const from = e.target instanceof Element ? e.target : e.target?.parentElement;
        if (!from) {
            return;
        }
        if (from.closest?.(".b3-list-item__toggle, .b3-list-item__action")) {
            return;
        }
        const docLi = from.closest?.(
            "[data-starter-recent-doc], [data-starter-fav-doc], #layouts .sy__file li[data-type='navigation-file'][data-node-id]"
        );
        if (docLi) {
            const id = docLi.getAttribute("data-node-id");
            if (id) {
                scheduleRecord(id, docLi);
            }
            return;
        }
        const tab = from.closest?.("#layouts .layout-tab-bar .item:not(.item--readonly)");
        if (tab) {
            scheduleRecord(tabRootId(tab), null);
        }
    };

    const onRecentActiveMut = (mutations) => {
        for (const m of mutations) {
            if (m.type === "childList") {
                for (const n of m.addedNodes) {
                    if (
                        n.nodeType === 1 &&
                        (n.classList?.contains("protyle") ||
                            n.classList?.contains("protyle-title") ||
                            n.querySelector?.(".protyle-title, .protyle"))
                    ) {
                        scheduleRecentDocs(true);
                        return;
                    }
                }
                continue;
            }
            const t = m.target;
            if (!(t instanceof Element)) {
                continue;
            }
            if (m.attributeName === "data-node-id" && t.classList.contains("protyle-title")) {
                scheduleRecentDocs(true);
                return;
            }
            if (m.attributeName === "class") {
                if (
                    t.classList.contains("protyle") ||
                    t.classList.contains("layout__wnd") ||
                    (t.classList.contains("item") && t.closest(".layout-tab-bar"))
                ) {
                    scheduleRecentDocs(true);
                    return;
                }
            }
        }
    };

    let recentActiveObs = null;
    const attachRecentActiveObs = () => {
        if (recentActiveObs) {
            return true;
        }
        const center = document.querySelector("#layouts .layout__center");
        if (!center) {
            return false;
        }
        recentActiveObs = new MutationObserver(onRecentActiveMut);
        recentActiveObs.observe(center, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "data-node-id"],
        });
        return true;
    };

    const startRecentDocs = () => {
        if (recentStarted) {
            return;
        }
        recentStarted = true;
        document.addEventListener("loaded-protyle-static", onProtyleRecentDocs);
        document.addEventListener("switch-protyle", onProtyleRecentDocs);
        document.addEventListener("pointerdown", onRecentOpenPointer, true);
        bindPluginBuses();
        recentBusPoll = setInterval(bindPluginBuses, 1000);
        setTimeout(() => {
            if (recentBusPoll) {
                clearInterval(recentBusPoll);
                recentBusPoll = 0;
            }
        }, 12000);
        attachRecentActiveObs();
        recentPollTimer = setInterval(() => {
            if (!attachRecentActiveObs()) {
                return;
            }
            const id = getActiveDocId();
            if (id && id !== config.recentDocs[0]?.id) {
                scheduleRecord(id, null);
            }
        }, 400);
        const host = document.querySelector("#layouts") || document.body;
        recentMountObs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const n of m.addedNodes) {
                    if (
                        n.nodeType === 1 &&
                        (n.classList?.contains("sy__file") || n.querySelector?.(".sy__file"))
                    ) {
                        scheduleRecentDocs(false);
                        return;
                    }
                }
            }
        });
        recentMountObs.observe(host, {childList: true, subtree: true});
        scheduleRecentDocs(true);
    };

    const stopRecentDocs = () => {
        recentStarted = false;
        document.removeEventListener("loaded-protyle-static", onProtyleRecentDocs);
        document.removeEventListener("switch-protyle", onProtyleRecentDocs);
        document.removeEventListener("pointerdown", onRecentOpenPointer, true);
        unbindPluginBuses();
        recentActiveObs?.disconnect();
        recentActiveObs = null;
        recentMountObs?.disconnect();
        recentMountObs = null;
        if (recentRecordTimer) {
            clearTimeout(recentRecordTimer);
            recentRecordTimer = 0;
        }
        if (recentRenderTimer) {
            clearTimeout(recentRenderTimer);
            recentRenderTimer = 0;
        }
        if (recentPollTimer) {
            clearInterval(recentPollTimer);
            recentPollTimer = 0;
        }
        removeRecentHosts();
    };

    applyRecentDocs = () => {
        startRecentDocs();
        renderStoredRecentDocs();
    };

    const isFavDoc = (id) => !!(id && config.favoriteDocs.some((d) => d.id === id));

    const toggleFavoriteDoc = async (id, protyleEl) => {
        if (!id) {
            return;
        }
        let next;
        if (isFavDoc(id)) {
            next = config.favoriteDocs.filter((d) => d.id !== id);
        } else {
            next = [snapshotDoc(id, protyleEl), ...config.favoriteDocs.filter((d) => d.id !== id)];
        }
        await saveConfigToFile({favoriteDocs: next});
        applyFavoriteDocs();
        syncFavButtons();
    };

    let favCollapsed = false;
    let favListExpanded = false;
    let favRenderKey = "";
    let favMountObs = null;
    let favStarted = false;

    const removeFavHosts = () => {
        document.querySelectorAll(`#layouts .sy__file .${FAV_HOST_CLASS}`).forEach((el) => el.remove());
        favRenderKey = "";
    };

    const onFavHostClick = (e) => {
        const host = e.currentTarget;
        const from = e.target instanceof Element ? e.target : e.target?.parentElement;
        const unfav = from?.closest?.("[data-starter-unfav]");
        if (unfav && host.contains(unfav)) {
            e.preventDefault();
            e.stopPropagation();
            toggleFavoriteDoc(unfav.closest("[data-starter-fav-doc]")?.getAttribute("data-node-id") || "");
            return;
        }
        const more = from?.closest?.("[data-starter-fav='more']");
        if (more && host.contains(more)) {
            e.preventDefault();
            e.stopPropagation();
            favListExpanded = !favListExpanded;
            renderFavHosts(config.favoriteDocs);
            return;
        }
        const toggle = from?.closest?.("[data-starter-fav='toggle']");
        if (toggle && host.contains(toggle)) {
            e.preventDefault();
            e.stopPropagation();
            favCollapsed = !host.classList.contains("starter-fav-docs--collapsed");
            host.classList.toggle("starter-fav-docs--collapsed", favCollapsed);
            host.querySelector(".starter-fav-docs__head .b3-list-item__arrow")
                ?.classList.toggle("b3-list-item__arrow--open", !favCollapsed);
            return;
        }
        const item = from?.closest?.("[data-starter-fav-doc]");
        if (!item || !host.contains(item)) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        openDocById(item.getAttribute("data-node-id"));
    };

    const ensureFavHost = (fileEl) => {
        const scroll = ensureFileScroll(fileEl);
        if (!scroll) {
            return null;
        }
        let host = scroll.querySelector(`:scope > .${FAV_HOST_CLASS}`);
        if (host) {
            return host;
        }
        host = document.createElement("div");
        host.className = FAV_HOST_CLASS;
        host.innerHTML = `<div class="b3-list-item starter-fav-docs__head" data-starter-fav="toggle">
  <span class="b3-list-item__toggle">
    <svg class="b3-list-item__arrow b3-list-item__arrow--open"><use xlink:href="#iconRight"></use></svg>
  </span>
  <span class="b3-list-item__text">收藏</span>
</div>
<ul class="b3-list b3-list--background starter-fav-docs__list"></ul>`;
        host.addEventListener("click", onFavHostClick);
        const recent = scroll.querySelector(`:scope > .${RECENT_HOST_CLASS}`);
        if (recent) {
            scroll.insertBefore(host, recent);
        } else {
            const tree = [...scroll.children].find(isTreeChild);
            if (tree) {
                scroll.insertBefore(host, tree);
            } else {
                scroll.appendChild(host);
            }
        }
        return host;
    };

    const renderFavHosts = (items) => {
        const max = getFavMax();
        if (max <= 0 || !items.length) {
            removeFavHosts();
            return;
        }
        const currentId = getActiveDocId();
        const hidden = Math.max(0, items.length - max);
        if (hidden === 0) {
            favListExpanded = false;
        }
        const shown = favListExpanded ? items : items.slice(0, max);
        const key = `${max}|${favCollapsed ? 1 : 0}|${favListExpanded ? 1 : 0}|${currentId}|${items
            .map((d) => `${d.id}\t${d.title || ""}\t${d.icon || ""}`)
            .join("|")}`;
        const files = document.querySelectorAll(FILE_TREE_SEL);
        if (!files.length) {
            return;
        }
        files.forEach((fileEl) => {
            const host = ensureFavHost(fileEl);
            if (!host) {
                return;
            }
            host.classList.toggle("starter-fav-docs--collapsed", favCollapsed);
            host.querySelector(".starter-fav-docs__head .b3-list-item__arrow")
                ?.classList.toggle("b3-list-item__arrow--open", !favCollapsed);
            const list = host.querySelector(".starter-fav-docs__list");
            if (!list) {
                return;
            }
            if (key === favRenderKey && list.childElementCount) {
                list.querySelectorAll("[data-starter-fav-doc]").forEach((li) => {
                    li.classList.toggle("starter-fav-docs__item--current", li.getAttribute("data-node-id") === currentId);
                });
                return;
            }
            const rows = shown.map((item) => {
                const id = item.id || "";
                const title = item.title || "无标题";
                const current = id && id === currentId ? " starter-fav-docs__item--current" : "";
                return `<li class="b3-list-item b3-list-item--hide-action${current}" data-node-id="${escapeHtml(id)}" data-starter-fav-doc>
  ${TREE_TOGGLE_SPACE}
  <span class="b3-list-item__icon">${recentIconInner(item.icon)}</span>
  <span class="b3-list-item__text">${escapeHtml(title)}</span>
  <span class="b3-list-item__action ariaLabel" data-starter-unfav aria-label="取消收藏">
    <svg><use xlink:href="#iconClose"></use></svg>
  </span>
</li>`;
            });
            if (hidden > 0) {
                const label = favListExpanded ? "折叠" : `更多（${hidden}）`;
                rows.push(
                    `<li class="b3-list-item starter-fav-docs__more" data-starter-fav="more">
  ${TREE_TOGGLE_SPACE}
  <span class="b3-list-item__text">${label}</span>
</li>`
                );
            }
            list.innerHTML = rows.join("");
        });
        favRenderKey = key;
    };

    const onFavBtnClick = (e) => {
        const from = e.target instanceof Element ? e.target : e.target?.parentElement;
        const btn = from?.closest?.("[data-starter-fav='1']");
        if (!btn || !btn.closest("#layouts .layout__center .protyle-breadcrumb")) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        toggleFavoriteDoc(btn.getAttribute("data-starter-doc-id") || "", btn.closest(".protyle"));
    };

    const placeFavButton = (host, btn) => {
        const locate = host.querySelector(':scope > [data-type="fhelper-locate-in-tree"]');
        const lock = host.querySelector(':scope > [data-type="readonly"]');
        const space = host.querySelector(":scope > .protyle-breadcrumb__space");
        const anchor = locate || lock;
        if (anchor) {
            if (btn.nextElementSibling !== anchor) {
                anchor.insertAdjacentElement("beforebegin", btn);
            }
            return;
        }
        if (space && space.nextElementSibling !== btn) {
            space.insertAdjacentElement("afterend", btn);
        }
    };

    syncFavButtons = () => {
        document.querySelectorAll("#layouts .layout__center .protyle-breadcrumb").forEach((host) => {
            const protyleEl = host.closest(".protyle");
            const id = protyleEl?.querySelector(".protyle-title")?.getAttribute("data-node-id") || "";
            let btn = host.querySelector(`:scope > .${FAV_BTN_CLASS}`);
            if (!btn) {
                btn = document.createElement("button");
                btn.type = "button";
                btn.className = `block__icon fn__flex-center ariaLabel ${FAV_BTN_CLASS}`;
                btn.setAttribute("data-starter-fav", "1");
                btn.innerHTML = STAR_SVG;
            }
            placeFavButton(host, btn);
            const on = isFavDoc(id);
            btn.classList.toggle("starter-fav-btn--on", on);
            btn.setAttribute("data-starter-doc-id", id);
            btn.setAttribute("aria-label", on ? "取消收藏" : "收藏");
        });
    };

    const startFavoriteDocs = () => {
        if (favStarted) {
            return;
        }
        favStarted = true;
        document.addEventListener("click", onFavBtnClick, true);
        document.addEventListener("loaded-protyle-static", syncFavButtons);
        document.addEventListener("switch-protyle", syncFavButtons);
        const layout = document.querySelector("#layouts") || document.body;
        favMountObs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const n of m.addedNodes) {
                    if (
                        n.nodeType === 1 &&
                        (n.classList?.contains("sy__file") || n.querySelector?.(".sy__file"))
                    ) {
                        applyFavoriteDocs();
                        return;
                    }
                }
            }
        });
        favMountObs.observe(layout, {childList: true, subtree: true});
    };

    const stopFavoriteDocs = () => {
        favStarted = false;
        document.removeEventListener("click", onFavBtnClick, true);
        document.removeEventListener("loaded-protyle-static", syncFavButtons);
        document.removeEventListener("switch-protyle", syncFavButtons);
        favMountObs?.disconnect();
        favMountObs = null;
        removeFavHosts();
        document.querySelectorAll(`.${FAV_BTN_CLASS}`).forEach((el) => el.remove());
        unwrapFileScroll();
    };

    applyFavoriteDocs = () => {
        startFavoriteDocs();
        renderFavHosts(config.favoriteDocs);
        syncFavButtons();
    };

    applyStyleFeatures = () => {
        const root = document.documentElement;
        root.classList.toggle("starter-plain-table-head", config.plainTableHead !== false);
        root.classList.toggle("starter-hide-tab-new", config.hideTabNewDoc === true);
        root.classList.toggle("starter-hide-tab-more", config.hideTabSwitch === true);
        root.classList.add("starter-block-line-height");
        root.style.setProperty("--starter-block-line-height", String(config.blockLineHeight));
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
        applyDocRefFeature();
        applyStyleFeatures();
        applyHideNotebooks();
        applyRecentDocs();
        applyFavoriteDocs();
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
        document.documentElement.classList.remove(
            "starter-custom-doc-ref",
            "starter-plain-table-head",
            "starter-block-line-height",
            "starter-hide-notebook",
            "starter-hide-tab-new",
            "starter-hide-tab-more"
        );
        document.documentElement.style.removeProperty("--starter-block-line-height");
        stopHideNotebooks();
        stopRecentDocs();
        stopFavoriteDocs();
        stopDocRefs();
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
