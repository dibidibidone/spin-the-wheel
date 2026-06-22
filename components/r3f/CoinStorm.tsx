import { Component, useMemo, type ReactNode } from "react";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function Coins({ count }: { count: number }) {
  const coins = useMemo(
    () => Array.from({ length: count }, () => ({
      pos: [(Math.random() - 0.5) * 1.2, 0.5 + Math.random(), 0.6 + Math.random()] as [number, number, number],
      vel: [(Math.random() - 0.5) * 6, 6 + Math.random() * 5, (Math.random() - 0.5) * 3] as [number, number, number],
      rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
    })),
    [count]
  );
  return (
    <Physics gravity={[0, -16, 0]}>
      <CuboidCollider args={[12, 0.5, 12]} position={[0, -4, 0]} />
      {coins.map((c, i) => (
        <RigidBody key={i} position={c.pos} rotation={c.rot} linearVelocity={c.vel} angularVelocity={[0, 8, 4]} colliders="hull" restitution={0.4}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
            <meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.25} emissive="#5a3d00" emissiveIntensity={0.8} />
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
