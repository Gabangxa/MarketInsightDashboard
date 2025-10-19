import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AlertConfig {
  id: string;
  type: "price" | "keyword";
  exchanges: string[];
  symbol?: string;
  condition?: string;
  value?: string;
  keyword?: string;
}

interface AlertConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: AlertConfig) => void;
}

const EXCHANGES = ["Binance", "Bybit", "OKX"];

export default function AlertConfigPanel({ isOpen, onClose, onSave }: AlertConfigPanelProps) {
  const [alertType, setAlertType] = useState<"price" | "keyword">("price");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [condition, setCondition] = useState(">");
  const [value, setValue] = useState("");
  const [keyword, setKeyword] = useState("");

  const toggleExchange = (exchange: string) => {
    setSelectedExchanges(prev =>
      prev.includes(exchange)
        ? prev.filter(e => e !== exchange)
        : [...prev, exchange]
    );
  };

  const handleSave = () => {
    // Validation
    if (selectedExchanges.length === 0) {
      alert("Please select at least one exchange");
      return;
    }

    if (alertType === "price") {
      if (!symbol.trim()) {
        alert("Please enter a symbol");
        return;
      }
      if (!value.trim() || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
        alert("Please enter a valid positive number for price value");
        return;
      }
    } else {
      if (!keyword.trim()) {
        alert("Please enter a keyword");
        return;
      }
    }

    const config: any = {
      type: alertType,
      exchanges: selectedExchanges,
      ...(alertType === "price" ? { symbol, condition, value: value } : { keyword })
    };
    onSave?.(config);
    onClose();
  };

  console.log('[AlertConfigPanel] Render - isOpen:', isOpen);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="alert-config-panel">
        <DialogHeader>
          <DialogTitle>Configure Alert</DialogTitle>
          <DialogDescription>
            Set up price or keyword alerts for crypto markets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="alert-type" className="text-sm font-medium mb-2 block">
              Alert Type
            </Label>
            <Select value={alertType} onValueChange={(v) => setAlertType(v as "price" | "keyword")}>
              <SelectTrigger id="alert-type" data-testid="select-alert-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price Alert</SelectItem>
                <SelectItem value="keyword">Keyword Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Monitor Exchanges
            </Label>
            <div className="space-y-2">
              {EXCHANGES.map((exchange) => (
                <div key={exchange} className="flex items-center gap-2">
                  <Checkbox
                    id={`exchange-${exchange}`}
                    checked={selectedExchanges.includes(exchange)}
                    onCheckedChange={() => toggleExchange(exchange)}
                    data-testid={`checkbox-exchange-${exchange.toLowerCase()}`}
                  />
                  <Label
                    htmlFor={`exchange-${exchange}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {exchange}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {alertType === "price" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="symbol" className="text-sm font-medium mb-2 block">
                  Symbol
                </Label>
                <Input
                  id="symbol"
                  placeholder="e.g. BTCUSDT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  data-testid="input-symbol"
                />
              </div>

              <div>
                <Label htmlFor="condition" className="text-sm font-medium mb-2 block">
                  Condition
                </Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="condition" data-testid="select-condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Greater than (&gt;)</SelectItem>
                    <SelectItem value="<">Less than (&lt;)</SelectItem>
                    <SelectItem value=">=">Greater or equal (&gt;=)</SelectItem>
                    <SelectItem value="<=">Less or equal (&lt;=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price-value" className="text-sm font-medium mb-2 block">
                  Price Value
                </Label>
                <Input
                  id="price-value"
                  type="number"
                  placeholder="e.g. 65000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  data-testid="input-price-value"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="keyword" className="text-sm font-medium mb-2 block">
                Keyword
              </Label>
              <Input
                id="keyword"
                placeholder="e.g. breakout"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                data-testid="input-keyword"
              />
            </div>
          )}

        </div>

        <Button
          className="w-full"
          onClick={handleSave}
          data-testid="button-save-alert"
        >
          Save Alert
        </Button>
      </DialogContent>
    </Dialog>
  );
}
