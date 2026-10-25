import React from 'react';
import { RunMetrics, DetectionEvent } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, Download, Trash2 } from 'lucide-react';

interface MetricsAndLogProps {
  metrics: RunMetrics;
  eventLogs: DetectionEvent[];
  onClearLogs: () => void;
}

export const MetricsAndLog: React.FC<MetricsAndLogProps> = ({
  metrics,
  eventLogs,
  onClearLogs,
}) => {
  const handleExportCSV = () => {
    if (eventLogs.length === 0) return;
    const headers = ['Timestamp', 'WalkerX (m)', 'Obstacle', 'Type', 'Status', 'Detection Dist (m)', 'Warning Time (s)', 'Sensor', 'Note'];
    const rows = eventLogs.map((e) => [
      new Date(e.timestamp).toLocaleTimeString(),
      e.walkerX.toFixed(2),
      `"${e.obstacleName}"`,
      e.obstacleType,
      e.status,
      e.detectionDistanceM.toFixed(2),
      e.warningTimeS.toFixed(2),
      e.sensorUsed,
      `"${e.note}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart_cane_experiment_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-4">
      {/* 1. Metrics KPI Cards Strip */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Mobility Safety Metrics & Telemetry Log
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleExportCSV}
            disabled={eventLogs.length === 0}
            className="flex items-center gap-1 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <span className="text-slate-600">·</span>
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Detections (True Positives) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Detections</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {metrics.detections}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">True Positives</div>
        </div>

        {/* Missed Detections (False Negatives - Critical Danger) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Missed</span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {metrics.missedDetections}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Collision Hazards</div>
        </div>

        {/* False Alarms (False Positives) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>False Alarms</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {metrics.falseAlarms}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Spurious Triggers</div>
        </div>

        {/* Avg Detection Distance */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Avg Distance</span>
            <span className="text-slate-500 text-[10px] font-mono">m</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {metrics.avgDetectionDistanceM > 0 ? `${metrics.avgDetectionDistanceM.toFixed(2)}m` : '---'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Advance Buffer</div>
        </div>

        {/* Warning Time before Collision */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Warning Time</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {metrics.avgWarningTimeS > 0 ? `${metrics.avgWarningTimeS.toFixed(2)}s` : '---'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Reaction Buffer</div>
        </div>

        {/* Accuracy Rate */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Reliability</span>
            <span className="text-slate-500 text-[10px] font-mono">%</span>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
            {metrics.totalObstaclesEncountered > 0
              ? `${metrics.accuracyRate.toFixed(0)}%`
              : '100%'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Safety Index</div>
        </div>
      </div>

      {/* 2. Short Log Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
            <tr>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Obstacle / Event</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Distance</th>
              <th className="px-3 py-2">Warn Time (t_w)</th>
              <th className="px-3 py-2">Sensor</th>
              <th className="px-3 py-2">Acoustic Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {eventLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500 font-sans">
                  No detection events logged yet. Walk towards obstacles or start the Test Course.
                </td>
              </tr>
            ) : (
              eventLogs.slice(-8).reverse().map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 text-slate-400">{log.walkerX.toFixed(1)}m</td>
                  <td className="px-3 py-2 font-sans font-medium text-slate-200">
                    {log.obstacleName}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'detected'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : log.status === 'missed'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {log.status === 'detected'
                        ? 'DETECTED'
                        : log.status === 'missed'
                        ? 'MISSED'
                        : 'FALSE ALARM'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {log.detectionDistanceM > 0 ? `${log.detectionDistanceM.toFixed(2)}m` : '---'}
                  </td>
                  <td className="px-3 py-2 text-cyan-400">
                    {log.warningTimeS > 0 ? `${log.warningTimeS.toFixed(2)}s` : '---'}
                  </td>
                  <td className="px-3 py-2 text-slate-400 font-sans text-[11px]">
                    {log.sensorUsed}
                  </td>
                  <td className="px-3 py-2 text-slate-400 font-sans text-[11px] truncate max-w-xs">
                    {log.note}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
