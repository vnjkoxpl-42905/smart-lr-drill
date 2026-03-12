
Goal: produce a crash-risk audit list and a focused stabilization plan, especially for Adaptive Drill answer submit flow.

What I inspected
- Adaptive flow core: `src/pages/Drill.tsx` (full file), `TutorChatModal.tsx`, `AdaptiveExplanationPanel.tsx`, `ui/dialog.tsx`, `ui/radio-group.tsx`.
- Known build blockers: `LoginIntro.tsx`, `EnhancedBlindReview.tsx`, `VoiceCoachModal.tsx`, `Drill.tsx`.
- Related reliability surfaces: `questionLoader.ts`, `Home.tsx`, `Analytics.tsx`, `WrongAnswerJournal.tsx`, `TalkModeModal.tsx`, `BlindReviewFlow.tsx`, `QuestionPicker.tsx`, `Profile.tsx`.
- Debug snapshots: console/network snapshots (no new runtime error snapshot available in this message; replay was empty).

Broken points / potential crash points (prioritized)
1) Build-breaking TypeScript errors (currently blocks deploy)
- `NodeJS.Timeout` used in browser-only React code:
  - `src/components/LoginIntro.tsx` (2 locations)
  - `src/components/drill/EnhancedBlindReview.tsx`
  - `src/components/drill/VoiceCoachModal.tsx`
  - `src/pages/Drill.tsx`
- Impact: build fails immediately.

2) Adaptive Drill submit race conditions (likely cause of “crash/glitch on choose+submit” feeling)
- `isGrading` state exists but is never set to true/false around async submit in `Drill.tsx`.
- Result: answer/confidence can be changed while submit is in-flight, causing stale correctness UI, duplicate submits, and inconsistent status.

3) Conditional hook usage in `Drill.tsx` (high-risk React runtime crash)
- `const timer = hasTimer ? useTimerContext() : null;`
- This violates Rules of Hooks when `hasTimer` flips across renders.
- Impact: can trigger “Rendered more/fewer hooks than expected” crash in timer-enabled flows.

4) Tutor initialization duplicate-call risk
- In `TutorChatModal.tsx`, init condition `if (open && question && (initializing || attemptNumber))` makes `attemptNumber` always truthy, so first open can re-trigger init unnecessarily after `initializing` flips.
- Impact: duplicate function calls, response race, stale message behavior.

5) Mutable state patterns causing stale UI behavior
- Multiple places mutate Map state before cloning:
  - `setHighlights(new Map(highlights.set(...)))` (Drill/BlindReviewFlow)
  - `setBrAnswers(new Map(brAnswers.set(...)))` etc. (EnhancedBlindReview)
- Impact: state race/stale visual state, harder-to-reproduce UI inconsistencies.

6) Adaptive attempt tracking bug
- Adaptive attempts are stored by `qid` in a Map, overwriting prior attempts for same question.
- `currentAttemptNumber` derived from entries count for same qid can’t exceed 2 reliably.
- Impact: tutor prompt context can drift from true retry count.

7) Unsafe assumptions that can crash on inconsistent data
- `WrongAnswerJournal.tsx` directly maps `selectedEntry.history_json` without fallback guard.
- If `history_json` is null/invalid in any row, detail sheet can crash.

8) Question type normalization logic gaps (not crash, but major data quality bug)
- In `questionLoader.ts`, some stem inference checks use `.includes('most (strongly )?supported')` style strings (regex-like text in includes).
- Impact: many types become `Unknown` (already visible in logs), degrading adaptive selection/analytics quality.

9) PT parsing bug in Analytics “Start drill”
- `Object.keys(manifest.byPT).map(Number)` on keys like `"PT101"` yields `NaN`.
- Impact: broken drill config from analytics actions.

10) Browser API assumptions in voice modules (degrade/fail path risk)
- `TalkModeModal` and `VoiceCoachModal` depend on speech APIs with partial guards; failure paths exist but are fragile.
- Impact: non-Chromium/Safari edge cases can hard-fail voice flow.

Implementation plan (strict order)
Phase 1: Unblock build first
- Replace all `NodeJS.Timeout` / interval typings with browser-safe types:
  - `ReturnType<typeof setTimeout>` and `ReturnType<typeof setInterval>`.
- Rebuild to ensure zero TS errors.

Phase 2: Stabilize Adaptive submit path (crash/glitch core)
- Add a real grading lock in `Drill.tsx`:
  - Set `isGrading=true` at submit start, `false` in `finally`.
  - Block answer/confidence changes and auto-submit while grading.
- Add lightweight debounce/guard token to ignore stale async completions.
- Ensure grading always evaluates current submitted choice only (capture local immutable payload per submit).

Phase 3: Fix hook-order crash risk
- Refactor timer context access so hooks are unconditional:
  - Split timer-aware UI into child component inside `TimerProvider`, or always call context hook behind provider-safe abstraction.
- Remove conditional custom-hook invocation.

Phase 4: Tutor flow reliability hardening
- Fix Tutor init trigger condition to avoid duplicate first-load calls.
- Ensure only one in-flight tutor request at a time; discard stale response if attempt/question changed.
- Keep background visible/non-clickable behavior as-is but ensure no hidden second open/close races.

Phase 5: Data-shape guardrails
- Add safe fallbacks:
  - `history_json` array guard in WAJ detail rendering.
  - Defensive checks around optional explanation/breakdown fields.
- Remove mutable Map updates (use functional immutable updates only).

Phase 6: App-wide quality fixes impacting behavior
- Correct question type inference logic where regex-like strings are used with `.includes`.
- Fix PT extraction in Analytics start-drill path.
- Normalize student lookup keys across files (`id` vs `user_id`) to avoid silent empty states.

Validation plan
- Adaptive Drill E2E:
  1) Wrong attempt → Tutor opens.
  2) Return → pick different option quickly multiple times.
  3) Ensure only latest selection is active and only one submit is processed.
  4) Correct attempt → green lock, no wrong state flash.
- Run through voice-enabled and non-voice paths.
- Sanity-check WAJ detail open on old/new entries.
- Smoke-check analytics “start drill” action produces valid PT list.

Technical details
- Key files to patch:
  - `src/pages/Drill.tsx`
  - `src/components/drill/TutorChatModal.tsx`
  - `src/components/LoginIntro.tsx`
  - `src/components/drill/EnhancedBlindReview.tsx`
  - `src/components/drill/VoiceCoachModal.tsx`
  - `src/components/drill/BlindReviewFlow.tsx`
  - `src/pages/WrongAnswerJournal.tsx`
  - `src/lib/questionLoader.ts`
  - `src/pages/Analytics.tsx`
- Success criteria:
  - Build passes.
  - No hook-order runtime errors.
  - No duplicate submit/tutor race.
  - Adaptive answer correctness UI reflects latest attempt only.
