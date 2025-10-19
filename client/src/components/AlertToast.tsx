import { Bell, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface AlertToastProps {
  type: "price" | "keyword";
  symbol?: string;
  exchange?: string;
  condition?: string;
  value?: string;
  currentPrice?: number;
  keyword?: string;
  source?: string;
}

export function PriceAlertToast({ 
  symbol, 
  exchange, 
  condition, 
  value, 
  currentPrice 
}: Omit<AlertToastProps, 'type' | 'keyword' | 'source'>) {
  const isUp = condition === ">" || condition === ">=";
  
  return (
    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-md shadow-lg backdrop-blur-sm">
      <div className="flex-shrink-0">
        {isUp ? (
          <TrendingUp className="w-6 h-6 text-red-500" />
        ) : (
          <TrendingDown className="w-6 h-6 text-orange-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="font-semibold text-white text-sm">Price Alert Triggered</h3>
        </div>
        <p className="text-sm text-gray-200 mb-1">
          <span className="font-bold text-white">{symbol}</span> on {exchange}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-300">
            Condition: {condition} ${value}
          </span>
          <span className="text-gray-400">•</span>
          <span className="font-semibold text-white">
            Current: ${currentPrice?.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function KeywordAlertToast({ 
  keyword, 
  source 
}: Omit<AlertToastProps, 'type' | 'symbol' | 'exchange' | 'condition' | 'value' | 'currentPrice'>) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 rounded-md shadow-lg backdrop-blur-sm">
      <div className="flex-shrink-0">
        <Bell className="w-6 h-6 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-white text-sm">Keyword Alert Triggered</h3>
        </div>
        <p className="text-sm text-gray-200 mb-1">
          Found keyword: <span className="font-bold text-white">"{keyword}"</span>
        </p>
        <p className="text-xs text-gray-300">
          Source: {source}
        </p>
      </div>
    </div>
  );
}
