import { Building3D, ExportSettings, UrbanDataset } from '../../types';
import { buildBuildingGeometry } from '../geometryBuilder';
import { transformPoint } from './unitUtils';

export interface ObjExportResult {
  obj: string;
  mtl: string;
  filename: string;
}

export function exportToOBJ(
  dataset: UrbanDataset,
  settings: ExportSettings
): ObjExportResult {
  const lines: string[] = [];
  const mtlLines: string[] = [];

  const safeCityName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const objName = `${safeCityName}_3D_Buildings.obj`;
  const mtlName = `${safeCityName}_materials.mtl`;

  // Header comments
  lines.push(`# Geo3D Studio - Geospatial 3D Building Exporter`);
  lines.push(`# Location: ${dataset.name}`);
  lines.push(`# Lat/Lon: ${dataset.center[0]}, ${dataset.center[1]}`);
  lines.push(`# Coordinate System: Local Cartesian (${settings.upAxis}, ${settings.units})`);
  lines.push(`# Buildings: ${dataset.buildings.length}`);
  lines.push(`mtllib ${mtlName}`);
  lines.push('');

  // Define standard materials
  mtlLines.push(`# Geo3D Studio Materials`);
  mtlLines.push(`newmtl Facade_Skyscraper\nKd 0.22 0.74 0.97\nKs 0.5 0.5 0.5\nNs 60\nd 1.0`);
  mtlLines.push(`newmtl Facade_Commercial\nKd 0.65 0.54 0.98\nKs 0.3 0.3 0.3\nNs 30\nd 1.0`);
  mtlLines.push(`newmtl Facade_Residential\nKd 0.20 0.83 0.60\nKs 0.2 0.2 0.2\nNs 20\nd 1.0`);
  mtlLines.push(`newmtl Facade_Office\nKd 0.37 0.65 0.98\nKs 0.4 0.4 0.4\nNs 45\nd 1.0`);
  mtlLines.push(`newmtl Facade_Historic\nKd 0.96 0.62 0.04\nKs 0.1 0.1 0.1\nNs 10\nd 1.0`);
  mtlLines.push(`newmtl Facade_Default\nKd 0.85 0.87 0.90\nKs 0.2 0.2 0.2\nNs 25\nd 1.0`);
  mtlLines.push(`newmtl Roof_Dark\nKd 0.30 0.32 0.36\nKs 0.1 0.1 0.1\nNs 15\nd 1.0`);

  let globalVIndex = 1;
  let globalVTIndex = 1;
  let globalVNIndex = 1;

  for (let bIndex = 0; bIndex < dataset.buildings.length; bIndex++) {
    const building = dataset.buildings[bIndex];
    const mesh = buildBuildingGeometry(building, settings.buildingHeightMultiplier);
    if (mesh.positions.length === 0) continue;

    // Object or Group naming
    const cleanId = building.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanName = (building.name || `Building_${cleanId}`).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (settings.grouping === 'by_building') {
      lines.push(`o ${cleanName}`);
      lines.push(`g ${cleanName}`);
    } else if (settings.grouping === 'by_typology') {
      lines.push(`g Typology_${building.typology}`);
    } else if (bIndex === 0 && settings.grouping === 'merged') {
      lines.push(`o ${safeCityName}_MergedBuildings`);
      lines.push(`g Buildings_All`);
    }

    // Material assignment
    let matName = 'Facade_Default';
    if (building.typology === 'skyscraper') matName = 'Facade_Skyscraper';
    else if (building.typology === 'commercial') matName = 'Facade_Commercial';
    else if (building.typology === 'residential') matName = 'Facade_Residential';
    else if (building.typology === 'office') matName = 'Facade_Office';
    else if (building.typology === 'historic') matName = 'Facade_Historic';

    lines.push(`usemtl ${matName}`);

    // Emit Vertices
    const numVerts = mesh.positions.length / 3;
    const vertexBase = globalVIndex;

    for (let v = 0; v < numVerts; v++) {
      const vx = mesh.positions[v * 3];
      const vy = mesh.positions[v * 3 + 1];
      const vz = mesh.positions[v * 3 + 2];

      const [tx, ty, tz] = transformPoint(vx, vy, vz, settings.upAxis, settings.units);
      lines.push(`v ${tx.toFixed(4)} ${ty.toFixed(4)} ${tz.toFixed(4)}`);
    }

    // Emit Normals
    for (let v = 0; v < numVerts; v++) {
      const nx = mesh.normals[v * 3];
      const ny = mesh.normals[v * 3 + 1];
      const nz = mesh.normals[v * 3 + 2];

      const [tnx, tny, tnz] = transformPoint(nx, ny, nz, settings.upAxis, 'meters');
      lines.push(`vn ${tnx.toFixed(4)} ${tny.toFixed(4)} ${tnz.toFixed(4)}`);
    }

    // Emit Texture UVs
    for (let v = 0; v < numVerts; v++) {
      const u = mesh.uvs[v * 2];
      const w = mesh.uvs[v * 2 + 1];
      lines.push(`vt ${u.toFixed(4)} ${w.toFixed(4)}`);
    }

    // Emit Faces
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const i0 = vertexBase + mesh.indices[i];
      const i1 = vertexBase + mesh.indices[i + 1];
      const i2 = vertexBase + mesh.indices[i + 2];

      lines.push(`f ${i0}/${i0}/${i0} ${i1}/${i1}/${i1} ${i2}/${i2}/${i2}`);
    }

    globalVIndex += numVerts;
    globalVTIndex += numVerts;
    globalVNIndex += numVerts;
  }

  return {
    obj: lines.join('\n'),
    mtl: mtlLines.join('\n'),
    filename: objName,
  };
}
