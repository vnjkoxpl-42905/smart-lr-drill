import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TypeDrillConfig } from '@/types/drill';
import { QuestionManifest } from '@/lib/questionLoader';

interface FilterPanelProps {
  manifest: QuestionManifest;
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

export function FilterPanel({ manifest, onStartDrill, onCancel }: FilterPanelProps) {
  const [selectedQTypes, setSelectedQTypes] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([]);
  const [selectedPTs, setSelectedPTs] = useState<number[]>([]);
  const [questionCount, setQuestionCount] = useState(20);

  const availableQTypes = Object.keys(manifest.byQType).sort();
  const availableDifficulties = Object.keys(manifest.byDifficulty)
    .map(Number)
    .sort((a, b) => a - b);
  const availablePTs = Array.from(
    new Set(manifest.sections.map(s => s.pt))
  ).sort((a, b) => a - b);

  const toggleQType = (qtype: string) => {
    setSelectedQTypes(prev =>
      prev.includes(qtype)
        ? prev.filter(q => q !== qtype)
        : [...prev, qtype]
    );
  };

  const toggleDifficulty = (diff: number) => {
    setSelectedDifficulties(prev =>
      prev.includes(diff)
        ? prev.filter(d => d !== diff)
        : [...prev, diff]
    );
  };

  const togglePT = (pt: number) => {
    setSelectedPTs(prev =>
      prev.includes(pt)
        ? prev.filter(p => p !== pt)
        : [...prev, pt]
    );
  };

  const handleStart = () => {
    onStartDrill({
      qtypes: selectedQTypes,
      difficulties: selectedDifficulties,
      pts: selectedPTs,
      count: questionCount,
    });
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Configure Type Drill</h2>

      <div className="space-y-6">
        {/* Question Types */}
        <div>
          <Label className="text-lg font-semibold mb-3 block">Question Types</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableQTypes.map(qtype => (
              <div key={qtype} className="flex items-center space-x-2">
                <Checkbox
                  id={`qtype-${qtype}`}
                  checked={selectedQTypes.includes(qtype)}
                  onCheckedChange={() => toggleQType(qtype)}
                />
                <label
                  htmlFor={`qtype-${qtype}`}
                  className="text-sm cursor-pointer"
                >
                  {qtype} ({manifest.byQType[qtype]})
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Levels */}
        <div>
          <Label className="text-lg font-semibold mb-3 block">Difficulty</Label>
          <div className="flex gap-3">
            {availableDifficulties.map(diff => (
              <div key={diff} className="flex items-center space-x-2">
                <Checkbox
                  id={`diff-${diff}`}
                  checked={selectedDifficulties.includes(diff)}
                  onCheckedChange={() => toggleDifficulty(diff)}
                />
                <label
                  htmlFor={`diff-${diff}`}
                  className="text-sm cursor-pointer"
                >
                  Level {diff} ({manifest.byDifficulty[diff]})
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* PT Sections */}
        <div>
          <Label className="text-lg font-semibold mb-3 block">PrepTests</Label>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3 max-h-40 overflow-y-auto">
            {availablePTs.map(pt => (
              <div key={pt} className="flex items-center space-x-2">
                <Checkbox
                  id={`pt-${pt}`}
                  checked={selectedPTs.includes(pt)}
                  onCheckedChange={() => togglePT(pt)}
                />
                <label
                  htmlFor={`pt-${pt}`}
                  className="text-sm cursor-pointer"
                >
                  PT{pt}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <Label htmlFor="count" className="text-lg font-semibold mb-3 block">
            Number of Questions
          </Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={100}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="max-w-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleStart} disabled={questionCount < 1}>
            Start Drill ({questionCount} questions)
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
