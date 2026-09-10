(function(){function e(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function t(t){let n=e(t).split(`
`),r=[],i=null,a=()=>{i&&=(r.push(`</${i}>`),null)},o=e=>e.replace(/`([^`]+)`/g,`<code>$1</code>`).replace(/\*\*([^*]+)\*\*/g,`<strong>$1</strong>`).replace(/\*([^*]+)\*/g,`<em>$1</em>`);for(let e of n){let t=e.match(/^\d+\.\s+(.*)$/),n=e.match(/^[-*]\s+(.*)$/);if(t){i!==`ol`&&(a(),r.push(`<ol>`),i=`ol`),r.push(`<li>${o(t[1])}</li>`);continue}if(n){i!==`ul`&&(a(),r.push(`<ul>`),i=`ul`),r.push(`<li>${o(n[1])}</li>`);continue}a(),e.trim()?r.push(`<p>${o(e)}</p>`):r.push(`<br />`)}return a(),r.join(``)}function n(){return document.currentScript??document.querySelector(`script[data-bot-key]`)}function r(){let e=`knowbase_visitor`,t=localStorage.getItem(e);if(t)return t;let n=`v_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;return localStorage.setItem(e,n),n}function i(){return`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <g transform="translate(0.75 1.1)">
      <path
        d="M12 3.25c4.83 0 8.75 3.2 8.75 7.15 0 3.95-3.92 7.15-8.75 7.15-.9 0-1.77-.11-2.58-.32l-3.92 1.77.95-3.55C4.4 14.05 3.25 12.35 3.25 10.4c0-3.95 3.92-7.15 8.75-7.15Z"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
      <circle cx="8.75" cy="10.4" r="1.15" fill="currentColor"/>
      <circle cx="12" cy="10.4" r="1.15" fill="currentColor"/>
      <circle cx="15.25" cy="10.4" r="1.15" fill="currentColor"/>
    </g>
  </svg>`}function a(){return`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`}async function o(){let e=n();if(!e)return;let o=e.getAttribute(`data-bot-key`),s=(e.getAttribute(`data-api`)||``).replace(/\/$/,``);if(!o||!s){console.error(`[Knowbase] data-bot-key and data-api are required`);return}let c=await fetch(`${s}/v1/widget/${o}/config`);if(!c.ok){console.error(`[Knowbase] Failed to load widget config`);return}let l=await c.json(),u=r(),d=document.createElement(`div`);d.id=`knowbase-widget-root`,document.body.appendChild(d);let f=document.createElement(`style`);f.textContent=`
    #knowbase-widget-root { all: initial; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    #knowbase-widget-root * { box-sizing: border-box; }
    .kb-btn {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
      width: 56px; height: 56px; border-radius: 999px; border: none; cursor: pointer;
      color: #fff; box-shadow: 0 12px 30px rgba(0,0,0,.22);
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0; line-height: 0;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kb-btn:hover { transform: translateY(-1px); box-shadow: 0 16px 34px rgba(0,0,0,.26); }
    .kb-btn:active { transform: translateY(0); }
    .kb-btn svg { width: 24px; height: 24px; display: block; flex-shrink: 0; }
    .kb-panel {
      position: fixed; right: 20px; bottom: 88px; z-index: 2147483000;
      width: min(380px, calc(100vw - 24px)); height: min(560px, calc(100vh - 120px));
      background: #fff; border-radius: 18px; overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,.28); display: flex; flex-direction: column;
      border: 1px solid rgba(0,0,0,.06);
    }
    .kb-head { padding: 14px 16px; color: #fff; font-weight: 600; font-size: 14px; }
    .kb-body { flex: 1; overflow: auto; padding: 14px; background: #f6faf8; }
    .kb-msg { max-width: 85%; margin: 0 0 10px; padding: 10px 12px; border-radius: 14px; font-size: 13px; line-height: 1.45; }
    .kb-msg p { margin: 0 0 8px; }
    .kb-msg p:last-child { margin-bottom: 0; }
    .kb-msg ul, .kb-msg ol { margin: 0 0 8px; padding-left: 1.2em; }
    .kb-msg li { margin: 0 0 4px; }
    .kb-msg strong { font-weight: 700; }
    .kb-msg code { font-size: 0.9em; background: rgba(0,0,0,.06); padding: 1px 4px; border-radius: 4px; }
    .kb-user { margin-left: auto; background: var(--kb); color: #fff; white-space: pre-wrap; }
    .kb-bot { margin-right: auto; background: #fff; color: #122; border: 1px solid #e4ebe8; }
    .kb-src { margin-top: 8px; font-size: 10px; color: #567; border-top: 1px solid #e8eeeb; padding-top: 6px; }
    .kb-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e4ebe8; background: #fff; }
    .kb-form input { flex: 1; border: 1px solid #d5e0dc; border-radius: 10px; padding: 10px 12px; font-size: 13px; outline: none; }
    .kb-form button { border: none; border-radius: 10px; padding: 0 14px; color: #fff; font-weight: 600; cursor: pointer; background: var(--kb); }
    .kb-water { font-size: 10px; text-align: center; padding: 4px; color: #89a; background: #f6faf8; }
    .kb-sugs { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }
    .kb-sug {
      border: 1px solid #d7e3df; background: #fff; color: #234; border-radius: 999px;
      padding: 6px 10px; font-size: 11px; cursor: pointer; line-height: 1.2;
    }
    .kb-sug:hover { border-color: var(--kb); color: #000; }
    .kb-sug:disabled { opacity: 0.5; cursor: default; }
    .kb-typing {
      margin-right: auto; background: #fff; color: #567; border: 1px solid #e4ebe8;
      display: flex; align-items: center; gap: 5px; padding: 12px 14px; min-height: 18px;
    }
    .kb-typing-dot {
      width: 6px; height: 6px; border-radius: 999px; background: rgba(12, 26, 23, 0.45);
      animation: kb-typing 1.15s infinite;
    }
    .kb-typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .kb-typing-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes kb-typing {
      0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
      40% { opacity: 1; transform: translateY(-3px); }
    }
    .kb-form button:disabled { opacity: 0.6; cursor: wait; }
    .kb-form input:disabled { opacity: 0.7; }
  `,document.head.appendChild(f);let p=!1,m=!1,h=null,g=[{role:`assistant`,content:l.welcome_message}],_=document.createElement(`button`);_.className=`kb-btn`,_.style.background=l.primary_color,_.setAttribute(`aria-label`,`Open chat`),_.innerHTML=i(),d.appendChild(_);let v=document.createElement(`div`);v.className=`kb-panel`,v.style.display=`none`,v.style.setProperty(`--kb`,l.primary_color),d.appendChild(v);async function y(e){if(!e.trim()||m)return;m=!0,g.push({role:`user`,content:e.trim()}),b();let t=new AbortController,n=window.setTimeout(()=>t.abort(),6e4);try{let n=await fetch(`${s}/v1/widget/${o}/chat`,{method:`POST`,headers:{"Content-Type":`application/json`},signal:t.signal,body:JSON.stringify({message:e.trim(),conversation_id:h,visitor_id:u})}),r=await n.json();if(!n.ok)throw Error(r.error||`Chat failed`);h=r.conversation_id,g.push({role:`assistant`,content:r.answer,sources:r.sources})}catch(e){let t=e instanceof DOMException&&e.name===`AbortError`;g.push({role:`assistant`,content:t?`Taking too long — please try again in a moment.`:e instanceof Error?e.message:`Something went wrong`})}finally{window.clearTimeout(n),m=!1,b()}}function b(){v.innerHTML=``;let e=document.createElement(`div`);e.className=`kb-head`,e.style.background=l.primary_color,e.textContent=l.name,v.appendChild(e);let n=document.createElement(`div`);if(n.className=`kb-body`,g.forEach(e=>{let r=document.createElement(`div`);if(r.className=`kb-msg ${e.role===`user`?`kb-user`:`kb-bot`}`,e.role===`assistant`?r.innerHTML=t(e.content):r.textContent=e.content,e.sources?.length){let t=document.createElement(`div`);t.className=`kb-src`,t.textContent=e.sources.slice(0,2).map(e=>`[${e.index}] ${e.filename??`doc`}`).join(` · `),r.appendChild(t)}n.appendChild(r)}),m){let e=document.createElement(`div`);e.className=`kb-msg kb-typing`,e.setAttribute(`aria-label`,`Assistant is typing`);for(let t=0;t<3;t++){let t=document.createElement(`span`);t.className=`kb-typing-dot`,e.appendChild(t)}n.appendChild(e)}if(g.length===1&&g[0]?.role===`assistant`&&!m&&l.suggestions?.length){let e=document.createElement(`div`);e.className=`kb-sugs`,l.suggestions.slice(0,3).forEach(t=>{let n=document.createElement(`button`);n.type=`button`,n.className=`kb-sug`,n.textContent=t,n.disabled=m,n.addEventListener(`click`,()=>void y(t)),e.appendChild(n)}),n.appendChild(e)}if(v.appendChild(n),l.watermark){let e=document.createElement(`div`);e.className=`kb-water`,e.textContent=`Powered by Knowbase`,v.appendChild(e)}let r=document.createElement(`form`);r.className=`kb-form`;let i=document.createElement(`input`);i.placeholder=`Ask a question…`,i.disabled=m;let a=document.createElement(`button`);a.type=`submit`,a.textContent=m?`…`:`Send`,a.disabled=m,r.append(i,a),r.addEventListener(`submit`,async e=>{e.preventDefault();let t=i.value.trim();t&&(i.value=``,await y(t))}),v.appendChild(r),n.scrollTop=n.scrollHeight,m||i.focus()}_.addEventListener(`click`,()=>{p=!p,v.style.display=p?`flex`:`none`,_.innerHTML=p?a():i(),_.setAttribute(`aria-label`,p?`Close chat`:`Open chat`),p&&b()})}o()})();