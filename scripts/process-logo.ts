import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processLogo() {
  const src = 'C:/Users/DELL/.gemini/antigravity/brain/7b24552e-6a7b-4ef9-8b94-30bbd2ce8c2c/.user_uploaded/media_1790000968226.jpg';
  const publicDir = path.resolve(process.cwd(), 'public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const image = sharp(src);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // 1. Create transparent RGBA buffer
  const rgbaBuffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const destIdx = i * 4;
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];

    rgbaBuffer[destIdx] = r;
    rgbaBuffer[destIdx + 1] = g;
    rgbaBuffer[destIdx + 2] = b;

    // Detect white/off-white background (> 242 on all channels)
    if (r >= 242 && g >= 242 && b >= 242) {
      rgbaBuffer[destIdx + 3] = 0;
    } else if (r >= 225 && g >= 225 && b >= 225) {
      // Smooth feathering
      const brightness = (r + g + b) / 3;
      const alpha = Math.round(255 * (1 - (brightness - 225) / (255 - 225)));
      rgbaBuffer[destIdx + 3] = Math.max(0, Math.min(255, alpha));
    } else {
      rgbaBuffer[destIdx + 3] = 255;
    }
  }

  // Save transparent full logo
  await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'logo-transparent.png'));
  console.log('Saved public/logo-transparent.png');

  // Save standard full logo
  await sharp(src)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('Saved public/logo.png');

  // 2. Crop top icon (camera + aperture)
  // Let's crop the top camera region: top 0 to 520, centered
  const iconHeight = Math.round(height * 0.52);
  const iconWidth = Math.round(width * 0.65);
  const iconLeft = Math.round((width - iconWidth) / 2);

  await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
    .extract({ left: iconLeft, top: 20, width: iconWidth, height: iconHeight })
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo-icon.png'));
  console.log('Saved public/logo-icon.png');

  // Favicon (48x48)
  await sharp(path.join(publicDir, 'logo-icon.png'))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Saved public/favicon.png');
}

processLogo().catch((err) => {
  console.error('Error processing logo:', err);
  process.exit(1);
});
