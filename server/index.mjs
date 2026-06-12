#!/usr/bin/env node
/**
 * Lumière AI service — runs locally so API keys never reach the browser.
 *
 *   cp server/.env.example server/.env   # add your keys
 *   npm run server                       # then `npm run dev` in another terminal
 *
 * Endpoints (the Vite dev server proxies /ai to this):
 *   POST /ai/text   { mode: 'copy'|'style', prompt, element, context }
 *   POST /ai/image  { prompt, image: dataURL }   (requires GEMINI_API_KEY)
 *   POST /ai/magic  { images: [{id, data}], vibe }  -> slideshow plan
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// --- minimal .env loader (no dependency) ---
const envPath = join(import.meta.dirname, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const GEMINI_KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const PORT = Number(process.env.PORT || 8787)

const TEXT_STYLE_SCHEMA = {
  type: 'object',
  properties: {
    fontFamily: {
      type: 'string',
      enum: ['Inter', 'Fraunces', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Caveat', 'Space Grotesk'],
    },
    fontSize: { type: 'number', minimum: 10, maximum: 400 },
    fontWeight: { type: 'number', enum: [300, 400, 500, 600, 700] },
    fontStyle: { type: 'string', enum: ['normal', 'italic'] },
    color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
    align: { type: 'string', enum: ['left', 'center', 'right'] },
    lineHeight: { type: 'number', minimum: 0.8, maximum: 3 },
    letterSpacing: { type: 'number', minimum: -2, maximum: 20 },
    shadow: { type: 'boolean' },
    animation: {
      type: 'string',
      enum: ['none', 'fade', 'fade-up', 'fade-down', 'zoom-in'],
    },
  },
  additionalProperties: false,
}

async function callClaude(system, userContent, toolName, schema, maxTokens = 1024) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY })
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userContent }],
    tools: [{ name: toolName, description: 'Emit the result.', input_schema: schema }],
    tool_choice: { type: 'tool', name: toolName },
  })
  const tool = msg.content.find((b) => b.type === 'tool_use')
  if (!tool) throw new Error('model returned no structured output')
  return tool.input
}

async function handleText(body) {
  if (!ANTHROPIC_KEY) throw httpError(501, 'ANTHROPIC_API_KEY is not configured in server/.env')
  const { mode, prompt, element, context } = body

  if (mode === 'copy') {
    const system =
      'You write short on-slide text for photo slideshows. Match the tone of the surrounding show. ' +
      'Return only the rewritten text for the selected element; keep line breaks intentional and the result concise enough to fit a slide.'
    const user = [
      context?.otherTexts?.length
        ? `Other text on nearby slides (for tone): ${JSON.stringify(context.otherTexts)}`
        : '',
      `Current text: ${JSON.stringify(element.content)}`,
      `Instruction: ${prompt}`,
    ]
      .filter(Boolean)
      .join('\n')
    return callClaude(system, user, 'emit_text', {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The rewritten slide text. Use \\n for line breaks.' },
      },
      required: ['content'],
      additionalProperties: false,
    })
  }

  if (mode === 'style') {
    const system =
      'You are a slide typography designer. Given the current style of a text element and a creative direction, ' +
      'return new style values. Only include properties you want to change. Choose tasteful, readable combinations; ' +
      'prefer enabling the shadow when text sits over photos.'
    const user =
      `Current style: ${JSON.stringify(element.style)}\n` +
      `Current animation: ${element.animation}\n` +
      `Text content: ${JSON.stringify(element.content)}\n` +
      `Slide background type: ${context?.backgroundType ?? 'unknown'}\n` +
      `Direction: ${prompt}`
    return callClaude(system, user, 'emit_style', TEXT_STYLE_SCHEMA)
  }

  throw httpError(400, `unknown text mode: ${mode}`)
}

async function handleImage(body) {
  if (!GEMINI_KEY) throw httpError(501, 'GEMINI_API_KEY is not configured in server/.env')
  const { prompt, image } = body
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(image ?? '')
  if (!m) throw httpError(400, 'image must be a base64 data URL (png/jpeg)')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: m[1], data: m[2] } },
              { text: prompt },
            ],
          },
        ],
      }),
    },
  )
  if (!res.ok) throw httpError(502, `image model error ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data)
  const data = part?.inlineData ?? part?.inline_data
  if (!data) throw httpError(502, 'image model returned no image')
  return { image: `data:${data.mimeType ?? data.mime_type ?? 'image/png'};base64,${data.data}` }
}

const MAGIC_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A short evocative title for the show.' },
    themeId: {
      type: 'string',
      enum: ['elegant', 'vibrant', 'minimal', 'scrapbook'],
      description: 'The visual theme that best fits the photos and the vibe.',
    },
    slides: {
      type: 'array',
      description: 'The slide sequence, telling a story: opener, body, closer.',
      items: {
        type: 'object',
        properties: {
          media: {
            type: 'array',
            items: { type: 'string' },
            description: 'Image ids on this slide (0 for text-only, up to 4).',
          },
          layout: {
            type: 'string',
            enum: ['title', 'full', 'split-left', 'split-right', 'pair', 'grid', 'closing'],
          },
          headline: { type: 'string', description: 'Large display text, if any. Keep it short.' },
          caption: { type: 'string', description: 'Small supporting text, if any.' },
          durationMs: { type: 'number', minimum: 2500, maximum: 12000 },
        },
        required: ['media', 'layout'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'themeId', 'slides'],
  additionalProperties: false,
}

async function handleMagic(body) {
  if (!ANTHROPIC_KEY) throw httpError(501, 'ANTHROPIC_API_KEY is not configured in server/.env')
  const { images = [], vibe = '' } = body
  if (images.length === 0) throw httpError(400, 'no images provided')

  const content = []
  for (const img of images) {
    const m = /^data:(image\/\w+);base64,(.+)$/.exec(img.data ?? '')
    if (!m) throw httpError(400, `image ${img.id} must be a base64 data URL`)
    content.push({ type: 'text', text: `Image id "${img.id}":` })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: m[1], data: m[2] },
    })
  }
  content.push({
    type: 'text',
    text:
      `Design a photo slideshow from these ${images.length} images.\n` +
      `Vibe / occasion from the user: ${vibe || '(none given — infer from the photos)'}\n` +
      'Rules: open with the strongest image as a title slide with a headline; group related images ' +
      '(pair/grid) when it helps the story; give a caption only where it adds something; end with a ' +
      'closing slide. Use every image at most once and skip near-duplicates or weak shots. ' +
      'Write headlines/captions grounded in what is actually visible.',
  })

  return callClaude(
    'You are a slideshow designer. Sequence the photos into a story and emit a plan.',
    content,
    'emit_plan',
    MAGIC_SCHEMA,
    4096,
  )
}

function httpError(status, message) {
  const e = new Error(message)
  e.status = status
  return e
}

const server = createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  try {
    if (req.method !== 'POST') throw httpError(404, 'not found')
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')

    let result
    if (req.url === '/ai/text') result = await handleText(body)
    else if (req.url === '/ai/image') result = await handleImage(body)
    else if (req.url === '/ai/magic') result = await handleMagic(body)
    else throw httpError(404, 'not found')

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(result))
  } catch (err) {
    const status = err.status ?? 500
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: err.message ?? String(err) }))
    if (status >= 500) console.error(err)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Lumière AI service on http://127.0.0.1:${PORT}`)
  console.log(`  Claude: ${ANTHROPIC_KEY ? MODEL : 'NOT CONFIGURED'}`)
  console.log(`  Image model: ${GEMINI_KEY ? 'gemini-2.5-flash-image' : 'NOT CONFIGURED'}`)
})
