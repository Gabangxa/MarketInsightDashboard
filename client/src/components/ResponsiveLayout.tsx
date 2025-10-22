import { Responsive as ResponsiveGridLayout, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGrid = WidthProvider(ResponsiveGridLayout);

export interface WidgetConfig {
  id: string;
  title: string;
  category: string;
  priority: string;
  defaultSize: { w: number; h: number; minW: number; minH: number };
  component: React.ReactNode;
}

interface ResponsiveLayoutProps {
  widgets: WidgetConfig[];
  onLayoutChange: (layouts: any) => void;
  onSaveLayout?: () => void;
}

export default function ResponsiveLayout({ widgets, onLayoutChange, onSaveLayout }: ResponsiveLayoutProps) {
  // Generate default layouts for different breakpoints
  const generateLayouts = (widgetConfigs: WidgetConfig[]) => {
    const lg = widgetConfigs.map((widget, index) => ({
      i: widget.id,
      x: (index * 4) % 12,
      y: Math.floor((index * 4) / 12) * 3,
      w: widget.defaultSize.w,
      h: widget.defaultSize.h,
      minW: widget.defaultSize.minW,
      minH: widget.defaultSize.minH,
    }));

    const md = widgetConfigs.map((widget, index) => ({
      i: widget.id,
      x: (index * 5) % 10,
      y: Math.floor((index * 5) / 10) * 3,
      w: Math.min(widget.defaultSize.w, 5),
      h: widget.defaultSize.h,
      minW: widget.defaultSize.minW,
      minH: widget.defaultSize.minH,
    }));

    const sm = widgetConfigs.map((widget, index) => ({
      i: widget.id,
      x: 0,
      y: index * (widget.defaultSize.h + 1),
      w: 6,
      h: widget.defaultSize.h,
      minW: widget.defaultSize.minW,
      minH: widget.defaultSize.minH,
    }));

    return { lg, md, sm, xs: sm, xxs: sm };
  };

  const layouts = generateLayouts(widgets);

  return (
    <ResponsiveGrid
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={80}
      isDraggable={true}
      isResizable={true}
      onLayoutChange={(layout, allLayouts) => {
        onLayoutChange(allLayouts);
      }}
      resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="h-full">
          {widget.component}
        </div>
      ))}
    </ResponsiveGrid>
  );
}
