/* FIT LIFE · goal physique — procedural mannequin (Three.js, no model file) */
(function () {
  "use strict";

  var stage = document.getElementById("hero-stage");
  var canvas = document.getElementById("hero-canvas");
  var fallback = document.getElementById("hero-fallback");
  if (!stage || !canvas) return;

  if (!window.THREE) {
    if (fallback) fallback.hidden = false;
    return;
  }

  var THREE = window.THREE;
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
    if (fallback) fallback.hidden = false;
    return;
  }
  if (!renderer.getContext()) {
    if (fallback) fallback.hidden = false;
    return;
  }

  var dprCap = Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.35 : 1.6);
  renderer.setPixelRatio(dprCap);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 6.5, 11);

  var camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);

  var ivory = new THREE.MeshStandardMaterial({
    color: 0xe4e7ee,
    metalness: 0.22,
    roughness: 0.38,
    emissive: 0x2a2e36,
    emissiveIntensity: 0.45
  });
  var muscle = new THREE.MeshStandardMaterial({
    color: 0xe7ebf2,
    metalness: 0.62,
    roughness: 0.22
  });
  var edgeMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.28
  });

  var figure = new THREE.Group();
  scene.add(figure);

  var chest = new THREE.Group();
  figure.add(chest);

  function place(obj, parent, x, y, z, rx, ry, rz, sx, sy, sz) {
    obj.position.set(x, y, z);
    obj.rotation.set(rx || 0, ry || 0, rz || 0);
    obj.scale.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    parent.add(obj);
    return obj;
  }

  function add(geo, mat, parent, x, y, z, rx, ry, rz, sx, sy, sz, lined) {
    var mesh = place(new THREE.Mesh(geo, mat), parent, x, y, z, rx, ry, rz, sx, sy, sz);
    if (lined) {
      var lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), edgeMat);
      place(lines, parent, x, y, z, rx, ry, rz, sx, sy, sz);
    }
    return mesh;
  }

  function sphere(r, seg) {
    return new THREE.SphereGeometry(r, seg || 24, seg || 18);
  }
  function cap(r, len) {
    return new THREE.CapsuleGeometry(r, len, 6, 14);
  }

  /* Torso — athletic V, waist pulled in, shoulders not a cone */
  var torsoPts = [
    new THREE.Vector2(0.055, 0.90),
    new THREE.Vector2(0.105, 0.96),
    new THREE.Vector2(0.112, 1.05),
    new THREE.Vector2(0.092, 1.16),
    new THREE.Vector2(0.108, 1.26),
    new THREE.Vector2(0.132, 1.36),
    new THREE.Vector2(0.128, 1.44),
    new THREE.Vector2(0.09, 1.50)
  ];
  add(new THREE.LatheGeometry(torsoPts, 40), ivory, chest, 0, 0, 0, 0, 0, 0, 1.12, 1, 0.72, false);

  /* Pecs */
  add(sphere(0.086, 22), muscle, chest, -0.068, 1.345, 0.072, 0.2, 0.25, 0, 1.2, 0.58, 0.5, false);
  add(sphere(0.086, 22), muscle, chest, 0.068, 1.345, 0.072, 0.2, -0.25, 0, 1.2, 0.58, 0.5, false);

  /* Six shallow abs */
  var row;
  for (row = 0; row < 3; row++) {
    var y = 1.185 - row * 0.058;
    var s = 1 - row * 0.07;
    add(sphere(0.03, 12), muscle, chest, -0.032, y, 0.09, 0.15, 0, 0, s, 0.72, 0.55, false);
    add(sphere(0.03, 12), muscle, chest, 0.032, y, 0.09, 0.15, 0, 0, s, 0.72, 0.55, false);
  }

  /* Delts */
  add(sphere(0.074, 18), muscle, chest, -0.2, 1.45, 0.015, 0, 0, 0.25, 1.2, 0.95, 1.05, false);
  add(sphere(0.074, 18), muscle, chest, 0.2, 1.45, 0.015, 0, 0, -0.25, 1.2, 0.95, 1.05, false);

  /* Neck + blank head (no face — silhouette) */
  add(cap(0.046, 0.06), ivory, chest, 0, 1.56, 0.01, 0, 0, 0, 1, 1, 1, false);
  add(sphere(0.115, 32), ivory, chest, 0, 1.69, 0.02, 0, 0, 0, 1, 1.16, 1.04, false);

  function limb(side) {
    var arm = new THREE.Group();
    arm.position.set(side * 0.26, 1.44, 0.02);
    /* A-pose so the arm clears the ribcage in silhouette */
    arm.rotation.z = side * 0.72;
    arm.rotation.x = 0.12;
    figure.add(arm);

    add(cap(0.05, 0.26), ivory, arm, 0, -0.185, 0, 0, 0, 0, 1, 1, 1, true);

    var elbow = new THREE.Group();
    elbow.position.set(0, -0.36, 0);
    elbow.rotation.x = -0.28;
    arm.add(elbow);
    add(cap(0.04, 0.24), ivory, elbow, 0, -0.16, 0, 0, 0, 0, 1, 1, 1, true);
    add(sphere(0.036, 12), ivory, elbow, side * 0.01, -0.31, 0.015, 0, 0, 0, 0.85, 0.7, 0.5, false);

    var leg = new THREE.Group();
    leg.position.set(side * 0.125, 0.94, 0);
    leg.rotation.z = side * 0.16;
    figure.add(leg);
    add(cap(0.075, 0.36), ivory, leg, 0, -0.26, 0.01, 0, 0, 0, 1, 1, 0.9, true);

    var shin = new THREE.Group();
    shin.position.set(side * 0.015, -0.5, 0.015);
    leg.add(shin);
    add(cap(0.048, 0.32), ivory, shin, 0, -0.22, 0, 0, 0, 0, 1, 1, 0.88, true);

    var foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.11, 4, 10), ivory);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -0.4, 0.05);
    shin.add(foot);
  }

  limb(-1);
  limb(1);

  add(sphere(0.08, 16), ivory, figure, -0.07, 0.9, -0.05, 0, 0, 0, 1.05, 0.78, 0.82, false);
  add(sphere(0.08, 16), ivory, figure, 0.07, 0.9, -0.05, 0, 0, 0, 1.05, 0.78, 0.82, false);

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
    mesh.position.y = 0.006;
    scene.add(mesh);
    return mesh;
  }
  var rings = [padRing(0.55, 0.5), padRing(0.78, 0.22), padRing(1.05, 0.1)];

  var spokes = new THREE.Group();
  var spokeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
  var i;
  for (i = 0; i < 12; i++) {
    var a = (i / 12) * Math.PI * 2;
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 0.22, 0.008, Math.sin(a) * 0.22),
      new THREE.Vector3(Math.cos(a) * 1.08, 0.008, Math.sin(a) * 1.08)
    ]);
    spokes.add(new THREE.Line(geo, spokeMat));
  }
  scene.add(spokes);

  var glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  var g = glowCanvas.getContext("2d");
  var grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, "rgba(170,196,255,0.35)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.05)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  var glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 48),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.002;
  scene.add(glow);

  scene.add(new THREE.AmbientLight(0xb7c0d0, 0.55));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1c22, 0.45));
  var key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(-2.2, 4.2, 2.8);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x7aa2ff, 3.2);
  rim.position.set(2.8, 2.2, -2.6);
  scene.add(rim);
  var fill = new THREE.DirectionalLight(0xfff6ea, 0.7);
  fill.position.set(0.4, 1.4, 4);
  scene.add(fill);

  var yaw = 0.7;
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
    var dist = (w / Math.max(h, 1) < 0.85) ? 4.55 : 4.15;
    camera.position.set(0.05, 1.02, dist);
    camera.lookAt(0, 0.96, 0);
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
    pitch = Math.max(-0.28, Math.min(0.32, pitch + dy * 0.0035));
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

  var clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    var t = clock.getElapsedTime();
    if (!dragging && auto) yaw += 0.0032;
    else if (!dragging && !reduced && resumeAt && performance.now() > resumeAt) {
      auto = true;
      resumeAt = 0;
    }
    figure.rotation.y = yaw;
    figure.rotation.x = pitch;
    var breath = reduced ? 0 : Math.sin(t * 1.25) * 0.011;
    chest.scale.set(1 + breath * 0.4, 1 + breath, 1 + breath * 0.5);
    chest.position.y = breath * 0.4;
    if (!reduced) spokes.rotation.y = t * 0.08;
    renderer.render(scene, camera);
  }
  frame();
})();
