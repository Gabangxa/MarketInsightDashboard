import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { TrendingUp, CandlestickChart, LineChart } from "lucide-react";

interface ChartConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentTimeframe: string;
  currentChartType: "candlestick" | "line";
  onSave: (config: {
    symbol: string;
    timeframe: string;
    chartType: "candlestick" | "line";
  }) => void;
}

export default function ChartConfigModal({
  isOpen,
  onClose,
  currentSymbol,
  currentTimeframe,
  currentChartType,
  onSave,
}: ChartConfigModalProps) {
  const [symbol, setSymbol] = useState(currentSymbol);
  const [timeframe, setTimeframe] = useState(currentTimeframe);
  const [chartType, setChartType] = useState<"candlestick" | "line">(currentChartType);

  const handleSave = () => {
    onSave({ symbol, timeframe, chartType });
    onClose();
  };

  const timeframes = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" },
  ];

  const symbols = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "ADAUSDT",
    "XRPUSDT",
    "DOTUSDT",
    "DOGEUSDT",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-chart-config">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Chart Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your chart display settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger id="symbol" data-testid="select-chart-symbol">
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((sym) => (
                  <SelectItem key={sym} value={sym} data-testid={`option-symbol-${sym}`}>
                    {sym}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger id="timeframe" data-testid="select-chart-timeframe">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value} data-testid={`option-timeframe-${tf.value}`}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chart Type</Label>
            <div className="flex gap-2">
              <Button
                variant={chartType === "candlestick" ? "default" : "outline"}
                onClick={() => setChartType("candlestick")}
                className="flex-1"
                data-testid="button-chart-type-candlestick"
              >
                <CandlestickChart className="h-4 w-4 mr-2" />
                Candlestick
              </Button>
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                onClick={() => setChartType("line")}
                className="flex-1"
                data-testid="button-chart-type-line"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Line
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-chart-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-chart-save">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
