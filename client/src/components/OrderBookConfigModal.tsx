import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="modal-orderbook-config">
        <DialogHeader>
          <DialogTitle>Order Book Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="view-mode">View Mode</Label>
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

          <div className="space-y-3">
            <Label>Exchanges</Label>
            {AVAILABLE_EXCHANGES.map((exchange) => (
              <div key={exchange} className="flex items-center space-x-2">
                <Checkbox
                  id={`exchange-${exchange}`}
                  checked={selectedExchanges.includes(exchange)}
                  onCheckedChange={(checked) => handleExchangeToggle(exchange, checked as boolean)}
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

          <Button onClick={onClose} className="w-full" data-testid="button-close-config">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
