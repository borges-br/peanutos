'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import A4Viewport from './A4Viewport';

/** Server-rendered document HTML already includes its paper, brand and footer. */
export default function HtmlDocumentPreview({html,title}: {html:string;title:string}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<()=>void>(()=>{});
  const [height,setHeight] = useState(1123);
  const [error,setError] = useState(false);
  useEffect(()=>()=>cleanup.current(),[]);
  const loaded = useCallback(()=>{
    cleanup.current(); setError(false);
    try {
      const doc=frame.current?.contentDocument;
      if (!doc?.body) {setError(true);return;}
      let active=true, pending=0;
      const measure=()=>{
        if (!active) return;
        const page=doc.querySelector<HTMLElement>('.page-container');
        const bodyStyle=doc.defaultView?.getComputedStyle(doc.body);
        const margins=(parseFloat(bodyStyle?.marginTop||'0')||0)+(parseFloat(bodyStyle?.marginBottom||'0')||0);
        const actual=Math.ceil(page ? Math.max(page.scrollHeight,page.offsetHeight) : Math.max(doc.body.scrollHeight,doc.body.offsetHeight)+margins);
        setHeight(previous=>Math.abs(previous-Math.max(1123,actual))>1?Math.max(1123,actual):previous);
      };
      const schedule=()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(measure);};
      const observer=new ResizeObserver(schedule);
      observer.observe(doc.body);
      const page=doc.querySelector('.page-container');if(page)observer.observe(page);
      doc.addEventListener('load',schedule,true);
      doc.fonts?.ready.then(schedule).catch(()=>{});
      cleanup.current=()=>{active=false;cancelAnimationFrame(pending);observer.disconnect();doc.removeEventListener('load',schedule,true);};
      measure();
    } catch {setError(true);}
  },[]);
  return <div className="space-y-md">{error&&<p role="alert" className="text-error">Não foi possível exibir a prévia. Recarregue a página para tentar novamente.</p>}<A4Viewport><iframe ref={frame} srcDoc={html} title={title} sandbox="allow-same-origin" scrolling="no" onLoad={loaded} className="document-html-frame" style={{width:794,height}}/></A4Viewport></div>;
}
