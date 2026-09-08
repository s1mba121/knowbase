(function(){function e(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function t(t){let n=e(t).split(`
`),r=[],i=null,a=()=>{i&&=(r.push(`</${i}>`),null)},o=e=>e.replace(/`([^`]+)`/g,`<code>$1</code>`).replace(/\*\*([^*]+)\*\*/g,`<strong>$1</strong>`).replace(/\*([^*]+)\*/g,`<em>$1</em>`);for(let e of n){let t=e.match(/^\d+\.\s+(.*)$/),n=e.match(/^[-*]\s+(.*)$/);if(t){i!==`ol`&&(a(),r.push(`<ol>`),i=`ol`),r.push(`<li>${o(t[1])}</li>`);continue}if(n){i!==`ul`&&(a(),r.push(`<ul>`),i=`ul`),r.push(`<li>${o(n[1])}</li>`);continue}a(),e.trim()?r.push(`<p>${o(e)}</p>`):r.push(`<br />`)}return a(),r.join(``)}function n(){return document.currentScript??document.querySelector(`script[data-bot-key]`)}function r(){let e=`knowbase_visitor`,t=localStorage.getItem(e);if(t)return t;let n=`v_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;return localStorage.setItem(e,n),n}async function i(){let e=n();if(!e)return;let i=e.getAttribute(`data-bot-key`),a=(e.getAttribute(`data-api`)||``).replace(/\/$/,``);if(!i||!a){console.error(`[Knowbase] data-bot-key and data-api are required`);return}let o=await fetch(`${a}/v1/widget/${i}/config`);if(!o.ok){console.error(`[Knowbase] Failed to load widget config`);return}let s=await o.json(),c=r(),l=document.createElement(`div`);l.id=`knowbase-widget-root`,document.body.appendChild(l);let u=document.createElement(`style`);u.textContent=`
    #knowbase-widget-root { all: initial; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    #knowbase-widget-root * { box-sizing: border-box; }
    .kb-btn {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
      width: 56px; height: 56px; border-radius: 999px; border: none; cursor: pointer;
      color: #fff; font-size: 22px; box-shadow: 0 12px 30px rgba(0,0,0,.22);
    }
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
  `,document.head.appendChild(u);let d=!1,f=null,p=[{role:`assistant`,content:s.welcome_message}],m=document.createElement(`button`);m.className=`kb-btn`,m.style.background=s.primary_color,m.setAttribute(`aria-label`,`Open chat`),m.textContent=`💬`,l.appendChild(m);let h=document.createElement(`div`);h.className=`kb-panel`,h.style.display=`none`,h.style.setProperty(`--kb`,s.primary_color),l.appendChild(h);async function g(e){if(e.trim()){p.push({role:`user`,content:e.trim()}),_();try{let t=await fetch(`${a}/v1/widget/${i}/chat`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({message:e.trim(),conversation_id:f,visitor_id:c})}),n=await t.json();if(!t.ok)throw Error(n.error||`Chat failed`);f=n.conversation_id,p.push({role:`assistant`,content:n.answer,sources:n.sources})}catch(e){p.push({role:`assistant`,content:e instanceof Error?e.message:`Something went wrong`})}_()}}function _(){h.innerHTML=``;let e=document.createElement(`div`);e.className=`kb-head`,e.style.background=s.primary_color,e.textContent=s.name,h.appendChild(e);let n=document.createElement(`div`);if(n.className=`kb-body`,p.forEach(e=>{let r=document.createElement(`div`);if(r.className=`kb-msg ${e.role===`user`?`kb-user`:`kb-bot`}`,e.role===`assistant`?r.innerHTML=t(e.content):r.textContent=e.content,e.sources?.length){let t=document.createElement(`div`);t.className=`kb-src`,t.textContent=e.sources.slice(0,2).map(e=>`[${e.index}] ${e.filename??`doc`}`).join(` · `),r.appendChild(t)}n.appendChild(r)}),p.length===1&&p[0]?.role===`assistant`&&s.suggestions?.length){let e=document.createElement(`div`);e.className=`kb-sugs`,s.suggestions.slice(0,3).forEach(t=>{let n=document.createElement(`button`);n.type=`button`,n.className=`kb-sug`,n.textContent=t,n.addEventListener(`click`,()=>void g(t)),e.appendChild(n)}),n.appendChild(e)}if(h.appendChild(n),s.watermark){let e=document.createElement(`div`);e.className=`kb-water`,e.textContent=`Powered by Knowbase`,h.appendChild(e)}let r=document.createElement(`form`);r.className=`kb-form`;let i=document.createElement(`input`);i.placeholder=`Ask a question…`;let a=document.createElement(`button`);a.type=`submit`,a.textContent=`Send`,r.append(i,a),r.addEventListener(`submit`,async e=>{e.preventDefault();let t=i.value.trim();t&&(i.value=``,await g(t))}),h.appendChild(r),n.scrollTop=n.scrollHeight}m.addEventListener(`click`,()=>{d=!d,h.style.display=d?`flex`:`none`,m.textContent=d?`✕`:`💬`,d&&_()})}i()})();