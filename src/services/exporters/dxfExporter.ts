import { Building3D, ExportSettings, UrbanDataset } from '../../types';
import { buildBuildingGeometry } from '../geometryBuilder';
import { transformPoint } from './unitUtils';

export function exportToDXF(
  dataset: UrbanDataset,
  settings: ExportSettings
): { dxf: string; filename: string } {
  const safeCityName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeCityName}_3D_Buildings.dxf`;

  const lines: string[] = [];

  // DXF Header
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1009'); // AutoCAD Release 12 / 2000 compatibility
  lines.push('9', '$INSUNITS', '70', settings.units === 'feet' ? '2' : settings.units === 'inches' ? '1' : settings.units === 'millimeters' ? '4' : '6'); // 6 = meters
  lines.push('0', 'ENDSEC');

  // TABLES Section (Layers with CAD standard colors)
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '6');

  // Helper to add layer table entry
  const addLayer = (name: string, color: number) => {
    lines.push('0', 'LAYER', '2', name, '70', '64', '62', color.toString(), '6', 'CONTINUOUS');
  };

  addLayer('BUILDINGS_TALL', 4); // Cyan
  addLayer('BUILDINGS_MID', 5);  // Blue
  addLayer('BUILDINGS_LOW', 3);  // Green
  addLayer('ROOFS', 2);          // Yellow
  addLayer('FOOTPRINTS', 7);     // White
  addLayer('ROADS', 8);          // Dark Gray
  addLayer('WATER', 140);        // Deep Blue

  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // BLOCKS Section
  lines.push('0', 'SECTION', '2', 'BLOCKS');
  lines.push('0', 'ENDSEC');

  // ENTITIES Section (3DFACE and POLYLINE)
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  for (const building of dataset.buildings) {
    const mesh = buildBuildingGeometry(building, settings.buildingHeightMultiplier);
    if (mesh.positions.length === 0) continue;

    let layerName = 'BUILDINGS_LOW';
    if (building.height > 60) layerName = 'BUILDINGS_TALL';
    else if (building.height > 25) layerName = 'BUILDINGS_MID';

    // 1. Emit 3DFACE polygons
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const isRoof = i >= mesh.roofStartIndex;
      const targetLayer = isRoof ? 'ROOFS' : layerName;

      const idx0 = mesh.indices[i];
      const idx1 = mesh.indices[i + 1];
      const idx2 = mesh.indices[i + 2];

      const p0 = transformPoint(
        mesh.positions[idx0 * 3],
        mesh.positions[idx0 * 3 + 1],
        mesh.positions[idx0 * 3 + 2],
        settings.upAxis,
        settings.units
      );
      const p1 = transformPoint(
        mesh.positions[idx1 * 3],
        mesh.positions[idx1 * 3 + 1],
        mesh.positions[idx1 * 3 + 2],
        settings.upAxis,
        settings.units
      );
      const p2 = transformPoint(
        mesh.positions[idx2 * 3],
        mesh.positions[idx2 * 3 + 1],
        mesh.positions[idx2 * 3 + 2],
        settings.upAxis,
        settings.units
      );

      lines.push('0', '3DFACE');
      lines.push('8', targetLayer);
      // V0
      lines.push('10', p0[0].toFixed(3));
      lines.push('20', p0[1].toFixed(3));
      lines.push('30', p0[2].toFixed(3));
      // V1
      lines.push('11', p1[0].toFixed(3));
      lines.push('21', p1[1].toFixed(3));
      lines.push('31', p1[2].toFixed(3));
      // V2
      lines.push('12', p2[0].toFixed(3));
      lines.push('22', p2[1].toFixed(3));
      lines.push('32', p2[2].toFixed(3));
      // V3 (for triangular 3DFACE, vertex 4 equals vertex 3)
      lines.push('13', p2[0].toFixed(3));
      lines.push('23', p2[1].toFixed(3));
      lines.push('33', p2[2].toFixed(3));
    }

    // 2. Emit 2D/3D Footprint Polyline on FOOTPRINTS layer
    const fp = building.footprint;
    if (fp.length >= 3) {
      lines.push('0', 'POLYLINE');
      lines.push('8', 'FOOTPRINTS');
      lines.push('66', '1'); // Vertices follow
      lines.push('70', '1'); // Closed polyline

      for (const pt of fp) {
        const [px, py, pz] = transformPoint(pt[0], 0, -pt[1], settings.upAxis, settings.units);
        lines.push('0', 'VERTEX');
        lines.push('8', 'FOOTPRINTS');
        lines.push('10', px.toFixed(3));
        lines.push('20', py.toFixed(3));
        lines.push('30', pz.toFixed(3));
      }
      lines.push('0', 'SEQEND');
    }
  }

  // Roads layer
  if (settings.includeRoads && dataset.roads && dataset.roads.length > 0) {
    for (const road of dataset.roads) {
      if (road.points.length < 2) continue;
      lines.push('0', 'POLYLINE', '8', 'ROADS', '66', '1', '70', '0');
      for (const pt of road.points) {
        const [px, py, pz] = transformPoint(pt[0], 0.1, -pt[1], settings.upAxis, settings.units);
        lines.push('0', 'VERTEX', '8', 'ROADS', '10', px.toFixed(3), '20', py.toFixed(3), '30', pz.toFixed(3));
      }
      lines.push('0', 'SEQEND');
    }
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return {
    dxf: lines.join('\n'),
    filename,
  };
}
