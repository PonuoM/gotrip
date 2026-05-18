// One-off icon generator. Reads scripts/icon-source.png and writes resized
// PNGs for favicon, PWA manifest, and apple-touch.
//
// Re-run when the source logo changes:
//   npm install --no-save jimp@0.22.12
//   node scripts/make-icons.mjs
//
// jimp is intentionally not in package.json — this only runs at design time.
import pkg from 'jimp'
const Jimp = pkg.Jimp || pkg

const SRC = 'scripts/icon-source.png'
const OUTS = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-icon.png', size: 180 }, // iOS home-screen
  { name: 'favicon-32.png', size: 32 },  // browser tab
]

// Step 1: trim the uniform white/transparent margin around the logo so it
// fills the icon canvas instead of floating in the middle.
const src = await Jimp.read(SRC)
src.autocrop({ tolerance: 0.0006, cropOnlyFrames: false, cropSymmetric: false })

// Step 2: pad to a square (transparent) so non-square sources still resize
// cleanly without distortion. Transparency lets each launcher (Android
// adaptive icon, iOS home screen, browser tab) supply its own background.
const w = src.bitmap.width
const h = src.bitmap.height
const side = Math.max(w, h)
const square = new Jimp(side, side, 0x00000000)
square.composite(src, Math.floor((side - w) / 2), Math.floor((side - h) / 2))

// Step 3: emit at every size we need.
for (const { name, size } of OUTS) {
  const out = square.clone().resize(size, size)
  await out.writeAsync(`public/${name}`)
  console.log(`wrote public/${name}`)
}
