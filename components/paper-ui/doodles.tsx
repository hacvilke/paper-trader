/**
 * Shared SVG doodles + the "rough ink" filters that make everything
 * look hand-drawn. `RoughDefs` is rendered once in the root layout.
 */

export function RoughDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        <filter id="rough-ink" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" />
        </filter>
        <filter id="rough-line" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
      </defs>
    </svg>
  );
}

/** Hand-drawn arrow pointing up-right (for price bumps). */
export function ArrowUp() {
  return (
    <svg className="doodle" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M3 13 C 5.5 12, 7 8.5, 7.8 3.5 M7.8 3.5 C 6.4 5, 5.4 5.8, 3.8 6.4 M7.8 3.5 C 8.8 5.4, 9.9 6.4, 11.9 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#rough-line)"
      />
    </svg>
  );
}

/** Hand-drawn arrow pointing down-right (for price dips). */
export function ArrowDown() {
  return (
    <svg className="doodle" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M3 13 C 5.5 12, 7 8.5, 7.8 3.5 M7.8 3.5 C 6.4 5, 5.4 5.8, 3.8 6.4 M7.8 3.5 C 8.8 5.4, 9.9 6.4, 11.9 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#rough-line)"
        transform="rotate(180 8 8)"
      />
    </svg>
  );
}

/** A wobbly red-pen circle you can absolutely-position around text. */
export function RoughCircle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 54" preserveAspectRatio="none" aria-hidden>
      <path
        d="M14 30 C 16 12, 52 5, 78 7 C 104 9, 116 18, 112 32 C 107 47, 62 52, 34 48 C 12 45, 8 36, 16 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        filter="url(#rough-line)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
