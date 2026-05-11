# SnapTab

SnapTab is a Chrome MV3 screenshot extension that captures full page, region, tab, and element screenshots, then lets users annotate, crop, frame, save, copy, and share in one workflow.

![SnapTab logo](./public/icons/logo-wordmark.svg)

## Highlights

- Screenshot modes:
  - Full page capture (`chrome.debugger` + CDP `Page.captureScreenshot`)
  - Visible tab capture (`chrome.tabs.captureVisibleTab`)
  - Region selection capture
  - Element selection capture
- Built-in editor:
  - Crop, rectangle, arrow, pen, text
  - Undo/redo
- Frame system:
  - 12 built-in templates (Device 4 + Browser 4 + Border 4)
  - User-uploaded templates (PNG/WebP) with safe-area calibration
- Export and share:
  - Save as PNG/JPG
  - Copy image to clipboard
  - Browser share (when supported)
  - WeChat/QQ compatible QR sharing path
- Privacy-first:
  - All image processing stays local by default

## Tech Stack

- React 18 + TypeScript
- Vite 5 + `@crxjs/vite-plugin`
- Chrome Extension Manifest V3
- Canvas-based render/composition pipeline

## Project Structure

```text
src/
  background/   # capture orchestration, CDP, storage, offscreen clipboard fallback
  content/      # region/element selector overlay injected into pages
  editor/       # screenshot editor + frame composer + export/share
  popup/        # quick capture launcher
  options/      # user preferences
  offscreen/    # clipboard fallback document
  shared/       # cross-module types, messages, storage helpers
public/icons/   # app icons and logo assets
scripts/        # icon generation, package zip, CWS publish CLI
docs/           # store copy, tutorial, policy, checklist
```

## Development

```bash
pnpm install
pnpm icons
pnpm dev
```

## Build & Package

```bash
pnpm build
pnpm zip
```

Output:

- Extension build: `dist/`
- Store package: `release/snaptab-v0.1.0.zip`

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `dist` folder.

## Publish CLI (Chrome Web Store API)

```bash
export CWS_CLIENT_ID=...
export CWS_CLIENT_SECRET=...
export CWS_REFRESH_TOKEN=...

node scripts/webstore-publish.mjs upload --publisher <publisherId> --extension <extensionId> --zip release/snaptab-v0.1.0.zip
node scripts/webstore-publish.mjs status --publisher <publisherId> --extension <extensionId>
node scripts/webstore-publish.mjs publish --publisher <publisherId> --extension <extensionId>
```

See [docs/RELEASE_GUIDE.md](./docs/RELEASE_GUIDE.md) for end-to-end release steps.

## Privacy

SnapTab processes screenshots locally. No screenshot content is uploaded by default.

See [docs/PRIVACY_POLICY.md](./docs/PRIVACY_POLICY.md).
