import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Obstacle, ObstacleType, SimulationSettings, CaneState } from '../types';
import { getCaneSensorMountPositions } from '../physics/acoustics';

interface WalkwayCanvasProps {
  caneState: CaneState;
  obstacles: Obstacle[];
  settings: SimulationSettings;
  isPlaying: boolean;
  onAddObstacle: (newObs: Obstacle) => void;
  onRemoveObstacle: (id: string) => void;
  onSelectObstacle?: (obs: Obstacle | null) => void;
  selectedObstacleTypeForPlacement: ObstacleType | null;
  onClearPlacementMode: () => void;
}

export const WalkwayCanvas: React.FC<WalkwayCanvasProps> = ({
  caneState,
  obstacles,
  settings,
  isPlaying,
  onAddObstacle,
  onRemoveObstacle,
  selectedObstacleTypeForPlacement,
  onClearPlacementMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredObstacle, setHoveredObstacle] = useState<Obstacle | null>(null);
  const [wavePhase, setWavePhase] = useState(0);

  // Animation loop for acoustic wavefront propagation (40 kHz ultrasonic pulses)
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setWavePhase((prev) => (prev + 0.05) % 1);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Geometry translation: Meters to Canvas Pixels
  // Ground level is at y ≈ canvas.height - 85
  // Walker is positioned at canvas.width * 0.28 (horizontal anchor)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const groundY = height - 90; // Pixel Y corresponding to world ground y = 0
    const pixelsPerMeter = 90; // 1 meter = 90 pixels

    // Camera offset: walker is locked horizontally at ~28% width
    const walkerCanvasX = width * 0.28;
    const cameraOffsetX = caneState.x * pixelsPerMeter - walkerCanvasX;

    // Helper functions for coordinates
    const toScreenX = (worldX: number) => worldX * pixelsPerMeter - cameraOffsetX;
    const toScreenY = (worldY: number) => groundY - worldY * pixelsPerMeter;
    const toWorldX = (screenX: number) => (screenX + cameraOffsetX) / pixelsPerMeter;
    const toWorldY = (screenY: number) => (groundY - screenY) / pixelsPerMeter;

    // 1. Clear background & draw sky/ambient environment
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGradient.addColorStop(0, '#090d16');
    skyGradient.addColorStop(1, '#111827');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // Grid lines (subtle 1-meter markers)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const minM = Math.floor(toWorldX(0));
    const maxM = Math.ceil(toWorldX(width));
    for (let m = minM; m <= maxM; m++) {
      const sx = toScreenX(m);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, groundY + 80);
      ctx.stroke();

      // Meter distance labels
      if (m >= 0) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${m}m`, sx + 3, groundY + 20);
      }
    }

    // Rain / Wind particles if enabled
    if (settings.rainWindEnabled) {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.25)';
      ctx.lineWidth = 1.2;
      const t = Date.now() * 0.003;
      for (let i = 0; i < 40; i++) {
        const rx = ((i * 37 + t * 400) % (width + 100)) - 50;
        const ry = (i * 29 + t * 500) % groundY;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 16);
        ctx.stroke();
      }
    }

    // 2. Draw Walkway Ground Profile (including Drop-Offs and Pits)
    // We segment the ground so drop-off pits render seamlessly
    ctx.save();
    // Base sidewalk underlayer
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, width, height - groundY);

    // Pavement top curb line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // Draw individual drop-off pits
    for (const obs of obstacles) {
      if (obs.type === 'drop_off') {
        const pitLeft = toScreenX(obs.x);
        const pitRight = toScreenX(obs.x + obs.width);
        const pitDepthPx = (obs.depth || 0.4) * pixelsPerMeter;

        if (pitRight > 0 && pitLeft < width) {
          // Clear ground chunk
          ctx.fillStyle = '#090d16';
          ctx.fillRect(pitLeft, groundY, pitRight - pitLeft, pitDepthPx);

          // Pit floor
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(pitLeft, groundY + pitDepthPx, pitRight - pitLeft, height - (groundY + pitDepthPx));

          // Pit walls & hazard hatch lines
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Left wall
          ctx.moveTo(pitLeft, groundY);
          ctx.lineTo(pitLeft, groundY + pitDepthPx);
          // Floor
          ctx.lineTo(pitRight, groundY + pitDepthPx);
          // Right wall
          ctx.lineTo(pitRight, groundY);
          ctx.stroke();

          // Hazard diagonal stripes inside pit
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
          ctx.lineWidth = 1.5;
          for (let hx = pitLeft; hx < pitRight; hx += 16) {
            ctx.beginPath();
            ctx.moveTo(hx, groundY);
            ctx.lineTo(hx + 12, groundY + pitDepthPx);
            ctx.stroke();
          }

          // Depth marker tag
          ctx.fillStyle = '#fbbf24';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(`▼ -${(obs.depth || 0.4).toFixed(2)}m DROP-OFF`, pitLeft + 8, groundY + pitDepthPx - 8);
        }
      }
    }
    ctx.restore();

    // 3. Draw Obstacles (Boxes, signs, branches, poles, glass)
    for (const obs of obstacles) {
      if (obs.type === 'drop_off') continue; // Already drawn with ground

      const ox = toScreenX(obs.x);
      const oy = toScreenY(obs.y + obs.height);
      const ow = obs.width * pixelsPerMeter;
      const oh = obs.height * pixelsPerMeter;

      // Skip if offscreen
      if (ox + ow < -50 || ox > width + 50) continue;

      ctx.save();

      if (obs.type === 'overhead_branch') {
        // Natural leafy tree branch hanging down
        ctx.fillStyle = '#78350f'; // Dark wood
        ctx.fillRect(ox, oy, ow, 10);
        // Foliage blob
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(ox + ow * 0.5, oy + oh * 0.5, ow * 0.55, oh * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (obs.type === 'overhead_sign') {
        // Suspended signboard
        ctx.fillStyle = '#334155';
        ctx.fillRect(ox, oy, ow, oh);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, ow, oh);
        // Hanging brackets
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox + 8, 0);
        ctx.lineTo(ox + 8, oy);
        ctx.moveTo(ox + ow - 8, 0);
        ctx.lineTo(ox + ow - 8, oy);
        ctx.stroke();
        // Text on sign
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('CAUTION', ox + 8, oy + oh * 0.55);
      } else if (obs.type === 'thin_pole') {
        // Thin vertical metal signpost
        ctx.fillStyle = '#64748b';
        ctx.fillRect(ox, oy, ow, oh);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, ow, oh);
        // Top sign cap
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(ox - 8, oy, ow + 16, 16);
      } else if (obs.type === 'glass_panel') {
        // Transparent glass pane (specular reflection danger)
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(ox, oy, ow, oh);
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, ow, oh);
        // Specular diagonal reflection glint
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox + 6, oy + oh - 15);
        ctx.lineTo(ox + ow - 6, oy + 15);
        ctx.stroke();
      } else if (obs.type === 'soft_surface') {
        // Slanted sound-absorbing fabric / coat baffle
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(ox, oy + oh);
        ctx.lineTo(ox + ow, oy);
        ctx.lineTo(ox + ow + 15, oy);
        ctx.lineTo(ox + 15, oy + oh);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Standard obstacle box
        ctx.fillStyle = '#475569';
        ctx.fillRect(ox, oy, ow, oh);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox, oy, ow, oh);
      }

      // Reflectivity Badge Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      const badgeW = 60;
      ctx.fillRect(ox + ow / 2 - badgeW / 2, oy - 18, badgeW, 15);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + ow / 2 - badgeW / 2, oy - 18, badgeW, 15);

      ctx.fillStyle = obs.reflectivity >= 0.8 ? '#4ade80' : obs.reflectivity >= 0.3 ? '#facc15' : '#f87171';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`ρ = ${obs.reflectivity}`, ox + ow / 2 - badgeW / 2 + 6, oy - 7);

      // Name label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(obs.name, ox, oy + oh + 14);

      ctx.restore();
    }

    // 4. Draw Cane & Walker Geometry
    const mount = getCaneSensorMountPositions(caneState.x, 0);
    const handPxX = toScreenX(mount.handX);
    const handPxY = toScreenY(mount.handY);
    const tipPxX = toScreenX(mount.caneTipX);
    const tipPxY = toScreenY(mount.caneTipY);
    const modPxX = toScreenX(mount.moduleX);
    const modPxY = toScreenY(mount.moduleY);

    // Stride animation based on walker distance
    const stride = Math.sin(caneState.x * 6) * 0.15;

    // Draw Walker Figure (Minimalist, accessible, human figure)
    ctx.save();
    const walkerHeadX = toScreenX(caneState.x);
    const walkerHeadY = toScreenY(1.72);
    const walkerChestY = toScreenY(1.35);
    const walkerPelvisY = toScreenY(0.95);

    // Walker body: subtle dark modern style
    // Head
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(walkerHeadX, walkerHeadY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Dark glasses (indicator for visually impaired user)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(walkerHeadX + 2, walkerHeadY - 4, 10, 6);

    // Torso
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(walkerHeadX, walkerHeadY + 12);
    ctx.lineTo(walkerHeadX + 2, walkerPelvisY);
    ctx.stroke();

    // Legs (animated stride)
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#64748b';
    // Back leg
    ctx.beginPath();
    ctx.moveTo(walkerHeadX + 2, walkerPelvisY);
    ctx.lineTo(toScreenX(caneState.x - 0.2 + stride), groundY);
    ctx.stroke();
    // Front leg
    ctx.beginPath();
    ctx.moveTo(walkerHeadX + 2, walkerPelvisY);
    ctx.lineTo(toScreenX(caneState.x + 0.25 - stride), groundY);
    ctx.stroke();

    // Arm reaching to cane handle
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(walkerHeadX + 2, walkerChestY);
    ctx.lineTo(handPxX, handPxY);
    ctx.stroke();
    ctx.restore();

    // 5. Draw White Cane
    ctx.save();
    // Cane shaft (White with bottom red band)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(handPxX, handPxY);
    ctx.lineTo(tipPxX, tipPxY);
    ctx.stroke();

    // Red bottom high-visibility band on cane tip
    const redBandLen = 0.22;
    const caneDx = mount.caneTipX - mount.handX;
    const caneDy = mount.caneTipY - mount.handY;
    const caneLen = Math.sqrt(caneDx * caneDx + caneDy * caneDy);
    const tBand = 1 - redBandLen / caneLen;
    const bandPxX = toScreenX(mount.handX + caneDx * tBand);
    const bandPxY = toScreenY(mount.handY + caneDy * tBand);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bandPxX, bandPxY);
    ctx.lineTo(tipPxX, tipPxY);
    ctx.stroke();

    // Cane tip roller/ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tipPxX, tipPxY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Cane Handle grip
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(handPxX - 5, handPxY - 8);
    ctx.lineTo(handPxX + 5, handPxY + 4);
    ctx.stroke();

    // 6. Clip-on Smart Cane Module Housing
    ctx.fillStyle = '#0284c7'; // Azure tech housing
    ctx.fillRect(modPxX - 6, modPxY - 8, 12, 16);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(modPxX - 6, modPxY - 8, 12, 16);

    // Sensor A transducer (upward facing port)
    ctx.fillStyle = '#ef4444'; // Red/Orange Sensor A
    ctx.beginPath();
    ctx.arc(modPxX + 4, modPxY - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Sensor B transducer (downward facing port)
    ctx.fillStyle = '#eab308'; // Amber Sensor B
    ctx.beginPath();
    ctx.arc(modPxX + 4, modPxY + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Vibration Motor Feedback Animation on Cane Handle
    if (caneState.isOverheadAlert || caneState.isDropoffAlert) {
      ctx.save();
      const pulseCount = 3;
      const baseColor = caneState.isDropoffAlert
        ? 'rgba(234, 179, 8, '
        : 'rgba(56, 189, 248, ';

      for (let p = 0; p < pulseCount; p++) {
        const ringRad = 8 + ((wavePhase + p * 0.33) % 1) * 22;
        const alpha = Math.max(0, 1 - ringRad / 30);
        ctx.strokeStyle = `${baseColor}${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(handPxX, handPxY, ringRad, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Haptic icon indicator next to handle
      ctx.fillStyle = caneState.isDropoffAlert ? '#f59e0b' : '#38bdf8';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      const alertText = caneState.isDropoffAlert
        ? '▼ DROP-OFF VIBRATION (DOUBLE PULSE)'
        : '▲ OVERHEAD HAZARD (FAST STACCATO)';
      ctx.fillText(alertText, handPxX - 80, handPxY - 26);
      ctx.restore();
    }

    // 8. Ultrasonic Beam Cones and Wave Propagation
    const halfAngleRad = (settings.beamHalfAngleDeg * Math.PI) / 180;
    const maxRangePx = 4.0 * pixelsPerMeter;

    // Helper to draw acoustic cone and expanding wavefronts
    const drawUltrasonicCone = (
      sensorAngle: number,
      fillColor: string,
      strokeColor: string,
      waveColor: string,
      reading: CaneState['sensorA'],
      sensorLabel: string
    ) => {
      ctx.save();
      const startAngle = -sensorAngle - halfAngleRad; // Canvas Y is inverted
      const endAngle = -sensorAngle + halfAngleRad;

      // 1. Cone beam area
      const coneGrad = ctx.createRadialGradient(modPxX, modPxY, 10, modPxX, modPxY, maxRangePx);
      coneGrad.addColorStop(0, fillColor);
      coneGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.02)');
      coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(modPxX, modPxY);
      ctx.arc(modPxX, modPxY, maxRangePx, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Cone outer rays
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(modPxX, modPxY);
      ctx.lineTo(modPxX + Math.cos(startAngle) * maxRangePx, modPxY + Math.sin(startAngle) * maxRangePx);
      ctx.moveTo(modPxX, modPxY);
      ctx.lineTo(modPxX + Math.cos(endAngle) * maxRangePx, modPxY + Math.sin(endAngle) * maxRangePx);
      ctx.stroke();

      // Outer boundary arc
      ctx.beginPath();
      ctx.arc(modPxX, modPxY, maxRangePx, startAngle, endAngle);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Animated Outward Pings (Emitted 40kHz ultrasound wave packets)
      for (let w = 0; w < 4; w++) {
        const pingDist = (((wavePhase + w * 0.25) % 1) * maxRangePx);
        if (pingDist > 10) {
          ctx.strokeStyle = waveColor;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(modPxX, modPxY, pingDist, startAngle, endAngle);
          ctx.stroke();
        }
      }

      // 3. Return Echo Wave if obstacle is hit
      if (reading.trueDistanceM && reading.trueDistanceM <= 4.0 && reading.signalStrength > 0.05) {
        const hitDistancePx = reading.trueDistanceM * pixelsPerMeter;
        const hitAngle = -sensorAngle; // central ray approx
        const hitPxX = modPxX + Math.cos(hitAngle) * hitDistancePx;
        const hitPxY = modPxY + Math.sin(hitAngle) * hitDistancePx;

        // Echo target point ring
        ctx.fillStyle = reading.rawDistanceM ? '#22c55e' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(hitPxX, hitPxY, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Returning concentric echo ripples from obstacle back to sensor
        const echoPhase = (1 - wavePhase);
        for (let e = 0; e < 2; e++) {
          const echoRadius = ((echoPhase + e * 0.5) % 1) * hitDistancePx * 0.6;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(hitPxX, hitPxY, echoRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Distance measurement line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(modPxX, modPxY);
        ctx.lineTo(hitPxX, hitPxY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Live distance tag on beam
        const midX = (modPxX + hitPxX) / 2;
        const midY = (modPxY + hitPxY) / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(midX - 25, midY - 14, 50, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(
          `${reading.rawDistanceM ? reading.rawDistanceM.toFixed(2) + 'm' : 'LOST ECHO'}`,
          midX - 22,
          midY - 2
        );
      }

      ctx.restore();
    };

    // Sensor A: Upward beam (+28 deg)
    drawUltrasonicCone(
      mount.sensorAAngleRad,
      'rgba(56, 189, 248, 0.16)', // Cyan fill
      'rgba(56, 189, 248, 0.6)',
      'rgba(56, 189, 248, 0.8)',
      caneState.sensorA,
      'Sensor A (Upward)'
    );

    // Sensor B: Downward beam (-46 deg)
    drawUltrasonicCone(
      mount.sensorBAngleRad,
      'rgba(245, 158, 11, 0.14)', // Amber fill
      'rgba(245, 158, 11, 0.6)',
      'rgba(245, 158, 11, 0.8)',
      caneState.sensorB,
      'Sensor B (Downward)'
    );

    // 9. Interactive Placement Ghost Preview (if user selected an obstacle to place)
    if (selectedObstacleTypeForPlacement) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fillRect(width * 0.65, groundY - 120, 40, 120);
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(width * 0.65, groundY - 120, 40, 120);
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Click walkway to place obstacle', width * 0.55, groundY - 130);
    }

    // 10. Live Alert HUD on canvas
    if (caneState.isOverheadAlert) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(16, 16, 260, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('▲ OVERHEAD HAZARD DETECTED', 28, 36);
    }

    if (caneState.isDropoffAlert) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.fillRect(16, caneState.isOverheadAlert ? 54 : 16, 260, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('▼ DROP-OFF DETECTED AHEAD', 28, (caneState.isOverheadAlert ? 54 : 16) + 20);
    }
  }, [
    caneState,
    obstacles,
    settings,
    wavePhase,
    selectedObstacleTypeForPlacement,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Click on canvas to place obstacle
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const width = canvas.width;
    const groundY = canvas.height - 90;
    const pixelsPerMeter = 90;
    const cameraOffsetX = caneState.x * pixelsPerMeter - width * 0.28;

    const worldX = (screenX + cameraOffsetX) / pixelsPerMeter;
    const worldY = (groundY - screenY) / pixelsPerMeter;

    // Check if clicked an existing obstacle to delete/inspect
    const clickedObs = obstacles.find((obs) => {
      if (obs.type === 'drop_off') {
        return worldX >= obs.x && worldX <= obs.x + obs.width && Math.abs(worldY) < 0.6;
      }
      return (
        worldX >= obs.x &&
        worldX <= obs.x + obs.width &&
        worldY >= obs.y &&
        worldY <= obs.y + obs.height
      );
    });

    if (clickedObs && !selectedObstacleTypeForPlacement) {
      if (e.shiftKey || e.altKey) {
        onRemoveObstacle(clickedObs.id);
      }
      return;
    }

    if (selectedObstacleTypeForPlacement) {
      // Create new obstacle based on chosen type
      let newObs: Obstacle;
      const id = `obs_${Date.now()}`;
      const snapX = Math.round(worldX * 10) / 10;

      switch (selectedObstacleTypeForPlacement) {
        case 'overhead_branch':
          newObs = {
            id,
            type: 'overhead_branch',
            name: 'Overhead Branch',
            x: snapX,
            y: 1.7,
            width: 0.9,
            height: 0.35,
            reflectivity: 1.0,
            description: 'Head-height branch (missed by ground sweep).',
          };
          break;
        case 'overhead_sign':
          newObs = {
            id,
            type: 'overhead_sign',
            name: 'Street Signboard',
            x: snapX,
            y: 1.75,
            width: 0.8,
            height: 0.45,
            reflectivity: 1.0,
            description: 'Overhead metal signboard.',
          };
          break;
        case 'drop_off':
          newObs = {
            id,
            type: 'drop_off',
            name: 'Step Down Drop-off',
            x: snapX,
            y: 0,
            width: 1.6,
            height: 0.4,
            depth: 0.4,
            reflectivity: 0.9,
            description: 'Curb / platform drop-off.',
          };
          break;
        case 'thin_pole':
          newObs = {
            id,
            type: 'thin_pole',
            name: 'Thin Lamp Post',
            x: snapX,
            y: 0,
            width: 0.12,
            height: 2.2,
            reflectivity: 0.4,
            description: 'Narrow cylindrical metal pole.',
          };
          break;
        case 'glass_panel':
          newObs = {
            id,
            type: 'glass_panel',
            name: 'Clear Glass Partition',
            x: snapX,
            y: 0,
            width: 0.15,
            height: 2.0,
            reflectivity: 0.1,
            description: 'Acoustic mirror surface (specular deflection).',
          };
          break;
        case 'soft_surface':
          newObs = {
            id,
            type: 'soft_surface',
            name: 'Padded Wall / Heavy Coat',
            x: snapX,
            y: 0.2,
            width: 0.6,
            height: 1.5,
            reflectivity: 0.3,
            description: 'Sound-absorbent fabric and angled surface.',
          };
          break;
        case 'low_obstacle':
        default:
          newObs = {
            id,
            type: 'low_obstacle',
            name: 'Low Concrete Block',
            x: snapX,
            y: 0,
            width: 0.5,
            height: 0.35,
            reflectivity: 0.9,
            description: 'Ground curb or trip hazard.',
          };
          break;
      }

      onAddObstacle(newObs);
      onClearPlacementMode();
    }
  };

  // Hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const width = canvas.width;
    const groundY = canvas.height - 90;
    const pixelsPerMeter = 90;
    const cameraOffsetX = caneState.x * pixelsPerMeter - width * 0.28;

    const worldX = (screenX + cameraOffsetX) / pixelsPerMeter;
    const worldY = (groundY - screenY) / pixelsPerMeter;

    const hovered = obstacles.find((obs) => {
      if (obs.type === 'drop_off') {
        return worldX >= obs.x && worldX <= obs.x + obs.width && Math.abs(worldY) < 0.6;
      }
      return (
        worldX >= obs.x &&
        worldX <= obs.x + obs.width &&
        worldY >= obs.y &&
        worldY <= obs.y + obs.height
      );
    });

    setHoveredObstacle(hovered || null);
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={920}
        height={440}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredObstacle(null)}
        className="w-full h-auto cursor-crosshair block select-none"
      />

      {/* Top Overlay Legend & Status */}
      <div className="absolute top-3 right-3 flex items-center gap-2 text-xs bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
          <span className="text-slate-300 font-medium">Sensor A (Upward +28°)</span>
        </div>
        <span className="text-slate-500">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
          <span className="text-slate-300 font-medium">Sensor B (Downward -46°)</span>
        </div>
      </div>

      {/* Bottom Walkway Distance & Walker Position */}
      <div className="absolute bottom-2 left-3 flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-900/70 backdrop-blur-sm px-2.5 py-1 rounded border border-slate-800">
        <span>Walker Pos: {caneState.x.toFixed(2)}m</span>
        <span>·</span>
        <span>Speed: {settings.walkingSpeed.toFixed(1)} m/s</span>
        <span>·</span>
        <span className={caneState.isOverheadAlert || caneState.isDropoffAlert ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
          Haptics: {caneState.vibrationPattern.toUpperCase()}
        </span>
      </div>

      {/* Hovered Obstacle Tooltip */}
      {hoveredObstacle && (
        <div className="absolute bottom-2 right-3 max-w-xs text-xs bg-slate-900/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-700 shadow-xl text-slate-200">
          <div className="font-semibold text-white flex items-center justify-between gap-2">
            <span>{hoveredObstacle.name}</span>
            <span className="text-cyan-400 font-mono">ρ = {hoveredObstacle.reflectivity}</span>
          </div>
          <p className="text-slate-400 text-[11px] mt-1">{hoveredObstacle.description}</p>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>Pos: {hoveredObstacle.x.toFixed(1)}m</span>
            <span>Shift+Click to remove</span>
          </div>
        </div>
      )}
    </div>
  );
};
