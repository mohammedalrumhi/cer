import { useEffect, useState } from 'react';

export const PHONE_QUERY = '(max-width: 767px)';
export const COARSE_POINTER_QUERY = '(pointer: coarse)';

/** Live `matchMedia` result. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const update = (event) => setMatches(event.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}
