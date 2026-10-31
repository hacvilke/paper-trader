/**
 * Icon source — the Paper Trader brand mark:
 * a taped note on kraft board, red margin, ink chart going up.
 * Rendered to PNG at multiple sizes by make-icons.mjs.
 * Content sits inside the 80% safe zone so Android "maskable"
 * cropping never clips the drawing.
 */
export default `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="vg" cx="50%" cy="30%" r="90%">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#2b1704" stop-opacity="0.35"/>
    </radialGradient>
    <linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffdf4"/>
      <stop offset="1" stop-color="#f2e9d2"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
  </defs>

  <!-- kraft desk backdrop -->
  <rect width="512" height="512" fill="#8a5a33"/>
  <rect width="512" height="512" fill="url(#vg)"/>

  <!-- the note -->
  <g transform="rotate(-5 256 256)">
    <rect x="112" y="92" width="288" height="348" rx="14"
          fill="url(#sheet)" stroke="#c8b68e" stroke-width="3"/>
    <!-- aged bottom burn -->
    <rect x="112" y="92" width="288" height="348" rx="14" fill="url(#burn)"/>
    <!-- ruled lines -->
    <g stroke="rgba(58,118,197,0.28)" stroke-width="5">
      <path d="M138 180 H372"/>
      <path d="M138 232 H372"/>
      <path d="M138 284 H372"/>
      <path d="M138 336 H300"/>
    </g>
    <!-- red margin -->
    <path d="M170 106 V426" stroke="rgba(203,67,53,0.5)" stroke-width="6"/>
    <!-- headline scribble -->
    <path d="M190 138 H330" stroke="#c0392b" stroke-width="13" stroke-linecap="round"/>
    <!-- the chart -->
    <path d="M192 372 L244 306 L282 336 L360 224"
          fill="none" stroke="#1e7a44" stroke-width="19"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M360 224 l-4 40 M360 224 l-39 10"
          fill="none" stroke="#1e7a44" stroke-width="19"
          stroke-linecap="round"/>
  </g>

  <!-- washi tape at the top -->
  <g transform="rotate(-7 256 84)">
    <rect x="206" y="62" width="100" height="42" rx="4"
          fill="rgba(255,252,236,0.92)" stroke="rgba(180,160,110,0.5)" stroke-width="2"/>
  </g>
</svg>
`;
