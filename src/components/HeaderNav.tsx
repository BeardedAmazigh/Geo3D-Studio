import React, { useState } from 'react';
import {
  Box,
  Building2,
  Compass,
  Download,
  Globe2,
  Languages,
  Layers,
  Lock,
  Map,
  MapPin,
  RefreshCw,
  Search,
  Sliders,
  Upload,
} from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { PRESET_DATASETS } from '../services/presetCities';
import { UrbanDataset } from '../types';

interface HeaderNavProps {
  currentDataset: UrbanDataset | null;
  hasGenerated3DData: boolean;
  activeView: '3d' | 'map';
  onChangeView: (view: '3d' | 'map') => void;
  onSelectPreset: (key: string) => void;
  onSearchAndExtract: (query: string, radius: number) => Promise<void>;
  onFileUpload: (file: File) => void;
  onOpenExportModal: () => void;
  onOpenEarthBridge: () => void;
  isLoading: boolean;
  statusMessage: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentDataset,
  hasGenerated3DData,
  activeView,
  onChangeView,
  onSelectPreset,
  onSearchAndExtract,
  onFileUpload,
  onOpenExportModal,
  onOpenEarthBridge,
  isLoading,
  statusMessage,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(450);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchAndExtract(searchQuery.trim(), radiusMeters);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-[1100] flex flex-col md:flex-row items-center justify-between px-4 py-2.5 bg-black/95 backdrop-blur-md border-b border-neutral-900 shadow-2xl gap-2 md:gap-4">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-700 via-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-900/40 text-white font-black text-sm border border-red-500/40">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm md:text-base text-neutral-100 tracking-tight">
              {t.appTitle}
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider rounded bg-red-950/80 text-red-400 border border-red-800/60">
              {t.cadBimBadge}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 font-normal truncate max-w-xs md:max-w-md">
            {t.appSubtitle}
          </p>
        </div>
      </div>

      {/* Primary View Switcher:
          1. "Draw Zone on Map 🗺️" / "Tracer la zone sur la carte 🗺️" (Left)
          2. "3D Viewport" / "Fenêtre 3D" (Right - only clickable when 3D data has been generated!) */}
      <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1 shadow-inner gap-1 flex-shrink-0">
        {/* Draw Zone on Map Button (Left) */}
        <button
          onClick={() => onChangeView('map')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
            activeView === 'map'
              ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Map className="w-3.5 h-3.5 text-red-400" />
          <span>{t.drawZoneMap}</span>
        </button>

        {/* 3D Viewport Button (To the right of "Draw Zone on Map") - only clickable after generation! */}
        <button
          onClick={() => {
            if (hasGenerated3DData) {
              onChangeView('3d');
            }
          }}
          disabled={!hasGenerated3DData}
          title={hasGenerated3DData ? t.viewport3D : t.empty3DTitle}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            !hasGenerated3DData
              ? 'opacity-40 text-neutral-500 cursor-not-allowed border border-dashed border-neutral-800'
              : activeView === '3d'
              ? 'bg-red-600 text-white shadow-md shadow-red-900/50 cursor-pointer'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer border border-red-950'
          }`}
        >
          {hasGenerated3DData ? (
            <Box className="w-3.5 h-3.5 text-white" />
          ) : (
            <Lock className="w-3 h-3 text-neutral-600" />
          )}
          <span>{t.viewport3D}</span>
          {hasGenerated3DData && currentDataset && (
            <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-red-300">
              {currentDataset.buildings.length} {t.statBuildings.toLowerCase()}
            </span>
          )}
          {!hasGenerated3DData && (
            <span className="text-[9px] font-mono text-neutral-600 uppercase">
              {t.viewportEmpty}
            </span>
          )}
        </button>
      </div>

      {/* Center Search & Extraction Bar (Active when in 3D view) */}
      {activeView === '3d' && (
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center flex-1 max-w-md bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1 shadow-inner focus-within:border-red-500 transition-colors"
        >
          <Search className="w-4 h-4 text-neutral-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="bg-transparent text-xs text-neutral-200 placeholder-neutral-500 outline-none w-full"
          />

          {/* Radius selector */}
          <div className="flex items-center gap-1 pl-2 border-l border-neutral-800 text-[11px] text-neutral-400 font-mono flex-shrink-0">
            <Sliders className="w-3 h-3 text-neutral-500" />
            <select
              value={radiusMeters}
              onChange={e => setRadiusMeters(Number(e.target.value))}
              className="bg-black text-neutral-300 rounded px-1.5 py-0.5 outline-none border border-neutral-800 cursor-pointer"
            >
              <option value={250}>250m</option>
              <option value={450}>450m</option>
              <option value={750}>750m</option>
              <option value={1200}>1.2km</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="ml-2 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-md shadow-red-950/30 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe2 className="w-3.5 h-3.5" />
            )}
            <span>{isLoading ? t.extractingBtn : t.searchExtractBtn}</span>
          </button>
        </form>
      )}

      {/* Right Controls: Language Switcher, Presets, Earth Bridge, and Export */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Language Switcher: French (default) and English */}
        <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => setLanguage('fr')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
              language === 'fr'
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Français (Langue par défaut)"
          >
            <span>FR</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
              language === 'en'
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="English"
          >
            <span>EN</span>
          </button>
        </div>

        {/* Preset Metropolises Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">{t.citiesMenuBtn}</span>
            <span className="text-[10px] text-neutral-500">▾</span>
          </button>

          {showPresetsMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-neutral-950 border border-neutral-800 shadow-2xl p-1 z-[1200] backdrop-blur-lg">
              <div className="px-2 py-1.5 text-[10px] uppercase font-mono tracking-wider text-neutral-400 border-b border-neutral-900">
                {t.citiesMenuTitle}
              </div>
              {Object.entries(PRESET_DATASETS).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => {
                    onSelectPreset(key);
                    setShowPresetsMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between ${
                    currentDataset?.id === data.id
                      ? 'bg-red-950/80 text-red-300 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-900'
                  }`}
                >
                  <span className="truncate">{data.name.split('-')[0].trim()}</span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {data.buildings.length} {t.statBuildings.toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Google Earth / Cesium Bridge info button */}
        <button
          onClick={onOpenEarthBridge}
          title="Google Earth &amp; Cesium 3D Tiles Guide"
          className="px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
        >
          <Globe2 className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden lg:inline">{t.earth3DBtn}</span>
        </button>

        {/* Upload Custom GeoJSON */}
        <label
          title="Upload GeoJSON or 3D Footprints"
          className="px-2.5 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden xl:inline">{t.uploadBtn}</span>
          <input
            type="file"
            accept=".geojson,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Primary Export Trigger Button */}
        <button
          onClick={() => {
            if (hasGenerated3DData) {
              onOpenExportModal();
            } else {
              alert(
                language === 'fr'
                  ? 'Veuillez d’abord sélectionner et extraire une zone sur la carte avant d’exporter !'
                  : 'Please select and extract a zone on the map first before exporting!'
              );
            }
          }}
          disabled={!hasGenerated3DData}
          className={`px-3.5 py-1.5 rounded-lg text-white font-semibold text-xs transition shadow-lg flex items-center gap-2 border ${
            hasGenerated3DData
              ? 'bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-red-950/60 border-red-500/50 cursor-pointer'
              : 'opacity-40 bg-neutral-900 border-neutral-800 cursor-not-allowed text-neutral-500'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{t.exportBtn}</span>
        </button>
      </div>

      {/* Progress / Status banner if loading */}
      {isLoading && statusMessage && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-black border border-red-600/70 text-red-400 text-xs font-mono flex items-center gap-2 shadow-2xl z-[1200]">
          <RefreshCw className="w-3 h-3 animate-spin text-red-500" />
          <span>{statusMessage}</span>
        </div>
      )}
    </header>
  );
};
