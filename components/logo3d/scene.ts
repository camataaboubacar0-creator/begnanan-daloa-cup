import * as THREE from "three";

interface Options {
  canvas: HTMLCanvasElement;
  /** Zone qui contient la scène (le bandeau vert). */
  zone: HTMLElement;
  /** Emplacement du logo dans la mise en page : le logo 3D s'y aligne. */
  emplacement: HTMLElement;
  image: string;
  animations: boolean;
  /** Appelé une fois la texture du logo chargée et la première image dessinée. */
  pret: () => void;
}

const EPAISSEUR = 0.16;
const COUCHES = 28;

// Tranche du logo : on garde la silhouette (canal alpha) et on la peint en or sombre.
const tranche = (couleur: THREE.Color, texture: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: { carte: { value: texture }, couleur: { value: couleur } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D carte; uniform vec3 couleur; varying vec2 vUv;
      void main(){ if (texture2D(carte, vUv).a < 0.5) discard; gl_FragColor = vec4(couleur, 1.0); }`,
  });

// Reflet : une bande lumineuse qui traverse le logo en diagonale, seulement sur ses parties pleines.
const reflet = (texture: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: { carte: { value: texture }, phase: { value: -1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D carte; uniform float phase; varying vec2 vUv;
      void main(){
        float a = texture2D(carte, vUv).a;
        float d = abs(vUv.x * 0.8 + (1.0 - vUv.y) * 0.6 - phase);
        float bande = smoothstep(0.16, 0.0, d) * 0.55 + smoothstep(0.03, 0.0, d) * 0.35;
        gl_FragColor = vec4(vec3(1.0, 0.96, 0.82) * bande * a, bande * a);
      }`,
  });

function particules(nombre: number) {
  const pos = new Float32Array(nombre * 3);
  const couleurs = new Float32Array(nombre * 3);
  const graines = new Float32Array(nombre);
  const palette = [new THREE.Color("#f7d417"), new THREE.Color("#3fd16a"), new THREE.Color("#c8f5d2"), new THREE.Color("#ffe873")];
  for (let i = 0; i < nombre; i++) {
    pos[i * 3] = Math.random() - 0.5;
    pos[i * 3 + 1] = Math.random() - 0.5;
    pos[i * 3 + 2] = -3 + Math.random() * 4.5;
    palette[i % palette.length].toArray(couleurs, i * 3);
    graines[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(couleurs, 3));
  geo.setAttribute("graine", new THREE.BufferAttribute(graines, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { temps: { value: 0 }, taille: { value: new THREE.Vector2(1, 1) }, pixel: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: `
      uniform float temps; uniform vec2 taille; uniform float pixel;
      attribute float graine; varying vec3 vCouleur; varying float vAlpha;
      void main(){
        vec3 p = position;
        // Montée lente et balancement ; les particules reviennent en bas une fois sorties.
        p.y = fract(p.y + 0.5 + temps * (0.012 + graine * 0.02)) - 0.5;
        p.x += sin(temps * 0.4 + graine * 12.0) * 0.015;
        p.xy *= taille;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = pixel * (3.0 + graine * graine * 14.0) * (10.0 / -mv.z);
        vCouleur = color;
        vAlpha = (0.45 + 0.55 * abs(sin(temps * (0.6 + graine) + graine * 30.0))) * smoothstep(0.5, 0.35, abs(p.y / taille.y));
      }`,
    fragmentShader: `
      varying vec3 vCouleur; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a * 1.6 + smoothstep(0.18, 0.0, d) * 0.6;
        gl_FragColor = vec4(vCouleur * a * vAlpha, a * vAlpha);
      }`,
  });
  return new THREE.Points(geo, mat);
}

/** Logo officiel en relief, qui suit la souris, au milieu de particules vertes et jaunes. */
export function creerLogo3D({ canvas, zone, emplacement, image, animations, pret }: Options) {
  const petitEcran = zone.clientWidth < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio, petitEcran ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.z = 10;

  const logo = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.add(logo);
  scene.add(pivot);

  const nuage = particules(petitEcran ? 220 : 420);
  scene.add(nuage);
  const matNuage = nuage.material as THREE.ShaderMaterial;
  matNuage.uniforms.pixel.value = dpr;

  let matReflet: THREE.ShaderMaterial | null = null;
  const geoPlan = new THREE.PlaneGeometry(1, 587 / 600);
  const texture = new THREE.TextureLoader().load(image, () => {
    // Tranches empilées vers l'arrière : de l'or vif près de la face au brun à l'arrière.
    const clair = new THREE.Color("#e0a91a"), sombre = new THREE.Color("#5a4204");
    for (let i = COUCHES; i >= 1; i--) {
      const c = clair.clone().lerp(sombre, i / COUCHES);
      const m = new THREE.Mesh(geoPlan, tranche(c, texture));
      m.position.z = (-i / COUCHES) * EPAISSEUR;
      logo.add(m);
    }
    const face = new THREE.Mesh(geoPlan, new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.02 }));
    logo.add(face);
    matReflet = reflet(texture);
    const brillance = new THREE.Mesh(geoPlan, matReflet);
    brillance.position.z = 0.002;
    logo.add(brillance);
    placer();
    image_();
    pret();
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  // Correspondance entre pixels de la page et unités 3D sur le plan z = 0.
  let unite = 1;
  function placer() {
    const w = zone.clientWidth, h = zone.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const hauteurVisible = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    unite = hauteurVisible / h;
    const z = zone.getBoundingClientRect(), e = emplacement.getBoundingClientRect();
    const cx = e.left + e.width / 2 - z.left, cy = e.top + e.height / 2 - z.top;
    pivot.position.set((cx - w / 2) * unite, -(cy - h / 2) * unite, 0);
    logo.scale.setScalar(e.width * unite);
    matNuage.uniforms.taille.value.set(w * unite * 1.1, h * unite * 1.1);
  }

  const vise = new THREE.Vector2();
  const actuel = new THREE.Vector2();
  let defilement = 0;
  let visible = true;
  let id = 0;
  const horloge = new THREE.Timer();
  horloge.connect(document);

  function image_(instant?: number) {
    horloge.update(instant);
    const t = horloge.getElapsed();
    const dt = Math.min(horloge.getDelta(), 0.05);
    if (animations) {
      const k = 1 - Math.pow(0.002, dt);
      actuel.lerp(vise, k);
      pivot.rotation.y = actuel.x * 0.5 + Math.sin(t * 0.5) * 0.12;
      pivot.rotation.x = -actuel.y * 0.35 + Math.cos(t * 0.4) * 0.05 + defilement * 0.4;
      logo.position.y = Math.sin(t * 1.1) * 0.06;
      nuage.rotation.y = actuel.x * 0.08;
      nuage.rotation.x = -actuel.y * 0.05;
      matNuage.uniforms.temps.value = t;
      // Un passage de lumière toutes les 5 secondes, avancé par l'inclinaison.
      if (matReflet) matReflet.uniforms.phase.value = ((t % 5) / 5) * 3 - 0.8 + actuel.x * 0.3;
    } else if (matReflet) {
      matReflet.uniforms.phase.value = 0.7;
    }
    renderer.render(scene, camera);
  }

  function boucle(instant?: number) {
    id = requestAnimationFrame(boucle);
    if (visible) image_(instant);
  }

  const observateur = new ResizeObserver(() => {
    placer();
    if (!animations) image_();
  });
  observateur.observe(zone);
  observateur.observe(emplacement);
  placer();
  if (animations) boucle();

  return {
    souris(clientX: number, clientY: number) {
      const e = emplacement.getBoundingClientRect();
      const x = (clientX - (e.left + e.width / 2)) / (window.innerWidth / 2);
      const y = (clientY - (e.top + e.height / 2)) / (window.innerHeight / 2);
      vise.set(THREE.MathUtils.clamp(x, -1, 1), -THREE.MathUtils.clamp(y, -1, 1));
    },
    defiler(p: number) {
      defilement = p;
    },
    visibilite(v: boolean) {
      visible = v;
    },
    detruire() {
      cancelAnimationFrame(id);
      observateur.disconnect();
      horloge.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry && m.geometry !== geoPlan) m.geometry.dispose();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose();
      });
      geoPlan.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export type Logo3D = ReturnType<typeof creerLogo3D>;
