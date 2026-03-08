import { useState, useEffect } from 'react';
import { Monitor, Users, MapPin, Globe, Clock, TrendingUp, Eye, Smartphone, Laptop, Tablet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Session {
  id: string;
  user_id: string;
  ip_address: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
}

export default function AdminUserAnalytics() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('user_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setSessions(data as Session[]);
    setIsLoading(false);
  };

  const activeSessions = sessions.filter(s => s.is_active);
  const uniqueUsers = [...new Set(sessions.map(s => s.user_id))];

  // Country breakdown
  const countryCounts: Record<string, number> = {};
  sessions.forEach(s => { if (s.country) countryCounts[s.country] = (countryCounts[s.country] || 0) + 1; });
  const topCountries = Object.entries(countryCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  // Browser breakdown
  const browserCounts: Record<string, number> = {};
  sessions.forEach(s => { if (s.browser) browserCounts[s.browser] = (browserCounts[s.browser] || 0) + 1; });

  // Device breakdown
  const deviceCounts: Record<string, number> = {};
  sessions.forEach(s => { 
    const type = s.device_type || 'Unknown';
    deviceCounts[type] = (deviceCounts[type] || 0) + 1; 
  });

  // OS breakdown
  const osCounts: Record<string, number> = {};
  sessions.forEach(s => { if (s.os) osCounts[s.os] = (osCounts[s.os] || 0) + 1; });

  const deviceIcon = (type: string) => {
    if (type.toLowerCase().includes('mobile')) return <Smartphone className="w-4 h-4" />;
    if (type.toLowerCase().includes('tablet')) return <Tablet className="w-4 h-4" />;
    return <Laptop className="w-4 h-4" />;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Sessions', value: sessions.length, icon: Monitor, color: 'text-primary' },
          { label: 'Active Now', value: activeSessions.length, icon: Eye, color: 'text-emerald-400' },
          { label: 'Unique Users', value: uniqueUsers.length, icon: Users, color: 'text-blue-400' },
          { label: 'Countries', value: Object.keys(countryCounts).length, icon: Globe, color: 'text-accent' },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-card admin-stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Geographic Distribution */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" /> Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {topCountries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No location data yet</p>
            ) : (
              topCountries.map(([country, count], i) => {
                const pct = Math.round((count / sessions.length) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground font-medium flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-muted-foreground" /> {country}
                      </span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Device & Browser */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-400" /> Devices & Browsers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {/* Devices */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Devices</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(deviceCounts).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                  <Badge key={type} className="text-xs bg-muted/50 text-foreground border-0 gap-1.5">
                    {deviceIcon(type)} {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
            {/* Browsers */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Browsers</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(browserCounts).sort(([, a], [, b]) => b - a).map(([browser, count]) => (
                  <Badge key={browser} className="text-xs bg-primary/10 text-primary border-0">
                    {browser}: {count}
                  </Badge>
                ))}
              </div>
            </div>
            {/* OS */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Operating Systems</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(osCounts).sort(([, a], [, b]) => b - a).map(([os, count]) => (
                  <Badge key={os} className="text-xs bg-accent/10 text-accent border-0">
                    {os}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">User</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">IP</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Device</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Location</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Started</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 30).map(s => (
                  <tr key={s.id} className="border-b border-border/10 hover:bg-muted/10">
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">{s.user_id.slice(0, 12)}...</td>
                    <td className="p-3 font-mono text-foreground/80">{s.ip_address || '—'}</td>
                    <td className="p-3 text-muted-foreground">{[s.browser, s.os].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="p-3 text-muted-foreground">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="p-3">
                      {s.is_active ? (
                        <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-0">Active</Badge>
                      ) : (
                        <Badge className="text-[10px] h-5 bg-muted text-muted-foreground border-0">Ended</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
