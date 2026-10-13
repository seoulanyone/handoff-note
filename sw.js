// 오프라인에서도 앱이 열리도록 앱 파일만 캐시한다. 환자 정보는 캐시하지 않는다(브라우저 저장소에만 있음).
const CACHE = 'handoff-note-v1'
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './apple-touch-icon.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  // 화면(HTML)은 최신 버전을 먼저 시도하고, 인터넷이 없으면 저장된 것을 쓴다
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  // 나머지 파일(파일명에 버전이 들어 있음)은 저장된 것을 먼저 쓴다
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
      return res
    })),
  )
})
