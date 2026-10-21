import * as THREE from "three";
import type { VehicleSpec } from "../game/catalog";
import type { Body } from "../game/types";

export class CarModel {
  readonly root = new THREE.Group();
  private wheels: { spin: THREE.Group; front: boolean }[] = [];
  private spots: THREE.SpotLight[] = [];
  private glows: THREE.Mesh[] = [];
  private built = "";

  constructor() {
    this.root.rotation.order = "YXZ";
  }

  sync = (spec: VehicleSpec, color: string): void => {
    const key = `${spec.id}:${color}`;
    if (key === this.built) {
      return;
    }
    this.built = key;
    this.clear();
    const paint = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: spec.power === "electric" ? 0.55 : 0.18,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: "#14202c",
      roughness: 0.08,
      metalness: 0.35,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#1a1d22",
      roughness: 0.7,
      metalness: 0.05,
    });
    const lamp = new THREE.MeshStandardMaterial({
      color: "#fff4d2",
      emissive: "#fff1c2",
      emissiveIntensity: 0.2,
    });
    if (spec.wheels === 2) {
      this.bike(spec, paint, dark, glass, lamp);
    } else if (spec.id === "coach") {
      this.coach(spec, paint, dark, glass, lamp);
    } else if (spec.id === "sport") {
      this.sport(spec, paint, dark, glass, lamp);
    } else if (spec.id === "hatch") {
      this.hatch(spec, paint, dark, glass, lamp);
    } else {
      this.coupe(spec, paint, dark, glass, lamp);
    }
    this.lamps(spec, lamp);
    this.plate(spec);
  };

  update = (body: Body, spec: VehicleSpec, lit: boolean): void => {
    this.root.position.set(body.x, body.y - spec.ride + 0.02, body.z);
    this.root.rotation.y = body.heading;
    this.root.rotation.x = body.pitch;
    this.root.rotation.z = spec.wheels === 2 ? -body.roll * 1.6 : -body.roll * 0.45;
    for (const wheel of this.wheels) {
      wheel.spin.rotation.x = -body.wheel;
      wheel.spin.rotation.y = wheel.front ? body.steer : 0;
    }
    for (const spot of this.spots) {
      spot.intensity = lit ? 80 : 0;
      spot.visible = lit;
    }
    for (const glow of this.glows) {
      const material = glow.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissiveIntensity = lit ? 2.4 : 0.15;
      }
    }
  };

  dispose = (): void => {
    this.clear();
  };

  private clear(): void {
    this.root.clear();
    this.wheels = [];
    this.spots = [];
    this.glows = [];
  }

  private box(
    material: THREE.Material,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    this.root.add(mesh);
    return mesh;
  }

  private coupe(
    spec: VehicleSpec,
    paint: THREE.Material,
    dark: THREE.Material,
    glass: THREE.Material,
    lamp: THREE.Material,
  ): void {
    const tail = new THREE.MeshStandardMaterial({
      color: "#8c1d1d",
      emissive: "#ff2a2a",
      emissiveIntensity: 0.6,
    });
    this.box(paint, spec.width, 0.42, spec.length * 0.92, 0, 0.48, 0);
    this.box(paint, spec.width * 0.92, 0.28, spec.length * 0.42, 0, 0.78, -0.35);
    this.box(glass, spec.width * 0.82, 0.22, spec.length * 0.34, 0, 0.86, -0.32);
    this.box(dark, spec.width * 0.7, 0.08, 0.12, 0, 0.42, spec.length * 0.46);
    this.box(lamp, 0.16, 0.08, 0.04, spec.width * 0.32, 0.5, spec.length * 0.46);
    this.box(lamp, 0.16, 0.08, 0.04, -spec.width * 0.32, 0.5, spec.length * 0.46);
    this.box(tail, 0.2, 0.08, 0.04, spec.width * 0.32, 0.5, -spec.length * 0.46);
    this.box(tail, 0.2, 0.08, 0.04, -spec.width * 0.32, 0.5, -spec.length * 0.46);
    this.axles(spec, dark, [spec.length * 0.3, -spec.length * 0.32]);
  }

  private hatch(
    spec: VehicleSpec,
    paint: THREE.Material,
    dark: THREE.Material,
    glass: THREE.Material,
    lamp: THREE.Material,
  ): void {
    this.box(paint, spec.width, 0.48, spec.length * 0.95, 0, 0.5, 0);
    this.box(paint, spec.width * 0.94, 0.48, spec.length * 0.48, 0, 0.92, -0.15);
    this.box(glass, spec.width * 0.84, 0.36, spec.length * 0.4, 0, 0.98, -0.12);
    this.box(lamp, 0.18, 0.1, 0.04, spec.width * 0.3, 0.52, spec.length * 0.47);
    this.box(lamp, 0.18, 0.1, 0.04, -spec.width * 0.3, 0.52, spec.length * 0.47);
    this.axles(spec, dark, [spec.length * 0.28, -spec.length * 0.3]);
  }

  private sport(
    spec: VehicleSpec,
    paint: THREE.Material,
    dark: THREE.Material,
    glass: THREE.Material,
    lamp: THREE.Material,
  ): void {
    this.box(paint, spec.width, 0.32, spec.length, 0, 0.4, 0);
    this.box(paint, spec.width * 0.78, 0.22, spec.length * 0.34, 0, 0.64, -0.25);
    this.box(glass, spec.width * 0.68, 0.16, spec.length * 0.28, 0, 0.7, -0.22);
    this.box(paint, spec.width * 0.9, 0.06, 0.28, 0, 0.7, -spec.length * 0.42);
    this.box(lamp, 0.22, 0.06, 0.04, spec.width * 0.34, 0.42, spec.length * 0.5);
    this.box(lamp, 0.22, 0.06, 0.04, -spec.width * 0.34, 0.42, spec.length * 0.5);
    this.axles(spec, dark, [spec.length * 0.32, -spec.length * 0.32]);
  }

  private coach(
    spec: VehicleSpec,
    paint: THREE.Material,
    dark: THREE.Material,
    glass: THREE.Material,
    lamp: THREE.Material,
  ): void {
    this.box(paint, spec.width, spec.height * 0.72, spec.length, 0, 1.55, 0);
    this.box(dark, spec.width * 0.96, 0.35, spec.length * 0.96, 0, 0.55, 0);
    this.box(glass, spec.width * 0.96, 0.42, spec.length * 0.86, 0, 2.15, 0.1);
    this.box(lamp, 0.2, 0.12, 0.05, spec.width * 0.32, 0.9, spec.length * 0.5);
    this.box(lamp, 0.2, 0.12, 0.05, -spec.width * 0.32, 0.9, spec.length * 0.5);
    this.axles(spec, dark, [spec.length * 0.34, -spec.length * 0.08, -spec.length * 0.34]);
  }

  private bike(
    spec: VehicleSpec,
    paint: THREE.Material,
    dark: THREE.Material,
    glass: THREE.Material,
    lamp: THREE.Material,
  ): void {
    this.box(dark, 0.12, 0.16, spec.length * 0.7, 0, 0.62, 0);
    this.box(paint, 0.28, 0.12, 0.55, 0, 0.78, -0.05);
    this.box(glass, 0.22, 0.16, 0.28, 0, 1.05, 0.05);
    this.box(dark, 0.16, 0.28, 0.16, 0, 0.95, -0.05);
    this.box(lamp, 0.08, 0.08, 0.06, 0, 0.72, spec.length * 0.36);
    this.axles(spec, dark, [spec.length * 0.32, -spec.length * 0.34], true);
  }

  private axles(spec: VehicleSpec, dark: THREE.Material, axles: number[], single = false): void {
    const radius = spec.id === "coach" ? 0.42 : spec.wheels === 2 ? 0.34 : 0.34;
    const geo = new THREE.CylinderGeometry(radius, radius, single ? 0.12 : 0.22, 16);
    const tracks = single ? [0] : [-spec.width * 0.56, spec.width * 0.56];
    for (const z of axles) {
      for (const x of tracks) {
        const spin = new THREE.Group();
        spin.position.set(x, radius, z);
        const mesh = new THREE.Mesh(geo, dark);
        mesh.rotation.z = Math.PI / 2;
        spin.add(mesh);
        this.root.add(spin);
        this.wheels.push({ spin, front: z > 0 });
      }
    }
  }

  private lamps(spec: VehicleSpec, lamp: THREE.Material): void {
    const tracks = spec.wheels === 2 ? [0] : [-spec.width * 0.32, spec.width * 0.32];
    for (const x of tracks) {
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), lamp);
      glow.position.set(x, spec.wheels === 2 ? 0.72 : spec.height * 0.45, spec.length * 0.5);
      this.root.add(glow);
      this.glows.push(glow);
      const spot = new THREE.SpotLight("#fff4d2", 0, 48, 0.38, 0.65, 2);
      spot.position.set(x, spec.height * 0.5, spec.length * 0.5);
      const target = new THREE.Object3D();
      target.position.set(x, spec.height * 0.35, spec.length * 3);
      this.root.add(spot, target);
      spot.target = target;
      this.spots.push(spot);
    }
  }

  private plate(spec: VehicleSpec): void {
    if (spec.wheels === 2) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.fillStyle = "#f4f1ea";
    context.fillRect(0, 0, 128, 64);
    context.fillStyle = "#20242b";
    context.font = "700 34px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("FAST", 64, 34);
    const map = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.2),
      new THREE.MeshBasicMaterial({ map }),
    );
    mesh.position.set(0, spec.id === "coach" ? 0.85 : spec.height * 0.32, spec.length * 0.51);
    this.root.add(mesh);
  }
}
