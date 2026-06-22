import { useMemo } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, SMAA } from "@react-three/postprocessing";

export function Effects({ chromatic = true }: { chromatic?: boolean }) {
  // ChromaticAberration's `offset` must be a THREE.Vector2 (an array throws at runtime).
  const caOffset = useMemo(() => new THREE.Vector2(0.0009, 0.0009), []);
  return (
    <EffectComposer>
      <Bloom intensity={1.2} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
      <Vignette eskil={false} offset={0.25} darkness={0.85} />
      {chromatic ? <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} /> : <></>}
      <SMAA />
    </EffectComposer>
  );
}
