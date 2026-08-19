"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

/**
 * Standalone black hole shader for the hero section.
 *
 * Self-contained: owns its own WebGLRenderer / ShaderMaterial and does not
 * depend on the scroll orchestrator. Drop it anywhere and it fills the parent
 * container. It is intentionally decoupled from cosmic-hero-canvas.
 */

export const blackholeVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const blackholeFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uReducedMotion;
  uniform float uProgress;
  uniform float uOctaves;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 5; i++) {
      if (float(i) >= uOctaves) break;
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(7.1, 3.7);
      amplitude *= 0.5;
    }

    return value;
  }

  mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  float starLayer(vec2 uv, float scale, float threshold, float timeOffset) {
    vec2 gridUv = uv * scale;
    vec2 cell = floor(gridUv);
    vec2 local = fract(gridUv) - 0.5;
    float sparkle = hash21(cell + timeOffset);
    float star = 1.0 - smoothstep(0.02, 0.06 + sparkle * 0.04, length(local));
    float visibility = smoothstep(threshold, threshold + 0.008, sparkle);
    float twinkle = 0.82 + 0.18 * sin(uTime * 0.8 + sparkle * 41.0);
    return star * visibility * twinkle;
  }

  /* Gravitational lensing of a background starfield. */
  vec3 spaceBackground(vec2 uv, vec2 center, float horizon, float time) {
    vec2 q = uv - center;
    float r = length(q) + 0.0001;

    /* Deflection falls off like 1/r^2 and pulls background light outward,
       smearing stars into an Einstein ring right at the photon sphere. */
    float deflection = horizon * horizon * 1.35 / max(r * r, 1e-5);
    vec2 lensed = uv + (q / r) * deflection * horizon * 0.42;

    vec3 color = vec3(0.0005, 0.001, 0.0018);

    float stars = starLayer(lensed, 76.0, 0.9962, 3.0);
    stars += starLayer(lensed + vec2(0.17, 0.09), 145.0, 0.9976, 14.0) * 0.8;
    stars += starLayer(lensed * 1.0 + vec2(0.05, 0.21), 230.0, 0.9985, 27.0) * 0.5;

    color += vec3(0.6, 0.72, 0.85) * stars;
    color += vec3(0.35, 0.5, 0.75) * pow(stars, 2.0) * 0.4;
    return color;
  }

  /* The accretion disk, seen almost edge-on. The disk is an inclined flat
     ring, so it projects to a thin ellipse. Gravitational lensing arches the
     far half over the top of the shadow and the near half under the bottom —
     the iconic Gargantua "double-loop" silhouette. */
  vec3 accretionDisk(
    vec2 uv,
    vec2 center,
    float horizon,
    float time,
    float flare,
    float swirl,
    out float shadow
  ) {
    vec2 q = uv - center;
    float r = length(q) + 0.0001;
    float angle = atan(q.y, q.x);

    /* Disk plane inclination — squash the vertical axis so the ring reads as
       a thin ellipse, then swirl the whole disk as we plunge in. */
    float tilt = 0.3;
    vec2 diskFrame = rotate(swirl) * vec2(q.x, q.y / tilt);
    float dr = length(diskFrame) + 0.0001;
    float da = atan(diskFrame.y, diskFrame.x);

    float inner = horizon * 0.85;
    float outer = horizon * 2.9;

    /* Lensed ring: the back half of the disk is deflected up over the pole,
       the front half under. Model it as two arcs joined at the limbs. */
    float lensingArch = 0.42 * (0.5 + 0.5 * sin(da));
    vec2 lensedY = vec2(
      diskFrame.x,
      diskFrame.y + lensingArch * (horizon * 0.6 + dr * 0.14)
    );
    float lr = length(lensedY) + 0.0001;
    float la = atan(lensedY.y, lensedY.x);

    float ringBand = smoothstep(inner * 0.9, inner * 1.1, lr) *
      (1.0 - smoothstep(outer * 0.85, outer, lr));

    /* Thin vertical extent of the disk plane. */
    float thickness = 0.008 + dr * 0.03;
    float diskLine = abs(lensedY.y + lensedY.x * 0.05);
    float disk = (1.0 - smoothstep(thickness * 0.35, thickness * 1.5, diskLine)) * ringBand;

    /* Turbulence: roiling gas driven by orbital shear. */
    float flow = fbm(vec2(la * 3.2 + time * 0.18, lr * 7.5 - time * 0.12));
    float wisps = fbm(lensedY * 8.5 + vec2(-time * 0.1, time * 0.03));
    disk *= 0.5 + 0.85 * flow + 0.2 * wisps;

    /* Doppler beaming: the side orbiting toward the viewer is hotter and
       brighter, the receding side dimmer. */
    float doppler = 0.45 + 1.0 * (0.5 + 0.5 * cos(la - 2.2));
    doppler = mix(1.0, doppler, smoothstep(outer, inner, lr));
    disk *= doppler;

    /* Radial temperature gradient: white-hot inner edge through amber into
       deep ember red. */
    float temperature = 1.0 - clamp((lr - inner) / (outer - inner), 0.0, 1.0);
    vec3 whiteHot = vec3(1.0, 0.93, 0.8);
    vec3 amber = vec3(1.0, 0.44, 0.13);
    vec3 ember = vec3(0.62, 0.12, 0.04);
    vec3 diskColor = mix(ember, amber, temperature);
    diskColor = mix(diskColor, whiteHot, pow(temperature, 3.4));

    vec3 color = diskColor * disk * (1.0 + flare * 1.4);
    color += whiteHot * disk * disk * 0.5;

    /* Photon ring: razor-thin, near-white ring hugging the shadow boundary. */
    float photonRing = exp(-pow((r - horizon * 1.03) / 0.009, 2.0));
    photonRing *= (0.6 + 0.4 * fbm(vec2(angle * 4.0, r * 16.0 - time * 0.18))) * doppler;
    color += whiteHot * photonRing * (1.5 + flare * 0.6);

    /* Secondary lensed halo: the doubled ring from light bending over the
       poles. */
    float secondaryRing = exp(-pow((r - horizon * 1.28) / 0.05, 2.0));
    secondaryRing *= 0.5 + 0.4 * fbm(vec2(angle * 2.0 - time * 0.12, r * 9.0));
    color += mix(amber, whiteHot, 0.45) * secondaryRing * 0.5;

    /* Broad amber halo bleeding out past the disk. */
    float broadGlow = exp(-pow((r - outer * 0.55) / (outer * 0.42), 2.0));
    color += amber * broadGlow * (0.12 + flare * 0.1);

    shadow = 1.0 - smoothstep(horizon * 0.9, horizon * 1.02, r);
    color = mix(color, vec3(0.0), shadow * 0.99);

    return color;
  }

  /* Phase 3 — falling past the photon sphere into the warp tunnel. */
  vec3 warpTunnel(vec2 uv, float time, float progress) {
    float into = smoothstep(0.5, 1.0, progress);
    float r = length(uv) + 0.0001;
    float a = atan(uv.y, uv.x);

    float speed = 0.18 + into * 1.4;
    float z = 1.0 / r - time * speed;

    float rings = abs(fract(z * 0.5) - 0.5) * 2.0;
    float ringLine = smoothstep(0.88, 1.0, 1.0 - rings) * smoothstep(0.02, 0.4, r);

    float spokeCount = 8.0;
    float spokes = abs(fract(a / (PI * 2.0 / spokeCount)) - 0.5) * 2.0;
    float spokeLine = smoothstep(0.88, 1.0, 1.0 - spokes) * smoothstep(0.03, 0.55, r);

    float grid = max(ringLine, spokeLine);

    vec3 cyan = vec3(0.2, 0.85, 0.98);
    vec3 magenta = vec3(0.95, 0.28, 0.72);
    vec3 amber = vec3(1.0, 0.62, 0.18);
    vec3 gridColor = mix(cyan, magenta, 0.5 + 0.5 * sin(z * 0.8));
    gridColor = mix(gridColor, amber, 0.5 + 0.5 * sin(a * 2.0 + time * 0.3));

    vec3 col = gridColor * grid * (1.5 + 0.6 * sin(time * 2.0 + z));
    col += gridColor * 0.06 * (1.0 - smoothstep(0.0, 1.1, r));

    float core = exp(-pow(r / 0.05, 2.0));
    col += vec3(1.0, 0.96, 0.9) * core * 0.9;

    float vignette = 1.0 - smoothstep(0.42, 1.15, r);
    col *= 0.32 + vignette * 0.9;

    return col;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 uv = vUv - 0.5;
    uv.x *= aspect;

    float progress = clamp(uProgress, 0.0, 1.0);
    float time = uTime * (1.0 - uReducedMotion * 0.96);

    /* Pointer parallax — the singularity leans toward the cursor. */
    vec2 pointer = (uPointer - 0.5) * vec2(0.06, 0.05);
    vec2 center = vec2(0.06, 0.0) + pointer;

    float horizon = 0.3 + 0.012 * sin(time * 0.3);

    /* Phase 1 → 2 — a slow dolly into the singularity: the black hole looms
       larger, the disk flares, and orbital distortion builds. */
    float approach = smoothstep(0.0, 0.5, progress);
    float zoom = mix(1.0, 1.9, approach);
    vec2 sceneUv = center + (uv - center) * zoom;
    float flare = smoothstep(0.15, 0.6, progress);
    float swirl = progress * 0.5;
    float horizonLive = horizon * mix(1.0, 1.12, approach);

    float shadow;
    vec3 color = spaceBackground(sceneUv, center, horizonLive, time);
    color += accretionDisk(sceneUv, center, horizonLive, time, flare, swirl, shadow);

    /* Subtle lensed wash near the shadow. */
    float lens = smoothstep(0.7, 0.04, length(sceneUv - center));
    color += vec3(0.03, 0.06, 0.1) * lens * (1.0 - shadow) * 0.18;

    /* Foreground star dust drifting past. */
    float dust = starLayer(sceneUv * 3.0, 44.0, 0.993, 9.0) * (1.0 - shadow);
    color += vec3(0.55, 0.66, 0.78) * dust * 0.35;

    /* Event horizon crossing — a searing white pulse, then darkness as the
       starfield snaps shut behind you. */
    float crossPulse = exp(-pow((progress - 0.5) / 0.05, 2.0));
    color += vec3(1.0, 0.96, 0.9) * crossPulse * 0.9;
    float crossingDark = clamp(
      smoothstep(0.44, 0.54, progress) - smoothstep(0.58, 0.7, progress),
      0.0,
      1.0
    );
    color = mix(color, vec3(0.0, 0.0, 0.0), crossingDark * 0.92);

    /* Phase 3 — warp tunnel. */
    vec3 warp = warpTunnel(uv, time, progress);
    float toWarp = smoothstep(0.5, 0.68, progress);
    color = mix(color, warp, toWarp);

    /* Vignette for cinematic framing. */
    float vignette = 1.0 - smoothstep(0.45, 0.95, length((vUv - 0.5) * vec2(0.95, 1.05)));
    color *= 0.78 + vignette * 0.28;

    /* Dark falloff toward the bottom so overlaid text keeps contrast. */
    float bottomFade = 1.0 - smoothstep(0.55, 1.0, vUv.y);
    color *= 0.82 + bottomFade * 0.18;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export type BlackholeShaderProps = {
  className?: string;
  /** Optional mutable ref (0..1) updated by a scroll orchestrator. Drives the
   * approach → horizon → warp journey. Leave undefined for a static scene. */
  progressRef?: MutableRefObject<number>;
};

export default function BlackholeShader({
  className,
  progressRef,
}: BlackholeShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;

    if (!canvas || !container) {
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let geometry: THREE.PlaneGeometry | null = null;
    let animationFrame = 0;
    let isMounted = true;
    let isDocumentVisible = document.visibilityState === "visible";
    let isIntersecting = true;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const reducedMotion = reducedMotionQuery.matches;
    const pointer = new THREE.Vector2(0.5, 0.5);
    const targetPointer = new THREE.Vector2(0.5, 0.5);
    const resolution = new THREE.Vector2(1, 1);

    const getQuality = () => ({
      pixelRatio: mobileQuery.matches
        ? Math.min(window.devicePixelRatio, 1.5)
        : Math.min(window.devicePixelRatio, 2),
      octaves: mobileQuery.matches ? 2 : 4,
    });

    const stopLoop = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const canRun = () => isDocumentVisible && isIntersecting;

    const render = (elapsed: number) => {
      if (!isMounted || !renderer || !material) {
        return;
      }

      pointer.lerp(targetPointer, reducedMotion ? 1 : 0.045);
      material.uniforms.uTime.value = reducedMotion ? 0.8 : elapsed * 0.001;
      material.uniforms.uPointer.value.copy(pointer);
      material.uniforms.uProgress.value = progressRef
        ? progressRef.current
        : 0;
      renderer.render(scene, camera);

      if (!reducedMotion && canRun()) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const resize = () => {
      if (!renderer || !material) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const { pixelRatio, octaves } = getQuality();

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      resolution.set(width * pixelRatio, height * pixelRatio);
      material.uniforms.uResolution.value.copy(resolution);
      material.uniforms.uOctaves.value = octaves;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion) {
        return;
      }

      targetPointer.set(
        event.clientX / Math.max(window.innerWidth, 1),
        1 - event.clientY / Math.max(window.innerHeight, 1),
      );
    };

    const wake = () => {
      if (canRun() && !reducedMotion && !animationFrame) {
        animationFrame = window.requestAnimationFrame(render);
      } else if (!canRun()) {
        stopLoop();
      }
    };

    const onVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === "visible";
      wake();
    };

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x02060a);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      material = new THREE.ShaderMaterial({
        depthWrite: false,
        fragmentShader: blackholeFragmentShader,
        uniforms: {
          uOctaves: { value: 4 },
          uPointer: { value: pointer },
          uProgress: { value: 0 },
          uReducedMotion: { value: reducedMotion ? 1 : 0 },
          uResolution: { value: resolution },
          uTime: { value: 0 },
        },
        vertexShader: blackholeVertexShader,
      });

      geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      resize();
      canvas.dataset.webgl = "ready";
      render(reducedMotion ? 800 : performance.now());

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          isIntersecting = entries.some((entry) => entry.isIntersecting);
          wake();
        },
        { threshold: 0.05 },
      );
      intersectionObserver.observe(container);

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      mobileQuery.addEventListener("change", resize);

      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(render);
      }

      return () => {
        isMounted = false;
        stopLoop();
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        mobileQuery.removeEventListener("change", resize);
        geometry?.dispose();
        material?.dispose();
        renderer?.dispose();
        renderer = null;
        material = null;
      };
    } catch {
      canvas.dataset.webgl = "fallback";
      renderer?.dispose();
      renderer = null;
      material = null;

      return () => {
        isMounted = false;
        stopLoop();
      };
    }
  }, [progressRef]);

  return (
    <div
      className={cn("absolute inset-0", className)}
      data-webgl="pending"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
