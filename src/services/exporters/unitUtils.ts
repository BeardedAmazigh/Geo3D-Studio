import { ExportSettings, ExportUnits, ExportUpAxis } from '../../types';

export function getUnitScale(units: ExportUnits): number {
  switch (units) {
    case 'meters':
      return 1.0;
    case 'feet':
      return 3.28084;
    case 'millimeters':
      return 1000.0;
    case 'inches':
      return 39.3701;
    default:
      return 1.0;
  }
}

/**
 * Transforms a local coordinate [x, y(elev), z]
 * to the target unit and target up-axis convention.
 *
 * In our internal system:
 * X = East, Y = Up (elevation), Z = -North (Three.js convention)
 *
 * Z_UP (AutoCAD, Revit, Blender, 3ds Max):
 * targetX = internalX * scale
 * targetY = -internalZ * scale (North)
 * targetZ = internalY * scale (Elevation)
 *
 * Y_UP (Three.js, Maya, Unity):
 * targetX = internalX * scale
 * targetY = internalY * scale
 * targetZ = internalZ * scale
 */
export function transformPoint(
  x: number,
  y: number,
  z: number,
  upAxis: ExportUpAxis,
  units: ExportUnits
): [number, number, number] {
  const scale = getUnitScale(units);
  if (upAxis === 'Z_UP') {
    return [x * scale, -z * scale, y * scale];
  } else {
    return [x * scale, y * scale, z * scale];
  }
}
