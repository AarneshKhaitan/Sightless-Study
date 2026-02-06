const ARRIVAL_THRESHOLD = 0.05;

export interface GuidanceResult {
  direction: string;
  arrived: boolean;
}

export function computeGuidance(
  pointerX: number,
  pointerY: number,
  targetX: number,
  targetY: number
): GuidanceResult {
  const dx = targetX - pointerX;
  const dy = targetY - pointerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ARRIVAL_THRESHOLD) {
    return { direction: "You found it!", arrived: true };
  }

  if (dist < ARRIVAL_THRESHOLD * 2) {
    return { direction: "You're very close!", arrived: false };
  }

  const directions: string[] = [];
  if (Math.abs(dx) > 0.03) {
    directions.push(dx > 0 ? "right" : "left");
  }
  if (Math.abs(dy) > 0.03) {
    directions.push(dy > 0 ? "down" : "up");
  }

  if (directions.length === 0) {
    return { direction: "You're very close!", arrived: false };
  }

  return {
    direction: `Move ${directions.join(" and ")}.`,
    arrived: false,
  };
}
