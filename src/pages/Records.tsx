import { useState, useEffect } from "react";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter,
  Calendar,
  Search,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TransactionRecord {
  id: string;
  amount: string;
  date: string;
  method: string;
  status: string;
  reference: string;
  processingTime?: string;
}

export const Records = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [rechargeRecords, setRechargeRecords] = useState<TransactionRecord[]>([]);
  const [withdrawalRecords, setWithdrawalRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactionRecords();
  }, []);

  // Subscribe to real-time changes on withdrawals for this user
  useEffect(() => {
    if (!dbUserId) return;

    const channel = (supabase as unknown as any)
      .channel('withdrawals-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${dbUserId}`
        },
        (payload: any) => {
          // Update list optimistically
          fetchTransactionRecords(false);

          // Show toast when approved
          const newStatus = payload?.new?.status || payload?.record?.status;
          if (newStatus === 'approved') {
            toast({
              title: 'Withdrawal Approved',
              description: 'Your withdrawal has been approved successfully.'
            });
          }
        }
      )
      .subscribe();

    const depositsChannel = (supabase as unknown as any)
      .channel('deposits-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${dbUserId}`
        },
        (payload: any) => {
          fetchTransactionRecords(false);
          const newStatus = payload?.new?.status || payload?.record?.status;
          if (newStatus === 'approved') {
            toast({
              title: 'Deposit Approved',
              description: 'Your deposit has been approved successfully.'
            });
          }
        }
      )
      .subscribe();

    return () => {
      try {
        (supabase as unknown as any).removeChannel(channel);
        (supabase as unknown as any).removeChannel(depositsChannel);
      } catch {}
    };
  }, [dbUserId]);

  const fetchTransactionRecords = async (setId: boolean = true) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      // Resolve internal user id
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      const internalUserId = dbUser?.id || user.id;
      if (setId) setDbUserId(internalUserId);

      // Fetch deposits (recharge records)
      const { data: deposits, error: depositsError } = await supabase
        .from('deposits')
        .select(`
          id,
          amount,
          payment_method,
          status,
          created_at,
          payment_methods!inner(name)
        `)
        .eq('user_id', internalUserId)
        .order('created_at', { ascending: false });

      if (depositsError) {
        console.error('Error fetching deposits:', depositsError);
      } else {
        const formattedDeposits: TransactionRecord[] = deposits?.map(deposit => ({
          id: deposit.id,
          amount: deposit.amount.toString(),
          date: new Date(deposit.created_at).toLocaleString(),
          method: deposit.payment_methods?.name || deposit.payment_method || 'Unknown',
          status: deposit.status === 'approved' ? 'Success' : 
                  deposit.status === 'pending' ? 'Processing' : 
                  deposit.status === 'rejected' ? 'Failed' : deposit.status,
          reference: `DEP${deposit.id.slice(-8).toUpperCase()}`,
          processingTime: deposit.status === 'approved' ? 'Instant' : '1-3 hours'
        })) || [];
        setRechargeRecords(formattedDeposits);
      }

      // Fetch withdrawals
      const { data: withdrawals, error: withdrawalsError } = await (supabase as unknown as any)
        .from('withdrawals')
        .select(`
          id,
          amount,
          payment_method,
          status,
          created_at
        `)
        .eq('user_id', internalUserId)
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
      } else {
        const formattedWithdrawals: TransactionRecord[] = withdrawals?.map(withdrawal => ({
          id: withdrawal.id,
          amount: withdrawal.amount.toString(),
          date: new Date(withdrawal.created_at).toLocaleString(),
          method: withdrawal.payment_method || 'Unknown',
          status: withdrawal.status === 'approved' ? 'Success' : 
                  withdrawal.status === 'pending' ? 'Under Review' : 
                  withdrawal.status === 'rejected' ? 'Failed' : withdrawal.status,
          reference: `WD${withdrawal.id.slice(-8).toUpperCase()}`,
          processingTime: withdrawal.status === 'approved' ? '24-48 hours' : 
                         withdrawal.status === 'pending' ? '24-72 hours' : 'N/A'
        })) || [];
        setWithdrawalRecords(formattedWithdrawals);
      }

    } catch (error) {
      console.error('Error fetching transaction records:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = (records: TransactionRecord[]) => {
    return records.filter(record => {
      const matchesSearch = record.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.amount.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || record.status.toLowerCase() === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'bg-success text-success-foreground';
      case 'processing': return 'bg-secondary text-secondary-foreground'; 
      case 'under review': return 'bg-secondary text-secondary-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTotalAmount = (records: TransactionRecord[], type: 'success' | 'all' = 'all') => {
    const filtered = type === 'success' 
      ? records.filter(r => r.status.toLowerCase() === 'success')
      : records;
    
    return filtered.reduce((sum, record) => sum + parseFloat(record.amount.replace(/,/g, '')), 0);
  };



  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Transaction Records</h1>
          <p className="text-muted-foreground">Loading your transaction history...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">Transaction Records</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactionRecords}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground">Track your recharge and withdrawal history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <ArrowUpRight className="w-8 h-8 mx-auto mb-2 text-success" />
            <p className="text-sm text-muted-foreground">Total Recharged</p>
            <p className="text-xl font-bold text-success">
              {getTotalAmount(rechargeRecords, 'success').toFixed(2)} PKR
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <ArrowDownLeft className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Total Withdrawn</p>
            <p className="text-xl font-bold text-primary">
              {getTotalAmount(withdrawalRecords, 'success').toFixed(2)} PKR
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-secondary-deep" />
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-secondary-deep">
              {(
                rechargeRecords.filter(r => r.status === 'Processing').reduce((sum, r) => sum + parseFloat(r.amount), 0) +
                withdrawalRecords.filter(r => r.status === 'Under Review').reduce((sum, r) => sum + parseFloat(r.amount), 0)
              ).toFixed(2)} PKR
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-accent" />
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-xl font-bold text-accent">
              {(getTotalAmount(rechargeRecords, 'success') - getTotalAmount(withdrawalRecords, 'success')).toFixed(2)} PKR
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recharge" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recharge">Recharge Record</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawal Record</TabsTrigger>
        </TabsList>

        {/* Recharge Records Tab */}
        <TabsContent value="recharge">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                  <CardTitle>Recharge History</CardTitle>
                  <p className="text-muted-foreground">All your deposit transactions</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filterRecords(rechargeRecords).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold">+{record.amount} PKR</p>
                      <p className="text-sm text-muted-foreground">{record.method}</p>
                      <p className="text-xs text-muted-foreground">{record.date}</p>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <Badge className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {record.reference}
                    </p>
                  </div>
                </div>
              ))}
              
              {filterRecords(rechargeRecords).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No records found matching your criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal Records Tab */}
        <TabsContent value="withdrawal">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                  <CardTitle>Withdrawal History</CardTitle>
                  <p className="text-muted-foreground">All your withdrawal transactions</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="under review">Under Review</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filterRecords(withdrawalRecords).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <ArrowDownLeft className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">-{record.amount} PKR</p>
                      <p className="text-sm text-muted-foreground">{record.method}</p>
                      <p className="text-xs text-muted-foreground">{record.date}</p>
                      <p className="text-xs text-muted-foreground">
                        Processing: {record.processingTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <Badge className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {record.reference}
                    </p>
                  </div>
                </div>
              ))}
              
              {filterRecords(withdrawalRecords).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No records found matching your criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

