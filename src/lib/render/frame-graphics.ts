import { FrameTemplate } from '@/types/session';
import { getStyleTheme, LayoutProfile } from './templates';

/**
 * Generates an SVG string containing high-resolution graphical frame ornaments
 * to be composited over the photos in Sharp (server-side).
 */
export function generateFrameSvgOverlay(
  template: FrameTemplate,
  targetW: number,
  targetH: number,
  layout: LayoutProfile,
  dateStr?: string
): string {
  const theme = getStyleTheme(template);
  const textColor = template.textColor || (template.category === 'classic' ? '#f4f4f5' : '#1c1917');
  const subtextColor = template.subtextColor || (template.category === 'classic' ? '#a1a1aa' : '#57534e');
  const date = dateStr || new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' });

  let graphicsContent = '';

  if (theme === 'newspaper') {
    graphicsContent = `
      <!-- Newspaper Double Top Rules -->
      <line x1="50" y1="40" x2="${targetW - 50}" y2="40" stroke="${textColor}" stroke-width="4"/>
      <line x1="50" y1="48" x2="${targetW - 50}" y2="48" stroke="${textColor}" stroke-width="1.5"/>

      <!-- Masthead Top Info Bar -->
      <text x="60" y="72" font-family="serif" font-size="16" font-weight="bold" fill="${subtextColor}" letter-spacing="2">EDISI KHUSUS • NO. 1926</text>
      <text x="${targetW / 2}" y="72" font-family="serif" font-size="16" font-weight="bold" fill="${subtextColor}" text-anchor="middle" letter-spacing="3">SATU FRAME CHRONICLE</text>
      <text x="${targetW - 60}" y="72" font-family="serif" font-size="16" font-weight="bold" fill="${subtextColor}" text-anchor="end" letter-spacing="2">HARGA RP 15.000</text>

      <line x1="50" y1="84" x2="${targetW - 50}" y2="84" stroke="${textColor}" stroke-width="1.5"/>

      <!-- Main Headline Masthead -->
      <text x="${targetW / 2}" y="136" font-family="serif" font-size="44" font-weight="900" fill="${textColor}" text-anchor="middle" letter-spacing="4">
        ${template.headerText || 'THE DAILY CHRONICLE'}
      </text>

      <!-- Masthead Bottom Rule -->
      <line x1="50" y1="154" x2="${targetW - 50}" y2="154" stroke="${textColor}" stroke-width="3"/>
      <line x1="50" y1="160" x2="${targetW - 50}" y2="160" stroke="${textColor}" stroke-width="1"/>

      <!-- Column Dividers Between Photos -->
      <line x1="${targetW / 2}" y1="180" x2="${targetW / 2}" y2="2800" stroke="${textColor}" stroke-width="1.5" stroke-dasharray="8,6" opacity="0.4"/>

      <!-- Bottom Headline Section -->
      <line x1="50" y1="2840" x2="${targetW - 50}" y2="2840" stroke="${textColor}" stroke-width="2"/>
      <text x="${targetW / 2}" y="2875" font-family="serif" font-size="22" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="2">
        BERITA UTAMA: DUA TEMPAT, SATU MOMEN ABADI
      </text>
      <line x1="50" y1="2895" x2="${targetW - 50}" y2="2895" stroke="${textColor}" stroke-width="1"/>

      <!-- Official Vintage Ink Seal Stamp on Bottom Right -->
      <g transform="translate(${targetW - 170}, 2990)">
        <circle cx="0" cy="0" r="52" fill="none" stroke="${textColor}" stroke-width="2" stroke-dasharray="5,3" opacity="0.8"/>
        <circle cx="0" cy="0" r="44" fill="none" stroke="${textColor}" stroke-width="1" opacity="0.8"/>
        <text x="0" y="-18" font-family="serif" font-size="10" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="1">★ SATU FRAME ★</text>
        <text x="0" y="2" font-family="serif" font-size="11" font-weight="900" fill="${textColor}" text-anchor="middle">VERIFIED</text>
        <text x="0" y="16" font-family="serif" font-size="9" fill="${textColor}" text-anchor="middle">ARCHIVE 2026</text>
        <text x="0" y="28" font-family="serif" font-size="8" fill="${textColor}" text-anchor="middle">${date}</text>
      </g>

      <!-- Bottom Footer Caption -->
      <text x="60" y="2960" font-family="serif" font-size="18" fill="${subtextColor}">
        Laporan Eksklusif: Rekaman momen otentik berdua tanpa manipulasi.
      </text>
      <text x="60" y="2990" font-family="serif" font-size="16" fill="${subtextColor}">
        Dicetak otomatis dari peramban web pada ${date}.
      </text>
    `;
  } else if (theme === 'magazine') {
    graphicsContent = `
      <!-- Haute Magazine Masthead -->
      <line x1="60" y1="45" x2="${targetW - 60}" y2="45" stroke="${textColor}" stroke-width="1.5" opacity="0.6"/>
      <text x="${targetW / 2}" y="115" font-family="sans-serif" font-size="52" font-weight="900" fill="${textColor}" text-anchor="middle" letter-spacing="14">
        ${template.headerText || 'THE EDITORIAL'}
      </text>
      <text x="${targetW / 2}" y="145" font-family="sans-serif" font-size="14" font-weight="bold" fill="${subtextColor}" text-anchor="middle" letter-spacing="6">
        PORTRAIT ISSUE • SPECIAL COLLECTION • VOL. 08
      </text>
      <line x1="60" y1="160" x2="${targetW - 60}" y2="160" stroke="${textColor}" stroke-width="1.5" opacity="0.6"/>

      <!-- Corner Brackets on Photo Frame Area -->
      <g stroke="${textColor}" stroke-width="3" fill="none" opacity="0.8">
        <path d="M 50 190 L 50 210 M 50 190 L 70 190" />
        <path d="M ${targetW - 50} 190 L ${targetW - 50} 210 M ${targetW - 50} 190 L ${targetW - 70} 190" />
        <path d="M 50 2820 L 50 2800 M 50 2820 L 70 2820" />
        <path d="M ${targetW - 50} 2820 L ${targetW - 50} 2800 M ${targetW - 50} 2820 L ${targetW - 70} 2820" />
      </g>

      <!-- Retail Editorial Barcode on Bottom Right -->
      <g transform="translate(${targetW - 240}, 2970)">
        <rect x="-10" y="-10" width="190" height="95" fill="${template.backgroundColor === '#09090b' ? '#18181b' : '#f4f4f5'}" rx="6" stroke="${subtextColor}" stroke-width="1"/>
        <!-- Barcode Lines -->
        <g fill="${textColor}">
          <rect x="0" y="0" width="3" height="60"/>
          <rect x="6" y="0" width="2" height="60"/>
          <rect x="12" y="0" width="5" height="60"/>
          <rect x="20" y="0" width="2" height="60"/>
          <rect x="25" y="0" width="4" height="60"/>
          <rect x="33" y="0" width="2" height="60"/>
          <rect x="38" y="0" width="6" height="60"/>
          <rect x="48" y="0" width="3" height="60"/>
          <rect x="55" y="0" width="2" height="60"/>
          <rect x="61" y="0" width="5" height="60"/>
          <rect x="70" y="0" width="4" height="60"/>
          <rect x="78" y="0" width="2" height="60"/>
          <rect x="84" y="0" width="6" height="60"/>
          <rect x="94" y="0" width="2" height="60"/>
          <rect x="100" y="0" width="4" height="60"/>
          <rect x="108" y="0" width="3" height="60"/>
          <rect x="115" y="0" width="5" height="60"/>
          <rect x="124" y="0" width="2" height="60"/>
          <rect x="130" y="0" width="4" height="60"/>
          <rect x="138" y="0" width="3" height="60"/>
          <rect x="145" y="0" width="5" height="60"/>
          <rect x="154" y="0" width="2" height="60"/>
          <rect x="160" y="0" width="4" height="60"/>
        </g>
        <text x="85" y="75" font-family="monospace" font-size="12" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="2">
          9 771234 567008
        </text>
      </g>

      <!-- Left Editorial Issue Blurb -->
      <text x="60" y="2960" font-family="sans-serif" font-size="20" font-weight="bold" fill="${textColor}">
        ISSN 2026-0921 • LIMITED RUN
      </text>
      <text x="60" y="2995" font-family="sans-serif" font-size="15" fill="${subtextColor}">
        ${template.footerText || 'Timeless intimacy captured in high-definition format.'}
      </text>
      <text x="60" y="3025" font-family="sans-serif" font-size="13" fill="${subtextColor}">
        Curated & archived in studio on ${date}.
      </text>
    `;
  } else if (theme === 'film_35mm') {
    // 35mm Sprocket Perforations along Left and Right Borders
    let sprocketsLeft = '';
    let sprocketsRight = '';
    let filmNumbers = '';

    for (let y = 140; y <= 2950; y += 95) {
      sprocketsLeft += `<rect x="14" y="${y}" width="26" height="42" rx="6" fill="${template.backgroundColor === '#000000' || template.backgroundColor === '#18181b' ? '#3f3f46' : '#a1a1aa'}" />`;
      sprocketsRight += `<rect x="${targetW - 40}" y="${y}" width="26" height="42" rx="6" fill="${template.backgroundColor === '#000000' || template.backgroundColor === '#18181b' ? '#3f3f46' : '#a1a1aa'}" />`;
    }

    const marks = ['▲ 01A', 'KODAK 400 TX', 'SAFETY FILM', '▲ 02A', 'ISO 400', '▲ 03A', '36 EXP', '▲ 04A', 'DX CODE 024'];
    marks.forEach((mark, idx) => {
      const y = 300 + idx * 300;
      filmNumbers += `
        <text x="44" y="${y}" font-family="monospace" font-size="12" font-weight="bold" fill="${textColor}" transform="rotate(-90, 44, ${y})" opacity="0.7">${mark}</text>
        <text x="${targetW - 44}" y="${y}" font-family="monospace" font-size="12" font-weight="bold" fill="${textColor}" transform="rotate(90, ${targetW - 44}, ${y})" opacity="0.7">${mark}</text>
      `;
    });

    graphicsContent = `
      ${sprocketsLeft}
      ${sprocketsRight}
      ${filmNumbers}
      <!-- Film Roll Top Header -->
      <text x="${targetW / 2}" y="110" font-family="monospace" font-size="28" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="4">
        ${template.headerText || '35MM ANALOG NEGATIVE'}
      </text>
      <!-- Film Roll Bottom Footer -->
      <text x="${targetW / 2}" y="3040" font-family="monospace" font-size="20" fill="${subtextColor}" text-anchor="middle" letter-spacing="3">
        ${template.footerText || 'ANALOG ARCHIVE'} • ${date}
      </text>
    `;
  } else if (theme === 'wedding_botanical') {
    graphicsContent = `
      <!-- Elegant Botanical Laurel Curves at Header -->
      <g fill="none" stroke="${template.borderColor || '#15803d'}" stroke-width="2.5" opacity="0.85">
        <!-- Top Laurel Arch -->
        <path d="M ${targetW / 2 - 200} 70 Q ${targetW / 2} 40 ${targetW / 2 + 200} 70" />
        <!-- Bottom Laurel Arch -->
        <path d="M ${targetW / 2 - 200} 2950 Q ${targetW / 2} 2980 ${targetW / 2 + 200} 2950" />
      </g>
      <!-- Botanical Leaves -->
      <g fill="${template.borderColor || '#15803d'}" opacity="0.8">
        <circle cx="${targetW / 2 - 140}" cy="60" r="6"/>
        <circle cx="${targetW / 2 - 80}" cy="50" r="5"/>
        <circle cx="${targetW / 2}" cy="42" r="7"/>
        <circle cx="${targetW / 2 + 80}" cy="50" r="5"/>
        <circle cx="${targetW / 2 + 140}" cy="60" r="6"/>

        <circle cx="${targetW / 2 - 140}" cy="2960" r="6"/>
        <circle cx="${targetW / 2 - 80}" cy="2970" r="5"/>
        <circle cx="${targetW / 2}" cy="2978" r="7"/>
        <circle cx="${targetW / 2 + 80}" cy="2970" r="5"/>
        <circle cx="${targetW / 2 + 140}" cy="2960" r="6"/>
      </g>
      <!-- Inner Gold Geometric Line -->
      <rect x="40" y="40" width="${targetW - 80}" height="${targetH - 80}" fill="none" stroke="${template.subtextColor || '#b45309'}" stroke-width="1.5" opacity="0.6"/>
      <!-- Diamond Corner Accents -->
      <g fill="${template.subtextColor || '#b45309'}" opacity="0.8">
        <polygon points="40,40 48,44 44,48 36,44"/>
        <polygon points="${targetW - 40},40 ${targetW - 48},44 ${targetW - 44},48 ${targetW - 36},44"/>
        <polygon points="40,${targetH - 40} 48,${targetH - 44} 44,${targetH - 48} 36,${targetH - 44}"/>
        <polygon points="${targetW - 40},${targetH - 40} ${targetW - 48},${targetH - 44} ${targetW - 44},${targetH - 48} ${targetW - 36},${targetH - 44}"/>
      </g>
      <!-- Wedding Header -->
      <text x="${targetW / 2}" y="125" font-family="serif" font-size="36" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="3">
        ${template.headerText || 'THE VOWS & FOREVER'}
      </text>
      <!-- Wedding Footer -->
      <text x="${targetW / 2}" y="2910" font-family="serif" font-size="24" fill="${subtextColor}" text-anchor="middle" letter-spacing="2">
        ${template.footerText || 'Dua Jiwa • Satu Ikrar Suci'}
      </text>
      <text x="${targetW / 2}" y="3030" font-family="serif" font-size="18" fill="${subtextColor}" text-anchor="middle">
        ${date}
      </text>
    `;
  } else if (theme === 'postcard_airmail') {
    // Airmail Chevron Diagonal Border Slashes
    let airmailBorder = '';
    const stripeWidth = 40;
    // Top border stripes
    for (let x = 0; x < targetW; x += stripeWidth * 2) {
      airmailBorder += `<polygon points="${x},0 ${x + stripeWidth},0 ${x + stripeWidth - 16},24 ${x - 16},24" fill="#dc2626"/>`;
      airmailBorder += `<polygon points="${x + stripeWidth},0 ${x + stripeWidth * 2},0 ${x + stripeWidth * 2 - 16},24 ${x + stripeWidth - 16},24" fill="#1e40af"/>`;
    }
    // Bottom border stripes
    for (let x = 0; x < targetW; x += stripeWidth * 2) {
      airmailBorder += `<polygon points="${x},${targetH - 24} ${x + stripeWidth},${targetH - 24} ${x + stripeWidth - 16},${targetH} ${x - 16},${targetH}" fill="#dc2626"/>`;
      airmailBorder += `<polygon points="${x + stripeWidth},${targetH - 24} ${x + stripeWidth * 2},${targetH - 24} ${x + stripeWidth * 2 - 16},${targetH} ${x + stripeWidth - 16},${targetH}" fill="#1e40af"/>`;
    }

    graphicsContent = `
      ${airmailBorder}
      <!-- Postage Stamp Box at Top Right -->
      <g transform="translate(${targetW - 170}, 45)">
        <rect x="0" y="0" width="110" height="120" fill="#fff1f2" stroke="#b91c1c" stroke-width="2.5" stroke-dasharray="8,4"/>
        <text x="55" y="45" font-family="sans-serif" font-size="11" font-weight="bold" fill="#b91c1c" text-anchor="middle">AIR MAIL</text>
        <text x="55" y="70" font-family="sans-serif" font-size="14" font-weight="900" fill="#b91c1c" text-anchor="middle">POSTAGE</text>
        <text x="55" y="95" font-family="sans-serif" font-size="12" font-weight="bold" fill="#b91c1c" text-anchor="middle">RP 15.000</text>
      </g>

      <!-- Circular Wavy Postmark Stamp at Bottom Right -->
      <g transform="translate(${targetW - 200}, 2960)">
        <circle cx="0" cy="0" r="50" fill="none" stroke="#1e40af" stroke-width="2.5" opacity="0.85"/>
        <text x="0" y="-16" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e40af" text-anchor="middle" letter-spacing="1">JAKARTA • INDONESIA</text>
        <text x="0" y="6" font-family="sans-serif" font-size="14" font-weight="900" fill="#1e40af" text-anchor="middle">${date}</text>
        <text x="0" y="24" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e40af" text-anchor="middle">AIR POST</text>
        <!-- Wavy cancel lines -->
        <path d="M 60 -20 Q 80 -30 100 -20 T 140 -20 M 60 0 Q 80 -10 100 0 T 140 0 M 60 20 Q 80 10 100 20 T 140 20" fill="none" stroke="#1e40af" stroke-width="2" opacity="0.85"/>
      </g>

      <!-- Header & Footer -->
      <text x="70" y="110" font-family="sans-serif" font-size="34" font-weight="900" fill="${textColor}" letter-spacing="4">
        PAR AVION • POST CARD
      </text>
      <text x="70" y="145" font-family="sans-serif" font-size="16" font-weight="bold" fill="${subtextColor}">
        Wanderlust Edition: Mengirimkan senyum dari jauh.
      </text>

      <text x="70" y="2960" font-family="sans-serif" font-size="20" font-weight="bold" fill="${textColor}">
        ${template.footerText || 'Catatan perjalanan & rindu terabadikan'}
      </text>
    `;
  } else if (theme === 'comic_screentone') {
    graphicsContent = `
      <!-- Comic Title Banner Box -->
      <rect x="50" y="50" width="${targetW - 100}" height="90" fill="#fef08a" stroke="#000000" stroke-width="5" rx="8"/>
      <text x="${targetW / 2}" y="110" font-family="sans-serif" font-size="36" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="3">
        ${template.headerText || 'CHAPTER 01: OUR STORY BEGINS!'}
      </text>

      <!-- Action Sound Effect Jagged Star Badge -->
      <g transform="translate(110, 160)">
        <polygon points="0,-35 12,-12 35,-18 20,4 32,26 8,16 -10,32 -14,10 -35,6 -18,-10" fill="#ef4444" stroke="#000000" stroke-width="3"/>
        <text x="0" y="5" font-family="sans-serif" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle">POW!</text>
      </g>

      <!-- Bottom Comic Caption Box -->
      <rect x="50" y="2860" width="${targetW - 100}" height="80" fill="#f8fafc" stroke="#000000" stroke-width="4" rx="6"/>
      <text x="${targetW / 2}" y="2910" font-family="sans-serif" font-size="22" font-weight="bold" fill="#000000" text-anchor="middle">
        ${template.footerText || 'BERSAMBUNG KE HALAMAN BERIKUTNYA...'} • ${date}
      </text>
    `;
  } else if (theme === 'retro_arcade') {
    graphicsContent = `
      <!-- 8-Bit Arcade Score Bar -->
      <text x="70" y="90" font-family="monospace" font-size="24" font-weight="bold" fill="#ef4444" letter-spacing="2">1UP</text>
      <text x="130" y="90" font-family="monospace" font-size="24" font-weight="bold" fill="${textColor}" letter-spacing="2">02400</text>
      <text x="${targetW / 2}" y="90" font-family="monospace" font-size="24" font-weight="bold" fill="#eab308" text-anchor="middle" letter-spacing="2">HIGH SCORE 99990</text>
      <text x="${targetW - 150}" y="90" font-family="monospace" font-size="24" font-weight="bold" fill="#ef4444" letter-spacing="4">♥♥♥</text>

      <line x1="50" y1="120" x2="${targetW - 50}" y2="120" stroke="${textColor}" stroke-width="3" stroke-dasharray="10,6"/>

      <!-- Title Header -->
      <text x="${targetW / 2}" y="155" font-family="monospace" font-size="30" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="3">
        ${template.headerText || 'STAGE CLEAR • TWO PLAYERS'}
      </text>

      <!-- Bottom Insert Coin Footer -->
      <line x1="50" y1="2880" x2="${targetW - 50}" y2="2880" stroke="${textColor}" stroke-width="3" stroke-dasharray="10,6"/>
      <text x="${targetW / 2}" y="2930" font-family="monospace" font-size="24" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="4">
        INSERT COIN TO CONTINUE • CREDITS: 02
      </text>
      <text x="${targetW / 2}" y="2970" font-family="monospace" font-size="18" fill="${subtextColor}" text-anchor="middle">
        RECORDED ON ${date}
      </text>
    `;
  } else {
    // Default minimal / modern
    graphicsContent = `
      <line x1="60" y1="120" x2="${targetW - 60}" y2="120" stroke="${textColor}" stroke-width="1.5" opacity="0.4"/>
      <text x="${targetW / 2}" y="90" font-family="sans-serif" font-size="32" font-weight="bold" fill="${textColor}" text-anchor="middle" letter-spacing="6">
        ${template.headerText || 'SATU FRAME ARCHIVE'}
      </text>
      <text x="${targetW / 2}" y="2950" font-family="sans-serif" font-size="22" fill="${subtextColor}" text-anchor="middle" letter-spacing="3">
        ${template.footerText || 'DUA TEMPAT • SATU MOMEN'} • ${date}
      </text>
    `;
  }

  return `
    <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      ${graphicsContent}
    </svg>
  `;
}

/**
 * Draws matching procedural high-resolution canvas graphics on HTML5 Canvas (client-side).
 */
export function drawFrameCanvasDecorations(
  ctx: CanvasRenderingContext2D,
  template: FrameTemplate,
  targetW: number,
  targetH: number,
  layout: LayoutProfile,
  dateStr?: string
) {
  const theme = getStyleTheme(template);
  const textColor = template.textColor || (template.category === 'classic' ? '#f4f4f5' : '#1c1917');
  const subtextColor = template.subtextColor || (template.category === 'classic' ? '#a1a1aa' : '#57534e');
  const date = dateStr || new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' });

  ctx.save();

  if (theme === 'newspaper') {
    // Top double lines
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(50, 40);
    ctx.lineTo(targetW - 50, 40);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 48);
    ctx.lineTo(targetW - 50, 48);
    ctx.stroke();

    // Top info bar
    ctx.fillStyle = subtextColor;
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'left';
    ctx.fillText('EDISI KHUSUS • NO. 1926', 60, 72);
    ctx.textAlign = 'center';
    ctx.fillText('SATU FRAME CHRONICLE', targetW / 2, 72);
    ctx.textAlign = 'right';
    ctx.fillText('HARGA RP 15.000', targetW - 60, 72);

    // Rule under info bar
    ctx.beginPath();
    ctx.moveTo(50, 84);
    ctx.lineTo(targetW - 50, 84);
    ctx.stroke();

    // Main Masthead Title
    ctx.fillStyle = textColor;
    ctx.font = '900 44px serif';
    ctx.textAlign = 'center';
    ctx.fillText(template.headerText || 'THE DAILY CHRONICLE', targetW / 2, 136);

    // Bottom double rule under masthead
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 154);
    ctx.lineTo(targetW - 50, 154);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 160);
    ctx.lineTo(targetW - 50, 160);
    ctx.stroke();

    // Column separator dashed line
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(targetW / 2, 180);
    ctx.lineTo(targetW / 2, 2800);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    // Bottom Headline section
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 2840);
    ctx.lineTo(targetW - 50, 2840);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.fillText('BERITA UTAMA: DUA TEMPAT, SATU MOMEN ABADI', targetW / 2, 2875);

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 2895);
    ctx.lineTo(targetW - 50, 2895);
    ctx.stroke();

    // Seal Stamp
    ctx.save();
    ctx.translate(targetW - 170, 2990);
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ SATU FRAME ★', 0, -18);
    ctx.font = '900 11px serif';
    ctx.fillText('VERIFIED', 0, 2);
    ctx.font = '9px serif';
    ctx.fillText('ARCHIVE 2026', 0, 16);
    ctx.font = '8px serif';
    ctx.fillText(date, 0, 28);
    ctx.restore();

    // Footer captions
    ctx.fillStyle = subtextColor;
    ctx.font = '18px serif';
    ctx.textAlign = 'left';
    ctx.fillText('Laporan Eksklusif: Rekaman momen otentik berdua tanpa manipulasi.', 60, 2960);
    ctx.font = '16px serif';
    ctx.fillText(`Dicetak otomatis dari peramban web pada ${date}.`, 60, 2990);
  } else if (theme === 'magazine') {
    // Top masthead
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(60, 45);
    ctx.lineTo(targetW - 60, 45);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = textColor;
    ctx.font = '900 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(template.headerText || 'THE EDITORIAL', targetW / 2, 115);

    ctx.fillStyle = subtextColor;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('PORTRAIT ISSUE • SPECIAL COLLECTION • VOL. 08', targetW / 2, 145);

    ctx.strokeStyle = textColor;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.lineTo(targetW - 60, 160);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Corner brackets
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 210);
    ctx.lineTo(50, 190);
    ctx.lineTo(70, 190);
    ctx.moveTo(targetW - 50, 210);
    ctx.lineTo(targetW - 50, 190);
    ctx.lineTo(targetW - 70, 190);
    ctx.stroke();

    // Retail Barcode
    ctx.save();
    ctx.translate(targetW - 240, 2970);
    ctx.fillStyle = template.backgroundColor === '#09090b' ? '#18181b' : '#f4f4f5';
    ctx.fillRect(-10, -10, 190, 95);
    ctx.strokeStyle = subtextColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(-10, -10, 190, 95);

    ctx.fillStyle = textColor;
    const barWidths = [3, 2, 5, 2, 4, 2, 6, 3, 2, 5, 4, 2, 6, 2, 4, 3, 5, 2, 4, 3, 5, 2, 4];
    let curX = 0;
    for (const w of barWidths) {
      ctx.fillRect(curX, 0, w, 60);
      curX += w + 3;
    }
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('9 771234 567008', 85, 75);
    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ISSN 2026-0921 • LIMITED RUN', 60, 2960);
    ctx.fillStyle = subtextColor;
    ctx.font = '15px sans-serif';
    ctx.fillText(template.footerText || 'Timeless intimacy captured in high-definition format.', 60, 2995);
    ctx.font = '13px sans-serif';
    ctx.fillText(`Curated & archived in studio on ${date}.`, 60, 3025);
  } else if (theme === 'film_35mm') {
    // Sprocket perforations
    const sprocketColor = template.backgroundColor === '#000000' || template.backgroundColor === '#18181b' ? '#3f3f46' : '#a1a1aa';
    ctx.fillStyle = sprocketColor;

    for (let y = 140; y <= 2950; y += 95) {
      ctx.beginPath();
      ctx.roundRect(14, y, 26, 42, 6);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(targetW - 40, y, 26, 42, 6);
      ctx.fill();
    }

    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(template.headerText || '35MM ANALOG NEGATIVE', targetW / 2, 110);

    ctx.fillStyle = subtextColor;
    ctx.font = '20px monospace';
    ctx.fillText(`${template.footerText || 'ANALOG ARCHIVE'} • ${date}`, targetW / 2, 3040);
  } else if (theme === 'wedding_botanical') {
    ctx.strokeStyle = template.borderColor || '#15803d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(targetW / 2 - 200, 70);
    ctx.quadraticCurveTo(targetW / 2, 40, targetW / 2 + 200, 70);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText(template.headerText || 'THE VOWS & FOREVER', targetW / 2, 125);

    ctx.fillStyle = subtextColor;
    ctx.font = '24px serif';
    ctx.fillText(template.footerText || 'Dua Jiwa • Satu Ikrar Suci', targetW / 2, 2910);
    ctx.font = '18px serif';
    ctx.fillText(date, targetW / 2, 3030);
  } else if (theme === 'postcard_airmail') {
    // Airmail Chevron Top and Bottom Borders
    const stripeW = 40;
    for (let x = 0; x < targetW; x += stripeW * 2) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW - 16, 24);
      ctx.lineTo(x - 16, 24);
      ctx.fill();

      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.moveTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW * 2, 0);
      ctx.lineTo(x + stripeW * 2 - 16, 24);
      ctx.lineTo(x + stripeW - 16, 24);
      ctx.fill();
    }

    // Postage Stamp Box
    ctx.save();
    ctx.translate(targetW - 170, 45);
    ctx.fillStyle = '#fff1f2';
    ctx.fillRect(0, 0, 110, 120);
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, 110, 120);
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AIR MAIL', 55, 45);
    ctx.font = '900 14px sans-serif';
    ctx.fillText('POSTAGE', 55, 70);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('RP 15.000', 55, 95);
    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.font = '900 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PAR AVION • POST CARD', 70, 110);
    ctx.fillStyle = subtextColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Wanderlust Edition: Mengirimkan senyum dari jauh.', 70, 145);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(template.footerText || 'Catatan perjalanan & rindu terabadikan', 70, 2960);
  } else if (theme === 'comic_screentone') {
    // Comic banner
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(50, 50, targetW - 100, 90, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(template.headerText || 'CHAPTER 01: OUR STORY BEGINS!', targetW / 2, 110);

    // Comic footer box
    ctx.fillStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(50, 2860, targetW - 100, 80, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`${template.footerText || 'BERSAMBUNG KE HALAMAN BERIKUTNYA...'} • ${date}`, targetW / 2, 2910);
  }

  ctx.restore();
}
