/**
 * Opens the user's mapping application with the destination only.
 * The user controls GPS permissions and origin; PAZO never reads or sends
 * their live coordinates for this action.
 */
export interface PlaceDestination {
  latitude: number
  longitude: number
  address?: string
  name: string
}
const validCoordinates = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) && Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180

export const buildPlaceDirectionsUrl = (
  place: PlaceDestination,
  userAgent = '',
): string => {
  const destination = validCoordinates(place.latitude, place.longitude)
    ? `${place.latitude},${place.longitude}`
    : [place.name, place.address].filter(Boolean).join(', ')

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    // Universal Apple Maps link respects the user's native iOS Maps flow.
    return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
  }
  // Android resolves Google Maps URLs to its installed mapping app when
  // configured; other devices retain the browser fallback.
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`
}
