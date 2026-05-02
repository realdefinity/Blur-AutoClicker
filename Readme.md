[![Downloads](https://img.shields.io/github/downloads/Blur009/Blur-AutoClicker/total?style=for-the-badge&label=upstream%20downloads)](https://github.com/Blur009/Blur-AutoClicker/releases)

# CometClicker

<p align="center"><em>Accuracy-focused auto clicker — purple &amp; blue “comet” UI</em></p>

CometClicker is a rebranded build of **[Blur Auto Clicker](https://github.com/Blur009/Blur-AutoClicker)** (same core timing and features) with a new name, **violet–indigo** accent theme, and cool-tinted dark/light surfaces.

<div align="center">
    <img src="https://github.com/Blur009/Blur-AutoClicker/blob/main/public/V3.0.0_UI.png" width="600" alt="UI preview (upstream screenshots)"/>
</div>

## Features

Same capability set as upstream: simple &amp; advanced modes, hotkeys, duty cycle, variation, limits, zones overlay, presets, stats, and more. The **title bar** uses your accent color when the clicker is active.

---

## Installation

Build from this repo or install a release you publish yourself. Upstream releases still use the **BlurAutoClicker** name and paths.

Installed layout for **this** fork:

- App default: `%localappdata%/CometClicker/CometClicker.exe`
- Config &amp; stats: `%appdata%/CometClicker`

---

## Building from source

Windows-first: Rust `x86_64-pc-windows-msvc`, Node.js 20+, MSVC build tools.

```powershell
git clone <your-fork-or-this-repo>
cd Blur-AutoClicker
npm install
rustup default stable-x86_64-pc-windows-msvc
npm run dev
```

Release bundle:

```powershell
npm run build
```

Output: `src-tauri/target/release/bundle/nsis/` (and `CometClicker.exe` under `target/release`).

### Windows trust / signing

See [docs/windows-release-trust.md](docs/windows-release-trust.md). Replace example names with **CometClicker** where relevant.

---

## Credits &amp; license

Based on [Blur Auto Clicker](https://github.com/Blur009/Blur-AutoClicker) by Blur009. Licensed under [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.en.html#license-text).

## Other info

1. Windows practical CPS limit is around **500** for reliable mouse events (see upstream docs).
