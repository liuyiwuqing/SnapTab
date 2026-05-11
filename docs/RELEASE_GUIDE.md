# SnapTab Release Guide (Chrome Web Store)

## 1. Build and Validate

```bash
pnpm install
pnpm icons
pnpm store-assets
pnpm build
pnpm zip
```

Artifacts:

- Unpacked extension: `dist/`
- Upload package: `release/snaptab-v0.1.0.zip`
- Store assets: `public/store-assets/`

## 2. Store Listing Assets

Use these generated files:

- App icons: `public/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`
- Small tile: `public/store-assets/small-tile-440x280.png`
- Marquee: `public/store-assets/marquee-1400x560.png`
- Screenshots (4): `public/store-assets/screenshot-*-1280x800.png`

## 3. Listing Copy

Use content from:

- `docs/STORE_LISTING_COPY.md`
- `docs/PRIVACY_POLICY.md`

## 4. API-Based Publish Flow

Required environment variables:

```bash
export CWS_CLIENT_ID=...
export CWS_CLIENT_SECRET=...
export CWS_REFRESH_TOKEN=...
```

Commands:

```bash
node scripts/webstore-publish.mjs upload --publisher <publisherId> --extension <extensionId> --zip release/snaptab-v0.1.0.zip
node scripts/webstore-publish.mjs status --publisher <publisherId> --extension <extensionId>
node scripts/webstore-publish.mjs publish --publisher <publisherId> --extension <extensionId>
```

## 5. Manual Review Checklist

- [ ] Extension loads and runs on latest stable Chrome
- [ ] Full-page capture works on long pages
- [ ] Region/element selector works on real websites
- [ ] Local save / clipboard copy / share path all verified
- [ ] Permissions description matches actual behavior
- [ ] Privacy policy URL configured in listing
- [ ] Listing screenshots and icons meet size requirements
