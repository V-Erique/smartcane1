import React from 'react';
import { X, BookOpen, Waves, Thermometer, Sliders, ShieldAlert } from 'lucide-react';

interface HowItWorksModalProps {
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                How It Works: Ultrasonic Sensing & Smart Cane Physics
              </h2>
              <p className="text-xs text-slate-400">
                Educational engineering guide for students, researchers, and developers
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

        {/* Content Sections */}
        <div className="space-y-6 my-5 text-sm text-slate-300 leading-relaxed overflow-y-auto max-h-[68vh] pr-2">
          {/* Section 1 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
              <Waves className="w-4 h-4" />
              <span>1. The Time-of-Flight (ToF) Ultrasonic Equation</span>
            </div>
            <p className="text-xs text-slate-300 mb-2">
              Ultrasonic sensors emit high-frequency acoustic bursts (typically 40 kHz, above human hearing).
              The acoustic pulse propagates through air, reflects off a surface, and returns to the transducer:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-center text-cyan-300 my-2">
              Distance (d) = [ v(T) · t_echo ] / 2
            </div>
            <p className="text-xs text-slate-400">
              Because sound travels to the obstacle and back, the total distance traveled is 2d, requiring division by 2.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
              <Thermometer className="w-4 h-4" />
              <span>2. Speed of Sound & Temperature Compensation</span>
            </div>
            <p className="text-xs text-slate-300 mb-2">
              The speed of sound in air varies with temperature due to air density and molecular kinetic energy:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-center text-amber-300 my-2">
              v(T) = 331.3 + 0.606 · T (in °C)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs text-slate-300 mt-3">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Freezing Winter (0°C)</span>
                <span className="text-cyan-400 font-bold">v = 331.3 m/s</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Sound moves ~3.5% slower</p>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Room Temp (20°C)</span>
                <span className="text-slate-200 font-bold">v = 343.4 m/s</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Standard baseline</p>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Hot Summer (40°C)</span>
                <span className="text-rose-400 font-bold">v = 355.5 m/s</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Sound moves ~3.6% faster</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              <strong>Why it matters:</strong> If a smart cane assumes a constant 343 m/s on a 40°C pavement,
              it under-calculates obstacle distances by ~3.6%. In high-speed walking, this robs the user of valuable stopping buffer!
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>3. Surface Reflectivity (ρ) & Specular Reflection Hazards</span>
            </div>
            <p className="text-xs text-slate-300 mb-2">
              Unlike optical lidar which scatters diffusely on most objects, 40 kHz ultrasound wavelengths (~8.5 mm) behave like light on mirrors:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5">
              <li>
                <strong className="text-slate-200">Glass Panels (ρ = 0.1):</strong> Ultra-smooth glass acts as an acoustic specular mirror. Unless the cane points perpendicularly at exactly 90°, the sound beam reflects away into the sky, resulting in complete echo loss and collision danger!
              </li>
              <li>
                <strong className="text-slate-200">Soft Clothing / Angled Foam (ρ = 0.3):</strong> Porous fabric absorbs acoustic energy into friction within air pockets, severely attenuating the return echo.
              </li>
              <li>
                <strong className="text-slate-200">Thin Poles (ρ = 0.4):</strong> Narrow cylindrical cross-section causes sound waves to diffract around the pole rather than reflect back.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
              <Sliders className="w-4 h-4" />
              <span>4. Digital Signal Processing: Median Filter Despiking</span>
            </div>
            <p className="text-xs text-slate-300 mb-2">
              Ultrasonic sensors frequently suffer from single-pulse dropouts (missed echo = infinite distance) or noise spikes.
              If an raw threshold is used, a single dropped sample over normal ground would falsely trigger a <em>Drop-off Alert</em>!
            </p>
            <p className="text-xs text-slate-300">
              The cane passes readings through a sliding <strong>Median Filter</strong> of length N:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-300 my-2">
              Raw Samples: [1.22m, 1.25m, null (dropped), 1.23m, 1.24m] → Filtered: 1.235m
            </div>
            <p className="text-xs text-slate-400">
              <strong>Latency Trade-off:</strong> A larger filter size N eliminates false alarms, but introduces a phase delay of <code className="text-cyan-300">(N - 1) / (2 · f_s)</code>. At 1.5 m/s, excessive delay could mean the user steps into the pit before the haptic motor vibrates!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            Got it, Back to Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
