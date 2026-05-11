export type CaptureMode = "tab" | "full" | "region" | "element";

export type FrameType = "device" | "browser" | "border";

export type ExportFormat = "png" | "jpg";

export type AnnotationTool = "crop" | "rect" | "arrow" | "pen" | "text" | "move";

export interface CaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
  dpr?: number;
}

export interface CaptureAsset {
  id: string;
  dataUrl: string;
  mode: CaptureMode;
  pageUrl: string;
  pageTitle: string;
  createdAt: number;
}

export interface FrameTemplateSafeArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameTemplate {
  id: string;
  name: string;
  type: FrameType;
  previewAsset: string;
  shellAsset: string;
  safeArea: FrameTemplateSafeArea;
  defaultScale: number;
  defaultPadding: number;
  backgroundPreset: string;
}

export interface UserFrameTemplate extends FrameTemplate {
  origin: "builtin" | "user";
}

export interface FrameComposeOptions {
  templateId: string;
  scale: number;
  padding: number;
  backgroundColor: string;
  shadowStrength: number;
}

export interface EditorPreferences {
  exportFormat: ExportFormat;
  jpgQuality: number;
  filenamePattern: "domain-timestamp" | "title-timestamp";
  defaultShareAction: "copy" | "download" | "webshare";
}

export interface SnapshotRecord {
  id: string;
  createdAt: number;
  pageUrl: string;
  pageTitle: string;
  mode: CaptureMode;
}
