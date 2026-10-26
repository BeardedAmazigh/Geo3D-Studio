/**
 * Projection utility to convert Geodetic coordinates (WGS84 Lat/Lon)
 * into local metric Cartesian coordinates (x in meters East, y in meters North).
 */

const EARTH_RADIUS = 6378137.0; // WGS84 Semi-major axis in meters

/**
 * Converts degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Projects a [longitude, latitude] point to local metric meters [x, y]
 * relative to an anchor center [centerLat, centerLon].
 * x is positive East, y is positive North.
 */
export function geoToMetric(
  lon: number,
  lat: number,
  centerLat: number,
  centerLon: number
): [number, number] {
  const latRad = degToRad(centerLat);
  const dLon = degToRad(lon - centerLon);
  const dLat = degToRad(lat - centerLat);

  // Equirectangular approximation accurate to <0.1% over urban radii (<15km)
  const x = dLon * Math.cos(latRad) * EARTH_RADIUS;
  const y = dLat * EARTH_RADIUS;

  return [x, y];
}

/**
 * Converts local metric [x, y] back to geodetic [longitude, latitude]
 */
export function metricToGeo(
  x: number,
  y: number,
  centerLat: number,
  centerLon: number
): [number, number] {
  const latRad = degToRad(centerLat);
  const dLat = y / EARTH_RADIUS;
  const dLon = x / (Math.cos(latRad) * EARTH_RADIUS);

  const lat = centerLat + radToDeg(dLat);
  const lon = centerLon + radToDeg(dLon);

  return [lon, lat];
}

/**
 * Calculates polygon 2D area (in square meters) via Shoelace formula
 */
export function calculatePolygonArea(points: [number, number][]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2;
}

/**
 * Calculates perimeter (in meters)
 */
export function calculatePolygonPerimeter(points: [number, number][]): number {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j][0] - points[i][0];
    const dy = points[j][1] - points[i][1];
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

/**
 * Calculates 2D centroid of polygon
 */
export function calculatePolygonCentroid(points: [number, number][]): [number, number] {
  if (points.length === 0) return [0, 0];
  let cx = 0;
  let cy = 0;
  for (const pt of points) {
    cx += pt[0];
    cy += pt[1];
  }
  return [cx / points.length, cy / points.length];
}
