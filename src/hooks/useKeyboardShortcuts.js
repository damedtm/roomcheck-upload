// Create src/hooks/useKeyboardShortcuts.js
import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Find matching shortcut
      const shortcut = shortcuts.find(s => {
        const modifierMatch = 
          (s.ctrl === undefined || s.ctrl === e.ctrlKey) &&
          (s.alt === undefined || s.alt === e.altKey) &&
          (s.shift === undefined || s.shift === e.shiftKey);
        
        const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
        
        return modifierMatch && keyMatch;
      });

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);
}

// Usage in AdminPage:
const shortcuts = [
  { key: 's', ctrl: true, action: () => handleSave() },
  { key: 'e', ctrl: true, action: () => handleExport() },
  { key: 'f', ctrl: true, action: () => focusSearch() },
  { key: 'n', ctrl: true, action: () => navigateToNew() },
];

useKeyboardShortcuts(shortcuts);