import React from 'react';

interface CRTEffectProps {
  enabled?: boolean;
  intensity?: 'subtle' | 'moderate' | 'strong';
}

/**
 * Optional CRT monitor effect overlay
 * Provides barrel distortion, scanlines, and phosphor glow
 * Can be toggled and adjusted for intensity
 */
export const CRTEffect: React.FC<CRTEffectProps> = ({
  enabled = true,
  intensity = 'subtle'
}) => {
  if (!enabled) return null;

  const intensityClass = {
    subtle: 'crt-subtle',
    moderate: 'crt-moderate',
    strong: 'crt-strong'
  }[intensity];

  return (
    <div className={`crt-overlay ${intensityClass}`}>
      {/* Scanlines overlay */}
      <div className="crt-scanlines-overlay"></div>

      {/* Phosphor glow layer */}
      <div className="crt-glow-overlay"></div>

      {/* Vignette effect */}
      <div className="crt-vignette"></div>

      {/* Optional: slight noise/grain */}
      <div className="crt-noise"></div>
    </div>
  );
};
