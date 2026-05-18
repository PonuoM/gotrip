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

const src = await Jimp.read(SRC)
for (const { name, size } of OUTS) {
  const out = src.clone().resize(size, size)
  await out.writeAsync(`public/${name}`)
  console.log(`wrote public/${name}`)
}
