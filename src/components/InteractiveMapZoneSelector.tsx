import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Circle as CircleIcon,
  Compass,
  Crosshair,
  Download,
  Eye,
  Globe2,
  Layers,
  MapPin,
  Move,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { searchLocation } from '../services/overpassService';
import { useTranslation } from '../services/i18n';

export type MapDrawShape = 'circle' | 'rectangle';
export type MapTileProvider = 'voyager' | 'satellite' | 'dark' | 'streets';

export const CARTO_API_KEY = 'cb1_4uv1_1_f7c4ec0a92a7f46d1902b906';
export const CARTO_VOYAGER_RASTER = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`;
export const CARTO_VOYAGER_VECTOR_STYLE = `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=${CARTO_API_KEY}`;

export const PARIS_DEFAULT_CENTER: [number, number] = [48.8584, 2.2945];
export const PARIS_DEFAULT_RADIUS = 450;

export interface SelectedZone {
  type: 'circle' | 'rectangle';
  center: [number, number]; // [lat, lon]
  radiusMeters: number;
  bbox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  areaKm2: number;
  name: string;
}

interface InteractiveMapZoneSelectorProps {
  initialCenter?: [number, number];
  initialRadius?: number;
  onExtractZone: (zone: SelectedZone) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

export const InteractiveMapZoneSelector: React.FC<InteractiveMapZoneSelectorProps> = ({
  initialCenter = PARIS_DEFAULT_CENTER,
  initialRadius = PARIS_DEFAULT_RADIUS,
  onExtractZone,
  onClose,
  isLoading = false,
}) => {
  const { t, language } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const drawnLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // User chosen shape: Circle or Rectangle (drawn via Right-Click)
  const [drawShape, setDrawShape] = useState<MapDrawShape>('circle');
  const [tileProvider, setTileProvider] = useState<MapTileProvider>('voyager');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Selected Zone state (starts by default in Paris)
  const [selectedZone, setSelectedZone] = useState<SelectedZone | null>(() => {
    const center = initialCenter || PARIS_DEFAULT_CENTER;
    const radius = initialRadius || PARIS_DEFAULT_RADIUS;
    const dLat = radius / 111320;
    const dLon = radius / (111320 * Math.cos((center[0] * Math.PI) / 180));
    const area = (Math.PI * radius * radius) / 1000000;
    return {
      type: 'circle',
      center,
      radiusMeters: radius,
      bbox: [center[0] - dLat, center[1] - dLon, center[0] + dLat, center[1] + dLon],
      areaKm2: parseFloat(area.toFixed(3)),
      name: 'Paris - Eiffel Tower & Champ de Mars',
    };
  });

  // Active right-click drawing state
  const isDrawingRef = useRef(false);
  const drawStartPointRef = useRef<L.LatLng | null>(null);
  const activeShapeRef = useRef<L.Circle | L.Rectangle | null>(null);
  const drawShapeRef = useRef<MapDrawShape>(drawShape);

  // Keep drawShapeRef in sync
  useEffect(() => {
    drawShapeRef.current = drawShape;
  }, [drawShape]);

  // Tile URL definitions with CartoDB API Key
  const tileURLs: Record<MapTileProvider, { url: string; attribution: string }> = {
    voyager: {
      url: CARTO_VOYAGER_RASTER,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
    dark: {
      url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
      attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
    },
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
  };

  // Render finalized zone visual in Black & Red theme
  const renderZoneVisual = (
    map: L.Map,
    layerGroup: L.LayerGroup,
    zone: SelectedZone | null
  ) => {
    layerGroup.clearLayers();
    if (!zone) return;

    // Glowing Red Center Pin
    const centerIcon = L.divIcon({
      className: 'custom-center-pin',
      html: `
        <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; transform: translate(-10px, -10px);">
          <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #ef4444; border: 2.5px solid #ffffff; box-shadow: 0 0 12px #ef4444;"></div>
        </div>
      `,
    });

    L.marker(zone.center, { icon: centerIcon }).addTo(layerGroup);

    if (zone.type === 'circle') {
      L.circle(zone.center, {
        radius: zone.radiusMeters,
        color: '#ef4444',
        weight: 3,
        fillColor: '#ef4444',
        fillOpacity: 0.22,
      }).addTo(layerGroup);
    } else {
      const bounds = L.latLngBounds(
        L.latLng(zone.bbox[0], zone.bbox[1]),
        L.latLng(zone.bbox[2], zone.bbox[3])
      );
      L.rectangle(bounds, {
        color: '#dc2626',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 0.22,
      }).addTo(layerGroup);
    }
  };

  // Initialize Map with custom mouse control mapping
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const container = mapContainerRef.current;

    // Suppress default browser right-click context menu on map
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    container.addEventListener('contextmenu', handleContextMenu);

    const initialMapCenter = selectedZone?.center || PARIS_DEFAULT_CENTER;

    const map = L.map(container, {
      center: initialMapCenter,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Keep map license attribution on bottom-left
    L.control.attribution({ position: 'bottomleft' }).addTo(map);

    // Left click dragging enabled for panning
    map.dragging.enable();

    // Add initial base tile layer (CartoDB Voyager)
    const provider = tileURLs[tileProvider];
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Layer group for shapes
    const layerGroup = L.layerGroup().addTo(map);
    drawnLayerGroupRef.current = layerGroup;

    // Render initial zone
    if (selectedZone) {
      renderZoneVisual(map, layerGroup, selectedZone);
    }

    // ============================================================
    // MOUSE EVENT BINDINGS:
    // Left click (button 0): Drag map position (handled by map.dragging)
    // Right click (button 2): Draw circle or rectangle
    // ============================================================
    map.on('mousedown', (e: L.LeafletMouseEvent) => {
      const isRightClick = e.originalEvent.button === 2;

      // Only right click starts drawing! Left click drags the map.
      if (!isRightClick) {
        return;
      }

      e.originalEvent.preventDefault();
      map.dragging.disable();
      isDrawingRef.current = true;
      drawStartPointRef.current = e.latlng;

      if (activeShapeRef.current) {
        layerGroup.removeLayer(activeShapeRef.current);
        activeShapeRef.current = null;
      }

      const currentShape = drawShapeRef.current;

      if (currentShape === 'circle') {
        const circle = L.circle(e.latlng, {
          radius: 15,
          color: '#ef4444',
          weight: 3,
          fillColor: '#ef4444',
          fillOpacity: 0.28,
          dashArray: '6, 6',
        }).addTo(layerGroup);
        activeShapeRef.current = circle;
      } else {
        const bounds = L.latLngBounds(e.latlng, e.latlng);
        const rect = L.rectangle(bounds, {
          color: '#dc2626',
          weight: 3,
          fillColor: '#dc2626',
          fillOpacity: 0.28,
          dashArray: '6, 6',
        }).addTo(layerGroup);
        activeShapeRef.current = rect;
      }
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current || !drawStartPointRef.current || !activeShapeRef.current) {
        return;
      }

      const currentShape = drawShapeRef.current;

      if (currentShape === 'circle' && activeShapeRef.current instanceof L.Circle) {
        const radius = drawStartPointRef.current.distanceTo(e.latlng);
        activeShapeRef.current.setRadius(Math.max(radius, 25));
      } else if (currentShape === 'rectangle' && activeShapeRef.current instanceof L.Rectangle) {
        const bounds = L.latLngBounds(drawStartPointRef.current, e.latlng);
        activeShapeRef.current.setBounds(bounds);
      }
    });

    map.on('mouseup', (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current || !drawStartPointRef.current) {
        return;
      }

      isDrawingRef.current = false;
      map.dragging.enable();

      const currentShape = drawShapeRef.current;

      if (currentShape === 'circle' && activeShapeRef.current instanceof L.Circle) {
        const centerLatLng = drawStartPointRef.current;
        const radius = Math.max(centerLatLng.distanceTo(e.latlng), 50);

        const dLat = radius / 111320;
        const dLon = radius / (111320 * Math.cos((centerLatLng.lat * Math.PI) / 180));
        const area = (Math.PI * radius * radius) / 1000000;

        const updated: SelectedZone = {
          type: 'circle',
          center: [centerLatLng.lat, centerLatLng.lng],
          radiusMeters: Math.round(radius),
          bbox: [
            centerLatLng.lat - dLat,
            centerLatLng.lng - dLon,
            centerLatLng.lat + dLat,
            centerLatLng.lng + dLon,
          ],
          areaKm2: parseFloat(area.toFixed(3)),
          name: `Circular Zone (${Math.round(radius)}m radius)`,
        };

        setSelectedZone(updated);
        renderZoneVisual(map, layerGroup, updated);
      } else if (currentShape === 'rectangle' && activeShapeRef.current instanceof L.Rectangle) {
        const bounds = L.latLngBounds(drawStartPointRef.current, e.latlng);
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        const center = bounds.getCenter();

        const widthMeters = southWest.distanceTo(L.latLng(southWest.lat, northEast.lng));
        const heightMeters = southWest.distanceTo(L.latLng(northEast.lat, southWest.lng));
        const area = (widthMeters * heightMeters) / 1000000;
        const radiusEst = Math.max(widthMeters, heightMeters) / 2;

        const updated: SelectedZone = {
          type: 'rectangle',
          center: [center.lat, center.lng],
          radiusMeters: Math.round(radiusEst),
          bbox: [southWest.lat, southWest.lng, northEast.lat, northEast.lng],
          areaKm2: parseFloat(area.toFixed(3)),
          name: `Rectangle (${Math.round(widthMeters)}m × ${Math.round(heightMeters)}m)`,
        };

        setSelectedZone(updated);
        renderZoneVisual(map, layerGroup, updated);
      }
    });

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
      map.remove();
    };
  }, []);

  // Switch Tile Provider
  const handleSwitchProvider = (providerKey: MapTileProvider) => {
    setTileProvider(providerKey);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const provider = tileURLs[providerKey];
    tileLayerRef.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: 19,
    }).addTo(map);
  };

  // Button Action: Discard Current Drawing
  const handleDiscardDrawing = () => {
    setSelectedZone(null);
    if (drawnLayerGroupRef.current) {
      drawnLayerGroupRef.current.clearLayers();
    }
    if (activeShapeRef.current && mapInstanceRef.current) {
      activeShapeRef.current = null;
    }
  };

  // Button Action: Reset View to Paris
  const handleResetToParis = () => {
    const map = mapInstanceRef.current;
    if (!map || !drawnLayerGroupRef.current) return;

    map.flyTo(PARIS_DEFAULT_CENTER, 16, { duration: 1.2 });

    const radius = PARIS_DEFAULT_RADIUS;
    const dLat = radius / 111320;
    const dLon = radius / (111320 * Math.cos((PARIS_DEFAULT_CENTER[0] * Math.PI) / 180));
    const area = (Math.PI * radius * radius) / 1000000;

    const parisZone: SelectedZone = {
      type: 'circle',
      center: PARIS_DEFAULT_CENTER,
      radiusMeters: radius,
      bbox: [
        PARIS_DEFAULT_CENTER[0] - dLat,
        PARIS_DEFAULT_CENTER[1] - dLon,
        PARIS_DEFAULT_CENTER[0] + dLat,
        PARIS_DEFAULT_CENTER[1] + dLon,
      ],
      areaKm2: parseFloat(area.toFixed(3)),
      name: 'Paris - Eiffel Tower & Champ de Mars',
    };

    setSelectedZone(parisZone);
    renderZoneVisual(map, drawnLayerGroupRef.current, parisZone);
  };

  // Search Address / Landmark
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchLocation(searchQuery.trim());
      if (results.length > 0) {
        const top = results[0];
        handleSelectLocation(top.lat, top.lon, top.displayName);
      } else {
        alert(`No location found for "${searchQuery}". Try a landmark or street address.`);
      }
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (lat: number, lon: number, name: string) => {
    const map = mapInstanceRef.current;
    if (!map || !drawnLayerGroupRef.current) return;

    map.flyTo([lat, lon], 16, { duration: 1.2 });

    const radius = selectedZone?.radiusMeters || PARIS_DEFAULT_RADIUS;
    const dLat = radius / 111320;
    const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180));
    const area = (Math.PI * radius * radius) / 1000000;

    const newZone: SelectedZone = {
      type: selectedZone?.type || 'circle',
      center: [lat, lon],
      radiusMeters: radius,
      bbox: [lat - dLat, lon - dLon, lat + dLat, lon + dLon],
      areaKm2: parseFloat(area.toFixed(3)),
      name: name.split(',')[0],
    };

    setSelectedZone(newZone);
    renderZoneVisual(map, drawnLayerGroupRef.current, newZone);
  };

  // Adjust radius slider
  const handleRadiusSlider = (newRadius: number) => {
    if (!selectedZone) return;
    const map = mapInstanceRef.current;
    if (!map || !drawnLayerGroupRef.current) return;

    const center = selectedZone.center;
    const dLat = newRadius / 111320;
    const dLon = newRadius / (111320 * Math.cos((center[0] * Math.PI) / 180));
    const area = (Math.PI * newRadius * newRadius) / 1000000;

    const updated: SelectedZone = {
      ...selectedZone,
      radiusMeters: newRadius,
      bbox: [center[0] - dLat, center[1] - dLon, center[0] + dLat, center[1] + dLon],
      areaKm2: parseFloat(area.toFixed(3)),
    };

    setSelectedZone(updated);
    renderZoneVisual(map, drawnLayerGroupRef.current, updated);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none">
      {/* Map Top Control bar - Fixed with high z-index so ALWAYS strictly visible */}
      <div className="absolute top-3 left-3 right-3 z-[1050] flex flex-col lg:flex-row items-center justify-between gap-2 pointer-events-none">
        {/* Left: Address / Landmark Search Form */}
        <div className="pointer-events-auto flex items-center bg-black/95 border border-neutral-800 rounded-xl shadow-2xl p-1.5 w-full sm:w-80 lg:w-96 backdrop-blur">
          <form onSubmit={handleSearch} className="flex items-center w-full">
            <Search className="w-4 h-4 text-red-500 ml-2 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search address or landmark..."
              className="bg-transparent text-xs text-neutral-100 placeholder-neutral-500 outline-none w-full font-sans"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs transition cursor-pointer flex-shrink-0 flex items-center gap-1 shadow-md shadow-red-950"
            >
              {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>{language === 'fr' ? 'Chercher' : 'Search'}</span>}
            </button>
          </form>
        </div>

        {/* Center: Shape Choice (Right-Click Draw) & Discard / Reset buttons */}
        <div className="pointer-events-auto flex items-center flex-wrap bg-black/95 border border-neutral-800 rounded-xl shadow-2xl p-1 backdrop-blur gap-1">
          <div className="flex items-center gap-1 border-r border-neutral-850 pr-1.5 mr-0.5">
            <span className="text-[10px] font-mono text-neutral-400 px-1 font-semibold uppercase">
              {language === 'fr' ? 'Tracé :' : 'Draw:'}
            </span>
            <button
              onClick={() => setDrawShape('circle')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                drawShape === 'circle'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'text-neutral-300 hover:bg-neutral-900'
              }`}
            >
              <CircleIcon className="w-3.5 h-3.5" />
              <span>{t.mapShapeCircle}</span>
            </button>

            <button
              onClick={() => setDrawShape('rectangle')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                drawShape === 'rectangle'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'text-neutral-300 hover:bg-neutral-900'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>{t.mapShapeRect}</span>
            </button>
          </div>

          {/* Discard Drawing button */}
          <button
            onClick={handleDiscardDrawing}
            title={t.mapDiscardBtn}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-white hover:bg-red-950/80 border border-red-900/50 transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>{t.mapDiscardBtn}</span>
          </button>

          {/* Reset to Paris button */}
          <button
            onClick={handleResetToParis}
            title={t.mapResetParisBtn}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            <span>{t.mapResetParisBtn}</span>
          </button>
        </div>

        {/* Right: Base Layer Switcher */}
        <div className="pointer-events-auto flex items-center bg-black/95 border border-neutral-800 rounded-xl shadow-2xl p-1 backdrop-blur gap-1">
          <button
            onClick={() => handleSwitchProvider('voyager')}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
              tileProvider === 'voyager'
                ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>{t.mapTilesVoyager}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-red-950 text-red-300 font-mono">
              API
            </span>
          </button>
          <button
            onClick={() => handleSwitchProvider('satellite')}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
              tileProvider === 'satellite'
                ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.mapTilesSatellite}
          </button>
          <button
            onClick={() => handleSwitchProvider('dark')}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
              tileProvider === 'dark'
                ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.mapTilesDark}
          </button>
          <button
            onClick={() => handleSwitchProvider('streets')}
            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
              tileProvider === 'streets'
                ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.mapTilesStreets}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Map Selector"
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Mouse Control Guide Pill - Permanent z-index */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1050] pointer-events-none px-4 py-1.5 rounded-full bg-black/95 border border-neutral-800 shadow-2xl text-neutral-200 text-xs font-mono flex items-center gap-3 backdrop-blur">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
          <span>{t.mapNavHint}</span>
        </span>
        <span className="text-neutral-700">|</span>
        <span className="flex items-center gap-1.5 text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>{drawShape === 'circle' ? t.mapDrawHintCircle : t.mapDrawHintRect}</span>
        </span>
      </div>

      {/* Main Leaflet Map View Container */}
      <div ref={mapContainerRef} className="w-full h-full relative z-0 cursor-grab active:cursor-grabbing bg-neutral-950" />

      {/* Bottom Zone Summary & Action Dock - Permanent z-index */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1050] w-full max-w-3xl px-4 pointer-events-none">
        <div className="pointer-events-auto bg-black/95 border border-neutral-800 rounded-2xl shadow-2xl p-4 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
          {selectedZone ? (
            <>
              {/* Left stats */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 flex-shrink-0 shadow-lg shadow-red-950/50">
                  {selectedZone.type === 'circle' ? (
                    <CircleIcon className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-100">{selectedZone.name}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-red-950/80 text-red-400 border border-red-900/60 uppercase">
                      {selectedZone.type === 'circle' ? t.mapShapeCircle : t.mapShapeRect}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-neutral-400 mt-0.5">
                    <span>
                      {selectedZone.center[0].toFixed(4)}°, {selectedZone.center[1].toFixed(4)}°
                    </span>
                    <span>•</span>
                    <span className="text-red-400">{t.mapRadiusLabel}: ~{selectedZone.radiusMeters}m</span>
                    <span>•</span>
                    <span className="text-rose-400">{t.mapAreaLabel}: ~{selectedZone.areaKm2} km²</span>
                  </div>
                </div>
              </div>

              {/* Center Radius Fine-Tune Slider (for circles) */}
              {selectedZone.type === 'circle' && (
                <div className="flex items-center gap-2 w-full md:w-44 text-xs font-mono text-neutral-400">
                  <span className="text-[10px] text-neutral-500">{t.mapRadiusLabel}:</span>
                  <input
                    type="range"
                    min={150}
                    max={2500}
                    step={50}
                    value={selectedZone.radiusMeters}
                    onChange={e => handleRadiusSlider(Number(e.target.value))}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                  <span className="w-12 text-right text-red-400">{selectedZone.radiusMeters}m</span>
                </div>
              )}

              {/* Right Action: Extract This Zone */}
              <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
                <button
                  onClick={() => onExtractZone(selectedZone)}
                  disabled={isLoading}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs transition shadow-lg shadow-red-950/60 border border-red-500/50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Download className="w-4 h-4 text-white" />
                  )}
                  <span>{isLoading ? t.mapExtractingZoneBtn : t.mapExtractZoneBtn}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-400">
                  <Move className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-100">
                    {t.mapNoZoneSelected}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    {t.mapNoZoneHint}
                  </div>
                </div>
              </div>

              <button
                onClick={handleResetToParis}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-950"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.mapRestoreParis}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
