// Vercel Edge Function — HTTP audio stream proxy
// Allows HTTPS-hosted pages to reach HTTP radio streams (mixed-content fix)

export const config = { runtime: 'edge' };

// Only these exact stream URLs are allowed — whitelist prevents open-proxy abuse
const WHITELIST = [
  'http://137.66.18.220:8000/;',
  'http://masjidatik.fly.dev/;',
];

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const target = decodeURIComponent(searchParams.get('url') ?? '');

  if (!WHITELIST.includes(target)) {
    return new Response('Forbidden: stream not in whitelist', { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      headers: {
        // Suppress Icecast inline metadata so the audio decoder isn't confused
        'Icy-MetaData': '0',
        'User-Agent': 'Mozilla/5.0',
      },
    });
  } catch (err) {
    return new Response('Bad Gateway: could not reach stream', { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 200) {
    return new Response(`Upstream returned ${upstream.status}`, {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
