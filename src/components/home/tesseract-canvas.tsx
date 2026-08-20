"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

/* A rotating 4D hypercube (tesseract) projected to 3D, drawn as additive
   line segments. The Interstellar tesseract, rendered as an msc console.
   16 vertices, 32 edges: cheap enough to recompute every frame. Scroll
   progress drives a camera dive that ends inside the wireframe. */

const LINE_COLOR = 0xff7053;
const NODE_COLOR = 0xffd9cd;
const STAR_FAR_COLOR = 0xa08d80;
const STAR_NEAR_COLOR = 0xffe0c9;

const VERTICES_4D: number[][] = [];
for (let i = 0; i < 16; i++) {
  VERTICES_4D.push([
    (i & 1) === 0 ? -1 : 1,
    (i & 2) === 0 ? -1 : 1,
    (i & 4) === 0 ? -1 : 1,
    (i & 8) === 0 ? -1 : 1,
  ]);
}

const EDGES: [number, number][] = [];
for (let a = 0; a < 16; a++) {
  for (let b = a + 1; b < 16; b++) {
    let diff = 0;
    for (let axis = 0; axis < 4; axis++) {
      if (VERTICES_4D[a][axis] !== VERTICES_4D[b][axis]) diff++;
    }
    if (diff === 1) EDGES.push([a, b]);
  }
}

function rotate4D(point: number[], xw: number, yz: number, out: number[]) {
  let [x, y, z, w] = point;

  let cx = Math.cos(xw);
  let sx = Math.sin(xw);
  [x, w] = [x * cx - w * sx, x * sx + w * cx];

  const cy = Math.cos(yz);
  const sy = Math.sin(yz);
  [y, z] = [y * cy - z * sy, y * sy + z * cy];

  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
}

function createGlowTexture(): THREE.CanvasTexture | null {
  const size = 256;
  const plane = document.createElement("canvas");
  plane.width = size;
  plane.height = size;
  const ctx = plane.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(124, 201, 220, 0.5)");
  gradient.addColorStop(0.35, "rgba(124, 201, 220, 0.14)");
  gradient.addColorStop(1, "rgba(124, 201, 220, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(plane);
}

function createStarLayer(count: number, size: number, color: number, opacity: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 2] = -4 - Math.random() * 14;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size,
    opacity,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

export type TesseractCanvasProps = {
  className?: string;
  /** 0..1 scroll progress driving spin rate and the camera dive. */
  progressRef?: MutableRefObject<number>;
};

export default function TesseractCanvas({ className, progressRef }: TesseractCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let lineMaterial: THREE.LineBasicMaterial | null = null;
    let lineGeometry: THREE.BufferGeometry | null = null;
    let nodeMaterial: THREE.PointsMaterial | null = null;
    let nodeGeometry: THREE.BufferGeometry | null = null;
    let glowTexture: THREE.CanvasTexture | null = null;
    let glowMaterial: THREE.SpriteMaterial | null = null;
    let starGroup: THREE.Group | null = null;
    let animationFrame = 0;
    let isMounted = true;
    let isDocumentVisible = document.visibilityState === "visible";
    let isIntersecting = true;
    let lastTime = 0;
    let spinA = 0.4;
    let spinB = 0.9;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const reducedMotion = reducedMotionQuery.matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 5.6);

    const projected = Array.from({ length: 16 }, () => [0, 0, 0, 0]);
    const transformed = Array.from({ length: 16 }, () => [0, 0, 0]);
    const positionArray = new Float32Array(EDGES.length * 6);
    const nodeArray = new Float32Array(16 * 3);

    const stopLoop = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const canRun = () => isDocumentVisible && isIntersecting;

    const updateGeometry = () => {
      const progress = progressRef ? progressRef.current : 0;

      for (let i = 0; i < 16; i++) {
        rotate4D(VERTICES_4D[i], spinA, spinB, projected[i]);
        const [x, y, z, w] = projected[i];
        /* 4D perspective divide, then a shallow 3D tilt. */
        const scale = 2.35 / (3.1 - w * 0.9);
        const px = x * scale * 0.92 - y * scale * 0.12;
        const py = y * scale * 0.92 + x * scale * 0.12;
        const pz = z * scale + progress * 0.6;
        transformed[i][0] = px;
        transformed[i][1] = py;
        transformed[i][2] = pz;
        nodeArray[i * 3] = px;
        nodeArray[i * 3 + 1] = py;
        nodeArray[i * 3 + 2] = pz;
      }

      let cursor = 0;
      for (const [a, b] of EDGES) {
        for (const index of [a, b]) {
          positionArray[cursor++] = transformed[index][0];
          positionArray[cursor++] = transformed[index][1];
          positionArray[cursor++] = transformed[index][2];
        }
      }

      if (lineGeometry) {
        (lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
      if (nodeGeometry) {
        (nodeGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    };

    const render = (elapsed: number) => {
      if (!isMounted || !renderer) return;

      const progress = progressRef ? progressRef.current : 0;
      const delta = lastTime ? Math.min((elapsed - lastTime) / 1000, 0.05) : 0.016;
      lastTime = elapsed;

      if (!reducedMotion) {
        const rate = 0.22 + progress * 1.5;
        spinA += delta * rate;
        spinB += delta * rate * 0.62;
        if (starGroup) starGroup.rotation.z += delta * 0.012;
      }

      updateGeometry();
      /* Dive: approach from outside, pass the shell, end inside the cage. */
      camera.position.z = 5.6 - progress * 5.0;
      camera.lookAt(0, 0, 0);
      if (glowMaterial) glowMaterial.opacity = 0.42 + progress * 0.3;
      renderer.render(scene, camera);

      if (!reducedMotion && canRun()) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const resize = () => {
      if (!renderer) return;
      const bounds = container.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = mobileQuery.matches
        ? Math.min(window.devicePixelRatio, 1.5)
        : Math.min(window.devicePixelRatio, 2);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const wake = () => {
      if (canRun() && !reducedMotion && !animationFrame) {
        lastTime = 0;
        animationFrame = window.requestAnimationFrame(render);
      } else if (!canRun()) {
        stopLoop();
      }
    };

    const onVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === "visible";
      wake();
    };

    const disposeStarGroup = () => {
      if (!starGroup) return;
      for (const child of starGroup.children) {
        if (child instanceof THREE.Points) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      }
    };

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);

      lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
      lineMaterial = new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: LINE_COLOR,
        opacity: 0.9,
        transparent: true,
      });
      scene.add(new THREE.LineSegments(lineGeometry, lineMaterial));

      /* Bright nodes at the 16 projected vertices. */
      nodeGeometry = new THREE.BufferGeometry();
      nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodeArray, 3));
      nodeMaterial = new THREE.PointsMaterial({
        blending: THREE.AdditiveBlending,
        color: NODE_COLOR,
        depthWrite: false,
        opacity: 0.9,
        size: 0.07,
        transparent: true,
      });
      scene.add(new THREE.Points(nodeGeometry, nodeMaterial));

      /* Soft nebula glow behind the hypercube. */
      glowTexture = createGlowTexture();
      if (glowTexture) {
        glowMaterial = new THREE.SpriteMaterial({
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          map: glowTexture,
          opacity: 0.45,
          transparent: true,
        });
        const glowSprite = new THREE.Sprite(glowMaterial);
        glowSprite.scale.setScalar(8.5);
        scene.add(glowSprite);
      }

      /* Two drifting star layers for depth. */
      starGroup = new THREE.Group();
      starGroup.add(createStarLayer(mobileQuery.matches ? 220 : 420, 0.02, STAR_FAR_COLOR, 0.4));
      starGroup.add(createStarLayer(mobileQuery.matches ? 60 : 110, 0.05, STAR_NEAR_COLOR, 0.8));
      scene.add(starGroup);

      resize();
      canvas.dataset.webgl = "ready";
      render(performance.now());

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
        document.removeEventListener("visibilitychange", onVisibilityChange);
        mobileQuery.removeEventListener("change", resize);
        lineGeometry?.dispose();
        lineMaterial?.dispose();
        nodeGeometry?.dispose();
        nodeMaterial?.dispose();
        glowTexture?.dispose();
        glowMaterial?.dispose();
        disposeStarGroup();
        renderer?.dispose();
        renderer = null;
      };
    } catch {
      canvas.dataset.webgl = "fallback";
      renderer?.dispose();
      renderer = null;

      return () => {
        isMounted = false;
        stopLoop();
      };
    }
  }, [progressRef]);

  return (
    <div className={cn("absolute inset-0", className)} data-webgl="pending" aria-hidden="true">
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
