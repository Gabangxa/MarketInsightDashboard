import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <DialogContent className="sm:max-w-md" data-testid="modal-orderbook-config">
        <DialogHeader>
          <DialogTitle>Order Book Settings</DialogTitle>
          <DialogDescription>
            Customize the order book view and data sources
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="view-mode" className="text-sm font-medium mb-2 block">View Mode</Label>
            <Select value={viewMode} onValueChange={(value: "both" | "bids" | "asks") => onViewModeChange(value)}>
              <SelectTrigger id="view-mode" data-testid="select-view-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both" data-testid="radio-view-both">Both Sides</SelectItem>
                <SelectItem value="bids" data-testid="radio-view-bids">Bids Only</SelectItem>
                <SelectItem value="asks" data-testid="radio-view-asks">Asks Only</SelectItem>
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

          <Button onClick={onClose} className="w-full" data-testid="button-save-config">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
