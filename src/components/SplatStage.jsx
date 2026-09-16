import { useEffect, useRef, useState } from 'react';

// CONCEPT — the site as a 3D Gaussian splat, reconstructed from the same orbit frames.
// Where the orbit tab is a fixed ring of photographs, this one is a real 3D scene: the
// camera can leave the ring, tilt, and go in close.
//
// three and the splat renderer are imported inside the effect, so neither is downloaded
// until someone actually opens this tab.

const VIEWS = [
  { key: 'orbit', label: 'Orbit', azimuth: 0 },
  { key: 'north', label: 'North', azimuth: 0 },
  { key: 'east', label: 'East', azimuth: 90 },
  { key: 'south', label: 'South', azimuth: 180 },
  { key: 'west', label: 'West', azimuth: 270 },
];

export function SplatStage({ splat }) {
  const mount = useRef(null);
  const api = useRef({});
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(null);
  const [view, setView] = useState('orbit');

  useEffect(() => {
    let viewer;
    let alive = true;
    const el = mount.current;

    (async () => {
      const [{ Viewer }, THREE] = await Promise.all([import('@mkkellogg/gaussian-splats-3d'), import('three')]);
      if (!alive) return;

      const { center = [0, 0, 0], up = [0, -1, 0], camera = [0, -1, 3], radius = 4 } = splat.scene ?? {};

      viewer = new Viewer({
        rootElement: el,
        cameraUp: up,
        initialCameraPosition: camera,
        initialCameraLookAt: center,
        // Shared memory needs cross-origin isolation headers, which a plain static host
        // does not send; without this the workers fail on the deployed site.
        sharedMemoryForWorkers: false,
        dynamicScene: false,
        antialiased: true,
        halfPrecisionCovariancesOnGPU: true,
        useBuiltInControls: true,
        showLoadingUI: false,
      });

      // A reconstruction has no idea which way is up: its axes are wherever the solve put
      // them, and here "up" comes out tilted. So the preset views are built on a basis
      // made from the measured up vector rather than on world X/Y/Z.
      const target = new THREE.Vector3(...center);
      const U = new THREE.Vector3(...up).normalize();
      const ref = Math.abs(U.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const H = new THREE.Vector3().crossVectors(ref, U).normalize();
      const K = new THREE.Vector3().crossVectors(U, H).normalize();

      const place = (pos) => {
        const controls = viewer.controls;
        if (!controls) return;
        viewer.camera.position.copy(pos);
        controls.target.copy(target);
        controls.update();
      };

      api.current = {
        // Fly to a compass bearing on the ring the drone flew, keeping the plot centred.
        goTo(azimuth) {
          const a = (azimuth * Math.PI) / 180;
          const out = H.clone().multiplyScalar(Math.cos(a)).add(K.clone().multiplyScalar(Math.sin(a)));
          place(target.clone().add(out.multiplyScalar(radius * 0.85)).add(U.clone().multiplyScalar(radius * 0.45)));
        },
        top() {
          place(target.clone().add(U.clone().multiplyScalar(radius * 1.15)).add(H.clone().multiplyScalar(radius * 0.05)));
        },
      };

      try {
        // Phones get the lighter build: fewer splats, a third of the download, and far
        // less for a mobile GPU to sort every frame.
        const url = splat.light && Math.min(innerWidth, innerHeight) < 820 ? splat.light : splat.src;
        await viewer.addSplatScene(url, {
          progressiveLoad: true,
          showLoadingUI: false,
          onProgress: (percent) => alive && setProgress(Math.round(percent)),
        });
        if (!alive) return;
        viewer.start();
        if (import.meta.env.DEV) Reflect.set(window, '__splat', viewer);
        setReady(true);
      } catch (err) {
        if (alive) setFailed(err?.message ?? 'The splat could not be loaded');
      }
    })().catch((err) => alive && setFailed(err?.message ?? String(err)));

    return () => {
      alive = false;
      try {
        viewer?.dispose?.();
      } catch {
        /* the viewer throws if it never finished starting */
      }
    };
  }, [splat]);

  const pick = (v) => {
    setView(v.key);
    if (v.key === 'orbit') api.current.top?.();
    else api.current.goTo?.(v.azimuth);
  };

  return (
    <>
      <div ref={mount} className="absolute inset-0 touch-none [&_canvas]:block! [&_canvas]:h-full! [&_canvas]:w-full!" />

      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="label rounded-full bg-navy/70 px-4 py-2 text-paper backdrop-blur-sm">Building 3D scene · {progress}%</p>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 grid place-items-center px-6">
          <p className="label max-w-sm text-center text-paper/80">{failed}</p>
        </div>
      )}

      {ready && (
        <>
          {/* clear of the capture-date dots, which sit at bottom-20 on a phone */}
          <div className="absolute inset-x-0 bottom-32 z-20 flex justify-center px-4 md:bottom-10">
            <div className="flex gap-1 rounded-full bg-navy/50 p-1 ring-1 ring-paper/20 backdrop-blur-md">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => pick(v)}
                  className={`label rounded-full px-3 py-2 transition md:px-4 ${view === v.key ? 'bg-paper text-navy' : 'text-paper/75 hover:text-paper'}`}
                >
                  {v.key === 'orbit' ? 'Top' : v.label}
                </button>
              ))}
            </div>
          </div>
          <p className="label pointer-events-none absolute inset-x-0 bottom-8 text-center text-paper/60 [text-shadow:0_1px_8px_rgba(18,21,31,.85)] max-md:hidden">
            Drag to turn · scroll to zoom · right-drag to pan
          </p>
        </>
      )}
    </>
  );
}
