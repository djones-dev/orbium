// Signal Core Vertex Shader
// Implements multi-octave 3D noise displacement for organic, spiky appearance
// Inspired by Arcane's Wild Runes aesthetic

// Uniforms
uniform float uTime;
uniform float uNoiseScale;
uniform float uDisplacementStrength;
uniform float uPulseSpeed; // Added for audio reactivity control
uniform vec3 uMousePosition;
uniform float uMouseInfluence;
uniform float uSelected;

// Varyings passed to fragment shader
varying float vDisplacement;
varying vec3 vNormal;
varying vec3 vViewPosition;

//
// 3D Simplex Noise
// Description : Array and textureless GLSL 2D/3D/4D simplex noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License.
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractal Brownian Motion - layered noise for organic detail
// Uses 3 octaves with decreasing amplitude and increasing frequency
float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  // First octave - large features
  value += amplitude * snoise(p * frequency);

  // Second octave - medium detail
  amplitude *= 0.5;
  frequency *= 2.0;
  value += amplitude * snoise(p * frequency);

  // Third octave - fine detail (creates the spiky appearance)
  amplitude *= 0.5;
  frequency *= 2.0;
  value += amplitude * snoise(p * frequency);

  return value;
}

void main() {
  vec3 pos = position;
  float timeScale = uTime * uPulseSpeed * 0.08;  // Audio controls speed

  // 1. Natural "Wobble" - Shifting the noise origin over time for fluid motion
  vec3 noisePos = pos * uNoiseScale + vec3(sin(timeScale * 0.5), cos(timeScale * 0.3), timeScale);
  float noiseValue = fbm(noisePos);
  
  vec3 noisePos2 = pos * uNoiseScale * 1.5 + vec3(-timeScale, sin(timeScale), -cos(timeScale));
  float noiseValue2 = fbm(noisePos2);

  // 2. High-Contrast Spikes
  // Increasing the power to 3.0 creates much sharper, needle-like peaks 
  float combinedNoise = (noiseValue * 0.6 + noiseValue2 * 0.4 + 1.0) * 0.5;
  float displacement = pow(combinedNoise, 3.5); 

  // 3. Mouse Interaction (Optional, can be used for extra interactivity later)
  float mouseDistance = distance(pos, uMousePosition);
  float mousePeak = pow(1.0 - smoothstep(0.0, 1.0, mouseDistance), 4.0);
  
  float totalDisplacement = displacement + (mousePeak * uMouseInfluence * 0.8);

  // Apply outward along normal to keep it 3D
  pos += normal * totalDisplacement * uDisplacementStrength;

  // Selection scale boost
  pos *= (1.0 + uSelected * 0.1);

  vDisplacement = totalDisplacement;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0); 
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
