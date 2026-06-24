import type { Company } from '../types'

const cache = new Map<string, number>()

interface Point {
  lat: number
  lng: number
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceKm(from: Point, to: Point) {
  const earthRadiusKm = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function estimateTravelMinutes(from: Company, to: Company) {
  if (
    from.lat === undefined ||
    from.lng === undefined ||
    to.lat === undefined ||
    to.lng === undefined
  ) {
    return null
  }

  const key = `${from.id}:${to.id}`
  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const distanceKm = getDistanceKm(
    { lat: from.lat, lng: from.lng },
    { lat: to.lat, lng: to.lng },
  ) * 1.35
  const minutes = Math.max(8, Math.round((distanceKm / 24) * 60))
  cache.set(key, minutes)
  return minutes
}
