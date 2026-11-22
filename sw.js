/* Service worker : toute l'app fonctionne hors ligne. Les données passent par Supabase (non interceptées). */
var CACHE='japon-v4';
var SHELL=['./','./index.html','./manifest.webmanifest','./icon-v2-180.png','./icon-v2-192.png','./icon-v2-512.png'];
var LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
var FONTS='https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap';
function warm(c){
  /* mise en cache préventive de la bibliothèque et des polices (meilleur effort) */
  var jobs=[c.add(new Request(LIB,{mode:'no-cors'})).catch(function(){})];
  jobs.push(fetch(FONTS).then(function(res){if(!res.ok)return;var cp=res.clone();return c.put(FONTS,cp).then(function(){return res.text()}).then(function(css){
    var urls=(css.match(/url\((https:[^)]+)\)/g)||[]).map(function(x){return x.slice(4,-1)});
    return Promise.all(urls.map(function(u){return fetch(u).then(function(r2){if(r2.ok)return c.put(u,r2)}).catch(function(){})}))})}).catch(function(){}));
  return Promise.all(jobs)}
self.addEventListener('install',function(e){self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL).catch(function(){}).then(function(){return warm(c)})}).catch(function(){}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function fromCache(){return caches.match('./index.html',{ignoreSearch:true}).then(function(h){return h||caches.match('./',{ignoreSearch:true})})}
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  if(u.hostname.endsWith('supabase.co'))return;
  var same=u.origin===self.location.origin;
  if(same&&(r.mode==='navigate'||u.pathname.endsWith('/index.html'))){
    /* page : réseau d'abord (mises à jour), mais le cache prend le relais hors ligne ou si le réseau traîne (4 s) */
    var net=fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put('./index.html',cp)})}return res});
    var slow=new Promise(function(ok){setTimeout(function(){fromCache().then(ok)},4000)});
    e.respondWith(Promise.race([net.catch(function(){return fromCache().then(function(h){return h||Promise.reject()})}),slow.then(function(h){return h||net})]).then(function(res){return res||net}));
    return}
  if(same||u.hostname==='cdn.jsdelivr.net'||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    /* le reste : cache d'abord, mis à jour en arrière-plan */
    e.respondWith(caches.match(r).then(function(hit){var net=fetch(r).then(function(res){if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp)})}return res}).catch(function(){return hit});return hit||net}))}
});
