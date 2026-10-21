# Architecture

The simulation does not import the renderer. Tests drive the road and the car without WebGL.

## World

`fbm` is value noise stacked over five octaves. A `Road` walks forward in fixed steps, scoring heading changes by grade, curvature, water, and whether the new point would cross the recent path. Heights are clamped so the grade stays drivable, then the step is filled with samples a couple of metres apart.

Terrain beside the road is the same noise. Within a shoulder of the centerline it blends to the road height, so the pavement sits in the landscape instead of floating on it. Chunks behind the car are dropped. Chunks ahead are built a few at a time. A coarse ring follows the camera for the horizon.

The same seed, scene, and road style rebuild the same path.

## Car

Each vehicle is a small set of accelerations, a wheelbase, grip, and a shape. The step integrates throttle, brake, drag, grade, and yaw. Drag is chosen so flat-road top speed matches the vehicle. Off the pavement, grip falls and drag rises. Autodrive looks ahead on the centerline and aims for a comfortable speed, or for the cruise target when one is set.

The picture is a Three.js scene: one Lambert material for the road, one for the ground, instanced plants, a sky shader, and a pooled precipitation field parented near the camera. The React layer reads a snapshot about ten times a second. It does not run the physics.

## Persistence

Settings, lifetime distance, and top speed live in `localStorage` under `fastroads.settings`.
