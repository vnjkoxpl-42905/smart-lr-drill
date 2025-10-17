import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import type { TypeDrillConfig } from '@/types/drill';
import type { QuestionManifest } from '@/lib/questionLoader';
import { questionBank } from '@/lib/questionLoader';

interface TypeDrillPickerProps {
  manifest: QuestionManifest;
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

export function TypeDrillPicker({ manifest, onStartDrill, onCancel }: TypeDrillPickerProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedQTypes, setSelectedQTypes] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([]);
  const [selectedPTs, setSelectedPTs] = useState<number[]>([]);
  const [setSize, setSetSize] = useState(10);
  const [balancedMix, setBalancedMix] = useState(true);

  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  // Available options
  const allQTypes = Object.keys(manifest.byQType).sort();
  const allDifficulties = [1, 2, 3, 4, 5];
  const allPTs = Array.from(
    new Set(manifest.sections.map(s => s.pt))
  ).sort((a, b) => a - b);

  // Compute available options based on selections
  const getAvailableDifficulties = (): number[] => {
    if (selectedQTypes.length === 0) return allDifficulties;
    
    const questions = questionBank.getQuestionsByFilter({
      qtypes: selectedQTypes,
    });
    
    const availableDiffs = new Set(questions.map(q => q.difficulty));
    return allDifficulties.filter(d => availableDiffs.has(d));
  };

  const getAvailablePTs = (): number[] => {
    if (selectedQTypes.length === 0 && selectedDifficulties.length === 0) return allPTs;
    
    const questions = questionBank.getQuestionsByFilter({
      qtypes: selectedQTypes.length > 0 ? selectedQTypes : undefined,
      difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
    });
    
    const availablePTSet = new Set(questions.map(q => q.pt));
    return allPTs.filter(pt => availablePTSet.has(pt));
  };

  const availableDifficulties = getAvailableDifficulties();
  const availablePTs = getAvailablePTs();

  // Handlers
  const toggleQType = (qtype: string) => {
    setSelectedQTypes(prev =>
      prev.includes(qtype) ? prev.filter(q => q !== qtype) : [...prev, qtype]
    );
  };

  const toggleDifficulty = (diff: number) => {
    setSelectedDifficulties(prev =>
      prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
    );
  };

  const togglePT = (pt: number) => {
    setSelectedPTs(prev =>
      prev.includes(pt) ? prev.filter(p => p !== pt) : [...prev, pt]
    );
  };

  const selectAllPTs = () => {
    setSelectedPTs(availablePTs);
  };

  const clearStep = (step: Step) => {
    if (step === 1) setSelectedQTypes([]);
    if (step === 2) setSelectedDifficulties([]);
    if (step === 3) setSelectedPTs([]);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else if (currentStep === 2) {
      setCurrentStep(3);
      setTimeout(() => step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      handleBuild();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handleBuild = () => {
    onStartDrill({
      qtypes: selectedQTypes,
      difficulties: selectedDifficulties,
      pts: selectedPTs,
      count: setSize,
      balanced: balancedMix,
    });
  };

  const canProceed = (step: Step): boolean => {
    if (step === 1) return selectedQTypes.length > 0;
    if (step === 2) return selectedDifficulties.length > 0;
    if (step === 3) return selectedPTs.length > 0;
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Build Your Type Drill</h1>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Step 1: Question Types */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Step 1: Question Types</h2>
            <p className="text-sm text-muted-foreground mt-1">Select the types you want to practice</p>
          </div>
          {selectedQTypes.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearStep(1)}>
              Clear all
            </Button>
          )}
        </div>

        {/* Selected types */}
        {selectedQTypes.length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-xs font-medium text-muted-foreground mb-2">Selected:</div>
            <div className="flex flex-wrap gap-2">
              {selectedQTypes.map(qtype => (
                <Badge
                  key={qtype}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => toggleQType(qtype)}
                >
                  {qtype}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          {allQTypes.map(qtype => (
            <button
              key={qtype}
              onClick={() => toggleQType(qtype)}
              disabled={currentStep !== 1}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                selectedQTypes.includes(qtype)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted/50'
              } ${currentStep !== 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {qtype}
            </button>
          ))}
        </div>
      </Card>

      {/* Step 2: Difficulty Levels */}
      {currentStep >= 2 && (
        <Card ref={step2Ref} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Step 2: Difficulty Levels</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose your difficulty range</p>
            </div>
            {selectedDifficulties.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => clearStep(2)}>
                Clear all
              </Button>
            )}
          </div>

          {/* Selected difficulties */}
          {selectedDifficulties.length > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-2">Selected:</div>
              <div className="flex flex-wrap gap-2">
                {selectedDifficulties.sort((a, b) => a - b).map(diff => (
                  <Badge
                    key={diff}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => toggleDifficulty(diff)}
                  >
                    Level {diff}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty chips */}
          <div className="flex flex-wrap gap-2">
            {allDifficulties.map(diff => {
              const isAvailable = availableDifficulties.includes(diff);
              const isSelected = selectedDifficulties.includes(diff);
              
              return (
                <button
                  key={diff}
                  onClick={() => isAvailable && toggleDifficulty(diff)}
                  disabled={currentStep !== 2 || !isAvailable}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : isAvailable
                      ? 'bg-background border-border hover:bg-muted/50 cursor-pointer'
                      : 'bg-muted/30 border-border/50 text-muted-foreground cursor-not-allowed'
                  } ${currentStep !== 2 && 'opacity-50'}`}
                >
                  Level {diff}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Step 3: PrepTests */}
      {currentStep >= 3 && (
        <Card ref={step3Ref} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Step 3: PrepTests</h2>
              <p className="text-sm text-muted-foreground mt-1">Pick which tests to draw from</p>
            </div>
            <div className="flex gap-2">
              {availablePTs.length > 0 && selectedPTs.length < availablePTs.length && (
                <Button variant="ghost" size="sm" onClick={selectAllPTs}>
                  Select all shown
                </Button>
              )}
              {selectedPTs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => clearStep(3)}>
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Selected PTs */}
          {selectedPTs.length > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-2">Selected:</div>
              <div className="flex flex-wrap gap-2">
                {selectedPTs.sort((a, b) => a - b).map(pt => (
                  <Badge
                    key={pt}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => togglePT(pt)}
                  >
                    PT{pt}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* PT chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {allPTs.map(pt => {
              const isAvailable = availablePTs.includes(pt);
              const isSelected = selectedPTs.includes(pt);
              
              return (
                <button
                  key={pt}
                  onClick={() => isAvailable && togglePT(pt)}
                  disabled={currentStep !== 3 || !isAvailable}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : isAvailable
                      ? 'bg-background border-border hover:bg-muted/50 cursor-pointer'
                      : 'bg-muted/30 border-border/50 text-muted-foreground cursor-not-allowed'
                  } ${currentStep !== 3 && 'opacity-50'}`}
                >
                  PT{pt}
                </button>
              );
            })}
          </div>

          {/* Set size and mixing options */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="set-size" className="text-sm font-medium mb-2 block">
                Set size
              </Label>
              <Input
                id="set-size"
                type="number"
                min={1}
                max={100}
                value={setSize}
                onChange={(e) => setSetSize(Math.max(1, Number(e.target.value)))}
                className="max-w-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="balanced-mix" className="text-sm font-medium">
                  Balance evenly across my selections
                </Label>
                <p className="text-xs text-muted-foreground">
                  Distribute questions evenly across types and levels
                </p>
              </div>
              <Switch
                id="balanced-mix"
                checked={balancedMix}
                onCheckedChange={setBalancedMix}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Sticky footer navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep} of 3
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceed(currentStep)}
          >
            {currentStep === 3 ? 'Build drill' : 'Next'}
            {currentStep < 3 && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
