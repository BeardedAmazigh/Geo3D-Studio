import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'fr' | 'en';

export interface Translations {
  // Brand & Header
  appTitle: string;
  appSubtitle: string;
  cadBimBadge: string;
  drawZoneMap: string;
  viewport3D: string;
  viewportEmpty: string;
  searchPlaceholder: string;
  searchExtractBtn: string;
  extractingBtn: string;
  citiesMenuBtn: string;
  citiesMenuTitle: string;
  earth3DBtn: string;
  uploadBtn: string;
  exportBtn: string;

  // Map View
  mapZoneTitle: string;
  mapNavHint: string;
  mapDrawHintCircle: string;
  mapDrawHintRect: string;
  mapShapeCircle: string;
  mapShapeRect: string;
  mapDiscardBtn: string;
  mapResetParisBtn: string;
  mapRestoreParis: string;
  mapNoZoneSelected: string;
  mapNoZoneHint: string;
  mapRadiusLabel: string;
  mapAreaLabel: string;
  mapExtractZoneBtn: string;
  mapExtractingZoneBtn: string;
  mapTilesVoyager: string;
  mapTilesSatellite: string;
  mapTilesDark: string;
  mapTilesStreets: string;

  // Extraction Progress Modal
  extractionTitleLoading: string;
  extractionTitleComplete: string;
  extractionReadyBadge: string;
  extractionStep1Title: string;
  extractionStep1Desc: string;
  extractionStep2Title: string;
  extractionStep2Desc: string;
  extractionStep3Title: string;
  extractionStep3Desc: string;
  extractionStep4Title: string;
  extractionStep4Desc: string;
  extractionStep5Title: string;
  extractionStep5Desc: string;
  statBuildings: string;
  statMaxHeight: string;
  statFootprint: string;
  btnView3D: string;
  btnExportFormats: string;
  progressSynthesizing: string;
  progressPleaseWait: string;

  // Empty Viewport 3D
  empty3DTitle: string;
  empty3DDesc: string;
  empty3DActionBtn: string;

  // Control Dock & Viewport
  renderClay: string;
  renderHeightmap: string;
  renderCad: string;
  renderTextured: string;
  camPerspective: string;
  camIsometric: string;
  camTop: string;
  camFront: string;
  camSide: string;
  solarTimeLabel: string;
  heightMultiplierLabel: string;
  layerRoads: string;
  layerWater: string;
  layerWireframe: string;
  measureTool: string;
  measuringActiveBanner: string;
  measuredDistanceLabel: string;

  // Building Inspector
  inspectorTitle: string;
  inspectorTypology: string;
  inspectorTotalHeight: string;
  inspectorLevels: string;
  inspectorFootprintArea: string;
  inspectorPerimeter: string;
  inspectorRoofShape: string;
  inspectorRoofHeight: string;
  inspectorAddress: string;
  inspectorCoordinates: string;
  inspectorClose: string;

  // Export Modal
  exportModalTitle: string;
  exportModalSubtitle: string;
  exportSelectFormat: string;
  exportUpAxis: string;
  exportUnits: string;
  exportGrouping: string;
  exportLOD: string;
  exportLayersIncluded: string;
  exportDownloadBtn: string;
  exportGeneratingBtn: string;
  exportSuccessMsg: string;

  // Footer / Signature
  designedBy: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  fr: {
    // Brand & Header
    appTitle: 'Geo3D Studio',
    appSubtitle: 'Extracteur 3D Géospatial → OBJ • FBX • RVT • SKP • DXF',
    cadBimBadge: 'CAD & BIM',
    drawZoneMap: 'Tracer la zone sur la carte 🗺️',
    viewport3D: 'Fenêtre 3D',
    viewportEmpty: '(Vide)',
    searchPlaceholder: 'Rechercher une adresse ou un lieu...',
    searchExtractBtn: 'Extraire',
    extractingBtn: '...',
    citiesMenuBtn: 'Villes',
    citiesMenuTitle: 'Métropoles remarquables',
    earth3DBtn: 'Earth 3D',
    uploadBtn: 'Importer',
    exportBtn: 'Exporter les formats',

    // Map View
    mapZoneTitle: 'Zone de sélection 3D',
    mapNavHint: 'Clic gauche pour naviguer sur la carte',
    mapDrawHintCircle: 'Clic droit enfoncé + glisser pour tracer un cercle',
    mapDrawHintRect: 'Clic droit enfoncé + glisser pour tracer un rectangle',
    mapShapeCircle: 'Cercle',
    mapShapeRect: 'Rectangle',
    mapDiscardBtn: 'Effacer le tracé',
    mapResetParisBtn: 'Recentrer sur Paris',
    mapRestoreParis: 'Restaurer la zone de Paris',
    mapNoZoneSelected: 'Aucune zone sélectionnée',
    mapNoZoneHint: 'Maintenez le Clic Droit et faites glisser sur la carte pour tracer une zone, ou restaurez Paris.',
    mapRadiusLabel: 'Rayon',
    mapAreaLabel: 'Surface',
    mapExtractZoneBtn: 'Extraire & Exporter la zone',
    mapExtractingZoneBtn: 'Extraction des bâtiments 3D...',
    mapTilesVoyager: 'Voyager',
    mapTilesSatellite: 'Satellite',
    mapTilesDark: 'Sombre',
    mapTilesStreets: 'Rues',

    // Extraction Progress Modal
    extractionTitleLoading: 'Extraction des bâtiments 3D',
    extractionTitleComplete: 'Extraction 3D terminée',
    extractionReadyBadge: 'Prêt',
    extractionStep1Title: 'Projection géodésique de la zone',
    extractionStep1Desc: 'Calcul de l’emprise métrique et des origines cartésiennes',
    extractionStep2Title: 'Flux des tuiles vectorielles 3D',
    extractionStep2Desc: 'Interrogation d’OpenStreetMap & Overpass pour les empreintes',
    extractionStep3Title: 'Résolution des étages et toitures',
    extractionStep3Desc: 'Calcul des niveaux, formes de toits (pyramidal, pente, plat) et hauteurs',
    extractionStep4Title: 'Triangulation géométrique 3D',
    extractionStep4Desc: 'Triangulation ear-clipping et extrusion des murs en solides étanches',
    extractionStep5Title: 'Synthèse des calques CAD & BIM',
    extractionStep5Desc: 'Assemblage des strates du bâti et préparation pour OBJ/FBX/RVT/SKP/DXF',
    statBuildings: 'Bâtiments',
    statMaxHeight: 'Hauteur max',
    statFootprint: 'Emprise',
    btnView3D: 'Voir dans la scène 3D',
    btnExportFormats: 'Exporter les formats (OBJ, FBX, RVT, SKP, DXF)',
    progressSynthesizing: 'Synthèse de la géométrie 3D réelle en cours...',
    progressPleaseWait: 'Veuillez patienter',

    // Empty Viewport 3D
    empty3DTitle: 'Aucun modèle 3D généré',
    empty3DDesc: 'Tracez une zone sur la carte interactive avec un clic droit, ou recherchez une adresse pour extraire le bâti réel et exporter en OBJ, FBX, RVT, SKP ou DXF.',
    empty3DActionBtn: 'Tracer la zone sur la carte 🗺️',

    // Control Dock & Viewport
    renderClay: 'Argile',
    renderHeightmap: 'Hauteurs',
    renderCad: 'CAD',
    renderTextured: 'Textures',
    camPerspective: 'Perspective',
    camIsometric: 'Isométrique',
    camTop: 'Dessus',
    camFront: 'Face',
    camSide: 'Côté',
    solarTimeLabel: 'Heure solaire',
    heightMultiplierLabel: 'Échelle verticale',
    layerRoads: 'Routes',
    layerWater: 'Eau',
    layerWireframe: 'Filaire',
    measureTool: 'Mesure',
    measuringActiveBanner: '📐 Outil de mesure : Cliquez 2 points au sol ou sur les bâtiments',
    measuredDistanceLabel: 'Distance',

    // Building Inspector
    inspectorTitle: 'Inspecteur de bâtiment',
    inspectorTypology: 'Typologie',
    inspectorTotalHeight: 'Hauteur totale',
    inspectorLevels: 'Nombre d’étages',
    inspectorFootprintArea: 'Surface au sol',
    inspectorPerimeter: 'Périmètre',
    inspectorRoofShape: 'Forme du toit',
    inspectorRoofHeight: 'Hauteur de toiture',
    inspectorAddress: 'Adresse',
    inspectorCoordinates: 'Coordonnées métriques',
    inspectorClose: 'Fermer',

    // Export Modal
    exportModalTitle: 'Exportation de données géospatiales 3D',
    exportModalSubtitle: 'Génération de fichiers CAD & BIM professionnels avec géométrie étanche',
    exportSelectFormat: 'Format d’exportation',
    exportUpAxis: 'Orientation de l’axe vertical',
    exportUnits: 'Unités géométriques',
    exportGrouping: 'Organisation des calques',
    exportLOD: 'Niveau de détail (LOD)',
    exportLayersIncluded: 'Couches d’éléments à inclure',
    exportDownloadBtn: 'Générer & Télécharger',
    exportGeneratingBtn: 'Génération en cours...',
    exportSuccessMsg: 'Fichier prêt au téléchargement',

    // Footer / Signature
    designedBy: 'Conçu par',
  },
  en: {
    // Brand & Header
    appTitle: 'Geo3D Studio',
    appSubtitle: 'Geospatial 3D Extractor → OBJ • FBX • RVT • SKP • DXF',
    cadBimBadge: 'CAD & BIM',
    drawZoneMap: 'Draw Zone on Map 🗺️',
    viewport3D: '3D Viewport',
    viewportEmpty: '(Empty)',
    searchPlaceholder: 'Search address or landmark...',
    searchExtractBtn: 'Extract',
    extractingBtn: '...',
    citiesMenuBtn: 'Cities',
    citiesMenuTitle: 'Curated Metropolises',
    earth3DBtn: 'Earth 3D',
    uploadBtn: 'Upload',
    exportBtn: 'Export Formats',

    // Map View
    mapZoneTitle: '3D Selection Zone',
    mapNavHint: 'Left click to pan around the map',
    mapDrawHintCircle: 'Hold Right-Click + drag to draw a circle',
    mapDrawHintRect: 'Hold Right-Click + drag to draw a rectangle',
    mapShapeCircle: 'Circle',
    mapShapeRect: 'Rectangle',
    mapDiscardBtn: 'Discard Drawing',
    mapResetParisBtn: 'Reset to Paris',
    mapRestoreParis: 'Restore Paris Zone',
    mapNoZoneSelected: 'No zone selected',
    mapNoZoneHint: 'Hold Right-Click and drag on the map to draw a zone, or reset to Paris.',
    mapRadiusLabel: 'Radius',
    mapAreaLabel: 'Area',
    mapExtractZoneBtn: 'Extract & Export Zone',
    mapExtractingZoneBtn: 'Extracting 3D Buildings...',
    mapTilesVoyager: 'Voyager',
    mapTilesSatellite: 'Satellite',
    mapTilesDark: 'Dark',
    mapTilesStreets: 'Streets',

    // Extraction Progress Modal
    extractionTitleLoading: 'Extracting 3D Buildings',
    extractionTitleComplete: '3D Extraction Complete',
    extractionReadyBadge: 'Ready',
    extractionStep1Title: 'Geodetic Zone Projection',
    extractionStep1Desc: 'Calculate metric bounding box & Cartesian origins',
    extractionStep2Title: 'Stream Earth 3D Vector Tiles',
    extractionStep2Desc: 'Query OpenStreetMap & Overpass building footprints',
    extractionStep3Title: 'Resolve Storeys & Roof Profiles',
    extractionStep3Desc: 'Calculate levels, roof shapes (pyramidal, gabled, flat) & heights',
    extractionStep4Title: 'Triangulate 3D Mesh Geometry',
    extractionStep4Desc: 'Ear-clipping triangulation & wall extrusion into watertight solids',
    extractionStep5Title: 'CAD & BIM Layer Synthesis',
    extractionStep5Desc: 'Assemble building strata, roads, and preparation for OBJ/FBX/RVT/SKP/DXF',
    statBuildings: 'Buildings',
    statMaxHeight: 'Max Height',
    statFootprint: 'Footprint',
    btnView3D: 'View in 3D Scene',
    btnExportFormats: 'Export Formats (OBJ, FBX, RVT, SKP, DXF)',
    progressSynthesizing: 'Synthesizing real-world 3D geometry...',
    progressPleaseWait: 'Please wait',

    // Empty Viewport 3D
    empty3DTitle: 'No 3D Model Generated Yet',
    empty3DDesc: 'Draw a zone on the interactive map with Right-Click, or search any global address/landmark to extract real-world 3D buildings and export to OBJ, FBX, RVT, SKP, or DXF.',
    empty3DActionBtn: 'Draw Zone on Map 🗺️',

    // Control Dock & Viewport
    renderClay: 'Clay',
    renderHeightmap: 'Heightmap',
    renderCad: 'CAD',
    renderTextured: 'Textured',
    camPerspective: 'Perspective',
    camIsometric: 'Isometric',
    camTop: 'Top',
    camFront: 'Front',
    camSide: 'Side',
    solarTimeLabel: 'Solar Time',
    heightMultiplierLabel: 'Height Scale',
    layerRoads: 'Roads',
    layerWater: 'Water',
    layerWireframe: 'Wireframe',
    measureTool: 'Measure',
    measuringActiveBanner: '📐 Measurement Tool: Click 2 points on the ground/buildings',
    measuredDistanceLabel: 'Distance',

    // Building Inspector
    inspectorTitle: 'Building Inspector',
    inspectorTypology: 'Typology',
    inspectorTotalHeight: 'Total Height',
    inspectorLevels: 'Storey Levels',
    inspectorFootprintArea: 'Footprint Area',
    inspectorPerimeter: 'Perimeter',
    inspectorRoofShape: 'Roof Shape',
    inspectorRoofHeight: 'Roof Height',
    inspectorAddress: 'Address',
    inspectorCoordinates: 'Metric Coords',
    inspectorClose: 'Close',

    // Export Modal
    exportModalTitle: 'Geospatial 3D Export',
    exportModalSubtitle: 'Generate professional CAD & BIM files with watertight solids',
    exportSelectFormat: 'Export Format',
    exportUpAxis: 'Up Axis Orientation',
    exportUnits: 'Metric/Imperial Units',
    exportGrouping: 'Layer Organization',
    exportLOD: 'Level of Detail (LOD)',
    exportLayersIncluded: 'Layers to Include',
    exportDownloadBtn: 'Generate & Download',
    exportGeneratingBtn: 'Generating...',
    exportSuccessMsg: 'File ready for download',

    // Footer / Signature
    designedBy: 'Designed by',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: TRANSLATIONS.fr,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default language is French ('fr')
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('geo3d_lang');
    return saved === 'en' || saved === 'fr' ? saved : 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('geo3d_lang', lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: TRANSLATIONS[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  return useContext(LanguageContext);
};
