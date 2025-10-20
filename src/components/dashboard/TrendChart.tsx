import * as React from 'react';
import { Button } from '@/components/ui/button';

interface TrendChartProps {
  trends: Array<{ label: string; value: string }>;
  onViewDetails: () => void;
}

export function TrendChart({ trends, onViewDetails }: TrendChartProps) {
  // Mock trend line data
  const trendPoints = [45, 42, 48, 50, 55, 52, 58, 60, 62, 58, 65, 68];
  const maxValue = Math.max(...trendPoints);
  const minValue = Math.min(...trendPoints);
  const range = maxValue - minValue;
  
  return (
    <div className="flex flex-col h-full">
      {/* Mini trend line */}
      <div className="mb-4 h-12 relative">
        <svg viewBox="0 0 120 40" className="w-full h-full" preserveAspectRatio="none">
          <polyline
            points={trendPoints.map((value, index) => {
              const x = (index / (trendPoints.length - 1)) * 120;
              const y = 40 - ((value - minValue) / range) * 35;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary drop-shadow-glow"
          />
        </svg>
      </div>
      
      {/* Top skills list */}
      <div className="space-y-2 flex-1">
        {trends.length > 0 ? (
          trends.slice(0, 3).map((trend, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{trend.label}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-tertiary">No data yet</p>
        )}
      </div>
      
      {/* View button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewDetails}
        className="mt-3 h-7 text-xs self-start px-3 hover:bg-accent-bronze/10 hover:text-accent-bronze"
      >
        View Analytics
      </Button>
    </div>
  );
}
