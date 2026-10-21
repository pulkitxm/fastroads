import * as THREE from "three";

const paint = (geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry => {
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
};

const join = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  let count = 0;
  for (const part of parts) {
    count += part.getAttribute("position").count;
  }
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  let offset = 0;
  for (const part of parts) {
    const position = part.getAttribute("position");
    const normal = part.getAttribute("normal");
    const color = part.getAttribute("color");
    const uv = part.getAttribute("uv");
    for (let index = 0; index < position.count; index += 1) {
      const target = offset + index;
      positions[target * 3] = position.getX(index);
      positions[target * 3 + 1] = position.getY(index);
      positions[target * 3 + 2] = position.getZ(index);
      normals[target * 3] = normal.getX(index);
      normals[target * 3 + 1] = normal.getY(index);
      normals[target * 3 + 2] = normal.getZ(index);
      colors[target * 3] = color.getX(index);
      colors[target * 3 + 1] = color.getY(index);
      colors[target * 3 + 2] = color.getZ(index);
      uvs[target * 2] = uv?.getX(index) ?? 0;
      uvs[target * 2 + 1] = uv?.getY(index) ?? 0;
    }
    offset += position.count;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geometry;
};

export const pineGeometry = (): THREE.BufferGeometry => {
  const trunk = paint(new THREE.CylinderGeometry(0.16, 0.28, 2.2, 7), new THREE.Color("#5c4030"));
  trunk.translate(0, 1.1, 0);
  const cones = [2.4, 1.7, 1.15].map((radius, layer) => {
    const cone = paint(
      new THREE.ConeGeometry(radius, 2.1 - layer * 0.25, 8),
      new THREE.Color(layer === 0 ? "#2f6a34" : layer === 1 ? "#3d7c40" : "#4e8f4b"),
    );
    cone.translate(0, 2.5 + layer * 1.15, 0);
    return cone;
  });
  return join([trunk, ...cones]);
};

export const broadleafGeometry = (): THREE.BufferGeometry => {
  const trunk = paint(new THREE.CylinderGeometry(0.18, 0.32, 2.4, 7), new THREE.Color("#6a4632"));
  trunk.translate(0, 1.2, 0);
  const crowns = [
    [0, 3.1, 0, 1.35],
    [0.7, 3.6, 0.2, 0.9],
    [-0.6, 3.45, -0.3, 0.85],
  ].map(([x, y, z, scale]) => {
    const crown = paint(new THREE.IcosahedronGeometry(1, 1), new THREE.Color("#3f8a3c"));
    crown.scale(scale ?? 1, (scale ?? 1) * 0.8, scale ?? 1);
    crown.translate(x ?? 0, y ?? 0, z ?? 0);
    return crown;
  });
  return join([trunk, ...crowns]);
};

export const palmGeometry = (): THREE.BufferGeometry => {
  const trunk = paint(new THREE.CylinderGeometry(0.1, 0.18, 3.4, 6), new THREE.Color("#8a6844"));
  trunk.translate(0, 1.7, 0);
  const fronds = [0, 1.2, 2.4, 3.6, 4.8].map((turn) => {
    const frond = paint(new THREE.ConeGeometry(0.28, 1.8, 4), new THREE.Color("#2f8f4a"));
    frond.translate(0.7, 0, 0);
    frond.rotateZ(-1.05);
    frond.rotateY(turn);
    frond.translate(0, 3.35, 0);
    return frond;
  });
  return join([trunk, ...fronds]);
};

export const crystalGeometry = (): THREE.BufferGeometry => {
  const shard = paint(new THREE.OctahedronGeometry(0.85, 0), new THREE.Color("#c9a6e8"));
  shard.scale(0.7, 1.8, 0.7);
  shard.translate(0, 1.4, 0);
  const small = paint(new THREE.OctahedronGeometry(0.4, 0), new THREE.Color("#8fd0d8"));
  small.scale(0.6, 1.5, 0.6);
  small.translate(0.7, 0.7, 0.2);
  return join([shard, small]);
};

export const rockGeometry = (): THREE.BufferGeometry => {
  const rock = paint(new THREE.DodecahedronGeometry(0.7, 0), new THREE.Color("#8d8478"));
  rock.scale(1.2, 0.72, 1);
  rock.translate(0, 0.35, 0);
  return rock;
};

export const grassGeometry = (): THREE.BufferGeometry => {
  const left = new THREE.PlaneGeometry(0.85, 1.15, 1, 4);
  left.translate(0, 0.57, 0);
  const right = left.clone();
  right.rotateY(Math.PI / 2.6);
  const geometry = join([
    paint(left, new THREE.Color("#ffffff")),
    paint(right, new THREE.Color("#ffffff")),
  ]);
  return geometry;
};
