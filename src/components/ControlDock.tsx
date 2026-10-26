import React, { useState } from 'react';
import {
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Ruler,
  Sun,
  Wand2,
} from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { CameraViewPreset, RenderMode } from '../types';

interface ControlDockProps {
  renderMode: RenderMode;
  onSelectRenderMode: (mode: RenderMode) => void;
  cameraPreset: CameraViewPreset;
  onSelectCameraPreset: (preset: CameraViewPreset) => void;
  solarTime: number;
  onChangeSolarTime: (time: number) => void;
  showRoads: boolean;
  onToggleRoads: () => void;
  showWater: boolean;
  onToggleWater: () => void;
  showWireframe: boolean;
  onToggleWireframe: () => void;
  heightMultiplier: number;
  onChangeHeightMultiplier: (val: number) => void;
  measureMode: boolean;
  onToggleMeasureMode: () => void;
  measuredDistance: number | null;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  renderMode,
  onSelectRenderMode,
  cameraPreset,
  onSelectCameraPreset,
  solarTime,
  onChangeSolarTime,
  showRoads,
  onToggleRoads,
  showWater,
  onToggleWater,
  showWireframe,
  onToggleWireframe,
  heightMultiplier,
  onChangeHeightMultiplier,
  measureMode,
  onToggleMeasureMode,
  measuredDistance,
}) => {
  const { t, language } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'shading' | 'camera' | 'solar' | 'layers'>('shading');

  const renderModes: { id: RenderMode; label: string }[] = [
    { id: 'clay', label: t.renderClay },
    { id: 'cad', label: t.renderCad },
    { id: 'heatmap', label: t.renderHeightmap },
    { id: 'textured', label: t.renderTextured },
    { id: 'typology', label: language === 'fr' ? 'Typologie' : 'Typology' },
    { id: 'night', label: language === 'fr' ? 'Nuit' : 'Night' },
  ];

  const cameraPresets: { id: CameraViewPreset; label: string }[] = [
    { id: 'perspective', label: t.camPerspective },
    { id: 'isometric', label: t.camIsometric },
    { id: 'top', label: t.camTop },
    { id: 'front', label: t.camFront },
    { id: 'side', label: t.camSide },
  ];

  return (
    <div
      className={`fixed z-[1050] transition-all duration-300 ease-out left-1/2 -translate-x-1/2 ${
        isCollapsed ? 'bottom-2' : 'bottom-5'
      }`}
      style={{ maxWidth: 'min(920px, 94vw)', width: '100%' }}
    >
      {/* Collapse / Expand Toggle Button on top edge */}
      <div className="flex justify-center -mb-2 relative z-30">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-3 py-1 rounded-t-lg bg-black border-t border-x border-neutral-800 text-[11px] font-mono text-neutral-300 hover:text-red-400 flex items-center gap-1.5 shadow-2xl backdrop-blur cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-red-500" />
              <span>{language === 'fr' ? 'Afficher les contrôles CAD' : 'Show CAD Controls'}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              <span>{language === 'fr' ? 'Masquer (Vue Zen)' : 'Hide Dock (Zen View)'}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Unified Horizontal Control Dock */}
      {!isCollapsed && (
        <div className="bg-black/95 border border-neutral-800 rounded-2xl shadow-2xl p-2.5 backdrop-blur-md">
          {/* Top category tabs */}
          <div className="flex items-center justify-between border-b border-neutral-850 pb-2 mb-2 px-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('shading')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'shading'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Rendu 3D' : 'Render Style'}</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Caméra' : 'Camera Views'}</span>
              </button>

              <button
                onClick={() => setActiveTab('solar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'solar'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Soleil & Ombre' : 'Sun & Shadow'}</span>
              </button>

              <button
                onClick={() => setActiveTab('layers')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'layers'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Calques' : 'Urban Layers'}</span>
              </button>
            </div>

            {/* Quick Measure Tool Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleMeasureMode}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  measureMode
                    ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>{measureMode ? (language === 'fr' ? 'Mesure active' : 'Measuring') : (language === 'fr' ? 'Mesurer 📐' : 'Measure 📐')}</span>
                {measuredDistance !== null && (
                  <span className="ml-1 bg-black/40 px-1 rounded text-[11px] text-red-400">
                    {measuredDistance.toFixed(1)}m
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Subpanel Content */}
          <div className="px-1 py-1">
            {activeTab === 'shading' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {renderModes.map(m => (
                  <button
                    key={m.id}
                    onClick={() => onSelectRenderMode(m.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      renderMode === m.id
                        ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                        : 'bg-neutral-900/80 text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
                    }`}
                  >
                    <span className="font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="flex flex-wrap items-center gap-1.5">
                {cameraPresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => onSelectCameraPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                      cameraPreset === preset.id
                        ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'solar' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1">
                <div className="flex items-center gap-3 w-full sm:w-2/3">
                  <Sun className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs font-mono text-neutral-400 w-16">
                    {Math.floor(solarTime)}:
                    {Math.round((solarTime % 1) * 60)
                      .toString()
                      .padStart(2, '0')}{' '}
                    {solarTime >= 12 ? 'PM' : 'AM'}
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={0.25}
                    value={solarTime}
                    onChange={e => onChangeSolarTime(parseFloat(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                  <span className="text-[11px] text-neutral-500">{t.heightMultiplierLabel}:</span>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.1}
                    value={heightMultiplier}
                    onChange={e => onChangeHeightMultiplier(parseFloat(e.target.value))}
                    className="w-24 accent-red-600 cursor-pointer"
                  />
                  <span className="text-red-400">{heightMultiplier.toFixed(1)}x</span>
                </div>
              </div>
            )}

            {activeTab === 'layers' && (
              <div className="flex flex-wrap items-center gap-3 px-2 py-1">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWireframe}
                    onChange={onToggleWireframe}
                    className="accent-red-600 rounded"
                  />
                  <span>{language === 'fr' ? 'Arêtes CAD / Filaire' : 'CAD Edges / Wireframe'}</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRoads}
                    onChange={onToggleRoads}
                    className="accent-red-600 rounded"
                  />
                  <span>{language === 'fr' ? 'Réseau routier' : 'Street Grid Lines'}</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWater}
                    onChange={onToggleWater}
                    className="accent-red-600 rounded"
                  />
                  <span>{language === 'fr' ? 'Plans d’eau & Fleuves' : 'Water Features / Rivers'}</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
