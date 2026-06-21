import type { WheelSegment } from "@/lib/types";

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, r, end);
  const [x2, y2] = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2} Z`;
}

export function WheelSvg({ segments, size }: { segments: WheelSegment[]; size: number }) {
  const K = segments.length;
  const seg = 360 / K;
  const c = size / 2;
  const r = c - 4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Prize wheel">
      <circle cx={c} cy={c} r={r + 3} fill="var(--surface)" />
      {segments.map((s, i) => {
        const center = i * seg;
        const start = center - seg / 2;
        const end = center + seg / 2;
        const [lx, ly] = polar(c, c, r * 0.62, center);
        return (
          <g key={s.id}>
            <path data-testid="wheel-segment" d={wedgePath(c, c, r, start, end)} fill={s.color} stroke="var(--bg)" strokeWidth={2} />
            <text
              x={lx} y={ly}
              fill="var(--text)" fontSize={size * 0.05} fontWeight={700}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${center} ${lx} ${ly})`}
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
