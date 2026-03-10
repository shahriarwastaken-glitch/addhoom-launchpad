// Canvas text overlay utilities for ad image generation

export interface TextOverlayConfig {
  generatedImageUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  headline: string;
  price?: string;
  offerTag?: string;
  textStyle: 'clean' | 'bold' | 'card';
  textPosition: string;
  primaryColor: string;
  headingFont: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  words.forEach(word => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getTextAnchor(position: string, W: number, H: number) {
  const map: Record<string, { x: number; y: number }> = {
    TL: { x: W * 0.12, y: H * 0.10 },
    TC: { x: W * 0.50, y: H * 0.10 },
    TR: { x: W * 0.88, y: H * 0.10 },
    ML: { x: W * 0.12, y: H * 0.50 },
    MC: { x: W * 0.50, y: H * 0.50 },
    MR: { x: W * 0.88, y: H * 0.50 },
    BL: { x: W * 0.12, y: H * 0.88 },
    BC: { x: W * 0.50, y: H * 0.88 },
    BR: { x: W * 0.88, y: H * 0.88 },
  };
  return map[position] ?? map['BC'];
}

function renderCleanText(ctx: CanvasRenderingContext2D, config: TextOverlayConfig, anchor: { x: number; y: number }) {
  const { canvasWidth: W, headline, price, primaryColor, headingFont } = config;
  const fontSize = W * 0.052;
  ctx.font = `700 ${fontSize}px ${headingFont}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#FFFFFF';

  const lines = wrapText(ctx, headline, W * 0.82);
  const lineH = fontSize * 1.28;
  let y = anchor.y - ((lines.length - 1) * lineH) / 2;

  lines.forEach(line => {
    ctx.fillText(line, anchor.x, y);
    y += lineH;
  });

  if (price) {
    ctx.shadowColor = 'transparent';
    const pSize = W * 0.038;
    ctx.font = `700 ${pSize}px ${headingFont}, sans-serif`;
    const pW = ctx.measureText(price).width + W * 0.06;
    const pH = pSize * 1.9;
    const pX = anchor.x - pW / 2;
    const pY = y + W * 0.014;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(ctx, pX, pY, pW, pH, pH / 2);
    ctx.fill();

    ctx.fillStyle = primaryColor;
    ctx.textAlign = 'center';
    ctx.fillText(price, anchor.x, pY + pH * 0.5);
  }
}

function renderBoldText(ctx: CanvasRenderingContext2D, config: TextOverlayConfig, anchor: { x: number; y: number }) {
  const { canvasWidth: W, canvasHeight: H, headline, price, primaryColor, headingFont, textPosition } = config;
  const isBottom = textPosition.startsWith('B');
  const overlayH = H * 0.30;
  const overlayY = isBottom ? H - overlayH : 0;

  const grad = ctx.createLinearGradient(0, overlayY, 0, overlayY + overlayH);
  if (isBottom) {
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.80)');
  } else {
    grad.addColorStop(0, 'rgba(0,0,0,0.80)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, overlayY, W, overlayH);

  const fontSize = W * 0.066;
  const lineH = fontSize * 1.18;
  ctx.font = `800 ${fontSize}px ${headingFont}, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent';

  const lines = wrapText(ctx, headline, W * 0.86);
  let y = anchor.y - ((lines.length - 1) * lineH) / 2;
  lines.forEach(line => {
    ctx.fillText(line, W / 2, y);
    y += lineH;
  });

  if (price) {
    ctx.font = `700 ${W * 0.046}px ${headingFont}, sans-serif`;
    ctx.fillStyle = primaryColor;
    ctx.fillText(price, W / 2, y + W * 0.022);
  }
}

function renderCardText(ctx: CanvasRenderingContext2D, config: TextOverlayConfig, anchor: { x: number; y: number }) {
  const { canvasWidth: W, headline, price, primaryColor, headingFont } = config;
  const pad = W * 0.05;
  const cardW = W * 0.86;
  const fontSize = W * 0.045;
  const lineH = fontSize * 1.32;

  ctx.font = `700 ${fontSize}px ${headingFont}, sans-serif`;
  const lines = wrapText(ctx, headline, cardW - pad * 2);

  const cardH = lines.length * lineH + pad * 2.2 + (price ? lineH * 1.4 : 0);
  const cardX = (W - cardW) / 2;
  const cardY = anchor.y - cardH / 2;

  ctx.fillStyle = 'rgba(12,12,12,0.54)';
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent';

  let y = cardY + pad + lineH * 0.5;
  lines.forEach(line => {
    ctx.fillText(line, W / 2, y);
    y += lineH;
  });

  if (price) {
    ctx.font = `800 ${W * 0.050}px ${headingFont}, sans-serif`;
    ctx.fillStyle = primaryColor;
    ctx.fillText(price, W / 2, y + pad * 0.6);
  }
}

function renderBadge(ctx: CanvasRenderingContext2D, config: TextOverlayConfig) {
  const { canvasWidth: W, offerTag, primaryColor, headingFont } = config;
  if (!offerTag) return;

  const text = offerTag.toUpperCase();
  const fontSize = W * 0.027;
  ctx.font = `700 ${fontSize}px ${headingFont}, sans-serif`;
  const tW = ctx.measureText(text).width;
  const pillW = tW + W * 0.058;
  const pillH = fontSize * 1.85;
  const pillX = W - pillW - W * 0.038;
  const pillY = W * 0.038;

  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = primaryColor;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pillX + pillW / 2, pillY + pillH / 2);
}

export async function addTextOverlay(config: TextOverlayConfig): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = config.canvasWidth;
  canvas.height = config.canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Layer 1: Generated ad image
  const adImage = await loadImage(config.generatedImageUrl);
  ctx.drawImage(adImage, 0, 0, config.canvasWidth, config.canvasHeight);

  // Layer 2: Text overlay
  const anchor = getTextAnchor(config.textPosition, config.canvasWidth, config.canvasHeight);

  if (config.textStyle === 'clean') {
    renderCleanText(ctx, config, anchor);
  } else if (config.textStyle === 'bold') {
    renderBoldText(ctx, config, anchor);
  } else {
    renderCardText(ctx, config, anchor);
  }

  // Layer 3: Offer badge
  if (config.offerTag) {
    renderBadge(ctx, config);
  }

  return canvas.toDataURL('image/png', 1.0);
}

export function getCanvasDimensions(format: string): { width: number; height: number } {
  switch (format) {
    case 'feed': return { width: 1080, height: 1350 };
    case 'story': return { width: 1080, height: 1920 };
    default: return { width: 1080, height: 1080 };
  }
}
