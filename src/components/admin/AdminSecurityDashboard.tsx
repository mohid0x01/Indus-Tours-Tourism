import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Ban, Activity, Globe, Clock, Eye, Search, RefreshCw, Skull, Lock, Unlock, TrendingUp, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
}

interface ThreatSummary {
  totalAttempts: number;
  failedAttempts: number;
  uniqueIPs: number;
  bruteForceIPs: string[];
  topAttackedEmails: { email: string; count: number }[];
  topIPs: { ip: string; count: number; failed: number }[];
  recentThreats: LoginAttempt[];
  hourlyData: { hour: string; success: number; failed: number }[];
}

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown' };
  let browser = 'Unknown';
  let os = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';
  return { browser, os };
}

export default function AdminSecurityDashboard() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'failed' | 'success' | 'threats'>('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchAttempts();
    const channel = supabase.channel('security-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'login_attempts' }, () => fetchAttempts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [timeRange]);

  const fetchAttempts = async () => {
    setIsLoading(true);
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('login_attempts')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setAttempts(data as LoginAttempt[]);
    setIsLoading(false);
  };

  const summary: ThreatSummary = (() => {
    const failed = attempts.filter(a => !a.success);
    const ips = [...new Set(attempts.map(a => a.ip_address).filter(Boolean))];

    // Brute force: IPs with 5+ failed attempts
    const ipFailCounts: Record<string, number> = {};
    failed.forEach(a => { if (a.ip_address) ipFailCounts[a.ip_address] = (ipFailCounts[a.ip_address] || 0) + 1; });
    const bruteForceIPs = Object.entries(ipFailCounts).filter(([, c]) => c >= 5).map(([ip]) => ip);

    // Top attacked emails
    const emailCounts: Record<string, number> = {};
    failed.forEach(a => { emailCounts[a.email] = (emailCounts[a.email] || 0) + 1; });
    const topAttackedEmails = Object.entries(emailCounts)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top IPs
    const ipCounts: Record<string, { total: number; failed: number }> = {};
    attempts.forEach(a => {
      if (!a.ip_address) return;
      if (!ipCounts[a.ip_address]) ipCounts[a.ip_address] = { total: 0, failed: 0 };
      ipCounts[a.ip_address].total++;
      if (!a.success) ipCounts[a.ip_address].failed++;
    });
    const topIPs = Object.entries(ipCounts)
      .map(([ip, { total, failed: f }]) => ({ ip, count: total, failed: f }))
      .sort((a, b) => b.failed - a.failed)
      .slice(0, 10);

    // Hourly breakdown
    const hourlyMap: Record<string, { success: number; failed: number }> = {};
    attempts.forEach(a => {
      const h = new Date(a.created_at).toISOString().slice(0, 13);
      if (!hourlyMap[h]) hourlyMap[h] = { success: 0, failed: 0 };
      if (a.success) hourlyMap[h].success++;
      else hourlyMap[h].failed++;
    });
    const hourlyData = Object.entries(hourlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([hour, data]) => ({ hour: new Date(hour + ':00Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ...data }));

    return {
      totalAttempts: attempts.length,
      failedAttempts: failed.length,
      uniqueIPs: ips.length,
      bruteForceIPs,
      topAttackedEmails,
      topIPs,
      recentThreats: failed.slice(0, 20),
      hourlyData,
    };
  })();

  const filtered = attempts.filter(a => {
    const matchFilter = filter === 'all' || (filter === 'failed' && !a.success) || (filter === 'success' && a.success) || (filter === 'threats' && summary.bruteForceIPs.includes(a.ip_address || ''));
    const matchSearch = !search || a.email.includes(search) || a.ip_address?.includes(search) || a.failure_reason?.includes(search);
    return matchFilter && matchSearch;
  });

  const threatLevel = summary.bruteForceIPs.length > 0 ? 'critical' : summary.failedAttempts > 10 ? 'high' : summary.failedAttempts > 3 ? 'medium' : 'low';
  const threatColors = { critical: 'text-red-400 bg-red-500/10', high: 'text-orange-400 bg-orange-500/10', medium: 'text-yellow-400 bg-yellow-500/10', low: 'text-emerald-400 bg-emerald-500/10' };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Threat Level Banner */}
      <Card className={`border-0 shadow-card ${threatColors[threatLevel]}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${threatColors[threatLevel]}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Threat Level: <span className="uppercase">{threatLevel}</span></h3>
              <p className="text-[11px] text-muted-foreground">
                {summary.bruteForceIPs.length > 0 ? `${summary.bruteForceIPs.length} brute force IP(s) detected` : `${summary.failedAttempts} failed login attempts in ${timeRange}`}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {(['24h', '7d', '30d'] as const).map(t => (
              <Button key={t} size="sm" variant={timeRange === t ? 'default' : 'outline'} onClick={() => setTimeRange(t)} className="h-7 text-xs">
                {t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Attempts', value: summary.totalAttempts, icon: Activity, color: 'text-primary' },
          { label: 'Failed Logins', value: summary.failedAttempts, icon: Lock, color: 'text-red-400' },
          { label: 'Unique IPs', value: summary.uniqueIPs, icon: Globe, color: 'text-blue-400' },
          { label: 'Brute Force IPs', value: summary.bruteForceIPs.length, icon: Skull, color: 'text-red-500' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-card admin-stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Suspicious IPs & Top Attacked Emails side by side */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" /> Suspicious IPs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {summary.topIPs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {summary.topIPs.map((ip, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground">{ip.ip}</span>
                      {summary.bruteForceIPs.includes(ip.ip) && (
                        <Badge className="text-[9px] h-4 bg-red-500/10 text-red-400 border-0">BRUTE FORCE</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-muted-foreground">{ip.count} attempts</span>
                      <span className="text-red-400 font-medium">{ip.failed} failed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> Most Targeted Emails
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {summary.topAttackedEmails.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No failed attempts</p>
            ) : (
              <div className="space-y-2">
                {summary.topAttackedEmails.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="text-xs text-foreground truncate">{e.email}</span>
                    <Badge variant="outline" className="text-[10px] h-5">{e.count} attempts</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart (simple bar) */}
      {summary.hourlyData.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Login Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-end gap-1 h-32 overflow-x-auto">
              {summary.hourlyData.map((h, i) => {
                const max = Math.max(...summary.hourlyData.map(d => d.success + d.failed), 1);
                const successH = (h.success / max) * 100;
                const failedH = (h.failed / max) * 100;
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1 group" title={`${h.hour}: ${h.success} success, ${h.failed} failed`}>
                    <div className="w-full flex flex-col gap-0.5 items-stretch">
                      {h.failed > 0 && <div className="bg-red-400/60 rounded-t-sm transition-all" style={{ height: `${failedH}%`, minHeight: h.failed > 0 ? 4 : 0 }} />}
                      {h.success > 0 && <div className="bg-primary/60 rounded-t-sm transition-all" style={{ height: `${successH}%`, minHeight: h.success > 0 ? 4 : 0 }} />}
                    </div>
                    <span className="text-[8px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{h.hour}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary/60" /><span className="text-[10px] text-muted-foreground">Success</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400/60" /><span className="text-[10px] text-muted-foreground">Failed</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by email, IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'failed', 'success', 'threats'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs h-8">
              {f === 'threats' ? '🔴 Threats' : f}
            </Button>
          ))}
        </div>
      </div>

      {/* Attempts Log */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> Login Attempts Log ({filtered.length})
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={fetchAttempts} className="h-7 text-xs gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Time</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Email</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">IP Address</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Location</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Browser / OS</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No login attempts recorded</td></tr>
                ) : (
                  filtered.slice(0, 50).map(a => {
                    const { browser, os } = parseUserAgent(a.user_agent);
                    const isBrute = summary.bruteForceIPs.includes(a.ip_address || '');
                    return (
                      <tr key={a.id} className={`border-b border-border/10 hover:bg-muted/10 ${isBrute ? 'bg-red-500/[0.03]' : ''}`}>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 font-medium text-foreground">{a.email}</td>
                        <td className="p-3 font-mono text-foreground/80">
                          {a.ip_address || '—'}
                          {isBrute && <Badge className="ml-1.5 text-[8px] h-3.5 bg-red-500/15 text-red-400 border-0">⚠</Badge>}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {a.country || a.city ? (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[a.city, a.country].filter(Boolean).join(', ')}</span>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-muted-foreground">{browser} / {os}</td>
                        <td className="p-3">
                          {a.success ? (
                            <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-0 gap-1"><Unlock className="w-3 h-3" />Success</Badge>
                          ) : (
                            <Badge className="text-[10px] h-5 bg-red-500/10 text-red-400 border-0 gap-1"><Lock className="w-3 h-3" />Failed</Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[200px] truncate">{a.failure_reason || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
