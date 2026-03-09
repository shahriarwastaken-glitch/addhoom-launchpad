type DNAScoreIndicatorProps = {
  score: number;
  size?: 'sm' | 'lg';
  showTooltip?: boolean;
  missingItems?: string[];
};

const DNAScoreIndicator = ({ score, size = 'sm', showTooltip = false, missingItems = [] }: DNAScoreIndicatorProps) => {
  const radius = size === 'lg' ? 50 : 28;
  const stroke = size === 'lg' ? 8 : 5;
  const svgSize = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'hsl(var(--brand-green))' : score >= 40 ? 'hsl(var(--brand-yellow))' : 'hsl(var(--destructive))';

  return (
    <div className="relative inline-flex flex-col items-center group">
      <svg width={svgSize} height={svgSize}>
        <circle
          cx={radius + stroke} cy={radius + stroke} r={radius}
          fill="none" stroke="hsl(var(--border))" strokeWidth={stroke}
        />
        <circle
          cx={radius + stroke} cy={radius + stroke} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text
          x={radius + stroke} y={radius + stroke}
          textAnchor="middle" dominantBaseline="central"
          className="font-mono font-bold"
          fontSize={size === 'lg' ? 20 : 12}
          fill="currentColor"
        >
          {score}
        </text>
      </svg>
      {size === 'sm' && (
        <span className="text-[10px] text-muted-foreground mt-0.5">DNA</span>
      )}
      {size === 'lg' && (
        <span className="text-sm text-muted-foreground mt-1">Brand DNA Score</span>
      )}

      {/* Tooltip */}
      {showTooltip && missingItems.length > 0 && (
        <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs rounded-lg p-3 w-48 shadow-lg z-10">
          <p className="font-semibold mb-1">Improve your score:</p>
          {missingItems.map((item, i) => (
            <p key={i} className="text-[11px] opacity-80">+ {item}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default DNAScoreIndicator;
