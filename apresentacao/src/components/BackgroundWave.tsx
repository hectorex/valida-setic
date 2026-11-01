import React, { useMemo } from 'react';

interface BackgroundWaveProps {
  tintOpacity: number;
  waveTransform: {
    x: number;
    y: number;
    scale: number;
    opacity: number;
  };
}

export const BackgroundWave: React.FC<BackgroundWaveProps> = ({
  tintOpacity,
  waveTransform,
}) => {
  // Generate 36 closed, seamless mathematical orbital wave rings (polar coordinates)
  // These loops close 360 degrees, so when rotating, they NEVER appear clipped or with cut edges!
  const orbitalRings = useMemo(() => {
    const list: string[] = [];
    const numRings = 32;
    const steps = 180;

    for (let i = 0; i < numRings; i++) {
      const baseRadius = 140 + i * 16;
      const waveAmplitude = 18 + (i % 6) * 5;
      const frequency = 4 + (i % 4);
      const phase = (i * Math.PI) / 12;

      let d = '';
      for (let s = 0; s <= steps; s++) {
        const theta = (s / steps) * Math.PI * 2;
        const r = baseRadius + Math.sin(theta * frequency + phase) * waveAmplitude;
        const x = 700 + r * Math.cos(theta);
        const y = 700 + r * Math.sin(theta);

        if (s === 0) {
          d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        } else {
          d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      }
      d += ' Z'; // Perfectly closed loop
      list.push(d);
    }
    return list;
  }, []);

  return (
    <>
      {/* Dynamic Geometric Wave Container - Seamless Closed Harmonic Rings */}
      <div
        id="wave-container"
        className="pointer-events-none absolute left-0 top-0 w-[1400px] h-[1400px] transition-all duration-[1400ms] ease-out will-change-transform"
        style={{
          transform: `translate(${waveTransform.x}px, ${waveTransform.y}px) scale(${waveTransform.scale})`,
          opacity: waveTransform.opacity,
          maskImage: 'radial-gradient(circle at 700px 700px, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 85%)',
          WebkitMaskImage: 'radial-gradient(circle at 700px 700px, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 85%)',
        }}
      >
        <svg
          viewBox="0 0 1400 1400"
          width="1400"
          height="1400"
          className="w-full h-full animate-[spin_45s_linear_infinite]"
          style={{ transformOrigin: '700px 700px' }}
        >
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8f9bff" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#4060ff" stopOpacity="0.55" />
              <stop offset="80%" stopColor="#3050ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#aab3ff" stopOpacity="0.15" />
            </linearGradient>
            <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <g fill="none" stroke="url(#waveGrad)" strokeWidth="1.4" filter="url(#waveGlow)">
            {orbitalRings.map((d, idx) => (
              <path key={idx} d={d} />
            ))}
          </g>
        </svg>
      </div>

      {/* Ambient Red/Warning Tint Overlay (Active in Slide 4) */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000 ease-in-out"
        style={{
          opacity: tintOpacity,
          background: 'radial-gradient(circle at 70% 50%, rgba(255, 30, 60, 0.5), transparent 70%)',
        }}
      />

      {/* Grid Pattern Background Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1.5px, transparent 1.5px), linear-gradient(to bottom, #ffffff 1.5px, transparent 1.5px)`,
          backgroundSize: '50px 50px',
        }}
      />
    </>
  );
};
