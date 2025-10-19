import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FullSectionConfig, TimerMode } from '@/types/drill';
import type { QuestionManifest } from '@/lib/questionLoader';

interface SectionSelectorProps {
  manifest: QuestionManifest;
  onStartSection: (config: FullSectionConfig) => void;
  onCancel: () => void;
}

export function SectionSelector({ manifest, onStartSection, onCancel }: SectionSelectorProps) {
  const [selectedPT, setSelectedPT] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [timerMode, setTimerMode] = useState<TimerMode>('35');
  const [customMinutes, setCustomMinutes] = useState(35);

  const availablePTs = Array.from(
    new Set(manifest.sections.map(s => s.pt))
  ).sort((a, b) => a - b);

  const availableSections = selectedPT
    ? Array.from(
        new Set(
          manifest.sections
            .filter(s => s.pt === selectedPT)
            .map(s => s.section)
        )
      ).sort((a, b) => a - b)
    : [];

  const handleStart = () => {
    if (selectedPT && selectedSection) {
      onStartSection({
        pt: selectedPT,
        section: selectedSection,
        timer: {
          mode: timerMode,
          customMinutes: timerMode === 'custom' ? customMinutes : undefined,
          isPaused: false,
          elapsedMs: 0,
          startedAt: Date.now(),
        },
      });
    }
  };

  const timingOptions = [
    { value: '35', label: '35:00', sublabel: 'Standard' },
    { value: '52.5', label: '52:30', sublabel: '1.5×' },
    { value: '70', label: '70:00', sublabel: '2×' },
    { value: 'custom', label: 'Custom', sublabel: '' },
    { value: 'unlimited', label: 'Stopwatch', sublabel: '' },
  ];

  const isReadyToStart = selectedPT && selectedSection && (timerMode !== 'custom' || customMinutes > 0);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      {/* Floating Panel */}
      <div className="relative max-w-2xl w-full">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent rounded-3xl blur-3xl" />
        
        {/* Main Panel */}
        <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold tracking-tight mb-3">
              Full Section
            </h1>
            <p className="text-muted-foreground/70 text-base leading-relaxed">
              Choose a PrepTest and timing
            </p>
          </div>

          {/* PrepTest & Section Selectors */}
          <div className="space-y-8 mb-12">
            {/* PrepTest */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
                PrepTest
              </label>
              <Select
                value={selectedPT?.toString()}
                onValueChange={(val) => {
                  setSelectedPT(Number(val));
                  setSelectedSection(null);
                }}
              >
                <SelectTrigger 
                  className="h-14 text-base border-border/50 bg-background/50 hover:bg-background/80 transition-all duration-200 focus:ring-2 focus:ring-foreground/20"
                  id="pt-select"
                >
                  <SelectValue placeholder="Select PrepTest" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                  {availablePTs.map(pt => (
                    <SelectItem 
                      key={pt} 
                      value={pt.toString()}
                      className="text-base py-3 focus:bg-foreground/5"
                    >
                      PrepTest {pt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section (appears only after PT selected) */}
            {selectedPT && (
              <div 
                className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <label className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
                  Section
                </label>
                <Select
                  value={selectedSection?.toString()}
                  onValueChange={(val) => setSelectedSection(Number(val))}
                >
                  <SelectTrigger 
                    className="h-14 text-base border-border/50 bg-background/50 hover:bg-background/80 transition-all duration-200 focus:ring-2 focus:ring-foreground/20"
                    id="section-select"
                  >
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                    {availableSections.map(section => (
                      <SelectItem 
                        key={section} 
                        value={section.toString()}
                        className="text-base py-3 focus:bg-foreground/5"
                      >
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Timing Segmented Control */}
          <div className="space-y-4 mb-12">
            <label className="text-sm font-medium text-foreground/60 uppercase tracking-wider">
              Timing
            </label>
            <div className="grid grid-cols-5 gap-2 p-1.5 bg-muted/30 rounded-xl">
              {timingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimerMode(option.value as TimerMode)}
                  className={cn(
                    "relative px-4 py-3.5 rounded-lg text-sm font-medium transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                    timerMode === option.value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-semibold">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-xs opacity-60">{option.sublabel}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Time Input */}
            {timerMode === 'custom' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className={cn(
                    "w-full h-12 px-4 text-base text-center rounded-lg",
                    "bg-background/50 border border-border/50",
                    "focus:outline-none focus:ring-2 focus:ring-foreground/20",
                    "transition-all duration-200"
                  )}
                  placeholder="Minutes"
                  aria-label="Custom minutes"
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-8" />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:underline"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleStart}
              disabled={!isReadyToStart}
              className={cn(
                "px-8 py-3.5 rounded-xl text-base font-semibold",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2",
                isReadyToStart
                  ? "bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  : "bg-muted/50 text-muted-foreground cursor-not-allowed"
              )}
            >
              Start Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 
 * Alternative concept variants (not implemented):
 * 
 * 1. Split Hero Layout:
 *    - Large PrepTest selector (left 60%), timing controls (right 40%)
 *    - Vertical divider between sections
 *    - Dramatic typography scale difference
 * 
 * 2. Ultra-Clean Borderless:
 *    - No visible panel borders, just spacing
 *    - Floating controls with individual shadows
 *    - More whitespace, less containment
 */
