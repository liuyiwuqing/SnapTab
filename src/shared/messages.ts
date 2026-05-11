import type { CaptureAsset, CaptureMode, CaptureRect } from "./types";

export const MessageType = {
  CaptureRequest: "capture.request",
  CaptureResult: "capture.result",
  OpenEditorWithLatest: "capture.open-latest",
  RequestSelectionRegion: "selection.region.request",
  RequestSelectionElement: "selection.element.request",
  SelectionResult: "selection.result",
  GetCaptureById: "capture.get-by-id",
  ClipboardCopyDataUrl: "clipboard.copy-data-url",
  OffscreenCopyDataUrl: "offscreen.copy-data-url"
} as const;

export interface CaptureRequestMessage {
  type: (typeof MessageType)["CaptureRequest"];
  mode: CaptureMode;
}

export interface CaptureResultMessage {
  type: (typeof MessageType)["CaptureResult"];
  ok: boolean;
  error?: string;
  captureId?: string;
}

export interface SelectionRequestMessage {
  type:
    | (typeof MessageType)["RequestSelectionRegion"]
    | (typeof MessageType)["RequestSelectionElement"];
}

export interface SelectionResultMessage {
  type: (typeof MessageType)["SelectionResult"];
  ok: boolean;
  rect?: CaptureRect;
  error?: string;
}

export interface GetCaptureByIdMessage {
  type: (typeof MessageType)["GetCaptureById"];
  captureId: string;
}

export interface GetCaptureByIdResponse {
  ok: boolean;
  capture?: CaptureAsset;
  error?: string;
}

export interface ClipboardCopyDataUrlMessage {
  type: (typeof MessageType)["ClipboardCopyDataUrl"];
  dataUrl: string;
}

export interface BasicResult {
  ok: boolean;
  error?: string;
}

export interface OffscreenCopyDataUrlMessage {
  type: (typeof MessageType)["OffscreenCopyDataUrl"];
  dataUrl: string;
}
