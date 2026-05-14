# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron desktop app (Linux) that provides quick access to AI chat sites (ChatGPT, Claude, Gemini, Wenxin Yiyan, Tongyi Qianwen, Kimi) via a global hotkey (`Ctrl+Space`). Uses a system tray icon and webview-based embedding. The project is AI-generated.

## Commands

```bash
npm install          # Install dependencies (electron v28.3.3)
npm run dev          # Run with DevTools open (NODE_ENV=development)
npm start            # Run in production mode
npm run build        # Build DEB + AppImage to dist/
./build-deb.sh       # Build DEB package only
```

No test framework, linter, or CI is configured. `test-clipboard.js` is a standalone clipboard test run via `electron test-clipboard.js`.

## Architecture

Standard Electron two-process architecture — all code is flat in the repo root with no sub-modules or transpilation.

- **main.js** — Main process. `AIChatWidget` class manages: BrowserWindow (always-on-top, skip-taskbar), system tray with context menu, global shortcut, IPC handlers, session persistence (`~/.ai-chat-widget-config.json`), user-agent spoofing, and login-URL popup detection for OAuth flows.

- **renderer.js** — Renderer process. `AIChatWidgetNoToolbar` class manages: welcome screen (card grid of AI sites), `<webview>` tag for site embedding, custom context menu, error handling with site-specific retry configs (`specialHandlingSites`), clipboard injection into webview via JS override, custom URL dialog, and keyboard shortcuts (ESC, F5, 1-6).

- **index.html + style.css** — UI: welcome card grid, webview container, custom URL modal, loading/error states.

### IPC Channels

Renderer → Main: `load-website`, `hide-window`, `get-websites`, `get-current-website`, `clear-session-data`, `clear-all-data`, `open-external`, `write-clipboard`, `read-clipboard`, `load-custom-url`

Main → Renderer: `load-website-url`, `show-custom-url-dialog`, `website-changed`, `websites-list`, `current-website`, `clipboard-write-result`, `clipboard-read-result`, `custom-url-result`

### Key Design Points

- `nodeIntegration: true` and `contextIsolation: false` — renderer has full Node.js access (security trade-off for simplicity).
- `webSecurity: false` enables cross-origin requests from embedded webviews.
- WebView partition `persist:ai-chat-widget` provides persistent storage across sessions.
- Two data clearing levels: `clearSessionData()` (cookies + localStorage) vs `clearAllData()` (all storage types).
- URL validation and normalization is done in main process via `validateAndFormatUrl()`.
- Certain AI sites (Tongyi Qianwen, Wenxin Yiyan) have special retry configurations with higher max retries and longer timeouts.
