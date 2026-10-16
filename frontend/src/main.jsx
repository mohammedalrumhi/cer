import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DirectionProvider } from '@radix-ui/react-direction';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-600.css';
import './index.css';
import './ui/theme';
import App from './App.jsx';
import { TooltipProvider } from './ui/Tooltip';
import { Toaster } from './ui/Toaster';
import { ConfirmHost } from './ui/ConfirmHost';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <TooltipProvider>
        <App />
        <Toaster />
        <ConfirmHost />
      </TooltipProvider>
    </DirectionProvider>
  </StrictMode>,
);
