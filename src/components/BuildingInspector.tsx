import React from 'react';
import {
  Building2,
  Compass,
  Crosshair,
  ExternalLink,
  Layers,
  Ruler,
  Tag,
  X,
} from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { Building3D } from '../types';
import { TYPOLOGY_COLORS } from '../services/geometryBuilder';

interface BuildingInspectorProps {
  building: Building3D | null;
  onClose: () => void;
  onCenterCamera?: (building: Building3D) => void;
}

export const BuildingInspector: React.FC<BuildingInspectorProps> = ({
  building,
  onClose,
  onCenterCamera,
}) => {
  const { t, language } = useTranslation();
  if (!building) return null;

  const heightFt = (building.height * 3.28084).toFixed(1);
  const areaSqFt = (building.areaMeters2 * 10.7639).toFixed(0);
  const color = TYPOLOGY_COLORS[building.typology] || '#ef4444';

  return (
    <div className="absolute top-18 left-4 z-[1050] w-80 bg-black/95 border border-neutral-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-850 flex items-start justify-between bg-neutral-950">
        <div className="flex items-start gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold shadow-md shadow-red-950"
            style={{ backgroundColor: color }}
          >
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-xs text-neutral-100 truncate">
              {building.name || `${language === 'fr' ? 'Bâtiment' : 'Building'} ${building.id}`}
            </h3>
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded font-medium bg-red-950/80 text-red-400 border border-red-900/60">
              {building.typology}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-850 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="p-3.5 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 block font-mono">{t.inspectorTotalHeight}</span>
            <div className="text-sm font-bold text-red-400 font-mono mt-0.5">
              {building.height.toFixed(1)}m
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">~{heightFt} ft</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 block font-mono">{t.inspectorLevels}</span>
            <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
              {building.levels} {language === 'fr' ? 'étages' : 'Storeys'}
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">~3.5m {language === 'fr' ? '/ niveau' : 'per floor'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-neutral-900/50 border border-neutral-850">
            <span className="text-[10px] text-neutral-400 font-mono block">{t.inspectorFootprintArea}</span>
            <span className="text-xs font-semibold text-neutral-200 font-mono">
              {Math.round(building.areaMeters2).toLocaleString()} m²
            </span>
            <span className="text-[10px] text-neutral-500 font-mono block">
              {parseInt(areaSqFt).toLocaleString()} sq ft
            </span>
          </div>

          <div className="p-2 rounded-lg bg-neutral-900/50 border border-neutral-850">
            <span className="text-[10px] text-neutral-400 font-mono block">{t.inspectorRoofShape}</span>
            <span className="text-xs font-semibold text-red-400 font-mono capitalize">
              {building.roofShape}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono block">
              {building.roofHeight > 0 ? `+${building.roofHeight.toFixed(1)}m apex` : (language === 'fr' ? 'Toit plat' : 'Flat slab')}
            </span>
          </div>
        </div>

        {building.address && (
          <div className="text-[11px] text-neutral-300 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center gap-1.5">
            <span className="text-red-500">📍</span>
            <span className="truncate">{building.address}</span>
          </div>
        )}

        {/* Tags accordion / details */}
        {building.tags && Object.keys(building.tags).length > 0 && (
          <div className="border-t border-neutral-850 pt-2">
            <span className="text-[10px] font-mono text-neutral-400 block mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-red-500" />
              <span>Geospatial Tags ({Object.keys(building.tags).length})</span>
            </span>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
              {Object.entries(building.tags).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between text-[10px] font-mono bg-black px-2 py-0.5 rounded border border-neutral-850"
                >
                  <span className="text-neutral-400 truncate max-w-[100px]">{k}</span>
                  <span className="text-red-400 truncate max-w-[130px]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        {onCenterCamera && (
          <button
            onClick={() => onCenterCamera(building)}
            className="w-full py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-medium text-xs transition flex items-center justify-center gap-1.5 border border-red-600/40 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-red-500" />
            <span>Focus Camera on Structure</span>
          </button>
        )}
      </div>
    </div>
  );
};
