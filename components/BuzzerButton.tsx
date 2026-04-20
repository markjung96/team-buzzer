'use client';

interface BuzzerButtonProps {
  disabled: boolean;
  pressed: boolean;
  rank: number | null;
  team: 'red' | 'blue' | null;
}

export default function BuzzerButton({ disabled, pressed, rank, team }: BuzzerButtonProps) {
  const baseColor = team === 'red' ? 'bg-red-500' : team === 'blue' ? 'bg-blue-500' : 'bg-yellow-500';
  const glowColor = team === 'red' ? 'shadow-red-500/50' : team === 'blue' ? 'shadow-blue-500/50' : 'shadow-yellow-500/50';

  if (pressed && rank !== null) {
    return (
      <div className="flex flex-col items-center gap-4 animate-pop-in">
        <div className={`w-48 h-48 rounded-full ${baseColor} flex items-center justify-center shadow-2xl ${glowColor}`}>
          <span className="text-white text-6xl font-black">{rank}</span>
        </div>
        <p className="text-2xl font-bold text-white">
          {rank === 1 ? '1등!' : `${rank}등`}
        </p>
      </div>
    );
  }

  return (
    <button
      disabled={disabled}
      className={`w-56 h-56 rounded-full transition-all active:scale-95 ${
        disabled
          ? 'bg-slate-700 cursor-not-allowed'
          : `${baseColor} animate-pulse-buzzer shadow-2xl ${glowColor} cursor-pointer`
      }`}
    >
      <span className="text-white text-3xl font-black">
        {disabled ? '대기' : 'BUZZ!'}
      </span>
    </button>
  );
}
