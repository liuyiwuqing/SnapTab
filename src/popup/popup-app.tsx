import { useMemo, useState } from "react";
import { MessageType, type BasicResult, type CaptureResultMessage } from "@shared/messages";
import type { CaptureMode } from "@shared/types";

const captureModes: Array<{ mode: CaptureMode; title: string; subtitle: string }> = [
  { mode: "tab", title: "标签页截图", subtitle: "快速捕获当前可见区域" },
  { mode: "full", title: "全页面截图", subtitle: "整页高保真截图（CDP）" },
  { mode: "region", title: "区域截图", subtitle: "自由框选你需要的部分" },
  { mode: "element", title: "元素截图", subtitle: "点击页面元素快速截取" }
];

export function App(): JSX.Element {
  const [busyMode, setBusyMode] = useState<CaptureMode | null>(null);
  const [status, setStatus] = useState<string>("准备就绪");
  const statusClass = useMemo(() => (status.includes("失败") ? "error" : "ok"), [status]);

  const runCapture = async (mode: CaptureMode) => {
    setBusyMode(mode);
    setStatus("正在截图并打开编辑器...");
    try {
      const response = (await chrome.runtime.sendMessage({
        type: MessageType.CaptureRequest,
        mode
      })) as CaptureResultMessage;
      if (!response?.ok) {
        throw new Error(response?.error ?? "截图失败");
      }
      setStatus("截图成功，编辑器已打开");
      window.close();
    } catch (error) {
      setStatus(`截图失败：${error instanceof Error ? error.message : "未知错误"}`);
      setBusyMode(null);
    }
  };

  const reopenLatest = async () => {
    setStatus("正在打开最近一次截图...");
    try {
      const result = (await chrome.runtime.sendMessage({
        type: MessageType.OpenEditorWithLatest
      })) as BasicResult;
      if (!result?.ok) {
        throw new Error(result?.error ?? "打开失败");
      }
      setStatus("已打开最近截图");
      window.close();
    } catch (error) {
      setStatus(`打开失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  const openOptions = () => {
    void chrome.runtime.openOptionsPage();
  };

  return (
    <main className="popup-root">
      <header className="popup-header">
        <img className="popup-logo" src={chrome.runtime.getURL("icons/logo-wordmark.svg")} alt="SnapTab" />
        <span className="popup-badge">V1</span>
      </header>
      <section className="popup-section">
        {captureModes.map((item) => (
          <button
            key={item.mode}
            type="button"
            className="capture-item"
            onClick={() => void runCapture(item.mode)}
            disabled={busyMode !== null}
          >
            <span className="capture-title">{item.title}</span>
            <span className="capture-subtitle">{item.subtitle}</span>
          </button>
        ))}
      </section>
      <section className="popup-actions">
        <button type="button" className="secondary" onClick={() => void reopenLatest()} disabled={busyMode !== null}>
          打开最近截图
        </button>
        <button type="button" className="secondary" onClick={openOptions} disabled={busyMode !== null}>
          偏好设置
        </button>
      </section>
      <footer className={`popup-status ${statusClass}`}>{status}</footer>
    </main>
  );
}
