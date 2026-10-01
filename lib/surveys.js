/**
 * Surveys, the old-school "copy, paste, answer, repost" kind.
 * One is featured each week (rotating through the list); all of them can be taken any time.
 * To add a survey, add it to the end of the list. Never change a slug once people have answered it,
 * and only add questions to the end (answers are stored by position).
 */
export const SURVEYS = [
  {
    slug: 'the-basics',
    title: 'The Basics',
    emoji: '📝',
    blurb: 'The classic. Everything your frenz should already know about you.',
    questions: [
      'Name?',
      'Nicknames?',
      'Birthday?',
      'Where do you live?',
      'Height?',
      'Eye color?',
      'Hair color?',
      'Do you have any pets?',
      'Brothers or sisters?',
      'What did you have for breakfast?',
      'Last song you listened to?',
      'Last person you texted?',
      'What are you wearing right now?',
      'Favorite color?',
      'Favorite food?',
      'Favorite drink?',
      'Night owl or early bird?',
      'Biggest fear?',
      'What are you most looking forward to?',
      'Who do you think will take this survey next?',
    ],
  },
  {
    slug: 'this-or-that',
    title: 'This or That',
    emoji: '⚖️',
    blurb: 'Pick one. No "both." No "it depends."',
    questions: [
      'Pizza or tacos?',
      'Beach or mountains?',
      'Call or text?',
      'Sunrise or sunset?',
      'Cats or dogs?',
      'Coffee or tea?',
      'Summer or winter?',
      'Movies at home or at the theater?',
      'Sweet or salty?',
      'iPhone or Android?',
      'Concert or festival?',
      'City or country?',
      'Books or movies?',
      'Shower in the morning or at night?',
      'Big party or small hangout?',
      'Sneakers or boots?',
      'Pancakes or waffles?',
      'Road trip or plane?',
    ],
  },
  {
    slug: 'music-taste',
    title: 'Music Taste Check',
    emoji: '🎧',
    blurb: "Prove your playlist isn't embarrassing. (It is.)",
    questions: [
      'Song stuck in your head right now?',
      'Favorite artist of all time?',
      'First album you ever owned?',
      'A song that always makes you cry?',
      'A song that always makes you dance?',
      'Guilty pleasure song?',
      'Best concert you have been to?',
      'Artist you would love to see live?',
      'Song that reminds you of your best fren?',
      'Favorite song lyric?',
      'Do you sing in the car?',
      'Can you play an instrument?',
      'Headphones or speakers?',
      'Song you would put on your profile forever?',
      'An underrated artist everyone should hear?',
    ],
  },
  {
    slug: 'have-you-ever',
    title: 'Have You Ever…',
    emoji: '🙊',
    blurb: 'Yes or no. Details optional (but encouraged).',
    questions: [
      'Have you ever been on TV?',
      'Have you ever broken a bone?',
      'Have you ever stayed up all night?',
      'Have you ever been in love?',
      'Have you ever cried at a movie?',
      'Have you ever met someone famous?',
      'Have you ever been on a plane?',
      'Have you ever dyed your hair a crazy color?',
      'Have you ever won something?',
      'Have you ever sung karaoke?',
      'Have you ever gotten lost in a new city?',
      'Have you ever been to a concert alone?',
      'Have you ever pulled a prank?',
      'Have you ever forgotten someone’s name right after meeting them?',
      'Have you ever been told you look like someone famous? Who?',
      'Have you ever had a nickname you hated?',
    ],
  },
  {
    slug: 'about-your-frenz',
    title: 'About Your Frenz',
    emoji: '🤝',
    blurb: 'Shout out your people. They will see it.',
    questions: [
      'Who is your best fren?',
      'How did you meet?',
      'Who have you known the longest?',
      'Fren who always makes you laugh?',
      'Fren you can tell anything?',
      'Fren you would call at 3am?',
      'Fren with the best music taste?',
      'Fren who would survive a zombie apocalypse?',
      'Fren who is always late?',
      'Last fren you hung out with?',
      'Fren you miss the most right now?',
      'Who is in your Top 8 and why?',
      'Describe your friend group in 3 words.',
      'Best memory with your frenz?',
    ],
  },
  {
    slug: 'would-you-rather',
    title: 'Would You Rather',
    emoji: '🤔',
    blurb: 'Impossible choices. Explain yourself.',
    questions: [
      'Would you rather be able to fly or be invisible?',
      'Would you rather live without music or without movies?',
      'Would you rather be famous or rich?',
      'Would you rather time travel to the past or the future?',
      'Would you rather never use social media again or never watch TV again?',
      'Would you rather have a rewind button or a pause button for your life?',
      'Would you rather always be 10 minutes late or 20 minutes early?',
      'Would you rather live in the city or in the woods?',
      'Would you rather talk to animals or speak every language?',
      'Would you rather have unlimited pizza or unlimited tacos?',
      'Would you rather be a famous singer or a famous actor?',
      'Would you rather know how you die or when you die?',
      'Would you rather lose your phone or your wallet?',
      'Would you rather only whisper or only shout?',
    ],
  },
  {
    slug: 'right-now',
    title: 'Right Now',
    emoji: '⏱️',
    blurb: 'A snapshot of this exact moment.',
    questions: [
      'What time is it?',
      'Where are you?',
      'What are you doing besides this survey?',
      'Mood right now?',
      'What are you listening to?',
      'What are you drinking?',
      'What is the weather like?',
      'Who are you thinking about?',
      'What is the last thing you bought?',
      'What do you want to eat right now?',
      'What is on your mind?',
      'How many tabs do you have open?',
      'Plans for tonight?',
      'Plans for this weekend?',
      'One thing you are grateful for today?',
    ],
  },
  {
    slug: 'deep-thoughts',
    title: 'Deep Thoughts',
    emoji: '🌙',
    blurb: 'For the 2am version of you.',
    questions: [
      'What is something you wish more people knew about you?',
      'What makes you feel most like yourself?',
      'Best advice anyone ever gave you?',
      'What is a dream you have not told many people?',
      'What scares you about the future?',
      'What are you proud of this year?',
      'If you could tell your younger self one thing, what would it be?',
      'What is a small thing that makes your day better?',
      'Where do you see yourself in 5 years?',
      'What does a perfect day look like for you?',
      'Who has influenced you the most?',
      'What is something you changed your mind about?',
      'What do you want to be remembered for?',
    ],
  },
];

const BY_SLUG = Object.fromEntries(SURVEYS.map((s) => [s.slug, s]));

export function getSurvey(slug) {
  return BY_SLUG[String(slug || '')] || null;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;
// Weeks are counted from a Monday so the featured survey changes Monday mornings (UTC).
const START = Date.UTC(2026, 0, 5);

/** This week's featured survey (rotates through the list). */
export function weeklySurvey(now = Date.now()) {
  const n = Math.max(0, Math.floor((now - START) / WEEK));
  return SURVEYS[n % SURVEYS.length];
}

/** When the next survey comes out. */
export function nextSurveyAt(now = Date.now()) {
  const n = Math.max(0, Math.floor((now - START) / WEEK));
  return new Date(START + (n + 1) * WEEK);
}

export const ANSWER_MAX = 300;

/** Pairs of [question, answer] for answered questions only. */
export function answeredPairs(survey, answers) {
  return survey.questions.map((q, i) => [q, String(answers?.[i] || '').trim()]).filter(([, a]) => a);
}
