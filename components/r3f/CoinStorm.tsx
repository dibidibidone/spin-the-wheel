import { Component, useMemo, type ReactNode } from "react";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function Coins({ count }: { count: number }) {
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
  return (
    <Physics gravity={[0, -24, 0]}>
      {/* floor just below the visible wheel bottom so coins pile up on-screen */}
      <CuboidCollider args={[14, 0.5, 6]} position={[0, -2.7, 0]} />
      {coins.map((c, i) => (
        <RigidBody key={i} position={c.pos} rotation={c.rot} linearVelocity={c.vel} angularVelocity={c.spin} colliders="hull" restitution={0.45} friction={0.6}>
          <mesh>
            <cylinderGeometry args={[0.19, 0.19, 0.05, 22]} />
            <meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.22} emissive="#7a5200" emissiveIntensity={0.9} />
          </mesh>
        </RigidBody>
      ))}
    </Physics>
  );
}

export function CoinStorm({ count = 120 }: { count?: number }) {
  return (
    <Boundary>
      <Coins count={count} />
    </Boundary>
  );
}
