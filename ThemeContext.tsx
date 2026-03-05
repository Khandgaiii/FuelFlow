import React, { createContext, useContext, useState } from 'react';

export type Theme = 'light' | 'dark';

export interface Colors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  cyan: string;
  teal: string;
  green: string;
  error: string;   // <--- ADD THIS LINE
}

export interface ThemeContextType {
  theme: Theme;
  colors: Colors;
  toggleTheme: () => void;
}

const lightColors: Colors = {
  background: '#F2F3F7',
  cardBackground: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  cyan: '#00D9FF',
  teal: '#008B8B',
  green: '#10B981',
  error: '#FF3B30', // <--- ADD THIS LINE
};

const darkColors: Colors = {
  background: '#121212',
  cardBackground: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#BDBDBD',
  border: '#2E2E2E',
  primary: '#0A7FFF',
  success: '#30B758',
  warning: '#FF8F00',
  danger: '#EE3B2B',
  cyan: '#00D9FF',
  teal: '#008B8B',
  green: '#10B981',
  error: '#FF3B30', // <--- ADD THIS LINE
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');

  const colors = theme === 'light' ? lightColors : darkColors;

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const value: ThemeContextType = {
    theme,
    colors,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
