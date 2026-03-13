import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface LoginIntroProps {
  firstName: string;
  onComplete: () => void;
}

export function LoginIntro({ firstName, onComplete }: LoginIntroProps) {
  const [phase, setPhase] = useState<'fade-in' | 'line-sweep' | 'text-reveal' | 'fade-out'>('fade-in');
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = `Welcome back, ${firstName}.`;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Typewriter effect
  const typeCharacter = useCallback(() => {
    let currentIndex = 0;
    const typingTimers: NodeJS.Timeout[] = [];
    
    const scheduleNextChar = () => {
      if (currentIndex < fullText.length) {
        const char = fullText[currentIndex];
        let delay = 45; // Base delay for letters (22 chars/sec)
        
        if (char === ',' || char === '.') delay = 150; // Pause at punctuation
        else if (char === ' ') delay = 30; // Faster for spaces
        
        const timer = setTimeout(() => {
          setTypedText(fullText.substring(0, currentIndex + 1));
          currentIndex++;
          scheduleNextChar();
        }, delay);
        
        typingTimers.push(timer);
      } else {
        // Typing complete, hold cursor for 150ms then stop it
        const cursorTimer = setTimeout(() => setShowCursor(false), 150);
        typingTimers.push(cursorTimer);
      }
    };
    
    scheduleNextChar();
    return typingTimers;
  }, [fullText]);

  useEffect(() => {
    if (prefersReducedMotion) {
      // Simple 150ms fade for reduced motion
      const timer = setTimeout(onComplete, 150);
      return () => clearTimeout(timer);
    }

    // Precise animation timing - LONGER duration for better readability
    const timers = [
      setTimeout(() => setPhase('line-sweep'), 200),
      setTimeout(() => setPhase('text-reveal'), 600),
      setTimeout(() => setPhase('fade-out'), 2800), // Hold text longer
      setTimeout(onComplete, 3000), // Total: 3 seconds
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, prefersReducedMotion]);

  // Start typewriter when text-reveal phase begins
  useEffect(() => {
    let typingTimers: NodeJS.Timeout[] = [];
    
    if (phase === 'text-reveal' && !prefersReducedMotion) {
      typingTimers = typeCharacter();
    }
    
    return () => typingTimers.forEach(clearTimeout);
  }, [phase, prefersReducedMotion, typeCharacter]);

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
      {/* Warm ambient gradient backdrop */}
      <div 
        className={cn(
          "absolute inset-0",
          phase === 'fade-in' && "animate-[surface-fade_150ms_ease-out]"
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(30 15% 99%) 0%, hsl(30 10% 98%) 50%, hsl(25 20% 96%) 100%)'
        }}
      />
      
      {/* Warm vignette overlay for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, hsl(30 8% 8% / 0.03) 100%)'
        }}
      />
      
      {/* Subtle bronze glow pulse */}
      {(phase === 'text-reveal' || phase === 'fade-out') && (
        <div 
          className="absolute inset-0 pointer-events-none animate-glow-pulse"
          style={{
            background: 'radial-gradient(circle at 50% 45%, hsl(25 65% 48% / 0.08) 0%, transparent 50%)'
          }}
        />
      )}

      {/* Warm line sweep with bronze glow */}
      {(phase === 'line-sweep' || phase === 'text-reveal') && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div 
            className="w-full animate-[sweep_400ms_cubic-bezier(0.4,0,0.2,1)]"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, hsl(25 65% 48% / 0.6) 50%, transparent 100%)',
              boxShadow: '0 0 12px hsl(25 75% 60% / 0.4)'
            }}
          />
        </div>
      )}

      {/* Text reveal - Typewriter effect */}
      {(phase === 'text-reveal' || phase === 'fade-out') && (
        <div className="relative z-10">
          <p 
            className="text-4xl font-semibold text-foreground"
            style={{ 
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: '1.2',
              fontFeatureSettings: '"ss01" on, "cv05" on',
              WebkitFontSmoothing: 'antialiased',
              textRendering: 'optimizeLegibility'
            }}
          >
            {typedText.split('').map((char, i) => (
              <span 
                key={i}
                className={cn(
                  "inline-block",
                  i === typedText.length - 1 && "animate-[char-appear_120ms_cubic-bezier(0.34,1.56,0.64,1)]"
                )}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
            {showCursor && typedText.length < fullText.length && (
              <span 
                className="inline-block ml-1 animate-[cursor-blink_800ms_step-end_infinite]"
                style={{ 
                  opacity: 0.7,
                  color: 'hsl(25 65% 48%)'
                }}
              >
                |
              </span>
            )}
          </p>
        </div>
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

        @keyframes char-appear {
          from {
            opacity: 0.5;
            transform: translateY(4px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cursor-blink {
          0%, 49% { opacity: 0.7; }
          50%, 100% { opacity: 0; }
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
