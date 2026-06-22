import { Howl, Howler } from "howler";
import type { SoundConfig, SoundInstance } from "./types";

function wavDataUri(freqs: number[], ms: number, gain = 0.25): string {
  const rate = 44100;
  const n = Math.floor((rate * ms) / 1000);
  const bytes = 44 + n * 2;
  const buf = new ArrayBuffer(bytes);
  const v = new DataView(buf);
  const wr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, "RIFF"); v.setUint32(4, bytes - 8, true); wr(8, "WAVE"); wr(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); wr(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t);
    s = (s / freqs.length) * gain * Math.exp(-3 * (i / n));
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  let bin = "";
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

export function createSound(config: SoundConfig): SoundInstance {
  const tick = new Howl({ src: [wavDataUri(config.tick.freqs, config.tick.ms, config.tick.gain)], format: ["wav"] });
  const win = new Howl({ src: [wavDataUri(config.win.freqs, config.win.ms, config.win.gain)], format: ["wav"] });
  Howler.mute(true);
  let muted = true;
  return {
    tick() { if (!muted) tick.play(); },
    win() { if (!muted) win.play(); },
    setMuted(m: boolean) { muted = m; Howler.mute(m); },
    muted() { return muted; },
  };
}
