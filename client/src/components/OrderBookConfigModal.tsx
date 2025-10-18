import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface OrderBookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: "both" | "bids" | "asks";
  onViewModeChange: (mode: "both" | "bids" | "asks") => void;
  selectedExchanges: string[];
  onExchangesChange: (exchanges: string[]) => void;
}

const AVAILABLE_EXCHANGES = ["Bybit", "OKX"];

export default function OrderBookConfigModal({
  isOpen,
  onClose,
  viewMode,
  onViewModeChange,
  selectedExchanges,
  onExchangesChange,
}: OrderBookConfigModalProps) {
  const handleExchangeToggle = (exchange: string, checked: boolean) => {
    if (checked) {
      onExchangesChange([...selectedExchanges, exchange]);
    } else {
      onExchangesChange(selectedExchanges.filter(e => e !== exchange));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-2xl p-6 overflow-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-orderbook-config"
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-lg font-semibold">Order Book Settings</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="view-mode" className="text-sm font-medium mb-2 block">View Mode</Label>
            <Select value={viewMode} onValueChange={(value: "both" | "bids" | "asks") => onViewModeChange(value)}>
              <SelectTrigger id="view-mode" data-testid="select-view-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both Sides</SelectItem>
                <SelectItem value="bids">Bids Only</SelectItem>
                <SelectItem value="asks">Asks Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Exchanges</Label>
            <div className="space-y-2">
              {AVAILABLE_EXCHANGES.map((exchange) => (
                <div key={exchange} className="flex items-center gap-2">
                  <Checkbox
                    id={`orderbook-exchange-${exchange}`}
                    checked={selectedExchanges.includes(exchange)}
                    onCheckedChange={(checked) => handleExchangeToggle(exchange, checked as boolean)}
                    data-testid={`checkbox-exchange-${exchange.toLowerCase()}`}
                  />
                  <Label 
                    htmlFor={`orderbook-exchange-${exchange}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {exchange}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={onClose} className="w-full" data-testid="button-close-config">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
