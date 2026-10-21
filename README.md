# fast roads

An endless scenic drive that runs in the browser. The road, hills, and weather are generated on your machine from a numeric seed. Nothing is downloaded while you drive.

## Run

```bash
bun install
bun run dev
```

Open the local address Vite prints. `bun run build` writes a static site to `dist`.

## Drive

| Key               | Action                                                 |
| ----------------- | ------------------------------------------------------ |
| W A S D or arrows | Accelerate, brake or reverse, steer                    |
| Shift             | Boost while accelerating                               |
| Space             | Handbrake. The bike ignores it                         |
| F                 | Toggle autodrive. Steer or throttle takes the car back |
| C                 | Near camera, far camera, cockpit                       |
| Q E               | Previous and next weather. Seasons roll over           |
| H or L            | Headlights: auto, on, off                              |
| R                 | Put the car back on the road                           |
| U                 | Hide the interface                                     |
| M                 | Mute                                                   |
| P or Esc          | Pause                                                  |
| Scroll            | Change cruise speed while cruise is armed              |
| 1 to 5            | Coupe, hatch, sport, coach, bike                       |
| []                | Shift gears when the transmission is manual            |
| `                 | Free camera. G returns to the car                      |

Cruise is the lock in the driving HUD. Mouse mode steers from the cursor and uses the left and right buttons for throttle and brake. A gamepad uses the left stick, the triggers, and the face buttons.

The splash screen is already driving itself. Begin only hands you the controls.

## Quality

Low, medium, and high change how far the detailed corridor reaches and how sharp the picture is. The far hills stay a coarse ring so the horizon does not require a second world.

## Development

```bash
bun run ci
```

That formats nothing. It checks Biome, rejects comments in the source, typechecks, runs the tests, and builds.

## License

MIT. See [LICENSE](LICENSE).
