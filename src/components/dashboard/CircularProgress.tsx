import * as React from 'react';

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ value, size = 120, strokeWidth = 8 }: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = React.useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 50);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-[140ms] ease-out drop-shadow-glow"
          style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))' }}
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-text-primary leading-none">{value}%</span>
        <span className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">Accuracy</span>
      </div>
    </div>
  );
}
