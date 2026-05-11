import type { FrameTemplate, UserFrameTemplate } from "@shared/types";

type BuiltinTemplateSeed = Omit<UserFrameTemplate, "origin">;

const builtinSeeds: BuiltinTemplateSeed[] = [
  {
    id: "device-desktop-silver",
    name: "Device / Desktop Silver",
    type: "device",
    previewAsset: "",
    shellAsset: "builtin://device-desktop-silver",
    safeArea: { x: 0.13, y: 0.12, width: 0.74, height: 0.66 },
    defaultScale: 1,
    defaultPadding: 36,
    backgroundPreset: "#eef2ff"
  },
  {
    id: "device-laptop-carbon",
    name: "Device / Laptop Carbon",
    type: "device",
    previewAsset: "",
    shellAsset: "builtin://device-laptop-carbon",
    safeArea: { x: 0.11, y: 0.12, width: 0.78, height: 0.66 },
    defaultScale: 1,
    defaultPadding: 36,
    backgroundPreset: "#e2e8f0"
  },
  {
    id: "device-phone-light",
    name: "Device / Phone Light",
    type: "device",
    previewAsset: "",
    shellAsset: "builtin://device-phone-light",
    safeArea: { x: 0.17, y: 0.1, width: 0.66, height: 0.8 },
    defaultScale: 1,
    defaultPadding: 40,
    backgroundPreset: "#f8fafc"
  },
  {
    id: "device-phone-midnight",
    name: "Device / Phone Midnight",
    type: "device",
    previewAsset: "",
    shellAsset: "builtin://device-phone-midnight",
    safeArea: { x: 0.17, y: 0.1, width: 0.66, height: 0.8 },
    defaultScale: 1,
    defaultPadding: 40,
    backgroundPreset: "#0f172a"
  },
  {
    id: "browser-light",
    name: "Browser / Light",
    type: "browser",
    previewAsset: "",
    shellAsset: "builtin://browser-light",
    safeArea: { x: 0.05, y: 0.17, width: 0.9, height: 0.78 },
    defaultScale: 1,
    defaultPadding: 28,
    backgroundPreset: "#f8fafc"
  },
  {
    id: "browser-dark",
    name: "Browser / Dark",
    type: "browser",
    previewAsset: "",
    shellAsset: "builtin://browser-dark",
    safeArea: { x: 0.05, y: 0.17, width: 0.9, height: 0.78 },
    defaultScale: 1,
    defaultPadding: 28,
    backgroundPreset: "#111827"
  },
  {
    id: "browser-minimal",
    name: "Browser / Minimal",
    type: "browser",
    previewAsset: "",
    shellAsset: "builtin://browser-minimal",
    safeArea: { x: 0.04, y: 0.12, width: 0.92, height: 0.82 },
    defaultScale: 1,
    defaultPadding: 24,
    backgroundPreset: "#f1f5f9"
  },
  {
    id: "browser-dev",
    name: "Browser / Dev",
    type: "browser",
    previewAsset: "",
    shellAsset: "builtin://browser-dev",
    safeArea: { x: 0.05, y: 0.18, width: 0.9, height: 0.76 },
    defaultScale: 1,
    defaultPadding: 28,
    backgroundPreset: "#0b1220"
  },
  {
    id: "border-clean",
    name: "Border / Clean Card",
    type: "border",
    previewAsset: "",
    shellAsset: "builtin://border-clean",
    safeArea: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
    defaultScale: 1,
    defaultPadding: 28,
    backgroundPreset: "#ffffff"
  },
  {
    id: "border-gradient",
    name: "Border / Gradient Ring",
    type: "border",
    previewAsset: "",
    shellAsset: "builtin://border-gradient",
    safeArea: { x: 0.09, y: 0.09, width: 0.82, height: 0.82 },
    defaultScale: 1,
    defaultPadding: 30,
    backgroundPreset: "#e2e8f0"
  },
  {
    id: "border-shadow",
    name: "Border / Shadow Card",
    type: "border",
    previewAsset: "",
    shellAsset: "builtin://border-shadow",
    safeArea: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
    defaultScale: 1,
    defaultPadding: 32,
    backgroundPreset: "#f8fafc"
  },
  {
    id: "border-poster",
    name: "Border / Poster",
    type: "border",
    previewAsset: "",
    shellAsset: "builtin://border-poster",
    safeArea: { x: 0.1, y: 0.11, width: 0.8, height: 0.74 },
    defaultScale: 1,
    defaultPadding: 40,
    backgroundPreset: "#111827"
  }
];

export const builtInTemplates: UserFrameTemplate[] = builtinSeeds.map((seed) => ({
  ...seed,
  origin: "builtin"
}));

export function findTemplateById(templates: UserFrameTemplate[], id: string): UserFrameTemplate | null {
  return templates.find((item) => item.id === id) ?? null;
}

export function templateLabel(template: FrameTemplate): string {
  const typeLabel = template.type === "device" ? "Device" : template.type === "browser" ? "Browser" : "Border";
  return `${typeLabel} · ${template.name}`;
}
