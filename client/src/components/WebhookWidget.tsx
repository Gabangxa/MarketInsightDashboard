import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Clock, Bookmark as BookmarkIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface WebhookMessage {
  id: string;
  source: string;
  message: string;
  timestamp: Date;
  bookmarked: boolean;
}

interface WebhookWidgetProps {
  messages: WebhookMessage[];
  onToggleBookmark?: (id: string) => void;
}

export default function WebhookWidget({ messages, onToggleBookmark }: WebhookWidgetProps) {
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [showBookmarked, setShowBookmarked] = useState(false);

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
    <Card className="p-4 flex flex-col" data-testid="widget-webhook">
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Webhook Messages
        </h3>

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
          filteredMessages.map((msg) => (
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-8">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">
                    {format(new Date(msg.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-foreground pr-8 line-clamp-2">
                {msg.message}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
