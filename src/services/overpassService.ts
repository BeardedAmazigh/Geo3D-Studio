import { Building3D, BuildingTypology, RoadSegment, RoofShape, UrbanDataset, WaterFeature } from '../types';
import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculatePolygonPerimeter,
  geoToMetric,
} from './projection';

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lon: number;
  type: string;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/**
 * Searches OSM Nominatim for a query string (city, landmark, address)
 */
export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=5`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
    }));
  } catch (err) {
    console.warn('Geocoding search error:', err);
    return [];
  }
}

/**
 * Parse height string like '45m', '150 ft', '25.5' into meters
 */
function parseHeight(val: string | undefined): number | null {
  if (!val) return null;
  val = val.trim().toLowerCase();
  if (val.endsWith('ft') || val.endsWith('feet')) {
    const num = parseFloat(val);
    return isNaN(num) ? null : num * 0.3048;
  }
  const clean = val.replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Parse roof shape
 */
function parseRoofShape(shape: string | undefined): RoofShape {
  if (!shape) return 'flat';
  const s = shape.toLowerCase();
  if (s.includes('pyramid')) return 'pyramidal';
  if (s.includes('gabled') || s.includes('pitched')) return 'gabled';
  if (s.includes('hipped')) return 'hipped';
  if (s.includes('mansard')) return 'mansard';
  if (s.includes('dome') || s.includes('round')) return 'dome';
  return 'flat';
}

/**
 * Classify building typology
 */
function classifyTypology(tags: Record<string, string>, height: number): BuildingTypology {
  if (height >= 120) return 'skyscraper';

  const bType = (tags.building || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  const historic = tags.historic;

  if (historic || tags['heritage'] || tags['building:architecture']) return 'historic';
  if (amenity === 'place_of_worship' || tags['historic:monument'] || tags['monument']) return 'monument';
  if (['townhall', 'university', 'college', 'school', 'hospital', 'courthouse', 'library'].includes(amenity)) return 'civic';
  if (['commercial', 'retail', 'supermarket', 'mall'].includes(bType) || tags.shop) return 'commercial';
  if (['office', 'bank'].includes(bType) || ['bank'].includes(amenity)) return 'office';
  if (['industrial', 'warehouse', 'manufacture'].includes(bType)) return 'industrial';
  if (['apartments', 'residential', 'house', 'detached', 'terrace'].includes(bType)) return 'residential';

  if (height > 50) return 'office';
  return 'residential';
}

/**
 * Queries real 3D buildings from OpenStreetMap / Overpass API
 */
export async function fetchLiveOSM3DData(
  centerLat: number,
  centerLon: number,
  radiusMeters: number,
  locationName: string,
  onProgress?: (status: string, percent: number, stepIndex: number, stats?: { buildingsCount?: number }) => void,
  customBbox?: [number, number, number, number]
): Promise<UrbanDataset> {
  onProgress?.('Initializing geodetic coordinates & bounding box projection...', 10, 0);

  let minLat: number;
  let maxLat: number;
  let minLon: number;
  let maxLon: number;

  if (customBbox) {
    [minLat, minLon, maxLat, maxLon] = customBbox;
  } else {
    // Compute approximate bounding box (1 deg lat ~ 111km)
    const dLat = (radiusMeters / 111320);
    const dLon = (radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180)));

    minLat = centerLat - dLat;
    maxLat = centerLat + dLat;
    minLon = centerLon - dLon;
    maxLon = centerLon + dLon;
  }

  const bbox = `${minLat.toFixed(6)},${minLon.toFixed(6)},${maxLat.toFixed(6)},${maxLon.toFixed(6)}`;

  // Overpass QL query: extract buildings and main roads
  const overpassQuery = `[out:json][timeout:25];
(
  way["building"](${bbox});
  relation["building"]["type"="multipolygon"](${bbox});
  way["highway"~"primary|secondary|tertiary|trunk|motorway"](${bbox});
  way["natural"="water"](${bbox});
);
out body;
>;
out skel qt;`;

  onProgress?.('Querying OpenStreetMap / Earth 3D vector database...', 25, 1);

  let responseData: any = null;
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      onProgress?.(`Streaming 3D building polygons from ${new URL(endpoint).hostname}...`, 40, 1);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (res.ok) {
        responseData = await res.json();
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Failed endpoint ${endpoint}:`, err);
    }
  }

  if (!responseData || !responseData.elements) {
    throw new Error(
      lastError?.message ||
        'Overpass geospatial database is currently busy. Please try a smaller radius or choose one of our curated high-res city models.'
    );
  }

  onProgress?.('Parsing storey levels, roof profiles, and architectural heights...', 65, 2);

  // Map nodes
  const nodeMap = new Map<number, [number, number]>(); // id -> [lat, lon]
  for (const el of responseData.elements) {
    if (el.type === 'node') {
      nodeMap.set(el.id, [el.lat, el.lon]);
    }
  }

  const buildings: Building3D[] = [];
  const roads: RoadSegment[] = [];
  const water: WaterFeature[] = [];

  for (const el of responseData.elements) {
    if (el.type === 'way') {
      const tags = el.tags || {};

      // 1. Building Ways
      if (tags.building) {
        if (!el.nodes || el.nodes.length < 3) continue;

        const geoCoords: [number, number][] = [];
        const metricCoords: [number, number][] = [];

        for (const nodeId of el.nodes) {
          const pt = nodeMap.get(nodeId);
          if (pt) {
            geoCoords.push([pt[1], pt[0]]); // [lon, lat]
            const [mx, my] = geoToMetric(pt[1], pt[0], centerLat, centerLon);
            metricCoords.push([mx, my]);
          }
        }

        if (metricCoords.length < 3) continue;

        // Height resolution
        let height = parseHeight(tags.height);
        let levels = parseInt(tags['building:levels'] || '0', 10);

        if (!height) {
          if (levels > 0) {
            height = levels * 3.5;
          } else {
            // Estimate based on area or typology
            const area = calculatePolygonArea(metricCoords);
            if (tags.building === 'apartments' || tags.building === 'office') {
              levels = 6;
              height = 21;
            } else if (tags.building === 'commercial') {
              levels = 3;
              height = 12;
            } else if (area > 2000) {
              levels = 5;
              height = 18;
            } else {
              levels = 2;
              height = 8;
            }
          }
        }

        if (levels <= 0) {
          levels = Math.max(Math.round(height / 3.5), 1);
        }

        const typology = classifyTypology(tags, height);
        const roofShape = parseRoofShape(tags['roof:shape']);
        const roofHeight = parseHeight(tags['roof:height']) || (roofShape !== 'flat' ? Math.min(height * 0.2, 8) : 0);

        const buildingObj: Building3D = {
          id: `osm_way_${el.id}`,
          name: tags.name || tags['addr:housename'] || `Building ${el.id}`,
          typology,
          footprint: metricCoords,
          geoFootprint: geoCoords,
          height: Math.min(Math.max(height, 3.5), 900),
          levels,
          minHeight: 0,
          roofShape,
          roofHeight,
          address: tags['addr:street']
            ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim()
            : undefined,
          amenity: tags.amenity,
          tags,
          areaMeters2: calculatePolygonArea(metricCoords),
          perimeterMeters: calculatePolygonPerimeter(metricCoords),
          centerMetric: calculatePolygonCentroid(metricCoords),
        };

        buildings.push(buildingObj);
      }

      // 2. Road Ways
      else if (tags.highway) {
        if (!el.nodes || el.nodes.length < 2) continue;
        const pts: [number, number][] = [];
        for (const nid of el.nodes) {
          const pt = nodeMap.get(nid);
          if (pt) {
            pts.push(geoToMetric(pt[1], pt[0], centerLat, centerLon));
          }
        }
        if (pts.length >= 2) {
          roads.push({
            id: `road_${el.id}`,
            name: tags.name,
            type: tags.highway === 'motorway' || tags.highway === 'trunk' ? 'highway' : 'primary',
            points: pts,
            width: tags.highway === 'motorway' ? 14 : 10,
          });
        }
      }

      // 3. Water Ways
      else if (tags.natural === 'water' || tags.waterway) {
        if (!el.nodes || el.nodes.length < 3) continue;
        const poly: [number, number][] = [];
        for (const nid of el.nodes) {
          const pt = nodeMap.get(nid);
          if (pt) {
            poly.push(geoToMetric(pt[1], pt[0], centerLat, centerLon));
          }
        }
        if (poly.length >= 3) {
          water.push({
            id: `water_${el.id}`,
            name: tags.name,
            polygon: poly,
          });
        }
      }
    }
  }

  onProgress?.(
    `Triangulating ${buildings.length} building footprints into manifold 3D solids...`,
    88,
    3,
    { buildingsCount: buildings.length }
  );

  onProgress?.(
    `Reconstructed ${buildings.length} 3D architectural buildings successfully!`,
    100,
    4,
    { buildingsCount: buildings.length }
  );

  return {
    id: `osm_extract_${Date.now()}`,
    name: locationName,
    description: `Live 3D extraction from OpenStreetMap around Lat ${centerLat.toFixed(5)}, Lon ${centerLon.toFixed(5)} with ${buildings.length} buildings.`,
    center: [centerLat, centerLon],
    radiusMeters,
    bbox: [minLat, minLon, maxLat, maxLon],
    source: 'Overpass / OpenStreetMap',
    fetchedAt: new Date().toISOString(),
    buildings,
    roads,
    water,
  };
}
