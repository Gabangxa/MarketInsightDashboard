import { useState } from "react";
import { Button } from "@/components/ui/button";
import AlertConfigPanel from '../AlertConfigPanel';

export default function AlertConfigPanelExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Alert Config</Button>
      <AlertConfigPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={(config) => console.log('Alert saved:', config)}
      />
    </div>
  );
}
