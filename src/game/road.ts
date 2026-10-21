import type { SceneSpec, StyleSpec } from "./catalog";
import { clamp, wrapAngle } from "./math";
import { fbm } from "./noise";
import type { Sample } from "./types";

const STEP = 12;
const DENSE = 2;

export class Road {
  readonly samples: Sample[] = [];
  private readonly history: { x: number; z: number; s: number }[] = [];
  private heading = 0.35;
  private x = 0;
  private y = 0;
  private z = 0;
  private step = 0;
  private cursor = 0;

  constructor(
    private readonly seed: number,
    private readonly style: StyleSpec,
    private readonly scene: SceneSpec,
  ) {
    this.y = this.ground(0, 0);
    this.add(0, this.y, 0, this.heading, 0);
    this.extendTo(48);
  }

  extendTo(target: number): void {
    let guard = 0;
    while ((this.samples.at(-1)?.s ?? 0) < target && guard < 900) {
      this.grow();
      guard += 1;
    }
  }

  trimBefore(minS: number): void {
    let drop = 0;
    while (drop < this.samples.length && (this.samples[drop]?.s ?? 0) < minS) {
      drop += 1;
    }
    if (drop > 0) {
      this.samples.splice(0, drop);
      this.cursor = Math.max(0, this.cursor - drop);
    }
    let historyDrop = 0;
    while (historyDrop < this.history.length && (this.history[historyDrop]?.s ?? 0) < minS) {
      historyDrop += 1;
    }
    if (historyDrop > 0) {
      this.history.splice(0, historyDrop);
    }
  }

  at(distance: number): Sample {
    const rows = this.samples;
    const first = rows[0];
    const last = rows.at(-1);
    if (!first || !last) {
      return this.fallback();
    }
    if (distance <= first.s) {
      return first;
    }
    if (distance >= last.s) {
      return last;
    }
    let low = 0;
    let high = rows.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      const sample = rows[mid];
      if (!sample || sample.s < distance) {
        low = mid;
      } else {
        high = mid;
      }
    }
    const a = rows[low];
    const b = rows[high];
    if (!a || !b) {
      return first;
    }
    const span = b.s - a.s;
    const t = span <= 0.0001 ? 0 : (distance - a.s) / span;
    return {
      s: distance,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      heading: a.heading + wrapAngle(b.heading - a.heading) * t,
      width: a.width + (b.width - a.width) * t,
      bank: a.bank + (b.bank - a.bank) * t,
      grip: a.grip,
      paved: a.paved,
    };
  }

  nearest(x: number, z: number): Sample {
    const rows = this.samples;
    const first = rows[0];
    if (!first) {
      return this.fallback();
    }
    const index = Math.min(this.cursor, rows.length - 1);
    let best = index;
    let bestDist = Number.POSITIVE_INFINITY;
    const scan = (from: number, to: number) => {
      for (let i = from; i <= to; i += 1) {
        const sample = rows[i];
        if (!sample) {
          continue;
        }
        const dx = sample.x - x;
        const dz = sample.z - z;
        const dist = dx * dx + dz * dz;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
    };
    scan(Math.max(0, index - 40), Math.min(rows.length - 1, index + 80));
    if (bestDist > 70 * 70) {
      scan(0, rows.length - 1);
    }
    this.cursor = best;
    return rows[best] ?? first;
  }

  private grow(): void {
    const wander = (fbm(this.step * 0.08, 0.15, this.seed + 17) - 0) * this.style.wander;
    const deltas = [
      -this.style.turn,
      -this.style.turn * 0.62,
      -this.style.turn * 0.28,
      0,
      this.style.turn * 0.28,
      this.style.turn * 0.62,
      this.style.turn,
    ];
    let bestCost = Number.POSITIVE_INFINITY;
    let best = 0;
    for (const delta of deltas) {
      const heading = this.heading + delta;
      const x = this.x + Math.sin(heading) * STEP;
      const z = this.z + Math.cos(heading) * STEP;
      let y = this.ground(x, z);
      const maxDy = STEP * this.style.maxGrade;
      y = clamp(y, this.y - maxDy, this.y + maxDy);
      const grade = (y - this.y) / STEP;
      let cost =
        grade * grade * this.style.gradeWeight +
        delta * delta * this.style.turnWeight +
        (delta - wander) * (delta - wander) * 0.2;
      if (this.scene.water !== null && y < this.scene.water + 2.2) {
        cost += 50;
      }
      if (this.conflicts(x, z, (this.samples.at(-1)?.s ?? 0) + STEP)) {
        cost += 90;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = delta;
      }
    }
    const heading = this.heading + best;
    const x = this.x + Math.sin(heading) * STEP;
    const z = this.z + Math.cos(heading) * STEP;
    let y = this.ground(x, z);
    const maxDy = STEP * this.style.maxGrade;
    y = clamp(y, this.y - maxDy, this.y + maxDy);
    y = this.y * 0.42 + y * 0.58;
    const bank = clamp(-best * 1.5, -0.2, 0.2);
    this.add(x, y, z, heading, bank);
    this.heading = heading;
    this.x = x;
    this.y = y;
    this.z = z;
    this.step += 1;
  }

  private conflicts(x: number, z: number, s: number): boolean {
    const limit = this.style.width + 24;
    const limit2 = limit * limit;
    for (let i = this.history.length - 1; i >= 0; i -= 1) {
      const item = this.history[i];
      if (!item) {
        continue;
      }
      const gap = s - item.s;
      if (gap < 110) {
        continue;
      }
      if (gap > 3200) {
        break;
      }
      const dx = item.x - x;
      const dz = item.z - z;
      if (dx * dx + dz * dz < limit2) {
        return true;
      }
    }
    return false;
  }

  private add(x: number, y: number, z: number, heading: number, bank: number): void {
    const previous = this.samples.at(-1);
    if (!previous) {
      this.samples.push(this.make(0, x, y, z, heading, bank));
      this.history.push({ x, z, s: 0 });
      return;
    }
    const distance = Math.hypot(x - previous.x, z - previous.z);
    const nextS = previous.s + distance;
    const pieces = Math.max(1, Math.round(distance / DENSE));
    for (let i = 1; i <= pieces; i += 1) {
      const t = i / pieces;
      this.samples.push(
        this.make(
          previous.s + (nextS - previous.s) * t,
          previous.x + (x - previous.x) * t,
          previous.y + (y - previous.y) * t,
          previous.z + (z - previous.z) * t,
          previous.heading + wrapAngle(heading - previous.heading) * t,
          previous.bank + (bank - previous.bank) * t,
        ),
      );
    }
    this.history.push({ x, z, s: nextS });
  }

  private make(s: number, x: number, y: number, z: number, heading: number, bank: number): Sample {
    const jitter = fbm(s * 0.012, 1.7, this.seed + 3) * this.style.widthJitter;
    return {
      s,
      x,
      y,
      z,
      heading,
      width: Math.max(3.4, this.style.width + jitter),
      bank,
      grip: this.style.grip,
      paved: this.style.paved,
    };
  }

  private ground(x: number, z: number): number {
    return (
      this.scene.base + fbm(x * this.scene.freq, z * this.scene.freq, this.seed) * this.scene.amp
    );
  }

  private fallback(): Sample {
    return {
      s: 0,
      x: 0,
      y: 0,
      z: 0,
      heading: 0,
      width: 7,
      bank: 0,
      grip: 1,
      paved: true,
    };
  }
}
