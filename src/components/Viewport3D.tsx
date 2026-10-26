import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Building3D, CameraViewPreset, RenderMode, UrbanDataset } from '../types';
import { createMergedDatasetGeometry, TYPOLOGY_COLORS, buildBuildingGeometry } from '../services/geometryBuilder';

interface Viewport3DProps {
  dataset: UrbanDataset | null;
  renderMode: RenderMode;
  cameraPreset: CameraViewPreset;
  solarTime: number; // 0 to 24 hours
  showRoads: boolean;
  showWater: boolean;
  showWireframe: boolean;
  heightMultiplier: number;
  selectedBuilding: Building3D | null;
  onSelectBuilding: (building: Building3D | null) => void;
  measureMode: boolean;
  onMeasureDistance?: (distanceMeters: number | null) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  dataset,
  renderMode,
  cameraPreset,
  solarTime,
  showRoads,
  showWater,
  showWireframe,
  heightMultiplier,
  selectedBuilding,
  onSelectBuilding,
  measureMode,
  onMeasureDistance,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mainMeshRef = useRef<THREE.Mesh | null>(null);
  const wireMeshRef = useRef<THREE.LineSegments | null>(null);
  const selectionHighlightRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const groundGroupRef = useRef<THREE.Group | null>(null);
  const measurePointsRef = useRef<THREE.Vector3[]>([]);
  const measureGroupRef = useRef<THREE.Group | null>(null);

  const [hoveredBuilding, setHoveredBuilding] = useState<Building3D | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Software WebGL Guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050507'); // Obsidian black
    scene.fog = new THREE.FogExp2('#050507', 0.0008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 8000);
    camera.position.set(350, 280, 450);
    cameraRef.current = camera;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't clip through ground
    controls.minDistance = 15;
    controls.maxDistance = 3500;
    controls.target.set(0, 20, 0);
    controlsRef.current = controls;

    // 5. Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Lighting Rig (Warm key sun + Cool sky hemisphere)
    const hemiLight = new THREE.HemisphereLight('#f4f4f5', '#09090b', 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.8);
    sunLight.position.set(300, 500, 250);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1800;
    const shadowD = 600;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 7. Ground Plane and Grid
    const groundGroup = new THREE.Group();
    const groundGeo = new THREE.PlaneGeometry(3500, 3500);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#08080a',
      roughness: 0.9,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = !isSoftwareGl;
    groundGroup.add(groundMesh);

    // CAD Grid with crimson red center axis lines
    const gridHelper = new THREE.GridHelper(1800, 72, '#ef4444', '#1f1f23');
    gridHelper.position.y = 0.02;
    groundGroup.add(gridHelper);

    scene.add(groundGroup);
    groundGroupRef.current = groundGroup;

    // 8. Selection & Measurement groups
    const selGroup = new THREE.Group();
    scene.add(selGroup);
    selectionHighlightRef.current = selGroup;

    const measureGroup = new THREE.Group();
    scene.add(measureGroup);
    measureGroupRef.current = measureGroup;

    // Animation Loop
    let animId = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
    };
  }, []);

  // Update Building Geometry when dataset, renderMode, or heightMultiplier changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up existing meshes
    if (mainMeshRef.current) {
      scene.remove(mainMeshRef.current);
      mainMeshRef.current.geometry.dispose();
      (mainMeshRef.current.material as THREE.Material).dispose();
      mainMeshRef.current = null;
    }
    if (wireMeshRef.current) {
      scene.remove(wireMeshRef.current);
      wireMeshRef.current.geometry.dispose();
      (wireMeshRef.current.material as THREE.Material).dispose();
      wireMeshRef.current = null;
    }

    if (!dataset || dataset.buildings.length === 0) return;

    // Find max height for heatmap scaling
    const maxHeight = Math.max(...dataset.buildings.map(b => b.height), 50);

    // Create merged geometry
    const geometry = createMergedDatasetGeometry(
      dataset.buildings,
      renderMode,
      maxHeight,
      heightMultiplier
    );

    // Material setup
    let material: THREE.Material;
    if (renderMode === 'cad') {
      material = new THREE.MeshBasicMaterial({
        color: '#0f172a',
        wireframe: false,
      });
    } else if (renderMode === 'clay') {
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
      });
    } else if (renderMode === 'textured') {
      // Create architectural facade procedural shader / material
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.25,
        metalness: 0.65,
        flatShading: true,
      });
    } else if (renderMode === 'night') {
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.6,
        metalness: 0.3,
        emissive: new THREE.Color('#0284c7'),
        emissiveIntensity: 0.15,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.5,
        metalness: 0.15,
        flatShading: true,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    mainMeshRef.current = mesh;

    // Wireframe overlay if enabled or in CAD mode
    if (showWireframe || renderMode === 'cad') {
      const wireGeo = new THREE.WireframeGeometry(geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: renderMode === 'cad' ? '#ef4444' : '#52525b',
        linewidth: 1,
        transparent: true,
        opacity: renderMode === 'cad' ? 0.9 : 0.45,
      });
      const wire = new THREE.LineSegments(wireGeo, wireMat);
      scene.add(wire);
      wireMeshRef.current = wire;
    }

    // Center camera on dataset bounding sphere
    if (geometry.boundingSphere && controlsRef.current && cameraRef.current) {
      const bs = geometry.boundingSphere;
      controlsRef.current.target.set(bs.center.x, Math.min(bs.center.y, 40), bs.center.z);
      const dist = Math.max(bs.radius * 2.2, 180);
      cameraRef.current.position.set(bs.center.x + dist * 0.8, dist * 0.7, bs.center.z + dist * 0.8);
      controlsRef.current.update();
    }
  }, [dataset, renderMode, heightMultiplier, showWireframe]);

  // Update Road and Water layers
  useEffect(() => {
    const groundGroup = groundGroupRef.current;
    if (!groundGroup || !dataset) return;

    // Clear previous contextual children except base ground & grid
    while (groundGroup.children.length > 2) {
      const child = groundGroup.children[groundGroup.children.length - 1];
      groundGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }

    // Roads
    if (showRoads && dataset.roads) {
      const roadMat = new THREE.LineBasicMaterial({
        color: '#64748b',
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });
      for (const road of dataset.roads) {
        if (road.points.length < 2) continue;
        const pts = road.points.map(p => new THREE.Vector3(p[0], 0.05, -p[1]));
        const roadGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const roadLine = new THREE.Line(roadGeo, roadMat);
        groundGroup.add(roadLine);
      }
    }

    // Water
    if (showWater && dataset.water) {
      const waterMat = new THREE.MeshStandardMaterial({
        color: '#0284c7',
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.75,
      });
      for (const w of dataset.water) {
        if (w.polygon.length < 3) continue;
        const shape = new THREE.Shape();
        shape.moveTo(w.polygon[0][0], -w.polygon[0][1]);
        for (let i = 1; i < w.polygon.length; i++) {
          shape.lineTo(w.polygon[i][0], -w.polygon[i][1]);
        }
        const waterGeo = new THREE.ShapeGeometry(shape);
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.y = 0.02;
        groundGroup.add(waterMesh);
      }
    }
  }, [dataset, showRoads, showWater]);

  // Update Sun Direction & Color based on Solar Time (0 to 24)
  useEffect(() => {
    if (!sunLightRef.current || !sceneRef.current) return;
    const sun = sunLightRef.current;
    // Map hour to solar elevation & azimuth
    const hourAngle = ((solarTime - 12) / 12) * Math.PI; // -PI at 0h, 0 at 12h, PI at 24h
    const sunAltitude = Math.sin((solarTime / 24) * Math.PI); // Peak at noon

    if (solarTime < 5.5 || solarTime > 19.5) {
      // Night
      sun.intensity = 0.15;
      sun.color.set('#38bdf8');
      sun.position.set(0, -100, 0);
      sceneRef.current.background = new THREE.Color('#050811');
      if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).color.set('#050811');
    } else {
      // Daytime / Sunset
      const isGoldenHour = solarTime < 7.5 || solarTime > 17.5;
      sun.intensity = isGoldenHour ? 1.4 : 2.0;
      sun.color.set(isGoldenHour ? '#f59e0b' : '#fffbeb');
      const radius = 600;
      sun.position.set(
        Math.sin(hourAngle) * radius,
        Math.max(sunAltitude * 650, 40),
        Math.cos(hourAngle) * radius
      );
      sceneRef.current.background = new THREE.Color(isGoldenHour ? '#0d131f' : '#0b0f17');
      if (sceneRef.current.fog) {
        (sceneRef.current.fog as THREE.FogExp2).color.set(isGoldenHour ? '#0d131f' : '#0b0f17');
      }
    }
  }, [solarTime]);

  // Camera Presets
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !mainMeshRef.current) return;
    const target = controlsRef.current.target;
    const cam = cameraRef.current;
    const dist = 550;

    switch (cameraPreset) {
      case 'top':
        cam.position.set(target.x, target.y + dist * 1.5, target.z + 0.001);
        break;
      case 'front':
        cam.position.set(target.x, target.y + 120, target.z + dist);
        break;
      case 'side':
        cam.position.set(target.x + dist, target.y + 120, target.z);
        break;
      case 'isometric':
        cam.position.set(target.x + dist * 0.8, target.y + dist * 0.7, target.z + dist * 0.8);
        break;
      case 'perspective':
      default:
        cam.position.set(target.x + dist * 0.7, target.y + dist * 0.5, target.z + dist * 0.7);
        break;
    }
    controlsRef.current.update();
  }, [cameraPreset]);

  // Highlight Selected Building
  useEffect(() => {
    const selGroup = selectionHighlightRef.current;
    if (!selGroup) return;

    // Clear previous selection highlight
    while (selGroup.children.length > 0) {
      const child = selGroup.children[0];
      selGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }

    if (!selectedBuilding) return;

    // Build highlighted mesh for this single building
    const meshData = buildBuildingGeometry(selectedBuilding, heightMultiplier);
    if (meshData.positions.length === 0) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(meshData.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3));
    geo.setIndex(meshData.indices);

    // Glowing red outline wireframe and rim
    const wireMat = new THREE.LineBasicMaterial({
      color: '#ef4444',
      linewidth: 3,
    });
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireMat);
    wire.position.y += 0.05;
    selGroup.add(wire);

    // Footprint perimeter ring on ground
    const fpPts = selectedBuilding.footprint.map(p => new THREE.Vector3(p[0], 0.2, -p[1]));
    if (fpPts.length > 2) {
      fpPts.push(fpPts[0].clone()); // Close loop
      const fpGeo = new THREE.BufferGeometry().setFromPoints(fpPts);
      const fpMat = new THREE.LineBasicMaterial({ color: '#f87171', linewidth: 3 });
      const fpLine = new THREE.Line(fpGeo, fpMat);
      selGroup.add(fpLine);
    }
  }, [selectedBuilding, heightMultiplier]);

  // Click & Hover Raycasting
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!mountRef.current || !cameraRef.current || !dataset) return;
    const rect = mountRef.current.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    if (measureMode) {
      // Measurement raycasting onto ground or buildings
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane, hitPoint);
      if (hitPoint) {
        const pts = measurePointsRef.current;
        if (pts.length >= 2) pts.length = 0;
        pts.push(hitPoint.clone());

        // Update measure visual
        if (measureGroupRef.current) {
          measureGroupRef.current.clear();
          if (pts.length === 2) {
            const dist = pts[0].distanceTo(pts[1]);
            onMeasureDistance?.(dist);

            const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineDashedMaterial({
              color: '#ef4444',
              dashSize: 3,
              gapSize: 1,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            measureGroupRef.current.add(line);
          } else {
            onMeasureDistance?.(null);
          }
        }
      }
      return;
    }

    // Find closest building to raycast hit point
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitGround = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(plane, hitGround);

    if (hitGround) {
      let closest: Building3D | null = null;
      let minDist = 30; // within 30 meters
      for (const b of dataset.buildings) {
        const dx = b.centerMetric[0] - hitGround.x;
        const dz = b.centerMetric[1] - (-hitGround.z);
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minDist) {
          minDist = d;
          closest = b;
        }
      }
      onSelectBuilding(closest);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-black">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
      />

      {/* Floating Compass / Orientation widget */}
      <div className="absolute top-4 right-4 z-[100] pointer-events-none flex flex-col items-center justify-center p-2 rounded-lg bg-black/90 backdrop-blur border border-neutral-800 shadow-xl text-[10px] font-mono text-neutral-300">
        <span className="text-red-500 font-bold mb-1">N ↑</span>
        <div className="w-6 h-6 rounded-full border border-neutral-700 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
        </div>
        <span className="text-[9px] text-neutral-500 mt-1">CAD 3D</span>
      </div>

      {/* Measure readout banner */}
      {measureMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-red-600 text-white font-semibold text-xs tracking-wide shadow-xl shadow-red-950 flex items-center gap-2">
          <span>📐 Measurement Tool: Click 2 points on the ground/map</span>
        </div>
      )}
    </div>
  );
};
