const esc = (f: string) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const BRIDGE = `<script>(function(){var send=function(t,a){try{parent.postMessage({__p03:1,type:t,args:[].map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}})},'*')}catch(e){}};['log','warn','error','info'].forEach(function(k){var o=console[k];console[k]=function(){send(k,arguments);o.apply(console,arguments)}});window.addEventListener('error',function(e){send('error',[e.message+' (linia '+e.lineno+')'])});window.alert=function(m){send('alert',[m])};document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(h.charAt(0)==='#'){e.preventDefault();var t=h.length>1&&document.getElementById(h.slice(1));if(t)t.scrollIntoView();else if(h==='#')window.scrollTo(0,0);return}if(/^(https?:|mailto:|tel:|javascript:)/i.test(h)){if(!/^javascript:/i.test(h)){e.preventDefault();window.open(h,'_blank')}return}e.preventDefault();parent.postMessage({__p03:1,type:'nav',args:[h]},'*')},true);document.addEventListener('submit',function(e){e.preventDefault();send('info',['Formularz wysłany. W podglądzie nie ma serwera PHP, więc dane nigdzie nie trafiły.'])});})();<\/script>`;

/** Sklada podglad: index.html + wstrzykniete pliki CSS/JS zamiast odnosnikow do plikow lokalnych. */
/** base: adres katalogu z plikami arkusza (grafiki), zeby <img src="foto.jpg"> dzialalo w podgladzie. */
export function buildSrcDoc(files: Record<string, string>, entry = 'index.html', base?: string) {
  let html = files[entry] ?? '';
  const extraCss: string[] = [];
  for (const f of Object.keys(files).filter((x) => x.endsWith('.css'))) {
    const re = new RegExp(`<link[^>]*href=["']${esc(f)}["'][^>]*>`, 'gi');
    if (re.test(html)) html = html.replace(re, () => `<style>${files[f]}</style>`);
    else extraCss.push(files[f]);
  }
  for (const f of Object.keys(files).filter((x) => x.endsWith('.js'))) {
    const re = new RegExp(`<script[^>]*src=["']${esc(f)}["'][^>]*>\\s*</script>`, 'gi');
    html = html.replace(re, () => `<script>${files[f].replace(/<\/script>/gi, '<\\/script>')}<\/script>`);
  }
  const inject = (base ? `<base href="${base}">` : '') + BRIDGE + (extraCss.length ? `<style>${extraCss.join('\n')}</style>` : '');
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + inject);
  if (/<!doctype[^>]*>/i.test(html)) return html.replace(/<!doctype[^>]*>/i, (m) => m + inject);
  return inject + html;
}
