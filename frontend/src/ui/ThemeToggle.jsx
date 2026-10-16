import { Monitor, Moon, Sun } from 'lucide-react';
import { Segmented } from './Segmented';
import { useTheme } from './theme';
import { S } from '../strings.ar';

export function ThemeToggle({ size = 'sm' }) {
  const mode = useTheme((state) => state.mode);
  const setMode = useTheme((state) => state.setMode);
  return (
    <Segmented
      label={S.theme.label}
      size={size}
      value={mode}
      onChange={setMode}
      options={[
        { value: 'light', icon: Sun, tooltip: S.theme.light },
        { value: 'dark', icon: Moon, tooltip: S.theme.dark },
        { value: 'system', icon: Monitor, tooltip: S.theme.system },
      ]}
    />
  );
}
