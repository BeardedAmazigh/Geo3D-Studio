import React, { useState } from 'react';
import { BuildingInspector } from './components/BuildingInspector';
import { ControlDock } from './components/ControlDock';
import { ExportModal } from './components/ExportModal';
import {
  ExtractionProgressModal,
  ExtractionProgressState,
} from './components/ExtractionProgressModal';
import { GoogleEarthBridgeModal } from './components/GoogleEarthBridgeModal';
import { HeaderNav } from './components/HeaderNav';
import {
  InteractiveMapZoneSelector,
  PARIS_DEFAULT_CENTER,
  PARIS_DEFAULT_RADIUS,
  SelectedZone,
} from './components/InteractiveMapZoneSelector';
import { Viewport3D } from './components/Viewport3D';
import { fetchLiveOSM3DData, searchLocation } from './services/overpassService';
import { PRESET_DATASETS } from './services/presetCities';
import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculatePolygonPerimeter,
  geoToMetric,
} from './services/projection';
import { Building3D, CameraViewPreset, RenderMode, UrbanDataset } from './types';
import { Box, Layers, Map, MapPin, Sparkles } from 'lucide-react';
import { LanguageProvider, useTranslation } from './services/i18n';

function AppContent() {
  const { t, language } = useTranslation();
  const [activeView, setActiveView] = useState<'3d' | 'map'>('map'); // Map View is the standard default view
  // No default model is loaded initially: viewport starts clean so user exports their chosen extracted zone
  const [currentDataset, setCurrentDataset] = useState<UrbanDataset | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('clay');
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('perspective');
  const [solarTime, setSolarTime] = useState<number>(14.5); // 2:30 PM
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [heightMultiplier, setHeightMultiplier] = useState<number>(1.0);
  const [selectedBuilding, setSelectedBuilding] = useState<Building3D | null>(null);
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isEarthBridgeOpen, setIsEarthBridgeOpen] = useState<boolean>(false);

  // Discrete extraction progress tracking (0% to 100% with pipeline steps)
  const [progressState, setProgressState] = useState<ExtractionProgressState>({
    isOpen: false,
    percent: 0,
    currentStepIndex: 0,
    statusMessage: '',
    isComplete: false,
    error: null,
    datasetName: '',
    buildingsCount: 0,
  });

  const hasGenerated3DData = Boolean(
    currentDataset && currentDataset.buildings && currentDataset.buildings.length > 0
  );

  // Switch to a curated preset city
  const handleSelectPreset = (key: string) => {
    const data = PRESET_DATASETS[key];
    if (data) {
      setCurrentDataset(data);
      setSelectedBuilding(null);
      setMeasuredDistance(null);
      setActiveView('3d');
    }
  };

  // Search & live extract from OpenStreetMap / Earth database
  const handleSearchAndExtract = async (query: string, radiusMeters: number) => {
    setIsLoading(true);
    setStatusMessage('Searching geographic location coordinates...');

    setProgressState({
      isOpen: true,
      percent: 10,
      currentStepIndex: 0,
      statusMessage: `Locating coordinates for "${query}"...`,
      isComplete: false,
      error: null,
      datasetName: query,
      buildingsCount: 0,
    });

    try {
      let lat: number | null = null;
      let lon: number | null = null;
      let locationName = query;

      // Check if coordinates format: e.g. "40.7128, -74.0060"
      const coordMatch = query.match(/^([-+]?\d{1,2}(?:\.\d+)?)\s*,\s*([-+]?\d{1,3}(?:\.\d+)?)$/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lon = parseFloat(coordMatch[2]);
        locationName = `Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
      } else {
        // Geocode using Nominatim
        const results = await searchLocation(query);
        if (results.length > 0) {
          lat = results[0].lat;
          lon = results[0].lon;
          locationName = results[0].displayName.split(',')[0];
        } else {
          throw new Error(`Location "${query}" could not be found. Try typing a landmark or coordinates (lat, lon).`);
        }
      }

      if (lat !== null && lon !== null) {
        const dataset = await fetchLiveOSM3DData(
          lat,
          lon,
          radiusMeters,
          locationName,
          (status, percent, stepIndex, stats) => {
            setStatusMessage(status);
            setProgressState(prev => ({
              ...prev,
              statusMessage: status,
              percent,
              currentStepIndex: stepIndex,
              buildingsCount: stats?.buildingsCount ?? prev.buildingsCount,
            }));
          }
        );

        if (dataset.buildings.length === 0) {
          throw new Error('No 3D building footprints found in this radius. Try a larger radius or a denser urban core.');
        }

        setCurrentDataset(dataset);
        setSelectedBuilding(null);
        setMeasuredDistance(null);

        setProgressState(prev => ({
          ...prev,
          percent: 100,
          currentStepIndex: 4,
          isComplete: true,
          statusMessage: `Successfully synthesized ${dataset.buildings.length} 3D architectural buildings!`,
          buildingsCount: dataset.buildings.length,
          datasetName: dataset.name,
        }));
      }
    } catch (err: any) {
      console.warn('Live extraction failed, notifying user:', err);
      setProgressState(prev => ({
        ...prev,
        error: err.message || 'Geospatial extraction failed. Please try a different zone.',
        statusMessage: 'Extraction failed',
      }));
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Handle zone extraction from Map View (drawn circle or rectangle)
  const handleExtractZone = async (zone: SelectedZone) => {
    setIsLoading(true);
    setStatusMessage(`Extracting 3D building geometry for ${zone.name}...`);

    setProgressState({
      isOpen: true,
      percent: 10,
      currentStepIndex: 0,
      statusMessage: `Projecting geodetic boundaries for ${zone.name}...`,
      isComplete: false,
      error: null,
      datasetName: zone.name,
      buildingsCount: 0,
    });

    try {
      const dataset = await fetchLiveOSM3DData(
        zone.center[0],
        zone.center[1],
        zone.radiusMeters,
        zone.name,
        (status, percent, stepIndex, stats) => {
          setStatusMessage(status);
          setProgressState(prev => ({
            ...prev,
            statusMessage: status,
            percent,
            currentStepIndex: stepIndex,
            buildingsCount: stats?.buildingsCount ?? prev.buildingsCount,
          }));
        },
        zone.bbox
      );

      if (dataset.buildings.length === 0) {
        throw new Error('No 3D building footprints were found inside this drawn zone. Try expanding the circle/rectangle or choosing a denser area.');
      }

      setCurrentDataset(dataset);
      setSelectedBuilding(null);
      setMeasuredDistance(null);

      setProgressState(prev => ({
        ...prev,
        percent: 100,
        currentStepIndex: 4,
        isComplete: true,
        statusMessage: `Successfully reconstructed ${dataset.buildings.length} 3D buildings!`,
        buildingsCount: dataset.buildings.length,
        datasetName: dataset.name,
      }));
    } catch (err: any) {
      console.warn('Zone extraction error:', err);
      setProgressState(prev => ({
        ...prev,
        error: err.message || 'Extraction failed. Please expand the zone or check network connection.',
        statusMessage: 'Extraction failed',
      }));
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Parse uploaded GeoJSON file
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        if (!json.features || !Array.isArray(json.features)) {
          alert('Invalid GeoJSON: Expected a FeatureCollection with features array.');
          return;
        }

        let centerLat = 0;
        let centerLon = 0;
        let foundCenter = false;

        for (const f of json.features) {
          if (f.geometry && f.geometry.coordinates) {
            const coords =
              f.geometry.type === 'Polygon'
                ? f.geometry.coordinates[0]
                : f.geometry.type === 'MultiPolygon'
                ? f.geometry.coordinates[0][0]
                : null;
            if (coords && coords.length > 0) {
              centerLon = coords[0][0];
              centerLat = coords[0][1];
              foundCenter = true;
              break;
            }
          }
        }

        if (!foundCenter) {
          alert('Could not find polygon coordinates in uploaded GeoJSON.');
          return;
        }

        const buildings: Building3D[] = [];
        let idx = 0;

        for (const f of json.features) {
          idx++;
          const geom = f.geometry;
          if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

          const rawRing = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
          if (!rawRing || rawRing.length < 3) continue;

          const metricPts: [number, number][] = rawRing.map((pt: [number, number]) =>
            geoToMetric(pt[0], pt[1], centerLat, centerLon)
          );

          const props = f.properties || {};
          const height = parseFloat(props.height || props.ele || '15') || 15;
          const levels = parseInt(props.levels || props['building:levels'] || '4', 10) || 4;

          buildings.push({
            id: `upload_${idx}`,
            name: props.name || `Building ${idx}`,
            typology: 'mixed',
            footprint: metricPts,
            height,
            levels,
            minHeight: 0,
            roofShape: 'flat',
            roofHeight: 0,
            areaMeters2: calculatePolygonArea(metricPts),
            perimeterMeters: calculatePolygonPerimeter(metricPts),
            centerMetric: calculatePolygonCentroid(metricPts),
            tags: props,
          });
        }

        const customDataset: UrbanDataset = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          description: `Imported GeoJSON file with ${buildings.length} custom building footprints.`,
          center: [centerLat, centerLon],
          radiusMeters: 500,
          bbox: [centerLat - 0.01, centerLon - 0.01, centerLat + 0.01, centerLon + 0.01],
          source: 'Custom GeoJSON',
          fetchedAt: new Date().toISOString(),
          buildings,
          roads: [],
          water: [],
        };

        setCurrentDataset(customDataset);
        setSelectedBuilding(null);
        setMeasuredDistance(null);
        setActiveView('3d');
        alert(`Successfully imported ${buildings.length} 3D buildings from ${file.name}!`);
      } catch (err: any) {
        alert(`Failed to parse GeoJSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans">
      {/* Top Header Navigation */}
      <HeaderNav
        currentDataset={currentDataset}
        hasGenerated3DData={hasGenerated3DData}
        activeView={activeView}
        onChangeView={view => setActiveView(view)}
        onSelectPreset={handleSelectPreset}
        onSearchAndExtract={handleSearchAndExtract}
        onFileUpload={handleFileUpload}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenEarthBridge={() => setIsEarthBridgeOpen(true)}
        isLoading={isLoading}
        statusMessage={statusMessage}
      />

      {/* Primary Viewport: 3D Scene or Interactive Map Zone Selector */}
      <div className="w-full h-full pt-14 pb-0">
        {activeView === '3d' ? (
          hasGenerated3DData ? (
            <>
              <Viewport3D
                dataset={currentDataset}
                renderMode={renderMode}
                cameraPreset={cameraPreset}
                solarTime={solarTime}
                showRoads={showRoads}
                showWater={showWater}
                showWireframe={showWireframe}
                heightMultiplier={heightMultiplier}
                selectedBuilding={selectedBuilding}
                onSelectBuilding={b => setSelectedBuilding(b)}
                measureMode={measureMode}
                onMeasureDistance={dist => setMeasuredDistance(dist)}
              />

              {/* Quick floating button to switch back to Map View */}
              <div className="absolute top-18 right-4 z-[1050]">
                <button
                  onClick={() => setActiveView('map')}
                  className="px-3.5 py-2 rounded-xl bg-black/95 hover:bg-neutral-900 border border-neutral-800 shadow-2xl backdrop-blur text-xs font-semibold text-neutral-200 hover:text-red-400 transition flex items-center gap-2 cursor-pointer"
                >
                  <Map className="w-4 h-4 text-red-500" />
                  <span>{t.drawZoneMap}</span>
                </button>
              </div>

              {/* Selected Building Inspector Card */}
              <BuildingInspector
                building={selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
              />

              {/* Collapsible Unified Bottom Control Dock */}
              <ControlDock
                renderMode={renderMode}
                onSelectRenderMode={setRenderMode}
                cameraPreset={cameraPreset}
                onSelectCameraPreset={setCameraPreset}
                solarTime={solarTime}
                onChangeSolarTime={setSolarTime}
                showRoads={showRoads}
                onToggleRoads={() => setShowRoads(!showRoads)}
                showWater={showWater}
                onToggleWater={() => setShowWater(!showWater)}
                showWireframe={showWireframe}
                onToggleWireframe={() => setShowWireframe(!showWireframe)}
                heightMultiplier={heightMultiplier}
                onChangeHeightMultiplier={setHeightMultiplier}
                measureMode={measureMode}
                onToggleMeasureMode={() => {
                  setMeasureMode(!measureMode);
                  if (measureMode) setMeasuredDistance(null);
                }}
                measuredDistance={measuredDistance}
              />
            </>
          ) : (
            /* Clean Empty State when 3D data hasn't been extracted yet */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-black text-center select-none">
              <div className="w-20 h-20 rounded-3xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-5 text-red-500 shadow-2xl shadow-red-950/40 relative">
                <Box className="w-10 h-10 text-neutral-400" />
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 border-2 border-black flex items-center justify-center text-[10px] font-mono font-bold text-white">
                  0
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-neutral-100 mb-2 tracking-tight">
                {t.empty3DTitle}
              </h2>
              <p className="text-xs md:text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
                {t.empty3DDesc}
              </p>
              <button
                onClick={() => setActiveView('map')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs md:text-sm transition shadow-2xl shadow-red-950/70 border border-red-500/50 flex items-center gap-2 cursor-pointer"
              >
                <Map className="w-4 h-4" />
                <span>{t.empty3DActionBtn}</span>
              </button>
            </div>
          )
        ) : (
          <InteractiveMapZoneSelector
            initialCenter={currentDataset ? currentDataset.center : PARIS_DEFAULT_CENTER}
            initialRadius={currentDataset ? currentDataset.radiusMeters : PARIS_DEFAULT_RADIUS}
            onExtractZone={handleExtractZone}
            onClose={() => setActiveView('3d')}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Charging Bar & Pipeline Progress Modal */}
      <ExtractionProgressModal
        progress={progressState}
        dataset={currentDataset}
        onOpenExportModal={() => {
          setProgressState(prev => ({ ...prev, isOpen: false }));
          setIsExportModalOpen(true);
        }}
        onInspectIn3D={() => {
          setProgressState(prev => ({ ...prev, isOpen: false }));
          setActiveView('3d');
        }}
        onClose={() => setProgressState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Export Configuration Modal */}
      <ExportModal
        dataset={currentDataset}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        heightMultiplier={heightMultiplier}
      />

      {/* Google Earth & Cesium 3D Tiles Guide Modal */}
      <GoogleEarthBridgeModal
        isOpen={isEarthBridgeOpen}
        onClose={() => setIsEarthBridgeOpen(false)}
      />

      {/* Designer Attribution Badge - Bottom Right */}
      <div className="fixed bottom-3 right-4 z-[1150] pointer-events-auto select-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/90 backdrop-blur-md border border-neutral-800 shadow-2xl text-[11px] font-mono tracking-wide text-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500" />
          <span className="text-neutral-500">{t.designedBy}</span>
          <span className="font-bold text-neutral-100 tracking-normal hover:text-red-400 transition-colors">
            A. FARHI
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
