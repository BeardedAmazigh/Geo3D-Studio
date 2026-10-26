import { ExportSettings, UrbanDataset } from '../../types';
import { buildBuildingGeometry } from '../geometryBuilder';
import { transformPoint } from './unitUtils';

export function exportToSTL(
  dataset: UrbanDataset,
  settings: ExportSettings
): { stl: string; filename: string } {
  const safeCityName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeCityName}_3D_Printable.stl`;

  const lines: string[] = [];
  lines.push(`solid ${safeCityName}_Geo3D`);

  for (const building of dataset.buildings) {
    const mesh = buildBuildingGeometry(building, settings.buildingHeightMultiplier);
    if (mesh.positions.length === 0) continue;

    for (let i = 0; i < mesh.indices.length; i += 3) {
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

      // Compute triangle normal
      const ax = p1[0] - p0[0];
      const ay = p1[1] - p0[1];
      const az = p1[2] - p0[2];

      const bx = p2[0] - p0[0];
      const by = p2[1] - p0[1];
      const bz = p2[2] - p0[2];

      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 1e-6) {
        nx /= len;
        ny /= len;
        nz /= len;
      }

      lines.push(`  facet normal ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}`);
      lines.push('    outer loop');
      lines.push(`      vertex ${p0[0].toFixed(3)} ${p0[1].toFixed(3)} ${p0[2].toFixed(3)}`);
      lines.push(`      vertex ${p1[0].toFixed(3)} ${p1[1].toFixed(3)} ${p1[2].toFixed(3)}`);
      lines.push(`      vertex ${p2[0].toFixed(3)} ${p2[1].toFixed(3)} ${p2[2].toFixed(3)}`);
      lines.push('    endloop');
      lines.push('  endfacet');
    }
  }

  lines.push(`endsolid ${safeCityName}_Geo3D`);

  return {
    stl: lines.join('\n'),
    filename,
  };
}
