import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { getTemplateById, LAYOUT_PROFILES, ExportFormat } from '@/lib/render/templates';
import { generateFrameSvgOverlay } from '@/lib/render/frame-graphics';

export interface ServerRenderInput {
  sessionId: string;
  templateId: string;
  format?: ExportFormat;
  photos: {
    slotIndex: number;
    buffer: Buffer;
  }[];
  watermark: boolean;
  dateStr?: string;
}

export async function renderPhotostripServer(input: ServerRenderInput): Promise<Buffer> {
  const template = getTemplateById(input.templateId);
  const layout = LAYOUT_PROFILES[input.format || 'strip'];
  const targetW = layout.canvasWidth;
  const targetH = layout.canvasHeight;
  const slots = layout.getSlots(targetW, targetH);

  // 1. Prepare base background SVG
  const bgSvg = `
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${template.backgroundColor}"/>
      ${
        template.borderWidth
          ? `<rect x="${template.borderWidth / 2}" y="${template.borderWidth / 2}"
                  width="${targetW - template.borderWidth}" height="${targetH - template.borderWidth}"
                  fill="none" stroke="${template.borderColor || '#333'}" stroke-width="${template.borderWidth}"/>`
          : ''
      }
      <text x="${targetW / 2}" y="${layout.headerY}"
            font-family="sans-serif" font-size="36" font-weight="bold" text-anchor="middle"
            fill="${template.textColor || (template.category === 'classic' ? '#f4f4f5' : '#44403c')}">
        ${template.headerText || 'SATU FRAME'}
      </text>
      <text x="${targetW / 2}" y="${layout.footerY}"
            font-family="sans-serif" font-size="28" text-anchor="middle"
            fill="${template.subtextColor || (template.category === 'classic' ? '#a1a1aa' : '#78716c')}">
        ${template.footerText || ''} • ${input.dateStr || new Date().toLocaleDateString('id-ID')}
      </text>
    </svg>
  `;

  const composites: sharp.OverlayOptions[] = [];

  // 2. Process each photo for its target slot
  for (const item of input.photos) {
    const slot = slots.find((s) => s.index === item.slotIndex);
    if (!slot) continue;

    try {
      // Resize & crop to slot dimensions
      const processedPhoto = await sharp(item.buffer)
        .resize(slot.width, slot.height, {
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();

      composites.push({
        input: processedPhoto,
        left: slot.x,
        top: slot.y,
      });
    } catch (err) {
      console.error(`Error processing photo for slot ${item.slotIndex}:`, err);
    }
  }

  // 3. Composite Frame Graphical Overlay (masthead, barcodes, stamps, film sprockets, botanical laurels)
  const overlaySvg = generateFrameSvgOverlay(template, targetW, targetH, layout, input.dateStr);
  composites.push({
    input: Buffer.from(overlaySvg),
    top: 0,
    left: 0,
  });

  // 3b. Composite Custom Canva Transparent PNG Overlay if present
  if (template.overlayPngUrl) {
    try {
      let overlayBuffer: Buffer | null = null;
      if (template.overlayPngUrl.startsWith('http://') || template.overlayPngUrl.startsWith('https://')) {
        const res = await fetch(template.overlayPngUrl);
        if (res.ok) {
          overlayBuffer = Buffer.from(await res.arrayBuffer());
        }
      } else {
        const localPath = path.isAbsolute(template.overlayPngUrl)
          ? template.overlayPngUrl
          : path.join(process.cwd(), 'public', template.overlayPngUrl.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          overlayBuffer = fs.readFileSync(localPath);
        }
      }

      if (overlayBuffer) {
        const resizedOverlay = await sharp(overlayBuffer)
          .resize(targetW, targetH)
          .png()
          .toBuffer();
        composites.push({
          input: resizedOverlay,
          top: 0,
          left: 0,
        });
      }
    } catch (err) {
      console.warn('Gagal memuat overlay Canva PNG di server:', err);
    }
  }

  // 4. Add Watermark overlay if Free Tier
  if (input.watermark) {
    const watermarkSvg = `
      <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .wm { font-family: sans-serif; font-size: 72px; font-weight: bold; fill: rgba(255,255,255,0.4); stroke: rgba(0,0,0,0.5); stroke-width: 2px; }
        </style>
        <g transform="rotate(-45, ${targetW / 2}, ${targetH / 2})">
          <text x="${targetW / 2}" y="${targetH / 2 - 600}" class="wm" text-anchor="middle">SATU FRAME • PREVIEW ONLY</text>
          <text x="${targetW / 2}" y="${targetH / 2 - 200}" class="wm" text-anchor="middle">SATU FRAME • PREVIEW ONLY</text>
          <text x="${targetW / 2}" y="${targetH / 2 + 200}" class="wm" text-anchor="middle">SATU FRAME • PREVIEW ONLY</text>
          <text x="${targetW / 2}" y="${targetH / 2 + 600}" class="wm" text-anchor="middle">SATU FRAME • PREVIEW ONLY</text>
        </g>
      </svg>
    `;

    composites.push({
      input: Buffer.from(watermarkSvg),
      top: 0,
      left: 0,
    });
  }

  // 4. Composite everything onto the base background
  const finalImage = await sharp(Buffer.from(bgSvg))
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();

  return finalImage;
}
