'use client';

import React, { useEffect, useRef, useState } from 'react';
import Button from './Button';

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

/** One scrollable canvas, with the whole A4 surface scaled as a unit. */
export default function A4Viewport({children}: {children: React.ReactNode}) {
  const viewport = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [height, setHeight] = useState(PAGE_HEIGHT);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  useEffect(() => {
    const view = viewport.current, page = paper.current;
    if (!view || !page) return;
    const measure = () => {
      setAvailableWidth(Math.max(1, view.clientWidth - 32));
      setHeight(Math.max(PAGE_HEIGHT, Math.ceil(page.offsetHeight)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(view); observer.observe(page); measure();
    return () => observer.disconnect();
  }, []);
  const fit = Math.min(1, availableWidth / PAGE_WIDTH);
  const scale = zoom === 'fit' ? fit : zoom;
  const stageWidth = Math.max(availableWidth, Math.ceil(PAGE_WIDTH * scale));
  function changeZoom(delta: number) {setZoom(Math.min(2, Math.max(.25, Math.round((scale + delta) * 100) / 100)));}
  return <section className="document-viewport" aria-label="Visualizador do documento">
    <div className="document-zoom-toolbar" aria-label="Zoom do documento">
      <Button type="button" variant="ghost" onClick={()=>setZoom('fit')} aria-pressed={zoom==='fit'}>Ajustar à largura</Button>
      <Button type="button" variant="ghost" onClick={()=>setZoom(1)} aria-pressed={zoom===1}>100%</Button>
      <div className="flex items-center gap-sm">
        <Button type="button" variant="ghost" aria-label="Diminuir zoom" disabled={scale<=.25} onClick={()=>changeZoom(-.1)}>−</Button>
        <output aria-live="polite" aria-label="Zoom atual">{Math.round(scale*100)}%</output>
        <Button type="button" variant="ghost" aria-label="Aumentar zoom" disabled={scale>=2} onClick={()=>changeZoom(.1)}>＋</Button>
      </div>
    </div>
    <div ref={viewport} className="document-scroll-area" tabIndex={0} role="region" aria-label="Área do documento">
      <div className="document-stage" style={{width:stageWidth,height:Math.ceil(height*scale),visibility:availableWidth?'visible':'hidden'}}>
        <div ref={paper} className="document-paper" style={{width:PAGE_WIDTH,left:Math.max(0,(stageWidth-PAGE_WIDTH*scale)/2),transform:`scale(${scale})`}}>
          {children}
        </div>
      </div>
    </div>
  </section>;
}
