import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('public/favicon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

// SVG for standard icons (squircle iOS)
const standardSvg = svgContent;

// SVG for maskable and Apple touch icons (full bleed gradient without transparency)
const fullBleedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="fgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <filter id="iconShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#0369a1" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Full bleed background (no transparency for iOS Safari and PWA maskable) -->
  <rect width="512" height="512" fill="url(#fgGradient)" />

  <g filter="url(#iconShadow)">
    <!-- Toit supérieur protecteur -->
    <path 
      d="M100 270 L240 148 L390 270" 
      fill="none" 
      stroke="#ffffff" 
      stroke-width="36" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />
    
    <!-- Cheminée moderne épurée -->
    <path 
      d="M336 175 L336 135 L300 135" 
      fill="none" 
      stroke="#ffffff" 
      stroke-width="30" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />

    <!-- Corps de la maison -->
    <path 
      d="M145 255 L145 375 C145 390 155 400 170 400 L340 400 C355 400 365 390 365 375 L365 300" 
      fill="none" 
      stroke="#ffffff" 
      stroke-width="34" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      opacity="0.95" 
    />

    <!-- Coche d'organisation dynamique (Checkmark) -->
    <path 
      d="M215 285 L285 355 L425 195" 
      fill="none" 
      stroke="#ffffff" 
      stroke-width="40" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />
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

  // Apple Touch Icon (iOS requires full bleed without transparent corners)
  await sharp(Buffer.from(fullBleedSvg))
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // Maskable icons (PWA spec requires full bleed)
  await sharp(Buffer.from(fullBleedSvg))
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-maskable-192x192.png'));
  console.log('✓ Created public/pwa-maskable-192x192.png');

  await sharp(Buffer.from(fullBleedSvg))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-maskable-512x512.png'));
  console.log('✓ Created public/pwa-maskable-512x512.png');

  // Icônes de la skill Alexa (fiche de l'application Alexa, envoyées par server/alexa/sync.js) :
  // Amazon impose ces deux tailles exactes
  for (const size of [108, 512]) {
    await sharp(Buffer.from(fullBleedSvg))
      .resize(size, size)
      .png()
      .toFile(path.resolve(`public/alexa-icon-${size}.png`));
    console.log(`✓ Created public/alexa-icon-${size}.png`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
