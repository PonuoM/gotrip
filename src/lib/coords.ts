// Shared coordinate parser — used by LocationSearch (live UI) and itinerary
// save handler (fallback if user paste-saved without picking dropdown).

export function parseCoords(raw: string): { lat: number; lng: number } | null {
  // Strip zero-width / invisible chars + N/S/E/W markers
  const cleaned = raw
    .replace(/[​-‍﻿]/g, '')
    .replace(/[°NSEWnsew]/g, '')
    .trim()
  // Pull every signed decimal number out
  const nums = cleaned.match(/-?\d+(?:\.\d+)?/g)
  if (!nums || nums.length !== 2) return null
  const lat = Number(nums[0])
  const lng = Number(nums[1])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  // Require at least one decimal point — guards against IDs / phone numbers
  if (!nums.some(n => n.includes('.'))) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

// Allow-listed map URLs we know how to resolve via /api/resolve-maps
export const MAP_URL_RE = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl|(?:www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|osm\.org|www\.openstreetmap\.org)/i
