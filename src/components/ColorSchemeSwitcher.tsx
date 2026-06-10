import { useColorScheme } from '@/contexts/ColorSchemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette } from 'lucide-react';

export const ColorSchemeSwitcher = () => {
  const { currentScheme, toggleColorScheme } = useColorScheme();
  
  const isProduction = currentScheme === 'PRODUCTION_SCHEME';
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant={isProduction ? "default" : "secondary"} className="gap-1">
        <div className={`w-2 h-2 rounded-full ${isProduction ? 'bg-orange-500' : 'bg-blue-500'}`} />
        {isProduction ? 'Production' : 'Test'}
      </Badge>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleColorScheme}
        title="Toggle color scheme"
      >
        <Palette className="h-4 w-4" />
      </Button>
    </div>
  );
};
