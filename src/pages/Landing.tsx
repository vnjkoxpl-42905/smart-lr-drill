import * as React from "react";
import { useNavigate } from 'react-router-dom';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { ModeSelector } from '@/components/drill/ModeSelector';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { FilterPanel } from '@/components/drill/FilterPanel';
import { Button } from '@/components/ui/button';
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from '@/types/drill';

export default function Landing() {
  const navigate = useNavigate();
  const { manifest, isLoading, error } = useQuestionBank();
  const [selectedMode, setSelectedMode] = React.useState<DrillMode | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading question bank...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  const handleStartAdaptive = () => {
    navigate('/drill', { state: { mode: 'adaptive' } });
  };

  const handleStartSection = (config: FullSectionConfig) => {
    navigate('/drill', { state: { mode: 'full-section', config } });
  };

  const handleStartTypeDrill = (config: TypeDrillConfig) => {
    navigate('/drill', { state: { mode: 'type-drill', config } });
  };

  return (
    <div className="min-h-screen p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">PRP — LR SmartDrill</h1>
        <p className="text-lg text-muted-foreground mb-2">
          Adaptive LSAT Logical Reasoning Practice
        </p>
        {manifest && (
          <p className="text-sm text-muted-foreground">
            {manifest.totalQuestions} questions • {manifest.sections.length} sections loaded
          </p>
        )}
        <Button
          variant="link"
          className="mt-2"
          onClick={() => navigate('/dashboard')}
        >
          View Dashboard
        </Button>
      </div>

      {!selectedMode && manifest && (
        <ModeSelector onSelectMode={setSelectedMode} />
      )}

      {selectedMode === 'adaptive' && (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-bold">Starting Adaptive Drill</h2>
          <p className="text-muted-foreground">
            The AI will select questions based on your performance, explore under-seen types,
            and resurface missed questions for mastery.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleStartAdaptive} size="lg">
              Begin
            </Button>
            <Button variant="outline" onClick={() => setSelectedMode(null)}>
              Back
            </Button>
          </div>
        </div>
      )}

      {selectedMode === 'full-section' && manifest && (
        <SectionSelector
          manifest={manifest}
          onStartSection={handleStartSection}
          onCancel={() => setSelectedMode(null)}
        />
      )}

      {selectedMode === 'type-drill' && manifest && (
        <FilterPanel
          manifest={manifest}
          onStartDrill={handleStartTypeDrill}
          onCancel={() => setSelectedMode(null)}
        />
      )}
    </div>
  );
}
