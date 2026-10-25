export type ObstacleType = 
  | 'overhead_branch'
  | 'overhead_sign'
  | 'low_obstacle'
  | 'drop_off'
  | 'thin_pole'
  | 'glass_panel'
  | 'soft_surface';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  name: string;
  x: number; // position along walkway in meters (m)
  y: number; // vertical position in meters (m), 0 is ground
  width: number; // width in meters (m)
  height: number; // height in meters (m)
  reflectivity: number; // 0.1 to 1.0 acoustic reflection coefficient
  description: string;
  depth?: number; // for drop-offs (depth below ground in m)
}

export interface SensorConfig {
  beamHalfAngleDeg: number; // 5 to 30 deg (default 15)
  maxRangeM: number; // 4.0 m
  minRangeM: number; // 0.2 m
}

export interface SimulationSettings {
  walkingSpeed: number; // m/s (0.5 to 1.5)
  temperatureC: number; // deg C (0 to 45)
  tempCorrectionEnabled: boolean; // toggle true/false
  gaussianNoiseSigmaCm: number; // cm (0 to 15)
  beamHalfAngleDeg: number; // deg (5 to 30)
  filterWindowSizeN: number; // 1 to 7 (median filter)
  dropoffThresholdM: number; // m above baseline (0.1 to 0.6)
  overheadThresholdM: number; // m hazard distance (1.0 to 3.0)
  rainWindEnabled: boolean; // adds air turbulence and raindrop scattering
  audioBuzzerEnabled: boolean; // Web Audio API beeps
  audioVolume: number; // 0 to 1
}

export interface SensorReading {
  rawDistanceM: number | null; // null if no echo / dropped
  trueDistanceM: number | null; // actual physical distance
  echoTimeS: number | null; // time of flight
  filteredDistanceM: number | null; // after median filter
  signalStrength: number; // 0 to 1 relative
  targetObstacleId: string | null;
}

export interface CaneState {
  x: number; // walker position in meters
  y: number; // ground level under walker
  sensorA: SensorReading; // Upward overhead sensor
  sensorB: SensorReading; // Downward drop-off sensor
  isOverheadAlert: boolean;
  isDropoffAlert: boolean;
  vibrationIntensity: number; // 0 to 1
  vibrationPattern: 'none' | 'overhead' | 'dropoff' | 'both';
  speedOfSoundTrue: number; // m/s
  speedOfSoundAssumed: number; // m/s
}

export interface TelemetryPoint {
  timestamp: number;
  walkerX: number;
  rawUp: number | null;
  filteredUp: number | null;
  rawDown: number | null;
  filteredDown: number | null;
  isOverheadAlert: boolean;
  isDropoffAlert: boolean;
}

export interface DetectionEvent {
  id: string;
  timestamp: number;
  walkerX: number;
  obstacleName: string;
  obstacleType: ObstacleType;
  status: 'detected' | 'missed' | 'false_alarm';
  detectionDistanceM: number;
  warningTimeS: number;
  sensorUsed: 'Sensor A (Upward)' | 'Sensor B (Downward)' | 'None';
  note: string;
}

export interface RunMetrics {
  totalObstaclesEncountered: number;
  detections: number; // True Positives
  missedDetections: number; // False Negatives
  falseAlarms: number; // False Positives
  avgDetectionDistanceM: number;
  avgWarningTimeS: number;
  accuracyRate: number; // %
}

export interface CourseRunResult {
  id: string;
  runDate: string;
  settingsSnapshot: SimulationSettings;
  metrics: RunMetrics;
  obstacleResults: {
    obstacle: Obstacle;
    status: 'detected' | 'missed';
    detectionDistanceM: number;
    warningTimeS: number;
  }[];
}
