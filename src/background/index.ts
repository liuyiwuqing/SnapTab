import {
  MessageType,
  type BasicResult,
  type CaptureRequestMessage,
  type GetCaptureByIdMessage,
  type SelectionResultMessage
} from "@shared/messages";
import { getCaptureById, getLatestCaptureId, saveCapture } from "@shared/storage";
import type { CaptureMode, CaptureRect } from "@shared/types";
import { makeId } from "@shared/utils";

type TabWithId = chrome.tabs.Tab & { id: number; windowId: number };

const DEBUGGER_PROTOCOL_VERSION = "1.3";
const OFFSCREEN_PATH = "src/offscreen/index.html";
const EDITOR_PATH = "src/editor/index.html";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  void (async () => {
    try {
      if (isCaptureRequestMessage(message)) {
        const captureId = await captureAndOpenEditor(message.mode);
        sendResponse({
          type: MessageType.CaptureResult,
          ok: true,
          captureId
        });
        return;
      }

      if (isOpenLatestRequest(message)) {
        const latest = await getLatestCaptureId();
        if (!latest) {
          sendResponse({ ok: false, error: "No recent capture available." });
          return;
        }
        await openEditorWithCapture(latest);
        sendResponse({ ok: true });
        return;
      }

      if (isGetCaptureByIdMessage(message)) {
        const capture = await getCaptureById(message.captureId);
        if (!capture) {
          sendResponse({ ok: false, error: "Capture not found." });
          return;
        }
        sendResponse({ ok: true, capture });
        return;
      }

      if (isClipboardCopyMessage(message)) {
        await copyDataUrlViaOffscreen(message.dataUrl);
        sendResponse({ ok: true } satisfies BasicResult);
        return;
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected background error."
      } satisfies BasicResult);
    }
  })();

  return true;
});

async function captureAndOpenEditor(mode: CaptureMode): Promise<string> {
  const tab = await getActiveTab();
  const dataUrl = await captureByMode(tab, mode);
  const captureId = makeId("capture");

  await saveCapture({
    id: captureId,
    dataUrl,
    mode,
    pageTitle: tab.title ?? "Untitled Page",
    pageUrl: tab.url ?? "",
    createdAt: Date.now()
  });

  await openEditorWithCapture(captureId);
  return captureId;
}

async function openEditorWithCapture(captureId: string): Promise<void> {
  const url = chrome.runtime.getURL(`${EDITOR_PATH}?captureId=${encodeURIComponent(captureId)}`);
  await chrome.tabs.create({ url, active: true });
}

async function captureByMode(tab: TabWithId, mode: CaptureMode): Promise<string> {
  switch (mode) {
    case "tab":
      return captureVisibleTab(tab.windowId);
    case "full":
      return captureFullPage(tab.id, tab.windowId);
    case "region": {
      const rect = await requestSelectionRect(tab.id, MessageType.RequestSelectionRegion);
      const raw = await captureVisibleTab(tab.windowId);
      return cropDataUrl(raw, rect);
    }
    case "element": {
      const rect = await requestSelectionRect(tab.id, MessageType.RequestSelectionElement);
      const raw = await captureVisibleTab(tab.windowId);
      return cropDataUrl(raw, rect);
    }
    default:
      throw new Error(`Unsupported capture mode: ${mode satisfies never}`);
  }
}

async function captureVisibleTab(windowId: number): Promise<string> {
  return chrome.tabs.captureVisibleTab(windowId, { format: "png" });
}

async function captureFullPage(tabId: number, windowId: number): Promise<string> {
  const target = { tabId };
  await chrome.debugger.attach(target, DEBUGGER_PROTOCOL_VERSION);
  try {
    await chrome.debugger.sendCommand(target, "Page.enable");
    const result = (await chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true
    })) as { data: string };
    return `data:image/png;base64,${result.data}`;
  } catch {
    return captureVisibleTab(windowId);
  } finally {
    try {
      await chrome.debugger.detach(target);
    } catch {
      // Ignore detach failures.
    }
  }
}

async function requestSelectionRect(
  tabId: number,
  messageType: typeof MessageType.RequestSelectionRegion | typeof MessageType.RequestSelectionElement
): Promise<CaptureRect> {
  const response = (await chrome.tabs.sendMessage(tabId, {
    type: messageType
  })) as SelectionResultMessage | undefined;

  if (!response?.ok || !response.rect) {
    throw new Error(response?.error ?? "Selection canceled.");
  }

  return response.rect;
}

async function cropDataUrl(dataUrl: string, rect: CaptureRect): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const dpr = rect.dpr ?? 1;
  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.min(bitmap.width - sx, Math.max(1, Math.round(rect.width * dpr)));
  const sh = Math.min(bitmap.height - sy, Math.max(1, Math.round(rect.height * dpr)));

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create offscreen context.");
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  const resultBlob = await canvas.convertToBlob({ type: "image/png" });
  return await blobToDataUrl(resultBlob);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function copyDataUrlViaOffscreen(dataUrl: string): Promise<void> {
  await ensureOffscreenDocument();
  const result = (await chrome.runtime.sendMessage({
    type: MessageType.OffscreenCopyDataUrl,
    dataUrl
  })) as BasicResult;
  if (!result?.ok) {
    throw new Error(result?.error ?? "Failed to copy image.");
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);

  if ("getContexts" in chrome.runtime) {
    const contexts = (await (chrome.runtime as typeof chrome.runtime & {
      getContexts: (query: {
        contextTypes: string[];
        documentUrls: string[];
      }) => Promise<Array<{ contextType: string }>>;
    }).getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl]
    })) as Array<{ contextType: string }>;
    if (contexts.length > 0) {
      return;
    }
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Copy screenshot image data to clipboard."
  });
}

async function getActiveTab(): Promise<TabWithId> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.windowId === undefined) {
    throw new Error("No active tab found.");
  }
  return tab as TabWithId;
}

function isCaptureRequestMessage(value: unknown): value is CaptureRequestMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as CaptureRequestMessage).type === MessageType.CaptureRequest
  );
}

function isOpenLatestRequest(value: unknown): value is { type: typeof MessageType.OpenEditorWithLatest } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: string }).type === MessageType.OpenEditorWithLatest
  );
}

function isGetCaptureByIdMessage(value: unknown): value is GetCaptureByIdMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as GetCaptureByIdMessage).type === MessageType.GetCaptureById
  );
}

function isClipboardCopyMessage(value: unknown): value is { type: string; dataUrl: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: string }).type === MessageType.ClipboardCopyDataUrl &&
    typeof (value as { dataUrl?: string }).dataUrl === "string"
  );
}
