import { useState, useEffect } from 'react';
import { Download, Search, Filter, Clock, User, Activity, FileText, MapPin, Monitor, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-400',
  update: 'bg-blue-500/10 text-blue-400',
  delete: 'bg-red-500/10 text-red-400',
  login: 'bg-primary/10 text-primary',
  logout: 'bg-orange-500/10 text-orange-400',
  page_visit: 'bg-purple-500/10 text-purple-400',
  approve: 'bg-emerald-500/10 text-emerald-400',
  reject: 'bg-red-500/10 text-red-400',
  export: 'bg-yellow-500/10 text-yellow-400',
};

export default function AdminAuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    fetchLogs();
  }, [timeRange]);

  const fetchLogs = async () => {
    setIsLoading(true);
    let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500);
    
    if (timeRange !== 'all') {
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', since);
    }

    const { data } = await query;
    if (data) setLogs(data as AuditLog[]);
    setIsLoading(false);
  };

  const entityTypes = ['all', ...new Set(logs.map(l => l.entity_type))];

  const filtered = logs.filter(l => {
    const matchEntity = entityFilter === 'all' || l.entity_type === entityFilter;
    const matchSearch = !search || l.action.includes(search.toLowerCase()) || l.entity_type.includes(search.toLowerCase()) || l.ip_address?.includes(search) || l.user_id?.includes(search);
    return matchEntity && matchSearch;
  });

  // Stats
  const actionCounts: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};
  logs.forEach(l => {
    actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
    entityCounts[l.entity_type] = (entityCounts[l.entity_type] || 0) + 1;
    if (l.user_id) userCounts[l.user_id] = (userCounts[l.user_id] || 0) + 1;
  });

  const exportLogs = () => {
    const csv = [
      'Timestamp,Action,Entity Type,Entity ID,User ID,IP Address,Details',
      ...filtered.map(l => [
        new Date(l.created_at).toISOString(),
        l.action,
        l.entity_type,
        l.entity_id || '',
        l.user_id || '',
        l.ip_address || '',
        JSON.stringify(l.details || {}),
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: logs.length, icon: Activity },
          { label: 'Unique Users', value: Object.keys(userCounts).length, icon: User },
          { label: 'Action Types', value: Object.keys(actionCounts).length, icon: FileText },
          { label: 'Entity Types', value: Object.keys(entityCounts).length, icon: Monitor },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-card admin-stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-5 h-5 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Breakdown */}
      <Card className="border-0 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Action Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {Object.entries(actionCounts).sort(([, a], [, b]) => b - a).map(([action, count]) => (
              <Badge key={action} className={`text-xs ${actionColors[action] || 'bg-muted text-muted-foreground'} border-0`}>
                {action}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search actions, IPs, user IDs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['24h', '7d', '30d', 'all'] as const).map(t => (
            <Button key={t} size="sm" variant={timeRange === t ? 'default' : 'outline'} onClick={() => setTimeRange(t)} className="h-8 text-xs">
              {t === 'all' ? 'All Time' : t}
            </Button>
          ))}
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="h-8 text-xs border rounded-md px-2 bg-background text-foreground">
            {entityTypes.map(e => <option key={e} value={e}>{e === 'all' ? 'All Entities' : e}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={exportLogs} className="h-8 text-xs gap-1">
            <Download className="w-3 h-3" /> Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={fetchLogs} className="h-8 text-xs gap-1">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Audit Trail Table */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Timestamp</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Action</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Entity</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">User ID</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">IP</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No audit events found</td></tr>
                ) : (
                  filtered.slice(0, 100).map(l => (
                    <tr key={l.id} className="border-b border-border/10 hover:bg-muted/10">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[10px] ${actionColors[l.action] || 'bg-muted text-muted-foreground'} border-0`}>
                          {l.action}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-foreground font-medium">{l.entity_type}</span>
                        {l.entity_id && <span className="text-muted-foreground ml-1 font-mono text-[10px]">#{l.entity_id.slice(0, 8)}</span>}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">{l.user_id ? l.user_id.slice(0, 12) + '...' : '—'}</td>
                      <td className="p-3 font-mono text-foreground/80">{l.ip_address || '—'}</td>
                      <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                        {l.details ? JSON.stringify(l.details).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
