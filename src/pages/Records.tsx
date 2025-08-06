import { useState } from "react";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter,
  Calendar,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const rechargeRecords = [
  {
    id: "RC001",
    amount: "20.00",
    date: "05/08/2025 14:30:25",
    method: "Bank Transfer",
    status: "Success",
    reference: "BT2025080500123",
    processingTime: "Instant"
  },
  {
    id: "RC002", 
    amount: "80.00",
    date: "04/08/2025 09:15:42",
    method: "Mobile Payment",
    status: "Success",
    reference: "MP2025080400456",
    processingTime: "Instant"
  },
  {
    id: "RC003",
    amount: "50.00", 
    date: "03/08/2025 16:45:18",
    method: "Credit Card",
    status: "Success",
    reference: "CC2025080300789",
    processingTime: "Instant"
  },
  {
    id: "RC004",
    amount: "100.00",
    date: "02/08/2025 11:20:33",
    method: "Bank Transfer", 
    status: "Processing",
    reference: "BT2025080200234",
    processingTime: "1-3 hours"
  }
];

const withdrawalRecords = [
  {
    id: "WD001",
    amount: "24,000.00",
    date: "05/08/2025 09:09:36", 
    method: "Bank Transfer",
    status: "Success",
    processingTime: "48 hours",
    reference: "WD2025080500567"
  },
  {
    id: "WD002",
    amount: "1,500.00", 
    date: "04/08/2025 15:22:18",
    method: "Mobile Wallet",
    status: "Under Review",
    processingTime: "24-72 hours",
    reference: "WD2025080400890"
  },
  {
    id: "WD003",
    amount: "4,000.00",
    date: "03/08/2025 12:45:55",
    method: "Bank Transfer",
    status: "Success", 
    processingTime: "36 hours",
    reference: "WD2025080300123"
  },
  {
    id: "WD004",
    amount: "800.00",
    date: "02/08/2025 18:30:12",
    method: "PayPal",
    status: "Failed",
    processingTime: "N/A",
    reference: "WD2025080200456"
  }
];

export const Records = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filterRecords = (records: typeof rechargeRecords) => {
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

  const getTotalAmount = (records: typeof rechargeRecords, type: 'success' | 'all' = 'all') => {
    const filtered = type === 'success' 
      ? records.filter(r => r.status.toLowerCase() === 'success')
      : records;
    
    return filtered.reduce((sum, record) => sum + parseFloat(record.amount), 0);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Transaction Records</h1>
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