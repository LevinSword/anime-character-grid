// Bangumi 角色搜索代理 Edge Function
// 用法: /api/bangumi?keyword=xxx
export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const { searchParams } = new URL(request.url);
  let keyword = searchParams.get('keyword');

  if (!keyword && request.method === 'POST') {
    try {
      const body = await request.json();
      keyword = body.keyword;
    } catch (e) {}
  }

  if (!keyword) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const upstream = await fetch('https://api.bgm.tv/v0/search/characters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'anime-character-grid/1.0 (https://github.com/ssshooter/anime-character-grid)',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ keyword }),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, data: [] }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
