// Planet Fragment Shader
// Rocky/solid appearance with atmospheric Fresnel glow.
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
  // Slightly softer Fresnel — wider atmosphere band
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

  // Three-stop rock gradient driven by uBodyColor
  vec3 darkRock   = uBodyColor * 0.15;
  vec3 midRock    = uBodyColor * 0.55;
  vec3 litRidge   = uBodyColor * 1.1 + vec3(0.05, 0.05, 0.08);

  vec3 surfaceColor = mix(darkRock,    midRock,    smoothstep(0.25, 0.55, vDisplacement));
  surfaceColor      = mix(surfaceColor, litRidge,  smoothstep(0.55, 0.85, vDisplacement));

  // Thin atmospheric glow — slight cool-tint towards edges
  vec3 atmosphereColor = uBodyColor * 1.5 + vec3(0.06, 0.10, 0.20);
  float atmIntensity   = fresnel * uGlowIntensity * 0.45;

  // Very gentle breathing — low amplitude
  float timeFactor = 0.88 + sin(uTime * uPulseSpeed * 0.4) * 0.06;

  vec3 finalColor = surfaceColor;
  finalColor += atmosphereColor * atmIntensity * timeFactor;

  // Selection highlight
  finalColor += vec3(1.0, 1.0, 1.0) * fresnel * uSelected * 0.4;

  // Ambient fill
  finalColor += uBodyColor * 0.04 * uGlowIntensity;

  // Reinhard tone map + gamma
  finalColor = finalColor / (finalColor + vec3(1.0));
  finalColor = pow(finalColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(finalColor, uOpacity);
}
