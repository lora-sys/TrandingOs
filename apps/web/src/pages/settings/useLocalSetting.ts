import { useEffect, useState } from "react";

/** Local storage-backed setting hook for non-store preferences (trading risk params) */
export function useLocalSetting(key: string, fallback: string) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    setValue(localStorage.getItem(key) ?? fallback);
  }, [key, fallback]);
  const update = (next: string) => {
    setValue(next);
    localStorage.setItem(key, next);
  };
  return [value, update] as const;
}
