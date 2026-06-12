import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RenderHarness } from './export/RenderHarness.tsx'

// ?render mounts the headless frame-stepping surface used by
// scripts/render-video.mjs instead of the editor.
const isRender = new URLSearchParams(location.search).has('render')

createRoot(document.getElementById('root')!).render(
  isRender ? (
    <RenderHarness />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  ),
)
