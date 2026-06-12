import { downloadBlob, safeName } from './raster'

/**
 * In-browser video export: records this tab (Chrome's getDisplayMedia with
 * preferCurrentTab) while the preview plays, so the WebM includes the music.
 * For frame-perfect MP4 at any resolution, use scripts/render-video.mjs.
 */

export interface TabRecorder {
  stop: () => void
}

export async function startTabRecording(title: string): Promise<TabRecorder> {
  const stream = await (
    navigator.mediaDevices as MediaDevices & {
      getDisplayMedia(o: object): Promise<MediaStream>
    }
  ).getDisplayMedia({
    video: { frameRate: 30 },
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    systemAudio: 'include',
  })

  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm'
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 12_000_000,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.onstop = () => {
    stream.getTracks().forEach((tr) => tr.stop())
    downloadBlob(new Blob(chunks, { type: 'video/webm' }), `${safeName(title)}.webm`)
  }
  recorder.start(1000)

  return {
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop()
    },
  }
}
