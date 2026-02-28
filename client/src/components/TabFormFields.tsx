/**
 * Shared form fields used in both the "Create Tab" and "Edit Tab" dialogs.
 */
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { WidgetConfig } from "./ResponsiveLayout";

interface TabFormFieldsProps {
  name: string;
  description: string;
  selectedWidgets: string[];
  availableWidgets: WidgetConfig[];
  /** Prefix for checkbox ids to avoid conflicts when two dialogs are mounted */
  idPrefix?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onWidgetToggle: (widgetId: string, checked: boolean) => void;
}

export default function TabFormFields({
  name,
  description,
  selectedWidgets,
  availableWidgets,
  idPrefix = "",
  onNameChange,
  onDescriptionChange,
  onWidgetToggle,
}: TabFormFieldsProps) {
  const widgetsByCategory = availableWidgets.reduce<Record<string, WidgetConfig[]>>(
    (acc, widget) => {
      const category = widget.category ?? "other";
      (acc[category] ??= []).push(widget);
      return acc;
    },
    {}
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Tab Name *</label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter tab name"
            data-testid="input-tab-name"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <Input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Optional description"
            data-testid="input-tab-description"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-3 block">Select Widgets</label>
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {Object.entries(widgetsByCategory).map(([category, widgets]) => (
            <div key={category}>
              <h4 className="text-sm font-medium capitalize text-muted-foreground mb-2">
                {category}
              </h4>
              <div className="space-y-2 pl-4">
                {widgets.map((widget) => (
                  <div key={widget.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${idPrefix}widget-${widget.id}`}
                      checked={selectedWidgets.includes(widget.id)}
                      onCheckedChange={(checked) =>
                        onWidgetToggle(widget.id, checked as boolean)
                      }
                      data-testid={`checkbox-widget-${idPrefix}${widget.id}`}
                    />
                    <label
                      htmlFor={`${idPrefix}widget-${widget.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {widget.title}
                    </label>
                    <Badge variant="outline" className="text-xs">
                      {widget.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
