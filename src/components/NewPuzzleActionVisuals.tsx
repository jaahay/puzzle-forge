import { useEffect, useState } from "preact/hooks";
import { getLocalDateStamp } from "../games/shared/daily";

const monthLabels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

export const RestartPuzzleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 7v5h-5" />
    <path d="M19 12a7.5 7.5 0 1 0-2.3 5.4" />
  </svg>
);

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5l11 7-11 7z" />
  </svg>
);

const millisecondsUntilNextLocalDay = () => {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1_000, nextMidnight.getTime() - now.getTime() + 250);
};

export const useLiveLocalDateStamp = () => {
  const [dateStamp, setDateStamp] = useState(() => getLocalDateStamp());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleRollover = () => {
      timeout = setTimeout(() => {
        if (cancelled) return;
        setDateStamp(getLocalDateStamp());
        scheduleRollover();
      }, millisecondsUntilNextLocalDay());
    };

    scheduleRollover();
    return () => {
      cancelled = true;
      if (timeout !== null) clearTimeout(timeout);
    };
  }, []);

  return dateStamp;
};

export const TodayDateTile = () => {
  const dateStamp = useLiveLocalDateStamp();
  const [, monthPart = "1", dayPart = "1"] = dateStamp.split("-");
  const monthIndex = Math.max(0, Math.min(11, Number(monthPart) - 1));
  const day = Number(dayPart);

  return (
    <span class="new-puzzle-today-tile" aria-hidden="true">
      <span class="new-puzzle-today-month">{monthLabels[monthIndex]}</span>
      <span class="new-puzzle-today-day">{day}</span>
    </span>
  );
};
