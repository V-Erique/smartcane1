import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SimulationSettings, 
  Obstacle, 
  ObstacleType, 
  CaneState, 
  TelemetryPoint, 
  DetectionEvent, 
  RunMetrics, 
  CourseRunResult 
} from './types';
import { 
  calculateSpeedOfSound, 
  ASSUMED_ROOM_TEMP_SPEED, 
  traceSensorBeam, 
  simulateSensorMeasurement, 
  getCaneSensorMountPositions, 
  createDefaultFreeplayObstacles, 
  createTestCourseObstacles 
} from './physics/acoustics';
import { caneAudio } from './audio/buzzer';
import { WalkwayCanvas } from './components/WalkwayCanvas';
import { LiveTelemetryChart } from './components/LiveTelemetryChart';
import { HapticOscilloscope } from './components/HapticOscilloscope';
import { ControlsPanel } from './components/ControlsPanel';
import { MetricsAndLog } from './components/MetricsAndLog';
import { TestCourseModal } from './components/TestCourseModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { Flag, Sparkles, BookOpen } from 'lucide-react';

export default function App() {
  // 1. Simulation Settings State
  const [settings, setSettings] = useState<SimulationSettings>({
    walkingSpeed: 1.0, // m/s
    temperatureC: 20, // °C
    tempCorrectionEnabled: true,
    gaussianNoiseSigmaCm: 4, // cm
    beamHalfAngleDeg: 15, // deg
    filterWindowSizeN: 5, // median filter
    dropoffThresholdM: 0.25, // m
    overheadThresholdM: 2.5, // m
    rainWindEnabled: false,
    audioBuzzerEnabled: false,
    audioVolume: 0.35,
  });

  // 2. Walkway Obstacles
  const [obstacles, setObstacles] = useState<Obstacle[]>(() => createDefaultFreeplayObstacles());
  const [selectedObstacleTypeForPlacement, setSelectedObstacleTypeForPlacement] = useState<ObstacleType | null>(null);

  // 3. Walker and Cane Dynamic State
  const [caneState, setCaneState] = useState<CaneState>({
    x: 0.5,
    y: 0,
    sensorA: {
      rawDistanceM: null,
      trueDistanceM: null,
      echoTimeS: null,
      filteredDistanceM: null,
      signalStrength: 0,
      targetObstacleId: null,
    },
    sensorB: {
      rawDistanceM: null,
      trueDistanceM: null,
      echoTimeS: null,
      filteredDistanceM: null,
      signalStrength: 0,
      targetObstacleId: null,
    },
    isOverheadAlert: false,
    isDropoffAlert: false,
    vibrationIntensity: 0,
    vibrationPattern: 'none',
    speedOfSoundTrue: 343.4,
    speedOfSoundAssumed: 343.4,
  });

  // 4. Playback and Mode State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isTestCourseActive, setIsTestCourseActive] = useState<boolean>(false);
  const [showTestCourseModal, setShowTestCourseModal] = useState<boolean>(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);

  // Test Course Evaluation Results
  const [currentCourseResult, setCurrentCourseResult] = useState<CourseRunResult | null>(null);
  const [previousCourseResult, setPreviousCourseResult] = useState<CourseRunResult | null>(null);

  // 5. Telemetry & Log Data
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [eventLogs, setEventLogs] = useState<DetectionEvent[]>([]);
  const [metrics, setMetrics] = useState<RunMetrics>({
    totalObstaclesEncountered: 0,
    detections: 0,
    missedDetections: 0,
    falseAlarms: 0,
    avgDetectionDistanceM: 0,
    avgWarningTimeS: 0,
    accuracyRate: 100,
  });

  // Sliding buffers for median filtering
  const sensorABufferRef = useRef<(number | null)[]>(new Array(7).fill(null));
  const sensorBBufferRef = useRef<(number | null)[]>(new Array(7).fill(null));
  const lastTimeRef = useRef<number>(performance.now());
  const lastSampleTimeRef = useRef<number>(0);
  const trackedObstaclesStateRef = useRef<Record<string, { detected: boolean; logged: boolean; minDistance: number }>>({});

  // Sync Audio Buzzer configuration
  useEffect(() => {
    caneAudio.setMuted(!settings.audioBuzzerEnabled);
    caneAudio.setVolume(settings.audioVolume);
  }, [settings.audioBuzzerEnabled, settings.audioVolume]);

  // Nominal baseline downward ground distance
  const mount = getCaneSensorMountPositions(0, 0);
  const baselineRay = traceSensorBeam(
    mount.moduleX,
    mount.moduleY,
    mount.sensorBAngleRad,
    (settings.beamHalfAngleDeg * Math.PI) / 180,
    4.0,
    [],
    0
  );
  const baselineDownwardDistance = baselineRay.hit ? baselineRay.distance : 0.77;

  // Settings update handler
  const handleUpdateSettings = (newSettings: Partial<SimulationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Add / Remove obstacle handlers
  const handleAddObstacle = (newObs: Obstacle) => {
    setObstacles((prev) => [...prev, newObs]);
  };

  const handleRemoveObstacle = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  };

  const handleClearObstacles = () => {
    setObstacles([]);
    setEventLogs([]);
    setMetrics({
      totalObstaclesEncountered: 0,
      detections: 0,
      missedDetections: 0,
      falseAlarms: 0,
      avgDetectionDistanceM: 0,
      avgWarningTimeS: 0,
      accuracyRate: 100,
    });
  };

  // Reset walker position
  const handleResetWalk = () => {
    setCaneState((prev) => ({
      ...prev,
      x: 0.5,
    }));
    sensorABufferRef.current = new Array(settings.filterWindowSizeN).fill(null);
    sensorBBufferRef.current = new Array(settings.filterWindowSizeN).fill(null);
    trackedObstaclesStateRef.current = {};
  };

  // Launch preset Test Course
  const handleRunTestCourse = () => {
    const testObs = createTestCourseObstacles();
    setObstacles(testObs);
    setIsTestCourseActive(true);
    handleResetWalk();
    setIsPlaying(true);
    setEventLogs([]);
    setMetrics({
      totalObstaclesEncountered: 0,
      detections: 0,
      missedDetections: 0,
      falseAlarms: 0,
      avgDetectionDistanceM: 0,
      avgWarningTimeS: 0,
      accuracyRate: 100,
    });
    // Initialize tracking for each obstacle
    const initialTrack: Record<string, { detected: boolean; logged: boolean; minDistance: number }> = {};
    for (const obs of testObs) {
      initialTrack[obs.id] = { detected: false, logged: false, minDistance: 999 };
    }
    trackedObstaclesStateRef.current = initialTrack;
  };

  // End of Test Course handler
  const handleFinishTestCourse = useCallback(() => {
    setIsPlaying(false);
    setIsTestCourseActive(false);

    // Compute final obstacle results
    const obstacleResults = obstacles.map((obs) => {
      const track = trackedObstaclesStateRef.current[obs.id];
      const isDetected = track?.detected || false;
      const detDist = track?.minDistance && track.minDistance < 999 ? track.minDistance : 0;
      const warnTime = detDist > 0 ? detDist / settings.walkingSpeed : 0;

      return {
        obstacle: obs,
        status: (isDetected ? 'detected' : 'missed') as 'detected' | 'missed',
        detectionDistanceM: detDist,
        warningTimeS: warnTime,
      };
    });

    const newResult: CourseRunResult = {
      id: `run_${Date.now()}`,
      runDate: new Date().toLocaleTimeString(),
      settingsSnapshot: { ...settings },
      metrics: { ...metrics },
      obstacleResults,
    };

    if (currentCourseResult) {
      setPreviousCourseResult(currentCourseResult);
    }
    setCurrentCourseResult(newResult);
    setShowTestCourseModal(true);
  }, [currentCourseResult, metrics, obstacles, settings]);

  // Main Physics and Sensing Simulation Loop
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000); // delta time in seconds
      lastTimeRef.current = now;

      if (isPlaying) {
        setCaneState((prevState) => {
          let newX = prevState.x + settings.walkingSpeed * dt;

          // Check for Test Course completion
          if (isTestCourseActive && newX >= 31.5) {
            handleFinishTestCourse();
            return prevState;
          }

          // Loop or continue
          if (!isTestCourseActive && newX > 35) {
            newX = 0.5;
            trackedObstaclesStateRef.current = {};
          }

          // Sensor mount coordinates
          const caneMount = getCaneSensorMountPositions(newX, 0);
          const halfAngleRad = (settings.beamHalfAngleDeg * Math.PI) / 180;

          // Ray-trace Sensor A (Upward beam)
          const rayResultA = traceSensorBeam(
            caneMount.moduleX,
            caneMount.moduleY,
            caneMount.sensorAAngleRad,
            halfAngleRad,
            4.0,
            obstacles,
            0
          );

          // Ray-trace Sensor B (Downward beam)
          const rayResultB = traceSensorBeam(
            caneMount.moduleX,
            caneMount.moduleY,
            caneMount.sensorBAngleRad,
            halfAngleRad,
            4.0,
            obstacles,
            0
          );

          // Buffer sizes matched to current filterWindowSizeN
          const N = settings.filterWindowSizeN;
          if (sensorABufferRef.current.length !== N) {
            sensorABufferRef.current = new Array(N).fill(null);
            sensorBBufferRef.current = new Array(N).fill(null);
          }

          // Simulate sensor measurement with physics, noise & median filter
          const readingA = simulateSensorMeasurement(rayResultA, settings, sensorABufferRef.current);
          const readingB = simulateSensorMeasurement(rayResultB, settings, sensorBBufferRef.current);

          // Update refs
          sensorABufferRef.current = [...sensorABufferRef.current.slice(1), readingA.rawDistanceM];
          sensorBBufferRef.current = [...sensorBBufferRef.current.slice(1), readingB.rawDistanceM];

          // Detection Logic
          // 1. Overhead Hazard: Filtered distance on Sensor A < overheadThreshold
          const isOverheadAlert =
            readingA.filteredDistanceM !== null &&
            readingA.filteredDistanceM < settings.overheadThresholdM;

          // 2. Drop-off Hazard: Sensor B downward distance exceeds baseline by dropoffThreshold,
          // or is infinite/null (unbounded pit drop-off)
          const isDropoffAlert =
            (readingB.filteredDistanceM !== null &&
              readingB.filteredDistanceM - baselineDownwardDistance > settings.dropoffThresholdM) ||
            (rayResultB.isGround && readingB.filteredDistanceM === null);

          // Haptic vibration mapping
          let vibrationIntensity = 0;
          let vibrationPattern: CaneState['vibrationPattern'] = 'none';

          if (isDropoffAlert && isOverheadAlert) {
            vibrationPattern = 'both';
            vibrationIntensity = 1.0;
          } else if (isDropoffAlert) {
            vibrationPattern = 'dropoff';
            vibrationIntensity = 0.9;
          } else if (isOverheadAlert) {
            vibrationPattern = 'overhead';
            // Closer obstacle = higher intensity
            const dist = readingA.filteredDistanceM || 2.0;
            vibrationIntensity = Math.max(0.3, Math.min(1.0, 1.0 - dist / 2.5));
          }

          // Trigger Web Audio Buzzer if enabled
          if (settings.audioBuzzerEnabled) {
            if (isDropoffAlert) {
              caneAudio.triggerDropoffBeep();
            } else if (isOverheadAlert && readingA.filteredDistanceM) {
              caneAudio.triggerOverheadBeep(readingA.filteredDistanceM);
            }
          }

          // Update Telemetry Point (throttled to ~20 Hz)
          if (now - lastSampleTimeRef.current > 50) {
            lastSampleTimeRef.current = now;
            setTelemetryHistory((prev) => {
              const newPoint: TelemetryPoint = {
                timestamp: now,
                walkerX: newX,
                rawUp: readingA.rawDistanceM,
                filteredUp: readingA.filteredDistanceM,
                rawDown: readingB.rawDistanceM,
                filteredDown: readingB.filteredDistanceM,
                isOverheadAlert,
                isDropoffAlert,
              };
              const updated = [...prev, newPoint];
              return updated.length > 70 ? updated.slice(updated.length - 70) : updated;
            });
          }

          // Track obstacle encounters & evaluate detections / misses
          obstacles.forEach((obs) => {
            const distanceToObs = obs.x - newX;
            let track = trackedObstaclesStateRef.current[obs.id];
            if (!track) {
              track = { detected: false, logged: false, minDistance: 999 };
              trackedObstaclesStateRef.current[obs.id] = track;
            }

            // In advance detection zone (0.3m to 3.5m ahead)
            if (distanceToObs > 0.25 && distanceToObs < 3.2) {
              const isRelevantAlert =
                obs.type === 'drop_off' ? isDropoffAlert : isOverheadAlert;

              if (isRelevantAlert && !track.detected) {
                track.detected = true;
                track.minDistance = distanceToObs;
                const warnTime = distanceToObs / settings.walkingSpeed;

                // Log Detection Event
                setEventLogs((prevLogs) => [
                  ...prevLogs,
                  {
                    id: `det_${Date.now()}_${obs.id}`,
                    timestamp: Date.now(),
                    walkerX: newX,
                    obstacleName: obs.name,
                    obstacleType: obs.type,
                    status: 'detected',
                    detectionDistanceM: distanceToObs,
                    warningTimeS: warnTime,
                    sensorUsed: obs.type === 'drop_off' ? 'Sensor B (Downward)' : 'Sensor A (Upward)',
                    note: `Acoustic echo verified at ρ=${obs.reflectivity}. Warning provided ${warnTime.toFixed(2)}s before reaching hazard.`,
                  },
                ]);

                // Update Metrics
                setMetrics((prev) => {
                  const newDetections = prev.detections + 1;
                  const total = prev.totalObstaclesEncountered + 1;
                  const newAvgDist =
                    (prev.avgDetectionDistanceM * prev.detections + distanceToObs) / newDetections;
                  const newAvgTime =
                    (prev.avgWarningTimeS * prev.detections + warnTime) / newDetections;
                  return {
                    ...prev,
                    detections: newDetections,
                    totalObstaclesEncountered: total,
                    avgDetectionDistanceM: newAvgDist,
                    avgWarningTimeS: newAvgTime,
                    accuracyRate: (newDetections / total) * 100,
                  };
                });
              }
            }

            // Walker arrived at obstacle without detecting it -> Collision / Missed Detection!
            if (distanceToObs <= 0.2 && distanceToObs >= -0.2 && !track.detected && !track.logged) {
              track.logged = true;

              // Log Missed Detection Event
              setEventLogs((prevLogs) => [
                ...prevLogs,
                {
                  id: `miss_${Date.now()}_${obs.id}`,
                  timestamp: Date.now(),
                  walkerX: newX,
                  obstacleName: obs.name,
                  obstacleType: obs.type,
                  status: 'missed',
                  detectionDistanceM: 0,
                  warningTimeS: 0,
                  sensorUsed: 'None',
                  note: `MISSED HAZARD! Specular bounce, absorption, or noise drop caused echo loss (ρ=${obs.reflectivity}).`,
                },
              ]);

              // Update Metrics
              setMetrics((prev) => {
                const newMisses = prev.missedDetections + 1;
                const total = prev.totalObstaclesEncountered + 1;
                return {
                  ...prev,
                  missedDetections: newMisses,
                  totalObstaclesEncountered: total,
                  accuracyRate: (prev.detections / total) * 100,
                };
              });
            }
          });

          // Check for False Alarms (Alert triggered when no obstacle is within 3.5m)
          const anyObstacleNearby = obstacles.some(
            (obs) => Math.abs(obs.x - newX) < 3.2
          );

          if (!anyObstacleNearby && (isOverheadAlert || isDropoffAlert)) {
            // Rate-limit false alarm logging
            const lastLog = eventLogs[eventLogs.length - 1];
            if (!lastLog || Date.now() - lastLog.timestamp > 2000) {
              setEventLogs((prev) => [
                ...prev,
                {
                  id: `fa_${Date.now()}`,
                  timestamp: Date.now(),
                  walkerX: newX,
                  obstacleName: 'Clear Walkway',
                  obstacleType: 'low_obstacle',
                  status: 'false_alarm',
                  detectionDistanceM: 0,
                  warningTimeS: 0,
                  sensorUsed: isDropoffAlert ? 'Sensor B (Downward)' : 'Sensor A (Upward)',
                  note: `False Alarm caused by sensor noise spike (σ=±${settings.gaussianNoiseSigmaCm}cm) or rain dropout.`,
                },
              ]);
              setMetrics((prev) => ({
                ...prev,
                falseAlarms: prev.falseAlarms + 1,
              }));
            }
          }

          const trueSpeed = calculateSpeedOfSound(settings.temperatureC);
          const assumedSpeed = settings.tempCorrectionEnabled
            ? trueSpeed
            : ASSUMED_ROOM_TEMP_SPEED;

          return {
            x: newX,
            y: 0,
            sensorA: readingA,
            sensorB: readingB,
            isOverheadAlert,
            isDropoffAlert,
            vibrationIntensity,
            vibrationPattern,
            speedOfSoundTrue: trueSpeed,
            speedOfSoundAssumed: assumedSpeed,
          };
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    settings,
    obstacles,
    isTestCourseActive,
    handleFinishTestCourse,
    baselineDownwardDistance,
    eventLogs,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Universal Top Bar Contract (1 row, 3 zones: Brand, 4 nav links, 1 primary action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            Smart Cane Ultrasonic Sensor Lab
          </span>
        </div>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <a href="#simulation" className="hover:text-cyan-400 transition-colors whitespace-nowrap">
            Walkway Simulation
          </a>
          <a href="#acoustics" className="hover:text-cyan-400 transition-colors whitespace-nowrap">
            Sensors & Acoustics
          </a>
          <a href="#dsp" className="hover:text-cyan-400 transition-colors whitespace-nowrap">
            DSP & Telemetry
          </a>
          <a href="#metrics" className="hover:text-cyan-400 transition-colors whitespace-nowrap">
            Safety Metrics
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>How It Works</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: 2-Zone Sandbox Layout */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Simulation Alert Banner for Test Course */}
        {isTestCourseActive && (
          <div className="bg-indigo-950/80 border border-indigo-700/80 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-indigo-200 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-white">
                Test Course Active: Evaluating 6 Mixed Outdoor Obstacles
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-cyan-300">
                Progress: {caneState.x.toFixed(1)}m / 31.5m
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-300">
                Obstacles: Overhead Branch, Thin Pole, Curb Drop-off, Glass Panel, Soft Coat, Trench
              </span>
            </div>
          </div>
        )}

        {/* 2-Zone Grid: Left Stage (Walkway + Charts) & Right Deck (Controls + Metrics) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone: Interactive Stage (7 cols) */}
          <div className="lg:col-span-7 space-y-4" id="simulation">
            {/* 1. Walkway Canvas */}
            <WalkwayCanvas
              caneState={caneState}
              obstacles={obstacles}
              settings={settings}
              isPlaying={isPlaying}
              onAddObstacle={handleAddObstacle}
              onRemoveObstacle={handleRemoveObstacle}
              selectedObstacleTypeForPlacement={selectedObstacleTypeForPlacement}
              onClearPlacementMode={() => setSelectedObstacleTypeForPlacement(null)}
            />

            {/* 2. Live Telemetry Line Chart (Raw vs Filtered) */}
            <div id="dsp">
              <LiveTelemetryChart
                telemetryData={telemetryHistory}
                settings={settings}
                baselineDownwardDistance={baselineDownwardDistance}
              />
            </div>

            {/* 3. Haptic Handle Motor & Oscilloscope Strip */}
            <HapticOscilloscope
              caneState={caneState}
              isBuzzerActive={settings.audioBuzzerEnabled}
            />
          </div>

          {/* Right Zone: Control Deck & Real-time Metrics (5 cols) */}
          <div className="lg:col-span-5 space-y-4" id="acoustics">
            {/* Controls Panel */}
            <ControlsPanel
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              caneState={caneState}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onResetWalk={handleResetWalk}
              onRunTestCourse={handleRunTestCourse}
              selectedObstacleTypeForPlacement={selectedObstacleTypeForPlacement}
              onSelectObstacleTypeForPlacement={setSelectedObstacleTypeForPlacement}
              onClearObstacles={handleClearObstacles}
              onOpenHowItWorks={() => setShowHowItWorksModal(true)}
            />

            {/* Metrics & Event Log Table */}
            <div id="metrics">
              <MetricsAndLog
                metrics={metrics}
                eventLogs={eventLogs}
                onClearLogs={() => setEventLogs([])}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Test Course Evaluation Summary & Run Comparison Modal */}
      {showTestCourseModal && currentCourseResult && (
        <TestCourseModal
          currentResult={currentCourseResult}
          previousResult={previousCourseResult}
          onClose={() => setShowTestCourseModal(false)}
          onRunAgain={() => {
            setShowTestCourseModal(false);
            handleRunTestCourse();
          }}
        />
      )}

      {/* How It Works Educational Guide Modal */}
      {showHowItWorksModal && (
        <HowItWorksModal onClose={() => setShowHowItWorksModal(false)} />
      )}

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <span>Smart Cane Ultrasonic Sensing Simulation · Clip-On Mobility Module</span>
          <span className="font-mono text-slate-400">
            Speed of Sound: v(T) = 331.3 + 0.606·T · Median Filter DSP
          </span>
        </div>
      </footer>
    </div>
  );
}
