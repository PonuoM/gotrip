import { NextResponse } from 'next/server'

// Resolve a Google Maps share link (maps.app.goo.gl/xxx, goo.gl/maps/xxx,
// google.com/maps/place/...) into raw { lat, lng }.
//
// We follow the redirect, then try to extract @lat,lng from the final URL,
// or `!3dLAT!4dLNG` pattern, or `?q=LAT,LNG`. As a last resort we scan the
// HTML body for `null,LAT,LNG` data the page embeds.

const COORDS_AT      = /@(-?\d+\.\d+),(-?\d+\.\d+)/                  // ...@34.6,135.5,17z
const COORDS_3D4D    = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/              // ...!3d34.6!4d135.5
const COORDS_Q       = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/             // ...?q=34.6,135.5
const COORDS_BODY    = /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/      // window.APP_INITIALIZATION_STATE
const ALLOWED_HOSTS  = /^(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+|www\.google\.[a-z.]+|google\.[a-z.]+)$/i

function extract(text: string) {
  for (const re of [COORDS_AT, COORDS_3D4D, COORDS_Q, COORDS_BODY]) {
    const m = text.match(re)
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  }
  return null
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url')
  if (!raw) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  let target: URL
  try { target = new URL(raw) } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }
  if (!ALLOWED_HOSTS.test(target.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 400 })
  }

  // Try extracting from the input URL first (no fetch needed)
  const direct = extract(target.toString())
  if (direct) return NextResponse.json(direct)

  // Follow redirects + read body
  try {
    const res = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoTripBot/1.0)' },
    })
    // 1) Final URL after redirects
    const fromFinal = extract(res.url)
    if (fromFinal) return NextResponse.json(fromFinal)

    // 2) Body scan
    const body = await res.text()
    const fromBody = extract(body)
    if (fromBody) return NextResponse.json(fromBody)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'fetch failed' }, { status: 502 })
  }

  return NextResponse.json({ error: 'no coordinates found' }, { status: 404 })
}
