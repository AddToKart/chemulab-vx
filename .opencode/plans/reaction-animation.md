# Reaction Chamber Animation Implementation Plan

## Overview
Add a bubble/effervescent animation that triggers when elements combine successfully in the reaction chamber.

## Implementation Steps

### 1. CSS Animation (globals.css)
- Add `chamberBubble` keyframe: bubbles rise within chamber (1.5s)
- Add `chamberBubblePulse` for subtle pulsing effect
- Create `.chamber-bubble` class with realistic bubble styling
- Add `.reaction-overlay` for chamber glow effect

### 2. Lab Page Changes (page.tsx)
- Add `isReacting` state to track animation
- Create `ReactionBubbles` component inside chamber
- Modify `handleCombine` to trigger animation before showing results
- Animation sequence: bubbles appear → rise/fade → clear chamber → show success modal

### 3. Sound Effect (use-reaction-sound.ts)
- Create `useReactionSound` hook using Web Audio API
- Generate bubbly/fizzing sound (like opening soda)
- Play when reaction starts

### 4. Integration Flow
1. User clicks "Combine & Discover"
2. `isReacting = true` → bubbles appear + sound plays
3. After 1.5s: animation ends, `isReacting = false`
4. Chamber clears, success modal appears
5. Product is added to discoveries

## Key Benefits
- **Contained**: Animation stays within chamber
- **Subtle**: 1-2 seconds, doesn't interrupt flow
- **Visual**: Realistic bubbles with glass-like appearance
- **Audio**: Optional subtle fizzing sound
- **No new dependencies**: Uses existing CSS + Web Audio API