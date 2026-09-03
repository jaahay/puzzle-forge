import { useEffect, useState } from "preact/hooks";
import { getLocalDateStamp } from "../games/shared/daily";

const monthLabels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

export const RandomIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="15" r="1" />
    <circle cx="15" cy="9" r="1" />
    <circle cx="9" cy="15" r="1" />
  </svg>
);

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5l11 7-11 7z" />
  </svg>
);

export const InfoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6M12 7.2v.1" />
  </svg>
);

const millisecondsUntilNextLocalDay = () => {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1_000, nextMidnight.getTime() - now.getTime() + 250);
};

export const TodayDateTile = () => {
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
