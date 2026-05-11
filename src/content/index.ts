import { MessageType, type SelectionRequestMessage, type SelectionResultMessage } from "@shared/messages";
import type { CaptureRect } from "@shared/types";

type SelectionMode = "region" | "element";

let activeSelectionAbort: (() => void) | null = null;

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isSelectionRequest(message)) {
    return false;
  }

  const mode: SelectionMode =
    message.type === MessageType.RequestSelectionElement ? "element" : "region";

  void startSelection(mode)
    .then((rect) => {
      sendResponse({
        type: MessageType.SelectionResult,
        ok: true,
        rect
      } satisfies SelectionResultMessage);
    })
    .catch((error) => {
      sendResponse({
        type: MessageType.SelectionResult,
        ok: false,
        error: error instanceof Error ? error.message : "Selection canceled."
      } satisfies SelectionResultMessage);
    });

  return true;
});

async function startSelection(mode: SelectionMode): Promise<CaptureRect> {
  if (activeSelectionAbort) {
    activeSelectionAbort();
    activeSelectionAbort = null;
  }

  return new Promise<CaptureRect>((resolve, reject) => {
    const overlay = createOverlay(mode);
    const selectionBox = overlay.querySelector<HTMLDivElement>("[data-role='selection-box']");
    const hint = overlay.querySelector<HTMLDivElement>("[data-role='hint']");
    const highlighter = overlay.querySelector<HTMLDivElement>("[data-role='element-highlight']");

    if (!selectionBox || !hint || !highlighter) {
      overlay.remove();
      reject(new Error("Selection UI failed to initialize."));
      return;
    }

    let started = false;
    let startX = 0;
    let startY = 0;
    let currentRect: CaptureRect | null = null;
    let currentElementRect: CaptureRect | null = null;

    const cleanup = () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("mouseup", onMouseUp, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("click", onClick, true);
      overlay.remove();
      activeSelectionAbort = null;
    };

    activeSelectionAbort = () => {
      cleanup();
      reject(new Error("Previous selection interrupted."));
    };

    const onMouseDown = (event: MouseEvent) => {
      if (mode !== "region" || event.button !== 0) {
        return;
      }
      started = true;
      startX = event.clientX;
      startY = event.clientY;
      currentRect = { x: startX, y: startY, width: 0, height: 0, dpr: window.devicePixelRatio };
      selectionBox.style.opacity = "1";
      event.preventDefault();
      event.stopPropagation();
    };

    const onMouseMove = (event: MouseEvent) => {
      if (mode === "region") {
        if (!started || !currentRect) {
          hint.textContent = "Drag to select area. Press Esc to cancel.";
          return;
        }
        const left = Math.min(startX, event.clientX);
        const top = Math.min(startY, event.clientY);
        const width = Math.max(1, Math.abs(event.clientX - startX));
        const height = Math.max(1, Math.abs(event.clientY - startY));

        currentRect = { x: left, y: top, width, height, dpr: window.devicePixelRatio };
        drawRect(selectionBox, currentRect);
        hint.textContent = `${Math.round(width)} x ${Math.round(height)}`;
      } else {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (!target || overlay.contains(target)) {
          return;
        }
        const rect = target.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) {
          return;
        }
        currentElementRect = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          dpr: window.devicePixelRatio
        };
        drawRect(highlighter, currentElementRect);
        highlighter.style.opacity = "1";
        hint.textContent = `Select element: ${Math.round(rect.width)} x ${Math.round(rect.height)}`;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const onMouseUp = (event: MouseEvent) => {
      if (mode !== "region" || event.button !== 0 || !currentRect) {
        return;
      }
      if (currentRect.width < 5 || currentRect.height < 5) {
        cleanup();
        reject(new Error("Selection is too small."));
        return;
      }
      cleanup();
      resolve(currentRect);
      event.preventDefault();
      event.stopPropagation();
    };

    const onClick = (event: MouseEvent) => {
      if (mode !== "element") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!currentElementRect) {
        cleanup();
        reject(new Error("No element selected."));
        return;
      }
      cleanup();
      resolve(currentElementRect);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      cleanup();
      reject(new Error("Selection canceled."));
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mouseup", onMouseUp, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("click", onClick, true);
  });
}

function createOverlay(mode: SelectionMode): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-snaptab-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(8, 12, 20, 0.2)";
  overlay.style.backdropFilter = "blur(1px)";
  overlay.style.cursor = mode === "region" ? "crosshair" : "default";
  overlay.style.zIndex = "2147483647";
  overlay.style.userSelect = "none";
  overlay.style.webkitUserSelect = "none";

  const hint = document.createElement("div");
  hint.setAttribute("data-role", "hint");
  hint.textContent =
    mode === "region"
      ? "Drag to select area. Press Esc to cancel."
      : "Hover an element and click to capture. Press Esc to cancel.";
  hint.style.position = "fixed";
  hint.style.top = "16px";
  hint.style.left = "50%";
  hint.style.transform = "translateX(-50%)";
  hint.style.padding = "8px 12px";
  hint.style.background = "rgba(17, 25, 40, 0.92)";
  hint.style.color = "#f8fafc";
  hint.style.borderRadius = "8px";
  hint.style.fontFamily =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  hint.style.fontSize = "13px";
  hint.style.letterSpacing = "0";

  const selectionBox = document.createElement("div");
  selectionBox.setAttribute("data-role", "selection-box");
  selectionBox.style.position = "fixed";
  selectionBox.style.border = "2px solid #3b82f6";
  selectionBox.style.background = "rgba(59, 130, 246, 0.15)";
  selectionBox.style.opacity = "0";
  selectionBox.style.pointerEvents = "none";
  selectionBox.style.borderRadius = "4px";

  const elementHighlighter = document.createElement("div");
  elementHighlighter.setAttribute("data-role", "element-highlight");
  elementHighlighter.style.position = "fixed";
  elementHighlighter.style.border = "2px solid #16a34a";
  elementHighlighter.style.background = "rgba(22, 163, 74, 0.12)";
  elementHighlighter.style.opacity = "0";
  elementHighlighter.style.pointerEvents = "none";
  elementHighlighter.style.borderRadius = "4px";

  overlay.append(hint, selectionBox, elementHighlighter);
  document.documentElement.appendChild(overlay);
  return overlay;
}

function drawRect(node: HTMLDivElement, rect: CaptureRect): void {
  node.style.left = `${rect.x}px`;
  node.style.top = `${rect.y}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
}

function isSelectionRequest(message: unknown): message is SelectionRequestMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    ((message as SelectionRequestMessage).type === MessageType.RequestSelectionRegion ||
      (message as SelectionRequestMessage).type === MessageType.RequestSelectionElement)
  );
}
