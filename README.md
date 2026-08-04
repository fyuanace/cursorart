# cursor极简

Layout overlay on official **daylight** (light) / **midnight** (dark). Colors and component tokens come from the base theme; this theme only changes the four-region layout.

## Develop

1. Edit `theme.css` (layout overrides only; prefer CSS variables for color).
2. In SiYuan: **Settings → Appearance** → set light/dark theme to **cursor极简**.
3. DevTools (`Ctrl+Shift+I`) → disable cache → `location.reload()`.

## Files

| File | Role |
|------|------|
| `theme.json` | Metadata (`modes`: light + dark) |
| `theme.css` | Layout overlay |
| `theme.js` | Dock strip, side toggles, settings |
| `icon.png` | Bazaar / list icon |
| `preview.png` | Bazaar preview |

Official sample: https://github.com/siyuan-note/theme-sample
