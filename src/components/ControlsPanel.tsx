import React from 'react';
import { SimulationSettings, ObstacleType, CaneState } from '../types';
import { calculateSpeedOfSound, ASSUMED_ROOM_TEMP_SPEED } from '../physics/acoustics';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Flag, 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Thermometer, 
  Activity, 
  Sliders, 
  PlusCircle, 
  Layers,
  Sparkles
} from 'lucide-react';

interface ControlsPanelProps {
  settings: SimulationSettings;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  caneState: CaneState;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetWalk: () => void;
  onRunTestCourse: () => void;
  selectedObstacleTypeForPlacement: ObstacleType | null;
  onSelectObstacleTypeForPlacement: (type: ObstacleType | null) => void;
  onClearObstacles: () => void;
  onOpenHowItWorks: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  settings,
  onUpdateSettings,
  caneState,
  isPlaying,
  onTogglePlay,
  onResetWalk,
  onRunTestCourse,
  selectedObstacleTypeForPlacement,
  onSelectObstacleTypeForPlacement,
  onClearObstacles,
  onOpenHowItWorks,
}) => {
  const trueSpeed = calculateSpeedOfSound(settings.temperatureC);
  const assumedSpeed = settings.tempCorrectionEnabled ? trueSpeed : ASSUMED_ROOM_TEMP_SPEED;
  const speedErrorPercent = ((assumedSpeed - trueSpeed) / trueSpeed) * 100;

  // Obstacle Palette items
  const obstaclePalette: {
    type: ObstacleType;
    label: string;
    reflectivity: number;
    description: string;
  }[] = [
    {
      type: 'overhead_branch',
      label: 'Head-Level Branch',
      reflectivity: 1.0,
      description: 'Hanging tree branch at 1.7m (head level)',
    },
    {
      type: 'overhead_sign',
      label: 'Overhead Signboard',
      reflectivity: 1.0,
      description: 'Metal shop sign at head level',
    },
    {
      type: 'drop_off',
      label: 'Curb Drop-off / Pit',
      reflectivity: 0.9,
      description: 'Step-down edge (0.4m depth)',
    },
    {
      type: 'thin_pole',
      label: 'Thin Pole / Post',
      reflectivity: 0.4,
      description: 'Narrow signpost (weak echo area)',
    },
    {
      type: 'glass_panel',
      label: 'Glass Bus Shelter',
      reflectivity: 0.1,
      description: 'Specular reflector (high miss rate)',
    },
    {
      type: 'soft_surface',
      label: 'Soft Coat / Angled Wall',
      reflectivity: 0.3,
      description: 'Sound-absorbing fabric / slant',
    },
    {
      type: 'low_obstacle',
      label: 'Low Obstacle (Rock)',
      reflectivity: 0.9,
      description: 'Ground curb or trip block',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Main Transport Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start Walk
                </>
              )}
            </button>

            <button
              onClick={onResetWalk}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" /> Reset Pos
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRunTestCourse}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <Flag className="w-4 h-4" /> Run Test Course (6 Obstacles)
            </button>

            <button
              onClick={onOpenHowItWorks}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-sm font-medium transition-colors border border-cyan-800/60"
            >
              <Sparkles className="w-4 h-4" /> How It Works
            </button>
          </div>
        </div>
      </div>

      {/* 2. Physics & Ambient Environment Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Acoustic Physics & Environmental Conditions
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">v_true:</span>
            <span className="text-emerald-400 font-semibold">{trueSpeed.toFixed(1)} m/s</span>
          </div>
        </div>

        {/* Live Equation Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 mb-3 text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span>Speed of Sound Formula:</span>
            <span className="text-cyan-300">v = 331.3 + 0.606 · T</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Distance Calculation:</span>
            <span className="text-cyan-300">d = (v_assumed · t_echo) / 2</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">
              Assumed Speed ({settings.tempCorrectionEnabled ? 'Compensated' : 'Fixed 20°C'}):
            </span>
            <span className={settings.tempCorrectionEnabled ? 'text-emerald-400' : 'text-amber-400'}>
              {assumedSpeed.toFixed(1)} m/s
              {!settings.tempCorrectionEnabled && (
                <span className="ml-1 text-slate-400">
                  (Error: {speedErrorPercent > 0 ? '+' : ''}{speedErrorPercent.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Temperature Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Ambient Temperature (T)</span>
              <span className="text-cyan-400 font-mono font-semibold">{settings.temperatureC}°C</span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="1"
              value={settings.temperatureC}
              onChange={(e) => onUpdateSettings({ temperatureC: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0°C (Freezing winter)</span>
              <span>20°C (Standard)</span>
              <span>45°C (Desert summer)</span>
            </div>
          </div>

          {/* Walking Speed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Walking Speed</span>
              <span className="text-cyan-400 font-mono font-semibold">
                {settings.walkingSpeed.toFixed(2)} m/s
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={settings.walkingSpeed}
              onChange={(e) => onUpdateSettings({ walkingSpeed: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0.5 m/s (Cautious)</span>
              <span>1.0 m/s (Brisk)</span>
              <span>1.5 m/s (Fast)</span>
            </div>
          </div>

          {/* Sensor Gaussian Noise */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Gaussian Sensor Noise (σ)</span>
              <span className="text-cyan-400 font-mono font-semibold">
                ±{settings.gaussianNoiseSigmaCm} cm
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={settings.gaussianNoiseSigmaCm}
              onChange={(e) => onUpdateSettings({ gaussianNoiseSigmaCm: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0 cm (Ideal)</span>
              <span>5 cm (Typical)</span>
              <span>15 cm (Extreme)</span>
            </div>
          </div>

          {/* Ultrasonic Beam Cone Half-Angle */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Beam Half-Angle (θ)</span>
              <span className="text-cyan-400 font-mono font-semibold">
                ±{settings.beamHalfAngleDeg}° ({settings.beamHalfAngleDeg * 2}° beam)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={settings.beamHalfAngleDeg}
              onChange={(e) => onUpdateSettings({ beamHalfAngleDeg: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>5° (Laser-like)</span>
              <span>15° (Standard)</span>
              <span>30° (Wide spread)</span>
            </div>
          </div>
        </div>

        {/* Toggles Strip */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 mt-3 border-t border-slate-800">
          {/* Temperature Correction Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
            <input
              type="checkbox"
              checked={settings.tempCorrectionEnabled}
              onChange={(e) => onUpdateSettings({ tempCorrectionEnabled: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
            />
            <span>Temperature Correction</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                settings.tempCorrectionEnabled
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {settings.tempCorrectionEnabled ? 'ON (Compensated)' : 'OFF (Fixed 343 m/s)'}
            </span>
          </label>

          {/* Rain & Wind Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
            <input
              type="checkbox"
              checked={settings.rainWindEnabled}
              onChange={(e) => onUpdateSettings({ rainWindEnabled: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
            />
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            <span>Rain & Wind Turbulence</span>
          </label>

          {/* Audio Buzzer Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateSettings({ audioBuzzerEnabled: !settings.audioBuzzerEnabled })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                settings.audioBuzzerEnabled
                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.audioBuzzerEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" /> Sound Buzzer: ON
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" /> Sound Buzzer: MUTED
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Signal Processing & Detection Thresholds */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Signal Processing & Alert Thresholds
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Median Filter Size N */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Median Filter Window (N)</span>
              <span className="text-amber-400 font-mono font-semibold">
                N = {settings.filterWindowSizeN} {settings.filterWindowSizeN === 1 ? '(Raw / No Filter)' : 'samples'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="2" // 1, 3, 5, 7
              value={settings.filterWindowSizeN}
              onChange={(e) => onUpdateSettings({ filterWindowSizeN: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>N=1 (Raw, noisy)</span>
              <span>N=3 (Light despike)</span>
              <span>N=5 (Balanced)</span>
              <span>N=7 (Heavy filter)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {settings.filterWindowSizeN === 1
                ? 'Single dropout or noise spike will immediately trigger false alarms!'
                : `Rejects ${Math.floor(settings.filterWindowSizeN / 2)} spurious dropouts with ${(
                    ((settings.filterWindowSizeN - 1) / 2) * 50
                  ).toFixed(0)}ms filter latency.`}
            </p>
          </div>

          {/* Drop-off Threshold */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Drop-off Height Threshold (Δh)</span>
              <span className="text-amber-400 font-mono font-semibold">
                +{settings.dropoffThresholdM.toFixed(2)} m
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.60"
              step="0.05"
              value={settings.dropoffThresholdM}
              onChange={(e) => onUpdateSettings({ dropoffThresholdM: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0.10 m (High sensitivity)</span>
              <span>0.25 m (Standard curb)</span>
              <span>0.60 m (Deep pits only)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Sensor B alerts if downward ground distance exceeds baseline by more than {settings.dropoffThresholdM.toFixed(2)}m.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Obstacle Placement Palette */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Add Obstacles to Walkway
            </span>
          </div>

          <button
            onClick={onClearObstacles}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
          >
            Clear All Custom Obstacles
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          Select an obstacle type, then click anywhere along the walkway canvas to place it:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {obstaclePalette.map((obs) => {
            const isSelected = selectedObstacleTypeForPlacement === obs.type;
            return (
              <button
                key={obs.type}
                onClick={() =>
                  onSelectObstacleTypeForPlacement(isSelected ? null : obs.type)
                }
                className={`p-2 rounded-lg text-left border transition-all ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg ring-1 ring-cyan-500'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{obs.label}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-slate-400">Reflectivity:</span>
                  <span
                    className={`font-mono font-bold ${
                      obs.reflectivity >= 0.8
                        ? 'text-emerald-400'
                        : obs.reflectivity >= 0.3
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    ρ = {obs.reflectivity}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selectedObstacleTypeForPlacement && (
          <div className="mt-3 p-2 bg-cyan-950/40 border border-cyan-800 rounded-lg flex items-center justify-between text-xs text-cyan-300">
            <span>
              Placement mode active: Click on canvas to drop obstacle.
            </span>
            <button
              onClick={() => onSelectObstacleTypeForPlacement(null)}
              className="text-cyan-400 font-semibold underline text-[11px]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
