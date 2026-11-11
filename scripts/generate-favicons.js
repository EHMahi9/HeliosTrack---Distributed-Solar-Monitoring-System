const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 1. Precise vector SVG favicon for modern browsers & Retina/4K displays
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="45%" stop-color="#070B14" />
      <stop offset="100%" stop-color="#020408" />
    </linearGradient>

    <!-- Border Ring Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#34D399" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#D97706" stop-opacity="0.9" />
    </linearGradient>

    <!-- Solar Ray Linear Gradient -->
    <linearGradient id="rayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="40%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <!-- Solar Cell Wafer Gradient -->
    <radialGradient id="waferGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="25%" stop-color="#FDE68A" />
      <stop offset="60%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#B45309" />
    </radialGradient>

    <!-- Ambient Solar Corona Glow -->
    <radialGradient id="coronaGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#FBBF24" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#D97706" stop-opacity="0" />
    </radialGradient>

    <!-- Live Grid Indicator -->
    <radialGradient id="emeraldPulse" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6EE7B7" />
      <stop offset="50%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#047857" />
    </radialGradient>

    <filter id="solarBloom" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="#F59E0B" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Squircle Housing -->
  <rect x="28" y="28" width="456" height="456" rx="108" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="10" />

  <!-- Corona Aura -->
  <circle cx="256" cy="256" r="195" fill="url(#coronaGlow)" />

  <!-- Outer Solar Rays (8-Point Star Array) -->
  <g filter="url(#solarBloom)">
    <!-- Cardinal: Top -->
    <polygon points="256,60 274,152 238,152" fill="url(#rayGrad)" />
    <!-- Cardinal: Bottom -->
    <polygon points="256,452 274,360 238,360" fill="url(#rayGrad)" />
    <!-- Cardinal: Left -->
    <polygon points="60,256 152,238 152,274" fill="url(#rayGrad)" />
    <!-- Cardinal: Right -->
    <polygon points="452,256 360,238 360,274" fill="url(#rayGrad)" />

    <!-- Ordinal: Top-Right -->
    <polygon points="398,114 340,186 314,160" fill="url(#rayGrad)" opacity="0.9" />
    <!-- Ordinal: Bottom-Right -->
    <polygon points="398,398 314,352 340,326" fill="url(#rayGrad)" opacity="0.9" />
    <!-- Ordinal: Bottom-Left -->
    <polygon points="114,398 172,326 198,352" fill="url(#rayGrad)" opacity="0.9" />
    <!-- Ordinal: Top-Left -->
    <polygon points="114,114 198,160 172,186" fill="url(#rayGrad)" opacity="0.9" />
  </g>

  <!-- Photovoltaic Hexagonal / Circular Solar Core Disc -->
  <circle cx="256" cy="256" r="112" fill="url(#waferGlow)" stroke="#FFFBEB" stroke-width="3" stroke-opacity="0.6" />

  <!-- PV Busbar Crosshairs (Subdividing Silicon Cells) -->
  <!-- Horizontal Busbar -->
  <line x1="146" y1="256" x2="366" y2="256" stroke="#070B14" stroke-width="10" stroke-linecap="round" />
  <!-- Vertical Busbar -->
  <line x1="256" y1="146" x2="256" y2="366" stroke="#070B14" stroke-width="10" stroke-linecap="round" />

  <!-- Microgrid Fine Cell Fingers (Silicon Wafer Sub-circuits) -->
  <line x1="168" y1="190" x2="246" y2="190" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />
  <line x1="266" y1="190" x2="344" y2="190" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />
  <line x1="168" y1="222" x2="246" y2="222" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />
  <line x1="266" y1="222" x2="344" y2="222" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />
  <line x1="168" y1="290" x2="246" y2="290" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />
  <line x1="266" y1="290" x2="344" y2="290" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />
  <line x1="168" y1="322" x2="246" y2="322" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />
  <line x1="266" y1="322" x2="344" y2="322" stroke="#FFFBEB" stroke-width="2" stroke-opacity="0.5" />

  <!-- Central High-Intensity Photon Spark -->
  <polygon points="256,224 266,256 298,256 272,266 282,298 256,276 230,298 240,266 214,256 246,256" fill="#FFFFFF" />
  <circle cx="256" cy="256" r="10" fill="#FFFBEB" />

  <!-- Live Microgrid Intertie Pulse Node (Bottom-Right Status Pill) -->
  <circle cx="396" cy="396" r="22" fill="#070B14" stroke="#10B981" stroke-width="4" />
  <circle cx="396" cy="396" r="12" fill="url(#emeraldPulse)" />
</svg>`;

// 2. Pure Node.js PNG encoder
function createPng(width, height, getPixel) {
  const rowSize = width * 4;
  const raw = Buffer.alloc(height * (1 + rowSize));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + rowSize)] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const offset = y * (1 + rowSize) + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  const idatData = zlib.deflateSync(raw);

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type);
    const body = Buffer.concat([t, data]);
    let c = 0xffffffff;
    for (let i = 0; i < body.length; i++) c = crcTable[(c ^ body[i]) & 0xff] ^ (c >>> 8);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

// 3. Mathematical rasterizer of the HeliosTrack Icon
function renderHeliosPixel(x, y, size) {
  // Normalize coordinates to [-1, 1]
  const nx = (x / (size - 1)) * 2 - 1;
  const ny = (y / (size - 1)) * 2 - 1;
  const distOrigin = Math.sqrt(nx * nx + ny * ny);

  // Background Squircle: |nx|^3.2 + |ny|^3.2 <= 1
  const squircle = Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2);
  if (squircle > 1.02) {
    return [0, 0, 0, 0]; // Transparent outer padding
  }

  // Squircle Border rim
  if (squircle > 0.88) {
    // Golden-amber border rim
    const t = (squircle - 0.88) / (1.02 - 0.88);
    const alpha = Math.floor(Math.min(1, Math.max(0, (1.02 - squircle) / 0.08)) * 255);
    return [245, 158, 11, alpha];
  }

  // Inside badge: dark obsidian gradient (#0B1120 -> #020408)
  const bgR = Math.floor(11 + (ny * -3));
  const bgG = Math.floor(17 + (ny * -4));
  const bgB = Math.floor(32 + (ny * -8));

  // Live green microgrid node at bottom right (nx ~ 0.55, ny ~ 0.55)
  const dotDx = nx - 0.55;
  const dotDy = ny - 0.55;
  const dotDist = Math.sqrt(dotDx * dotDx + dotDy * dotDy);
  if (dotDist < 0.12) {
    if (dotDist < 0.08) return [52, 211, 153, 255]; // Bright Emerald
    return [7, 11, 20, 255]; // Dark rim
  }

  // 8-Directional Solar Rays
  const angle = Math.atan2(ny, nx);
  // Cardinal ray check: horizontal or vertical
  const isHoriz = Math.abs(ny) < 0.09 && Math.abs(nx) > 0.40 && Math.abs(nx) < 0.82;
  const isVert = Math.abs(nx) < 0.09 && Math.abs(ny) > 0.40 && Math.abs(ny) < 0.82;
  // Ordinal ray check: 45 degree diagonals
  const diagDiff1 = Math.abs(Math.abs(nx) - Math.abs(ny));
  const isDiag = diagDiff1 < 0.10 && distOrigin > 0.45 && distOrigin < 0.78;

  if (isHoriz || isVert) {
    return [251, 191, 36, 255]; // Amber ray
  }
  if (isDiag) {
    return [245, 158, 11, 220]; // Muted amber diagonal ray
  }

  // Solar Core Disc (radius 0.42)
  if (distOrigin <= 0.44) {
    // Solar cell busbar crosshairs (#070B14)
    if (Math.abs(nx) < 0.06 || Math.abs(ny) < 0.06) {
      if (distOrigin < 0.16) {
        // Center spark: White / pale yellow
        return [255, 255, 255, 255];
      }
      return [7, 11, 20, 255]; // Dark busbar
    }

    // Center diamond spark
    if (Math.abs(nx) + Math.abs(ny) < 0.22) {
      return [255, 251, 235, 255]; // Pure solar white spark
    }

    // Solar silicon cells gradient: Radiant Amber to Cadmium
    const t = distOrigin / 0.44;
    const r = Math.floor(254 - t * 30);
    const g = Math.floor(220 - t * 80);
    const b = Math.floor(120 - t * 90);
    return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b)), 255];
  }

  // Corona background glow
  if (distOrigin < 0.75) {
    const glowT = (distOrigin - 0.44) / 0.31;
    const glowAlpha = Math.floor((1 - glowT) * 75);
    const r = Math.floor(bgR + (245 - bgR) * (glowAlpha / 255));
    const g = Math.floor(bgG + (158 - bgG) * (glowAlpha / 255));
    const b = Math.floor(bgB + (11 - bgB) * (glowAlpha / 255));
    return [r, g, b, 255];
  }

  return [bgR, bgG, bgB, 255];
}

// 4. Packaging multiple PNG images into a standard Windows/Browser ICO container
function createIco(pngBuffers) {
  // ICONDIR header: 6 bytes
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Count

  // ICONDIRENTRY entries: 16 bytes per image
  const entries = [];
  let currentOffset = 6 + count * 16;

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Color count
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Planes
    entry.writeUInt16LE(32, 6); // Bit count
    entry.writeUInt32LE(item.buffer.length, 8); // Bytes in resource
    entry.writeUInt32LE(currentOffset, 12); // Image data offset
    entries.push(entry);
    currentOffset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

// Generate all assets
console.log('Generating HeliosTrack production favicon suite...');

// 1. Vector SVG
const svgPathFrontendApp = path.join(__dirname, '..', 'frontend', 'app', 'icon.svg');
const svgPathFrontendPublic = path.join(__dirname, '..', 'frontend', 'public', 'icon.svg');
const svgPathFrontendFavicon = path.join(__dirname, '..', 'frontend', 'public', 'favicon.svg');
const svgPathWebClient = path.join(__dirname, '..', 'web-client', 'favicon.svg');

fs.writeFileSync(svgPathFrontendApp, svgIcon, 'utf8');
if (!fs.existsSync(path.dirname(svgPathFrontendPublic))) fs.mkdirSync(path.dirname(svgPathFrontendPublic), { recursive: true });
fs.writeFileSync(svgPathFrontendPublic, svgIcon, 'utf8');
fs.writeFileSync(svgPathFrontendFavicon, svgIcon, 'utf8');
fs.writeFileSync(svgPathWebClient, svgIcon, 'utf8');
console.log('✓ Vector SVG favicons generated.');

// 2. High-Res PNGs & ICO
const png16 = createPng(16, 16, (x, y) => renderHeliosPixel(x, y, 16));
const png32 = createPng(32, 32, (x, y) => renderHeliosPixel(x, y, 32));
const png48 = createPng(48, 48, (x, y) => renderHeliosPixel(x, y, 48));
const png180 = createPng(180, 180, (x, y) => renderHeliosPixel(x, y, 180));

const icoBuffer = createIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 }
]);

const icoPathApp = path.join(__dirname, '..', 'frontend', 'app', 'favicon.ico');
const icoPathPublic = path.join(__dirname, '..', 'frontend', 'public', 'favicon.ico');
const icoPathWebClient = path.join(__dirname, '..', 'web-client', 'favicon.ico');
const appleIconApp = path.join(__dirname, '..', 'frontend', 'app', 'apple-icon.png');
const appleIconPublic = path.join(__dirname, '..', 'frontend', 'public', 'apple-touch-icon.png');

fs.writeFileSync(icoPathApp, icoBuffer);
fs.writeFileSync(icoPathPublic, icoBuffer);
fs.writeFileSync(icoPathWebClient, icoBuffer);
fs.writeFileSync(appleIconApp, png180);
fs.writeFileSync(appleIconPublic, png180);

console.log('✓ Multi-resolution favicon.ico generated (16x16, 32x32, 48x48):', icoBuffer.length, 'bytes');
console.log('✓ Apple touch icon generated (180x180):', png180.length, 'bytes');
console.log('All favicon assets deployed across frontend/app, frontend/public, and web-client!');
