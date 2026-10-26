import React, { useState } from 'react';
import {
  Check,
  Code2,
  ExternalLink,
  Globe2,
  Info,
  Key,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

interface GoogleEarthBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleEarthBridgeModal: React.FC<GoogleEarthBridgeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-850 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-950/80 border border-red-800/80 text-red-400">
              <Globe2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">
                Google Earth 3D &amp; Cesium Tiles Bridge
              </h2>
              <p className="text-xs text-neutral-400">
                Photorealistic 3D Earth Databases &amp; OGC 3D Tiles Pipeline
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Architecture explainer */}
          <div className="p-4 rounded-xl bg-black border border-neutral-850 space-y-2">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold font-mono">
              <Sparkles className="w-4 h-4 text-red-500" />
              <span>HOW EARTH 3D EXTRACTION WORKS</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Google Earth and Cesium utilize the <strong>OGC 3D Tiles</strong> specification (hierarchical bounding volumes with <code>b3dm</code> and <code>glTF</code> payloads).
              Geo3D Studio combines <strong>photorealistic height elevation data</strong> with <strong>vectorized building footprint geometries</strong> to generate watertight, manifold CAD solids that open natively in AutoCAD, Revit, SketchUp, and Blender.
            </p>
          </div>

          {/* Integration options */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-300">
              Supported 3D Earth Providers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <span className="text-red-400 font-mono">01.</span> Google Maps Photorealistic 3D
                </div>
                <p className="text-neutral-400 text-[11px] mt-1 leading-snug">
                  High-fidelity 3D meshes reconstructed from Google Earth satellite imagery and aerial photogrammetry covering over 2,500 cities worldwide.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <span className="text-red-400 font-mono">02.</span> OpenStreetMap 3D / Overpass
                </div>
                <p className="text-neutral-400 text-[11px] mt-1 leading-snug">
                  Direct vectorized building footprints with height levels, roof shapes, and urban zoning tags. Enabled by default with zero API key required.
                </p>
              </div>
            </div>
          </div>

          {/* Optional API Key Input */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-red-500" />
                <span>Optional: Google Maps 3D Tiles / Cesium Ion Token</span>
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy... or Cesium Ion Token (Leave blank to use public live extractor)"
                className="w-full bg-black text-neutral-200 text-xs rounded-xl px-3.5 py-2.5 border border-neutral-800 outline-none focus:border-red-500 font-mono"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Geo3D Studio works immediately worldwide out of the box using our integrated Overpass &amp; Curated Metropolises engine.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs transition shadow-lg shadow-red-950 flex items-center gap-1.5 cursor-pointer"
              >
                {isSaved ? <Check className="w-4 h-4" /> : null}
                <span>{isSaved ? 'Saved Preferences!' : 'Apply Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
