import React, { useRef, useEffect, useState } from 'react';
import { TelemetryPoint, SimulationSettings } from '../types';

interface LiveTelemetryChartProps {
  telemetryData: TelemetryPoint[];
  settings: SimulationSettings;
  baselineDownwardDistance: number;
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({
  telemetryData,
  settings,
  baselineDownwardDistance,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeChannel, setActiveChannel] = useState<'both' | 'downward' | 'upward'>('both');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 28;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Max distance range on Y-axis (0m to 4.0m)
    const yMax = 4.0;
    const yMin = 0.0;
    const toY = (distM: number) => {
      const clamped = Math.max(yMin, Math.min(yMax, distM));
      return paddingTop + chartH * (1 - (clamped - yMin) / (yMax - yMin));
    };

    // Horizontal Grid Lines & Y-axis labels
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    for (let d = 0; d <= 4.0; d += 1.0) {
      const y = toY(d);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      ctx.fillText(`${d.toFixed(1)}m`, paddingLeft - 6, y + 3);
    }

    // Downward Baseline line and Drop-off threshold zone
    if (activeChannel === 'both' || activeChannel === 'downward') {
      const yBaseline = toY(baselineDownwardDistance);
      const yThreshold = toY(baselineDownwardDistance + settings.dropoffThresholdM);

      // Baseline reference
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yBaseline);
      ctx.lineTo(width - paddingRight, yBaseline);
      ctx.stroke();

      // Drop-off trigger line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yThreshold);
      ctx.lineTo(width - paddingRight, yThreshold);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Drop-off Trigger (${(baselineDownwardDistance + settings.dropoffThresholdM).toFixed(2)}m)`, paddingLeft + 6, yThreshold - 4);
    }

    if (telemetryData.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting sensor telemetry data...', width / 2, height / 2);
      return;
    }

    // X coordinates: last N points mapped across chartW
    const pointsCount = telemetryData.length;
    const toX = (index: number) => paddingLeft + (index / (pointsCount - 1)) * chartW;

    // 1. Draw Downward Sensor Data (Amber)
    if (activeChannel === 'both' || activeChannel === 'downward') {
      // Raw Downward distance (Translucent dashed line & points)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pointsCount; i++) {
        const val = telemetryData[i].rawDown;
        if (val !== null) {
          const x = toX(i);
          const y = toY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          started = false; // Break continuous line if pulse was dropped
        }
      }
      ctx.stroke();

      // Filtered Downward distance (Solid Amber line)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      started = false;
      for (let i = 0; i < pointsCount; i++) {
        const val = telemetryData[i].filteredDown;
        if (val !== null) {
          const x = toX(i);
          const y = toY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }

    // 2. Draw Upward Sensor Data (Cyan)
    if (activeChannel === 'both' || activeChannel === 'upward') {
      // Raw Upward distance
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pointsCount; i++) {
        const val = telemetryData[i].rawUp;
        if (val !== null) {
          const x = toX(i);
          const y = toY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();

      // Filtered Upward distance (Solid Cyan line)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      started = false;
      for (let i = 0; i < pointsCount; i++) {
        const val = telemetryData[i].filteredUp;
        if (val !== null) {
          const x = toX(i);
          const y = toY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }

    // Time axis label
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← Previous Samples (Sliding Window: 10s) · Recent Real-time Readings →', paddingLeft + chartW / 2, height - 8);
  }, [telemetryData, settings, baselineDownwardDistance, activeChannel]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Live Telemetry: Raw vs. Filtered Distance
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Median Filter (N = {settings.filterWindowSizeN})
          </span>
        </div>

        {/* Channel Filter Selector */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-800/80 rounded-lg text-xs">
          <button
            onClick={() => setActiveChannel('both')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeChannel === 'both' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Beams
          </button>
          <button
            onClick={() => setActiveChannel('upward')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeChannel === 'upward' ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upward (Sensor A)
          </button>
          <button
            onClick={() => setActiveChannel('downward')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeChannel === 'downward' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Downward (Sensor B)
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="w-full h-44 rounded-lg block border border-slate-800/70"
      />

      {/* Legend & Telemetry stats */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-2 px-1 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-400 inline-block"></span>
            <span>Upward Filtered</span>
            <span className="w-3 h-0.5 border-b border-dashed border-sky-400/50 inline-block"></span>
            <span className="text-slate-500">Raw</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 inline-block"></span>
            <span>Downward Filtered</span>
            <span className="w-3 h-0.5 border-b border-dashed border-amber-400/50 inline-block"></span>
            <span className="text-slate-500">Raw</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>
            Up: {telemetryData[telemetryData.length - 1]?.filteredUp?.toFixed(2) ?? '---'}m
          </span>
          <span>·</span>
          <span>
            Down: {telemetryData[telemetryData.length - 1]?.filteredDown?.toFixed(2) ?? '---'}m
          </span>
        </div>
      </div>
    </div>
  );
};
