# SnapTab Permissions Justification

## Permissions

### `activeTab`

Used only when user clicks SnapTab actions to capture the current page.

### `debugger`

Required for high-fidelity full-page screenshot capture via Chrome DevTools Protocol (`Page.captureScreenshot` with `captureBeyondViewport`).

### `downloads`

Used to save PNG/JPG files to local disk.

### `storage`

Used to store local settings, recent captures metadata, and user-uploaded frame templates.

### `offscreen`

Used as clipboard fallback for image copy when direct Clipboard API fails.

### `tabs`

Used to query active tab, open editor tab, and coordinate capture flow.

### `scripting`

Reserved for future content-script lifecycle orchestration and compatibility paths.

## Host Permissions

### `<all_urls>`

Needed because screenshot targets and element/region selection can happen on any user-opened website.
