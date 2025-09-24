import { useState, useEffect } from "react";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter,
  Calendar,
  Search,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Users,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface TransactionRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  reference: string;
  description: string;
  transaction_type: string;
  created_at: string;
}

interface UserStats {
  total_earnings: number;
  personal_wallet_balance: number;
  income_wallet_balance: number;
  tasks_completed_today: number;
  daily_task_limit: number;
  vip_level: string;
  referral_count: number;
}

export const Records = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!dbUserId) return;

    const channel = supabase
      .channel('records-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${dbUserId}`
      }, () => {
        fetchUserData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${dbUserId}`
      }, () => {
        fetchUserData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dbUserId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get internal user ID
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (dbUser) {
        setDbUserId(dbUser.id);
        
        // Fetch user stats
        const { data: userData } = await supabase
          .from('users')
          .select(`
            total_earnings,
            personal_wallet_balance,
            income_wallet_balance,
            tasks_completed_today,
            daily_task_limit,
            vip_level,
            referral_count
          `)
          .eq('id', dbUser.id)
          .single();

        if (userData) {
          setUserStats(userData as UserStats);
        }

        // Fetch all transactions
        const { data: transactionsData, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', dbUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching transactions:', error);
          toast({
            title: "Error",
            description: "Failed to fetch transaction records",
            variant: "destructive"
          });
          return;
        }

        // Process transactions
        const processedTransactions = (transactionsData || []).map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          date: new Date(transaction.created_at).toLocaleDateString(),
          method: getTransactionMethod(transaction.transaction_type),
          status: transaction.status,
          reference: transaction.reference_id || transaction.id.substring(0, 8),
          description: transaction.description,
          transaction_type: transaction.transaction_type,
          created_at: transaction.created_at
        }));

        setTransactions(processedTransactions);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionMethod = (type: string): string => {
    const methods: Record<string, string> = {
      'deposit': 'Bank Transfer',
      'recharge': 'Easypaisa',
      'withdrawal': 'Withdrawal',
      'task_reward': 'Task Completion',
      'vip_activation': 'VIP Activation',
      'referral_bonus': 'Referral Bonus',
      'admin_bonus': 'Admin Bonus'
    };
    return methods[type] || type;
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'recharge':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'task_reward':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'vip_activation':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'referral_bonus':
        return <Users className="w-4 h-4 text-orange-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status.toLowerCase() === statusFilter.toLowerCase();
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const transactionDate = new Date(transaction.created_at);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = transactionDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const rechargeRecords = filteredTransactions.filter(t => 
    t.transaction_type === 'deposit' || t.transaction_type === 'recharge'
  );
  const withdrawalRecords = filteredTransactions.filter(t => 
    t.transaction_type === 'withdrawal'
  );
  const taskRecords = filteredTransactions.filter(t => 
    t.transaction_type === 'task_reward'
  );
  const otherRecords = filteredTransactions.filter(t => 
    !['deposit', 'recharge', 'withdrawal', 'task_reward'].includes(t.transaction_type)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <LoadingSpinner 
          size="lg" 
          text="Loading records..." 
          className="text-primary-foreground"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-foreground">Records & Statistics</h1>
          <Button
            onClick={fetchUserData}
            variant="outline"
            size="sm"
            className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* User Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rs. {userStats.total_earnings.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All time earnings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Personal Wallet</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rs. {userStats.personal_wallet_balance.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Available balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Income Wallet</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rs. {userStats.income_wallet_balance.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Task earnings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.tasks_completed_today}/{userStats.daily_task_limit}</div>
                <p className="text-xs text-muted-foreground">{userStats.vip_level} level</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({filteredTransactions.length})</TabsTrigger>
            <TabsTrigger value="recharge">Recharge ({rechargeRecords.length})</TabsTrigger>
            <TabsTrigger value="withdrawal">Withdrawal ({withdrawalRecords.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({taskRecords.length})</TabsTrigger>
            <TabsTrigger value="other">Other ({otherRecords.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <TransactionList transactions={filteredTransactions} />
          </TabsContent>

          <TabsContent value="recharge" className="space-y-4">
            <TransactionList transactions={rechargeRecords} />
          </TabsContent>

          <TabsContent value="withdrawal" className="space-y-4">
            <TransactionList transactions={withdrawalRecords} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <TransactionList transactions={taskRecords} />
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <TransactionList transactions={otherRecords} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface TransactionListProps {
  transactions: TransactionRecord[];
}

const TransactionList = ({ transactions }: TransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No transactions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-100 rounded-full">
                  {getTransactionIcon(transaction.transaction_type)}
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.method} • {transaction.date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ref: {transaction.reference}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.transaction_type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {transaction.transaction_type === 'withdrawal' ? '-' : '+'}Rs. {transaction.amount.toFixed(2)}
                </p>
                <Badge className={getStatusColor(transaction.status)}>
                  {transaction.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'deposit':
    case 'recharge':
      return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
    case 'withdrawal':
      return <ArrowUpRight className="w-4 h-4 text-red-600" />;
    case 'task_reward':
      return <Target className="w-4 h-4 text-blue-600" />;
    case 'vip_activation':
      return <TrendingUp className="w-4 h-4 text-purple-600" />;
    case 'referral_bonus':
      return <Users className="w-4 h-4 text-orange-600" />;
    default:
      return <DollarSign className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
