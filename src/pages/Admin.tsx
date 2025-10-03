import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const apiBase = "/api/admin";
const authBase = "/api/auth";

function useAuthToken() {
  return localStorage.getItem("jwtToken") || "";
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPut(path: string, token: string, body?: any) {
  const res = await fetch(`${apiBase}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Admin() {
  const token = useAuthToken();
  const [isAdminChecked, setIsAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [depStatus, setDepStatus] = useState<string>("pending");
  const [withStatus, setWithStatus] = useState<string>("pending");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [phone, setPhone] = useState("");
  const [userResult, setUserResult] = useState<any | null>(null);
  const [userActivity, setUserActivity] = useState<any | null>(null);

  const canLoad = useMemo(() => Boolean(token), [token]);

  // Verify admin access on mount
  useEffect(() => {
    const verify = async () => {
      try {
        if (!token) { setIsAdminChecked(true); setIsAdmin(false); return; }
        const res = await fetch(`${authBase}/verify`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { setIsAdmin(false); setIsAdminChecked(true); return; }
        const data = await res.json();
        const user = data?.data?.user;
        // Check if user is admin based on username or email
        const isAdminUser = user && (
          user.email?.toLowerCase().includes('admin') ||
          user.username?.toLowerCase().includes('admin') ||
          user.email === 'admin@fxtrade.com'
        );
        setIsAdmin(Boolean(isAdminUser));
      } catch {
        setIsAdmin(false);
      } finally {
        setIsAdminChecked(true);
      }
    };
    verify();
  }, [token]);

  useEffect(() => {
    if (!canLoad || !isAdmin) return;
    apiGet(`/deposits?status=${encodeURIComponent(depStatus)}&page=1&limit=20`, token)
      .then((d) => setDeposits(d.data.deposits || []))
      .catch(() => setDeposits([]));
  }, [depStatus, canLoad, token, isAdmin]);

  useEffect(() => {
    if (!canLoad || !isAdmin) return;
    apiGet(`/withdrawals?status=${encodeURIComponent(withStatus)}&page=1&limit=20`, token)
      .then((d) => setWithdrawals(d.data.withdrawals || []))
      .catch(() => setWithdrawals([]));
  }, [withStatus, canLoad, token, isAdmin]);

  const approveDeposit = async (id: string) => {
    await apiPut(`/deposits/${id}/approve`, token);
    setDeposits((prev) => prev.filter((x) => x.id !== id));
  };

  const rejectDeposit = async (id: string) => {
    await apiPut(`/deposits/${id}/reject`, token);
    setDeposits((prev) => prev.filter((x) => x.id !== id));
  };

  const approveWithdrawal = async (id: string) => {
    await apiPut(`/withdrawals/${id}/approve`, token);
    setWithdrawals((prev) => prev.filter((x) => x.id !== id));
  };

  const rejectWithdrawal = async (id: string) => {
    await apiPut(`/withdrawals/${id}/reject`, token);
    setWithdrawals((prev) => prev.filter((x) => x.id !== id));
  };

  const searchUser = async () => {
    if (!phone) return;
    const data = await apiGet(`/users/search?phone=${encodeURIComponent(phone)}`, token);
    setUserResult(data.data);
  };

  const loadActivity = async (userId: string) => {
    const data = await apiGet(`/users/${userId}/activity?limit=10`, token);
    setUserActivity(data.data);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAdminChecked && <div className="text-sm">Checking access...</div>}
          {isAdminChecked && (!token || !isAdmin) && (
            <div className="text-sm text-red-500">Access denied. Admin token required or your account is not admin.</div>
          )}
          {isAdminChecked && isAdmin && (
          <Tabs defaultValue="deposits" className="mt-4">
            <TabsList>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="search">User Search</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="deposits" className="space-y-3 mt-4">
              <div className="flex gap-2 items-center">
                <span className="text-sm">Status:</span>
                <select className="border rounded px-2 py-1" value={depStatus} onChange={(e) => setDepStatus(e.target.value)}>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div className="grid gap-2">
                {deposits.map((d) => (
                  <div key={d.id} className="border rounded p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{d.amount} — {d.status}</div>
                      <div className="text-xs text-muted-foreground">{d.payment_method_id} • {new Date(d.created_at).toLocaleString()}</div>
                    </div>
                    {d.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveDeposit(d.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectDeposit(d.id)}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
                {deposits.length === 0 && <div className="text-sm text-muted-foreground">No deposits found.</div>}
              </div>
            </TabsContent>

            <TabsContent value="withdrawals" className="space-y-3 mt-4">
              <div className="flex gap-2 items-center">
                <span className="text-sm">Status:</span>
                <select className="border rounded px-2 py-1" value={withStatus} onChange={(e) => setWithStatus(e.target.value)}>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div className="grid gap-2">
                {withdrawals.map((w) => (
                  <div key={w.id} className="border rounded p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{w.amount} — {w.status}</div>
                      <div className="text-xs text-muted-foreground">{w.payment_method_id} • {new Date(w.created_at).toLocaleString()}</div>
                    </div>
                    {w.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveWithdrawal(w.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectWithdrawal(w.id)}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
                {withdrawals.length === 0 && <div className="text-sm text-muted-foreground">No withdrawals found.</div>}
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-3 mt-4">
              <div className="flex gap-2 items-center">
                <Input placeholder="Phone number e.g. +92300..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button onClick={searchUser}>Search</Button>
              </div>
              {userResult && (
                <div className="space-y-2">
                  <div className="font-medium">{userResult.user.full_name} — {userResult.user.phone_number}</div>
                  <div className="text-sm text-muted-foreground">VIP: {userResult.user.vip_level} • Referral: {userResult.user.referral_code}</div>
                  <div className="text-sm">Team: total {userResult.team.total_team}, A {userResult.team.level_a}, B {userResult.team.level_b}, C {userResult.team.level_c}, D {userResult.team.level_d}</div>
                  <Button variant="secondary" onClick={() => loadActivity(userResult.user.id)}>Load Activity</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-3 mt-4">
              {!userActivity && <div className="text-sm text-muted-foreground">Load a user from "User Search" first.</div>}
              {userActivity && (
                <div className="grid gap-3">
                  <Card>
                    <CardHeader><CardTitle>Balances</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-sm">Personal: {userActivity.balances.personal_wallet_balance}</div>
                      <div className="text-sm">Income: {userActivity.balances.income_wallet_balance}</div>
                      <div className="text-sm">Earnings: {userActivity.balances.total_earnings}</div>
                      <div className="text-sm">Invested: {userActivity.balances.total_invested}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Recent Deposits</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {userActivity.deposits.map((x: any) => (
                        <div key={x.id} className="text-sm">{x.amount} — {x.status} — {new Date(x.created_at).toLocaleString()}</div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Recent Withdrawals</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {userActivity.withdrawals.map((x: any) => (
                        <div key={x.id} className="text-sm">{x.amount} — {x.status} — {new Date(x.created_at).toLocaleString()}</div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Financial Records</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {userActivity.financial.map((x: any) => (
                        <div key={x.id} className="text-sm">{x.type}: {x.amount} — {new Date(x.created_at).toLocaleString()}</div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Task Completions</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {userActivity.tasks.map((x: any) => (
                        <div key={x.id} className="text-sm">{x.task_title}: {x.reward_earned} — {new Date(x.created_at).toLocaleString()}</div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Video Earnings</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {userActivity.videos.map((x: any) => (
                        <div key={x.id} className="text-sm">{x.video_title || 'Video'}: {x.reward_amount} — {new Date(x.created_at).toLocaleString()}</div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
