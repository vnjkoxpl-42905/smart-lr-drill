import * as React from "react";
import { useNavigate } from 'react-router-dom';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { ModeSelector } from '@/components/drill/ModeSelector';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { TypeDrillPicker } from '@/components/drill/TypeDrillPicker';
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
        <div className="flex justify-end gap-3 mb-4">
          <Button variant="outline" onClick={() => navigate('/analytics')}>
            Analytics
          </Button>
          <Button variant="outline" onClick={() => navigate('/waj')}>
            Wrong Answer Journal
          </Button>
        </div>
        <h1 className="text-4xl font-bold mb-4">LR smart drill</h1>
        <p className="text-lg text-muted-foreground">
          Logical Reasoning practice
        </p>
      </div>

      {!selectedMode && manifest && (
        <ModeSelector onSelectMode={setSelectedMode} />
      )}

      {selectedMode === 'adaptive' && (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-bold">Start drill</h2>
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
        <TypeDrillPicker
          manifest={manifest}
          onStartDrill={handleStartTypeDrill}
          onCancel={() => setSelectedMode(null)}
        />
      )}
    </div>
  );
}
