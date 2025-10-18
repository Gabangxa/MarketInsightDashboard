import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface MarketDataConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExchanges: string[];
  onExchangesChange: (exchanges: string[]) => void;
}

const AVAILABLE_EXCHANGES = ["Bybit", "OKX"];

export default function MarketDataConfigModal({
  isOpen,
  onClose,
  selectedExchanges,
  onExchangesChange,
}: MarketDataConfigModalProps) {
  const handleExchangeToggle = (exchange: string, checked: boolean) => {
    if (checked) {
      onExchangesChange([...selectedExchanges, exchange]);
    } else {
      onExchangesChange(selectedExchanges.filter(e => e !== exchange));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="modal-market-config">
        <DialogHeader>
          <DialogTitle>Market Data Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
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
