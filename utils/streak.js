export function calculateStreak(entries) {
  if (!entries.length) return 0;

  let streak = 1;

  for (let i = 1; i < entries.length; i++) {
    const prev = new Date(entries[i - 1].createdAt);
    const curr = new Date(entries[i].createdAt);

    const diff =
      (prev.setHours(0,0,0,0) - curr.setHours(0,0,0,0)) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) streak++;
    else break;
  }

  return streak;
}
