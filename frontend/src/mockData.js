// Programmatic generation helper for high-density mock data
const generateMockHistory = (probability) => {
  const history = {};
  // Generate completions for July 1 to July 15, 2026 (current time context)
  for (let d = 1; d <= 15; d++) {
    const dayStr = d.toString().padStart(2, '0');
    history[`2026-07-${dayStr}`] = Math.random() < probability;
  }
  return history;
};

export const initialData = {
  activeMonth: "2026-07",
  habits: [
    {
      id: "habit_wake_early",
      name: "Wake up early (06:00)",
      emoji: "🌅",
      category: "Routine",
      history: generateMockHistory(0.85)
    },
    {
      id: "habit_gym",
      name: "Strength Training",
      emoji: "💪",
      category: "Health",
      history: generateMockHistory(0.65)
    },
    {
      id: "habit_deep_work",
      name: "Deep Work (4 Hours)",
      emoji: "💻",
      category: "Productivity",
      history: generateMockHistory(0.75)
    },
    {
      id: "habit_read",
      name: "Read 15 Pages",
      emoji: "📚",
      category: "Learning",
      history: generateMockHistory(0.80)
    },
    {
      id: "habit_meditate",
      name: "Mindfulness Meditation",
      emoji: "🧘",
      category: "Mental Health",
      history: generateMockHistory(0.50)
    },
    {
      id: "habit_water",
      name: "Drink 3L Water",
      emoji: "💧",
      category: "Health",
      history: generateMockHistory(0.90)
    },
    {
      id: "habit_journal",
      name: "Evening Reflection",
      emoji: "✍️",
      category: "Routine",
      history: generateMockHistory(0.70)
    },
    {
      id: "habit_no_sugar",
      name: "No Processed Sugar",
      emoji: "🚫",
      category: "Diet",
      history: generateMockHistory(0.60)
    },
    {
      id: "habit_walk",
      name: "10k Steps Walk",
      emoji: "🚶",
      category: "Health",
      history: generateMockHistory(0.75)
    },
    {
      id: "habit_code",
      name: "Code Side Project",
      emoji: "🛠️",
      category: "Productivity",
      history: generateMockHistory(0.70)
    }
  ]
};
