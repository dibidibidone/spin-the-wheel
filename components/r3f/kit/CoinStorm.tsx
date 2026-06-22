import { Component, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function Coins({ count, color }: { count: number; color: string }) {
  // A fountain from the wheel hub: coins erupt radially outward + up + toward the
  // camera, arc within the frame, then fall and settle on a floor just below the
  // visible wheel so the pile-up reads on-screen.
  const coins = useMemo(
    () => Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 0.7;
      return {
        pos: [Math.cos(a) * r, 0.2 + Math.random() * 0.6, 0.9 + Math.random() * 0.7] as [number, number, number],
        vel: [Math.cos(a) * (2 + Math.random() * 3), 4 + Math.random() * 4, 0.5 + Math.random() * 1.6] as [number, number, number],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
        spin: [Math.random() * 6, 8, 4] as [number, number, number],
      };
    }),
    [count]
  );

  // One geometry + one material shared across every coin: mounting the storm used to
  // allocate a fresh geometry/material per body (up to 120×), a synchronous burst that
  // hitched the frame at the win. Sharing them removes that cost.
  const geom = useMemo(() => new THREE.CylinderGeometry(0.19, 0.19, 0.05, 22), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.22, emissive: new THREE.Color("#7a5200"), emissiveIntensity: 0.9 }),
    [color]
  );
  useEffect(() => () => { geom.dispose(); mat.dispose(); }, [geom, mat]);

  return (
    <>
      {coins.map((c, i) => (
        // cuboid collider (cheap AABB) instead of "hull" — no per-coin convex-hull build.
        <RigidBody key={i} position={c.pos} rotation={c.rot} linearVelocity={c.vel} angularVelocity={c.spin} colliders="cuboid" restitution={0.45} friction={0.6}>
          <mesh geometry={geom} material={mat} />
        </RigidBody>
      ))}
    </>
  );
}

// `active` mounts the physics world up-front (paused) so Rapier's WASM engine initializes
// during scene load instead of at the win — the coins only spawn (and the world unpauses)
// when active flips true, so the win no longer pays the engine-init cost.
export function CoinStorm({ active = true, count = 120, color = "#FFD56A" }: { active?: boolean; count?: number; color?: string }) {
  return (
    <Boundary>
      <Physics gravity={[0, -24, 0]} paused={!active}>
        {/* floor just below the visible wheel bottom so coins pile up on-screen */}
        <CuboidCollider args={[14, 0.5, 6]} position={[0, -2.7, 0]} />
        {active && <Coins count={count} color={color} />}
      </Physics>
    </Boundary>
  );
}
