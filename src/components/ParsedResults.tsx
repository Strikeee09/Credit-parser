import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  DollarSign,
  Hash,
  TrendingUp,
} from "lucide-react";

export interface ParsedData {
  issuer?: string;
  cardLast4?: string;
  billingCycle?: string;
  paymentDueDate?: string;
  totalBalance?: string;
  transactions?: Array<{
    date: string;
    description: string;
    amount: string;
  }>;
}

interface ParsedResultsProps {
  data: ParsedData;
  fileName: string;
}

export const ParsedResults = ({ data, fileName }: ParsedResultsProps) => {
  const dataPoints = [
    {
      icon: CreditCard,
      label: "Card Issuer",
      value: data.issuer || "Not detected",
      color: "text-primary",
      detected: !!data.issuer,
    },
    {
      icon: Hash,
      label: "Card Last 4 Digits",
      value: data.cardLast4 || "Not detected",
      color: "text-secondary",
      detected: !!data.cardLast4,
    },
    {
      icon: Calendar,
      label: "Billing Cycle",
      value: data.billingCycle || "Not detected",
      color: "text-primary",
      detected: !!data.billingCycle,
    },
    {
      icon: Calendar,
      label: "Payment Due Date",
      value: data.paymentDueDate || "Not detected",
      color: "text-destructive",
      detected: !!data.paymentDueDate,
    },
    {
      icon: DollarSign,
      label: "Total Balance",
      value: data.totalBalance || "Not detected",
      color: "text-secondary",
      detected: !!data.totalBalance,
    },
  ];

  const detectedCount = dataPoints.filter(p => p.detected).length;
  const totalFields = dataPoints.length;
  const completionRate = Math.round((detectedCount / totalFields) * 100);
  const hasTransactions = data.transactions && data.transactions.length > 0;
  
  const getStatusVariant = () => {
    if (completionRate === 100 && hasTransactions) return "default";
    if (completionRate >= 60) return "secondary";
    return "outline";
  };
  
  const getStatusText = () => {
    if (completionRate === 100 && hasTransactions) return "Complete Analysis";
    if (completionRate >= 60) return "Partial Analysis";
    return "Limited Data";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Parsed Results</h2>
        <p className="text-muted-foreground mt-1">From: {fileName}</p>
      </div>
      <div className="text-right">
        <Badge variant={getStatusVariant()} className="px-4 py-2 mb-2">
          <TrendingUp className="w-4 h-4 mr-2" />
          {getStatusText()}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {detectedCount}/{totalFields} fields detected ({completionRate}%)
          {hasTransactions && ` • ${data.transactions?.length} transactions`}
        </p>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataPoints.map((point, index) => (
          <Card
            key={index}
            className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <point.icon className={cn("w-6 h-6", point.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground font-medium">
                  {point.label}
                </p>
                <p className="text-lg font-semibold text-foreground mt-1 truncate">
                  {point.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {data.transactions && data.transactions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {data.transactions.slice(0, 5).map((transaction, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.date}
                  </p>
                </div>
                <p className="font-semibold text-foreground">
                  {transaction.amount}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
