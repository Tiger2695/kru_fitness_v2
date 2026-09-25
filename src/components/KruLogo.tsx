import React from 'react';

interface KruLogoProps {
  className?: string;
  size?: number;
}

export const KruLogo: React.FC<KruLogoProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Kru Fitness Logo"
    >
      <defs>
        <linearGradient id="kruBgGrad" x1="64" y1="64" x2="448" y2="448" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#115E59" />
        </linearGradient>
        <linearGradient id="kruTealGrad" x1="200" y1="140" x2="380" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>

      {/* Circular Dark Base with Teal Tint */}
      <circle cx="256" cy="256" r="256" fill="url(#kruBgGrad)" />

      {/* Subtle Athletic Accent Ring */}
      <circle cx="256" cy="256" r="240" stroke="#2DD4BF" strokeOpacity="0.2" strokeWidth="4" />

      {/* Minimalist Bold Lettermark 'K' for Kru Fitness */}
      {/* 1. Vertical Pillar (Strength & Stability) */}
      <rect x="136" y="128" width="56" height="256" rx="18" fill="#FFFFFF" />

      {/* 2. Top Diagonal Wing (Dynamic Athletic Slash in Vibrant Teal) */}
      <path
        d="M 206 282 L 328 150 C 337 140 353 140 362 150 C 372 160 372 176 362 186 L 254 302 Z"
        fill="url(#kruTealGrad)"
      />

      {/* 3. Bottom Diagonal Leg (Firm Athletic Base in Pure White) */}
      <path
        d="M 238 258 L 344 366 C 354 376 354 392 344 402 C 334 412 318 412 308 402 L 206 300 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
