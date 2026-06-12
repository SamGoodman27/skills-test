#!/usr/bin/env node
/**
 * Frame-perfect MP4 export.
 *
 *   npm run build
 *   node scripts/render-video.mjs my-show.slideshow.json out.mp4 [--fps 30] [--scale 1]
 *
 * Requires: `npx playwright install chromium` and ffmpeg on PATH.
 * Serves the built app, mounts the ?render harness, steps the timeline one
 * frame at a time (deterministic — the player is a pure function of t),
 * screenshots each frame into ffmpeg, and muxes the show's audio track.
 */
import { createServer } from 'node:http'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { extname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : dflt
}

const [showPath, outPath = 'slideshow.mp4'] = positional
if (!showPath) {
  console.error('Usage: node scripts/render-video.mjs <show.slideshow.json> [out.mp4] [--fps 30] [--scale 1]')
  process.exit(1)
}
const fps = flag('fps', 30)
const scale = flag('scale', 1)

const dist = resolve(import.meta.dirname, '../dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ not found — run `npm run build` first.')
  process.exit(1)
}

const doc = JSON.parse(await readFile(showPath, 'utf8'))

// --- tiny static server for dist/ ---
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0]
  const file = join(dist, path === '/' ? 'index.html' : path)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    const body = await readFile(join(dist, 'index.html'))
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(body)
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

// --- audio: write the embedded data-URL track to a temp file for ffmpeg ---
let audioFile = null
if (doc.settings?.audio?.src?.startsWith('data:')) {
  const [head, b64] = doc.settings.audio.src.split(',')
  const ext = head.includes('mpeg') ? 'mp3' : head.includes('ogg') ? 'ogg' : head.includes('wav') ? 'wav' : 'm4a'
  audioFile = join(tmpdir(), `lumiere-audio-${Date.now()}.${ext}`)
  await writeFile(audioFile, Buffer.from(b64, 'base64'))
}

const { chromium } = await import('playwright')
const browser = await chromium.launch()
const page = await browser.newPage()

const info = await (async () => {
  await page.goto(`http://127.0.0.1:${port}/?render`)
  await page.waitForSelector('#render-waiting')
  const meta = await page.evaluate((d) => window.__loadDoc(d), doc)
  await page.setViewportSize({
    width: Math.round(meta.width * scale),
    height: Math.round(meta.height * scale),
  })
  await page.evaluate(() => document.fonts.ready)
  return meta
})()

const frames = Math.ceil((info.total / 1000) * fps)
console.log(`Rendering ${frames} frames at ${fps}fps (${info.width}x${info.height} @${scale}x)...`)

const ffArgs = [
  '-y',
  '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  ...(audioFile ? ['-i', audioFile] : []),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
  ...(audioFile
    ? ['-c:a', 'aac', '-b:a', '192k', '-shortest', `-af`, `volume=${doc.settings.audio.volume ?? 1}`]
    : []),
  outPath,
]
const ffmpeg = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] })

for (let f = 0; f < frames; f++) {
  const t = (f / fps) * 1000
  await page.evaluate((ms) => window.__renderAt(ms), t)
  const png = await page.screenshot({ type: 'png' })
  if (!ffmpeg.stdin.write(png)) {
    await new Promise((r) => ffmpeg.stdin.once('drain', r))
  }
  if (f % fps === 0) process.stdout.write(`\r${Math.round((f / frames) * 100)}%`)
}
ffmpeg.stdin.end()
await new Promise((r) => ffmpeg.on('close', r))
console.log(`\rDone: ${outPath}`)

await browser.close()
server.close()
if (audioFile) await rm(audioFile, { force: true })
