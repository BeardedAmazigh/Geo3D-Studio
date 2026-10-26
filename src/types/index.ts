export type BuildingTypology =
  | 'commercial'
  | 'residential'
  | 'office'
  | 'historic'
  | 'civic'
  | 'industrial'
  | 'skyscraper'
  | 'monument'
  | 'mixed';

export type RoofShape =
  | 'flat'
  | 'gabled'
  | 'hipped'
  | 'mansard'
  | 'pyramidal'
  | 'dome'
  | 'skillion';

export interface Building3D {
  id: string;
  name: string;
  typology: BuildingTypology;
  footprint: [number, number][]; // Local metric coordinates [x, y] in meters relative to center
  geoFootprint?: [number, number][]; // [longitude, latitude]
  height: number; // in meters
  levels: number;
  minHeight: number; // base elevation off ground
  roofShape: RoofShape;
  roofHeight: number;
  roofColor?: string;
  facadeColor?: string;
  address?: string;
  amenity?: string;
  yearBuilt?: number;
  tags?: Record<string, string>;
  areaMeters2: number;
  perimeterMeters: number;
  centerMetric: [number, number];
}

export interface RoadSegment {
  id: string;
  name?: string;
  type: 'highway' | 'primary' | 'secondary' | 'tertiary' | 'residential' | 'pedestrian';
  points: [number, number][]; // metric coords [x, y]
  width: number;
}

export interface WaterFeature {
  id: string;
  name?: string;
  polygon: [number, number][]; // metric coords
}

export interface UrbanDataset {
  id: string;
  name: string;
  description: string;
  center: [number, number]; // [lat, lon]
  radiusMeters: number;
  buildings: Building3D[];
  roads: RoadSegment[];
  water: WaterFeature[];
  bbox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  source: 'Overpass / OpenStreetMap' | 'Cesium / Earth 3D' | 'Curated Preset' | 'Custom GeoJSON';
  fetchedAt: string;
}

export type ExportFormat =
  | 'OBJ'
  | 'FBX'
  | 'DXF'
  | 'SKP'
  | 'RVT'
  | 'STL'
  | 'GLTF'
  | 'GEOJSON'
  | 'ZIP_BUNDLE';

export type ExportUpAxis = 'Z_UP' | 'Y_UP';
export type ExportUnits = 'meters' | 'feet' | 'millimeters' | 'inches';
export type ExportGrouping = 'merged' | 'by_building' | 'by_typology' | 'by_height';
export type ExportLOD = 'LOD1' | 'LOD2';

export interface ExportSettings {
  format: ExportFormat;
  upAxis: ExportUpAxis;
  units: ExportUnits;
  grouping: ExportGrouping;
  lod: ExportLOD;
  includeTerrain: boolean;
  includeRoads: boolean;
  includeWater: boolean;
  includeMetadata: boolean;
  buildingHeightMultiplier: number;
}

export type RenderMode =
  | 'clay' // Matte architectural white model with soft ambient occlusion
  | 'cad' // Blueprint / cyan wireframe CAD
  | 'heatmap' // Colored by height gradient
  | 'textured' // Procedural glass curtain wall and facades
  | 'typology' // Categorical coloring by use-type
  | 'night'; // Night city lights and window illumination

export type CameraViewPreset = 'perspective' | 'top' | 'isometric' | 'front' | 'side';
