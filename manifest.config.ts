import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "SnapTab",
  description:
    "Capture full page, region, tab, or element screenshots with edit, framing, copy, and share tools.",
  version: "0.1.0",
  minimum_chrome_version: "121",
  permissions: ["activeTab", "storage", "downloads", "scripting", "debugger", "offscreen", "tabs"],
  host_permissions: ["<all_urls>"],
  action: {
    default_title: "SnapTab",
    default_popup: "src/popup/index.html"
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle"
    }
  ],
  web_accessible_resources: [
    {
      resources: ["assets/*", "assets/frame-templates/*", "icons/*", "src/offscreen/index.html"],
      matches: ["<all_urls>"]
    }
  ],
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
});
