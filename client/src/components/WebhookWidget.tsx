import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Clock, Bookmark as BookmarkIcon, Copy, Check, Info, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { parseWebhookPayload } from "@/lib/webhookParser";

export interface WebhookMessage {
  id: string;
  source: string;
  message: string;
  timestamp: Date;
  bookmarked: boolean;
  payload?: any;
}

interface WebhookWidgetProps {
  messages: WebhookMessage[];
  onToggleBookmark?: (id: string) => void;
}

export default function WebhookWidget({ messages, onToggleBookmark }: WebhookWidgetProps) {
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // Get the webhook URL
  const webhookUrl = `${window.location.origin}/api/webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getTimeFilteredMessages = () => {
    const now = new Date();
    return messages.filter((msg) => {
      if (timeFilter === "all") return true;
      const msgTime = new Date(msg.timestamp);
      const diffHours = (now.getTime() - msgTime.getTime()) / (1000 * 60 * 60);
      
      switch (timeFilter) {
        case "1h": return diffHours <= 1;
        case "12h": return diffHours <= 12;
        case "24h": return diffHours <= 24;
        default: return true;
      }
    });
  };

  const filteredMessages = getTimeFilteredMessages()
    .filter(msg => showBookmarked ? msg.bookmarked : true)
    .filter(msg => 
      keywordFilter.trim() === "" || 
      msg.message.toLowerCase().includes(keywordFilter.toLowerCase()) ||
      msg.source.toLowerCase().includes(keywordFilter.toLowerCase())
    );

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-webhook">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4 widget-drag-handle cursor-move">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Webhook Messages
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowWebhookInfo(!showWebhookInfo)}
            className="h-7 text-xs gap-1"
            data-testid="button-toggle-webhook-info"
          >
            <Info className="h-3 w-3" />
            Setup
          </Button>
        </div>

        <Collapsible open={showWebhookInfo} onOpenChange={setShowWebhookInfo}>
          <CollapsibleContent className="mb-4">
            <div className="bg-accent/20 border border-accent/40 rounded-md p-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Send POST requests to this URL:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-background border border-border rounded px-3 py-2 text-xs font-mono break-all">
                    {webhookUrl}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyWebhookUrl}
                    className="h-9 w-9 flex-shrink-0"
                    data-testid="button-copy-webhook-url"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Expected JSON payload:
                </p>
                <code className="block bg-background border border-border rounded px-3 py-2 text-xs font-mono">
                  {`{\n  "source": "MyService",\n  "message": "Your message here"\n}`}
                </code>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Example cURL command:
                </p>
                <code className="block bg-background border border-border rounded px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all">
                  {`curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"source":"Test","message":"Hello!"}'`}
                </code>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={timeFilter === "all" ? "default" : "outline"}
              onClick={() => setTimeFilter("all")}
              className="text-xs"
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={timeFilter === "1h" ? "default" : "outline"}
              onClick={() => setTimeFilter("1h")}
              className="text-xs"
              data-testid="filter-1h"
            >
              1h
            </Button>
            <Button
              size="sm"
              variant={timeFilter === "12h" ? "default" : "outline"}
              onClick={() => setTimeFilter("12h")}
              className="text-xs"
              data-testid="filter-12h"
            >
              12h
            </Button>
            <Button
              size="sm"
              variant={timeFilter === "24h" ? "default" : "outline"}
              onClick={() => setTimeFilter("24h")}
              className="text-xs"
              data-testid="filter-24h"
            >
              24h
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                className="pl-9 h-9"
                data-testid="input-search-webhook"
              />
            </div>
            <Button
              size="icon"
              variant={showBookmarked ? "default" : "outline"}
              onClick={() => setShowBookmarked(!showBookmarked)}
              className="h-9 w-9"
              data-testid="button-filter-bookmarked"
            >
              <BookmarkIcon className={cn("h-4 w-4", showBookmarked && "fill-current")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-2 min-h-0" data-testid="webhook-messages-list">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No messages found
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const parsed = parseWebhookPayload(msg.source, msg.message, msg.payload);
            const isExpanded = expandedMessages.has(msg.id);
            const hasDetails = parsed.details && parsed.details.length > 0;

            return (
              <div
                key={msg.id}
                className="p-3 bg-accent/30 rounded-lg border-l-4 border-primary relative group hover-elevate"
                data-testid={`webhook-message-${msg.id}`}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onToggleBookmark?.(msg.id)}
                  className={cn(
                    "absolute top-2 right-2 h-6 w-6",
                    msg.bookmarked && "text-bookmark"
                  )}
                  data-testid={`button-bookmark-${msg.id}`}
                >
                  <Star className={cn("h-3 w-3", msg.bookmarked && "fill-current")} />
                </Button>
                
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {msg.source}
                  </Badge>
                  {parsed.type === 'blockchain_transfer' && (
                    <Badge variant="default" className="text-xs bg-primary/20 text-primary border-primary/40">
                      Transfer
                    </Badge>
                  )}
                  {parsed.type === 'alert' && (
                    <Badge variant="default" className="text-xs bg-destructive/20 text-destructive border-destructive/40">
                      Alert
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-8">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono">
                      {format(new Date(msg.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                </div>
                
                <div className="pr-8">
                  <p className={cn(
                    "text-sm text-foreground",
                    !isExpanded && "line-clamp-2"
                  )}>
                    {parsed.displayMessage}
                  </p>

                  {hasDetails && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleMessageExpanded(msg.id)}
                        className="h-6 px-2 text-xs gap-1 -ml-2"
                        data-testid={`button-expand-${msg.id}`}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3" />
                            Show Details
                          </>
                        )}
                      </Button>

                      {isExpanded && parsed.details && (
                        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-border" data-testid={`details-${msg.id}`}>
                          {parsed.details.map((detail, idx) => (
                            <div key={idx} className="flex gap-2 text-xs">
                              <span className="text-muted-foreground font-medium min-w-[80px]">
                                {detail.label}:
                              </span>
                              <span className="text-foreground font-mono break-all">
                                {detail.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
