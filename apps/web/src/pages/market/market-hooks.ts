import { useEffect, useState } from "react";

export function usePersistentFavorites(): [string[], (favorites: string[]) => void] {
  const [favorites, setFavoritesState] = useState<string[]>([]);
  useEffect(() => {
    try {
      setFavoritesState(JSON.parse(localStorage.getItem("trading-pi-market-favorites") ?? "[]"));
    } catch {
      setFavoritesState([]);
    }
  }, []);
  const setFavorites = (next: string[]) => {
    setFavoritesState(next);
    localStorage.setItem("trading-pi-market-favorites", JSON.stringify(next));
  };
  return [favorites, setFavorites];
}
