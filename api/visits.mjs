// Site-wide visit counter, shown on the home page.
//   GET  /api/visits -> { visits: n }   reads the total
//   POST /api/visits -> { visits: n }   adds one visit and returns the new total
// The browser posts once per session (see VisitorCount), so reloads and moving between pages don't add more.
// The total lives in Upstash Redis. Connect a free Upstash Redis database to the project in
// Vercel (Storage tab); it sets KV_REST_API_URL / KV_REST_API_TOKEN (or the UPSTASH_REDIS_* pair).
const KEY = 'visits:total';

async function redis(command) {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis is not configured');
  const response = await fetch(`${url}/${command}/${KEY}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Redis answered ${response.status}`);
  const { result } = await response.json();
  return Number(result ?? 0);
}

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function handle(command) {
  try {
    return reply({ visits: await redis(command) });
  } catch (error) {
    console.error(error);
    return reply({ error: 'unavailable' }, 503);
  }
}

export function GET() {
  return handle('get');
}

export function POST() {
  return handle('incr');
}
