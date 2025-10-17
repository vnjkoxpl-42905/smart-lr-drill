import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FullSectionConfig, TimerMode } from '@/types/drill';
import { QuestionManifest } from '@/lib/questionLoader';

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
    ? manifest.sections
        .filter(s => s.pt === selectedPT)
        .map(s => s.section)
        .sort((a, b) => a - b)
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

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Select Full Section</h2>

      <div className="space-y-6">
        {/* PT Selection */}
        <div>
          <Label htmlFor="pt-select" className="text-lg font-semibold mb-3 block">
            PrepTest
          </Label>
          <Select
            value={selectedPT?.toString()}
            onValueChange={(val) => {
              setSelectedPT(Number(val));
              setSelectedSection(null);
            }}
          >
            <SelectTrigger id="pt-select">
              <SelectValue placeholder="Select a PrepTest" />
            </SelectTrigger>
            <SelectContent>
              {availablePTs.map(pt => (
                <SelectItem key={pt} value={pt.toString()}>
                  PrepTest {pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Section Selection */}
        {selectedPT && (
          <div>
            <Label htmlFor="section-select" className="text-lg font-semibold mb-3 block">
              Section
            </Label>
            <Select
              value={selectedSection?.toString()}
              onValueChange={(val) => setSelectedSection(Number(val))}
            >
              <SelectTrigger id="section-select">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {availableSections.map(section => (
                  <SelectItem key={section} value={section.toString()}>
                    Section {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Timer Mode */}
        <div>
          <Label className="text-lg font-semibold mb-3 block">Timer Mode</Label>
          <RadioGroup value={timerMode} onValueChange={(val) => setTimerMode(val as TimerMode)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="35" id="timer-35" />
              <label htmlFor="timer-35" className="cursor-pointer">
                35 minutes (Standard)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="52.5" id="timer-52" />
              <label htmlFor="timer-52" className="cursor-pointer">
                52:30 (1.5x)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="70" id="timer-70" />
              <label htmlFor="timer-70" className="cursor-pointer">
                70 minutes (2x)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="timer-custom" />
              <label htmlFor="timer-custom" className="cursor-pointer">
                Custom
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unlimited" id="timer-unlimited" />
              <label htmlFor="timer-unlimited" className="cursor-pointer">
                Unlimited (Stopwatch)
              </label>
            </div>
          </RadioGroup>

          {timerMode === 'custom' && (
            <div className="mt-3">
              <Input
                type="number"
                min={1}
                max={999}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                className="max-w-xs"
                placeholder="Minutes"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleStart}
            disabled={!selectedPT || !selectedSection}
          >
            Start Section
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
