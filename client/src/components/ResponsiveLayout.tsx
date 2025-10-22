import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Grid, 
  Smartphone, 
  Tablet, 
  Monitor,
  RotateCcw,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface WidgetConfig {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultSize: { w: number; h: number; minW?: number; minH?: number };
  category: 'trading' | 'data' | 'alerts' | 'other';
  isVisible?: boolean;
  priority?: 'high' | 'medium' | 'low'; // For responsive priority
}

interface ResponsiveLayoutProps {
  widgets: WidgetConfig[];
  onLayoutChange?: (layouts: Layout[]) => void;
  onSaveLayout?: () => void;
  className?: string;
}

// Improved responsive breakpoints and layouts
const BREAKPOINTS = {
  xxl: 1600,  // Ultra-wide displays
  xl: 1200,   // Desktop 
  lg: 992,    // Large tablets / small desktop
  md: 768,    // Tablets
  sm: 576,    // Large phones
  xs: 0       // Small phones
};

const COLS = {
  xxl: 16,    // More columns for ultra-wide
  xl: 12,     // Standard desktop
  lg: 10,     // Large tablets
  md: 8,      // Tablets 
  sm: 4,      // Large phones
  xs: 2       // Small phones
};

// Smart layout generator based on widget priority and screen size
function generateResponsiveLayouts(widgets: WidgetConfig[]): { [key: string]: Layout[] } {
  // Sort widgets by priority and category
  const sortedWidgets = [...widgets].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const categoryOrder = { trading: 0, data: 1, alerts: 2, other: 3 };
    
    const aPriority = priorityOrder[a.priority || 'medium'];
    const bPriority = priorityOrder[b.priority || 'medium'];
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    const aCategory = categoryOrder[a.category];
    const bCategory = categoryOrder[b.category];
    return aCategory - bCategory;
  });

  const layouts: { [key: string]: Layout[] } = {};

  // Ultra-wide layout (xxl) - 4 columns with specialized areas
  layouts.xxl = generateLayoutForBreakpoint(sortedWidgets, 'xxl', {
    cols: 16,
    maxRows: 8,
    sections: [
      { name: 'sidebar', x: 0, w: 4 },      // Left sidebar
      { name: 'main', x: 4, w: 8 },         // Main content 
      { name: 'right', x: 12, w: 4 }        // Right sidebar
    ]
  });

  // Desktop layout (xl) - 3 column layout
  layouts.xl = generateLayoutForBreakpoint(sortedWidgets, 'xl', {
    cols: 12,
    maxRows: 8,
    sections: [
      { name: 'sidebar', x: 0, w: 3 },      // Left sidebar
      { name: 'main', x: 3, w: 6 },         // Main content
      { name: 'right', x: 9, w: 3 }         // Right sidebar  
    ]
  });

  // Large tablet layout (lg) - 2.5 column layout
  layouts.lg = generateLayoutForBreakpoint(sortedWidgets, 'lg', {
    cols: 10,
    maxRows: 10,
    sections: [
      { name: 'left', x: 0, w: 4 },
      { name: 'right', x: 4, w: 6 }
    ]
  });

  // Tablet layout (md) - 2 column layout
  layouts.md = generateLayoutForBreakpoint(sortedWidgets, 'md', {
    cols: 8,
    maxRows: 12,
    sections: [
      { name: 'left', x: 0, w: 4 },
      { name: 'right', x: 4, w: 4 }
    ]
  });

  // Large phone layout (sm) - Single column with some side-by-side
  layouts.sm = generateLayoutForBreakpoint(sortedWidgets, 'sm', {
    cols: 4,
    maxRows: 20,
    sections: [
      { name: 'full', x: 0, w: 4 }
    ]
  });

  // Small phone layout (xs) - Single column
  layouts.xs = generateLayoutForBreakpoint(sortedWidgets, 'xs', {
    cols: 2,
    maxRows: 30,
    sections: [
      { name: 'full', x: 0, w: 2 }
    ]
  });

  return layouts;
}

function generateLayoutForBreakpoint(
  widgets: WidgetConfig[],
  breakpoint: string,
  config: {
    cols: number;
    maxRows: number;
    sections: { name: string; x: number; w: number }[];
  }
): Layout[] {
  const layouts: Layout[] = [];
  let sectionIndex = 0;
  let currentY = 0;

  widgets.filter(w => w.isVisible !== false).forEach((widget, index) => {
    const section = config.sections[sectionIndex % config.sections.length];
    
    // Determine widget size based on breakpoint and category
    let width = Math.min(widget.defaultSize.w, section.w);
    let height = widget.defaultSize.h;

    // Adjust for smaller screens
    if (breakpoint === 'xs' || breakpoint === 'sm') {
      width = section.w; // Full width on mobile
      height = Math.max(3, Math.min(height, 6)); // Clamp height for mobile
    }

    // Special handling for trading widgets - give them priority
    if (widget.category === 'trading' && (breakpoint === 'xl' || breakpoint === 'xxl')) {
      if (widget.id.includes('market') || widget.id.includes('orderbook')) {
        // Keep trading widgets in main section
        sectionIndex = config.sections.findIndex(s => s.name === 'main' || s.name === 'left');
        if (sectionIndex === -1) sectionIndex = 0;
      }
    }

    const currentSection = config.sections[sectionIndex];
    
    layouts.push({
      i: widget.id,
      x: currentSection.x,
      y: currentY,
      w: width,
      h: height,
      minW: widget.defaultSize.minW || 2,
      minH: widget.defaultSize.minH || 2
    });

    // Move to next position
    currentY += height;
    
    // Switch sections for variety, but keep related widgets together
    if (index > 0 && widget.category !== widgets[index - 1]?.category) {
      sectionIndex = (sectionIndex + 1) % config.sections.length;
      currentY = 0; // Reset Y for new section
    }
  });

  return layouts;
}

export default function ResponsiveLayout({ 
  widgets, 
  onLayoutChange, 
  onSaveLayout,
  className 
}: ResponsiveLayoutProps) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('xl');
  const [layouts, setLayouts] = useState(() => generateResponsiveLayouts(widgets));
  const [isDragging, setIsDragging] = useState(false);
  const [showLayoutInfo, setShowLayoutInfo] = useState(false);

  // Regenerate layouts when widgets change
  useEffect(() => {
    setLayouts(generateResponsiveLayouts(widgets));
  }, [widgets]);

  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    onLayoutChange?.(layout);
  };

  const resetLayouts = () => {
    const newLayouts = generateResponsiveLayouts(widgets);
    setLayouts(newLayouts);
  };

  const getBreakpointIcon = (bp: string) => {
    switch (bp) {
      case 'xs':
      case 'sm':
        return <Smartphone className="h-4 w-4" />;
      case 'md':
      case 'lg':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const visibleWidgets = widgets.filter(w => w.isVisible !== false);

  return (
    <div className={cn("relative", className)}>
      {/* Layout Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="gap-2"
          >
            {getBreakpointIcon(currentBreakpoint)}
            <span className="uppercase font-mono text-xs">
              {currentBreakpoint}
            </span>
            <span className="text-muted-foreground">
              {COLS[currentBreakpoint as keyof typeof COLS]} cols
            </span>
          </Badge>
          
          {isDragging && (
            <Badge variant="default" className="gap-1">
              <Grid className="h-3 w-3" />
              Arranging
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLayoutInfo(!showLayoutInfo)}
            className="gap-2"
          >
            {showLayoutInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {showLayoutInfo ? 'Hide Info' : 'Show Info'}
            </span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetLayouts}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          {onSaveLayout && (
            <Button
              variant="default"
              size="sm"
              onClick={onSaveLayout}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save Layout</span>
            </Button>
          )}
        </div>
      </div>

      {/* Layout Information Panel */}
      {showLayoutInfo && (
        <div className="mb-4 p-4 bg-accent/20 rounded-lg border border-accent/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Current Layout</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Breakpoint: {currentBreakpoint.toUpperCase()}</div>
                <div>Columns: {COLS[currentBreakpoint as keyof typeof COLS]}</div>
                <div>Widgets: {visibleWidgets.length}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Widget Priority</h4>
              <div className="space-y-1 text-xs">
                {['high', 'medium', 'low'].map(priority => {
                  const count = visibleWidgets.filter(w => (w.priority || 'medium') === priority).length;
                  return (
                    <div key={priority} className="flex justify-between">
                      <span className="capitalize">{priority}:</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Categories</h4>
              <div className="space-y-1 text-xs">
                {['trading', 'data', 'alerts', 'other'].map(category => {
                  const count = visibleWidgets.filter(w => w.category === category).length;
                  return (
                    <div key={category} className="flex justify-between">
                      <span className="capitalize">{category}:</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Responsive</h4>
              <div className="text-xs text-muted-foreground">
                Layout automatically adapts to screen size. Drag widgets to customize, 
                or use Reset to restore smart defaults.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={80}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={setCurrentBreakpoint}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        onResizeStart={() => setIsDragging(true)}
        onResizeStop={() => setIsDragging(false)}
        isDraggable={true}
        isResizable={true}
        resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        preventCollision={false}
        compactType="vertical"
      >
        {visibleWidgets.map((widget) => (
          <div key={widget.id} className="h-full">
            {widget.component}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}