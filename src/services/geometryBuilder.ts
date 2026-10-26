import * as THREE from 'three';
import { Building3D, BuildingTypology, RenderMode } from '../types';
import { triangulatePolygon } from './triangulation';

export interface MeshBufferData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors?: Float32Array;
  indices: Uint32Array;
  buildingId: string;
  typology: BuildingTypology;
  height: number;
}

export interface BuildingGeometryBundle {
  wallMesh: THREE.BufferGeometry;
  roofMesh: THREE.BufferGeometry;
  detailMesh?: THREE.BufferGeometry;
  wireframeMesh?: THREE.BufferGeometry;
  building: Building3D;
}

// Typology color map
export const TYPOLOGY_COLORS: Record<BuildingTypology, string> = {
  skyscraper: '#38bdf8', // Sky blue
  office: '#60a5fa', // Blue
  commercial: '#a78bfa', // Violet
  residential: '#34d399', // Emerald
  historic: '#f59e0b', // Amber
  civic: '#ec4899', // Pink
  industrial: '#94a3b8', // Slate
  monument: '#eab308', // Gold
  mixed: '#2dd4bf', // Teal
};

// Heatmap color generator based on normalized height (0 to 1)
export function getHeatmapColor(height: number, maxHeight: number): THREE.Color {
  const t = Math.min(Math.max(height / Math.max(maxHeight, 10), 0), 1);
  // Color ramp: Cyan (0.0) -> Green (0.25) -> Yellow (0.5) -> Orange (0.75) -> Magenta/Red (1.0)
  const color = new THREE.Color();
  if (t < 0.25) {
    color.setRGB(0.1, 0.4 + t * 2.4, 0.9 - t * 2);
  } else if (t < 0.5) {
    const s = (t - 0.25) * 4;
    color.setRGB(0.1 + s * 0.8, 1.0, 0.4 - s * 0.4);
  } else if (t < 0.75) {
    const s = (t - 0.5) * 4;
    color.setRGB(0.9 + s * 0.1, 1.0 - s * 0.5, 0.0);
  } else {
    const s = (t - 0.75) * 4;
    color.setRGB(1.0, 0.5 - s * 0.4, s * 0.6);
  }
  return color;
}

/**
 * Builds 3D geometry for a building footprint with extruded walls and roof
 */
export function buildBuildingGeometry(
  building: Building3D,
  heightMultiplier = 1.0
): {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  roofStartIndex: number;
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const footprint = building.footprint;
  const n = footprint.length;
  if (n < 3) {
    return { positions: [], normals: [], uvs: [], indices: [], roofStartIndex: 0 };
  }

  const baseH = building.minHeight;
  const totalH = (building.height * heightMultiplier) || 12;
  const roofH = building.roofHeight || (building.roofShape !== 'flat' ? Math.min(totalH * 0.25, 8) : 0);
  const wallH = Math.max(totalH - roofH, baseH + 1);

  let vertexCount = 0;

  // 1. WALLS: generate quads for each segment of the footprint
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const p1 = footprint[i];
    const p2 = footprint[nextIdx];

    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const segLen = Math.sqrt(dx * dx + dz * dz);
    if (segLen < 1e-5) continue;

    // Normal pointing outward (perpendicular to wall edge in XZ plane)
    const nx = dz / segLen;
    const nz = -dx / segLen;

    const baseIndex = vertexCount;

    // 4 vertices for wall quad: Bottom-Left, Bottom-Right, Top-Right, Top-Left
    // Three.js coordinates: X = East, Y = Up, Z = -North
    positions.push(
      p1[0], baseH, -p1[1], // V0
      p2[0], baseH, -p2[1], // V1
      p2[0], wallH, -p2[1], // V2
      p1[0], wallH, -p1[1]  // V3
    );

    // Normals
    normals.push(
      nx, 0, -nz,
      nx, 0, -nz,
      nx, 0, -nz,
      nx, 0, -nz
    );

    // UVs: based on wall distance and height
    const uScale = 0.25; // 4m per texture tile
    const vScale = 0.3;  // ~3.3m per floor
    uvs.push(
      0, 0,
      segLen * uScale, 0,
      segLen * uScale, (wallH - baseH) * vScale,
      0, (wallH - baseH) * vScale
    );

    // 2 Triangles for this quad
    indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );

    vertexCount += 4;
  }

  const roofStartIndex = indices.length;

  // 2. ROOF GENERATION
  if (building.roofShape === 'pyramidal' || building.roofShape === 'dome') {
    // Center peak roof
    const [cx, cz] = building.centerMetric;
    const peakY = totalH;
    const peakIndex = vertexCount;

    positions.push(cx, peakY, -cz);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);
    vertexCount += 1;

    for (let i = 0; i < n; i++) {
      const p = footprint[i];
      positions.push(p[0], wallH, -p[1]);
      normals.push(0, 0.8, 0);
      uvs.push((p[0] - cx) * 0.05 + 0.5, (p[1] - cz) * 0.05 + 0.5);
      vertexCount += 1;
    }

    for (let i = 0; i < n; i++) {
      const v1 = peakIndex + 1 + i;
      const v2 = peakIndex + 1 + ((i + 1) % n);
      indices.push(peakIndex, v1, v2);
    }
  } else {
    // Flat roof or hipped/mansard triangulated cap
    const roofTris = triangulatePolygon(footprint);
    const roofBaseIndex = vertexCount;

    for (let i = 0; i < n; i++) {
      const p = footprint[i];
      positions.push(p[0], wallH, -p[1]);
      normals.push(0, 1, 0); // Flat normal pointing straight up
      uvs.push(p[0] * 0.1, p[1] * 0.1);
      vertexCount++;
    }

    for (let i = 0; i < roofTris.length; i += 3) {
      indices.push(
        roofBaseIndex + roofTris[i],
        roofBaseIndex + roofTris[i + 2],
        roofBaseIndex + roofTris[i + 1]
      );
    }

    // Add rooftop HVAC mechanical box for skyscrapers or large offices to increase architectural realism
    if ((building.height > 40 || building.typology === 'skyscraper' || building.typology === 'office') && n >= 4) {
      const [cx, cz] = building.centerMetric;
      const boxW = Math.min(Math.sqrt(building.areaMeters2) * 0.35, 12);
      const boxH = Math.min(totalH * 0.08, 4.5);
      const hvacBase = wallH;
      const hvacTop = wallH + boxH;

      const hvacBaseIdx = vertexCount;
      const hw = boxW / 2;

      // Small cube on roof
      const hvacVerts = [
        [cx - hw, cz - hw],
        [cx + hw, cz - hw],
        [cx + hw, cz + hw],
        [cx - hw, cz + hw],
      ];

      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        const p1 = hvacVerts[i];
        const p2 = hvacVerts[next];
        const segIdx = vertexCount;

        positions.push(
          p1[0], hvacBase, -p1[1],
          p2[0], hvacBase, -p2[1],
          p2[0], hvacTop, -p2[1],
          p1[0], hvacTop, -p1[1]
        );
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        indices.push(segIdx, segIdx + 1, segIdx + 2, segIdx, segIdx + 2, segIdx + 3);
        vertexCount += 4;
      }

      // HVAC top cap
      const topCapIdx = vertexCount;
      for (let i = 0; i < 4; i++) {
        const p = hvacVerts[i];
        positions.push(p[0], hvacTop, -p[1]);
        normals.push(0, 1, 0);
        uvs.push(i % 2, i > 1 ? 1 : 0);
        vertexCount++;
      }
      indices.push(
        topCapIdx, topCapIdx + 2, topCapIdx + 1,
        topCapIdx, topCapIdx + 3, topCapIdx + 2
      );
    }
  }

  return {
    positions,
    normals,
    uvs,
    indices,
    roofStartIndex,
  };
}

/**
 * Creates combined Three.js BufferGeometry for an entire dataset, with vertex colors
 */
export function createMergedDatasetGeometry(
  buildings: Building3D[],
  renderMode: RenderMode,
  maxHeight: number,
  heightMultiplier = 1.0
): THREE.BufferGeometry {
  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allUvs: number[] = [];
  const allColors: number[] = [];
  const allIndices: number[] = [];

  let globalVertexOffset = 0;

  for (const b of buildings) {
    const meshData = buildBuildingGeometry(b, heightMultiplier);
    if (meshData.positions.length === 0) continue;

    // Determine building color based on mode
    let baseColor = new THREE.Color('#f8fafc'); // Default architectural off-white
    if (renderMode === 'heatmap') {
      baseColor = getHeatmapColor(b.height, maxHeight);
    } else if (renderMode === 'typology') {
      baseColor = new THREE.Color(TYPOLOGY_COLORS[b.typology] || '#94a3b8');
    } else if (renderMode === 'cad') {
      baseColor = new THREE.Color('#38bdf8');
    } else if (renderMode === 'night') {
      baseColor = new THREE.Color('#1e293b');
    }

    const roofColor = baseColor.clone().offsetHSL(0, -0.05, -0.15);

    const numVerts = meshData.positions.length / 3;
    for (let v = 0; v < numVerts; v++) {
      allPositions.push(
        meshData.positions[v * 3],
        meshData.positions[v * 3 + 1],
        meshData.positions[v * 3 + 2]
      );
      allNormals.push(
        meshData.normals[v * 3],
        meshData.normals[v * 3 + 1],
        meshData.normals[v * 3 + 2]
      );
      allUvs.push(
        meshData.uvs[v * 2],
        meshData.uvs[v * 2 + 1]
      );

      // Check if roof or wall based on normal Y
      const ny = meshData.normals[v * 3 + 1];
      const c = ny > 0.5 ? roofColor : baseColor;
      allColors.push(c.r, c.g, c.b);
    }

    for (let idx of meshData.indices) {
      allIndices.push(idx + globalVertexOffset);
    }

    globalVertexOffset += numVerts;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));
  geometry.setIndex(allIndices);

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
