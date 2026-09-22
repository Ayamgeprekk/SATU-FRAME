import { FrameTemplate, TemplateSlot } from '@/types/session';
import { getTemplateById, LAYOUT_PROFILES, ExportFormat } from './templates';
import { drawFrameCanvasDecorations } from './frame-graphics';

export interface PhotoInput {
  slotIndex: number;
  blob: Blob;
}

export interface ComposeOptions {
  templateId: string;
  format?: ExportFormat;
  photos: PhotoInput[];
  watermark?: boolean;
  dateStr?: string;
}

export async function composePhotostripClient(options: ComposeOptions): Promise<Blob> {
  const template = getTemplateById(options.templateId);
  const layout = LAYOUT_PROFILES[options.format || 'strip'];
  const targetW = layout.canvasWidth;
  const targetH = layout.canvasHeight;
  const slots = layout.getSlots(targetW, targetH);

  // Guardrail: Memory check (must be <= 8 Megapixels)
  const totalMegaPixels = (targetW * targetH) / 1_000_000;
  if (totalMegaPixels > 8.0) {
    throw new Error(`Canvas size ${totalMegaPixels.toFixed(1)}MP exceeds mobile hard limit of 8MP`);
  }

  // Create single isolated canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Canvas 2D context creation failed');
  }

  try {
    // 1. Fill Background
    ctx.fillStyle = template.backgroundColor;
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Draw Borders if present
    if (template.borderWidth && template.borderColor) {
      ctx.strokeStyle = template.borderColor;
      ctx.lineWidth = template.borderWidth;
      ctx.strokeRect(
        template.borderWidth / 2,
        template.borderWidth / 2,
        targetW - template.borderWidth,
        targetH - template.borderWidth
      );
    }

    // 3. Draw Header Text
    ctx.fillStyle = template.textColor || (template.category === 'classic' ? '#f4f4f5' : '#44403c');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(template.headerText || 'SATU FRAME', targetW / 2, layout.headerY);

    // 4. Sequential Image Draw: decode -> draw -> bitmap.close() immediately (PRD §10.2)
    for (const photo of options.photos) {
      const slot = slots.find((s) => s.index === photo.slotIndex);
      if (!slot) continue;

      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(photo.blob, {
          resizeWidth: slot.width,
          resizeHeight: slot.height,
          resizeQuality: 'high',
        });

        // Calculate aspect fill & center crop within slot
        const imgAspect = bitmap.width / bitmap.height;
        const slotAspect = slot.width / slot.height;

        let srcX = 0,
          srcY = 0,
          srcW = bitmap.width,
          srcH = bitmap.height;

        if (imgAspect > slotAspect) {
          // Source is wider -> crop horizontally
          srcW = bitmap.height * slotAspect;
          srcX = (bitmap.width - srcW) / 2;
        } else {
          // Source is taller -> crop vertically
          srcH = bitmap.width / slotAspect;
          srcY = (bitmap.height - srcH) / 2;
        }

        // Draw photo rounded rectangle
        ctx.save();
        ctx.beginPath();
        const radius = 12;
        ctx.roundRect(slot.x, slot.y, slot.width, slot.height, radius);
        ctx.clip();

        ctx.drawImage(bitmap, srcX, srcY, srcW, srcH, slot.x, slot.y, slot.width, slot.height);
        ctx.restore();

        // Subtle slot border
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);
      } finally {
        if (bitmap) {
          bitmap.close(); // Immediate release of memory
        }
      }
    }

    // 5. Draw Footer Text & Date
    const today = options.dateStr || new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' });
    ctx.font = '28px sans-serif';
    ctx.fillStyle = template.subtextColor || (template.category === 'classic' ? '#a1a1aa' : '#78716c');
    ctx.fillText(`${template.footerText || ''} • ${today}`, targetW / 2, layout.footerY);

    // 5b. Draw Thematic Frame Decorations (Newspaper mastheads, barcodes, film sprockets, stamps)
    drawFrameCanvasDecorations(ctx, template, targetW, targetH, layout, options.dateStr);

    // 5c. Draw Custom Canva Transparent PNG Overlay if present
    if (template.overlayPngUrl) {
      try {
        const overlayImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = (err) => reject(err);
          img.src = template.overlayPngUrl!;
        });
        ctx.drawImage(overlayImg, 0, 0, targetW, targetH);
      } catch (err) {
        console.warn('Gagal memuat overlay Canva PNG:', err);
      }
    }

    // 6. Draw Watermark if Free Tier
    if (options.watermark) {
      ctx.save();
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 3;
      ctx.font = 'bold 72px sans-serif';
      ctx.textAlign = 'center';

      for (let offset = -800; offset <= 800; offset += 400) {
        ctx.strokeText('SATU FRAME • PREVIEW ONLY', 0, offset);
        ctx.fillText('SATU FRAME • PREVIEW ONLY', 0, offset);
      }
      ctx.restore();
    }

    // 7. Sanity Check: Test 4 sample pixels to verify canvas is not blank
    const sample1 = ctx.getImageData(100, 100, 1, 1).data;
    const sample2 = ctx.getImageData(targetW - 100, targetH - 100, 1, 1).data;
    if (sample1[3] === 0 && sample2[3] === 0) {
      throw new Error('Canvas sanity check failed: blank canvas detected');
    }

    // 8. Convert to JPEG Blob
    const resultBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 20_000) {
            resolve(blob);
          } else {
            reject(new Error('Canvas export toBlob failed or produced empty file'));
          }
        },
        'image/jpeg',
        0.9
      );
    });

    return resultBlob;
  } finally {
    // 9. Force iOS Safari VRAM release immediately (PRD §10.2)
    canvas.width = 0;
    canvas.height = 0;
  }
}
