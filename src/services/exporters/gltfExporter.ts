import { ExportSettings, UrbanDataset } from '../../types';
import { buildBuildingGeometry } from '../geometryBuilder';
import { transformPoint } from './unitUtils';

export function exportToGLTF(
  dataset: UrbanDataset,
  settings: ExportSettings
): { gltf: string; filename: string } {
  const safeCityName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeCityName}_3D_Model.gltf`;

  // We can construct a standard self-contained glTF 2.0 JSON structure
  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allIndices: number[] = [];

  let vertexOffset = 0;

  for (const building of dataset.buildings) {
    const mesh = buildBuildingGeometry(building, settings.buildingHeightMultiplier);
    if (mesh.positions.length === 0) continue;

    const numVerts = mesh.positions.length / 3;
    for (let v = 0; v < numVerts; v++) {
      const p = transformPoint(
        mesh.positions[v * 3],
        mesh.positions[v * 3 + 1],
        mesh.positions[v * 3 + 2],
        settings.upAxis,
        settings.units
      );
      allPositions.push(p[0], p[1], p[2]);

      const n = transformPoint(
        mesh.normals[v * 3],
        mesh.normals[v * 3 + 1],
        mesh.normals[v * 3 + 2],
        settings.upAxis,
        'meters'
      );
      allNormals.push(n[0], n[1], n[2]);
    }

    for (let i = 0; i < mesh.indices.length; i++) {
      allIndices.push(mesh.indices[i] + vertexOffset);
    }

    vertexOffset += numVerts;
  }

  // Create buffers
  const posBuffer = new Float32Array(allPositions);
  const normBuffer = new Float32Array(allNormals);
  const indBuffer = new Uint32Array(allIndices);

  const totalByteLength =
    posBuffer.byteLength + normBuffer.byteLength + indBuffer.byteLength;
  const combinedBuffer = new Uint8Array(totalByteLength);

  let offset = 0;
  combinedBuffer.set(new Uint8Array(posBuffer.buffer), offset);
  const posOffset = offset;
  offset += posBuffer.byteLength;

  combinedBuffer.set(new Uint8Array(normBuffer.buffer), offset);
  const normOffset = offset;
  offset += normBuffer.byteLength;

  combinedBuffer.set(new Uint8Array(indBuffer.buffer), offset);
  const indOffset = offset;

  // Convert buffer to Base64
  let binaryString = '';
  const chunkSize = 8192;
  for (let i = 0; i < combinedBuffer.length; i += chunkSize) {
    const chunk = combinedBuffer.subarray(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64Buffer = btoa(binaryString);

  // Compute bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < allPositions.length; i += 3) {
    minX = Math.min(minX, allPositions[i]);
    minY = Math.min(minY, allPositions[i + 1]);
    minZ = Math.min(minZ, allPositions[i + 2]);
    maxX = Math.max(maxX, allPositions[i]);
    maxY = Math.max(maxY, allPositions[i + 1]);
    maxZ = Math.max(maxZ, allPositions[i + 2]);
  }

  const gltfObj = {
    asset: {
      version: '2.0',
      generator: 'Geo3D Studio Geospatial 3D Extractor',
    },
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    nodes: [
      {
        mesh: 0,
        name: `${safeCityName}_3D_Buildings`,
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
            },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: 'Architectural_Default',
        pbrMetallicRoughness: {
          baseColorFactor: [0.9, 0.92, 0.95, 1.0],
          metallicFactor: 0.1,
          roughnessFactor: 0.6,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: allPositions.length / 3,
        type: 'VEC3',
        max: [maxX, maxY, maxZ],
        min: [minX, minY, minZ],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: allNormals.length / 3,
        type: 'VEC3',
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5125, // UNSIGNED_INT
        count: allIndices.length,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: posOffset,
        byteLength: posBuffer.byteLength,
        target: 34962, // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: normOffset,
        byteLength: normBuffer.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: indOffset,
        byteLength: indBuffer.byteLength,
        target: 34963, // ELEMENT_ARRAY_BUFFER
      },
    ],
    buffers: [
      {
        byteLength: totalByteLength,
        uri: `data:application/octet-stream;base64,${base64Buffer}`,
      },
    ],
  };

  return {
    gltf: JSON.stringify(gltfObj, null, 2),
    filename,
  };
}
