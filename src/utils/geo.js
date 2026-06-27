/**
 * Utilidades de geolocalización.
 *
 * MongoDB almacena coordenadas GeoJSON en orden [lng, lat].
 * La API acepta { lat, lng } en ese orden (lat primero).
 */

const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);

/**
 * Convierte { lat, lng } o [lng, lat] al formato GeoJSON Point
 * que se almacena en MongoDB.
 */
export const toGeoPoint = (input) => {
  if (!input) return null;
  let lng;
  let lat;
  if (Array.isArray(input)) {
    [lng, lat] = input;
  } else {
    lat = input.lat;
    lng = input.lng;
  }
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
  if (lat < -90 || lat > 90) throw new Error('lat must be between -90 and 90');
  if (lng < -180 || lng > 180) throw new Error('lng must be between -180 and 180');
  return { type: 'Point', coordinates: [lng, lat] };
};

/**
 * Lee lat/lng y maxDistance desde query params.
 * Devuelve null si falta lat o lng.
 */
export const parseNearQuery = (query) => {
  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid lat/lng range');
  }
  const maxDistance = Math.min(
    Math.max(parseInt(query.maxDistance, 10) || 10000, 1),
    100000, // 100 km máx por defecto
  );
  return { lat, lng, maxDistance };
};

/**
 * Convierte un documento GeoJSON Point a { lat, lng } para serializar.
 */
export const fromGeoPoint = (point) => {
  if (!point || !Array.isArray(point.coordinates)) return null;
  const [lng, lat] = point.coordinates;
  return { lat, lng };
};
