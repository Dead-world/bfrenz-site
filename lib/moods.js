// The mood picker for status posts (and the profile Mood line).
export const MOODS = [
  ['😊', 'happy'], ['😎', 'chillin'], ['🔥', 'hyped'], ['😍', 'in love'], ['😂', 'giddy'],
  ['🥳', 'celebrating'], ['😴', 'sleepy'], ['😤', 'annoyed'], ['😢', 'sad'], ['😡', 'angry'],
  ['🤔', 'thoughtful'], ['😏', 'flirty'], ['🎧', 'jammin'], ['💪', 'motivated'], ['🤒', 'sick'],
  ['🤑', 'paid'], ['🙏', 'blessed'], ['😈', 'mischievous'], ['🥱', 'bored'], ['🍕', 'hungry'],
];

export function moodLabel(value) {
  const m = MOODS.find(([, name]) => name === value);
  return m ? `${m[0]} ${m[1]}` : value;
}
