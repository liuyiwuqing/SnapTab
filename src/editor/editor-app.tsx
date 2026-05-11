import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { composeFramedImage } from "./frame-composer";
import { builtInTemplates, findTemplateById } from "./frame-templates";
import { MessageType, type BasicResult, type GetCaptureByIdResponse } from "@shared/messages";
import { getPreferences, getUserFrameTemplates, setUserFrameTemplates } from "@shared/storage";
import type {
  AnnotationTool,
  CaptureAsset,
  EditorPreferences,
  ExportFormat,
  FrameComposeOptions,
  UserFrameTemplate
} from "@shared/types";
import { dataUrlToBlob, formatTimestamp, makeId, sanitizeFilenamePart } from "@shared/utils";

interface Point {
  x: number;
  y: number;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  tool: AnnotationTool;
  start: Point;
  snapshot?: ImageData;
}

const DEFAULT_FRAME_OPTIONS: FrameComposeOptions = {
  templateId: builtInTemplates[0]?.id ?? "",
  scale: 1,
  padding: 32,
  backgroundColor: "#f5f7fb",
  shadowStrength: 0.7
};

const DEFAULT_TEXT_SIZE = 28;

export function EditorApp(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [capture, setCapture] = useState<CaptureAsset | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [tool, setTool] = useState<AnnotationTool>("move");
  const [lineColor, setLineColor] = useState("#ff2d55");
  const [lineWidth, setLineWidth] = useState(4);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [status, setStatus] = useState("Loading capture...");
  const [preferences, setPreferences] = useState<EditorPreferences | null>(null);
  const [templates, setTemplates] = useState<UserFrameTemplate[]>([]);
  const [frameOptions, setFrameOptions] = useState<FrameComposeOptions>(DEFAULT_FRAME_OPTIONS);
  const [useFrameOnExport, setUseFrameOnExport] = useState(true);
  const [framedPreview, setFramedPreview] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const currentDataUrl = history[historyIndex] ?? "";
  const selectedTemplate = useMemo(
    () => findTemplateById(templates, frameOptions.templateId),
    [templates, frameOptions.templateId]
  );

  useEffect(() => {
    void (async () => {
      try {
        const captureId = new URLSearchParams(window.location.search).get("captureId");
        if (!captureId) {
          throw new Error("Missing captureId in editor URL.");
        }

        const [response, pref, userTemplates] = await Promise.all([
          chrome.runtime.sendMessage({
            type: MessageType.GetCaptureById,
            captureId
          }) as Promise<GetCaptureByIdResponse>,
          getPreferences(),
          getUserFrameTemplates()
        ]);

        if (!response.ok || !response.capture) {
          throw new Error(response.error ?? "Failed to load capture.");
        }

        const allTemplates = [...builtInTemplates, ...userTemplates];
        setCapture(response.capture);
        setPreferences(pref);
        setTemplates(allTemplates);
        setFrameOptions({
          ...DEFAULT_FRAME_OPTIONS,
          templateId: allTemplates[0]?.id ?? DEFAULT_FRAME_OPTIONS.templateId
        });
        setHistory([response.capture.dataUrl]);
        setHistoryIndex(0);
        setStatus("Ready.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to initialize editor.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentDataUrl) {
      return;
    }
    void redrawBaseImage(currentDataUrl, cropRect, canvasRef.current);
  }, [currentDataUrl, cropRect]);

  useEffect(() => {
    if (!selectedTemplate || !currentDataUrl) {
      setFramedPreview("");
      return;
    }
    let canceled = false;
    void composeFramedImage(currentDataUrl, selectedTemplate, frameOptions)
      .then((url) => {
        if (!canceled) {
          setFramedPreview(url);
        }
      })
      .catch((error) => {
        if (!canceled) {
          setStatus(error instanceof Error ? error.message : "Failed to compose frame.");
        }
      });

    return () => {
      canceled = true;
    };
  }, [currentDataUrl, frameOptions, selectedTemplate]);

  useEffect(() => {
    if (!capture?.pageUrl) {
      return;
    }
    void QRCode.toDataURL(capture.pageUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180
    }).then(setQrDataUrl);
  }, [capture?.pageUrl]);

  const pushHistoryFromCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const next = canvas.toDataURL("image/png");
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), next]);
    setHistoryIndex((prev) => prev + 1);
    setCropRect(null);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentDataUrl) {
      return;
    }

    const point = toCanvasPoint(event, canvasRef.current);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      return;
    }

    if (tool === "text") {
      const text = window.prompt("输入文字内容", "SnapTab");
      if (!text) {
        return;
      }
      ctx.fillStyle = lineColor;
      ctx.font = `600 ${DEFAULT_TEXT_SIZE}px Inter, PingFang SC, sans-serif`;
      ctx.fillText(text, point.x, point.y);
      pushHistoryFromCanvas();
      return;
    }

    if (tool === "move") {
      return;
    }

    const snapshot = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    dragRef.current = { tool, start: point, snapshot };

    if (tool === "pen") {
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const drag = dragRef.current;
    if (!canvas || !drag) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const point = toCanvasPoint(event, canvas);

    if (drag.tool === "pen") {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      return;
    }

    if (!drag.snapshot) {
      return;
    }

    ctx.putImageData(drag.snapshot, 0, 0);
    const rect = normalizeRect(drag.start, point);

    if (drag.tool === "crop") {
      drawCropPreview(ctx, rect);
      return;
    }

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;

    if (drag.tool === "rect") {
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    } else if (drag.tool === "arrow") {
      drawArrow(ctx, drag.start, point, lineColor, lineWidth);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const drag = dragRef.current;
    if (!canvas || !drag) {
      return;
    }

    const point = toCanvasPoint(event, canvas);
    const rect = normalizeRect(drag.start, point);

    if (drag.tool === "crop") {
      setCropRect(rect.width < 5 || rect.height < 5 ? null : rect);
      void redrawBaseImage(currentDataUrl, rect, canvas);
      dragRef.current = null;
      return;
    }

    if (drag.tool === "pen" || drag.tool === "rect" || drag.tool === "arrow") {
      pushHistoryFromCanvas();
    }
    dragRef.current = null;
  };

  const undo = () => {
    if (historyIndex < 1) {
      return;
    }
    setHistoryIndex((prev) => prev - 1);
    setCropRect(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) {
      return;
    }
    setHistoryIndex((prev) => prev + 1);
    setCropRect(null);
  };

  const applyCrop = async () => {
    if (!cropRect || !currentDataUrl) {
      return;
    }
    const image = await loadImageElement(currentDataUrl);
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.max(1, Math.round(cropRect.width));
    cropCanvas.height = Math.max(1, Math.round(cropRect.height));
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.drawImage(
      image,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );
    const next = cropCanvas.toDataURL("image/png");
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), next]);
    setHistoryIndex((prev) => prev + 1);
    setCropRect(null);
    setStatus("Crop applied.");
  };

  const uploadFrameTemplate = async (file: File) => {
    if (!file.type.includes("png") && !file.type.includes("webp")) {
      setStatus("Only PNG/WebP templates are supported.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const id = makeId("frame");
    const template: UserFrameTemplate = {
      id,
      name: file.name.replace(/\.[^.]+$/, ""),
      type: "border",
      origin: "user",
      previewAsset: dataUrl,
      shellAsset: dataUrl,
      safeArea: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      defaultScale: 1,
      defaultPadding: 24,
      backgroundPreset: "#f8fafc"
    };
    const userOnly = [...templates.filter((item) => item.origin === "user"), template];
    await setUserFrameTemplates(userOnly);
    setTemplates([...builtInTemplates, ...userOnly]);
    setFrameOptions((prev) => ({ ...prev, templateId: template.id }));
    setStatus("Custom frame uploaded. Please fine-tune safe area values.");
  };

  const downloadImage = async () => {
    if (!capture || !preferences) {
      return;
    }
    const dataUrl = await getFinalExportData(preferences.exportFormat, preferences.jpgQuality);
    const filename = makeFilename(capture, preferences.exportFormat, preferences.filenamePattern);
    await chrome.downloads.download({
      url: dataUrl,
      filename: `SnapTab/${filename}`,
      saveAs: true
    });
    setStatus("Image saved.");
  };

  const copyImage = async () => {
    if (!preferences) {
      return;
    }
    const dataUrl = await getFinalExportData(preferences.exportFormat, preferences.jpgQuality);
    const blob = dataUrlToBlob(dataUrl);
    try {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setStatus("Copied to clipboard.");
      return;
    } catch {
      const result = (await chrome.runtime.sendMessage({
        type: MessageType.ClipboardCopyDataUrl,
        dataUrl
      })) as BasicResult;
      if (!result?.ok) {
        setStatus(`Copy failed: ${result?.error ?? "unknown error"}`);
        return;
      }
      setStatus("Copied to clipboard.");
    }
  };

  const browserShare = async () => {
    if (!capture || !preferences) {
      return;
    }
    if (!("share" in navigator)) {
      setStatus("Web Share is not supported in this environment.");
      return;
    }
    const dataUrl = await getFinalExportData(preferences.exportFormat, preferences.jpgQuality);
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], "SnapTab.png", { type: blob.type });
    const nav = navigator as Navigator & {
      canShare?: (input?: ShareData) => boolean;
    };
    const payload: ShareData = nav.canShare?.({ files: [file] })
      ? { title: capture.pageTitle, text: "Shared via SnapTab", files: [file] }
      : { title: capture.pageTitle, text: capture.pageUrl };
    await navigator.share(payload);
    setStatus("Share sheet opened.");
  };

  const getFinalExportData = async (format: ExportFormat, quality: number): Promise<string> => {
    const source = useFrameOnExport && framedPreview ? framedPreview : currentDataUrl;
    if (!source) {
      throw new Error("No image to export.");
    }
    if (format === "png") {
      return source;
    }
    return convertDataUrl(source, "image/jpeg", quality);
  };

  const updateSelectedTemplate = (templateId: string) => {
    const template = findTemplateById(templates, templateId);
    if (!template) {
      return;
    }
    setFrameOptions((prev) => ({
      ...prev,
      templateId,
      padding: template.defaultPadding,
      backgroundColor: template.backgroundPreset,
      scale: template.defaultScale
    }));
  };

  const updateSafeArea = (field: keyof UserFrameTemplate["safeArea"], value: number) => {
    if (!selectedTemplate || selectedTemplate.origin !== "user") {
      return;
    }
    const rounded = Number(value.toFixed(3));
    const nextTemplate: UserFrameTemplate = {
      ...selectedTemplate,
      safeArea: {
        ...selectedTemplate.safeArea,
        [field]: rounded
      }
    };
    const merged = templates.map((item) => (item.id === nextTemplate.id ? nextTemplate : item));
    setTemplates(merged);
    void setUserFrameTemplates(merged.filter((item) => item.origin === "user"));
  };

  if (!capture || !preferences) {
    return (
      <main className="editor-root loading">
        <p>{status}</p>
      </main>
    );
  }

  return (
    <main className="editor-root">
      <aside className="sidebar">
        <h1>SnapTab Editor</h1>
        <p className="meta">
          {capture.pageTitle} · {capture.mode}
        </p>

        <section className="panel">
          <h2>工具</h2>
          <div className="tool-grid">
            {[
              ["move", "移动"],
              ["crop", "裁剪"],
              ["rect", "矩形"],
              ["arrow", "箭头"],
              ["pen", "画笔"],
              ["text", "文字"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={tool === value ? "active" : ""}
                onClick={() => setTool(value as AnnotationTool)}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            标注颜色
            <input type="color" value={lineColor} onChange={(event) => setLineColor(event.target.value)} />
          </label>
          <label>
            线条粗细
            <input
              type="range"
              min={1}
              max={12}
              value={lineWidth}
              onChange={(event) => setLineWidth(Number(event.target.value))}
            />
          </label>
          <div className="inline-actions">
            <button type="button" onClick={undo} disabled={historyIndex < 1}>
              撤销
            </button>
            <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1}>
              重做
            </button>
            <button type="button" onClick={() => void applyCrop()} disabled={!cropRect}>
              应用裁剪
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>套壳模板</h2>
          <select value={frameOptions.templateId} onChange={(event) => updateSelectedTemplate(event.target.value)}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <label>
            缩放比例（{frameOptions.scale.toFixed(2)}）
            <input
              type="range"
              min={0.75}
              max={1.2}
              step={0.01}
              value={frameOptions.scale}
              onChange={(event) =>
                setFrameOptions((prev) => ({ ...prev, scale: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            留白（{frameOptions.padding}px）
            <input
              type="range"
              min={8}
              max={96}
              value={frameOptions.padding}
              onChange={(event) =>
                setFrameOptions((prev) => ({ ...prev, padding: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            阴影强度（{frameOptions.shadowStrength.toFixed(2)}）
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={frameOptions.shadowStrength}
              onChange={(event) =>
                setFrameOptions((prev) => ({ ...prev, shadowStrength: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            背景色
            <input
              type="color"
              value={frameOptions.backgroundColor}
              onChange={(event) =>
                setFrameOptions((prev) => ({ ...prev, backgroundColor: event.target.value }))
              }
            />
          </label>

          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={useFrameOnExport}
              onChange={(event) => setUseFrameOnExport(event.target.checked)}
            />
            导出时应用套壳
          </label>

          <label className="upload">
            上传自定义套壳（PNG / WebP）
            <input
              type="file"
              accept="image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadFrameTemplate(file);
                }
                event.target.value = "";
              }}
            />
          </label>

          {selectedTemplate?.origin === "user" && (
            <div className="safe-area-grid">
              <h3>自定义模板安全区（可视化校准）</h3>
              <div className="safe-preview">
                <img src={selectedTemplate.shellAsset} alt={selectedTemplate.name} />
                <div
                  className="safe-rect"
                  style={{
                    left: `${selectedTemplate.safeArea.x * 100}%`,
                    top: `${selectedTemplate.safeArea.y * 100}%`,
                    width: `${selectedTemplate.safeArea.width * 100}%`,
                    height: `${selectedTemplate.safeArea.height * 100}%`
                  }}
                />
              </div>
              {(["x", "y", "width", "height"] as const).map((field) => (
                <label key={field}>
                  {field}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectedTemplate.safeArea[field]}
                    onChange={(event) => updateSafeArea(field, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <h2>导出与分享</h2>
          <div className="inline-actions">
            <button type="button" onClick={() => void downloadImage()}>
              保存本地
            </button>
            <button type="button" onClick={() => void copyImage()}>
              复制图片
            </button>
            <button type="button" onClick={() => void browserShare()}>
              浏览器分享
            </button>
          </div>
          <p className="note">
            微信/QQ：扫码分享页面链接（图片分享建议先“复制图片”后粘贴发送）
          </p>
          {qrDataUrl && (
            <div className="qr-card">
              <img src={qrDataUrl} alt="Share QR" />
              <small>{capture.pageUrl}</small>
            </div>
          )}
        </section>

        <p className="status">{status}</p>
      </aside>

      <section className="workspace">
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
        <div className="preview-panel">
          <h2>套壳预览</h2>
          {framedPreview ? <img src={framedPreview} alt="Framed Preview" /> : <p>正在生成预览...</p>}
        </div>
      </section>
    </main>
  );
}

function toCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function normalizeRect(a: Point, b: Point): CropRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.max(1, Math.abs(a.x - b.x));
  const height = Math.max(1, Math.abs(a.y - b.y));
  return { x, y, width, height };
}

async function redrawBaseImage(
  dataUrl: string,
  cropRect: CropRect | null,
  canvas: HTMLCanvasElement | null
): Promise<void> {
  if (!canvas) {
    return;
  }
  const image = await loadImageElement(dataUrl);
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  if (cropRect) {
    drawCropPreview(ctx, cropRect);
  }
}

function drawCropPreview(ctx: CanvasRenderingContext2D, rect: CropRect): void {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  lineWidth: number
): void {
  const headLength = Math.max(10, lineWidth * 2.5);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

async function convertDataUrl(dataUrl: string, mime: "image/jpeg", quality: number): Promise<string> {
  const image = await loadImageElement(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to convert data URL.");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL(mime, quality);
}

function makeFilename(
  capture: CaptureAsset,
  format: ExportFormat,
  pattern: EditorPreferences["filenamePattern"]
): string {
  const source =
    pattern === "domain-timestamp"
      ? new URL(capture.pageUrl || "https://snaptab.local").hostname
      : capture.pageTitle;
  const safeSource = sanitizeFilenamePart(source || "snapshot");
  const ts = formatTimestamp();
  return `${safeSource}-${ts}.${format}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to load file."));
    reader.readAsDataURL(file);
  });
}

async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return image;
}
