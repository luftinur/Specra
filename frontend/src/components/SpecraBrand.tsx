import React from 'react';

interface SpecraIconProps {
  size?: number;
  className?: string;
  showAccent?: boolean;
}

interface SpecraWordmarkProps {
  height?: number;
  className?: string;
  color?: string;
}

interface SpecraLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * Specra Monogram SVG App Icon (512x512 Vector)
 * Standard macOS/Windows/Linux squircle with subtle depth, deep charcoal/slate palette (#12151A to #0F1115),
 * and neo-grotesk geometric 's' monogram with 90° terminal cuts.
 */
export const SpecraIcon: React.FC<SpecraIconProps> = ({
  size = 32,
  className = '',
  showAccent = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="specra icon"
    >
      <defs>
        {/* Background Deep Slate Charcoal Gradient (Silicon Valley Standard) */}
        <linearGradient id="specra-bg" x1="256" y1="16" x2="256" y2="496" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#12151A" />
          <stop offset="50%" stopColor="#0F1115" />
          <stop offset="100%" stopColor="#0A0B0E" />
        </linearGradient>

        {/* Ambient Top Light Reflection (macOS Squircle Specular Glow) */}
        <linearGradient id="specra-specular" x1="256" y1="16" x2="256" y2="496" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.01" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
        </linearGradient>

        {/* Monogram 's' Subtle Depth Gradient */}
        <linearGradient id="specra-s-grad" x1="256" y1="138" x2="256" y2="374" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Indigo / Sky Engineering Spectrum Accent */}
        <linearGradient id="specra-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Drop Shadow for Monogram */}
        <filter id="specra-shadow" x="110" y="100" width="292" height="312" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 1. Squircle Base Container */}
      <rect
        x="20"
        y="20"
        width="472"
        height="472"
        rx="106"
        fill="url(#specra-bg)"
      />

      {/* 2. Inner Glow & Specular Stroke */}
      <rect
        x="20"
        y="20"
        width="472"
        height="472"
        rx="106"
        fill="none"
        stroke="url(#specra-specular)"
        strokeWidth="3.5"
      />

      {/* 3. Subtle Inner Grid Texture / Studio Aesthetic */}
      <circle cx="256" cy="256" r="176" stroke="#FFFFFF" strokeOpacity="0.03" strokeWidth="1" />
      <circle cx="256" cy="256" r="116" stroke="#FFFFFF" strokeOpacity="0.02" strokeWidth="1" />

      {/* 4. Geometric Neo-Grotesk Monogram 's' (Heavy 800, 90° terminal cuts) */}
      <g filter="url(#specra-shadow)">
        <path
          d="M 334 192 
             C 334 150, 302 138, 256 138 
             C 204 138, 178 162, 178 198 
             C 178 238, 206 252, 260 264 
             C 316 276, 338 292, 338 330 
             C 338 368, 306 374, 256 374 
             C 202 374, 176 352, 176 320"
          stroke="url(#specra-s-grad)"
          strokeWidth="54"
          strokeLinecap="butt"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* 5. Precision Node / Spectrum Accent Dot */}
      {showAccent && (
        <circle
          cx="334"
          cy="192"
          r="8"
          fill="url(#specra-accent)"
        />
      )}
    </svg>
  );
};

/**
 * Specra Geometric Vector Wordmark (All-Lowercase 'specra')
 * Pure SVG Vector Path implementation:
 * - Neo-Grotesk Geometris (Heavy 800 weight)
 * - Single-story geometric pure 'a' (circle counter with vertical stem)
 * - Symmetrical 's' with 90° horizontal cuts
 * - Circular counters for 'p', 'e', 'c'
 * - Clean terminal arch for 'r'
 * Renders 100% pixel-perfect on any OS without local font dependencies.
 */
export const SpecraWordmark: React.FC<SpecraWordmarkProps> = ({
  height = 18,
  className = '',
  color = 'currentColor',
}) => {
  // Aspect ratio is 174 / 38 = ~4.58:1
  const width = Math.round(height * 4.58);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 174 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="specra"
    >
      <g
        stroke={color}
        strokeWidth="4.4"
        strokeLinejoin="round"
        fill="none"
      >
        {/* 's': Symmetrical curves, medium aperture, 90° horizontal terminal cuts */}
        <path
          d="M 23.5 13 
             C 23.5 10.2, 19.5 9, 13.5 9 
             C 7.5 9, 3.5 11, 3.5 13.8 
             C 3.5 16.8, 7.5 17.8, 13.5 18.5 
             C 19.5 19.2, 23.5 20.4, 23.5 23.2 
             C 23.5 26, 19.5 27, 13.5 27 
             C 7.5 27, 3.5 25, 3.5 22.2"
          strokeLinecap="butt"
        />

        {/* 'p': Stable vertical stem descending to y=35, circular counter (mangkuk) */}
        <path
          d="M 33 35 L 33 9"
          strokeLinecap="round"
        />
        <path
          d="M 33 11.5 
             C 36 9.8, 39.5 9, 43.5 9 
             C 48.5 9, 53 13, 53 18 
             C 53 23, 48.5 27, 43.5 27 
             C 39.5 27, 36 26.2, 33 24.5"
          strokeLinecap="round"
        />

        {/* 'e': Open circular counter, horizontal crossbar aligned with midline */}
        <path
          d="M 61 18 L 81.5 18 
             C 81.5 13, 77.5 9, 71.5 9 
             C 65 9, 61 13.5, 61 18 
             C 61 22.5, 65 27, 71.5 27 
             C 76.5 27, 79.5 25.2, 81.5 22.5"
          strokeLinecap="round"
        />

        {/* 'c': Open circular counter with clean terminals */}
        <path
          d="M 110.5 13.5 
             C 108.5 10.5, 105 9, 100.5 9 
             C 94 9, 90 13.5, 90 18 
             C 90 22.5, 94 27, 100.5 27 
             C 105 27, 108.5 25.5, 110.5 22.5"
          strokeLinecap="round"
        />

        {/* 'r': Vertical stem + clean terminal arch */}
        <path
          d="M 120 27 L 120 9"
          strokeLinecap="round"
        />
        <path
          d="M 120 14.5 
             C 122 10.5, 125.5 9, 130.5 9 
             C 133 9, 135 9.8, 136.5 11.2"
          strokeLinecap="round"
        />

        {/* 'a': Single-story geometric pure 'a' (circle with straight vertical right stem) */}
        <path
          d="M 162 9 L 162 27"
          strokeLinecap="round"
        />
        <path
          d="M 162 12.5 
             C 159.5 10.2, 156 9, 151.5 9 
             C 145.5 9, 141.5 13.5, 141.5 18 
             C 141.5 22.5, 145.5 27, 151.5 27 
             C 156 27, 159.5 25.8, 162 23.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

/**
 * Integrated Specra Brand Logo (Monogram Squircle Icon + Vector Wordmark)
 */
export const SpecraLogo: React.FC<SpecraLogoProps> = ({
  size = 22,
  showWordmark = true,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <SpecraIcon size={size} />
      {showWordmark && (
        <SpecraWordmark height={Math.round(size * 0.78)} className="text-fg" />
      )}
    </div>
  );
};
