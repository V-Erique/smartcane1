import { Obstacle, SensorReading, SimulationSettings } from '../types';

/**
 * Speed of sound in dry air as a function of temperature T in Celsius.
 * Equation: v(T) = 331.3 + 0.606 * T (m/s)
 * At 20°C: v ≈ 343.4 m/s
 * At 0°C:  v ≈ 331.3 m/s
 * At 40°C: v ≈ 355.5 m/s
 */
export function calculateSpeedOfSound(temperatureC: number): number {
  return 331.3 + 0.606 * temperatureC;
}

/** Standard room-temperature assumption used when temperature correction is disabled */
export const ASSUMED_ROOM_TEMP_SPEED = 343.0; // m/s (approx 20°C)

/**
 * Generates normally distributed noise using the Box-Muller transform.
 * @param mean Center of distribution
 * @param stdDev Standard deviation (sigma)
 */
export function gaussianRandom(mean = 0, stdDev = 1): number {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 <= 1e-15) u1 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Calculates median of an array of numbers, ignoring nulls if possible.
 * Used in signal processing to eliminate outlier spikes and single-pulse dropouts.
 */
export function computeMedian(buffer: (number | null)[]): number | null {
  const validValues = buffer.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return null;
  const sorted = [...validValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface RayIntersectResult {
  hit: boolean;
  distance: number;
  obstacleId: string | null;
  reflectivity: number;
  angleToSurfaceNormalDeg: number;
  isGround: boolean;
}

/**
 * Casts multiple rays within the ultrasonic beam cone [centerAngle - halfAngle, centerAngle + halfAngle]
 * to find the closest reflecting target surface.
 */
export function traceSensorBeam(
  originX: number,
  originY: number,
  centerAngleRad: number,
  halfAngleRad: number,
  maxRangeM: number,
  obstacles: Obstacle[],
  walkwayGroundLevel: number = 0,
  walkwayMaxX: number = 100
): RayIntersectResult {
  const numRays = 11; // Sample rays across beam cone
  let closestHit: RayIntersectResult = {
    hit: false,
    distance: maxRangeM,
    obstacleId: null,
    reflectivity: 1.0,
    angleToSurfaceNormalDeg: 0,
    isGround: false,
  };

  const angleStep = (2 * halfAngleRad) / (numRays - 1);

  for (let i = 0; i < numRays; i++) {
    const rayAngle = centerAngleRad - halfAngleRad + i * angleStep;
    const dirX = Math.cos(rayAngle);
    const dirY = Math.sin(rayAngle);

    // 1. Check intersection with walkway ground (taking drop-offs/pits into account)
    // Ray equation: y(t) = originY + t * dirY
    if (dirY < -0.01) {
      // Ray is heading downward
      // Ray hits nominal ground at t_ground = (walkwayGroundLevel - originY) / dirY
      const tGround = (walkwayGroundLevel - originY) / dirY;
      if (tGround > 0 && tGround < closestHit.distance) {
        const hitX = originX + tGround * dirX;
        
        // Check if hitX falls inside any drop-off or pit obstacle
        const dropoff = obstacles.find(
          (obs) => obs.type === 'drop_off' && hitX >= obs.x && hitX <= obs.x + obs.width
        );

        if (dropoff) {
          // Ground is dropped down by dropoff.depth
          const pitLevel = walkwayGroundLevel - (dropoff.depth || 0.4);
          const tPit = (pitLevel - originY) / dirY;
          if (tPit > 0 && tPit < closestHit.distance) {
            closestHit = {
              hit: true,
              distance: tPit,
              obstacleId: dropoff.id,
              reflectivity: dropoff.reflectivity,
              angleToSurfaceNormalDeg: Math.abs(rayAngle - (-Math.PI / 2)) * (180 / Math.PI),
              isGround: true,
            };
          }
        } else {
          // Hits normal sidewalk ground
          closestHit = {
            hit: true,
            distance: tGround,
            obstacleId: null,
            reflectivity: 1.0, // Concrete ground has good diffuse reflection
            angleToSurfaceNormalDeg: Math.abs(rayAngle - (-Math.PI / 2)) * (180 / Math.PI),
            isGround: true,
          };
        }
      }
    }

    // 2. Check intersection with obstacles (bounding boxes)
    for (const obs of obstacles) {
      if (obs.type === 'drop_off') continue; // Handled with ground terrain

      const left = obs.x;
      const right = obs.x + obs.width;
      const bottom = obs.y;
      const top = obs.y + obs.height;

      // Slab intersection algorithm for 2D AABB
      let tMin = 0.05; // Blanking dead zone
      let tMax = closestHit.distance;

      // X-slab
      if (Math.abs(dirX) > 1e-6) {
        const t1 = (left - originX) / dirX;
        const t2 = (right - originX) / dirX;
        const txMin = Math.min(t1, t2);
        const txMax = Math.max(t1, t2);
        tMin = Math.max(tMin, txMin);
        tMax = Math.min(tMax, txMax);
      } else {
        if (originX < left || originX > right) continue;
      }

      // Y-slab
      if (Math.abs(dirY) > 1e-6) {
        const t1 = (bottom - originY) / dirY;
        const t2 = (top - originY) / dirY;
        const tyMin = Math.min(t1, t2);
        const tyMax = Math.max(t1, t2);
        tMin = Math.max(tMin, tyMin);
        tMax = Math.min(tMax, tyMax);
      } else {
        if (originY < bottom || originY > top) continue;
      }

      if (tMin <= tMax && tMin < closestHit.distance && tMin > 0.1) {
        // Intersected obstacle closer than previous hit
        closestHit = {
          hit: true,
          distance: tMin,
          obstacleId: obs.id,
          reflectivity: obs.reflectivity,
          angleToSurfaceNormalDeg: 15, // Approximate incidence
          isGround: false,
        };
      }
    }
  }

  return closestHit;
}

/**
 * Simulates the physical transmission, reflection, and DSP of an ultrasonic ping.
 * Computes:
 * - True time of flight: t = 2 * d_true / v(T)
 * - Measured distance: d_meas = v_assumed * t / 2 + noise
 * - Signal strength attenuation: S = R / (d^2)
 * - Dropped echo logic if S < threshold or specular bounce
 */
export function simulateSensorMeasurement(
  rayResult: RayIntersectResult,
  settings: SimulationSettings,
  historyBuffer: (number | null)[]
): SensorReading {
  if (!rayResult.hit || rayResult.distance > 4.0 || rayResult.distance < 0.15) {
    // No target intercepted or outside physical beam envelope
    const updatedHistory = [...historyBuffer.slice(1), null];
    return {
      rawDistanceM: null,
      trueDistanceM: null,
      echoTimeS: null,
      filteredDistanceM: computeMedian(updatedHistory),
      signalStrength: 0,
      targetObstacleId: null,
    };
  }

  const dTrue = rayResult.distance;
  const trueSpeed = calculateSpeedOfSound(settings.temperatureC);
  
  // Real physical time-of-flight of the acoustic pulse:
  // t_echo = (2 * d_true) / v_true
  const echoTimeS = (2 * dTrue) / trueSpeed;

  // Signal Strength calculation (Inverse Square Law + Surface Reflectivity):
  // Ultrasonic transducers emit ~40 kHz sound waves.
  // Energy dissipates with distance squared, and specular surfaces deflect energy away.
  const distanceFactor = Math.max(0.05, 1.0 / (dTrue * dTrue));
  let signalStrength = rayResult.reflectivity * distanceFactor * 1.5;

  // Rain and wind environmental scattering:
  if (settings.rainWindEnabled) {
    signalStrength *= 0.75 + 0.25 * Math.random(); // Fluctuating turbulence
  }

  // Ultrasonic receiver detection threshold:
  // Typical transducer sensitivity threshold (~0.05)
  const MIN_DETECTION_THRESHOLD = 0.045;
  const isDroppedEcho = signalStrength < MIN_DETECTION_THRESHOLD;

  // Random packet drop from rain/air currents (approx 10% chance when rain enabled)
  const rainDropout = settings.rainWindEnabled && Math.random() < 0.12;

  let rawDistanceM: number | null = null;

  if (!isDroppedEcho && !rainDropout) {
    // Sensor electronics calculate distance:
    // d_calc = v_assumed * t_echo / 2
    const assumedSpeed = settings.tempCorrectionEnabled
      ? trueSpeed // Cane uses thermistor for speed compensation
      : ASSUMED_ROOM_TEMP_SPEED; // Fixed 343 m/s assumption (causes temperature drift!)

    const baseMeasuredDistance = (assumedSpeed * echoTimeS) / 2;

    // Add Gaussian noise (convert cm to m):
    let noiseSigmaM = (settings.gaussianNoiseSigmaCm / 100);
    if (settings.rainWindEnabled) {
      noiseSigmaM += 0.03; // Extra wind turbulence jitter
    }
    const noise = gaussianRandom(0, noiseSigmaM);
    rawDistanceM = Math.max(0.1, baseMeasuredDistance + noise);
  }

  // Update sliding window buffer for median filtering
  const updatedBuffer = [...historyBuffer.slice(1), rawDistanceM];
  const filteredDistanceM = computeMedian(updatedBuffer);

  return {
    rawDistanceM,
    trueDistanceM: dTrue,
    echoTimeS,
    filteredDistanceM,
    signalStrength: Math.min(1.0, signalStrength),
    targetObstacleId: rayResult.obstacleId,
  };
}

/**
 * Cane Mount Geometry & Spatial Dimensions:
 * Walker height ~1.75m
 * Cane held in hand at height ~0.90m, touching ground 1.0m ahead
 * Cane angle ≈ 45 deg
 * Clip-on smart module mounted 0.40m up from the ground tip:
 * - Module center: (walkerX + 0.55m, groundY + 0.55m)
 * - Sensor A: Oriented at +28° elevation relative to horizontal (aimed up at head height)
 * - Sensor B: Oriented at -46° depression relative to horizontal (aimed down at ground ahead)
 */
export function getCaneSensorMountPositions(walkerX: number, groundY: number = 0) {
  const handX = walkerX + 0.25;
  const handY = groundY + 0.92;
  const caneTipX = walkerX + 1.15;
  const caneTipY = groundY + 0.05;

  // Cane shaft vector
  const dx = caneTipX - handX;
  const dy = caneTipY - handY;

  // Module position along cane shaft (t = 0.55 from hand)
  const mountT = 0.52;
  const moduleX = handX + dx * mountT;
  const moduleY = handY + dy * mountT;

  return {
    handX,
    handY,
    caneTipX,
    caneTipY,
    moduleX,
    moduleY,
    // Sensor A: Angled upward (+28 deg above horizontal)
    sensorAAngleRad: (28 * Math.PI) / 180,
    // Sensor B: Angled downward (-46 deg below horizontal)
    sensorBAngleRad: (-46 * Math.PI) / 180,
  };
}

/**
 * Preset Test Course Obstacles:
 * 6 diverse obstacles representing real-world mobility challenges for visually impaired users.
 */
export function createTestCourseObstacles(): Obstacle[] {
  return [
    {
      id: 'test_obs_1',
      type: 'overhead_branch',
      name: 'Overhead Tree Branch',
      x: 4.5,
      y: 1.65,
      width: 0.9,
      height: 0.35,
      reflectivity: 1.0, // High reflection rough bark/leaves
      description: 'Head-height obstruction. Normal ground canes miss this completely!',
    },
    {
      id: 'test_obs_2',
      type: 'thin_pole',
      name: 'Metal Signpost (Thin Pole)',
      x: 9.5,
      y: 0.0,
      width: 0.12,
      height: 2.1,
      reflectivity: 0.4, // Small acoustic cross-section, weak echo
      description: 'Thin cylindrical pole. Returns narrow, weak reflection.',
    },
    {
      id: 'test_obs_3',
      type: 'drop_off',
      name: 'Curbside Drop-off (Step Down)',
      x: 14.0,
      y: 0.0,
      width: 1.8,
      height: 0.35,
      depth: 0.35,
      reflectivity: 0.9,
      description: 'Sidewalk curb step down. Downward sensor should alert to prevent fall.',
    },
    {
      id: 'test_obs_4',
      type: 'glass_panel',
      name: 'Glass Bus Shelter Panel',
      x: 19.5,
      y: 0.0,
      width: 0.15,
      height: 2.0,
      reflectivity: 0.1, // Smooth hard glass acts as acoustic mirror, deflecting echo
      description: 'Specular reflector. Very low echo return, frequent missed detection hazard!',
    },
    {
      id: 'test_obs_5',
      type: 'soft_surface',
      name: 'Winter Coat / Angled Baffle',
      x: 24.5,
      y: 0.2,
      width: 0.6,
      height: 1.6,
      reflectivity: 0.3, // Fabric absorbs sound, angled orientation deflects beam
      description: 'Acoustic absorption from soft clothing & angled surface.',
    },
    {
      id: 'test_obs_6',
      type: 'drop_off',
      name: 'Construction Trench Pit',
      x: 29.0,
      y: 0.0,
      width: 2.2,
      height: 0.65,
      depth: 0.65,
      reflectivity: 0.8,
      description: 'Deep drop-off pit. Critical safety warning required.',
    },
  ];
}

/**
 * Default obstacles for free play mode
 */
export function createDefaultFreeplayObstacles(): Obstacle[] {
  return [
    {
      id: 'free_obs_1',
      type: 'overhead_sign',
      name: 'Overhead Shop Sign',
      x: 5.0,
      y: 1.70,
      width: 0.8,
      height: 0.45,
      reflectivity: 1.0,
      description: 'Overhead metal signboard at head level (1.7m).',
    },
    {
      id: 'free_obs_2',
      type: 'drop_off',
      name: 'Subway Platform Step Down',
      x: 10.5,
      y: 0.0,
      width: 1.5,
      height: 0.4,
      depth: 0.4,
      reflectivity: 0.9,
      description: 'Hazardous step-down edge.',
    },
    {
      id: 'free_obs_3',
      type: 'glass_panel',
      name: 'Storefront Glass Window',
      x: 16.0,
      y: 0.0,
      width: 0.12,
      height: 2.2,
      reflectivity: 0.1,
      description: 'Challenging glass surface (specular deflection).',
    },
  ];
}
