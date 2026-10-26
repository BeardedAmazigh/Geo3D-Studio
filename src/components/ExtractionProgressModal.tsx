import React from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Layers,
  Map,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { UrbanDataset } from '../types';

export interface ExtractionProgressState {
  isOpen: boolean;
  percent: number;
  currentStepIndex: number;
  statusMessage: string;
  isComplete: boolean;
  error: string | null;
  datasetName: string;
  buildingsCount: number;
}

interface ExtractionProgressModalProps {
  progress: ExtractionProgressState;
  onOpenExportModal: () => void;
  onInspectIn3D: () => void;
  onClose: () => void;
  dataset: UrbanDataset | null;
}

export const ExtractionProgressModal: React.FC<ExtractionProgressModalProps> = ({
  progress,
  onOpenExportModal,
  onInspectIn3D,
  onClose,
  dataset,
}) => {
  const { t } = useTranslation();
  if (!progress.isOpen) return null;

  const steps = [
    {
      title: t.extractionStep1Title,
      desc: t.extractionStep1Desc,
    },
    {
      title: t.extractionStep2Title,
      desc: t.extractionStep2Desc,
    },
    {
      title: t.extractionStep3Title,
      desc: t.extractionStep3Desc,
    },
    {
      title: t.extractionStep4Title,
      desc: t.extractionStep4Desc,
    },
    {
      title: t.extractionStep5Title,
      desc: t.extractionStep5Desc,
    },
  ];

  const totalBuildings = dataset?.buildings.length || progress.buildingsCount;
  const maxHeight = dataset ? Math.max(...dataset.buildings.map(b => b.height), 0) : 0;
  const totalArea = dataset ? dataset.buildings.reduce((sum, b) => sum + b.areaMeters2, 0) : 0;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-850 bg-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border shadow-lg ${
              progress.isComplete
                ? 'bg-red-950/80 border-red-600 text-red-400 shadow-red-950/50'
                : 'bg-neutral-900 border-neutral-800 text-red-500'
            }`}>
              {progress.isComplete ? (
                <Sparkles className="w-5 h-5 text-red-400" />
              ) : (
                <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2">
                <span>{progress.isComplete ? t.extractionTitleComplete : t.extractionTitleLoading}</span>
                {progress.isComplete && (
                  <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {t.extractionReadyBadge}
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-xs">
                {progress.datasetName || 'Custom Geographic Zone'}
              </p>
            </div>
          </div>

          {progress.isComplete && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Main Charging Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs font-mono">
              <span className="text-neutral-400 font-medium truncate max-w-[280px]">
                {progress.statusMessage}
              </span>
              <span className="text-xl font-bold text-red-500 font-mono tracking-tight ml-2">
                {progress.percent}%
              </span>
            </div>

            {/* Glowing Red Progress Bar Track */}
            <div className="relative w-full h-3.5 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-700 via-red-600 to-rose-500 shadow-lg shadow-red-600/50 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(Math.max(progress.percent, 3), 100)}%` }}
              />
            </div>
          </div>

          {/* Steps Progress Checklist */}
          <div className="space-y-2.5 pt-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-semibold">
              Extraction Pipeline Stages
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => {
                const isStepDone = progress.currentStepIndex > idx || progress.isComplete;
                const isStepCurrent = progress.currentStepIndex === idx && !progress.isComplete;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition border ${
                      isStepCurrent
                        ? 'bg-neutral-900/90 border-red-600/60 shadow-md shadow-red-950/30'
                        : isStepDone
                        ? 'bg-neutral-900/40 border-neutral-850'
                        : 'bg-black/30 border-transparent opacity-50'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isStepDone ? (
                        <CheckCircle2 className="w-4 h-4 text-red-500" />
                      ) : isStepCurrent ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-700 flex items-center justify-center text-[9px] font-mono text-neutral-500">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <div className={`text-xs font-semibold ${
                        isStepCurrent ? 'text-red-300' : isStepDone ? 'text-neutral-200' : 'text-neutral-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 leading-snug truncate">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Readout when complete */}
          {progress.isComplete && totalBuildings > 0 && (
            <div className="p-3.5 rounded-2xl bg-black border border-neutral-800 grid grid-cols-3 gap-2 text-center animate-in fade-in duration-300">
              <div className="p-2 rounded-xl bg-neutral-900/70 border border-neutral-850">
                <span className="text-[10px] text-neutral-400 font-mono block">{t.statBuildings}</span>
                <span className="text-sm font-bold text-red-400 font-mono">{totalBuildings}</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900/70 border border-neutral-850">
                <span className="text-[10px] text-neutral-400 font-mono block">{t.statMaxHeight}</span>
                <span className="text-sm font-bold text-neutral-200 font-mono">
                  {maxHeight > 0 ? `${maxHeight.toFixed(0)}m` : 'N/A'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900/70 border border-neutral-850">
                <span className="text-[10px] text-neutral-400 font-mono block">{t.statFootprint}</span>
                <span className="text-sm font-bold text-neutral-200 font-mono">
                  {totalArea > 0 ? `${(totalArea / 1000).toFixed(0)}k m²` : 'Valid'}
                </span>
              </div>
            </div>
          )}

          {/* Error Message if any */}
          {progress.error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{progress.error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-850 bg-black flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {progress.isComplete ? (
            <>
              <button
                onClick={onInspectIn3D}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-red-400" />
                <span>{t.btnView3D}</span>
              </button>

              <button
                onClick={onOpenExportModal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs transition shadow-lg shadow-red-950 flex items-center justify-center gap-2 cursor-pointer border border-red-500/50"
              >
                <Download className="w-4 h-4" />
                <span>{t.btnExportFormats}</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-xs text-neutral-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>{t.progressSynthesizing}</span>
              </span>
              <span>{t.progressPleaseWait}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
