import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LoginIntroProps {
  firstName: string;
  onComplete: () => void;
}

export function LoginIntro({ firstName, onComplete }: LoginIntroProps) {
  const [phase, setPhase] = useState<'fade-in' | 'line-sweep' | 'text-reveal' | 'fade-out'>('fade-in');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      // Simple 150ms fade for reduced motion
      const timer = setTimeout(onComplete, 150);
      return () => clearTimeout(timer);
    }

    // Precise animation timing
    const timers = [
      setTimeout(() => setPhase('line-sweep'), 150),
      setTimeout(() => setPhase('text-reveal'), 450),
      setTimeout(() => setPhase('fade-out'), 850),
      setTimeout(onComplete, 1000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background animate-[simple-fade_150ms_ease-out]">
        <p 
          className="text-2xl font-semibold tracking-tight text-foreground"
          style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          Welcome back, {firstName}.
        </p>
        <span className="sr-only">Welcome back, {firstName}. Loading your dashboard.</span>
      </div>
    );
  }

  return (
    <div 
      role="alert" 
      aria-live="polite" 
      aria-label={`Welcome back, ${firstName}`}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        phase === 'fade-out' && "animate-[fade-out_150ms_ease-in_forwards]"
      )}
    >
      {/* Surface with fade-in */}
      <div 
        className={cn(
          "absolute inset-0",
          phase === 'fade-in' && "animate-[surface-fade_150ms_ease-out]"
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(0 0% 98%) 0%, hsl(0 0% 100%) 100%)'
        }}
      />

      {/* Lattice grid - fades in with line sweep */}
      {(phase === 'line-sweep' || phase === 'text-reveal') && (
        <svg className="absolute inset-0 pointer-events-none animate-[lattice-reveal_300ms_cubic-bezier(0.4,0,0.2,1)]">
          <defs>
            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path 
                d="M 8 0 L 0 0 0 8" 
                fill="none" 
                stroke="hsl(220 13% 91%)" 
                strokeWidth="0.5"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}

      {/* Line sweep */}
      {(phase === 'line-sweep' || phase === 'text-reveal') && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div 
            className="w-full animate-[sweep_300ms_cubic-bezier(0.4,0,0.2,1)]"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, hsl(220 13% 9%) 50%, transparent 100%)'
            }}
          />
        </div>
      )}

      {/* Text reveal */}
      {(phase === 'text-reveal' || phase === 'fade-out') && (
        <p 
          className="relative z-10 animate-[text-fade_400ms_cubic-bezier(0.4,0,0.2,1)] text-2xl font-semibold text-foreground"
          style={{ 
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
            lineHeight: '2rem'
          }}
        >
          Welcome back, {firstName}.
        </p>
      )}

      <span className="sr-only">Welcome back, {firstName}. Loading your dashboard.</span>

      {/* Keyframe animations */}
      <style>{`
        @keyframes surface-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes sweep {
          from { 
            transform: translateX(-100%); 
            opacity: 0; 
          }
          to { 
            transform: translateX(0); 
            opacity: 1; 
          }
        }

        @keyframes lattice-reveal {
          from { opacity: 0; }
          to { opacity: 0.15; }
        }

        @keyframes text-fade {
          from { 
            opacity: 0; 
            letter-spacing: 0.1em;
            transform: translateY(8px);
          }
          to { 
            opacity: 1; 
            letter-spacing: 0.025em;
            transform: translateY(0);
          }
        }

        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes simple-fade {
          0% { opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
