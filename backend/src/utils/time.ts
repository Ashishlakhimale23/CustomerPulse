const MS_PER_HOUR = 60 * 60 * 1000;

export const hoursToMs = (hours: number) => hours * MS_PER_HOUR;
export const daysToMs = (days: number) => days * 24 * MS_PER_HOUR;

export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hoursToMs(hours));
export const addDays = (date: Date, days: number) => new Date(date.getTime() + daysToMs(days));

export const hoursFromNow = (hours: number) => addHours(new Date(), hours);
export const daysFromNow = (days: number) => addDays(new Date(), days);

const MS_PER_MINUTE = 60 * 1000;

export const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * MS_PER_MINUTE);
export const minutesFromNow = (minutes: number) => addMinutes(new Date(), minutes);

// Whole minutes between two dates, floored at 0 (never negative - clock
// skew or an out-of-order write should never hand back a negative pause/TAT).
export const diffInMinutes = (from: Date, to: Date) =>
  Math.max(0, Math.round((to.getTime() - from.getTime()) / MS_PER_MINUTE));

// Whole seconds between two dates, floored at 0.
export const diffInSeconds = (from: Date, to: Date) =>
  Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
