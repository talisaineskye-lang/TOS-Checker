'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CubeSceneProps {
  progress: number;   // 0–1 scroll progress
  mouseX: number;     // -1 to 1
  mouseY: number;     // -1 to 1
}

export default function CubeScene({ progress, mouseX, mouseY }: CubeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cubeGroup: THREE.Group;
    layers: THREE.Group[];
    core: THREE.Mesh;
    coreMat: THREE.MeshBasicMaterial;
    core2: THREE.Mesh;
    core2Mat: THREE.MeshBasicMaterial;
    reflGlowMat: THREE.MeshBasicMaterial;
    particles: THREE.Mesh[];
    pl1: THREE.PointLight;
    pl2: THREE.PointLight;
    clock: THREE.Clock;
    raf: number;
  } | null>(null);

  // Keep latest props in ref for animation loop
  const propsRef = useRef({ progress, mouseX, mouseY });
  propsRef.current = { progress, mouseX, mouseY };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030014, 0.08);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.5, 6);

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    // --- Stacked layers ---
    const layerCount = 5;
    const layerH = 0.15;
    const layerGap = 0.045;
    const layerW = 1.15;
    const layers: THREE.Group[] = [];

    const layerColors = [
      new THREE.Color(0x00e5ff),
      new THREE.Color(0x29b6f6),
      new THREE.Color(0x4fc3f7),
      new THREE.Color(0x7c4dff),
      new THREE.Color(0x9382ff),
    ];

    // Rounded box geometry helper
    function createRoundedBoxGeo(width: number, height: number, depth: number, radius: number, segments: number) {
      const shape = new THREE.Shape();
      const w = width / 2;
      const d = depth / 2;
      const r = Math.min(radius, w, d);

      shape.moveTo(-w + r, -d);
      shape.lineTo(w - r, -d);
      shape.quadraticCurveTo(w, -d, w, -d + r);
      shape.lineTo(w, d - r);
      shape.quadraticCurveTo(w, d, w - r, d);
      shape.lineTo(-w + r, d);
      shape.quadraticCurveTo(-w, d, -w, d - r);
      shape.lineTo(-w, -d + r);
      shape.quadraticCurveTo(-w, -d, -w + r, -d);

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: true,
        bevelThickness: r * 0.4,
        bevelSize: r * 0.3,
        bevelOffset: 0,
        bevelSegments: segments,
        curveSegments: segments,
      });

      geo.rotateX(-Math.PI / 2);
      geo.translate(0, height / 2 + r * 0.4, 0);
      geo.center();
      return geo;
    }

    for (let i = 0; i < layerCount; i++) {
      const group = new THREE.Group();
      const yBase = (i - (layerCount - 1) / 2) * (layerH + layerGap);
      const color = layerColors[i];
      group.userData = { baseY: yBase, index: i, color };

      // Rounded glass slab
      const geo = createRoundedBoxGeo(layerW, layerH, layerW, 0.08, 3);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        transparent: true,
        opacity: 0.1,
        roughness: 0.05,
        metalness: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(geo, mat));

      // Soft edges
      const edgeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 });
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), edgeMat));

      // Circuit traces
      for (let t = 0; t < 3 + Math.floor(Math.random() * 3); t++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const onX = Math.random() > 0.5;
        const len = 0.25 + Math.random() * 0.55;
        const sx = onX ? side * layerW / 2 : (Math.random() - 0.5) * layerW * 0.7;
        const sz = onX ? (Math.random() - 0.5) * layerW * 0.7 : side * layerW / 2;
        const ex = onX ? sx + side * len : sx + (Math.random() - 0.5) * 0.12;
        const ez = onX ? sz + (Math.random() - 0.5) * 0.12 : sz + side * len;

        const tGeo = new THREE.BufferGeometry();
        tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([sx, 0, sz, ex, 0, ez]), 3));
        const tLine = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 }));
        tLine.userData.isTrace = true;
        group.add(tLine);

        // End node
        const nMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 8, 8),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
        );
        nMesh.position.set(ex, 0, ez);
        nMesh.userData.isNode = true;
        group.add(nMesh);
      }

      group.position.y = yBase;
      cubeGroup.add(group);
      layers.push(group);
    }

    // Core glows
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.06 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), coreMat);
    cubeGroup.add(core);

    const core2Mat = new THREE.MeshBasicMaterial({ color: 0x9382ff, transparent: true, opacity: 0.1 });
    const core2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), core2Mat);
    cubeGroup.add(core2);

    // Particles
    const particles: THREE.Mesh[] = [];
    for (let i = 0; i < 16; i++) {
      const c = [0x00e5ff, 0x4fc3f7, 0x9382ff, 0x7c4dff, 0x29b6f6][Math.floor(Math.random() * 5)];
      const pMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3 });
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.01 + Math.random() * 0.018, 8, 8), pMat);
      p.userData = {
        a: Math.random() * Math.PI * 2,
        r: 1.3 + Math.random() * 1.8,
        s: 0.1 + Math.random() * 0.25,
        yO: (Math.random() - 0.5) * 2,
        yS: 0.15 + Math.random() * 0.25,
      };
      scene.add(p);
      particles.push(p);
    }

    // Reflection plane
    const reflPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0x030014, transparent: true, opacity: 0.85 })
    );
    reflPlane.rotation.x = -Math.PI / 2;
    reflPlane.position.y = -1.3;
    scene.add(reflPlane);

    // Reflection glow
    const reflGlowMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.03 });
    const reflGlow = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), reflGlowMat);
    reflGlow.rotation.x = -Math.PI / 2;
    reflGlow.position.y = -1.28;
    scene.add(reflGlow);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const pl1 = new THREE.PointLight(0x00e5ff, 2, 12);
    pl1.position.set(3, 2, 3);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0x9382ff, 1.5, 12);
    pl2.position.set(-3, -1, 2);
    scene.add(pl2);
    const pl3 = new THREE.PointLight(0x7c4dff, 0.6, 8);
    pl3.position.set(0, -2, -3);
    scene.add(pl3);

    const clock = new THREE.Clock();

    // --- Smoothstep helper ---
    function smoothstep(a: number, b: number, t: number) {
      const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return x * x * (3 - 2 * x);
    }

    // --- Animation ---
    function animate() {
      const raf = requestAnimationFrame(animate);
      stateRef.current!.raf = raf;

      const t = clock.getElapsedTime();
      const { progress: sp, mouseX: mx, mouseY: my } = propsRef.current;

      // Scroll-driven explode
      let explodeAmount = 0;
      if (sp < 0.12) {
        explodeAmount = 0;
      } else if (sp < 0.28) {
        explodeAmount = smoothstep(0.12, 0.25, sp);
      } else if (sp < 0.44) {
        explodeAmount = 1;
      } else if (sp < 0.58) {
        explodeAmount = 1 - smoothstep(0.44, 0.56, sp);
      } else {
        explodeAmount = 0;
      }

      const maxSpread = 0.55;
      layers.forEach((layer, i) => {
        const baseY = layer.userData.baseY as number;
        const centerOffset = i - (layerCount - 1) / 2;
        const stagger = Math.abs(centerOffset) / ((layerCount - 1) / 2);
        const spread = explodeAmount * maxSpread * (1 + stagger * 0.7);
        layer.position.y = baseY + centerOffset * spread;

        // Wobble when exploded
        if (explodeAmount > 0.3) {
          layer.position.x = Math.sin(t * 1.2 + i * 1.5) * 0.02 * explodeAmount;
          layer.position.z = Math.cos(t * 1.0 + i * 1.1) * 0.02 * explodeAmount;
          layer.rotation.z = Math.sin(t * 0.7 + i) * 0.015 * explodeAmount;
        } else {
          layer.position.x *= 0.9;
          layer.position.z *= 0.9;
          layer.rotation.z *= 0.9;
        }

        // Material animation
        layer.children.forEach((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'ExtrudeGeometry') {
            ((child as THREE.Mesh).material as THREE.MeshPhysicalMaterial).opacity =
              0.08 + explodeAmount * 0.1 + Math.sin(t * 1.2 + i * 0.8) * 0.02;
          }
          if ((child as THREE.LineSegments).isLineSegments) {
            ((child as THREE.LineSegments).material as THREE.LineBasicMaterial).opacity =
              0.3 + Math.sin(t * 2 + i * 0.6) * 0.15 + explodeAmount * 0.3;
          }
          if (child.userData.isTrace) {
            ((child as THREE.Line).material as THREE.LineBasicMaterial).opacity =
              0.1 + explodeAmount * 0.4 + Math.sin(t * 2.5 + i * 1.2) * 0.1;
          }
          if (child.userData.isNode) {
            const s = 0.6 + explodeAmount * 0.8 + Math.sin(t * 3 + i * 0.5) * 0.2;
            child.scale.set(s, s, s);
            ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.2 + explodeAmount * 0.6;
          }
        });
      });

      // Cube rotation
      const scrollRot = sp * Math.PI * 2.5;
      cubeGroup.rotation.y = scrollRot * 0.3 + t * 0.15 + mx * 0.2;
      cubeGroup.rotation.x = Math.sin(t * 0.12) * 0.1 + my * 0.12;
      cubeGroup.rotation.z = Math.sin(t * 0.08) * 0.04;

      // Camera
      const camZ = 6 - explodeAmount * 1.2;
      camera.position.z += (camZ - camera.position.z) * 0.04;
      camera.position.y += (0.5 - explodeAmount * 0.2 - camera.position.y) * 0.04;

      // Core glow
      const cs = 0.7 + Math.sin(t * 1.5) * 0.2 + explodeAmount * 0.3;
      core.scale.set(cs, cs, cs);
      coreMat.opacity = 0.04 + Math.sin(t * 2) * 0.03 + explodeAmount * 0.08;
      core2.scale.set(cs * 0.75, cs * 0.75, cs * 0.75);
      core2Mat.opacity = 0.06 + Math.sin(t * 2.5 + 0.5) * 0.04;

      // Reflection glow
      reflGlowMat.opacity = 0.02 + explodeAmount * 0.03 + Math.sin(t * 1.2) * 0.01;
      reflGlowMat.color.setHSL(0.52 + Math.sin(t * 0.3) * 0.08, 0.7, 0.5);

      // Particles
      particles.forEach((p) => {
        const d = p.userData;
        d.a += d.s * 0.005;
        p.position.x = Math.cos(d.a) * d.r;
        p.position.z = Math.sin(d.a) * d.r * 0.55;
        p.position.y = d.yO + Math.sin(t * d.yS + d.a) * 0.4;
        (p.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 1.5 + d.a) * 0.12;
      });

      // Lights breathe
      pl1.intensity = 1.5 + Math.sin(t * 1.0) * 0.5 + explodeAmount * 1;
      pl2.intensity = 1.2 + Math.sin(t * 0.7 + 1) * 0.4;

      renderer.render(scene, camera);
    }

    stateRef.current = {
      renderer, scene, camera, cubeGroup, layers, core, coreMat, core2, core2Mat,
      reflGlowMat, particles, pl1, pl2, clock, raf: 0,
    };

    animate();

    // Resize handler
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (stateRef.current) {
        cancelAnimationFrame(stateRef.current.raf);
      }
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="cube-canvas" />;
}
