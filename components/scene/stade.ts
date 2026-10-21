import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Un point de vue de la scène : caméra, cible et étiquettes flottantes à afficher. */
export interface Vue {
  camera: [number, number, number];
  cible: [number, number, number];
}

export const VUES: Vue[] = [
  { camera: [0, 2.3, 5.4], cible: [0, 1.35, 0] },
  { camera: [0, 7.2, 9.4], cible: [0, 0.6, 0] },
  { camera: [5.6, 2.9, 4.6], cible: [1.3, 0.1, 0.8] },
];

export interface Etiquette {
  vue: number;
  texte: string;
  position: THREE.Vector3;
}

interface Options {
  canvas: HTMLCanvasElement;
  couleursClubs: string[];
  poules: string[];
  sombre: boolean;
  animations: boolean;
}

const OR = new THREE.Color("#f2c230");
const LATERITE = new THREE.Color("#b4532a");

// Relief doux à base de sinusoïdes : pas besoin d'une bibliothèque de bruit.
const relief = (x: number, z: number) =>
  Math.sin(x * 0.35) * Math.cos(z * 0.3) * 0.6 + Math.sin(x * 0.9 + z * 0.7) * 0.18 + Math.cos(z * 1.3 - x * 0.4) * 0.1;

function trophee() {
  const groupe = new THREE.Group();
  const or = new THREE.MeshStandardMaterial({ color: OR, metalness: 1, roughness: 0.22 });
  const socle = new THREE.MeshStandardMaterial({ color: "#14321d", metalness: 0.3, roughness: 0.45 });

  const profil = [
    [0, 0.5], [0.42, 0.5], [0.42, 0.58], [0.26, 0.64], [0.14, 0.78], [0.1, 1.0], [0.1, 1.18],
    [0.2, 1.26], [0.42, 1.4], [0.6, 1.68], [0.68, 2.05], [0.7, 2.32], [0.64, 2.32], [0.6, 2.08],
    [0.5, 1.75], [0.05, 1.5],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const coupe = new THREE.Mesh(new THREE.LatheGeometry(profil, 96), or);
  coupe.castShadow = true;
  groupe.add(coupe);

  for (const cote of [-1, 1]) {
    const anse = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 16, 48, Math.PI), or);
    anse.position.set(cote * 0.64, 1.86, 0);
    anse.rotation.z = cote * -Math.PI / 2;
    anse.castShadow = true;
    groupe.add(anse);
  }

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.5, 64), socle);
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  const bague = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.06, 64), or);
  bague.position.y = 0.38;
  groupe.add(base, bague);
  return groupe;
}

function ballon() {
  // Ballon blanc à facettes, avec 12 pentagones noirs posés sur les sommets d'un icosaèdre.
  const rayon = 0.32;
  const groupe = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(rayon, 3),
    new THREE.MeshStandardMaterial({ color: "#f7f5ef", roughness: 0.5, flatShading: true }),
  );
  sphere.castShadow = true;
  groupe.add(sphere);
  const sommets = new THREE.IcosahedronGeometry(1, 0).getAttribute("position");
  const vus: THREE.Vector3[] = [];
  const noir = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.6, side: THREE.DoubleSide });
  const pentagone = new THREE.CircleGeometry(rayon * 0.36, 5);
  for (let i = 0; i < sommets.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(sommets, i).normalize();
    if (vus.some((c) => c.distanceTo(v) < 0.01)) continue;
    vus.push(v);
    const m = new THREE.Mesh(pentagone, noir);
    m.position.copy(v).multiplyScalar(rayon * 1.004);
    m.lookAt(v.clone().multiplyScalar(2));
    groupe.add(m);
  }
  return groupe;
}

function terrain(sombre: boolean) {
  const geo = new THREE.PlaneGeometry(60, 60, 140, 140);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position");
  const couleurs = new Float32Array(pos.count * 3);
  const base = LATERITE.clone().multiplyScalar(sombre ? 0.55 : 1);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.max(Math.abs(x) / 5, Math.abs(z) / 3.4);
    // Le terrain de jeu reste plat, le relief monte progressivement autour.
    const h = d < 1 ? 0 : relief(x, z) * Math.min(1, (d - 1) * 0.8) + Math.min(2.5, (d - 1) * 0.25);
    pos.setY(i, h);
    c.copy(base).offsetHSL(0, 0, (Math.sin(x * 3.1) * Math.cos(z * 2.7)) * 0.03 + h * 0.03);
    c.toArray(couleurs, i * 3);
  }
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(couleurs, 3));
  const sol = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  sol.receiveShadow = true;

  // Lignes du terrain de maracana
  const lignes = new THREE.Group();
  const blanc = new THREE.LineBasicMaterial({ color: "#f4efe4", transparent: true, opacity: 0.85 });
  const rect = (w: number, h: number, x = 0) => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x - w / 2, 0.01, -h / 2), new THREE.Vector3(x + w / 2, 0.01, -h / 2),
      new THREE.Vector3(x + w / 2, 0.01, h / 2), new THREE.Vector3(x - w / 2, 0.01, h / 2),
      new THREE.Vector3(x - w / 2, 0.01, -h / 2),
    ]);
    return new THREE.Line(g, blanc);
  };
  lignes.add(rect(9, 5.6), rect(0.0001, 5.6), rect(1.4, 2.4, -3.8), rect(1.4, 2.4, 3.8));
  const rond = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 65 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * Math.PI * 2) * 0.9, 0.01, Math.sin((i / 64) * Math.PI * 2) * 0.9)),
  );
  lignes.add(new THREE.Line(rond, blanc));
  return { sol, lignes };
}

function jetons(couleurs: string[]) {
  // 32 pastilles aux couleurs des clubs, réunies par 4 en 8 poules autour du trophée.
  const groupe = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.17, 0.17, 0.05, 40);
  const centres: THREE.Vector3[] = [];
  for (let p = 0; p < 8; p++) {
    const angle = (p / 8) * Math.PI * 2 + Math.PI / 8;
    const centre = new THREE.Vector3(Math.cos(angle) * 3.3, 0, Math.sin(angle) * 2.4);
    centres.push(centre);
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: couleurs[(p * 4 + k) % couleurs.length], metalness: 0.2, roughness: 0.35 }));
      const a2 = (k / 4) * Math.PI * 2;
      m.position.set(centre.x + Math.cos(a2) * 0.32, 0.6, centre.z + Math.sin(a2) * 0.32);
      m.userData = { base: m.position.y, phase: p + k * 0.7 };
      m.castShadow = true;
      groupe.add(m);
    }
  }
  return { groupe, centres };
}

function poussiere(sombre: boolean) {
  const n = 260;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = Math.random() * 5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: sombre ? "#f2c230" : "#c98a1c", size: 0.035, transparent: true, opacity: 0.7, depthWrite: false }),
  );
}

/**
 * Crée la scène du stade et renvoie de quoi la piloter.
 * Le rendu s'arrête de lui-même quand rien ne bouge (animations désactivées).
 */
export function creerStade({ canvas, couleursClubs, poules, sombre, animations }: Options) {
  const petitEcran = canvas.clientWidth < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, petitEcran ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !petitEcran;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const fond = new THREE.Color(sombre ? "#0d1a12" : "#efe7da");
  const scene = new THREE.Scene();
  scene.background = fond;
  scene.fog = new THREE.Fog(fond, 9, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(sombre ? "#30402f" : "#fff6e6", LATERITE, sombre ? 0.7 : 1.1));
  const soleil = new THREE.DirectionalLight("#fff1d6", sombre ? 1.6 : 2.4);
  soleil.position.set(4, 8, 3);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024);
  soleil.shadow.camera.left = -6; soleil.shadow.camera.right = 6;
  soleil.shadow.camera.top = 6; soleil.shadow.camera.bottom = -6;
  soleil.shadow.bias = -0.0005;
  scene.add(soleil);

  const coupe = trophee();
  const balle = ballon();
  balle.position.set(1.6, 0.32, 1.2);
  const { sol, lignes } = terrain(sombre);
  const { groupe: pastilles, centres } = jetons(couleursClubs);
  const grains = poussiere(sombre);
  scene.add(coupe, balle, sol, lignes, pastilles, grains);

  const etiquettes: Etiquette[] = [
    { vue: 0, texte: "1 trophée", position: new THREE.Vector3(0.7, 2.32, 0) },
    { vue: 0, texte: "BÊGNANAN DALOA CUP", position: new THREE.Vector3(-0.55, 0.4, 0.3) },
    ...centres.map((c, i) => ({ vue: 1, texte: `Poule ${poules[i] ?? ""}`, position: c.clone().setY(0.9) })),
    { vue: 2, texte: "Terrain de latérite", position: new THREE.Vector3(-3.6, 0.05, 1.6) },
    { vue: 2, texte: "Ballon", position: new THREE.Vector3(1.6, 0.7, 1.2) },
  ];

  // État de la caméra : on glisse en douceur vers la vue demandée.
  const camPos = new THREE.Vector3(...VUES[0].camera).add(new THREE.Vector3(0, 1.5, 3));
  const camCible = new THREE.Vector3(...VUES[0].cible);
  const vise = { pos: new THREE.Vector3(...VUES[0].camera), cible: new THREE.Vector3(...VUES[0].cible) };
  const souris = new THREE.Vector2();
  let defilement = 0;
  let vueActive = 0;
  let enPause = false;
  let visible = true;
  let id = 0;
  let surCadre: ((vue: number) => void) | null = null;
  const horloge = new THREE.Timer();

  function dimensionner() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Sur écran étroit, on recule pour garder le trophée entier.
    camera.fov = w / h < 0.9 ? 50 : 38;
    camera.updateProjectionMatrix();
  }

  function image(instant?: number) {
    horloge.update(instant);
    const dt = Math.min(horloge.getDelta(), 0.05);
    const t = horloge.getElapsed();
    const lissage = animations ? 1 - Math.pow(0.0025, dt) : 1;

    const cible = vise.pos.clone();
    cible.x += souris.x * 0.5;
    cible.y += souris.y * 0.3 + defilement * 1.2;
    cible.z += defilement * 1.5;
    camPos.lerp(cible, lissage);
    camCible.lerp(vise.cible, lissage);
    camera.position.copy(camPos);
    camera.lookAt(camCible);

    if (animations) {
      coupe.rotation.y = t * 0.35;
      coupe.position.y = Math.sin(t * 1.2) * 0.04;
      balle.position.x = 1.6 + Math.sin(t * 0.6) * 0.9;
      balle.rotation.z = -balle.position.x / 0.32;
      balle.position.y = 0.32 + Math.abs(Math.sin(t * 1.8)) * 0.12;
      balle.rotation.x = t * 0.4;
      for (const m of pastilles.children) {
        m.position.y = (m.userData.base as number) + Math.sin(t * 1.4 + (m.userData.phase as number)) * 0.08;
        m.rotation.y = t * 0.8 + (m.userData.phase as number);
      }
      grains.rotation.y = t * 0.02;
      grains.position.y = Math.sin(t * 0.3) * 0.1;
    }
    renderer.render(scene, camera);
    surCadre?.(vueActive);
  }

  function boucle(instant?: number) {
    id = requestAnimationFrame(boucle);
    if (!visible || enPause) return;
    image(instant);
  }

  dimensionner();
  const observateur = new ResizeObserver(() => {
    dimensionner();
    if (!animations) image();
  });
  horloge.connect(document);
  observateur.observe(canvas);
  if (animations) boucle();
  else image();

  const projete = new THREE.Vector3();
  return {
    etiquettes,
    /** Position à l'écran (en pixels) d'une étiquette, et si elle est dans le cadre. */
    ecran(e: Etiquette) {
      projete.copy(e.position).project(camera);
      return {
        x: ((projete.x + 1) / 2) * canvas.clientWidth,
        y: ((1 - projete.y) / 2) * canvas.clientHeight,
        dedans: projete.z < 1 && Math.abs(projete.x) < 0.95 && Math.abs(projete.y) < 0.92,
      };
    },
    /** Appelé après chaque image, pour placer les étiquettes HTML. */
    surCadre(f: (vue: number) => void) {
      surCadre = f;
    },
    allerA(vue: number) {
      vueActive = vue;
      vise.pos.set(...VUES[vue].camera);
      vise.cible.set(...VUES[vue].cible);
      if (!animations) image();
    },
    souris(x: number, y: number) {
      souris.set(x, y);
    },
    defiler(p: number) {
      defilement = p;
    },
    visibilite(v: boolean) {
      visible = v;
      if (v) horloge.reset();
    },
    pause(p: boolean) {
      enPause = p;
    },
    detruire() {
      cancelAnimationFrame(id);
      observateur.disconnect();
      horloge.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

export type Stade = ReturnType<typeof creerStade>;
