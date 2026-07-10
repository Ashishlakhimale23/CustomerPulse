const MS_PER_HOUR = 60 * 60 * 1000;

export const hoursToMs = (hours: number) => hours * MS_PER_HOUR;
export const daysToMs = (days: number) => days * 24 * MS_PER_HOUR;

export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hoursToMs(hours));
export const addDays = (date: Date, days: number) => new Date(date.getTime() + daysToMs(days));

export const hoursFromNow = (hours: number) => addHours(new Date(), hours);
export const daysFromNow = (days: number) => addDays(new Date(), days);
