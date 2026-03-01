import React, { useState, useRef, useEffect } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Grid,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Wand2,
  X,
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
  category: 'trading' | 'data' | 'alerts' | 'analytics' | 'other';
  isVisible?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface ResponsiveLayoutProps {
  widgets: WidgetConfig[];
  initialLayout?: { [key: string]: Layout[] };
  onLayoutChange?: (layouts: { [key: string]: Layout[] }) => void;
  onSaveLayout?: () => void;
  onRemoveWidget?: (widgetId: string) => void;
  className?: string;
  isEditable?: boolean;
  tabId?: string;
}

const BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

const COLS = {
  lg: 12,
  md: 12,
  sm: 12,
  xs: 12,
  xxs: 12,
};

/**
 * Row-shelf bin-packing: places widgets left-to-right, wrapping to the next
 * row only when the current row is full. Correctly tracks the max height of
 * each completed row so widgets never overlap.
 */
function packWidgets(
  widgets: WidgetConfig[],
  maxCols: number,
  getSize: (w: WidgetConfig) => { w: number; h: number }
): Layout[] {
  const result: Layout[] = [];
  let currentX = 0;
  let currentY = 0;
  let rowMaxH = 0;

  widgets.forEach((widget) => {
    const { w, h } = getSize(widget);
    const clampedW = Math.min(w, maxCols);

    if (currentX + clampedW > maxCols) {
      currentY += rowMaxH; // advance by the tallest widget on the completed row
      currentX = 0;
      rowMaxH = 0;
    }

    result.push({
      i: widget.id,
      x: currentX,
      y: currentY,
      w: clampedW,
      h,
      minW: widget.defaultSize.minW ?? 2,
      minH: widget.defaultSize.minH ?? 2,
    });

    currentX += clampedW;
    rowMaxH = Math.max(rowMaxH, h);
  });

  return result;
}

/**
 * Generates fresh default layouts for all breakpoints.
 * High-priority widgets are placed first; within the same priority, larger
 * widgets come first so they anchor the top rows.
 */
function generateDefaultLayouts(widgets: WidgetConfig[]): { [key: string]: Layout[] } {
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const sorted = [...widgets.filter((w) => w.isVisible !== false)].sort((a, b) => {
    const pd =
      (PRIORITY_ORDER[a.priority ?? 'medium'] ?? 1) -
      (PRIORITY_ORDER[b.priority ?? 'medium'] ?? 1);
    if (pd !== 0) return pd;
    // Larger area first within same priority
    return (
      b.defaultSize.w * b.defaultSize.h - a.defaultSize.w * a.defaultSize.h
    );
  });

  return {
    lg: packWidgets(sorted, 12, (w) => ({
      w: w.defaultSize.w,
      h: w.defaultSize.h,
    })),
    md: packWidgets(sorted, 12, (w) => ({
      w: Math.min(w.defaultSize.w, 6),
      h: w.defaultSize.h,
    })),
    sm: packWidgets(sorted, 12, (w) => ({
      w: 12,
      h: Math.min(w.defaultSize.h, 8),
    })),
    xs: packWidgets(sorted, 12, (w) => ({
      w: 12,
      h: Math.min(w.defaultSize.h, 6),
    })),
    xxs: packWidgets(sorted, 12, (w) => ({
      w: 12,
      h: Math.min(w.defaultSize.h, 6),
    })),
  };
}

/**
 * Re-flows the current layout to eliminate gaps.
 * Preserves the user's left-to-right, top-to-bottom visual order and each
 * widget's current width/height, then re-packs without gaps.
 */
function autoArrangeLayouts(
  currentLayouts: { [key: string]: Layout[] },
  widgets: WidgetConfig[]
): { [key: string]: Layout[] } {
  const lgLayout = currentLayouts.lg ?? [];

  // Keep the user's current visual order (top-to-bottom, left-to-right)
  const ordered = [...widgets.filter((w) => w.isVisible !== false)].sort((a, b) => {
    const la = lgLayout.find((l) => l.i === a.id);
    const lb = lgLayout.find((l) => l.i === b.id);
    if (!la || !lb) return 0;
    return la.y !== lb.y ? la.y - lb.y : la.x - lb.x;
  });

  return {
    lg: packWidgets(ordered, 12, (w) => {
      const saved = lgLayout.find((l) => l.i === w.id);
      return {
        w: saved?.w ?? w.defaultSize.w,
        h: saved?.h ?? w.defaultSize.h,
      };
    }),
    md: packWidgets(ordered, 12, (w) => ({
      w: Math.min(w.defaultSize.w, 6),
      h: w.defaultSize.h,
    })),
    sm: packWidgets(ordered, 12, (w) => ({
      w: 12,
      h: Math.min(w.defaultSize.h, 8),
    })),
    xs: packWidgets(ordered, 12, (w) => ({
      w: 12,
      h: Math.min(w.defaultSize.h, 6),
    })),
    xxs: packWidgets(ordered, 12, (w) => ({
      w: 12,
      h: Math.min(w.defaultSize.h, 6),
    })),
  };
}

/** Merge a saved layout with freshly generated defaults (handles new widgets). */
function mergeLayouts(
  savedLayouts: { [key: string]: Layout[] } | undefined,
  defaultLayouts: { [key: string]: Layout[] },
  widgets: WidgetConfig[]
): { [key: string]: Layout[] } {
  if (!savedLayouts) return defaultLayouts;

  const visibleIds = widgets.filter((w) => w.isVisible !== false).map((w) => w.id);
  const merged: { [key: string]: Layout[] } = {};

  Object.keys(defaultLayouts).forEach((bp) => {
    const savedLayout = savedLayouts[bp] ?? [];
    const defaultLayout = defaultLayouts[bp] ?? [];
    const savedMap = new Map(savedLayout.map((l) => [l.i, l]));

    merged[bp] = visibleIds.map(
      (id) => savedMap.get(id) ?? defaultLayout.find((l) => l.i === id)!
    ).filter(Boolean);
  });

  return merged;
}

export default function ResponsiveLayout({
  widgets,
  initialLayout,
  onLayoutChange,
  onSaveLayout,
  onRemoveWidget,
  className,
  isEditable = false,
  tabId,
}: ResponsiveLayoutProps) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [isDragging, setIsDragging] = useState(false);
  const currentTabIdRef = useRef<string | undefined>(tabId);

  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>(() => {
    currentTabIdRef.current = tabId;
    const defaults = generateDefaultLayouts(widgets);
    return mergeLayouts(initialLayout, defaults, widgets);
  });

  // Reload only on actual tab switches, not on in-tab saves
  useEffect(() => {
    if (currentTabIdRef.current !== tabId) {
      currentTabIdRef.current = tabId;
      const defaults = generateDefaultLayouts(widgets);
      setLayouts(mergeLayouts(initialLayout, defaults, widgets));
    }
  }, [tabId, widgets, initialLayout]);

  const handleLayoutChange = (
    _layout: Layout[],
    allLayouts: { [key: string]: Layout[] }
  ) => {
    setLayouts(allLayouts);
    onLayoutChange?.(allLayouts);
  };

  const handleReset = () => {
    const fresh = generateDefaultLayouts(widgets);
    setLayouts(fresh);
    onLayoutChange?.(fresh);
  };

  const handleAutoArrange = () => {
    const arranged = autoArrangeLayouts(layouts, widgets);
    setLayouts(arranged);
    onLayoutChange?.(arranged);
  };

  const getBreakpointIcon = (bp: string) => {
    if (bp === 'xxs' || bp === 'xs') return <Smartphone className="h-3 w-3" />;
    if (bp === 'sm' || bp === 'md') return <Tablet className="h-3 w-3" />;
    return <Monitor className="h-3 w-3" />;
  };

  const visibleWidgets = widgets.filter((w) => w.isVisible !== false);

  return (
    <div className={cn('relative pb-8', className)}>
      {isEditable && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 bg-accent/10 border border-dashed border-primary/30 rounded-md">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1.5"
              data-testid="badge-current-breakpoint"
            >
              {getBreakpointIcon(currentBreakpoint)}
              <span className="uppercase font-mono text-xs">{currentBreakpoint}</span>
              <span className="text-muted-foreground">
                {COLS[currentBreakpoint as keyof typeof COLS]} cols
              </span>
            </Badge>

            {isDragging && (
              <Badge variant="default" className="gap-1" data-testid="badge-arranging">
                <Grid className="h-3 w-3" />
                Arranging
              </Badge>
            )}

            <span className="text-xs text-muted-foreground hidden sm:inline">
              Drag header to move • Drag any corner to resize
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoArrange}
              className="gap-1.5 h-7"
              data-testid="button-auto-arrange"
              title="Re-flow widgets to fill gaps automatically"
            >
              <Wand2 className="h-3 w-3" />
              <span className="hidden sm:inline">Auto-arrange</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 h-7"
              data-testid="button-reset-layout"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>
      )}

      <div className={cn(isEditable ? 'layout-editable' : '')}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={50}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={setCurrentBreakpoint}
          onDragStart={() => setIsDragging(true)}
          onDragStop={() => setIsDragging(false)}
          onResizeStart={() => setIsDragging(true)}
          onResizeStop={() => setIsDragging(false)}
          isDraggable={isEditable}
          isResizable={isEditable}
          draggableHandle=".widget-drag-handle"
          resizeHandles={['se', 'sw', 'ne', 'nw']}
          margin={[8, 8]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          preventCollision={false}
          compactType="vertical"
        >
          {visibleWidgets.map((widget) => (
            <div key={widget.id} className="h-full relative group/widget">
              {widget.component}
              {isEditable && onRemoveWidget && (
                <button
                  onClick={() => onRemoveWidget(widget.id)}
                  className="absolute top-2 right-2 z-20 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/widget:opacity-100 transition-opacity shadow-md"
                  title={`Remove ${widget.title}`}
                  data-testid={`button-remove-widget-${widget.id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
