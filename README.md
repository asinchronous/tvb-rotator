# TVB Rotator

This app was originally built to help an elderly relative browse Chinese‑language streams (initially TVB, later expanded) on her TV with as few steps as possible. It auto‑launches at startup and provides fullscreen playback. Use the Left and Right arrow keys to cycle through the video streams defined in `sites.json`. You can add an IR sensor to the computer and map any programmable remote buttons to the Left and Right arrows, creating a legacy‑TV experience that requires minimal effort.

The Electron player cycles through a configurable channel list, loading either embedded web pages or raw HLS (`.m3u8`) streams. Designed for kiosk and TV setups with auto‑launch and fullscreen playback.

## Features

- Fullscreen kiosk window; auto‑hides menu bar
- Autoplay enabled with sound (Chromium autoplay policy switched)
- Rotate channels forward/back with keyboard shortcuts
- Supports two source types:
  - `webpage`: loads a URL and attempts to click common play buttons, unmute, and request fullscreen
  - `m3u8`: plays raw HLS using [hls.js](https://github.com/video-dev/hls.js)
- Basic health checks for HLS playback with auto‑skip on fatal errors or stall
- Auto‑launch on system startup (Windows/macOS) via `auto-launch`

## Requirements

- Node.js 18+ recommended
- Windows 10/11 (packaged target) — macOS/Linux work in dev mode

## Getting Started

```bash
# Install dependencies
npm install

# Edit the channel list (optional)
# sites.json controls what loads

# Run in development
npm start
```

When running, use the Right and Left arrow keys to move between channels.

## Configuration: `sites.json`

`sites.json` is copied into the app resources when packaged and read from the project folder during development. Each item must include a `type` and a `url`:

```json
[
  { "type": "webpage", "url": "https://tvbanywherena.com/cantonese/live/tvb-j1" },
  { "type": "m3u8",    "url": "https://example.com/path/to/stream.m3u8" }
]
```

- `webpage`: The app loads the page and attempts to:
  - click common play buttons
  - find videos (including in one‑level shadow DOM) and unmute + request fullscreen
- `m3u8`: The app opens an internal player page and plays the stream via `hls.js` (or native HLS where available).

## Controls

- Next channel: Right Arrow
- Previous channel: Left Arrow

## Packaging (Windows)

This project uses `electron-builder` with NSIS.

```bash
# Pack into unpacked dir
npm run pack

# Build installer
npm run dist
```

Artifacts are emitted to the `dist/` folder with the product name "TVB Rotator" and an NSIS installer.

## Project Structure

```
├─ main.js        # Electron main process: window, rotation, site loading
├─ preload.js     # Safe IPC bridge for player page
├─ player.html    # Internal HLS player for m3u8
├─ sites.json     # Channel list (webpage or m3u8)
├─ package.json   # Scripts and build config
└─ assets/        # Icons/resources for packaging (optional)
```

## Troubleshooting

- Autoplay blocked: Chromium sometimes requires interaction; the app retries clicks and requests fullscreen for `webpage` type, but some sites may still block.
- HLS errors: Fatal HLS errors or stalled playback will trigger an automatic skip to the next channel.
- `sites.json` not found: The app logs an error and loads no channels. Ensure the file exists beside the app in dev, or is included in packaging.

## License

MIT
