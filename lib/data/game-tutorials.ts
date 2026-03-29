export interface GameTutorial {
  summary: string;
  steps: string[];
  tip?: string;
}

export const gameTutorials = {
  elementMatch: {
    summary: 'Answer each element prompt before time runs out and protect your lives.',
    steps: [
      'Choose a difficulty before starting the round.',
      'Read the prompt and the highlighted clue carefully.',
      'Tap the correct answer to build your score and streak.',
      'Keep answering correctly before the timer or your lives run out.',
    ],
    tip: 'Higher streaks help your score climb faster.',
  },
  reactionQuiz: {
    summary: 'Identify the correct products of each chemical reaction.',
    steps: [
      'Pick a difficulty to set the pace and challenge.',
      'Read the reactants shown on screen.',
      'Choose the product formula or name that matches the reaction.',
      'Keep going until the timer or your lives run out.',
    ],
    tip: 'On some difficulties you can switch between formula view and name view.',
  },
  whackAMole: {
    summary: 'Score points by hitting heavy metals and avoiding the safe elements.',
    steps: [
      'Start the round and watch the grid closely.',
      'Tap heavy-metal symbols as they pop up.',
      'Avoid clicking safe elements or you will lose points.',
      'Finish the timer with the highest score you can.',
    ],
    tip: 'The target heavy metals change with difficulty, so read the list before you start.',
  },
  periodicPuzzle: {
    summary: 'Place element symbols into the correct periodic-table slots.',
    steps: [
      'Choose a difficulty to set the table size and time pressure.',
      'Drag a symbol from the tray, or tap a piece to select it.',
      'Drop or place it into the matching slot on the table.',
      'Complete the puzzle before the time limit expires, if one is active.',
    ],
    tip: 'You can tap a placed symbol to return it to the tray and try again.',
  },
  volcano: {
    summary: 'Create or join a room, then collect all eruption ingredients with your partner.',
    steps: [
      'Create a room or join one using a room code.',
      'Share the code with a friend and wait for them to join.',
      'Take turns collecting the ingredients needed for the volcano.',
      'Complete the shared recipe to trigger the eruption.',
    ],
    tip: 'This mode is cooperative, so both players work toward the same eruption.',
  },
  foamRace: {
    summary: 'Build the tallest foam by drafting the best ingredient combination.',
    steps: [
      'Create a room or join a friend with a room code.',
      'Take turns picking ingredients from the shared grid.',
      'Balance reactants, catalysts, and stabilizers to improve your foam.',
      'Win by finishing with the taller foam height.',
    ],
    tip: 'Strong combinations matter more than collecting random items quickly.',
  },
  balloonRace: {
    summary: 'Draft ingredients that produce the strongest balloon inflation score.',
    steps: [
      'Create a room or join with a shared room code.',
      'Take turns selecting ingredients from the grid.',
      'Combine the best gas and speed effects in your inventory.',
      'Win by inflating your balloon more than your opponent.',
    ],
    tip: 'Not every ingredient helps, so filler picks can hold your score back.',
  },
  phChallenge: {
    summary: 'Adjust your flask toward the target pH and finish closer than your opponent.',
    steps: [
      'Create or join a room to begin a two-player match.',
      'Watch the target pH shown for the round.',
      'Take turns picking substances that raise or lower your flask pH.',
      'Win by ending closer to the target than the other player.',
    ],
    tip: 'Think about whether each pick moves your pH up, down, or keeps it steady.',
  },
  chemFormulaRace: {
    summary: 'Race against your opponent to type chemical formulas faster and more accurately.',
    steps: [
      'Create a room or join a friend with a room code.',
      'Watch the compound name appear on screen with a 30-second timer.',
      'Type the correct chemical formula as fast as you can.',
      'Win rounds by answering correctly and faster than your opponent—first to 3 wins!',
    ],
    tip: 'Speed matters, but accuracy is essential—incorrect answers lose you points.',
  },
} satisfies Record<string, GameTutorial>;
