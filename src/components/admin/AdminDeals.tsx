import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { dealsApi, toursApi } from '@/lib/api';
import ImageUpload from '@/components/common/ImageUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Deal {
  id: string; title: string; description: string | null; discount_percent: number | null;
  code: string | null; tour_id: string | null; valid_from: string | null; valid_until: string | null;
  is_active: boolean; is_popup: boolean; image_url: string | null; tours?: { title: string } | null;
}

interface TourOption { id: string; title: string; price: number; }

const emptyDeal = {
  title: '', description: '', discount_percent: 10, code: '', tour_id: null as string | null,
  valid_from: '', valid_until: '', is_active: true, is_popup: false, image_url: '',
};

export default function AdminDeals() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDeal, setEditingDeal] = useState<typeof emptyDeal & { id?: string }>(emptyDeal);

  useEffect(() => { fetchDeals(); fetchTours(); }, []);

  const fetchDeals = async () => {
    setIsLoading(true);
    const { data, error } = await dealsApi.getAll();
    if (!error && data) setDeals(data as Deal[]);
    setIsLoading(false);
  };

  const fetchTours = async () => {
    const { data } = await toursApi.getAll({ active: true });
    if (data) setTours(data as TourOption[]);
  };

  const saveDeal = async () => {
    const dealData = {
      title: editingDeal.title, description: editingDeal.description || null,
      discount_percent: editingDeal.discount_percent || null, code: editingDeal.code || null,
      tour_id: editingDeal.tour_id || null, valid_from: editingDeal.valid_from || null,
      valid_until: editingDeal.valid_until || null, is_active: editingDeal.is_active,
      is_popup: editingDeal.is_popup, image_url: editingDeal.image_url || null,
    };
    const result = editingDeal.id ? await dealsApi.update(editingDeal.id, dealData) : await dealsApi.create(dealData);
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else { toast({ title: 'Success', description: `Deal ${editingDeal.id ? 'updated' : 'created'}` }); setIsEditing(false); setEditingDeal(emptyDeal); fetchDeals(); }
  };

  const deleteDeal = async (id: string) => {
    const { error } = await dealsApi.delete(id);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchDeals(); }
  };

  if (isLoading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const activeDeals = deals.filter(d => d.is_active);
  const expiredDeals = deals.filter(d => d.valid_until && new Date(d.valid_until) < new Date());

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{deals.length} total</span><span>•</span>
          <span className="text-emerald-600">{activeDeals.length} active</span><span>•</span>
          <span>{deals.filter(d => d.is_popup).length} popup</span>
          {expiredDeals.length > 0 && <><span>•</span><span className="text-destructive">{expiredDeals.length} expired</span></>}
        </div>
        <Button onClick={() => { setEditingDeal(emptyDeal); setIsEditing(true); }} size="sm" className="h-9 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Deal
        </Button>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => {
          const isExpired = deal.valid_until && new Date(deal.valid_until) < new Date();
          return (
            <Card key={deal.id} className={`border-0 shadow-card overflow-hidden group hover:shadow-lg transition-shadow ${!deal.is_active || isExpired ? 'opacity-60' : ''}`}>
              <div className="aspect-video bg-muted relative overflow-hidden">
                {deal.image_url ? (
                  <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-accent/10 to-primary/10">
                    <Tag className="w-10 h-10 text-accent/40" />
                  </div>
                )}
                {deal.discount_percent && (
                  <div className="absolute top-2 left-2">
                    <Badge className="text-sm h-7 bg-destructive border-0 font-bold">{deal.discount_percent}% OFF</Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {deal.is_popup && <Badge className="text-[10px] h-5 bg-accent border-0">Popup</Badge>}
                  {isExpired && <Badge variant="destructive" className="text-[10px] h-5">Expired</Badge>}
                </div>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{deal.title}</h3>
                    {deal.code && <p className="text-xs text-primary font-mono mt-0.5">Code: {deal.code}</p>}
                    {deal.tours?.title && <p className="text-[11px] text-muted-foreground">🗺️ {deal.tours.title}</p>}
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingDeal({ ...deal }); setIsEditing(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete "{deal.title}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteDeal(deal.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {deal.description && <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Badge variant={deal.is_active ? 'default' : 'secondary'} className="text-[10px] h-5">
                    {deal.is_active ? '✓ Active' : 'Inactive'}
                  </Badge>
                  {deal.valid_until && (
                    <span className="text-[10px] text-muted-foreground">Until {new Date(deal.valid_until).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDeal.id ? 'Edit Deal' : 'Add New Deal'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-muted-foreground">Title *</label><Input value={editingDeal.title} onChange={(e) => setEditingDeal({ ...editingDeal, title: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={editingDeal.description || ''} onChange={(e) => setEditingDeal({ ...editingDeal, description: e.target.value })} rows={3} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Linked Tour</label>
              <select value={editingDeal.tour_id || ''} onChange={(e) => setEditingDeal({ ...editingDeal, tour_id: e.target.value || null })} className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1 text-sm">
                <option value="">All tours</option>
                {tours.map(t => <option key={t.id} value={t.id}>{t.title} - PKR {t.price.toLocaleString()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground">Discount %</label><Input type="number" value={editingDeal.discount_percent || ''} onChange={(e) => setEditingDeal({ ...editingDeal, discount_percent: Number(e.target.value) })} className="mt-1" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Promo Code</label><Input value={editingDeal.code || ''} onChange={(e) => setEditingDeal({ ...editingDeal, code: e.target.value.toUpperCase() })} placeholder="SUMMER25" className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground">Valid From</label><Input type="date" value={editingDeal.valid_from || ''} onChange={(e) => setEditingDeal({ ...editingDeal, valid_from: e.target.value })} className="mt-1" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Valid Until</label><Input type="date" value={editingDeal.valid_until || ''} onChange={(e) => setEditingDeal({ ...editingDeal, valid_until: e.target.value })} className="mt-1" /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Image</label><div className="mt-1"><ImageUpload value={editingDeal.image_url || null} onChange={(url) => setEditingDeal({ ...editingDeal, image_url: url || '' })} folder="deals" /></div></div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingDeal.is_active} onChange={(e) => setEditingDeal({ ...editingDeal, is_active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingDeal.is_popup} onChange={(e) => setEditingDeal({ ...editingDeal, is_popup: e.target.checked })} /> Show as Popup</label>
            </div>
            <div className="flex gap-2 pt-2"><Button onClick={saveDeal} disabled={!editingDeal.title}>{editingDeal.id ? 'Update' : 'Create'} Deal</Button><Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}