import { useEffect, useState } from "react";

const KEY = "xhealth_journal";

export function readAllJournal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function readAll() {
  return readAllJournal();
}

export function useJournal(date) {
  const [entry, setEntry] = useState({ coffee: 0, alcohol: false, stress: 3, note: "" });

  useEffect(() => {
    const all = readAll();
    setEntry(all[date] || { coffee: 0, alcohol: false, stress: 3, note: "" });
  }, [date]);

  const save = (patch) => {
    const next = { ...entry, ...patch };
    setEntry(next);
    const all = readAll();
    all[date] = next;
    localStorage.setItem(KEY, JSON.stringify(all));
  };

  return { entry, save };
}
