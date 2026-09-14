import { copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const assetsDir = join(root, 'dist', 'assets')

const aliases = {
  'index.js': [
    'index-GT9uCN92.js',
    'index-DNMh3WQS.js',
    'index-CvO7he-y.js',
    'index-DrPCYlEo.js',
    'index-B5Oeh1o0.js',
    'index-CZC_ZOOM.js',
    'index-Dqy4qkds.js',
  ],
  'index.css': [
    'index-DZTywv5U.css',
    'index-ato5heG7.css',
  ],
}

await mkdir(assetsDir, { recursive: true })

for (const [source, targets] of Object.entries(aliases)) {
  const sourcePath = join(assetsDir, source)
  await stat(sourcePath)
  await Promise.all(targets.map((target) => copyFile(sourcePath, join(assetsDir, target))))
}
