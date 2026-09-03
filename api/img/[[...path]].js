// 图片代理 Edge Function
// 用法: /api/img/<host>/<path>
// 例:  /api/img/s4.anilist.co/file/anilistcdn/character/medium/xxx.jpg
// 只允许白名单内的域名，避免被当成开放代理滥用

export const config = { runtime: 'edge' };

const ALLOWED_HOSTS = new Set(['s4.anilist.co']);

export default async function handler(request) {
  const { pathname, search } = new URL(request.url);
  const match = pathname.match(/^\/api\/img\/([^/]+)(\/.*)?$/);

  if (!match) {
    return new Response('Not Found', { status: 404 });
  }

  const host = match[1];
  if (!ALLOWED_HOSTS.has(host)) {
    return new Response('Forbidden', { status: 403 });
  }

  const target = `https://${host}${match[2] || '/'}${search}`;

  const upstream = await fetch(target, {
    headers: {
      'User-Agent': request.headers.get('user-agent') || 'anime-character-grid',
      Accept: request.headers.get('accept') || 'image/*,*/*',
    },
  });

  const headers = new Headers();
  headers.set(
    'Content-Type',
    upstream.headers.get('content-type') || 'image/jpeg'
  );
  // 浏览器/边缘双层缓存，图床内容基本不变，可以缓存很久
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=2592000');
  // 关键：带上 CORS 头，图片才能参与 canvas 绘制而不污染画布
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Timing-Allow-Origin', '*');

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
