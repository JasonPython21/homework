/* 作业小管家 · 离线缓存
   - 网页本体（HTML/图标）缓存到本地，断网也能打开
   - 中英文识别库由 tesseract.js 自己缓存，首次需联网下载
   注意：service worker 只在 https 或 localhost 下生效，局域网 http 会自动跳过（不影响使用） */
const CACHE = 'homework-helper-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;          // CDN 资源交给 tesseract 自己处理

  // 页面：优先网络（保证拿到新版本），断网时用缓存
  if(req.mode === 'navigate' || (req.headers.get('accept')||'').indexOf('text/html') >= 0){
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put('./index.html', copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }
  // 其它同域资源：缓存优先
  e.respondWith(caches.match(req).then(r=>r || fetch(req)));
});
