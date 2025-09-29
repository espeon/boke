import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import type { Mesh, ShaderMaterial, Texture, Vector2 } from "three";

// Vertex shader for the twist effect with geometry rotation
const vertexShader = `
  uniform float uTime;
  uniform float uRotationSpeed;
  uniform float uLayerOffset;
  varying vec2 vUv;

  // Clamp saturation function that constrains saturation to a range
  vec3 clampSaturation(vec3 color, float minSat, float maxSat) {
    // Calculate current saturation level
    float maxChannel = max(max(color.r, color.g), color.b);
    float minChannel = min(min(color.r, color.g), color.b);
    float currentSaturation = (maxChannel - minChannel) / (maxChannel + 0.001);

    // Clamp saturation to desired range
    float targetSaturation = clamp(currentSaturation, minSat, maxSat);

    // Only modify if saturation is outside the range
    if (abs(currentSaturation - targetSaturation) < 0.001) {
      return color; // No change needed
    }

    // Apply clamped saturation using luminance-based mixing
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), color, targetSaturation / (currentSaturation + 0.001));
  }

  void main() {
    vUv = uv;

    // Rotate geometry based on time and layer
    float angle = uTime * uRotationSpeed + uLayerOffset;
    float cos_angle = cos(angle);
    float sin_angle = sin(angle);

    // Apply rotation to vertex position
    vec3 rotatedPosition = vec3(
      position.x * cos_angle - position.y * sin_angle,
      position.x * sin_angle + position.y * cos_angle,
      position.z
    );

    gl_Position = projectionMatrix * modelViewMatrix * vec4(rotatedPosition, 1.0);
  }
`;

// Fragment shader with twist distortion and bokeh blur
const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uTwistCenter;
  uniform float uTwistRadius;
  uniform float uTwistStrength;
  uniform float uLayerOffset;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform bool uUseTransparentEdges; // Flag to control repeat vs transparent behavior

  uniform float uBlurRadius;
  uniform float uSamples;
  uniform vec2 uResolution; // Canvas resolution in pixels
  uniform float uLayerIndex; // Which layer this is

  varying vec2 vUv;

  // Helper function for the twist effect
  vec2 twist(vec2 uv, vec2 center, float radius, float strength) {
    vec2 offset = uv - center;
    float distance = length(offset);

    if (distance < radius) {
      float ratio = distance / radius;
      float angle = strength * (1.0 - ratio * ratio);

      float cos_angle = cos(angle);
      float sin_angle = sin(angle);

      mat2 rotation = mat2(cos_angle, -sin_angle, sin_angle, cos_angle);
      offset = rotation * offset;
    }

    return center + offset;
  }

  // Fast box blur - much cheaper than bokeh
  vec3 boxBlur(sampler2D samp, vec2 uv, float radius) {
    vec3 col = vec3(0);
    vec2 pix = 1.0 / uResolution.xy;
    float blurSize = radius * 0.5; // Scale down for subtlety

    // Simple 3x3 box blur - let texture repeat naturally
    for(float x = -1.0; x <= 1.0; x += 1.0) {
      for(float y = -1.0; y <= 1.0; y += 1.0) {
        vec2 offset = vec2(x, y) * pix * blurSize;
        vec2 sampleUv = uv + offset;
        col += texture2D(samp, sampleUv).rgb;
      }
    }
    return col / 9.0; // Average of 9 samples
  }

  // Bokeh blur function - only for final layer
  const float pi = 3.14159265359;
  const float ang = (3.0 - sqrt(5.0)) * pi;

  vec3 bokeh(sampler2D samp, vec2 uv, float radius, float samples) {
    vec3 col = vec3(0);
    vec2 pix = 1.0 / uResolution.xy;
    vec2 radiusPixels = radius * pix;

    if (samples <= 0.0 || radius <= 0.0) {
        return texture2D(samp, uv).rgb;
    }

    // Reduced max iterations for performance
    for(float i = 0.0; i < 30.0; i++){ // Much smaller loop
        if (i >= samples) break;

        float d = i / samples;
        vec2 p = vec2(sin(ang * i), cos(ang * i)) * sqrt(d) * radiusPixels;
        vec2 sampleUv = uv + p;
        col += texture2D(samp, sampleUv).rgb;
    }
    return col / samples;
  }

  // Clamp saturation function that constrains saturation to a range
  vec3 clampSaturation(vec3 color, float minSat, float maxSat) {
    // Calculate current saturation level
    float maxChannel = max(max(color.r, color.g), color.b);
    float minChannel = min(min(color.r, color.g), color.b);
    float currentSaturation = (maxChannel - minChannel) / (maxChannel + 0.001);

    // Clamp saturation to desired range
    float targetSaturation = clamp(currentSaturation, minSat, maxSat);

    // Only modify if saturation is outside the range
    if (abs(currentSaturation - targetSaturation) < 0.001) {
      return color; // No change needed
    }

    // Apply clamped saturation using luminance-based mixing
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), color, targetSaturation / (currentSaturation + 0.001));
  }

  void main() {
    // Calculate the center of the twist effect, animating it over time
    vec2 twistCenter = uTwistCenter + vec2(
      sin(uTime * 0.1 + uLayerOffset) * 0.1,
      cos(uTime * 0.06 + uLayerOffset) * 0.1
    );

    // Animate the twist strength over time
    float dynamicStrength = uTwistStrength * (1.0 + sin(uTime * 0.16 + uLayerOffset) * 0.3);
    // Scale down texture coordinates first when using transparent edges
    vec2 scaledUv = uUseTransparentEdges ? vUv * 1.5 : vUv;

    // Apply the twist distortion to the scaled UV coordinates
    vec2 finalUv = twist(scaledUv, twistCenter, uTwistRadius, dynamicStrength);



    // Early return optimization: skip blur entirely if no blur is needed
    vec3 blurredColor;
    if (uBlurRadius <= 0.0 || uSamples <= 0.0) {
      // No blur needed - use direct texture lookup
      blurredColor = texture2D(uTexture, finalUv).rgb;
    } else {
      // Apply stacked blur based on layer
      if (uLayerIndex >= 2.0) {
        // Final layer: use bokeh blur
        blurredColor = bokeh(uTexture, finalUv, uBlurRadius, uSamples);
      } else if (uLayerIndex >= 0.0) {
        // First two layers: use fast box blur
        float boxBlurRadius = uBlurRadius * (uLayerIndex + 1.0) * 0.3; // Progressive blur
        blurredColor = boxBlur(uTexture, finalUv, boxBlurRadius);
      } else {
        // No blur
        blurredColor = texture2D(uTexture, finalUv).rgb;
      }
    }

    vec3 finalColorRgb = blurredColor;

    // Create fluid color gradients based on position and twist
    vec2 gradientUv = vUv + sin(finalUv * 3.14159 + uTime * 0.5) * 0.1;
    float gradient = smoothstep(0.0, 1.0, gradientUv.x + gradientUv.y * 0.5);

    // Blend between base color and tint for fluid effect
    vec3 fluidColor = mix(finalColorRgb, finalColorRgb * uTint * 1.3, gradient);

    // vec3 warmShift = vec3(1.1, 1.0, 0.9); // Warm tones
    // vec3 coolShift = vec3(0.9, 1.0, 1.1); // Cool tones
    // float colorShift = sin(uTime * 0.03 + uLayerOffset) * 0.5 + 0.5;
    // fluidColor *= mix(coolShift, warmShift, colorShift);

    // Apply saturation boost instead of color shifting
    fluidColor = clampSaturation(fluidColor, 0.2, 1.4); // Adaptive saturation compression

    // Handle transparency based on mode
    float finalAlpha = uOpacity;
    if (uUseTransparentEdges) {
      // Check if twisted UV is outside 0-1 range for transparency
      float uvAlpha = (finalUv.x >= 0.0 && finalUv.x <= 1.0 && finalUv.y >= 0.0 && finalUv.y <= 1.0) ? 1.0 : 0.0;
      finalAlpha = uOpacity * uvAlpha;
    }

    // Set the final fragment color
    gl_FragColor = vec4(fluidColor, finalAlpha);

  }
`;

interface TwistedLayerProps {
  texture: Texture;
  layerIndex: number;
  totalLayers: number;
  resolution: Vector2;
  blurRadius: number;
  samples: number;
  numLayers: number;
  opacity?: number;
  speedMultiplier?: number;
}

function TwistedLayer({
  texture,
  layerIndex,
  totalLayers,
  resolution,
  blurRadius,
  samples,
  numLayers,
  opacity = 1.0,
  speedMultiplier = 3.0,
}: TwistedLayerProps): React.JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  // Smooth easing functions for natural motion
  const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeInOutQuad = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // Define uniforms using useMemo for performance
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 * (Math.random() * 2000 + 1) },
      uTwistCenter: {
        value: new THREE.Vector2(layerIndex * 0.5, layerIndex * 0.5),
      },
      uTwistRadius: { value: 0.9 },
      uTwistStrength: { value: 9.5 },
      uLayerOffset: { value: layerIndex * Math.PI * 0.7 },
      uTint: { value: new THREE.Vector3(0.4, 0.4, 0.4) },
      uOpacity: { value: opacity },
      uRotationSpeed: { value: (layerIndex + 1) * 0.01 }, // Much slower, subtle rotation
      uUseTransparentEdges: { value: layerIndex !== totalLayers - 1 }, // Transparent for moving layers, repeat for background
      // Blur uniforms - stacked system
      uResolution: { value: resolution || new THREE.Vector2(1, 1) },
      uBlurRadius: { value: layerIndex === 0 ? blurRadius || 0 : 0 },
      uSamples: { value: layerIndex === 0 ? samples || 0 : 0 },
      uLayerIndex: { value: layerIndex },
    }),
    // Include all dependencies that affect initial uniform values
    [layerIndex, texture, resolution, blurRadius, samples, opacity],
  );

  // Update uniforms when props change (especially texture, resolution, blurRadius, samples)
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTexture.value = texture;
      materialRef.current.uniforms.uResolution.value =
        resolution || new THREE.Vector2(1, 1);
      // Only apply blur to the top layer (layerIndex 0)
      materialRef.current.uniforms.uBlurRadius.value =
        layerIndex === 0 ? blurRadius || 0 : 0;
      materialRef.current.uniforms.uSamples.value =
        layerIndex === 0 ? samples || 0 : 0;
      materialRef.current.uniforms.uOpacity.value = opacity;
      materialRef.current.needsUpdate = true; // Important to signal changes
    }
  }, [texture, resolution, blurRadius, samples, layerIndex, opacity]);

  // Different tint for each layer to create fluid color blending
  useEffect(() => {
    if (materialRef.current) {
      //const isBackground = layerIndex === totalLayers - 1;
      materialRef.current.needsUpdate = true;
    }
  }, [layerIndex, totalLayers]);

  useFrame((state) => {
    // Update time uniform for animation
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value =
        state.clock.elapsedTime * speedMultiplier;

      // More fluid, warping twist - like melting forms
      const baseStrength =
        2.0 + Math.sin(state.clock.elapsedTime * 0.04 + layerIndex * 0.2) * 0.8;
      materialRef.current.uniforms.uTwistStrength.value = baseStrength;

      // Gentle, flowing twist center movement - like melting
      const centerX =
        0.5 + Math.sin(state.clock.elapsedTime * 0.02 + layerIndex * 0.3) * 0.1;
      const centerY =
        0.5 +
        Math.cos(state.clock.elapsedTime * 0.016 + layerIndex * 0.4) * 0.1;
      materialRef.current.uniforms.uTwistCenter.value.set(centerX, centerY);
    }

    // Unified movement system for all layers
    if (meshRef.current) {
      const time = state.clock.elapsedTime * speedMultiplier;
      const isBackground = layerIndex === totalLayers - 1;

      // Base timing - harmonized ratios for consistent flow
      const baseSpeed = 0.008; // Master tempo
      const layerPhase = (layerIndex * Math.PI * 2) / totalLayers; // Evenly distributed phases

      if (isBackground) {
        // Background layer: slow, gentle breathing with subtle position shift
        const breathe = 1.0 + Math.sin(time * baseSpeed * 2.5) * 0.03;
        meshRef.current.scale.setScalar(15 * breathe);

        // Very subtle background drift
        meshRef.current.position.x = Math.sin(time * baseSpeed * 0.5) * 0.1;
        meshRef.current.position.y = Math.cos(time * baseSpeed * 0.3) * 0.1;
        meshRef.current.position.z = -layerIndex * 0.02;

        // Minimal rotation for background
        meshRef.current.rotation.z = time * baseSpeed * 0.1;
      } else {
        // Moving layers: harmonized orbital motion
        // Use mathematical ratios for orbital periods (1x, 1.5x, 2x, 2.5x)
        const layerSpeedMultiplier = 1 + layerIndex * 0.5;
        const currentSpeed = baseSpeed * layerSpeedMultiplier;

        // Consistent orbital radius based on layer depth
        const orbitRadius = (layerIndex + 1) * 1.2;

        // Primary orbital motion
        const primaryX =
          Math.cos(time * currentSpeed + layerPhase) * orbitRadius;
        const primaryY =
          Math.sin(time * currentSpeed + layerPhase) * orbitRadius * 0.7;

        // Secondary motion for organic feel - synchronized with primary
        const secondaryPhase = time * currentSpeed * 0.3 + layerPhase;
        const secondaryX = Math.sin(secondaryPhase) * orbitRadius * 0.2;
        const secondaryY = Math.cos(secondaryPhase * 1.3) * orbitRadius * 0.15;

        // Combine primary and secondary motion
        meshRef.current.position.x = primaryX + secondaryX;
        meshRef.current.position.y = primaryY + secondaryY;
        meshRef.current.position.z = -layerIndex * 0.02;

        // Synchronized breathing - faster layers breathe slightly faster
        const breatheSpeed = baseSpeed * (2 + layerIndex * 0.3);
        const breathePhase = (time * breatheSpeed + layerPhase) % (Math.PI * 2);
        const breatheEase = easeInOutSine(Math.sin(breathePhase) * 0.5 + 0.5);
        const breathe = 1.0 + breatheEase * 0.08;
        const baseScale = layerIndex * 2.3;
        meshRef.current.scale.setScalar(baseScale * breathe);

        // Harmonized rotation - layers rotate at related speeds with easing
        const rotationSpeed = currentSpeed * (0.8 + layerIndex * 0.1);
        const rotationEase = easeInOutQuad((time * rotationSpeed * 0.1) % 1);
        meshRef.current.rotation.z = time * rotationSpeed + rotationEase * 0.1;
      }
    }
  });

  // Different behavior for background vs moving layers
  const isBackground = layerIndex === numLayers - 1; // Last layer is background
  const layerScale = isBackground ? 15 : layerIndex + 5; // Big background, small moving layers

  return (
    <mesh ref={meshRef} position={[0, 0, -layerIndex]} scale={layerScale}>
      <planeGeometry args={isBackground ? [2, 2, 32, 32] : [2, 2, 16, 16]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface AlbumArtVisualizerProps {
  imageUrl?: string;
  fallbackTexture: Texture;
  resolution: Vector2;
  blurRadius: number;
  samples: number;
  onTextureLoad?: () => void;
  removeBlur?: boolean;
  // Debug props
  debugMode?: boolean;
  showOnlyForeground?: boolean;
  showOnlyBackground?: boolean;
  debugLayerCount?: number;
  speedMultiplier?: number;
}

function AlbumArtVisualizer({
  imageUrl,
  fallbackTexture,
  resolution,
  blurRadius,
  samples,
  onTextureLoad,
  removeBlur = false,
  // Debug props
  debugMode = false,
  showOnlyForeground = false,
  showOnlyBackground = false,
  debugLayerCount,
  speedMultiplier = 3.0,
}: AlbumArtVisualizerProps): React.JSX.Element {
  const [loadedTexture, setLoadedTexture] = useState<Texture>(fallbackTexture);
  const [isLoading, setIsLoading] = useState(false);
  const previousImageUrlRef = useRef<string | undefined>(imageUrl);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadDelayTimeoutRef = useRef<any | null>(null);

  // Handle texture loading with proper error handling
  useEffect(() => {
    // Clear any existing timeouts
    if (loadDelayTimeoutRef.current) {
      clearTimeout(loadDelayTimeoutRef.current);
    }

    // If imageUrl hasn't changed, do nothing
    if (imageUrl === previousImageUrlRef.current && !isInitialLoad) {
      return;
    }

    // Prevent multiple simultaneous loads
    if (isLoading) {
      return;
    }

    // If no imageUrl, use fallback
    if (!imageUrl) {
      setLoadedTexture(fallbackTexture);
      if (onTextureLoad) {
        onTextureLoad();
      }
      previousImageUrlRef.current = imageUrl;
      setIsInitialLoad(false);
      return;
    }

    const loadTexture = () => {
      setIsLoading(true);

      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";

      loader.load(
        imageUrl,
        (texture: {
          wrapS: any;
          wrapT: any;
          minFilter: any;
          magFilter: any;
          generateMipmaps: boolean;
        }) => {
          // Success - configure texture
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;

          setLoadedTexture(texture as any);
          setIsLoading(false);

          if (onTextureLoad) {
            onTextureLoad();
          }
        },
        undefined,
        (error: any) => {
          console.warn("Failed to load image:", imageUrl, error);
          setLoadedTexture(fallbackTexture);
          setIsLoading(false);
          if (onTextureLoad) {
            onTextureLoad();
          }
        },
      );
    };

    // For initial load, load immediately
    // For subsequent loads, add delay for smooth transition
    if (isInitialLoad) {
      previousImageUrlRef.current = imageUrl;
      setIsInitialLoad(false);
      loadTexture();
    } else {
      loadDelayTimeoutRef.current = setTimeout(() => {
        previousImageUrlRef.current = imageUrl;
        loadTexture();
      }, 300);
    }
  }, [imageUrl, fallbackTexture, onTextureLoad, isInitialLoad]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (loadDelayTimeoutRef.current) {
        clearTimeout(loadDelayTimeoutRef.current);
      }
    };
  }, []);

  const numLayers = debugLayerCount || 5; // 1 large background + 4 smaller moving layers
  const renderLayers = isLoading ? 1 : numLayers; // Reduce layers during loading

  // Filter layers based on debug mode
  const getVisibleLayers = () => {
    const layers = Array.from({ length: renderLayers }, (_, i) => i);

    if (!debugMode) return layers;

    if (showOnlyBackground) {
      // Only show the last layer (background)
      return layers.filter((i) => i === numLayers - 1);
    }

    if (showOnlyForeground) {
      // Only show non-background layers
      return layers.filter((i) => i !== numLayers - 1);
    }

    return layers;
  };

  const visibleLayers = getVisibleLayers();

  return (
    <group>
      {/* Render layers - fewer during loading for better performance */}
      {visibleLayers.map((i) => (
        <TwistedLayer
          key={`layer-${i}-${imageUrl || "default"}`}
          texture={loadedTexture}
          layerIndex={i}
          totalLayers={numLayers}
          resolution={resolution}
          blurRadius={
            removeBlur ? 0 : isLoading ? blurRadius * 0.3 : blurRadius
          }
          samples={
            removeBlur ? 0 : isLoading ? Math.max(5, samples * 0.2) : samples
          }
          numLayers={numLayers}
          speedMultiplier={speedMultiplier}
        />
      ))}
    </group>
  );
}

// Post-processing shaders
const postVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gaussianBlurFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uBlurRadius;
  varying vec2 vUv;

  void main() {
    vec3 col = vec3(0.0);
    vec2 pix = uBlurRadius / uResolution;

    // Gaussian kernel weights (5x5)
    float weights[81];
    weights[0] = 0.002276;
    weights[1] = 0.003984;
    weights[2] = 0.005944;
    weights[3] = 0.007556;
    weights[4] = 0.008186;
    weights[5] = 0.007556;
    weights[6] = 0.005944;
    weights[7] = 0.003984;
    weights[8] = 0.002276;
    weights[9] = 0.003984;
    weights[10] = 0.006975;
    weights[11] = 0.010406;
    weights[12] = 0.013228;
    weights[13] = 0.014330;
    weights[14] = 0.013228;
    weights[15] = 0.010406;
    weights[16] = 0.006975;
    weights[17] = 0.003984;
    weights[18] = 0.005944;
    weights[19] = 0.010406;
    weights[20] = 0.015524;
    weights[21] = 0.019735;
    weights[22] = 0.021378;
    weights[23] = 0.019735;
    weights[24] = 0.015524;
    weights[25] = 0.010406;
    weights[26] = 0.005944;
    weights[27] = 0.007556;
    weights[28] = 0.013228;
    weights[29] = 0.019735;
    weights[30] = 0.025088;
    weights[31] = 0.027177;
    weights[32] = 0.025088;
    weights[33] = 0.019735;
    weights[34] = 0.013228;
    weights[35] = 0.007556;
    weights[36] = 0.008186;
    weights[37] = 0.014330;
    weights[38] = 0.021378;
    weights[39] = 0.027177;
    weights[40] = 0.029440;
    weights[41] = 0.027177;
    weights[42] = 0.021378;
    weights[43] = 0.014330;
    weights[44] = 0.008186;
    weights[45] = 0.007556;
    weights[46] = 0.013228;
    weights[47] = 0.019735;
    weights[48] = 0.025088;
    weights[49] = 0.027177;
    weights[50] = 0.025088;
    weights[51] = 0.019735;
    weights[52] = 0.013228;
    weights[53] = 0.007556;
    weights[54] = 0.005944;
    weights[55] = 0.010406;
    weights[56] = 0.015524;
    weights[57] = 0.019735;
    weights[58] = 0.021378;
    weights[59] = 0.019735;
    weights[60] = 0.015524;
    weights[61] = 0.010406;
    weights[62] = 0.005944;
    weights[63] = 0.003984;
    weights[64] = 0.006975;
    weights[65] = 0.010406;
    weights[66] = 0.013228;
    weights[67] = 0.014330;
    weights[68] = 0.013228;
    weights[69] = 0.010406;
    weights[70] = 0.006975;
    weights[71] = 0.003984;
    weights[72] = 0.002276;
    weights[73] = 0.003984;
    weights[74] = 0.005944;
    weights[75] = 0.007556;
    weights[76] = 0.008186;
    weights[77] = 0.007556;
    weights[78] = 0.005944;
    weights[79] = 0.003984;
    weights[80] = 0.002276;

    int index = 0;
    for (float x = -4.0; x <= 4.0; x++) {
      for (float y = -4.0; y <= 4.0; y++) {
        vec2 offset = vec2(x, y) * pix;
        col += texture2D(tDiffuse, vUv + offset).rgb * weights[index];
        index++;
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const bokehBlurFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uBlurRadius;
  uniform float uSamples;
  varying vec2 vUv;

  const float pi = 3.14159265359;
  const float ang = (3.0 - sqrt(5.0)) * pi;

  void main() {
    vec3 col = vec3(0);
    vec2 pix = 1.0 / uResolution;
    float blurSize = uBlurRadius * 0.02; // Increased blur size

    if (uSamples <= 0.0 || uBlurRadius <= 0.0) {
      gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, 1.0);
      return;
    }

    // Add center sample with higher weight for better bokeh quality
    col += texture2D(tDiffuse, vUv).rgb * 2.0;
    float totalWeight = 2.0;

    for(float i = 0.0; i < 100.0; i++) { // Increased max samples
      if (i >= uSamples) break;

      float d = i / uSamples;
      float radius = sqrt(d) * blurSize;
      vec2 p = vec2(sin(ang * i), cos(ang * i)) * radius;

      // Add distance-based weighting for better bokeh circles
      float weight = 1.0 - d * 0.3;
      col += texture2D(tDiffuse, vUv + p).rgb * weight;
      totalWeight += weight;
    }

    gl_FragColor = vec4(col / totalWeight, 1.0);
  }
`;

interface PostProcessingProps {
  blurRadius: number;
  samples: number;
}

function PostProcessing({ blurRadius, samples }: PostProcessingProps): null {
  const { gl, size, scene, camera } = useThree();

  // Downsampled render targets (1/4 resolution)
  const downsampleWidth = Math.max(1, Math.floor(size.width / 8));
  const downsampleHeight = Math.max(1, Math.floor(size.height / 8));
  const downsampleTarget = useFBO(downsampleWidth, downsampleHeight);
  const downsampleBlurTarget = useFBO(downsampleWidth, downsampleHeight);

  // Full-res targets
  //const sceneTarget = useFBO(size.width, size.height);
  const gaussianBlurTarget = useFBO(size.width, size.height);
  const finalBokehTarget = useFBO(size.width, size.height);

  // Create materials
  const gaussianBlurMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: postVertexShader,
        fragmentShader: gaussianBlurFragmentShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurRadius: { value: blurRadius },
        },
      }),
    [size.width, size.height, blurRadius],
  );

  const bokehBlurMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: postVertexShader,
        fragmentShader: bokehBlurFragmentShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurRadius: { value: blurRadius },
          uSamples: { value: samples },
        },
      }),
    [size.width, size.height, blurRadius, samples],
  );

  const pureBokehMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: postVertexShader,
        fragmentShader: bokehBlurFragmentShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurRadius: { value: blurRadius * 0.5 },
          uSamples: { value: Math.min(samples, 30) },
        },
      }),
    [size.width, size.height, blurRadius, samples],
  );

  // Create post-processing scene
  const postScene = useMemo(() => new THREE.Scene(), []);
  const postCamera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    [],
  );
  const postGeometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  useFrame(() => {
    // Update uniforms
    gaussianBlurMaterial.uniforms.uBlurRadius.value = blurRadius;
    gaussianBlurMaterial.uniforms.uResolution.value.set(
      downsampleWidth,
      downsampleHeight,
    );
    bokehBlurMaterial.uniforms.uBlurRadius.value = blurRadius;
    bokehBlurMaterial.uniforms.uSamples.value = samples;
    bokehBlurMaterial.uniforms.uResolution.value.set(size.width, size.height);
    pureBokehMaterial.uniforms.uBlurRadius.value = blurRadius * 0.5;
    pureBokehMaterial.uniforms.uSamples.value = Math.min(samples, 30);
    pureBokehMaterial.uniforms.uResolution.value.set(size.width, size.height);

    if (blurRadius > 0) {
      // Step 1: Render scene to downsampled texture
      gl.setRenderTarget(downsampleTarget);
      gl.clear();
      gl.render(scene, camera);

      // Step 2: Apply gaussian blur at low-res
      postScene.clear();
      gaussianBlurMaterial.uniforms.tDiffuse.value = downsampleTarget.texture;
      const gaussianBlurMesh = new THREE.Mesh(
        postGeometry,
        gaussianBlurMaterial,
      );
      postScene.add(gaussianBlurMesh);

      gl.setRenderTarget(downsampleBlurTarget);
      gl.render(postScene, postCamera);

      // Step 3: Upsample blurred result to full-res
      postScene.clear();
      const upsampleMesh = new THREE.Mesh(
        postGeometry,
        new THREE.MeshBasicMaterial({ map: downsampleBlurTarget.texture }),
      );
      postScene.add(upsampleMesh);

      gl.setRenderTarget(gaussianBlurTarget);
      gl.render(postScene, postCamera);

      // Step 4: Apply bokeh blur
      postScene.clear();
      bokehBlurMaterial.uniforms.tDiffuse.value = gaussianBlurTarget.texture;
      const bokehBlurMesh = new THREE.Mesh(postGeometry, bokehBlurMaterial);
      postScene.add(bokehBlurMesh);

      gl.setRenderTarget(finalBokehTarget);
      gl.render(postScene, postCamera);

      // Step 5: Apply final pure bokeh and render to screen
      postScene.clear();
      pureBokehMaterial.uniforms.tDiffuse.value = finalBokehTarget.texture;
      const pureBokehMesh = new THREE.Mesh(postGeometry, pureBokehMaterial);
      postScene.add(pureBokehMesh);

      gl.setRenderTarget(null);
      gl.render(postScene, postCamera);
    }
  }, 1);

  return null;
}

interface SceneProps {
  imageUrl?: string;
  fallbackTexture: Texture;
  blurRadius: number;
  samples: number;
  boxBlurRadius: number;
  bokehSamples: number;
  onTextureLoad?: () => void;
  removeBlur?: boolean;
  // Debug props
  debugMode?: boolean;
  showOnlyForeground?: boolean;
  showOnlyBackground?: boolean;
  debugLayerCount?: number;
  speedMultiplier?: number;
}

function Scene({
  imageUrl,
  fallbackTexture,
  blurRadius,
  samples,
  boxBlurRadius,
  bokehSamples,
  onTextureLoad,
  removeBlur = false,
  // Debug props
  debugMode = false,
  showOnlyForeground = false,
  showOnlyBackground = false,
  debugLayerCount,
  speedMultiplier = 3.0,
}: SceneProps): React.JSX.Element {
  // Get camera and canvas size from useThree hook
  const { camera, size } = useThree();

  // Calculate resolution based on canvas size, re-memoize if size changes
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size],
  );

  // Set initial camera position only once on mount
  useEffect(() => {
    camera.position.set(0, 0, 4);
  }, [camera]); // Depend on camera

  return (
    <>
      <AlbumArtVisualizer
        imageUrl={imageUrl}
        fallbackTexture={fallbackTexture}
        resolution={resolution}
        blurRadius={removeBlur ? 0 : blurRadius}
        samples={removeBlur ? 0 : samples}
        onTextureLoad={onTextureLoad}
        removeBlur={removeBlur}
        debugMode={debugMode}
        showOnlyForeground={showOnlyForeground}
        showOnlyBackground={showOnlyBackground}
        debugLayerCount={debugLayerCount}
        speedMultiplier={speedMultiplier}
      />
      {!removeBlur && (
        <PostProcessing blurRadius={boxBlurRadius} samples={bokehSamples} />
      )}
    </>
  );
}

interface MeshArtBackgroundProps {
  imageUrl?: string;
  imageUrlLight?: string;
  imageUrlDark?: string;
  blurRadius?: number;
  samples?: number;
  boxBlurRadius?: number;
  bokehSamples?: number;
  enableNavigationTransition?: boolean;
  transitionDuration?: number;
  backgroundOpacity?: number;
  removeBlur?: boolean;
  noFadeIn?: boolean;
  onLoadingStateChange?: (isLoading: boolean) => void;
  sceneManager?: any; // BackgroundSceneManager instance
  containerRef?: React.RefObject<HTMLDivElement>;
  // Debug props
  debugMode?: boolean;
  showOnlyForeground?: boolean;
  showOnlyBackground?: boolean;
  debugLayerCount?: number;
  speedMultiplier?: number;
}

export default function MeshArtBackground({
  imageUrl,
  imageUrlLight = "/gradient-light-smol.png",
  imageUrlDark = "/gradient-dark-3.png",
  blurRadius = 30, // Layer blur radius
  samples = 25, // Layer samples
  boxBlurRadius = 5, // Post-processing gaussian blur
  bokehSamples = 50, // Post-processing bokeh samples
  enableNavigationTransition = true,
  transitionDuration = 800, // ms
  backgroundOpacity = 0.15, // Background transparency
  removeBlur = false,
  noFadeIn = false,
  onLoadingStateChange,
  // Debug props
  debugMode = false,
  showOnlyForeground = false,
  showOnlyBackground = false,
  debugLayerCount,
  speedMultiplier = 3.0,
}: MeshArtBackgroundProps): React.JSX.Element {
  // State for texture loading (still needed for fade-in)
  const [isTextureLoaded, setIsTextureLoaded] = useState(noFadeIn || false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Determine which image URL to use
  const currentImageUrl = useMemo(() => {
    // If single imageUrl is provided, use it regardless of theme
    if (imageUrl) return imageUrl;

    // Otherwise, use theme-specific URLs
    return isDarkMode ? imageUrlDark : imageUrlLight;
  }, [imageUrl, imageUrlLight, imageUrlDark, isDarkMode]);

  // Reset texture loaded state when image URL changes for proper fade out/in
  useEffect(() => {
    if (!noFadeIn) {
      setIsTextureLoaded(false);
      onLoadingStateChange?.(true);
    }
  }, [currentImageUrl, onLoadingStateChange, noFadeIn]);

  // // Update texture loaded state when noFadeIn changes
  // useEffect(() => {
  //   if (noFadeIn) {
  //     setIsTextureLoaded(true);
  //   }
  // }, [noFadeIn]);

  // Detect theme changes
  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const newIsDarkMode = document.documentElement.classList.contains("dark");
      setIsDarkMode(newIsDarkMode);
    };

    checkTheme();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also listen for manual theme toggle events (common in theme switchers)
    const handleThemeChange = () => {
      setTimeout(checkTheme, 50); // Small delay to ensure DOM is updated
    };

    document.addEventListener("themechange", handleThemeChange);
    window.addEventListener("storage", handleThemeChange); // For localStorage theme changes

    return () => {
      observer.disconnect();
      document.removeEventListener("themechange", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  // Handle navigation transitions
  useEffect(() => {
    if (!enableNavigationTransition || typeof document === "undefined") return;

    const handleBeforeSwap = () => {
      setIsNavigating(true);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.href && !link.href.startsWith("#") && !link.target) {
        // Check if it's an internal navigation
        const currentHost = window.location.host;
        const linkUrl = new URL(link.href, window.location.href);

        if (linkUrl.host === currentHost) {
          e.preventDefault();
          setIsNavigating(true);

          // Wait for transition then navigate
          setTimeout(() => {
            window.location.href = link.href;
          }, transitionDuration);
        }
      }
    };

    // For Astro View Transitions
    document.addEventListener("astro:before-swap", handleBeforeSwap);
    // For regular navigation
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("astro:before-swap", handleBeforeSwap);
      document.removeEventListener("click", handleClick);
    };
  }, [enableNavigationTransition, transitionDuration]);

  if (typeof document === "undefined") {
    return (
      <div className="fixed inset-0 -z-10 h-screen w-full max-w-screen overflow-hidden dark:bg-neutral-900" />
    );
  }

  // Create fallback procedural texture using useMemo to avoid recreating
  const fallbackTexture = useMemo(() => {
    console.log("Creating canvas");
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }

    // Create a radial gradient background
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, "#ff6b9d");
    gradient.addColorStop(0.3, "#c44bff");
    gradient.addColorStop(0.6, "#4b8bff");
    gradient.addColorStop(1, "#1a1a2e");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Add some geometric patterns
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = Math.random() * 50 + 10;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add some lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }

    // Create Three.js texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    return texture;
  }, []);

  return (
    <div className="fixed inset-0 -z-10 h-screen w-full max-w-screen overflow-hidden transition-colors duration-300 dark:bg-neutral-900">
      <Canvas
        style={{
          transition: `opacity ${isNavigating ? transitionDuration : 600}ms ease-out`,
          opacity:
            noFadeIn || isTextureLoaded || !isNavigating
              ? backgroundOpacity
              : 0,
          willChange: "opacity",
          transform: "translateZ(0)",
        }}
        key={imageUrl}
        camera={{ position: [0, 0, 4], fov: 75 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
          stencil: false,
          depth: false,
        }}
        className="absolute inset-0"
      >
        <Scene
          imageUrl={currentImageUrl}
          fallbackTexture={fallbackTexture}
          blurRadius={removeBlur ? 0 : blurRadius}
          samples={removeBlur ? 0 : samples}
          boxBlurRadius={removeBlur ? 0 : boxBlurRadius}
          bokehSamples={removeBlur ? 0 : bokehSamples}
          onTextureLoad={() => {
            setIsTextureLoaded(true);
            onLoadingStateChange?.(false);
          }}
          removeBlur={removeBlur}
          debugMode={debugMode}
          showOnlyForeground={showOnlyForeground}
          showOnlyBackground={showOnlyBackground}
          debugLayerCount={debugLayerCount}
          speedMultiplier={speedMultiplier}
        />
      </Canvas>
    </div>
  );
}
