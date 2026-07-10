// =============================================
// The Living Grimoire — SVG Grain Overlay
// =============================================
// Subtle parchment-grain texture overlay using SVG feTurbulence.
// Adapted from dot-portfolio's riso-grain filter.

"use client";

/**
 * Full-screen SVG grain overlay for the "old paper" aesthetic.
 * Rendered as a fixed element behind interactive content.
 */
export function GrainOverlay() {
  return (
    <>
      {/* SVG filter definition (invisible) */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
      >
        <filter id="grimoire-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            seed="7"
          />
          <feColorMatrix
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0"
          />
        </filter>
      </svg>

      {/* Grain overlay layer */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
          filter: "url(#grimoire-grain)",
          opacity: 0.4,
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}
