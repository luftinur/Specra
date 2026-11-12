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
 * Standard macOS/Windows squircle with subtle depth and neo-grotesk geometric 's' monogram.
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
    >
      <defs>
        {/* Background Deep Slate Charcoal Gradient */}
        <linearGradient id="specra-bg" x1="256" y1="16" x2="256" y2="496" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B1E26" />
          <stop offset="50%" stopColor="#111318" />
          <stop offset="100%" stopColor="#0A0B0E" />
        </linearGradient>

        {/* Ambient Top Light Reflection (macOS Squircle Specular) */}
        <linearGradient id="specra-specular" x1="256" y1="16" x2="256" y2="496" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.01" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
        </linearGradient>

        {/* Monogram 's' Subtle Depth Gradient */}
        <linearGradient id="specra-s-grad" x1="256" y1="140" x2="256" y2="372" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Indigo / Sky Engineering Accent */}
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

      {/* 4. Geometric Neo-Grotesk Monogram 's' */}
      <g filter="url(#specra-shadow)">
        <path
          d="M 334 192 
             C 334 152, 302 140, 256 140 
             C 204 140, 178 162, 178 198 
             C 178 238, 206 252, 260 264 
             C 316 276, 338 292, 338 330 
             C 338 368, 306 372, 256 372 
             C 202 372, 176 352, 176 320"
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
          className="animate-pulse"
        />
      )}
    </svg>
  );
};

/**
 * Specra Geometric Vector Wordmark (All-Lowercase)
 * Neo-Grotesk typography: bold weight, circular counters, single-story 'a'.
 */
export const SpecraWordmark: React.FC<SpecraWordmarkProps> = ({
  height = 18,
  className = '',
  color = 'currentColor',
}) => {
  // Proportional width for height=18 is ~92px (aspect ratio ~5.1:1)
  const width = Math.round(height * 5.11);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 184 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="specra"
    >
      <text
        x="0"
        y="27"
        fill={color}
        fontFamily="Geist, 'Inter Display', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        fontSize="31"
        fontWeight="800"
        letterSpacing="-0.035em"
      >
        specra
      </text>
    </svg>
  );
};

/**
 * Integrated Specra Brand Logo (Monogram Icon + Wordmark)
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
        <SpecraWordmark height={Math.round(size * 0.72)} className="text-fg" />
      )}
    </div>
  );
};
