import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

// Mic glyph on the app's blue gradient (hex approximations of the oklch FAB gradient)
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5f8fd9"/>
      <stop offset="1" stop-color="#4a68c9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g transform="translate(256,244) scale(11)" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none">
    <rect x="-3" y="-14" width="6" height="11" rx="3" fill="#fff" stroke="none"/>
    <path d="M-7 -5.5a7 7 0 0 0 14 0"/>
    <line x1="0" y1="1.5" x2="0" y2="5.5"/>
    <line x1="-3.5" y1="5.5" x2="3.5" y2="5.5"/>
  </g>
</svg>`)

await mkdir('public', { recursive: true })
for (const [size, name] of [
  [192, 'pwa-192x192.png'],
  [512, 'pwa-512x512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  await sharp(svg).resize(size, size).png().toFile(`public/${name}`)
  console.log(`wrote public/${name}`)
}
