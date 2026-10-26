import React, { useState } from 'react';
import {
  Archive,
  ArrowRight,
  Box,
  Check,
  Code,
  Compass,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Layers,
  Settings2,
  X,
} from 'lucide-react';
import { exportToDXF } from '../services/exporters/dxfExporter';
import { exportToFBX } from '../services/exporters/fbxExporter';
import { exportToGLTF } from '../services/exporters/gltfExporter';
import { exportToOBJ } from '../services/exporters/objExporter';
import { exportToRVTWorkflow } from '../services/exporters/rvtExporter';
import { exportToSKPWorkflow } from '../services/exporters/skpExporter';
import { exportToSTL } from '../services/exporters/stlExporter';
import { exportToZIPBundle } from '../services/exporters/zipBundleExporter';
import { useTranslation } from '../services/i18n';
import {
  ExportFormat,
  ExportGrouping,
  ExportLOD,
  ExportSettings,
  ExportUnits,
  ExportUpAxis,
  UrbanDataset,
} from '../types';

interface ExportModalProps {
  dataset: UrbanDataset | null;
  isOpen: boolean;
  onClose: () => void;
  heightMultiplier: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  dataset,
  isOpen,
  onClose,
  heightMultiplier,
}) => {
  const { t, language } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('OBJ');
  const [upAxis, setUpAxis] = useState<ExportUpAxis>('Z_UP');
  const [units, setUnits] = useState<ExportUnits>('meters');
  const [grouping, setGrouping] = useState<ExportGrouping>('by_building');
  const [lod, setLod] = useState<ExportLOD>('LOD2');
  const [includeRoads, setIncludeRoads] = useState(true);
  const [includeWater, setIncludeWater] = useState(true);
  const [includeTerrain, setIncludeTerrain] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);

  if (!isOpen || !dataset) return null;

  const formatsList: {
    id: ExportFormat;
    name: string;
    ext: string;
    badge: string;
    description: string;
    idealFor: string;
  }[] = [
    {
      id: 'OBJ',
      name: 'Wavefront OBJ',
      ext: '.obj + .mtl',
      badge: 'Universal 3D',
      description: 'Clean polygonal geometry with material definitions, vertex normals, and UV texture mapping.',
      idealFor: 'Blender, 3ds Max, Maya, Rhino, Cinema 4D',
    },
    {
      id: 'FBX',
      name: 'Autodesk FBX',
      ext: '.fbx',
      badge: 'Autodesk Standard',
      description: 'Standard FBX 7.4 ASCII format preserving hierarchical node structure, materials, and scene scale.',
      idealFor: 'Autodesk Maya, 3ds Max, Unreal Engine, Unity',
    },
    {
      id: 'RVT',
      name: 'Revit BIM & IFC',
      ext: '.ifc + .rvt guide',
      badge: 'Architecture & BIM',
      description: 'IFC 2x3 BIM file with site coordinates, levels, and Massing & Site conversion workflow for native Revit walls.',
      idealFor: 'Autodesk Revit 2019-2026, Archicad, Vectorworks',
    },
    {
      id: 'SKP',
      name: 'Trimble SketchUp',
      ext: '.dae + .rb script',
      badge: 'Native Components',
      description: 'Native Collada component interchange format + automated SketchUp Ruby batch importer.',
      idealFor: 'SketchUp Pro / Make / Studio (all versions)',
    },
    {
      id: 'DXF',
      name: 'AutoCAD DXF',
      ext: '.dxf',
      badge: 'CAD Polygons',
      description: 'AutoCAD Release 12/2000 compliant 3DFACE meshes & footprint polylines stratified into height layers.',
      idealFor: 'AutoCAD, Civil 3D, Rhino, SolidWorks, MicroStation',
    },
    {
      id: 'STL',
      name: '3D Printable STL',
      ext: '.stl',
      badge: 'Rapid Prototyping',
      description: 'Closed manifold triangular facet mesh formatted for scale model architectural 3D printing.',
      idealFor: 'Bambu Studio, PrusaSlicer, Cura, Formlabs PreForm',
    },
    {
      id: 'GLTF',
      name: 'glTF 2.0 / GLB',
      ext: '.gltf',
      badge: 'Web & Cesium',
      description: 'Transmission-format 3D standard for WebGL, Cesium 3D Tiles, Three.js, and VisionOS.',
      idealFor: 'Cesium, Three.js, Web 3D, Apple Vision Pro',
    },
    {
      id: 'ZIP_BUNDLE',
      name: 'Master CAD/BIM ZIP',
      ext: '.zip',
      badge: 'All-in-One Package',
      description: 'Complete multi-format archive containing OBJ, FBX, DXF, SKP, IFC, STL, glTF, and Readmes.',
      idealFor: 'Design firms, multi-software pipelines, client deliverables',
    },
  ];

  // Trigger file download helper
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportedFilename(null);

    const settings: ExportSettings = {
      format,
      upAxis,
      units,
      grouping,
      lod,
      includeTerrain,
      includeRoads,
      includeWater,
      includeMetadata: true,
      buildingHeightMultiplier: heightMultiplier,
    };

    try {
      if (format === 'OBJ') {
        const res = exportToOBJ(dataset, settings);
        // Download OBJ
        const objBlob = new Blob([res.obj], { type: 'text/plain;charset=utf-8' });
        triggerDownload(objBlob, res.filename);
        // Download MTL
        const mtlBlob = new Blob([res.mtl], { type: 'text/plain;charset=utf-8' });
        triggerDownload(mtlBlob, res.filename.replace('.obj', '.mtl'));
        setExportedFilename(res.filename);
      } else if (format === 'FBX') {
        const res = exportToFBX(dataset, settings);
        const blob = new Blob([res.fbx], { type: 'text/plain;charset=utf-8' });
        triggerDownload(blob, res.filename);
        setExportedFilename(res.filename);
      } else if (format === 'DXF') {
        const res = exportToDXF(dataset, settings);
        const blob = new Blob([res.dxf], { type: 'application/dxf;charset=utf-8' });
        triggerDownload(blob, res.filename);
        setExportedFilename(res.filename);
      } else if (format === 'SKP') {
        const res = exportToSKPWorkflow(dataset, settings);
        const blob = new Blob([res.dae], { type: 'application/xml;charset=utf-8' });
        triggerDownload(blob, res.filename);
        const scriptBlob = new Blob([res.rubyScript], { type: 'text/plain;charset=utf-8' });
        triggerDownload(scriptBlob, 'import_to_skp.rb');
        setExportedFilename(res.filename);
      } else if (format === 'RVT') {
        const res = exportToRVTWorkflow(dataset, settings);
        const blob = new Blob([res.ifc], { type: 'text/plain;charset=utf-8' });
        triggerDownload(blob, res.filename);
        const guideBlob = new Blob([res.revitGuide], { type: 'text/markdown;charset=utf-8' });
        triggerDownload(guideBlob, 'REVIT_BIM_IMPORT_GUIDE.md');
        setExportedFilename(res.filename);
      } else if (format === 'STL') {
        const res = exportToSTL(dataset, settings);
        const blob = new Blob([res.stl], { type: 'text/plain;charset=utf-8' });
        triggerDownload(blob, res.filename);
        setExportedFilename(res.filename);
      } else if (format === 'GLTF') {
        const res = exportToGLTF(dataset, settings);
        const blob = new Blob([res.gltf], { type: 'application/json;charset=utf-8' });
        triggerDownload(blob, res.filename);
        setExportedFilename(res.filename);
      } else if (format === 'ZIP_BUNDLE') {
        const res = await exportToZIPBundle(dataset, settings);
        triggerDownload(res.blob, res.filename);
        setExportedFilename(res.filename);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatObj = formatsList.find(f => f.id === format);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-850 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-950/80 border border-red-800/80 text-red-400 shadow-md shadow-red-950">
              <Download className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">
                {language === 'fr' ? 'Exportation de géométrie 3D urbaine' : 'Export 3D Urban Geometry'}
              </h2>
              <p className="text-xs text-neutral-400">
                {dataset.name} • {dataset.buildings.length} {t.statBuildings.toLowerCase()} • {language === 'fr' ? 'Coordonnées métriques' : 'Metric Coordinates'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Formats, Right Settings */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Format selection column */}
          <div className="md:col-span-7 p-5 border-b md:border-b-0 md:border-r border-neutral-850 space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-2">
              {t.exportSelectFormat}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formatsList.map(item => (
                <button
                  key={item.id}
                  onClick={() => setFormat(item.id)}
                  className={`text-left p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    format === item.id
                      ? 'bg-red-950/60 border-red-500 shadow-lg shadow-red-950/40'
                      : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-neutral-100">{item.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          format === item.id
                            ? 'bg-red-600 text-white font-bold'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {item.ext}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-neutral-850 text-[10px] text-neutral-500 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{item.idealFor}</span>
                    {format === item.id && <Check className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right column: CAD & Coordinate Configuration */}
          <div className="md:col-span-5 p-5 space-y-4 bg-black/60">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block">
              {language === 'fr' ? 'Paramètres CAD & Coordonnées' : 'CAD & Coordinate Standards'}
            </span>

            {/* Up Axis */}
            <div>
              <label className="text-xs text-neutral-300 font-medium block mb-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-red-500" />
                <span>{t.exportUpAxis}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUpAxis('Z_UP')}
                  className={`px-3 py-2 rounded-lg text-xs font-mono transition text-center cursor-pointer border ${
                    upAxis === 'Z_UP'
                      ? 'bg-red-950 border-red-500 text-red-300 font-bold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {language === 'fr' ? 'Z haut (AutoCAD/Revit)' : 'Z-Up (AutoCAD/Revit)'}
                </button>
                <button
                  type="button"
                  onClick={() => setUpAxis('Y_UP')}
                  className={`px-3 py-2 rounded-lg text-xs font-mono transition text-center cursor-pointer border ${
                    upAxis === 'Y_UP'
                      ? 'bg-red-950 border-red-500 text-red-300 font-bold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {language === 'fr' ? 'Y haut (Maya/Unity)' : 'Y-Up (Maya/Unity)'}
                </button>
              </div>
            </div>

            {/* Units */}
            <div>
              <label className="text-xs text-neutral-300 font-medium block mb-1">
                {t.exportUnits}
              </label>
              <select
                value={units}
                onChange={e => setUnits(e.target.value as ExportUnits)}
                className="w-full bg-neutral-900 text-neutral-200 text-xs rounded-lg px-3 py-2 border border-neutral-800 outline-none cursor-pointer"
              >
                <option value="meters">{language === 'fr' ? 'Mètres (Standard BIM & Architecture)' : 'Meters (Standard Architectural Metric)'}</option>
                <option value="millimeters">{language === 'fr' ? 'Millimètres (Ingénierie CAD)' : 'Millimeters (Engineering CAD / Manufacturing)'}</option>
                <option value="feet">{language === 'fr' ? 'Pieds (Impérial)' : 'Feet (Imperial Architectural)'}</option>
                <option value="inches">{language === 'fr' ? 'Pouces (Impérial)' : 'Inches (Imperial Detail)'}</option>
              </select>
            </div>

            {/* Grouping */}
            <div>
              <label className="text-xs text-neutral-300 font-medium block mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-red-500" />
                <span>{t.exportGrouping}</span>
              </label>
              <select
                value={grouping}
                onChange={e => setGrouping(e.target.value as ExportGrouping)}
                className="w-full bg-neutral-900 text-neutral-200 text-xs rounded-lg px-3 py-2 border border-neutral-800 outline-none cursor-pointer"
              >
                <option value="by_building">{language === 'fr' ? 'Par bâtiment (Objets nommés individuels)' : 'By Building (Individual Named Meshes)'}</option>
                <option value="merged">{language === 'fr' ? 'Maillage fusionné unique (Moteurs de jeu)' : 'Single Merged Mesh (Fastest Viewport & Game Engine)'}</option>
                <option value="by_typology">{language === 'fr' ? 'Par typologie urbaine (Bureaux, Résidentiel, etc.)' : 'By Typology (Skyscraper, Office, Residential, Civic)'}</option>
              </select>
            </div>

            {/* Layers Toggle */}
            <div className="pt-2 border-t border-neutral-850 space-y-2">
              <span className="text-[11px] font-mono text-neutral-400 block mb-1">
                {t.exportLayersIncluded}
              </span>
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRoads}
                  onChange={e => setIncludeRoads(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                <span>{language === 'fr' ? 'Inclure le réseau routier & axes' : 'Include Roads & Street Alignments'}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWater}
                  onChange={e => setIncludeWater(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                <span>{language === 'fr' ? 'Inclure les plans d’eau & berges' : 'Include Water Features / Riverbanks'}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer with action */}
        <div className="px-6 py-4 border-t border-neutral-850 bg-black flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <span className="font-semibold text-neutral-200">{language === 'fr' ? 'Sélectionné :' : 'Selected:'}</span>
            <span className="font-mono text-red-400">
              {selectedFormatObj?.name} ({selectedFormatObj?.ext})
            </span>
            {exportedFilename && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {language === 'fr' ? 'Téléchargé' : 'Downloaded'} {exportedFilename}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
            >
              {language === 'fr' ? 'Fermer' : 'Cancel'}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs transition shadow-lg shadow-red-950/60 border border-red-500/40 flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? (language === 'fr' ? 'Génération...' : 'Generating Files...') : (language === 'fr' ? `Exporter ${format}` : `Export ${format}`)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
