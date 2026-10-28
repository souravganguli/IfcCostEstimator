// Pure, DOM-free helpers for the first-person walkthrough and its minimap so the
// movement and marker math can be unit tested independently of pointer lock,
// animation frames, and the viewer adapter.

/** Keys currently held, lower-cased (e.g. 'w', 'arrowup', 'shift'). */
export type HeldKeys = ReadonlySet<string>;

/** A world-space displacement on the ground plane. */
export interface Step {
  readonly dx: number;
  readonly dz: number;
}

/** A clamped 2D minimap position expressed as percentages (4..96). */
export interface MarkerPosition {
  readonly left: number;
  readonly top: number;
}

/**
 * Computes the X/Z displacement for a walkthrough frame from the held keys and
 * the current heading. Forward is W/ArrowUp, back is S/ArrowDown, strafe is
 * D/ArrowRight minus A/ArrowLeft, and Shift applies the faster speed.
 */
export function firstPersonStep(keys: HeldKeys, headingY: number, baseSpeed = 0.05, sprintSpeed = 0.12): Step {
  const speed = keys.has('shift') ? sprintSpeed : baseSpeed;
  const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
  const strafe = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  return {
    dx: (Math.sin(headingY) * forward + Math.cos(headingY) * strafe) * speed,
    dz: (Math.cos(headingY) * forward - Math.sin(headingY) * strafe) * speed,
  };
}

/**
 * Maps a camera X/Z position to a clamped minimap marker position in percent.
 * The marker stays within 4..96 so it never leaves the minimap bounds.
 */
export function minimapMarker(positionX: number, positionZ: number): MarkerPosition {
  return {
    left: Math.max(4, Math.min(96, 50 + positionX * 2)),
    top: Math.max(4, Math.min(96, 50 - positionZ * 2)),
  };
}
