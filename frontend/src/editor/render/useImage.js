import { useEffect, useState } from 'react';
import { loadImage, peekImage } from './imageSource';

/** Loaded HTMLImageElement for a URL (shared cache), re-rendering once it arrives. */
export function useImage(url) {
  const [, setVersion] = useState(0);
  const image = peekImage(url);
  useEffect(() => {
    if (!url || image) return undefined;
    let alive = true;
    loadImage(url).then(() => { if (alive) setVersion((v) => v + 1); });
    return () => { alive = false; };
  }, [url, image]);
  return url ? image : null;
}
