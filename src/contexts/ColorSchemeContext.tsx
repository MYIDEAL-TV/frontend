import React, { createContext, useContext, useState, useEffect } from 'react';

type ColorScheme = 'PRODUCTION_SCHEME' | 'TEST_SCHEME';

interface ColorSchemeContextType {
  currentScheme: ColorScheme;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

export const ColorSchemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read from environment variable or default to PRODUCTION_SCHEME
  const getInitialScheme = (): ColorScheme => {
    // Check localStorage first
    const stored = localStorage.getItem('color-scheme') as ColorScheme;
    if (stored === 'PRODUCTION_SCHEME' || stored === 'TEST_SCHEME') {
      return stored;
    }
    
    // Fall back to environment variable or default
    const envScheme = import.meta.env.VITE_COLOR_SCHEME as ColorScheme;
    return envScheme === 'TEST_SCHEME' ? 'TEST_SCHEME' : 'PRODUCTION_SCHEME';
  };

  const [currentScheme, setCurrentScheme] = useState<ColorScheme>(getInitialScheme);

  // Apply scheme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    if (currentScheme === 'TEST_SCHEME') {
      root.classList.add('test-scheme');
    } else {
      root.classList.remove('test-scheme');
    }
    
    // Persist to localStorage
    localStorage.setItem('color-scheme', currentScheme);
  }, [currentScheme]);

  const toggleColorScheme = () => {
    setCurrentScheme(prev => 
      prev === 'PRODUCTION_SCHEME' ? 'TEST_SCHEME' : 'PRODUCTION_SCHEME'
    );
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setCurrentScheme(scheme);
  };

  return (
    <ColorSchemeContext.Provider value={{ currentScheme, toggleColorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
};

export const useColorScheme = () => {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
};
