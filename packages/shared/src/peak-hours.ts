export type PeakHourBucket = { hour: number; count: number };

export function buildPeakHours(timestamps: Date[]): {
  peakHours: PeakHourBucket[];
  busiestHour: number | null;
} {
  const peakHours: PeakHourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }));

  for (const timestamp of timestamps) {
    const hour = new Date(timestamp).getHours();
    peakHours[hour].count++;
  }

  let busiestHour: number | null = null;
  let maxCount = 0;
  for (const bucket of peakHours) {
    if (bucket.count > maxCount) {
      maxCount = bucket.count;
      busiestHour = bucket.hour;
    }
  }

  if (maxCount === 0) {
    busiestHour = null;
  }

  return { peakHours, busiestHour };
}

export function formatPeakHourRange(hour: number, _locale: string): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const nextHour = (hour + 1) % 24;
  return `${pad(hour)}:00–${pad(nextHour)}:00`;
}
