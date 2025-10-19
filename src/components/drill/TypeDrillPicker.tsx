import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ChevronRight, ChevronLeft, Sparkles, Save } from 'lucide-react';
import type { TypeDrillConfig } from '@/types/drill';
import type { QuestionManifest } from '@/lib/questionLoader';
import { questionBank } from '@/lib/questionLoader';
import { AdaptiveEngine, type WeakAreaAnalysis } from '@/lib/adaptiveEngine';
import { templateService } from '@/lib/templateService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TypeDrillPickerProps {
  manifest: QuestionManifest;
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

export function TypeDrillPicker({ manifest, onStartDrill, onCancel }: TypeDrillPickerProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedQTypes, setSelectedQTypes] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([]);
  const [selectedPTs, setSelectedPTs] = useState<number[]>([]);
  const [setSize, setSetSize] = useState(10);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WeakAreaAnalysis | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const adaptiveEngine = new AdaptiveEngine();

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
    });
  };

  const canProceed = (step: Step): boolean => {
    if (step === 1) return selectedQTypes.length > 0;
    if (step === 2) return selectedDifficulties.length > 0;
    if (step === 3) return selectedPTs.length > 0;
    return false;
  };

  const handleSmartBuild = async () => {
    if (!user) return;
    
    setIsAnalyzing(true);
    
    try {
      const analysis = await adaptiveEngine.analyzeWeakAreas(user.id);
      
      if (!analysis) {
        toast({
          title: "Not enough data",
          description: "Complete at least 10 questions to use Smart Build. The more you practice, the smarter the recommendations!",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      setAnalysisResult(analysis);
      
      // Auto-populate selections based on analysis
      if (analysis.weakQTypes.length > 0) {
        setSelectedQTypes(analysis.weakQTypes);
      } else {
        // If no specific weak types, select a diverse set
        const diverseTypes = allQTypes.slice(0, 5);
        setSelectedQTypes(diverseTypes);
      }
      
      setSelectedDifficulties(analysis.weakDifficulties);
      setSetSize(analysis.recommendedSize);
      
      // Auto-advance to step 2
      setCurrentStep(2);
      
      const confidenceEmoji = (analysis.confidence || 0.5) > 0.8 ? '🎯' : 
                            (analysis.confidence || 0.5) > 0.6 ? '📊' : '💡';
      
      toast({
        title: `${confidenceEmoji} Smart drill built!`,
        description: analysis.explanation,
        duration: 5000,
      });
    } catch (err) {
      console.error('Smart build error:', err);
      toast({
        title: "Error",
        description: "Failed to analyze your performance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to save templates.",
        variant: "destructive",
      });
      return;
    }
    
    if (!templateName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this template.",
        variant: "destructive",
      });
      return;
    }

    if (selectedQTypes.length === 0) {
      toast({
        title: "Select question types",
        description: "Please select at least one question type.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch class_id from students table
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', user.id)
        .maybeSingle();

      if (studentError) {
        console.error('Student lookup error:', studentError);
        throw new Error('Failed to retrieve user information');
      }
      
      if (!student?.class_id) {
        throw new Error('User class_id not found. Please try logging out and back in.');
      }

      await templateService.saveTemplate({
        class_id: student.class_id,
        template_name: templateName,
        qtypes: selectedQTypes,
        difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : [1, 2, 3, 4, 5],
        pts: selectedPTs.length > 0 ? selectedPTs : allPTs,
        set_size: setSize,
      });

      toast({
        title: "✓ Template saved!",
        description: `"${templateName}" is now available in your saved drills.`,
      });

      setShowSaveDialog(false);
      setTemplateName('');
    } catch (err) {
      console.error('Template save error:', err);
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Could not save template. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Build Your Type Drill</h1>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Smart Build Button */}
      <Card className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="font-semibold">Smart Drill Builder</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes your performance to build the perfect drill
              </p>
            </div>
          </div>
          <Button
            onClick={handleSmartBuild}
            disabled={isAnalyzing}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              '🎯 Build Smart Drill'
            )}
          </Button>
        </div>
        
        {analysisResult && (
          <div className="mt-4 p-4 bg-background/50 rounded-lg border border-cyan-500/20 space-y-3">
            {/* Data Quality Indicator */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Based on <strong>{analysisResult.sampleSize} attempts</strong>
              </span>
              <Badge 
                variant="outline" 
                className={
                  (analysisResult.confidence || 0.5) > 0.8 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : (analysisResult.confidence || 0.5) > 0.6
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                }
              >
                Confidence: {
                  (analysisResult.confidence || 0.5) > 0.8 ? 'High' :
                  (analysisResult.confidence || 0.5) > 0.6 ? 'Medium' : 'Low'
                }
              </Badge>
            </div>

            {/* Explanation */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {analysisResult.explanation}
            </p>

            {/* Weak Areas Breakdown */}
            {analysisResult.weakQTypes.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Target Question Types:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.weakQTypes.map(qtype => (
                    <Badge key={qtype} variant="secondary" className="text-xs">
                      {qtype}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs flex-1"
                onClick={() => {
                  setAnalysisResult(null);
                  setSelectedQTypes([]);
                  setSelectedDifficulties([]);
                  setCurrentStep(1);
                }}
              >
                Edit Manually
              </Button>
              <Button
                size="sm"
                className="text-xs flex-1 bg-cyan-500 hover:bg-cyan-600"
                onClick={handleBuild}
              >
                Start This Drill
              </Button>
            </div>
          </div>
        )}

        {/* Data Quality Note */}
        {!analysisResult && (
          <div className="mt-3 text-xs text-muted-foreground/70 italic">
            💡 The more questions you practice, the smarter your recommendations become
          </div>
        )}
      </Card>

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

        {/* Dropdown selector with counts */}
        <div className="mb-4">
          <Label htmlFor="qtype-select" className="text-sm font-medium mb-2 block">
            Add Question Type
          </Label>
          <Select
            value=""
            onValueChange={(qtype) => {
              if (qtype && !selectedQTypes.includes(qtype)) {
                toggleQType(qtype);
              }
            }}
            disabled={currentStep !== 1}
          >
            <SelectTrigger id="qtype-select" className="w-full">
              <SelectValue placeholder="Choose a question type..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] z-50 bg-popover">
              {allQTypes.map(qtype => {
                const count = manifest.byQType[qtype] || 0;
                const isSelected = selectedQTypes.includes(qtype);
                return (
                  <SelectItem 
                    key={qtype} 
                    value={qtype}
                    disabled={isSelected}
                    className="cursor-pointer"
                  >
                    {qtype} ({count} questions)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Selected types */}
        {selectedQTypes.length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-xs font-medium text-muted-foreground mb-2">Selected:</div>
            <div className="flex flex-wrap gap-2">
              {selectedQTypes.map(qtype => {
                const count = manifest.byQType[qtype] || 0;
                return (
                  <Badge
                    key={qtype}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 cursor-pointer hover:bg-secondary/80 flex items-center gap-1"
                    onClick={() => toggleQType(qtype)}
                  >
                    <span>{qtype}</span>
                    <span className="text-xs opacity-70">({count})</span>
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Type chips - Quick selection */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Quick select:</div>
          <div className="flex flex-wrap gap-2">
            {allQTypes.slice(0, 10).map(qtype => {
              const count = manifest.byQType[qtype] || 0;
              return (
                <button
                  key={qtype}
                  onClick={() => toggleQType(qtype)}
                  disabled={currentStep !== 1}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    selectedQTypes.includes(qtype)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted/50'
                  } ${currentStep !== 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {qtype} ({count})
                </button>
              );
            })}
          </div>
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

          {/* Set size */}
          <div className="pt-4 border-t">
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

          {/* Save Template Button */}
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
          </div>
        </Card>
      )}

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Drill Template</DialogTitle>
            <DialogDescription>
              Save this configuration to quickly build similar drills in the future.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Flaw Questions Practice"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
