# SnapTab Privacy Policy

Last updated: May 11, 2026

## 1. Overview

SnapTab is designed as a local-first screenshot extension for Google Chrome.

## 2. Data Handling Principles

- SnapTab does **not** upload screenshot content to SnapTab servers by default.
- Screenshot capture, editing, framing, and export happen locally in the browser extension context.
- User preferences and template settings are stored in `chrome.storage.local`.

## 3. Data We Store Locally

- Recent screenshot metadata (title, URL, timestamp, mode)
- User preferences (export format, quality, default action)
- User-uploaded frame template metadata and assets

## 4. Data We Do Not Collect by Default

- No account data
- No payment data
- No browsing history sync to remote services
- No screenshot image uploads to external servers

## 5. Permissions Usage

- `activeTab`: capture current tab after user action
- `debugger`: full-page capture via Chrome DevTools Protocol
- `downloads`: save output image locally
- `storage`: persist local settings and template data
- `offscreen`: fallback clipboard copy document
- `tabs`/`scripting`: tab orchestration and capture flow

## 6. Third-Party Services

SnapTab does not require third-party cloud services to process screenshots.

## 7. User Control

Users can:

- Delete screenshots from local storage
- Clear uploaded custom frame templates
- Remove the extension at any time to remove extension-managed data

## 8. Policy Updates

This policy may be updated as features evolve. Material changes will be reflected in the `Last updated` date.

## 9. Contact

For support or privacy questions, update this section with your public support email before store submission.
