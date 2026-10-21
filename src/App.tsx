import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Session } from "./game/session";
import { loadSettings } from "./game/storage";
import { View } from "./render/view";
import { Hud } from "./ui/Hud";

export const App = () => {
  const [session] = useState(() => new Session(loadSettings()));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState("");
  const hud = useSyncExternalStore(session.subscribe, session.getHud, session.getHud);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let view: View | null = null;
    try {
      view = new View(canvas, session);
    } catch (error) {
      setFailed(error instanceof Error ? error.message : "WebGL failed");
    }
    return () => {
      view?.dispose();
    };
  }, [session]);
  return (
    <main className="world">
      <canvas ref={canvasRef} aria-label="driving view" />
      {failed ? <p className="fail">{failed}</p> : <Hud session={session} hud={hud} />}
    </main>
  );
};
