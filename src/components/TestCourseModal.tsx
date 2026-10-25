import React from 'react';
import { CourseRunResult } from '../types';
import { CheckCircle2, XCircle, X, ArrowRight, ShieldCheck, Award } from 'lucide-react';

interface TestCourseModalProps {
  currentResult: CourseRunResult;
  previousResult: CourseRunResult | null;
  onClose: () => void;
  onRunAgain: () => void;
}

export const TestCourseModal: React.FC<TestCourseModalProps> = ({
  currentResult,
  previousResult,
  onClose,
  onRunAgain,
}) => {
  const currentMetrics = currentResult.metrics;
  const prevMetrics = previousResult?.metrics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Test Course Evaluation Report</h2>
              <p className="text-xs text-slate-400">
                Evaluation across 6 diverse outdoor mobility obstacles (30m track)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparative KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400">Overall Detection Score</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {currentMetrics.detections} / {currentResult.obstacleResults.length}
            </div>
            {prevMetrics && (
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                <span>Prev: {prevMetrics.detections}/6</span>
                <span
                  className={
                    currentMetrics.detections > prevMetrics.detections
                      ? 'text-emerald-400'
                      : currentMetrics.detections < prevMetrics.detections
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }
                >
                  ({currentMetrics.detections >= prevMetrics.detections ? '+' : ''}
                  {currentMetrics.detections - prevMetrics.detections})
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400">Missed Hazards</span>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
              {currentMetrics.missedDetections}
            </div>
            {prevMetrics && (
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                <span>Prev: {prevMetrics.missedDetections}</span>
                <span
                  className={
                    currentMetrics.missedDetections < prevMetrics.missedDetections
                      ? 'text-emerald-400'
                      : currentMetrics.missedDetections > prevMetrics.missedDetections
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }
                >
                  ({currentMetrics.missedDetections - prevMetrics.missedDetections > 0 ? '+' : ''}
                  {currentMetrics.missedDetections - prevMetrics.missedDetections})
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400">False Alarms</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {currentMetrics.falseAlarms}
            </div>
            {prevMetrics && (
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                <span>Prev: {prevMetrics.falseAlarms}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400">Avg Warning Reaction Time</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {currentMetrics.avgWarningTimeS > 0
                ? `${currentMetrics.avgWarningTimeS.toFixed(2)}s`
                : '---'}
            </div>
            {prevMetrics && (
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Prev: {prevMetrics.avgWarningTimeS.toFixed(2)}s
              </div>
            )}
          </div>
        </div>

        {/* Settings Comparison Banner (Current vs Previous) */}
        {previousResult && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-5 text-xs">
            <div className="font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Experiment Parameter Comparison</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block">Temperature Correction</span>
                <span className={currentResult.settingsSnapshot.tempCorrectionEnabled ? 'text-emerald-400' : 'text-rose-400'}>
                  Current: {currentResult.settingsSnapshot.tempCorrectionEnabled ? 'ON' : 'OFF'}
                </span>
                <span className="text-slate-500 block">
                  Prev: {previousResult.settingsSnapshot.tempCorrectionEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Median Filter (N)</span>
                <span className="text-cyan-400">
                  Current: N={currentResult.settingsSnapshot.filterWindowSizeN}
                </span>
                <span className="text-slate-500 block">
                  Prev: N={previousResult.settingsSnapshot.filterWindowSizeN}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Walking Speed</span>
                <span className="text-cyan-400">
                  Current: {currentResult.settingsSnapshot.walkingSpeed.toFixed(1)} m/s
                </span>
                <span className="text-slate-500 block">
                  Prev: {previousResult.settingsSnapshot.walkingSpeed.toFixed(1)} m/s
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Weather Scattering</span>
                <span className={currentResult.settingsSnapshot.rainWindEnabled ? 'text-amber-400' : 'text-slate-300'}>
                  Current: {currentResult.settingsSnapshot.rainWindEnabled ? 'Rain/Wind' : 'Clear'}
                </span>
                <span className="text-slate-500 block">
                  Prev: {previousResult.settingsSnapshot.rainWindEnabled ? 'Rain/Wind' : 'Clear'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Obstacle by Obstacle Breakdown Table */}
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Obstacle-by-Obstacle Analysis</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800 mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Obstacle Tested</th>
                <th className="px-3 py-2.5">Type & Reflectivity</th>
                <th className="px-3 py-2.5">Outcome</th>
                <th className="px-3 py-2.5">Detection Distance</th>
                <th className="px-3 py-2.5">Warning Buffer</th>
                <th className="px-3 py-2.5">Acoustic Physics Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {currentResult.obstacleResults.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-sans font-medium text-slate-200">
                    {item.obstacle.name}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-400">
                    ρ = {item.obstacle.reflectivity}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.status === 'detected' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> DETECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> MISSED
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.detectionDistanceM > 0 ? `${item.detectionDistanceM.toFixed(2)}m` : '---'}
                  </td>
                  <td className="px-3 py-2.5 text-cyan-400">
                    {item.warningTimeS > 0 ? `${item.warningTimeS.toFixed(2)}s` : '0.00s (Collision)'}
                  </td>
                  <td className="px-3 py-2.5 font-sans text-[11px] text-slate-400">
                    {item.obstacle.type === 'glass_panel'
                      ? 'Specular deflection: smooth flat glass reflects sound wave away from transducer.'
                      : item.obstacle.type === 'soft_surface'
                      ? 'Acoustic absorption: fabric attenuates sound energy below threshold.'
                      : item.obstacle.type === 'thin_pole'
                      ? 'Small cross-section: cylindrical scatter causes low echo strength.'
                      : item.obstacle.type === 'drop_off'
                      ? 'Sensor B detects sudden ground distance jump or void.'
                      : 'Sensor A intercepts head-height obstruction.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close Report
          </button>
          <button
            onClick={onRunAgain}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md"
          >
            <span>Change Settings & Re-run Test</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
