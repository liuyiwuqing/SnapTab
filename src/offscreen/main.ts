import { MessageType, type BasicResult, type OffscreenCopyDataUrlMessage } from "@shared/messages";
import { dataUrlToBlob } from "@shared/utils";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    typeof message !== "object" ||
    message === null ||
    (message as { type?: string }).type !== MessageType.OffscreenCopyDataUrl
  ) {
    return false;
  }

  void copyToClipboard(message as OffscreenCopyDataUrlMessage)
    .then(() => sendResponse({ ok: true } satisfies BasicResult))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Clipboard copy failed."
      } satisfies BasicResult)
    );

  return true;
});

async function copyToClipboard(message: OffscreenCopyDataUrlMessage): Promise<void> {
  const blob = dataUrlToBlob(message.dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}
