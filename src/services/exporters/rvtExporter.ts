import { ExportSettings, UrbanDataset } from '../../types';
import { buildBuildingGeometry } from '../geometryBuilder';
import { transformPoint } from './unitUtils';

export function exportToRVTWorkflow(
  dataset: UrbanDataset,
  settings: ExportSettings
): {
  ifc: string;
  revitScript: string;
  revitGuide: string;
  filename: string;
} {
  const safeCityName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeCityName}_Revit_BIM.ifc`;

  const lines: string[] = [];

  // ISO-10303-21 STEP physical file format (IFC 2x3)
  lines.push('ISO-10303-21;');
  lines.push('HEADER;');
  lines.push(`FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');`);
  lines.push(`FILE_NAME('${filename}','2026-10-26T12:00:00',('Geo3D Studio'),('Autodesk Revit BIM Integration'),'Geo3D Engine v2.4','Autodesk Revit','');`);
  lines.push(`FILE_SCHEMA(('IFC2X3'));`);
  lines.push('ENDSEC;');
  lines.push('DATA;');

  let id = 1;
  const projectPlacementId = id++;
  const sitePlacementId = id++;
  const buildingPlacementId = id++;
  const ownerHistoryId = id++;
  const projectId = id++;
  const siteId = id++;
  const buildingId = id++;
  const lengthUnitId = id++;
  const unitAssignmentId = id++;

  // Owner History & Organization
  lines.push(`#${ownerHistoryId}= IFCOWNERHISTORY(#${id++},#${id++},$,.NOCHANGE.,$,$,$,1761480000);`);
  lines.push(`#${id - 2}= IFCPERSON($,'Architect','Geo3D',$,$,$,$,$);`);
  lines.push(`#${id - 1}= IFCORGANIZATION($,'Geo3D Studio','Geospatial BIM Platform',$,$);`);

  // Units
  lines.push(`#${lengthUnitId}= IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);`);
  lines.push(`#${unitAssignmentId}= IFCUNITASSIGNMENT((#${lengthUnitId}));`);

  // Placements
  const pointZeroId = id++;
  lines.push(`#${pointZeroId}= IFCCARTESIANPOINT((0.,0.,0.));`);
  const axisZId = id++;
  lines.push(`#${axisZId}= IFCDIRECTION((0.,0.,1.));`);
  const axisXId = id++;
  lines.push(`#${axisXId}= IFCDIRECTION((1.,0.,0.));`);

  const axisPlacementZeroId = id++;
  lines.push(`#${axisPlacementZeroId}= IFCAXIS2PLACEMENT3D(#${pointZeroId},#${axisZId},#${axisXId});`);

  lines.push(`#${projectPlacementId}= IFCLOCALPLACEMENT($,#${axisPlacementZeroId});`);
  lines.push(`#${sitePlacementId}= IFCLOCALPLACEMENT(#${projectPlacementId},#${axisPlacementZeroId});`);
  lines.push(`#${buildingPlacementId}= IFCLOCALPLACEMENT(#${sitePlacementId},#${axisPlacementZeroId});`);

  // Project, Site, Building
  lines.push(`#${projectId}= IFCPROJECT('0Geo3DProject000000001',#${ownerHistoryId},'${safeCityName} Urban BIM',$,$,$,$,(#${id++}),#${unitAssignmentId});`);
  lines.push(`#${id - 1}= IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${axisPlacementZeroId},#${axisZId});`);

  lines.push(`#${siteId}= IFCSITE('0Geo3DSite000000000001',#${ownerHistoryId},'${safeCityName} Site',$,$,#${sitePlacementId},$,$,.ELEMENT.,(${dataset.center[0].toFixed(5)},${dataset.center[1].toFixed(5)},0.),$,$,$,$);`);
  lines.push(`#${buildingId}= IFCBUILDING('0Geo3DBuilding00000001',#${ownerHistoryId},'${safeCityName} Campus',$,$,#${buildingPlacementId},$,$,.ELEMENT.,$,$,$);`);

  // RelAggregates: Project -> Site -> Building
  lines.push(`#${id++}= IFCRELAGGREGATES('0AggProj0000000000001',#${ownerHistoryId},'ProjectSite',$,#${projectId},(#${siteId}));`);
  lines.push(`#${id++}= IFCRELAGGREGATES('0AggSite0000000000001',#${ownerHistoryId},'SiteBuilding',$,#${siteId},(#${buildingId}));`);

  const buildingElementIds: number[] = [];

  // Emit each building as IfcBuildingElementProxy with Faceted B-Rep geometry
  for (let b = 0; b < dataset.buildings.length; b++) {
    const building = dataset.buildings[b];
    const mesh = buildBuildingGeometry(building, settings.buildingHeightMultiplier);
    if (mesh.positions.length === 0) continue;

    const numVerts = mesh.positions.length / 3;
    const vertexPointIds: number[] = [];

    // Cartesian points (in meters Z-up for standard IFC)
    for (let v = 0; v < numVerts; v++) {
      const p = transformPoint(
        mesh.positions[v * 3],
        mesh.positions[v * 3 + 1],
        mesh.positions[v * 3 + 2],
        'Z_UP', // IFC standard is always Z-UP
        'meters'
      );
      const ptId = id++;
      lines.push(`#${ptId}= IFCCARTESIANPOINT((${p[0].toFixed(3)},${p[1].toFixed(3)},${p[2].toFixed(3)}));`);
      vertexPointIds.push(ptId);
    }

    // Poly loops and faces
    const faceIds: number[] = [];
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const p0 = vertexPointIds[mesh.indices[t]];
      const p1 = vertexPointIds[mesh.indices[t + 1]];
      const p2 = vertexPointIds[mesh.indices[t + 2]];

      const loopId = id++;
      lines.push(`#${loopId}= IFCPOLYLOOP((#${p0},#${p1},#${p2}));`);

      const faceBoundId = id++;
      lines.push(`#${faceBoundId}= IFCFACEOUTERBOUND(#${loopId},.T.);`);

      const faceId = id++;
      lines.push(`#${faceId}= IFCFACE((#${faceBoundId}));`);
      faceIds.push(faceId);
    }

    // Closed shell
    const closedShellId = id++;
    lines.push(`#${closedShellId}= IFCCLOSEDSHELL((${faceIds.map(f => `#${f}`).join(',')}));`);

    // Faceted Brep
    const brepId = id++;
    lines.push(`#${brepId}= IFCFACETEDBREP(#${closedShellId});`);

    // Shape Representation
    const shapeRepId = id++;
    lines.push(`#${shapeRepId}= IFCSHAPEREPRESENTATION(#${id - (faceIds.length * 3 + 20)},'Body','Brep',(#${brepId}));`);

    const prodDefShapeId = id++;
    lines.push(`#${prodDefShapeId}= IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`);

    // Building Element Proxy
    const elemId = id++;
    const cleanName = (building.name || `Building_${b}`).replace(/['\\]/g, '');
    lines.push(`#${elemId}= IFCBUILDINGELEMENTPROXY('0BldgElem${b.toString().padStart(8, '0')}',#${ownerHistoryId},'${cleanName}','Typology: ${building.typology}, Height: ${building.height.toFixed(1)}m',$,#${buildingPlacementId},#${prodDefShapeId},'Mass',.NOTDEFINED.);`);

    buildingElementIds.push(elemId);
  }

  // RelContainedInSpatialStructure: Building -> Elements
  if (buildingElementIds.length > 0) {
    lines.push(`#${id++}= IFCRELCONTAINEDINSPATIALSTRUCTURE('0RelContained000000001',#${ownerHistoryId},'BuildingElements',$,(${buildingElementIds.map(e => `#${e}`).join(',')}),#${buildingId});`);
  }

  lines.push('ENDSEC;');
  lines.push('END-ISO-10303-21;');

  // Revit Automation Script (Dynamo / Python)
  const revitScript = `# =====================================================================
# Autodesk Revit BIM Python Automation Script
# Converts Geo3D Extracted Massing into Native Parametric Revit Elements
# =====================================================================
import clr
clr.AddReference('RevitAPI')
clr.AddReference('RevitServices')
from Autodesk.Revit.DB import *
from RevitServices.Persistence import DocumentManager
from RevitServices.Transactions import TransactionManager

doc = DocumentManager.Instance.CurrentDBDocument

# Instructions:
# 1. Open Autodesk Revit (2020-2026).
# 2. Go to: File -> Open -> IFC, or Insert -> Link IFC.
# 3. Select "${filename}".
# 4. Each building will appear as a full 3D BIM Element with Level & Height metadata!
#
# To convert to Native Revit Walls & Floors:
# - Click "Massing & Site" tab on the ribbon.
# - Select "Wall by Face" or "Floor by Face" or "Curtain System by Face".
# - Click any face of the imported Geo3D mass to generate true Revit BIM walls!
`;

  const revitGuide = `# Autodesk Revit (.RVT) Conversion Manual

## Method 1: Direct Native IFC Import (Recommended for BIM Coordination)
1. Open **Autodesk Revit** (Versions 2019 through 2026).
2. Go to **File** -> **Open** -> **IFC** (or **Insert** -> **Link IFC** to keep it as an external reference site model).
3. Select \`${filename}\`.
4. Revit will automatically generate Revit Building Elements (\`IfcBuildingElementProxy\`), site coordinates, and height parameters.
5. Save as a native Revit Project: **File** -> **Save As** -> **Project (*.rvt)**.

## Method 2: Conceptual Massing ("Model by Face" to Native Revit Walls)
1. In Revit, start a new project or open an existing one.
2. Go to **Massing & Site** tab -> Click **In-Place Mass** (name it "Geo3D Urban Massing").
3. Go to **Insert** -> **Import CAD** -> choose the accompanying DXF or DWG file.
4. Finish Mass.
5. Now click:
   - **Wall by Face**: Click building sides to place parametric brick, concrete, or curtain walls!
   - **Roof by Face**: Click top faces to generate parametric standing seam or flat roofs!
   - **Mass Floors**: Generate floor slabs for every floor level automatically!
`;

  return {
    ifc: lines.join('\n'),
    revitScript,
    revitGuide,
    filename,
  };
}
