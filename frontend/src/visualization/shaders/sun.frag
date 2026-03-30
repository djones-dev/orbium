precision highp float;

// Uniforms
uniform vec3 uBaseColor;      // Dark void color
uniform vec3 uSecondaryColor; // Deep bioluminescent blue/teal
uniform vec3 uGlowColor;      // Primary signal glowing color
uniform float uTime;
uniform float uPulseSpeed;    // Match vertex shader
uniform float uGlowIntensity;
uniform float uOpacity;       // For smooth fade-in
uniform float uSelected;

varying float vDisplacement;
varying vec3 vNormal;         
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  // Fresnel for edge glow
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

  // 1. Organic Color Grading
  vec3 organicGradient = mix(uBaseColor, uSecondaryColor, smoothstep(0.1, 0.5, vDisplacement));
  organicGradient = mix(organicGradient, uGlowColor, smoothstep(0.4, 0.9, vDisplacement));

  // 2. Subsurface Scattering Approximation
  // Makes the thin spikes look like they are "holding" light from within
  float spikeGlow = pow(vDisplacement, 2.0) * 1.5;

  // 3. Energy "Veins"
  // Creates thin, crackling lines
  // Use PulseSpeed to control vein pulsing speed too
  float timeVar = uTime * uPulseSpeed;
  float veins = step(0.75, vDisplacement + sin(timeVar + vDisplacement * 15.0) * 0.04);
  vec3 veinColor = uGlowColor * veins * (0.4 + 0.6 * sin(timeVar * 1.5));

  // 4. Pulse & Breathe Logic
  float timeFactor = (sin(timeVar * 0.8) * 0.4) + (sin(timeVar * 0.5) * 0.3) + 0.7;

  // 5. Composition
  vec3 finalColor = organicGradient;
  
  // Apply edge fresnel with pulsing
  finalColor += uGlowColor * fresnel * uGlowIntensity * timeFactor;
  
  // Add the internal vein crackle
  finalColor += veinColor;

  // Add spike-tip luminescence
  finalColor += uGlowColor * spikeGlow * 0.2 * timeFactor;

  // 6. Selection Highlight
  // Add a bright white/glow overlay if selected
  finalColor += vec3(1.0, 1.0, 1.0) * fresnel * uSelected * 0.5;

  // 7. Refinement & Tone Mapping
  finalColor += uGlowColor * 0.05 * uGlowIntensity; // Subtle ambient
  finalColor = finalColor / (finalColor + vec3(1.0));
  finalColor = pow(finalColor, vec3(1.0 / 2.2)); // Gamma correction

  gl_FragColor = vec4(finalColor, uOpacity);
}
