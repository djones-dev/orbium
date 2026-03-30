// Moon Fragment Shader
// Gem-like, faceted appearance. Dark core with strong Fresnel rim glow.
// Modulator moons pulse more aggressively (useFrame sets higher uPulseSpeed).
precision highp float;

uniform vec3  uBodyColor;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uGlowIntensity;
uniform float uOpacity;
uniform float uSelected;

varying float vDisplacement;
varying vec3  vNormal;
varying vec3  vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Sharp Fresnel — tight gem-like rim, near-black core
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 4.0);

  vec3 coreColor = uBodyColor * 0.05;
  vec3 rimColor  = uBodyColor * (1.8 + uGlowIntensity * 0.6);
  vec3 surfaceColor = mix(coreColor, rimColor, fresnel);

  // Subtle face highlight on high-displacement facets
  float facetHighlight = smoothstep(0.45, 0.75, vDisplacement) * 0.3;
  surfaceColor += uBodyColor * facetHighlight;

  // Pulse — frequency 1.5× uPulseSpeed; modulators pulse faster from useFrame
  float pulse = 0.75 + sin(uTime * uPulseSpeed * 1.5) * 0.25;
  surfaceColor *= pulse;

  // Selection rim
  surfaceColor += vec3(1.0, 1.0, 1.0) * fresnel * uSelected * 0.6;

  // Ambient fill
  surfaceColor += uBodyColor * 0.06;

  // Reinhard tone map + gamma
  surfaceColor = surfaceColor / (surfaceColor + vec3(1.0));
  surfaceColor = pow(surfaceColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(surfaceColor, uOpacity);
}
