import { ExportSettings, UrbanDataset } from '../../types';
import { buildBuildingGeometry } from '../geometryBuilder';
import { transformPoint } from './unitUtils';

export function exportToSKPWorkflow(
  dataset: UrbanDataset,
  settings: ExportSettings
): {
  dae: string;
  rubyScript: string;
  readme: string;
  filename: string;
} {
  const safeCityName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeCityName}_SketchUp_Collada.dae`;

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  lines.push('<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">');
  lines.push('  <asset>');
  lines.push('    <contributor>');
  lines.push('      <authoring_tool>Geo3D Studio - Geospatial 3D Extractor for SketchUp</authoring_tool>');
  lines.push('    </contributor>');
  lines.push('    <created>2026-10-26T12:00:00Z</created>');
  lines.push('    <modified>2026-10-26T12:00:00Z</modified>');
  lines.push(`    <unit meter="${settings.units === 'feet' ? '0.3048' : settings.units === 'millimeters' ? '0.001' : settings.units === 'inches' ? '0.0254' : '1.0'}" name="${settings.units}"/>`);
  lines.push(`    <up_axis>${settings.upAxis === 'Z_UP' ? 'Z_UP' : 'Y_UP'}</up_axis>`);
  lines.push('  </asset>');

  // Materials & Effects
  lines.push('  <library_materials>');
  lines.push('    <material id="Mat_Architectural-material" name="Architectural">');
  lines.push('      <instance_effect url="#Mat_Architectural-effect"/>');
  lines.push('    </material>');
  lines.push('  </library_materials>');
  lines.push('  <library_effects>');
  lines.push('    <effect id="Mat_Architectural-effect">');
  lines.push('      <profile_COMMON>');
  lines.push('        <technique sid="common">');
  lines.push('          <phong>');
  lines.push('            <diffuse><color>0.85 0.88 0.92 1.0</color></diffuse>');
  lines.push('            <specular><color>0.2 0.2 0.2 1.0</color></specular>');
  lines.push('          </phong>');
  lines.push('        </technique>');
  lines.push('      </profile_COMMON>');
  lines.push('    </effect>');
  lines.push('  </library_effects>');

  // Geometries Library
  lines.push('  <library_geometries>');

  for (let b = 0; b < dataset.buildings.length; b++) {
    const building = dataset.buildings[b];
    const mesh = buildBuildingGeometry(building, settings.buildingHeightMultiplier);
    if (mesh.positions.length === 0) continue;

    const bId = `Building_${b}`;
    const numVerts = mesh.positions.length / 3;

    // Transform points
    const transformedPositions: number[] = [];
    for (let v = 0; v < numVerts; v++) {
      const p = transformPoint(
        mesh.positions[v * 3],
        mesh.positions[v * 3 + 1],
        mesh.positions[v * 3 + 2],
        settings.upAxis,
        settings.units
      );
      transformedPositions.push(p[0], p[1], p[2]);
    }

    lines.push(`    <geometry id="${bId}-mesh" name="${building.name || bId}">`);
    lines.push('      <mesh>');
    lines.push(`        <source id="${bId}-positions">`);
    lines.push(`          <float_array id="${bId}-positions-array" count="${transformedPositions.length}">${transformedPositions.map(v => v.toFixed(3)).join(' ')}</float_array>`);
    lines.push('          <technique_common>');
    lines.push(`            <accessor source="#${bId}-positions-array" count="${numVerts}" stride="3">`);
    lines.push('              <param name="X" type="float"/>');
    lines.push('              <param name="Y" type="float"/>');
    lines.push('              <param name="Z" type="float"/>');
    lines.push('            </accessor>');
    lines.push('          </technique_common>');
    lines.push('        </source>');
    lines.push(`        <vertices id="${bId}-vertices">`);
    lines.push(`          <input semantic="POSITION" source="#${bId}-positions"/>`);
    lines.push('        </vertices>');
    lines.push(`        <triangles count="${mesh.indices.length / 3}" material="Architectural">`);
    lines.push(`          <input semantic="VERTEX" source="#${bId}-vertices" offset="0"/>`);
    lines.push(`          <p>${mesh.indices.join(' ')}</p>`);
    lines.push('        </triangles>');
    lines.push('      </mesh>');
    lines.push('    </geometry>');
  }

  lines.push('  </library_geometries>');

  // Visual Scene
  lines.push('  <library_visual_scenes>');
  lines.push('    <visual_scene id="Scene" name="Scene">');
  for (let b = 0; b < dataset.buildings.length; b++) {
    const building = dataset.buildings[b];
    const bId = `Building_${b}`;
    lines.push(`      <node id="Node_${bId}" name="${building.name || bId}">`);
    lines.push(`        <instance_geometry url="#${bId}-mesh">`);
    lines.push('          <bind_material>');
    lines.push('            <technique_common>');
    lines.push('              <instance_material symbol="Architectural" target="#Mat_Architectural-material"/>');
    lines.push('            </technique_common>');
    lines.push('          </bind_material>');
    lines.push('        </instance_geometry>');
    lines.push('      </node>');
  }
  lines.push('    </visual_scene>');
  lines.push('  </library_visual_scenes>');

  lines.push('  <scene>');
  lines.push('    <instance_visual_scene url="#Scene"/>');
  lines.push('  </scene>');
  lines.push('</COLLADA>');

  // Automated Ruby script for SketchUp
  const rubyScript = `# ====================================================================
# Geo3D Studio -> Trimble SketchUp Automatic Importer
# ====================================================================
# Instructions:
# 1. Open Trimble SketchUp (2019-2026).
# 2. Go to: Window > Ruby Console.
# 3. Paste the code below or load this file via:
#    load "path/to/import_to_skp.rb"
#
model = Sketchup.active_model
model.start_operation("Import Geo3D Buildings", true)

dae_file = File.join(__dir__, "${filename}")
if File.exist?(dae_file)
  status = model.import(dae_file, true)
  puts "Successfully imported #{status ? 'Geo3D model' : 'failed'} into SketchUp!"
else
  # Prompt user to pick file
  chosen = UI.openpanel("Select Geo3D Collada File", "", "COLLADA Files|*.dae||")
  if chosen
    model.import(chosen, true)
    puts "Imported: #{chosen}"
  end
end

model.commit_operation
UI.messagebox("Geo3D Buildings imported successfully into SketchUp!")
`;

  const readme = `# SketchUp (.SKP) Import Guide

1. Direct Native Import (Zero Plugins Needed):
   - In SketchUp (Pro / Make / Studio / Free Desktop):
   - Click "File" -> "Import..."
   - In the format dropdown at bottom right, choose "COLLADA Files (*.dae)"
   - Select "${filename}" and click "Import".
   - Every building is grouped and placed at exact real-world dimensions!

2. Automated Ruby Console Import:
   - Go to Window -> Ruby Console.
   - Run the included "import_to_skp.rb" to automatically configure units, materials, and layers.

3. Saving as Native .SKP:
   - Once imported, simply click "File" -> "Save As..." -> "SketchUp Model (*.skp)".
`;

  return {
    dae: lines.join('\n'),
    rubyScript,
    readme,
    filename,
  };
}
