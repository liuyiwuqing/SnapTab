import type { FrameComposeOptions, UserFrameTemplate } from "@shared/types";
import { loadImage } from "@shared/utils";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function composeFramedImage(
  sourceDataUrl: string,
  template: UserFrameTemplate,
  options: FrameComposeOptions
): Promise<string> {
  const source = await loadImage(sourceDataUrl);
  if (template.origin === "user") {
    return composeUserTemplate(source, template, options);
  }
  if (template.type === "browser") {
    return composeBrowserTemplate(source, template, options);
  }
  if (template.type === "device") {
    return composeDeviceTemplate(source, template, options);
  }
  return composeBorderTemplate(source, template, options);
}

async function composeUserTemplate(
  source: HTMLImageElement,
  template: UserFrameTemplate,
  options: FrameComposeOptions
): Promise<string> {
  const shell = await loadImage(template.shellAsset);
  const canvas = document.createElement("canvas");
  canvas.width = shell.naturalWidth;
  canvas.height = shell.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create drawing context for user template.");
  }

  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const safeArea = toAbsoluteSafeArea(template, canvas.width, canvas.height);
  const scaled = fitIntoRect(source, safeArea, options.scale);

  drawSoftShadow(ctx, safeArea, options.shadowStrength);
  clipRoundedImage(ctx, source, scaled, Math.min(scaled.width, scaled.height) * 0.02);
  ctx.drawImage(shell, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

function composeBrowserTemplate(
  source: HTMLImageElement,
  template: UserFrameTemplate,
  options: FrameComposeOptions
): string {
  const chromeBar = template.id === "browser-minimal" ? 24 : 44;
  const outerPadding = Math.max(24, options.padding);
  const targetWidth = Math.round(source.naturalWidth * options.scale);
  const targetHeight = Math.round(source.naturalHeight * options.scale);
  const outerWidth = targetWidth + outerPadding * 2;
  const outerHeight = targetHeight + outerPadding * 2 + chromeBar;

  const canvas = document.createElement("canvas");
  canvas.width = outerWidth;
  canvas.height = outerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to compose browser frame.");
  }

  const bodyRect: Rect = { x: outerPadding, y: outerPadding, width: targetWidth, height: targetHeight + chromeBar };
  const imageRect: Rect = {
    x: outerPadding,
    y: outerPadding + chromeBar,
    width: targetWidth,
    height: targetHeight
  };

  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSoftShadow(ctx, bodyRect, options.shadowStrength);

  const borderRadius = template.id === "browser-minimal" ? 12 : 16;
  roundRectPath(ctx, bodyRect, borderRadius);
  const headerGradient = ctx.createLinearGradient(0, bodyRect.y, bodyRect.width, bodyRect.y);

  if (template.id === "browser-dark" || template.id === "browser-dev") {
    headerGradient.addColorStop(0, "#111827");
    headerGradient.addColorStop(1, "#1f2937");
    ctx.fillStyle = "#0f172a";
  } else {
    headerGradient.addColorStop(0, "#f8fafc");
    headerGradient.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = "#ffffff";
  }

  ctx.fill();
  ctx.save();
  roundRectPath(ctx, bodyRect, borderRadius);
  ctx.clip();

  ctx.fillStyle = headerGradient;
  ctx.fillRect(bodyRect.x, bodyRect.y, bodyRect.width, chromeBar);

  drawTrafficLights(ctx, bodyRect.x + 16, bodyRect.y + chromeBar / 2);

  if (template.id !== "browser-minimal") {
    const searchRect: Rect = {
      x: bodyRect.x + 92,
      y: bodyRect.y + chromeBar / 2 - 11,
      width: Math.min(560, bodyRect.width - 132),
      height: 22
    };
    roundRectPath(ctx, searchRect, 11);
    ctx.fillStyle = template.id === "browser-dev" ? "#111827" : "#dbe4f2";
    ctx.fill();
  }

  ctx.fillStyle = template.id === "browser-dark" ? "#0b1220" : "#ffffff";
  ctx.fillRect(imageRect.x, imageRect.y, imageRect.width, imageRect.height);

  clipRoundedImage(
    ctx,
    source,
    {
      ...imageRect,
      x: imageRect.x,
      y: imageRect.y
    },
    0
  );
  ctx.restore();

  return canvas.toDataURL("image/png");
}

function composeDeviceTemplate(
  source: HTMLImageElement,
  template: UserFrameTemplate,
  options: FrameComposeOptions
): string {
  const isPhone = template.id.includes("phone");
  const outerPadding = Math.max(34, options.padding);
  const bezel = isPhone ? 24 : 30;
  const frameRadius = isPhone ? 46 : 24;
  const targetWidth = Math.round(source.naturalWidth * options.scale);
  const targetHeight = Math.round(source.naturalHeight * options.scale);
  const bodyWidth = targetWidth + bezel * 2;
  const bodyHeight = targetHeight + bezel * 2 + (isPhone ? 0 : 18);
  const canvasWidth = bodyWidth + outerPadding * 2;
  const canvasHeight = bodyHeight + outerPadding * 2 + (isPhone ? 0 : 24);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to compose device frame.");
  }

  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const bodyRect: Rect = { x: outerPadding, y: outerPadding, width: bodyWidth, height: bodyHeight };
  drawSoftShadow(ctx, bodyRect, options.shadowStrength * 1.15);

  const bodyGradient = ctx.createLinearGradient(bodyRect.x, bodyRect.y, bodyRect.x + bodyRect.width, bodyRect.y);
  if (template.id.includes("midnight") || template.id.includes("carbon")) {
    bodyGradient.addColorStop(0, "#111827");
    bodyGradient.addColorStop(1, "#1f2937");
  } else {
    bodyGradient.addColorStop(0, "#e2e8f0");
    bodyGradient.addColorStop(1, "#f8fafc");
  }

  roundRectPath(ctx, bodyRect, frameRadius);
  ctx.fillStyle = bodyGradient;
  ctx.fill();

  const imageRect: Rect = {
    x: bodyRect.x + bezel,
    y: bodyRect.y + bezel,
    width: targetWidth,
    height: targetHeight
  };

  ctx.save();
  roundRectPath(ctx, imageRect, isPhone ? 22 : 10);
  ctx.clip();
  clipRoundedImage(ctx, source, imageRect, isPhone ? 22 : 10);
  ctx.restore();

  if (isPhone) {
    const notchWidth = Math.min(180, imageRect.width * 0.26);
    const notchHeight = 24;
    const notchRect: Rect = {
      x: imageRect.x + imageRect.width / 2 - notchWidth / 2,
      y: imageRect.y + 8,
      width: notchWidth,
      height: notchHeight
    };
    roundRectPath(ctx, notchRect, 12);
    ctx.fillStyle = "#0b1220";
    ctx.fill();
  } else {
    const baseRect: Rect = {
      x: bodyRect.x + bodyRect.width * 0.32,
      y: bodyRect.y + bodyRect.height + 8,
      width: bodyRect.width * 0.36,
      height: 14
    };
    roundRectPath(ctx, baseRect, 7);
    ctx.fillStyle = "#94a3b8";
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}

function composeBorderTemplate(
  source: HTMLImageElement,
  template: UserFrameTemplate,
  options: FrameComposeOptions
): string {
  const padding = Math.max(24, options.padding);
  const targetWidth = Math.round(source.naturalWidth * options.scale);
  const targetHeight = Math.round(source.naturalHeight * options.scale);
  const canvasWidth = targetWidth + padding * 2;
  const canvasHeight =
    targetHeight + padding * 2 + (template.id === "border-poster" ? Math.round(targetHeight * 0.1) : 0);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to compose border frame.");
  }

  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const imageRect: Rect = {
    x: padding,
    y: padding,
    width: targetWidth,
    height: targetHeight
  };

  const radius = template.id === "border-poster" ? 4 : 12;
  if (template.id === "border-gradient") {
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, "#0ea5e9");
    gradient.addColorStop(0.5, "#6366f1");
    gradient.addColorStop(1, "#22c55e");
    ctx.fillStyle = gradient;
    roundRectPath(
      ctx,
      { x: imageRect.x - 10, y: imageRect.y - 10, width: imageRect.width + 20, height: imageRect.height + 20 },
      radius + 8
    );
    ctx.fill();
  }

  if (template.id === "border-shadow" || template.id === "border-clean") {
    drawSoftShadow(
      ctx,
      { x: imageRect.x - 2, y: imageRect.y - 2, width: imageRect.width + 4, height: imageRect.height + 4 },
      options.shadowStrength
    );
  }

  if (template.id === "border-poster") {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(imageRect.x - 1, imageRect.y - 1, imageRect.width + 2, imageRect.height + 2);
  } else {
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, { x: imageRect.x - 4, y: imageRect.y - 4, width: imageRect.width + 8, height: imageRect.height + 8 }, radius + 4);
    ctx.fill();
  }

  clipRoundedImage(ctx, source, imageRect, radius);

  if (template.id === "border-poster") {
    ctx.fillStyle = "#ffffff";
    ctx.font = "500 28px Inter, PingFang SC, sans-serif";
    ctx.fillText("SnapTab", padding, canvasHeight - 22);
  }

  return canvas.toDataURL("image/png");
}

function toAbsoluteSafeArea(template: UserFrameTemplate, width: number, height: number): Rect {
  const { safeArea } = template;
  return {
    x: safeArea.x <= 1 ? safeArea.x * width : safeArea.x,
    y: safeArea.y <= 1 ? safeArea.y * height : safeArea.y,
    width: safeArea.width <= 1 ? safeArea.width * width : safeArea.width,
    height: safeArea.height <= 1 ? safeArea.height * height : safeArea.height
  };
}

function fitIntoRect(source: HTMLImageElement, rect: Rect, scale: number): Rect {
  const targetRatio = rect.width / rect.height;
  const sourceRatio = source.naturalWidth / source.naturalHeight;
  let drawWidth = rect.width;
  let drawHeight = rect.height;

  if (sourceRatio > targetRatio) {
    drawHeight = rect.width / sourceRatio;
  } else {
    drawWidth = rect.height * sourceRatio;
  }

  drawWidth *= scale;
  drawHeight *= scale;
  drawWidth = Math.min(drawWidth, rect.width);
  drawHeight = Math.min(drawHeight, rect.height);

  return {
    x: rect.x + (rect.width - drawWidth) / 2,
    y: rect.y + (rect.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  };
}

function drawSoftShadow(ctx: CanvasRenderingContext2D, rect: Rect, strength: number): void {
  const blur = Math.max(8, Math.round(strength * 24));
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.24)";
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = Math.max(5, Math.round(strength * 10));
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundRectPath(ctx, rect, 12);
  ctx.fill();
  ctx.restore();
}

function clipRoundedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: Rect,
  radius: number
): void {
  ctx.save();
  roundRectPath(ctx, rect, radius);
  ctx.clip();
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

function drawTrafficLights(ctx: CanvasRenderingContext2D, x: number, centerY: number): void {
  const colors = ["#ff5f57", "#febc2e", "#28c840"];
  colors.forEach((color, index) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x + index * 16, centerY, 5.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  const r = Math.max(0, Math.min(radius, Math.min(rect.width, rect.height) / 2));
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.lineTo(rect.x + rect.width - r, rect.y);
  ctx.quadraticCurveTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + r);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - r);
  ctx.quadraticCurveTo(rect.x + rect.width, rect.y + rect.height, rect.x + rect.width - r, rect.y + rect.height);
  ctx.lineTo(rect.x + r, rect.y + rect.height);
  ctx.quadraticCurveTo(rect.x, rect.y + rect.height, rect.x, rect.y + rect.height - r);
  ctx.lineTo(rect.x, rect.y + r);
  ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y);
  ctx.closePath();
}
