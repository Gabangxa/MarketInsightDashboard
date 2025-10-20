// Webhook payload parser for displaying human-readable messages

export interface ParsedWebhook {
  type: 'blockchain_transfer' | 'alert' | 'simple';
  displayMessage: string;
  details?: {
    label: string;
    value: string;
  }[];
  rawPayload?: any;
}

// Parse blockchain transfer webhooks
function parseBlockchainTransfer(payload: any): ParsedWebhook | null {
  const transfer = payload.transfer;
  if (!transfer) return null;

  const fromName = transfer.fromAddress?.arkhamLabel?.name || 
                   transfer.fromAddress?.arkhamEntity?.name ||
                   transfer.fromAddress?.address?.slice(0, 10) || 'Unknown';
  
  const toName = transfer.toAddress?.arkhamLabel?.name || 
                 transfer.toAddress?.arkhamEntity?.name ||
                 transfer.toAddress?.address?.slice(0, 10) || 'Unknown';

  const amount = transfer.unitValue ? Number(transfer.unitValue).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }) : '';
  
  const symbol = transfer.tokenSymbol || transfer.tokenName || 'tokens';
  
  const usdValue = transfer.historicalUSD ? `$${Number(transfer.historicalUSD).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}` : '';

  const displayMessage = `${fromName} → ${toName}: ${amount} ${symbol}${usdValue ? ` (${usdValue})` : ''}`;

  const details: { label: string; value: string }[] = [];

  if (transfer.chain) {
    details.push({ label: 'Chain', value: transfer.chain });
  }

  if (transfer.blockTimestamp) {
    const date = new Date(transfer.blockTimestamp);
    details.push({ 
      label: 'Time', 
      value: date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    });
  }

  if (transfer.transactionHash) {
    details.push({ 
      label: 'Tx Hash', 
      value: transfer.transactionHash.slice(0, 10) + '...' 
    });
  }

  if (transfer.fromAddress?.arkhamEntity?.name) {
    details.push({ 
      label: 'From Entity', 
      value: transfer.fromAddress.arkhamEntity.name 
    });
  }

  if (transfer.toAddress?.arkhamEntity?.name) {
    details.push({ 
      label: 'To Entity', 
      value: transfer.toAddress.arkhamEntity.name 
    });
  }

  if (transfer.tokenName && transfer.tokenSymbol) {
    details.push({ 
      label: 'Token', 
      value: `${transfer.tokenName} (${transfer.tokenSymbol})` 
    });
  }

  if (transfer.blockNumber) {
    details.push({ 
      label: 'Block', 
      value: transfer.blockNumber.toString() 
    });
  }

  return {
    type: 'blockchain_transfer',
    displayMessage,
    details,
    rawPayload: payload,
  };
}

// Parse generic alert webhooks
function parseAlert(payload: any): ParsedWebhook | null {
  if (!payload.alertName && !payload.alert) return null;

  const alertName = payload.alertName || payload.alert?.name || 'Alert';
  const message = payload.message || payload.alert?.message || 'Alert triggered';
  
  const displayMessage = `[${alertName}] ${message}`;

  const details: { label: string; value: string }[] = [];

  if (payload.id) {
    details.push({ label: 'Alert ID', value: payload.id.toString() });
  }

  // Add any other relevant fields from the payload
  Object.keys(payload).forEach(key => {
    if (key !== 'alertName' && key !== 'alert' && key !== 'message' && key !== 'id' && 
        (typeof payload[key] === 'string' || typeof payload[key] === 'number')) {
      details.push({ 
        label: key.charAt(0).toUpperCase() + key.slice(1), 
        value: payload[key].toString() 
      });
    }
  });

  return {
    type: 'alert',
    displayMessage,
    details,
    rawPayload: payload,
  };
}

// Main parser function
export function parseWebhookPayload(
  source: string,
  message: string,
  payload: any
): ParsedWebhook {
  // If there's no payload, it's a simple message
  if (!payload || Object.keys(payload).length === 0) {
    return {
      type: 'simple',
      displayMessage: message,
    };
  }

  // Try to parse as blockchain transfer
  const transferParsed = parseBlockchainTransfer(payload);
  if (transferParsed) {
    return transferParsed;
  }

  // Try to parse as alert
  const alertParsed = parseAlert(payload);
  if (alertParsed) {
    return alertParsed;
  }

  // Fallback: try to create a readable summary from the payload
  const keys = Object.keys(payload);
  if (keys.length > 0) {
    // Use the first few meaningful fields
    const summaryParts: string[] = [];
    
    for (const key of keys.slice(0, 3)) {
      const value = payload[key];
      if (typeof value === 'string' || typeof value === 'number') {
        summaryParts.push(`${key}: ${value}`);
      }
    }

    if (summaryParts.length > 0) {
      return {
        type: 'simple',
        displayMessage: summaryParts.join(' • '),
        details: keys.map(key => ({
          label: key.charAt(0).toUpperCase() + key.slice(1),
          value: typeof payload[key] === 'object' 
            ? JSON.stringify(payload[key], null, 2)
            : String(payload[key])
        })),
        rawPayload: payload,
      };
    }
  }

  // Ultimate fallback
  return {
    type: 'simple',
    displayMessage: message || 'Webhook received',
    rawPayload: payload,
  };
}
