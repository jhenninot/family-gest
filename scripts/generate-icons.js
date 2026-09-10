import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('public/favicon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

// SVG for standard icons (squircle)
const standardSvg = svgContent;

// SVG for maskable icons (full bleed gradient, centered sparkles inside safe zone)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="fgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="60%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
  </defs>
  <!-- Full bleed background for maskable safe zone -->
  <rect width="64" height="64" fill="url(#fgGradient)" />

  <!-- Centered sparkles scaled into safe zone (80%) -->
  <g transform="translate(6.4, 6.4) scale(0.8)">
    <path d="M32 11 C32.5 21 34 24.5 44 25 C34 25.5 32.5 29 32 39 C31.5 29 30 25.5 20 25 C30 24.5 31.5 21 32 11 Z" fill="#ffffff" />
    <path d="M47 34 C47.5 39 48.5 41 53.5 41.5 C48.5 42 47.5 44 47 49 C46.5 44 45.5 42 40.5 41.5 C45.5 41 46.5 39 47 34 Z" fill="#ffffff" opacity="0.95" />
    <path d="M18 38 C18.5 41.5 19.5 43 23 43.5 C19.5 44 18.5 45.5 18 49 C17.5 45.5 16.5 44 13 43.5 C16.5 43 17.5 41.5 18 38 Z" fill="#ffffff" opacity="0.9" />
  </g>
</svg>`;

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  // Standard icons
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));
  console.log('✓ Created public/pwa-192x192.png');

  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));
  console.log('✓ Created public/pwa-512x512.png');

  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // Maskable icons
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-maskable-192x192.png'));
  console.log('✓ Created public/pwa-maskable-192x192.png');

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-maskable-512x512.png'));
  console.log('✓ Created public/pwa-maskable-512x512.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
