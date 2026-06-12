import type { TextElement, TextStyle, AnimationType } from '../types/slideshow'

/**
 * Client for the local AI service (server/index.mjs, proxied at /ai).
 * Every call returns a *proposal* — the UI shows it for accept/reject and
 * application goes through the normal undoable mutate path.
 */

export interface StylePatch extends Partial<TextStyle> {
  animation?: AnimationType
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      'AI service unreachable. Start it with `npm run server` (keys go in server/.env).',
    )
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `AI service error ${res.status}`)
  }
  return (await res.json()) as T
}

export function aiRewriteText(
  element: TextElement,
  prompt: string,
  otherTexts: string[],
): Promise<{ content: string }> {
  return post('/ai/text', {
    mode: 'copy',
    prompt,
    element: { content: element.content },
    context: { otherTexts },
  })
}

export function aiRestyleText(
  element: TextElement,
  prompt: string,
  backgroundType: string,
): Promise<StylePatch> {
  return post('/ai/text', {
    mode: 'style',
    prompt,
    element: {
      content: element.content,
      style: element.style,
      animation: element.animation,
    },
    context: { backgroundType },
  })
}

export function aiEditImage(src: string, prompt: string): Promise<{ image: string }> {
  return post('/ai/image', { prompt, image: src })
}

export function aiMagicPlan(
  images: { id: string; data: string }[],
  vibe: string,
): Promise<import('../lib/magic').MagicPlan> {
  return post('/ai/magic', { images, vibe })
}
