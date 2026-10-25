import React, { useRef, useEffect } from 'react';
import { CaneState } from '../types';

interface HapticOscilloscopeProps {
  caneState: CaneState;
  isBuzzerActive: boolean;
}

export const HapticOscilloscope: React.FC<HapticOscilloscopeProps> = ({
  caneState,
  isBuzzerActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformHistoryRef = useRef<number[]>(new Array(140).fill(0));

  useEffect(() => {
    let animId: number;

    const updateWave = () => {
      const now = Date.now();
      let currentSample = 0;

      if (caneState.isDropoffAlert) {
        // Drop-off: Long double pulse cycle (period ~600ms)
        const cycle = now % 650;
        if ((cycle >= 0 && cycle <= 170) || (cycle >= 240 && cycle <= 410)) {
          currentSample = 1.0;
        } else {
          currentSample = 0.0;
        }
      } else if (caneState.isOverheadAlert) {
        // Overhead: Fast staccato pulses, speed depends on proximity
        const dist = caneState.sensorA.filteredDistanceM || 2.0;
        // Frequency between 5 Hz (far) and 14 Hz (close)
        const periodMs = Math.max(70, Math.min(220, dist * 80));
        const cycle = now % periodMs;
        currentSample = cycle < periodMs * 0.55 ? 1.0 : 0.0;
      }

      // Shift history
      waveformHistoryRef.current.shift();
      waveformHistoryRef.current.push(currentSample);

      // Render oscilloscope
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const baselineY = h - 10;
          const activeY = 10;

          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          // Grid lines
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          // Waveform
          const history = waveformHistoryRef.current;
          const stepX = w / (history.length - 1);

          ctx.lineWidth = 2.2;
          ctx.strokeStyle = caneState.isDropoffAlert
            ? '#f59e0b' // Amber for drop-off
            : caneState.isOverheadAlert
            ? '#38bdf8' // Cyan for overhead
            : '#475569'; // Idle slate

          ctx.beginPath();
          for (let i = 0; i < history.length; i++) {
            const x = i * stepX;
            const y = baselineY - history[i] * (baselineY - activeY);
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              // Square wave transitions
              const prevY = baselineY - history[i - 1] * (baselineY - activeY);
              ctx.lineTo(x, prevY);
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();

          // Oscilloscope scanning head glow
          const headX = w - 2;
          const headVal = history[history.length - 1];
          const headY = baselineY - headVal * (baselineY - activeY);

          if (headVal > 0) {
            ctx.fillStyle = caneState.isDropoffAlert ? '#fbbf24' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(headX, headY, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(updateWave);
    };

    animId = requestAnimationFrame(updateWave);
    return () => cancelAnimationFrame(animId);
  }, [caneState]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Haptic Handle Motor & Audio Waveform
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              caneState.isDropoffAlert
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : caneState.isOverheadAlert
                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {caneState.isDropoffAlert
              ? 'DOUBLE-PULSE (DROP-OFF)'
              : caneState.isOverheadAlert
              ? 'STACCATO BURST (OVERHEAD)'
              : 'IDLE (CLEAR PATH)'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Buzzer: {isBuzzerActive ? 'ON' : 'MUTED'}</span>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={580}
          height={68}
          className="w-full h-16 rounded-lg block border border-slate-800"
        />

        {/* Oscilloscope timeline indicators */}
        <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">
          HIGH (MOTOR ON)
        </div>
        <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500">
          LOW (MOTOR OFF)
        </div>
        <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-500">
          REAL-TIME (20ms/div)
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 font-medium">Haptic Logic:</span>
          <span>
            {caneState.isDropoffAlert
              ? 'Heavy 2× thump warns visually impaired user of pavement edge or curb.'
              : caneState.isOverheadAlert
              ? 'Pulse frequency accelerates as obstacle draws closer to head.'
              : 'Continuous silent sweeping while path is obstacle-free.'}
          </span>
        </div>
      </div>
    </div>
  );
};
