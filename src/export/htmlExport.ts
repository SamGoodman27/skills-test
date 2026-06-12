import type { Slideshow } from '../types/slideshow'
import { getOrnament } from '../data/ornaments'
import { patternCss } from '../data/patterns'
import { downloadBlob, safeName } from './raster'

/**
 * Self-contained HTML export: the show plays from a single file with no
 * dependencies. The app precompiles every slide into plain CSS strings
 * (backgrounds, fonts, frames); the embedded vanilla player only animates
 * transform/opacity/clip-path with the same math as the React player.
 */

interface PlanElement {
  kind: 'text' | 'image' | 'video' | 'ornament'
  frame: { x: number; y: number; w: number; h: number }
  z: number
  opacity: number
  rotation: number
  anim: string
  delay: number
  css?: string
  content?: string
  src?: string
  fit?: string
  muted?: boolean
  loop?: boolean
  svg?: string
  color?: string
}

interface PlanSlide {
  duration: number
  transition: string
  bgCss: string
  bgMedia?: { src: string; blur: number; scale: number }
  overlay?: { color: string; opacity: number }
  els: PlanElement[]
}

function cssText(style: Record<string, string | undefined>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}

function compile(doc: Slideshow): PlanSlide[] {
  return doc.slides.map((slide) => {
    const bg = slide.background
    let bgCss: string
    let bgMedia: PlanSlide['bgMedia']

    if (bg.type === 'gradient') {
      const stops = bg.gradientStops
        .map((s) => `${s.color} ${Math.round(s.at * 100)}%`)
        .join(', ')
      bgCss = `background:linear-gradient(${bg.gradientAngle}deg, ${stops})`
    } else if (bg.type === 'pattern') {
      const p = patternCss(bg.patternRef, bg.patternColor, bg.patternScale)
      bgCss = cssText({
        background: bg.color,
        'background-image': p.backgroundImage as string,
        'background-size': p.backgroundSize as string,
      })
    } else {
      bgCss = `background:${bg.color}`
    }

    if (bg.type === 'image' && bg.src) {
      bgMedia = { src: bg.src, blur: bg.blur, scale: 1 }
    } else if (bg.type === 'blurred-media') {
      const img = slide.elements.find((e) => e.type === 'image')
      if (img && img.type === 'image')
        bgMedia = { src: img.src, blur: Math.max(bg.blur, 18), scale: 1.15 }
    }

    const els: PlanElement[] = slide.elements.map((el) => {
      const base = {
        frame: el.frame,
        z: el.zIndex,
        opacity: el.opacity,
        rotation: el.rotation,
        anim: el.animation,
        delay: el.animationDelay,
      }
      if (el.type === 'text') {
        return {
          ...base,
          kind: 'text' as const,
          content: el.content,
          css: cssText({
            'font-family': `'${el.style.fontFamily}', sans-serif`,
            'font-size': `${el.style.fontSize}px`,
            'font-weight': String(el.style.fontWeight),
            'font-style': el.style.fontStyle,
            color: el.style.color,
            'text-align': el.style.align,
            'line-height': String(el.style.lineHeight),
            'letter-spacing': `${el.style.letterSpacing}px`,
            'text-shadow': el.style.shadow ? '0 2px 18px rgba(0,0,0,.55)' : undefined,
            'justify-content':
              el.style.align === 'left'
                ? 'flex-start'
                : el.style.align === 'right'
                  ? 'flex-end'
                  : 'center',
          }),
        }
      }
      if (el.type === 'ornament') {
        return {
          ...base,
          kind: 'ornament' as const,
          svg: getOrnament(el.ref)?.svg ?? '',
          color: el.color,
        }
      }
      return {
        ...base,
        kind: el.type,
        src: el.src,
        fit: el.fit,
        muted: el.type === 'video' ? el.muted : undefined,
        loop: el.type === 'video' ? el.loop : undefined,
      }
    })

    return { duration: slide.duration, transition: slide.transition, bgCss, bgMedia, overlay: bg.overlayOpacity > 0 ? { color: bg.overlayColor, opacity: bg.overlayOpacity } : undefined, els }
  })
}

const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300..700;1,300..700&family=Fraunces:ital,wght@0,300..700;1,300..700&family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Montserrat:ital,wght@0,300..700;1,300..700&family=Caveat:wght@400..700&family=Space+Grotesk:wght@300..700&display=swap'

export function exportHtml(doc: Slideshow): void {
  const plan = compile(doc)
  const payload = {
    title: doc.title,
    width: doc.settings.width,
    height: doc.settings.height,
    transitionMs: doc.settings.transitionDuration,
    audio: doc.settings.audio,
    slides: plan,
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_LINK}">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:Inter,sans-serif}
#stage{position:absolute;inset:0}
#canvas{position:absolute;top:50%;left:50%;transform-origin:center}
.layer{position:absolute;inset:0;overflow:hidden;visibility:hidden;will-change:transform,opacity}
.bgm{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ov{position:absolute;inset:0}
.fr{position:absolute}
.mo{width:100%;height:100%;will-change:transform,opacity}
.tx{width:100%;height:100%;display:flex;align-items:center}
.tx span{white-space:pre-wrap;width:100%}
.clip{width:100%;height:100%;overflow:hidden}
.clip img,.clip video{width:100%;height:100%;display:block;will-change:transform}
.orn,.orn svg{width:100%;height:100%}
#start{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);color:#eee;font-size:20px;letter-spacing:1px;cursor:pointer;z-index:10}
#bar{position:absolute;left:0;right:0;bottom:0;display:flex;gap:12px;align-items:center;padding:10px 16px;background:rgba(10,10,12,.85);color:#bbb;opacity:0;transition:opacity .25s;z-index:9}
body:hover #bar{opacity:1}
#bar button{background:none;border:1px solid #444;color:#ddd;border-radius:6px;padding:5px 12px;cursor:pointer}
#seek{flex:1}
</style>
</head>
<body>
<div id="stage"><div id="canvas"></div></div>
<div id="start">▶ &nbsp;Tap to play</div>
<div id="bar"><button id="pp">❚❚</button><input id="seek" type="range" min="0" step="50" value="0"><span id="tm"></span></div>
<script>
const D=${JSON.stringify(payload)};
const total=D.slides.reduce((s,x)=>s+x.duration,0);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const eio=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const eo=p=>1-Math.pow(1-p,3);
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)};
function transition(type,raw){const p=eio(clamp(raw,0,1));switch(type){
case 'crossfade':return{opacity:p};
case 'slide-left':return{transform:'translateX('+((1-p)*100)+'%)'};
case 'slide-right':return{transform:'translateX('+(-(1-p)*100)+'%)'};
case 'slide-up':return{transform:'translateY('+((1-p)*100)+'%)'};
case 'zoom':return{opacity:p,transform:'scale('+(1.08-.08*p)+')'};
case 'wipe':return{clipPath:'inset(0 '+((1-p)*100)+'% 0 0)'};
default:return{}}}
function motion(anim,delay,t,dur,seed){if(t==null||anim==='none')return[{},{}];
const p=eo(clamp((t-delay)/700,0,1));
switch(anim){
case 'fade':return[{opacity:p},{}];
case 'fade-up':return[{opacity:p,transform:'translateY('+((1-p)*28)+'px)'},{}];
case 'fade-down':return[{opacity:p,transform:'translateY('+(-(1-p)*28)+'px)'},{}];
case 'zoom-in':return[{opacity:p,transform:'scale('+(0.9+0.1*p)+')'},{}];
case 'ken-burns':{const q=clamp(t/Math.max(dur,1),0,1);const dir=hash(seed)%4;const s=1.06+0.1*q;const pan=2.2*(dir<2?q:1-q);const x=dir%2===0?pan:-pan;const y=dir%2===0?-pan*0.6:pan*0.6;
return[{opacity:p},{transform:'scale('+s+') translate('+x+'%,'+y+'%)'}]}
default:return[{},{}]}}
function apply(node,st){node.style.opacity=st.opacity!==undefined?st.opacity:'';node.style.transform=st.transform||'';node.style.clipPath=st.clipPath||''}
// Build DOM once
const canvas=document.getElementById('canvas');
canvas.style.width=D.width+'px';canvas.style.height=D.height+'px';
const layers=D.slides.map((s,si)=>{
const layer=document.createElement('div');layer.className='layer';layer.style.cssText+=';'+s.bgCss;
if(s.bgMedia){const m=document.createElement('img');m.className='bgm';m.src=s.bgMedia.src;
m.style.filter='blur('+s.bgMedia.blur+'px)';if(s.bgMedia.scale>1)m.style.transform='scale('+s.bgMedia.scale+')';layer.appendChild(m)}
if(s.overlay){const o=document.createElement('div');o.className='ov';o.style.background=s.overlay.color;o.style.opacity=s.overlay.opacity;layer.appendChild(o)}
const motions=s.els.map((e,ei)=>{
const fr=document.createElement('div');fr.className='fr';
fr.style.left=e.frame.x*100+'%';fr.style.top=e.frame.y*100+'%';fr.style.width=e.frame.w*100+'%';fr.style.height=e.frame.h*100+'%';
fr.style.zIndex=e.z;fr.style.opacity=e.opacity;if(e.rotation)fr.style.transform='rotate('+e.rotation+'deg)';
const mo=document.createElement('div');mo.className='mo';fr.appendChild(mo);let media=null;
if(e.kind==='text'){const tx=document.createElement('div');tx.className='tx';tx.style.cssText+=';'+e.css;
const sp=document.createElement('span');sp.textContent=e.content;tx.appendChild(sp);mo.appendChild(tx)}
else if(e.kind==='ornament'){const d=document.createElement('div');d.className='orn';d.style.color=e.color;d.innerHTML=e.svg;mo.appendChild(d)}
else{const c=document.createElement('div');c.className='clip';
media=document.createElement(e.kind==='image'?'img':'video');media.src=e.src;media.style.objectFit=e.fit;
if(e.kind==='video'){media.muted=e.muted;media.loop=e.loop;media.playsInline=true}
c.appendChild(media);mo.appendChild(c)}
layer.appendChild(fr);
return{mo:mo,media:media,e:e,seed:'s'+si+'e'+ei}});
canvas.appendChild(layer);
return{node:layer,motions:motions,slide:s}});
const starts=[];let acc=0;for(const s of D.slides){starts.push(acc);acc+=s.duration}
function resolve(t){t=clamp(t,0,total-1);let i=D.slides.length-1;
for(let k=0;k<D.slides.length;k++){if(t<starts[k]+D.slides[k].duration){i=k;break}}
const lt=t-starts[i];const tm=Math.min(D.transitionMs,D.slides[i].duration);
const trans=i>0&&D.slides[i].transition!=='none'&&lt<tm;
return{i:i,lt:lt,p:trans?lt/tm:null,prev:trans?i-1:null}}
function renderAt(t){const r=resolve(t);
layers.forEach(function(L,k){
const isCur=k===r.i,isPrev=k===r.prev;
L.node.style.visibility=isCur||isPrev?'visible':'hidden';
L.node.style.zIndex=isCur?2:isPrev?1:0;
if(isCur)apply(L.node,r.p!==null?transition(L.slide.transition,r.p):{});
else apply(L.node,{});
if(isCur||isPrev){const lt=isCur?r.lt:L.slide.duration;
for(const m of L.motions){const st=motion(m.e.anim,m.e.delay,lt,L.slide.duration,m.seed);
apply(m.mo,st[0]);if(m.media&&st[1].transform!==undefined)m.media.style.transform=st[1].transform;
if(m.media&&m.media.tagName==='VIDEO'){if(isCur&&playing&&m.media.paused)m.media.play().catch(()=>{});if(!isCur&&!m.media.paused)m.media.pause()}}}});
}
// Fit to window
function fit(){const sc=Math.min(innerWidth/D.width,innerHeight/D.height)*0.99;
canvas.style.transform='translate(-50%,-50%) scale('+sc+')'}
addEventListener('resize',fit);fit();
// Clock + controls
let t=0,playing=false,last=0;
const seek=document.getElementById('seek');seek.max=total;
const tm=document.getElementById('tm');const pp=document.getElementById('pp');
const audio=D.audio?new Audio(D.audio.src):null;
if(audio){audio.loop=D.audio.loop;audio.volume=D.audio.volume}
function fmt(ms){const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function frame(now){if(playing){t+=now-last;if(t>=total){t=0;if(audio)audio.currentTime=0}}last=now;
renderAt(t);seek.value=t;tm.textContent=fmt(t)+' / '+fmt(total);requestAnimationFrame(frame)}
function setPlaying(v){playing=v;pp.textContent=v?'❚❚':'▶';
if(audio){if(v){audio.currentTime=t/1000;audio.play().catch(()=>{})}else audio.pause()}}
pp.onclick=()=>setPlaying(!playing);
seek.oninput=()=>{t=Number(seek.value);if(audio)audio.currentTime=t/1000;renderAt(t)};
addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();setPlaying(!playing)}});
document.getElementById('start').onclick=function(){this.remove();last=performance.now();setPlaying(true);requestAnimationFrame(frame)};
renderAt(0);
</script>
</body>
</html>`

  downloadBlob(new Blob([html], { type: 'text/html' }), `${safeName(doc.title)}.html`)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
