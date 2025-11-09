import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertAlertSchema } from "@shared/schema";

export interface AlertConfig {
  id?: string;
  type: "price" | "keyword";
  exchanges: string[];
  symbol?: string;
  condition?: string;
  value?: string;
  keyword?: string;
  maxTriggers?: number | null;
}

interface AlertConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: AlertConfig) => void;
  editingAlert?: AlertConfig | null;
}

const EXCHANGES = ["Binance", "Bybit", "OKX"];

// Extend the base schema with custom validation
const alertFormSchema = insertAlertSchema.extend({
  exchanges: z.array(z.string()).min(1, "Please select at least one exchange"),
  type: z.enum(["price", "keyword"]),
  symbol: z.string().optional(),
  condition: z.string().optional(),
  value: z.string().optional(),
  keyword: z.string().optional(),
  maxTriggers: z.number().int().positive().nullable().optional(),
}).superRefine((data, ctx) => {
  // Price alert validation
  if (data.type === "price") {
    if (!data.symbol || data.symbol.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Symbol is required for price alerts",
        path: ["symbol"],
      });
    }
    if (!data.value || data.value.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Price value is required",
        path: ["value"],
      });
    } else if (isNaN(parseFloat(data.value)) || parseFloat(data.value) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid positive number",
        path: ["value"],
      });
    }
    if (!data.condition) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Condition is required for price alerts",
        path: ["condition"],
      });
    }
  }
  
  // Keyword alert validation
  if (data.type === "keyword") {
    if (!data.keyword || data.keyword.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Keyword is required for keyword alerts",
        path: ["keyword"],
      });
    }
  }
});

type AlertFormValues = z.infer<typeof alertFormSchema>;

export default function AlertConfigPanel({ isOpen, onClose, onSave, editingAlert }: AlertConfigPanelProps) {
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      type: "price",
      exchanges: [],
      symbol: "BTCUSDT",
      condition: ">",
      value: "",
      keyword: "",
      maxTriggers: null,
      userId: "default-user",
    },
  });

  const alertType = form.watch("type");

  // Pre-fill form when editing or reset when creating new
  useEffect(() => {
    if (editingAlert) {
      form.reset({
        type: editingAlert.type,
        exchanges: editingAlert.exchanges || [],
        symbol: editingAlert.symbol || "BTCUSDT",
        condition: editingAlert.condition || ">",
        value: editingAlert.value || "",
        keyword: editingAlert.keyword || "",
        maxTriggers: editingAlert.maxTriggers ?? null,
        userId: "default-user",
      });
    } else if (isOpen) {
      form.reset({
        type: "price",
        exchanges: [],
        symbol: "BTCUSDT",
        condition: ">",
        value: "",
        keyword: "",
        maxTriggers: null,
        userId: "default-user",
      });
    }
  }, [editingAlert, isOpen, form]);

  const handleSubmit = (data: AlertFormValues) => {
    const config: AlertConfig = {
      ...(editingAlert?.id ? { id: editingAlert.id } : {}),
      type: data.type,
      exchanges: data.exchanges,
      maxTriggers: data.maxTriggers,
      ...(data.type === "price" 
        ? { 
            symbol: data.symbol, 
            condition: data.condition, 
            value: data.value 
          } 
        : { keyword: data.keyword }
      )
    };
    
    onSave?.(config);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="alert-config-panel">
        <DialogHeader>
          <DialogTitle>{editingAlert ? "Edit Alert" : "Configure Alert"}</DialogTitle>
          <DialogDescription>
            {editingAlert ? "Update your alert configuration" : "Set up price or keyword alerts for crypto markets"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-alert-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="price">Price Alert</SelectItem>
                      <SelectItem value="keyword">Keyword Alert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exchanges"
              render={() => (
                <FormItem>
                  <FormLabel>Monitor Exchanges</FormLabel>
                  <div className="space-y-2">
                    {EXCHANGES.map((exchange) => (
                      <FormField
                        key={exchange}
                        control={form.control}
                        name="exchanges"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(exchange)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...(field.value || []), exchange]
                                    : field.value?.filter((e) => e !== exchange) || [];
                                  field.onChange(newValue);
                                }}
                                data-testid={`checkbox-exchange-${exchange.toLowerCase()}`}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {exchange}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {alertType === "price" ? (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. BTCUSDT"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-symbol"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-condition">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value=">">Greater than (&gt;)</SelectItem>
                          <SelectItem value="<">Less than (&lt;)</SelectItem>
                          <SelectItem value=">=">Greater or equal (&gt;=)</SelectItem>
                          <SelectItem value="<=">Less or equal (&lt;=)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 65000"
                          {...field}
                          data-testid="input-price-value"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="keyword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keyword</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. breakout"
                        {...field}
                        data-testid="input-keyword"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="maxTriggers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Triggers</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Leave empty for unlimited"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : parseInt(value));
                      }}
                      data-testid="input-max-triggers"
                    />
                  </FormControl>
                  <FormDescription>
                    How many times this alert can trigger. Leave empty for unlimited triggers.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              data-testid="button-save-alert"
            >
              Save Alert
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
