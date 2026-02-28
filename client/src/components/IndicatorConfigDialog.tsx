import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, TrendingUp, AlertTriangle, Activity } from "lucide-react";

const TIMEFRAME_OPTIONS = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
  { value: "1M", label: "1 Month" },
];

const PERIOD_OPTIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "1w", label: "1 Week" },
  { value: "1M", label: "1 Month" },
];

const CATEGORY_ICONS = {
  trend: TrendingUp,
  momentum: Activity,
  volatility: AlertTriangle,
};

export interface IndicatorConfig {
  id: string;
  name: string;
  category: "trend" | "momentum" | "volatility" | "volume";
  enabled: boolean;
  description: string;
}

interface IndicatorConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeframe: string;
  period: string;
  indicatorConfigs: IndicatorConfig[];
  defaultIndicators: IndicatorConfig[];
  onTimeframeChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onToggleIndicator: (id: string) => void;
}

const CATEGORIES: Array<{ id: "trend" | "momentum" | "volatility"; name: string }> = [
  { id: "trend", name: "Trend" },
  { id: "momentum", name: "Momentum" },
  { id: "volatility", name: "Volatility" },
];

export default function IndicatorConfigDialog({
  open,
  onOpenChange,
  timeframe,
  period,
  indicatorConfigs,
  defaultIndicators,
  onTimeframeChange,
  onPeriodChange,
  onToggleIndicator,
}: IndicatorConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 relative z-10 pointer-events-auto"
          data-testid="button-configure-indicators"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Technical Indicators</DialogTitle>
          <DialogDescription>
            Select timeframe and indicators to display
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Timeframe (Bar Interval)</Label>
            <Select value={timeframe} onValueChange={onTimeframeChange}>
              <SelectTrigger data-testid="select-timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Historical Period</Label>
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            const categoryIndicators = defaultIndicators.filter(
              (ind) => ind.category === category.id
            );

            return (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">{category.name}</h4>
                </div>
                <div className="space-y-2 pl-6">
                  {categoryIndicators.map((indicator) => {
                    const config = indicatorConfigs.find(
                      (c) => c.id === indicator.id
                    );
                    return (
                      <div
                        key={indicator.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={indicator.id}
                            checked={config?.enabled}
                            onCheckedChange={() =>
                              onToggleIndicator(indicator.id)
                            }
                            data-testid={`checkbox-indicator-${indicator.id}`}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={indicator.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {indicator.name}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {indicator.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator className="mt-3" />
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
