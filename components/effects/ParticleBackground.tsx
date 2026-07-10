// =============================================
// The Living Grimoire — Three.js Particle Background
// =============================================
// Mystical floating particles in purple/gold.
// Adapted from dot-portfolio gateParticles.js

"use client";

import { useEffect, useRef } from "react";

const COUNT = 1200;

// Colors: purple and gold particles
const PURPLE = [0.486, 0.228, 0.929]; // #7c3aed
const GOLD = [0.831, 0.659, 0.325];   // #d4a853

export function ParticleBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animId = 0;

    async function init() {
      const THREE = await import("three");

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.z = 30;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvas!,
        alpha: true,
        antialias: false,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Build particle buffer
      const positions = new Float32Array(COUNT * 3);
      const colors = new Float32Array(COUNT * 3);
      const sizes = new Float32Array(COUNT);
      const velocities = new Float32Array(COUNT * 3);

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 60;
        positions[i3 + 1] = (Math.random() - 0.5) * 40;
        positions[i3 + 2] = (Math.random() - 0.5) * 30;

        // Blend between purple and gold
        const t = Math.random();
        const c = t > 0.5 ? GOLD : PURPLE;
        const variance = 0.1;
        colors[i3] = c[0] + (Math.random() - 0.5) * variance;
        colors[i3 + 1] = c[1] + (Math.random() - 0.5) * variance;
        colors[i3 + 2] = c[2] + (Math.random() - 0.5) * variance;

        sizes[i] = Math.random() * 3 + 1;

        velocities[i3] = (Math.random() - 0.5) * 0.005;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float alpha = smoothstep(0.5, 0.15, d) * 0.45;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      // Mouse tracking
      let mouseX = 0;
      let mouseY = 0;

      function onMouseMove(e: MouseEvent) {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      }

      function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("resize", onResize);

      // Animate
      function animate() {
        if (disposed) return;

        const posArr = geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          const i3 = i * 3;
          posArr[i3] += velocities[i3];
          posArr[i3 + 1] += velocities[i3 + 1];
          posArr[i3 + 2] += velocities[i3 + 2];

          // Wrap around
          if (posArr[i3] > 30) posArr[i3] = -30;
          if (posArr[i3] < -30) posArr[i3] = 30;
          if (posArr[i3 + 1] > 20) posArr[i3 + 1] = -20;
          if (posArr[i3 + 1] < -20) posArr[i3 + 1] = 20;
        }
        geometry.attributes.position.needsUpdate = true;

        // Subtle mouse parallax
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      }

      animate();

      // Cleanup
      return () => {
        disposed = true;
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    init().then((c) => {
      cleanup = c;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
