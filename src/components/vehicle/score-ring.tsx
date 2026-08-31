'use client';

import type { computeScore } from '@/lib/maintenance';

export function ScoreRing({
  score,
  tone,
  size = 140,
}: {
  score: number;
  tone: 'green' | 'amber' | 'red';
  size?: number;
}) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    tone === 'green' ? '#22c55e' : tone === 'amber' ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs font-medium text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

export function ScoreCard({ score }: { score: ReturnType<typeof computeScore> }) {
  const msg =
    score.tone === 'green'
      ? 'Seu veículo está bem cuidado. Está tudo em dia.'
      : score.tone === 'amber'
      ? 'Seu veículo está cuidado. Há itens que merecem atenção.'
      : 'Seu veículo precisa de manutenção. Verifique os itens atrasados.';
  return (
    <div className="card flex flex-col items-center gap-3 p-5 text-center">
      <h3 className="w-full text-left font-bold">AutoCiclo Score</h3>
      <ScoreRing score={score.score} tone={score.tone} />
      <p className="text-sm text-muted-foreground">{msg}</p>
      <p className="text-xs text-muted-foreground">
        Representa o acompanhamento das manutenções registradas — não é um diagnóstico mecânico.
      </p>
    </div>
  );
}
