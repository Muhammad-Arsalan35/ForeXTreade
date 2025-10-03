import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface WalletData {
  title: string;
  balance: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

interface Transaction {
  id: string;
  type: "revenue" | "expenditure";
  description: string;
  amount: string;
  date: string;
  status: string;
}

export const Financial = () => {
  const [walletData, setWalletData] = useState<WalletData[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFinancialData();
  }, []);

  useEffect(() => {
    let walletsChannel: any;
    let transactionsChannel: any;
    let taskCompletionsChannel: any;
    
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Resolve internal user id
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      const internalUserId = dbUser?.id || user.id;

      // Subscribe to real-time updates
      walletsChannel = (supabase as any)
        .channel('wallets-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users', filter: `id=eq.${internalUserId}` },
          () => fetchFinancialData()
        )
        .subscribe();

      transactionsChannel = (supabase as any)
        .channel('transactions-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${internalUserId}` },
          () => fetchFinancialData()
        )
        .subscribe();

      taskCompletionsChannel = (supabase as any)
        .channel('task-completions-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'task_completions', filter: `user_id=eq.${internalUserId}` },
          () => fetchFinancialData()
        )
        .subscribe();
    })();

    return () => {
      try {
        if (walletsChannel) (supabase as any).removeChannel(walletsChannel);
        if (transactionsChannel) (supabase as any).removeChannel(transactionsChannel);
        if (taskCompletionsChannel) (supabase as any).removeChannel(taskCompletionsChannel);
      } catch {}
    };
  }, []);

  const fetchFinancialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Resolve internal user id for relational tables
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, income_wallet_balance, personal_wallet_balance, total_earnings')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      const internalUserId = dbUser?.id || user.id;

      if (!dbUser) {
        // Create a minimal default user row to avoid blocking the UI
        const emailLocal = user.email?.split('@')[0] || 'user';
        const derivedPhone = /\d{5,}/.test(emailLocal) ? emailLocal : '';
        const defaultProfile: any = {
          auth_user_id: user.id,
          full_name: 'User',
          username: emailLocal,
          phone_number: derivedPhone,
          vip_level: 'VIP1',
          referral_code: Math.floor(100000 + Math.random() * 900000).toString(),
          personal_wallet_balance: 0.00,
          income_wallet_balance: 0.00,
          total_earnings: 0.00
        };
        const { error: insertError } = await supabase.from('users').insert(defaultProfile);
        if (insertError) {
          console.error('Error creating default user for financial page:', insertError);
        }
      }

      // Format wallet data
      const wallets = [
        {
          title: "Income Wallet",
          balance: (dbUser.income_wallet_balance || 0).toFixed(2),
          change: "Updated from database",
          changeType: "neutral" as const
        },
        {
          title: "Personal Wallet", 
          balance: (dbUser.personal_wallet_balance || 0).toFixed(2),
          change: "Updated from database",
          changeType: "neutral" as const
        }
      ];
      setWalletData(wallets);

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('user_id', internalUserId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.log('Transactions table not found or error:', transactionsError);
        setTransactionHistory([]);
      } else {
        // Format transactions
        const revenueTypes = new Set([
          'deposit', 'task_reward', 'referral_commission', 'vip_upgrade', 'bonus_reward', 'refund'
        ]);
        
        const formattedTransactions = transactionsData?.map((transaction: any) => ({
          id: transaction.id,
          type: (revenueTypes.has(transaction.transaction_type) ? 'revenue' : 'expenditure') as "revenue" | "expenditure",
          description: transaction.description || transaction.transaction_type,
          amount: `${revenueTypes.has(transaction.transaction_type) ? '+' : '-'}${Number(transaction.amount || 0).toFixed(2)}`,
          date: new Date(transaction.created_at).toLocaleString(),
          status: transaction.status || 'completed'
        })) || [];
        
        setTransactionHistory(formattedTransactions);
      }

      // Calculate earnings breakdown from task_completions
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);

      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      const startOfWeek = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      const fetchTaskSum = async (from: Date, to: Date) => {
        try {
          const { data, error } = await (supabase as any)
            .from('task_completions')
            .select('reward_earned, completed_at')
            .eq('user_id', internalUserId)
            .gte('completed_at', from.toISOString())
            .lte('completed_at', to.toISOString());
          
          if (error) {
            console.log('Task completions table not found, using fallback');
            return 0;
          }
          
          const sum = (data || []).reduce((acc: number, row: any) => acc + (Number(row.reward_earned) || 0), 0);
          return sum;
        } catch (err) {
          console.log('Error fetching task completions:', err);
          return 0;
        }
      };

      const revenueTypesArr = ['deposit','task_reward','referral_commission','vip_upgrade','bonus_reward','refund'];
      const fetchRevenueSum = async (from: Date, to: Date) => {
        try {
          const { data, error } = await (supabase as any)
            .from('transactions')
            .select('amount, transaction_type, status')
            .eq('user_id', internalUserId)
            .in('transaction_type', revenueTypesArr)
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString());
          
          if (error) {
            console.log('Transactions table not found, using fallback');
            return 0;
          }
          
          const sum = (data || []).reduce((acc: number, row: any) => acc + (Number(row.amount) || 0), 0);
          return sum;
        } catch (err) {
          console.log('Error fetching transactions:', err);
          return 0;
        }
      };

      let [todaySum, yesterdaySum, weekSum, monthSum] = await Promise.all([
        fetchTaskSum(startOfDay, endOfDay),
        fetchTaskSum(startOfYesterday, endOfYesterday),
        fetchTaskSum(startOfWeek, endOfDay),
        fetchTaskSum(startOfMonth, endOfDay)
      ]);

      // Fallback to transactions if task-based sums are zero
      if (todaySum === 0) todaySum = await fetchRevenueSum(startOfDay, endOfDay);
      if (yesterdaySum === 0) yesterdaySum = await fetchRevenueSum(startOfYesterday, endOfYesterday);
      if (weekSum === 0) weekSum = await fetchRevenueSum(startOfWeek, endOfDay);
      if (monthSum === 0) monthSum = await fetchRevenueSum(startOfMonth, endOfDay);

      setEarningsBreakdown([
        { category: "Yesterday's earnings", amount: yesterdaySum.toFixed(2), color: "text-primary" },
        { category: "Today's earnings", amount: todaySum.toFixed(2), color: "text-success" },
        { category: "This week's earnings", amount: weekSum.toFixed(2), color: "text-primary" },
        { category: "This month's earnings", amount: monthSum.toFixed(2), color: "text-success" },
        { category: "Total revenue", amount: (dbUser.total_earnings || dbUser.income_wallet_balance || 0).toFixed(2), color: "text-primary-deep" }
      ]);

    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const [filterType, setFilterType] = useState("all");

  const filteredTransactions = transactionHistory.filter(transaction => {
    if (filterType === "all") return true;
    return transaction.type === filterType;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Financial Records</h1>
        <p className="text-muted-foreground">Manage your earnings and transactions</p>
      </div>

      {/* Database Setup Notice */}
      {transactionHistory.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <p className="text-sm text-yellow-800">
                <strong>Database Setup Required:</strong> The task_completions and transactions tables need to be created in your Supabase database. 
                Once set up, your earnings data will be displayed here automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
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
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
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
                ))
              )}
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