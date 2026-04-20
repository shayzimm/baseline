import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
const svg = readFileSync(resolve(publicDir, 'icon.svg'))

const sizes = [192, 512]
for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}

// Also write favicon.ico equivalent as a 32px PNG for browsers that need it
await sharp(svg).resize(32, 32).png().toFile(resolve(publicDir, 'favicon-32.png'))
console.log('✓ favicon-32.png')
