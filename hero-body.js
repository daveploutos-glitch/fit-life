/* FIT LIFE · goal physique — CC0 MakeHuman male (see models/LICENSE.txt) */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  var stage = document.getElementById("hero-stage");
  var canvas = document.getElementById("hero-canvas");
  var fallback = document.getElementById("hero-fallback");
  if (!stage || !canvas) return;

  function showFallback() {
    if (fallback) fallback.hidden = false;
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
  } catch (err) {
    showFallback();
    return;
  }
  if (!renderer.getContext()) {
    showFallback();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.35 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 7.2, 13);
  var camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);

  var figure = new THREE.Group();
  scene.add(figure);

  scene.add(new THREE.AmbientLight(0xc5ccd8, 0.28));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x12141a, 0.38));
  var key = new THREE.DirectionalLight(0xfff4ea, 2.7);
  key.position.set(-2.2, 4.2, 2.6);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x8eafff, 1.7);
  rim.position.set(2.4, 2.1, -2.4);
  scene.add(rim);
  var fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(1.2, 1.4, 3.2);
  scene.add(fill);

  function padRing(radius, opacity) {
    var mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.008, radius, 96),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.004;
    scene.add(mesh);
    return mesh;
  }
  padRing(0.48, 0.42);
  padRing(0.72, 0.18);
  padRing(0.98, 0.08);

  var spokes = new THREE.Group();
  var spokeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 });
  for (var i = 0; i < 12; i++) {
    var a = (i / 12) * Math.PI * 2;
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 0.2, 0.008, Math.sin(a) * 0.2),
      new THREE.Vector3(Math.cos(a) * 1.02, 0.008, Math.sin(a) * 1.02)
    ]);
    spokes.add(new THREE.Line(geo, spokeMat));
  }
  scene.add(spokes);

  var glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  var g = glowCanvas.getContext("2d");
  var grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, "rgba(170,196,255,0.32)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.05)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  var glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 48),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.002;
  scene.add(glow);

  var modelRoot = null;
  var yaw = 0.55;
  var pitch = 0.02;
  var auto = !reduced;
  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var gesture = null;
  var resumeAt = 0;
  var visible = true;

  function fit() {
    var w = stage.clientWidth || 480;
    var h = stage.clientHeight || 640;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    var dist = (w / Math.max(h, 1) < 0.85) ? 4.35 : 3.85;
    camera.position.set(0.08, 0.98, dist);
    camera.lookAt(0, 0.92, 0);
    camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
  else window.addEventListener("resize", fit);
  fit();

  stage.addEventListener("pointerdown", function (e) {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    gesture = null;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  stage.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    if (!gesture) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      gesture = Math.abs(dx) > Math.abs(dy) ? "orbit" : "scroll";
      if (gesture === "orbit") {
        auto = false;
        canvas.classList.add("is-drag");
        if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
      }
    }
    lastX = e.clientX;
    lastY = e.clientY;
    if (gesture !== "orbit") return;
    yaw += dx * 0.008;
    pitch = Math.max(-0.22, Math.min(0.28, pitch + dy * 0.0035));
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    gesture = null;
    canvas.classList.remove("is-drag");
    if (!reduced) resumeAt = performance.now() + 1600;
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse") endDrag();
  });

  var hero = document.getElementById("hero");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries.some(function (en) { return en.isIntersecting; });
    }, { threshold: 0.02 }).observe(hero);
  }

  var loader = new GLTFLoader();
  loader.load(
    "models/goal-physique.glb?v=hero3d10",
    function (gltf) {
      modelRoot = gltf.scene;
      modelRoot.traverse(function (obj) {
        if (obj.isMesh) {
          obj.castShadow = false;
          obj.frustumCulled = false;
          if (obj.material) {
            var shorts = obj.name === "shorts" || (obj.material.name === "shorts");
            obj.material.side = shorts ? THREE.DoubleSide : THREE.FrontSide;
          }
        }
      });
      figure.add(modelRoot);
      if (fallback) fallback.hidden = true;
    },
    undefined,
    function () {
      showFallback();
    }
  );

  var clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    var t = clock.getElapsedTime();
    if (!dragging && auto) yaw += 0.003;
    else if (!dragging && !reduced && resumeAt && performance.now() > resumeAt) {
      auto = true;
      resumeAt = 0;
    }
    figure.rotation.y = yaw;
    figure.rotation.x = pitch;
    if (modelRoot && !reduced) {
      var breath = Math.sin(t * 1.2) * 0.008;
      modelRoot.scale.set(1 + breath * 0.35, 1 + breath * 0.15, 1 + breath * 0.55);
    }
    if (!reduced) spokes.rotation.y = t * 0.08;
    renderer.render(scene, camera);
  }
  frame();
})();
