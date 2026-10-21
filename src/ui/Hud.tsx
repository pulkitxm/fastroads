import { type PointerEvent, useEffect, useState } from "react";
import { COLORS, SCENE_ORDER, STYLE_ORDER, VEHICLE_ORDER } from "../game/catalog";
import {
  formatCruise,
  formatDistance,
  formatSpeed,
  type HudState,
  type Session,
} from "../game/session";
import type { InputMode, Quality, RoadStyle, SceneId, VehicleId } from "../game/types";

const hold = (session: Session, code: string) => ({
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    session.press(code);
  },
  onPointerUp: () => session.release(code),
  onPointerCancel: () => session.release(code),
});

export const Hud = ({ session, hud }: { session: Session; hud: HudState }) => {
  const [seedText, setSeedText] = useState(String(hud.seed));
  useEffect(() => {
    setSeedText(String(hud.seed));
  }, [hud.seed]);
  const hidden = !hud.ui;
  return (
    <div className={hidden ? "overlay overlay-hidden" : "overlay"}>
      <div className="vignette" />
      <header className="top">
        <p className="mark">fast roads</p>
        <p className="where">
          {hud.sceneLabel}
          <span>{hud.weather}</span>
        </p>
      </header>
      {hud.phase === "attract" ? (
        <Splash
          hud={hud}
          seedText={seedText}
          onSeed={(value) => setSeedText(value)}
          onApplySeed={() => session.setSeed(Number(seedText))}
          session={session}
        />
      ) : null}
      {hud.phase === "drive" ? <Meter hud={hud} session={session} /> : null}
      {hud.phase === "pause" ? <Pause hud={hud} session={session} /> : null}
      <div className="touch">
        <div className="pad left-pad">
          <button type="button" aria-label="steer left" {...hold(session, "KeyA")}>
            ◀
          </button>
          <button type="button" aria-label="steer right" {...hold(session, "KeyD")}>
            ▶
          </button>
        </div>
        <div className="pad right-pad">
          <button type="button" className="go" aria-label="accelerate" {...hold(session, "KeyW")}>
            ▲
          </button>
          <button type="button" aria-label="brake" {...hold(session, "KeyS")}>
            ▼
          </button>
        </div>
        <div className="corner-actions">
          <button type="button" onClick={() => session.onKey("KeyC", false)}>
            cam
          </button>
          <button type="button" onClick={() => session.onKey("KeyF", false)}>
            auto
          </button>
          <button type="button" onClick={() => session.onKey("KeyU", false)}>
            ui
          </button>
        </div>
      </div>
      {hidden ? (
        <button type="button" className="reveal" onClick={() => session.onKey("KeyU", false)}>
          show
        </button>
      ) : null}
    </div>
  );
};

const Splash = ({
  hud,
  session,
  seedText,
  onSeed,
  onApplySeed,
}: {
  hud: HudState;
  session: Session;
  seedText: string;
  onSeed: (value: string) => void;
  onApplySeed: () => void;
}) => (
  <section className="splash">
    <p className="lede">An endless road. No finish, no score that matters.</p>
    <Choice
      label="place"
      value={hud.scene}
      options={SCENE_ORDER.map((id) => ({ id, label: labelScene(id) }))}
      onChange={(id) => session.setScene(id)}
    />
    <Choice
      label="road"
      value={hud.style}
      options={STYLE_ORDER.map((id) => ({ id, label: labelStyle(id) }))}
      onChange={(id) => session.setStyle(id)}
    />
    <div className="vehicles">
      {VEHICLE_ORDER.map((id, index) => (
        <button
          key={id}
          type="button"
          className={hud.vehicle === id ? "chip on" : "chip"}
          onClick={() => session.setVehicle(id)}
        >
          <span>{index + 1}</span>
          {labelVehicle(id)}
        </button>
      ))}
    </div>
    <p className="blurb">{hud.blurb}</p>
    <div className="colors">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={hud.color === color ? "swatch on" : "swatch"}
          style={{ background: color }}
          aria-label={color}
          onClick={() => session.setColor(color)}
        />
      ))}
    </div>
    <label className="seed">
      seed
      <input
        value={seedText}
        inputMode="numeric"
        onChange={(event) => onSeed(event.target.value)}
        onBlur={onApplySeed}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onApplySeed();
          }
        }}
      />
      <button type="button" onClick={() => session.randomSeed()}>
        random
      </button>
    </label>
    <div className="modes">
      {(["keyboard", "mouse", "autodrive"] as InputMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={hud.input === mode ? "chip on" : "chip"}
          onClick={() => session.setInput(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
    <button type="button" className="begin" onClick={() => session.begin()}>
      begin
    </button>
    <ul className="hints">
      <li>wasd drive</li>
      <li>shift boost</li>
      <li>space handbrake</li>
      <li>c camera</li>
      <li>f autodrive</li>
      <li>q e weather</li>
      <li>h lights</li>
      <li>r reset</li>
      <li>u hide</li>
      <li>esc pause</li>
    </ul>
  </section>
);

const Meter = ({ hud, session }: { hud: HudState; session: Session }) => (
  <section className="meter">
    <div className="speed">
      <b>{formatSpeed(hud.speed, hud.units)}</b>
      <span>{hud.units === "mph" ? "mph" : "km/h"}</span>
      <em>{hud.gear}</em>
    </div>
    <p className="trip">{formatDistance(hud.trip, hud.units)}</p>
    <div className="tools">
      <button
        type="button"
        className={hud.cruise === null ? "tool" : "tool on"}
        onClick={() => session.toggleCruise()}
      >
        {hud.cruise === null ? "cruise" : formatCruise(hud.cruise, hud.units)}
      </button>
      {hud.cruise !== null ? (
        <>
          <button type="button" className="tool" onClick={() => session.nudgeCruise(1)}>
            +
          </button>
          <button type="button" className="tool" onClick={() => session.nudgeCruise(-1)}>
            -
          </button>
        </>
      ) : null}
      <button type="button" className="tool" onClick={() => session.cycleCamera()}>
        {hud.camera}
      </button>
      <button
        type="button"
        className={hud.autodrive ? "tool on" : "tool"}
        onClick={() => session.onKey("KeyF", false)}
      >
        {hud.autodrive ? "auto" : "steer"}
      </button>
      <button
        type="button"
        className={hud.lightsLit ? "tool on" : "tool"}
        onClick={() => session.cycleLights()}
      >
        {hud.lights === "on" ? "lamps on" : hud.lights === "off" ? "lamps off" : "lamps"}
      </button>
    </div>
    {hud.freeCam ? <p className="note">free camera, g returns, ` exits</p> : null}
  </section>
);

const Pause = ({ hud, session }: { hud: HudState; session: Session }) => (
  <section className="pause">
    <h2>paused</h2>
    <p>
      trip {formatDistance(hud.trip, hud.units)} · total {formatDistance(hud.total, hud.units)} ·
      top {formatSpeed(hud.top, hud.units)} {hud.units === "mph" ? "mph" : "km/h"}
    </p>
    <div className="grid">
      <Toggle
        label="units"
        value={hud.units}
        onClick={() => session.setUnits(hud.units === "mph" ? "kmh" : "mph")}
      />
      <Toggle
        label="quality"
        value={hud.quality}
        onClick={() => session.setQuality(nextQuality(hud.quality))}
      />
      <Toggle
        label="assist"
        value={hud.steerAssist ? "on" : "off"}
        onClick={() => session.toggleAssist()}
      />
      <Toggle
        label="double tap"
        value={hud.doubleTap ? "on" : "off"}
        onClick={() => session.toggleDoubleTap()}
      />
      <Toggle label="gears" value={hud.transmission} onClick={() => session.toggleTransmission()} />
      <Toggle label="sound" value={hud.muted ? "off" : "on"} onClick={() => session.toggleMute()} />
    </div>
    <label className="volume">
      volume
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={hud.volume}
        onChange={(event) => session.setVolume(Number(event.target.value))}
      />
    </label>
    <p className="fine">
      {hud.vehicleLabel}, {hud.power}, {hud.drive}. Bracket keys shift gears in manual.
    </p>
    <button type="button" className="begin" onClick={() => session.togglePause()}>
      resume
    </button>
  </section>
);

const Choice = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) => (
  <div className="choice">
    <span>{label}</span>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        className={option.id === value ? "chip on" : "chip"}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const Toggle = ({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) => (
  <button type="button" className="toggle" onClick={onClick}>
    <span>{label}</span>
    <b>{value}</b>
  </button>
);

const nextQuality = (quality: Quality): Quality =>
  quality === "low" ? "medium" : quality === "medium" ? "high" : "low";

const labelScene = (id: SceneId): string =>
  id === "ridges"
    ? "ridges"
    : id === "shore"
      ? "shore"
      : id === "timber"
        ? "timber"
        : id === "dunes"
          ? "dunes"
          : "offworld";

const labelStyle = (id: RoadStyle): string => id;

const labelVehicle = (id: VehicleId): string =>
  id === "coupe"
    ? "coupe"
    : id === "hatch"
      ? "hatch"
      : id === "sport"
        ? "sport"
        : id === "coach"
          ? "coach"
          : "bike";
