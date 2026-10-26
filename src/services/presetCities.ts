import { Building3D, RoadSegment, UrbanDataset, WaterFeature } from '../types';
import { calculatePolygonArea, calculatePolygonCentroid, calculatePolygonPerimeter } from './projection';

function createBuilding(
  id: string,
  name: string,
  typology: Building3D['typology'],
  footprint: [number, number][],
  height: number,
  levels: number,
  roofShape: Building3D['roofShape'] = 'flat',
  address?: string,
  tags: Record<string, string> = {}
): Building3D {
  return {
    id,
    name,
    typology,
    footprint,
    height,
    levels,
    minHeight: 0,
    roofShape,
    roofHeight: roofShape === 'flat' ? 0 : Math.min(height * 0.2, 12),
    address,
    tags: {
      'building': 'yes',
      'building:levels': levels.toString(),
      'height': `${height}m`,
      ...tags,
    },
    areaMeters2: calculatePolygonArea(footprint),
    perimeterMeters: calculatePolygonPerimeter(footprint),
    centerMetric: calculatePolygonCentroid(footprint),
  };
}

// 1. MANHATTAN MIDTOWN & EMPIRE STATE DISTRICT, NEW YORK
export const MANHATTAN_DATASET: UrbanDataset = {
  id: 'manhattan_midtown',
  name: 'New York - Midtown & Empire State District',
  description: 'Dense Manhattan skyscraper grid featuring Empire State Building, surrounding high-rises, and midtown avenues.',
  center: [40.7484, -73.9857],
  radiusMeters: 450,
  bbox: [40.7450, -73.9900, 40.7520, -73.9800],
  source: 'Curated Preset',
  fetchedAt: '2026-10-26T00:00:00Z',
  buildings: [
    // Empire State Building (Centerpiece with setbacks and spire)
    createBuilding(
      'nyc-esb',
      'Empire State Building',
      'skyscraper',
      [
        [-38, -52], [38, -52], [38, 52], [-38, 52]
      ],
      381,
      102,
      'pyramidal',
      '350 5th Ave, New York, NY 10118',
      { 'architect': 'Shreve, Lamb & Harmon', 'year': '1931', 'heritage': 'landmark' }
    ),
    // 5th Ave Tower East
    createBuilding('nyc-1', '345 Fifth Avenue Tower', 'office', [[55, -45], [95, -45], [95, 40], [55, 40]], 145, 42, 'flat'),
    // 5th Ave West Commercial
    createBuilding('nyc-2', 'Empire Commercial Plaza', 'commercial', [[-100, -50], [-55, -50], [-55, 35], [-100, 35]], 98, 28, 'flat'),
    // West 33rd St High-rise
    createBuilding('nyc-3', 'Herald Square Tower', 'skyscraper', [[-140, 70], [-80, 70], [-80, 130], [-140, 130]], 220, 60, 'flat'),
    // Greeley Square Center
    createBuilding('nyc-4', 'Greeley Square Landmark', 'historic', [[-140, -110], [-85, -110], [-85, -60], [-140, -60]], 72, 18, 'mansard'),
    // Broadway Corner Tower
    createBuilding('nyc-5', 'Broadway Office Centre', 'office', [[-80, -130], [-30, -110], [-15, -65], [-70, -75]], 165, 46, 'flat'),
    // East 34th Street Corporate
    createBuilding('nyc-6', '34th Street Grand Tower', 'skyscraper', [[40, 70], [105, 70], [105, 140], [40, 140]], 215, 58, 'flat'),
    // Madison Ave Block A
    createBuilding('nyc-7', 'Madison Plaza North', 'office', [[120, -40], [180, -40], [180, 35], [120, 35]], 185, 50, 'flat'),
    // Madison Ave Block B
    createBuilding('nyc-8', 'Madison Executive Suites', 'commercial', [[120, 65], [180, 65], [180, 135], [120, 135]], 135, 38, 'flat'),
    // East 33rd Residential Tower
    createBuilding('nyc-9', 'Murray Hill Residences', 'residential', [[120, -125], [175, -125], [175, -60], [120, -60]], 110, 32, 'flat'),
    // 6th Avenue Tech Hub
    createBuilding('nyc-10', 'Sixth Avenue Digital Center', 'office', [[-195, -45], [-150, -45], [-150, 40], [-195, 40]], 175, 48, 'flat'),
    // Penn Plaza North
    createBuilding('nyc-11', 'One Penn Plaza Adjacent', 'skyscraper', [[-240, 60], [-160, 60], [-160, 150], [-240, 150]], 229, 57, 'flat'),
    // 5th Ave Luxury Retail
    createBuilding('nyc-12', 'Fifth Avenue Flagship', 'commercial', [[-35, 70], [25, 70], [25, 120], [-35, 120]], 85, 22, 'flat'),
    // West 32nd St Korean Block
    createBuilding('nyc-13', 'Korea Way Commercial', 'commercial', [[-40, -120], [20, -120], [20, -75], [-40, -75]], 68, 16, 'flat'),
    // North Midtown High-Rise
    createBuilding('nyc-14', 'Midtown Central Tower', 'skyscraper', [[-30, 145], [30, 145], [30, 210], [-30, 210]], 265, 70, 'pyramidal'),
    // North Madison Tower
    createBuilding('nyc-15', 'Grand Madison Tower', 'office', [[55, 155], [115, 155], [115, 215], [55, 215]], 195, 52, 'flat'),
    // South 5th Ave
    createBuilding('nyc-16', 'South 5th Ave Lofts', 'residential', [[-30, -190], [30, -190], [30, -145], [-30, -145]], 92, 24, 'mansard'),
    // Lexington Connector
    createBuilding('nyc-17', 'Park Avenue South Corporate', 'office', [[200, -50], [255, -50], [255, 45], [200, 45]], 155, 44, 'flat'),
  ],
  roads: [
    { id: 'r1', name: '5th Avenue', type: 'primary', points: [[0, -250], [0, 250]], width: 14 },
    { id: 'r2', name: 'Broadway', type: 'primary', points: [[-120, -250], [80, 250]], width: 14 },
    { id: 'r3', name: 'Madison Avenue', type: 'secondary', points: [[110, -250], [110, 250]], width: 12 },
    { id: 'r4', name: '6th Avenue (Avenue of the Americas)', type: 'primary', points: [[-150, -250], [-150, 250]], width: 14 },
    { id: 'r5', name: 'West 34th Street', type: 'secondary', points: [[-260, 55], [260, 55]], width: 12 },
    { id: 'r6', name: 'West 33rd Street', type: 'residential', points: [[-260, -55], [260, -55]], width: 10 },
    { id: 'r7', name: 'West 35th Street', type: 'residential', points: [[-260, 145], [260, 145]], width: 10 },
  ],
  water: [],
};

// 2. TOKYO SHINJUKU SKYSCRAPER DISTRICT, JAPAN
export const TOKYO_DATASET: UrbanDataset = {
  id: 'tokyo_shinjuku',
  name: 'Tokyo - Shinjuku Skyscraper Ward',
  description: 'Iconic futuristic high-rise district with Tokyo Metropolitan Government Building and Mode Gakuen Cocoon Tower.',
  center: [35.6896, 139.6917],
  radiusMeters: 500,
  bbox: [35.6860, 139.6870, 35.6930, 139.6960],
  source: 'Curated Preset',
  fetchedAt: '2026-10-26T00:00:00Z',
  buildings: [
    // Tokyo Metropolitan Gov Tower 1 (Twin Spire Tower)
    createBuilding(
      'tky-gov1',
      'Tokyo Metropolitan Government Building No. 1',
      'skyscraper',
      [
        [-45, -35], [45, -35], [45, 35], [-45, 35]
      ],
      243,
      48,
      'pyramidal',
      '2-8-1 Nishi-Shinjuku, Shinjuku City, Tokyo',
      { 'architect': 'Kenzo Tange', 'year': '1991' }
    ),
    // Tokyo Gov Tower 2
    createBuilding('tky-gov2', 'Tokyo Metropolitan Government Building No. 2', 'office', [[-120, -40], [-65, -40], [-65, 30], [-120, 30]], 163, 34, 'flat'),
    // Mode Gakuen Cocoon Tower
    createBuilding('tky-cocoon', 'Mode Gakuen Cocoon Tower', 'skyscraper', [[140, 60], [185, 45], [210, 85], [165, 115]], 204, 50, 'dome', '1-7-3 Nishi-Shinjuku'),
    // Shinjuku Park Tower
    createBuilding('tky-park', 'Shinjuku Park Tower', 'skyscraper', [[-40, -160], [40, -160], [40, -90], [-40, -90]], 235, 52, 'pyramidal'),
    // Tokyo Opera City
    createBuilding('tky-opera', 'Tokyo Opera City Tower', 'skyscraper', [[-160, -150], [-90, -150], [-90, -80], [-160, -80]], 234, 54, 'flat'),
    // Sompo Japan Building
    createBuilding('tky-sompo', 'Sompo Japan Building', 'office', [[60, 80], [115, 80], [115, 135], [60, 135]], 200, 43, 'mansard'),
    // Shinjuku Mitsui Building
    createBuilding('tky-mitsui', 'Shinjuku Mitsui Building', 'office', [[55, -25], [115, -25], [115, 35], [55, 35]], 225, 55, 'flat'),
    // Shinjuku Sumitomo Building
    createBuilding('tky-sumitomo', 'Shinjuku Sumitomo Building', 'office', [[60, -90], [115, -90], [115, -40], [60, -40]], 210, 52, 'flat'),
    // Shinjuku Nomura Building
    createBuilding('tky-nomura', 'Shinjuku Nomura Building', 'office', [[125, -20], [180, -20], [180, 35], [125, 35]], 209, 50, 'flat'),
    // Keio Plaza Hotel
    createBuilding('tky-keio', 'Keio Plaza Hotel Main Tower', 'commercial', [[-35, 55], [35, 55], [35, 125], [-35, 125]], 178, 47, 'flat'),
    // Hilton Tokyo
    createBuilding('tky-hilton', 'Hilton Tokyo High-Rise', 'commercial', [[-130, 55], [-75, 55], [-75, 120], [-130, 120]], 138, 38, 'flat'),
    // Odakyu Halc
    createBuilding('tky-odakyu', 'Shinjuku Station West Commercial Center', 'commercial', [[190, -80], [250, -80], [250, 20], [190, 20]], 65, 14, 'flat'),
  ],
  roads: [
    { id: 'tr1', name: 'Koshu-kaido Avenue', type: 'highway', points: [[-220, -200], [240, -200]], width: 18 },
    { id: 'tr2', name: 'Chuo-dori', type: 'primary', points: [[-220, 0], [240, 0]], width: 14 },
    { id: 'tr3', name: 'Ome-kaido', type: 'primary', points: [[-220, 150], [240, 150]], width: 16 },
    { id: 'tr4', name: 'Shinjuku Center Avenue', type: 'secondary', points: [[0, -220], [0, 220]], width: 14 },
    { id: 'tr5', name: 'West Park Avenue', type: 'secondary', points: [[-80, -220], [-80, 220]], width: 12 },
  ],
  water: [],
};

// 3. PARIS HISTORIC CORE & EIFFEL TOWER DISTRICT, FRANCE
export const PARIS_DATASET: UrbanDataset = {
  id: 'paris_eiffel',
  name: 'Paris - Eiffel Tower & Champ de Mars',
  description: 'Historic Parisian architecture, Seine river corridor, and Champ de Mars Haussmannian urban blocks.',
  center: [48.8584, 2.2945],
  radiusMeters: 500,
  bbox: [48.8540, 2.2890, 48.8620, 2.3000],
  source: 'Curated Preset',
  fetchedAt: '2026-10-26T00:00:00Z',
  buildings: [
    // Eiffel Tower (Central monument structure with 3 tiers)
    createBuilding(
      'par-eiffel',
      'Tour Eiffel (Eiffel Tower)',
      'monument',
      [
        [-35, -35], [35, -35], [35, 35], [-35, 35]
      ],
      330,
      3,
      'pyramidal',
      'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
      { 'architect': 'Gustave Eiffel', 'year': '1889', 'heritage': 'UNESCO World Heritage' }
    ),
    // Quai Branly Museum
    createBuilding('par-branly', 'Musée du Quai Branly - Jacques Chirac', 'civic', [[-120, 80], [-30, 95], [-20, 150], [-110, 140]], 24, 5, 'flat'),
    // Champ de Mars Haussmann Block 1
    createBuilding('par-h1', 'Avenue de la Bourdonnais Block A', 'residential', [[60, -40], [115, -40], [115, 30], [60, 30]], 28, 7, 'mansard'),
    // Champ de Mars Haussmann Block 2
    createBuilding('par-h2', 'Avenue de la Bourdonnais Block B', 'residential', [[65, 50], [120, 50], [120, 120], [65, 120]], 28, 7, 'mansard'),
    // Champ de Mars Haussmann Block 3
    createBuilding('par-h3', 'Avenue de la Bourdonnais Block C', 'residential', [[60, -130], [115, -130], [115, -60], [60, -60]], 28, 7, 'mansard'),
    // Avenue Gustave Eiffel West
    createBuilding('par-h4', 'Avenue de Suffren Historic Block A', 'residential', [[-125, -40], [-70, -40], [-70, 30], [-125, 30]], 26, 6, 'mansard'),
    // Avenue Gustave Eiffel West 2
    createBuilding('par-h5', 'Avenue de Suffren Historic Block B', 'residential', [[-130, 50], [-75, 50], [-75, 120], [-130, 120]], 26, 6, 'mansard'),
    // Avenue Gustave Eiffel West 3
    createBuilding('par-h6', 'Avenue de Suffren Historic Block C', 'residential', [[-125, -130], [-70, -130], [-70, -60], [-125, -60]], 26, 6, 'mansard'),
    // Pont d'Iéna Right Bank / Palais de Chaillot
    createBuilding('par-chaillot-l', 'Palais de Chaillot (Aile de Paris)', 'historic', [[-110, 210], [-45, 230], [-35, 275], [-100, 260]], 36, 6, 'mansard'),
    createBuilding('par-chaillot-r', 'Palais de Chaillot (Aile de Passy)', 'historic', [[45, 230], [110, 210], [100, 260], [35, 275]], 36, 6, 'mansard'),
    // Grand Palais Éphémère (South of Champ de Mars)
    createBuilding('par-ephemere', 'Grand Palais Éphémère', 'civic', [[-45, -230], [45, -230], [45, -170], [-45, -170]], 22, 3, 'dome'),
  ],
  roads: [
    { id: 'pr1', name: 'Quai Jacques Chirac', type: 'primary', points: [[-220, 160], [220, 160]], width: 14 },
    { id: 'pr2', name: 'Avenue de la Bourdonnais', type: 'secondary', points: [[45, -250], [45, 160]], width: 12 },
    { id: 'pr3', name: 'Avenue de Suffren', type: 'secondary', points: [[-55, -250], [-55, 160]], width: 12 },
    { id: 'pr4', name: 'Pont d’Iéna', type: 'primary', points: [[0, 150], [0, 250]], width: 14 },
    { id: 'pr5', name: 'Avenue Joseph Bouvard', type: 'secondary', points: [[-180, -90], [180, -90]], width: 12 },
  ],
  water: [
    {
      id: 'pw1',
      name: 'La Seine (River Seine)',
      polygon: [
        [-250, 165], [250, 165], [250, 230], [-250, 230]
      ],
    },
  ],
};

// 4. LONDON CITY & THE SHARD DISTRICT, UK
export const LONDON_DATASET: UrbanDataset = {
  id: 'london_shard',
  name: 'London - The Shard & Southwark Bridge',
  description: 'London skyline featuring Renzo Piano’s The Shard, London Bridge station, and the River Thames.',
  center: [51.5045, -0.0865],
  radiusMeters: 450,
  bbox: [51.5010, -0.0920, 51.5080, -0.0810],
  source: 'Curated Preset',
  fetchedAt: '2026-10-26T00:00:00Z',
  buildings: [
    // The Shard (Pyramidal glass skyscraper)
    createBuilding(
      'lon-shard',
      'The Shard (Shard London Bridge)',
      'skyscraper',
      [
        [-28, -28], [28, -28], [28, 28], [-28, 28]
      ],
      310,
      72,
      'pyramidal',
      '32 London Bridge St, London SE1 9SG',
      { 'architect': 'Renzo Piano', 'year': '2012' }
    ),
    // The News Building (Baby Shard)
    createBuilding('lon-baby', 'The News Building', 'office', [[-80, -30], [-35, -30], [-35, 30], [-80, 30]], 75, 17, 'flat'),
    // London Bridge Station Concourse
    createBuilding('lon-station', 'London Bridge Station Main Concourse', 'civic', [[-25, 40], [80, 40], [80, 110], [-25, 110]], 32, 4, 'flat'),
    // More London Riverside
    createBuilding('lon-more1', 'More London Riverside Office 1', 'office', [[75, 120], [130, 120], [130, 175], [75, 175]], 48, 11, 'flat'),
    // More London City Hall Old
    createBuilding('lon-cityhall', 'Former City Hall (Foster + Partners)', 'civic', [[145, 130], [195, 130], [195, 180], [145, 180]], 45, 10, 'dome'),
    // Southwark St Commercial Block
    createBuilding('lon-south1', 'Southwark Street Corporate', 'commercial', [[-120, -50], [-90, -50], [-90, 20], [-120, 20]], 52, 12, 'flat'),
    // Borough Market Historic Area
    createBuilding('lon-borough', 'Borough Market Historic Hall', 'historic', [[-140, 30], [-95, 30], [-95, 90], [-140, 90]], 22, 3, 'gabled'),
    // Southwark Cathedral
    createBuilding('lon-cathedral', 'Southwark Cathedral', 'historic', [[-130, 100], [-85, 100], [-85, 155], [-130, 155]], 49, 3, 'pyramidal'),
    // Guy's Hospital Tower
    createBuilding('lon-guys', 'Guy’s Hospital Tower Wing', 'civic', [[-35, -125], [35, -125], [35, -60], [-35, -60]], 143, 34, 'flat'),
    // Bermondsey St Residential Lofts
    createBuilding('lon-berm', 'Bermondsey Historic Warehouse Lofts', 'residential', [[70, -110], [140, -110], [140, -45], [70, -45]], 36, 8, 'mansard'),
  ],
  roads: [
    { id: 'lr1', name: 'London Bridge Approach / A3', type: 'primary', points: [[-50, 220], [-50, -180]], width: 14 },
    { id: 'lr2', name: 'Tooley Street', type: 'secondary', points: [[-180, 85], [200, 85]], width: 12 },
    { id: 'lr3', name: 'St Thomas Street', type: 'residential', points: [[-180, -35], [160, -35]], width: 10 },
    { id: 'lr4', name: 'Borough High Street', type: 'primary', points: [[-110, 200], [-110, -180]], width: 14 },
  ],
  water: [
    {
      id: 'lw1',
      name: 'River Thames',
      polygon: [
        [-250, 180], [250, 180], [250, 260], [-250, 260]
      ],
    },
  ],
};

// 5. DUBAI DOWNTOWN & BURJ KHALIFA, UAE
export const DUBAI_DATASET: UrbanDataset = {
  id: 'dubai_burj',
  name: 'Dubai - Downtown & Burj Khalifa',
  description: 'World’s tallest skyline featuring Burj Khalifa, Dubai Mall, and financial supertall skyscrapers.',
  center: [25.1972, 55.2744],
  radiusMeters: 550,
  bbox: [25.1930, 55.2700, 25.2020, 55.2790],
  source: 'Curated Preset',
  fetchedAt: '2026-10-26T00:00:00Z',
  buildings: [
    // Burj Khalifa (828m supertall with Y-shaped setbacks)
    createBuilding(
      'dxb-burj',
      'Burj Khalifa',
      'skyscraper',
      [
        [-30, -30], [30, -30], [30, 30], [-30, 30]
      ],
      828,
      163,
      'pyramidal',
      '1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai',
      { 'architect': 'Adrian Smith / SOM', 'year': '2010', 'record': 'World’s Tallest Building' }
    ),
    // Address Downtown
    createBuilding('dxb-address', 'Address Downtown Hotel & Residences', 'skyscraper', [[110, -70], [165, -70], [165, -15], [110, -15]], 302, 63, 'flat'),
    // Dubai Mall Fashion Avenue
    createBuilding('dxb-mall', 'The Dubai Mall Complex', 'commercial', [[70, 40], [220, 40], [220, 180], [70, 180]], 48, 5, 'flat'),
    // Burj Park Pavilion
    createBuilding('dxb-park', 'Burj Park Cultural Center', 'civic', [[-90, -90], [-40, -90], [-40, -40], [-90, -40]], 24, 3, 'dome'),
    // Boulevard Point Tower
    createBuilding('dxb-blvd', 'Boulevard Point High-Rise', 'residential', [[-140, 30], [-85, 30], [-85, 95], [-140, 95]], 240, 63, 'flat'),
    // The Residences Tower 1
    createBuilding('dxb-res1', 'The Residences Downtown Tower 1', 'residential', [[-130, -70], [-80, -70], [-80, -20], [-130, -20]], 150, 41, 'flat'),
    // Address Boulevard
    createBuilding('dxb-blvd2', 'The Address Boulevard', 'skyscraper', [[-40, 120], [25, 120], [25, 180], [-40, 180]], 368, 73, 'pyramidal'),
    // Emaar Square Office Building
    createBuilding('dxb-emaar', 'Emaar Square Corporate 1', 'office', [[-190, 110], [-135, 110], [-135, 170], [-190, 170]], 88, 20, 'flat'),
  ],
  roads: [
    { id: 'dr1', name: 'Sheikh Mohammed bin Rashid Blvd', type: 'primary', points: [[-220, -120], [-180, 140], [80, 200], [220, 50], [180, -140], [-220, -120]], width: 16 },
    { id: 'dr2', name: 'Financial Centre Road', type: 'highway', points: [[-240, 210], [240, 210]], width: 22 },
  ],
  water: [
    {
      id: 'dw1',
      name: 'Burj Khalifa Lake & Dubai Fountain',
      polygon: [
        [20, -80], [95, -80], [95, 30], [20, 30]
      ],
    },
  ],
};

// Map of all preset cities
export const PRESET_DATASETS: Record<string, UrbanDataset> = {
  manhattan_midtown: MANHATTAN_DATASET,
  tokyo_shinjuku: TOKYO_DATASET,
  paris_eiffel: PARIS_DATASET,
  london_shard: LONDON_DATASET,
  dubai_burj: DUBAI_DATASET,
};
