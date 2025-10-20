import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SparklineChartProps {
  data: Array<{ date: string; count: number }>;
  total: number;
}

export function SparklineChart({ data, total }: SparklineChartProps) {
  const maxValue = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex items-end gap-1.5 h-full">
      <div className="flex flex-col justify-end pb-1">
        <span className="text-3xl font-semibold text-text-primary leading-none">{total}</span>
        <span className="text-xs text-text-tertiary mt-1 uppercase tracking-wider">Last 30 days</span>
      </div>
      
      <div className="flex-1 flex items-end gap-0.5 h-16 ml-4">
        <TooltipProvider delayDuration={100}>
          {data.map((item, index) => {
            const height = (item.count / maxValue) * 100;
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className="flex-1 group cursor-default">
                    <div 
                      className="w-full bg-primary/20 rounded-[2px] transition-all duration-200 group-hover:bg-accent-bronze group-hover:shadow-glow-xs"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{item.date}</p>
                  <p className="text-text-tertiary">{item.count} questions</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
