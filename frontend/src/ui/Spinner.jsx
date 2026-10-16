import { LoaderCircle } from 'lucide-react';
import { cx } from './cx';

export function Spinner({ size = 16, className }) {
  return <LoaderCircle aria-hidden size={size} className={cx('animate-spin-slow', className)} />;
}
