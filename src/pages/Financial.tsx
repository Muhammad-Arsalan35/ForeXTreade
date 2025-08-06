import { useState } from "react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const walletData = [
  {
    title: "Income Wallet",
    balance: "5,855.00",
    change: "+1,240.00 today",
    changeType: "positive" as const
  },
  {
    title: "Personal Wallet", 
    balance: "0.00",
    change: "No transactions",
    changeType: "neutral" as const
  }
];

const transactionHistory = [
  {
    id: 1,
    type: "revenue",
    description: "Income from successful placement transactions",
    amount: "+24,000.00",
    date: "05/08/2025 09:09:36",
    status: "completed"
  },
  {
    id: 2,
    type: "expenditure", 
    description: "Apply for withdrawal",
    amount: "-1,500.00",
    date: "05/08/2025 08:45:12",
    status: "processing"
  },
  {
    id: 3,
    type: "revenue",
    description: "Commission rebate for successful lower-level order placement",
    amount: "+1,080.00", 
    date: "05/08/2025 07:30:25",
    status: "completed"
  },
  {
    id: 4,
    type: "expenditure",
    description: "Job security deposit",
    amount: "-4,000.00",
    date: "04/08/2025 15:22:18",
    status: "completed"
  },
  {
    id: 5,
    type: "expenditure",
    description: "Administrator background deduction",
    amount: "-500.00",
    date: "04/08/2025 12:15:42",
    status: "completed"
  }
];

const earningsBreakdown = [
  {
    category: "Yesterday's earnings",
    amount: "320.00",
    color: "text-primary"
  },
  {
    category: "Today's earnings",
    amount: "450.00", 
    color: "text-success"
  },
  {
    category: "This week's earnings",
    amount: "2,100.00",
    color: "text-primary"
  },
  {
    category: "This month's earnings", 
    amount: "8,750.00",
    color: "text-success"
  },
  {
    category: "Total revenue",
    amount: "35,240.00",
    color: "text-primary-deep"
  },
  {
    category: "Task commission from team",
    amount: "2,340.00",
    color: "text-accent"
  },
  {
    category: "Recommended income",
    amount: "1,890.00",
    color: "text-secondary-deep"
  },
  {
    category: "Job security deposit",
    amount: "5,000.00",
    color: "text-muted-foreground"
  }
];

const withdrawalAmounts = [1500, 4000, 11000, 20000, 90000, 250000, 500000];

export const Financial = () => {
  const [selectedWallet, setSelectedWallet] = useState("income");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("all");

  const filteredTransactions = transactionHistory.filter(transaction => {
    if (filterType === "all") return true;
    return transaction.type === filterType;
  });

  const calculateTax = (amount: number) => {
    // VIP2 employee: 10% tax on income portfolio withdrawals
    return selectedWallet === "income" ? amount * 0.1 : 0;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Financial Records</h1>
        <p className="text-muted-foreground">Manage your earnings and transactions</p>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {walletData.map((wallet, index) => (
          <Card key={index} className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Wallet className="w-8 h-8 text-primary" />
                <Badge variant="outline">PKR</Badge>
              </div>
              <h3 className="text-lg font-semibold mb-2">{wallet.title}</h3>
              <p className="text-3xl font-bold mb-2">{wallet.balance}</p>
              <p className={`text-sm ${
                wallet.changeType === 'positive' ? 'text-success' : 'text-muted-foreground'
              }`}>
                {wallet.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings Dashboard */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
          <p className="text-muted-foreground">Detailed breakdown of your earnings</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {earningsBreakdown.map((earning, index) => (
              <div key={index} className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">{earning.category}</p>
                <p className={`text-xl font-bold ${earning.color}`}>
                  {earning.amount} <span className="text-sm">PKR</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <p className="text-muted-foreground">Revenue vs Expenditure tracking</p>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expenditure">Expenditure</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'revenue' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {transaction.type === 'revenue' ? 
                        <ArrowUpRight className="w-5 h-5" /> : 
                        <ArrowDownLeft className="w-5 h-5" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.type === 'revenue' ? 'text-success' : 'text-destructive'
                    }`}>
                      {transaction.amount} PKR
                    </p>
                    <Badge variant={
                      transaction.status === 'completed' ? 'default' : 
                      transaction.status === 'processing' ? 'secondary' : 'destructive'
                    }>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdraw Tab */}
        <TabsContent value="withdraw">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <p className="text-muted-foreground">Process withdrawal from your wallets</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wallet Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Wallet</label>
                <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income Wallet (5,855.00 PKR)</SelectItem>
                    <SelectItem value="personal">Personal Wallet (0.00 PKR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Withdrawal Amounts */}
              <div>
                <label className="text-sm font-medium mb-3 block">Select Amount (PKR)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {withdrawalAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      onClick={() => setSelectedAmount(amount)}
                      className="h-12"
                    >
                      {amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tax Information */}
              {selectedAmount && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Withdrawal Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>{selectedAmount.toLocaleString()} PKR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxation:</span>
                      <span>{calculateTax(selectedAmount).toFixed(2)} PKR</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>You'll receive:</span>
                      <span>{(selectedAmount - calculateTax(selectedAmount)).toFixed(2)} PKR</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Processing time: 0-72 hours • V-class employees: 10% tax on income portfolio withdrawals
                  </p>
                </div>
              )}

              <Button 
                className="w-full bg-gradient-golden" 
                disabled={!selectedAmount}
              >
                Process Withdrawal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Financial Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Monthly Performance</h4>
                  {/* Simple bar chart representation */}
                  <div className="space-y-3">
                    {[
                      { month: "Jan", amount: 6500 },
                      { month: "Feb", amount: 7200 },
                      { month: "Mar", amount: 8100 },
                      { month: "Apr", amount: 7800 },
                      { month: "May", amount: 8750 }
                    ].map((item) => (
                      <div key={item.month} className="flex items-center space-x-3">
                        <span className="w-8 text-sm">{item.month}</span>
                        <div className="flex-1 bg-muted rounded-full h-3 relative">
                          <div 
                            className="bg-gradient-primary h-3 rounded-full"
                            style={{ width: `${(item.amount / 10000) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-20 text-right">
                          {item.amount.toLocaleString()} PKR
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Income Sources</h4>
                  <div className="space-y-3">
                    {[
                      { source: "Task Completion", percentage: 65, amount: "22,906" },
                      { source: "Team Commission", percentage: 20, amount: "7,048" },
                      { source: "Referral Bonus", percentage: 10, amount: "3,524" },
                      { source: "VIP Benefits", percentage: 5, amount: "1,762" }
                    ].map((item) => (
                      <div key={item.source} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.source}</span>
                          <span>{item.amount} PKR ({item.percentage}%)</span>
                        </div>
                        <div className="bg-muted rounded-full h-2">
                          <div 
                            className="bg-gradient-primary h-2 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};