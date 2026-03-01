/**
 * CSS @keyframes presets for pen-* shapes.
 *
 * Usage (in any PenNode): animation: "pen-float 3s ease-in-out infinite"
 *
 * Available presets:
 *   pen-pulse       — scale 1 → 1.05 → 1  (good for CTAs, buttons)
 *   pen-float       — translateY 0 → -10px → 0  (good for decorative elements, blobs)
 *   pen-spin        — rotate 0 → 360deg  (good for icons, spinners)
 *   pen-shimmer     — brightness/saturation pulse  (good for highlights, cards)
 *   pen-bounce      — spring translateY  (good for attention-grabbing elements)
 *   pen-glow        — drop-shadow pulse  (good for neon/glowing effects)
 *   pen-fade-in     — opacity 0 → 1  (one-shot: use with "forwards" fill-mode)
 *   pen-shake       — horizontal shake  (good for alerts, errors)
 *   pen-color-cycle — hue-rotate 0 → 360deg  (good for colorful/festive themes)
 *   pen-slide-up    — translateY(20px) + opacity 0 → 1  (one-shot reveal)
 */

const KEYFRAMES_CSS = `
@keyframes pen-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}

@keyframes pen-float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-10px); }
}

@keyframes pen-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes pen-shimmer {
  0%, 100% { filter: brightness(1) saturate(1); }
  50%      { filter: brightness(1.2) saturate(1.4); }
}

@keyframes pen-bounce {
  0%, 100% { transform: translateY(0);     animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
  50%      { transform: translateY(-14px); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
}

@keyframes pen-glow {
  0%, 100% { filter: drop-shadow(0 0 4px  rgba(255,255,255,0.6)); }
  50%      { filter: drop-shadow(0 0 14px rgba(255,255,255,1.0)); }
}

@keyframes pen-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes pen-shake {
  0%,  100% { transform: translateX(0);   }
  15%       { transform: translateX(-6px); }
  30%       { transform: translateX(5px);  }
  45%       { transform: translateX(-4px); }
  60%       { transform: translateX(3px);  }
  75%       { transform: translateX(-2px); }
  90%       { transform: translateX(1px);  }
}

@keyframes pen-color-cycle {
  0%   { filter: hue-rotate(0deg);   }
  100% { filter: hue-rotate(360deg); }
}

@keyframes pen-slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
`;

let injected = false;

/**
 * Idempotent — safe to call on every render. Injects the @keyframes stylesheet
 * into document.head once. All four ShapeUtils call this to ensure the CSS is
 * available before any shape animates.
 */
export function injectAnimationCSS(): void {
    if (injected || typeof document === "undefined") return;
    injected = true;
    const style = document.createElement("style");
    style.id = "pen-animation-keyframes";
    style.textContent = KEYFRAMES_CSS;
    document.head.appendChild(style);
}
