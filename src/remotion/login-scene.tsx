import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// Декоративная сцена для экрана входа: тёплые дрейфующие световые шары
// и медленно всплывающие mono-глифы в духе терминала Claude Code.
// Всё движение периодично на длине цикла — петля бесшовная.

const TWO_PI = Math.PI * 2;

type OrbProps = {
  color: string;
  size: number;
  baseX: number;
  baseY: number;
  ax: number;
  ay: number;
  kx: number;
  ky: number;
  phase: number;
  opacity: number;
};

function Orb({ color, size, baseX, baseY, ax, ay, kx, ky, phase, opacity }: OrbProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // t пробегает ровно 0..2π за цикл — в конце возвращается в старт
  const t = (frame / durationInFrames) * TWO_PI;
  const x = baseX + ax * Math.sin(kx * t + phase);
  const y = baseY + ay * Math.cos(ky * t + phase);
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(48px)',
        opacity,
      }}
    />
  );
}

const GLYPHS = ['❯', '$', '{ }', 'claude', '▌', '</>', 'agent', '~/', 'npm run', '⌘', '◇', '·'];

function Glyph({ i, total }: { i: number; total: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // детерминированный псевдослучай, чтобы раскладка не прыгала между кадрами
  const seed = ((i * 9301 + 49297) % 233280) / 233280;
  const seed2 = ((i * 4021 + 7919) % 104729) / 104729;
  const x = ((i + 0.5) / total) * 100 + (seed - 0.5) * 6;
  const size = 18 + Math.round(seed2 * 26);
  const range = 130; // проходит сверху донизу за цикл (в %)
  // равномерный подъём ровно на range за цикл → бесшовно
  const travelled = (seed * range + (frame / durationInFrames) * range) % range;
  const top = 115 - travelled; // снизу (115%) вверх (-15%)
  // плавное появление/исчезание у краёв
  const edge = Math.min(top + 15, 115 - top);
  const opacity = interpolate(edge, [0, 25], [0, 0.12 + seed2 * 0.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: size,
        fontWeight: 500,
        color: 'oklch(0.5 0.12 42)',
        opacity,
        whiteSpace: 'nowrap',
      }}
    >
      {GLYPHS[i % GLYPHS.length]}
    </div>
  );
}

export function LoginScene() {
  const glyphCount = 14;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Orb color="oklch(0.7 0.14 42)" size={760} baseX={22} baseY={26} ax={6} ay={5} kx={1} ky={1} phase={0} opacity={0.55} />
      <Orb color="oklch(0.8 0.11 82)" size={680} baseX={82} baseY={20} ax={5} ay={6} kx={1} ky={1} phase={2.1} opacity={0.42} />
      <Orb color="oklch(0.72 0.1 28)" size={620} baseX={70} baseY={86} ax={7} ay={5} kx={1} ky={1} phase={4.0} opacity={0.4} />
      <Orb color="oklch(0.78 0.09 70)" size={520} baseX={14} baseY={82} ax={5} ay={6} kx={1} ky={1} phase={1.0} opacity={0.32} />
      {Array.from({ length: glyphCount }, (_, i) => (
        <Glyph key={i} i={i} total={glyphCount} />
      ))}
    </AbsoluteFill>
  );
}
