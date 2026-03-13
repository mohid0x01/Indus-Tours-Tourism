import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Mail, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AbandonedBooking {
  id: string;
  email: string | null;
  user_id: string | null;
  tour_id: string | null;
  form_data: any;
  recovery_sent: boolean | null;
  recovered: boolean | null;
  created_at: string;
}

export default function AdminAbandonedBookings() {
  const [items, setItems] = useState<AbandonedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('abandoned_bookings').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setItems(data);
    setIsLoading(false);
  };

  const sendRecoveryEmail = async (id: string) => {
    setSendingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-recovery-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ abandoned_booking_id: id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({ title: "Failed to send", description: result.error || "Unknown error", variant: "destructive" });
        return;
      }

      toast({ title: "Recovery Email Sent! ✉️", description: `Email sent to ${result.data?.sent_to}` });
      fetchItems();
    } catch (err) {
      toast({ title: "Error", description: "Network error sending email", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  const notRecovered = items.filter(i => !i.recovered);
  const recovered = items.filter(i => i.recovered);
  const recoveryRate = items.length > 0 ? Math.round((recovered.length / items.length) * 100) : 0;

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" /> Abandoned Bookings ({items.length})
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{notRecovered.length}</p>
          <p className="text-xs text-muted-foreground">Abandoned</p>
        </CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{recovered.length}</p>
          <p className="text-xs text-muted-foreground">Recovered</p>
        </CardContent></Card>
        <Card className="border-0 shadow-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{recoveryRate}%</p>
          <p className="text-xs text-muted-foreground">Recovery Rate</p>
        </CardContent></Card>
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-3 text-muted-foreground">Email / User</th>
                <th className="text-left p-3 text-muted-foreground">Date</th>
                <th className="text-left p-3 text-muted-foreground">Status</th>
                <th className="p-3 text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border/10 hover:bg-muted/10">
                  <td className="p-3 text-foreground">{item.email || item.form_data?.customer_email || item.user_id?.slice(0, 12) || '—'}</td>
                  <td className="p-3 text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    {item.recovered ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">Recovered</Badge>
                    ) : item.recovery_sent ? (
                      <Badge className="bg-blue-500/10 text-blue-400 border-0 text-[10px]">Email Sent</Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-400 border-0 text-[10px]">Pending</Badge>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {!item.recovery_sent && !item.recovered && (
                      <button
                        onClick={() => sendRecoveryEmail(item.id)}
                        disabled={sendingId === item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        title="Send Recovery Email"
                      >
                        {sendingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        {sendingId === item.id ? 'Sending...' : 'Send Email'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No abandoned bookings found</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
