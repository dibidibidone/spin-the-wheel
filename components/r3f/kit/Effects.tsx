import { Component, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, SMAA } from "@react-three/postprocessing";

// The postprocessing EffectComposer reads the WebGL context attributes when it
// (re)initialises. If the GL context is lost — e.g. a GPU/driver hiccup during
// the heavy win celebration (coin storm) — `getContextAttributes()` returns null
// and the composer throws ("Cannot read properties of null (reading 'alpha')"),
// which would otherwise take down the whole <Canvas>. This boundary contains that
// throw: postprocessing simply drops out (no bloom) instead of crashing the page.
class ComposerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Effects({ chromatic = true }: { chromatic?: boolean }) {
  // ChromaticAberration's `offset` must be a THREE.Vector2 (an array throws at runtime).
  const caOffset = useMemo(() => new THREE.Vector2(0.0009, 0.0009), []);
  return (
    <ComposerBoundary>
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
        {chromatic ? <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} /> : <></>}
        <SMAA />
      </EffectComposer>
    </ComposerBoundary>
  );
}
