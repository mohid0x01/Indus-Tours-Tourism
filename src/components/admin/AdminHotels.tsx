import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Hotel {
  id: string; name: string; location: string | null; description: string | null;
  star_rating: number | null; amenities: string[] | null; image_url: string | null; is_active: boolean;
}

export default function AdminHotels() {
  const { toast } = useToast();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '', description: '', star_rating: 3, amenities: '', image_url: '', is_active: true });

  useEffect(() => { fetchHotels(); }, []);

  const fetchHotels = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('hotels').select('*').order('created_at', { ascending: false });
    if (!error && data) setHotels(data.map(h => ({ ...h, is_active: h.is_active ?? true })));
    setIsLoading(false);
  };

  const openDialog = (hotel?: Hotel) => {
    if (hotel) {
      setEditingHotel(hotel);
      setFormData({ name: hotel.name, location: hotel.location || '', description: hotel.description || '', star_rating: hotel.star_rating || 3, amenities: hotel.amenities?.join(', ') || '', image_url: hotel.image_url || '', is_active: hotel.is_active });
    } else {
      setEditingHotel(null);
      setFormData({ name: '', location: '', description: '', star_rating: 3, amenities: '', image_url: '', is_active: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hotelData = {
      name: formData.name, location: formData.location || null, description: formData.description || null,
      star_rating: formData.star_rating, image_url: formData.image_url || null, is_active: formData.is_active,
      amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()).filter(Boolean) : null,
    };
    const { error } = editingHotel
      ? await supabase.from('hotels').update(hotelData).eq('id', editingHotel.id)
      : await supabase.from('hotels').insert(hotelData);
    if (error) toast({ title: 'Error', description: `Failed to ${editingHotel ? 'update' : 'create'} hotel`, variant: 'destructive' });
    else { toast({ title: 'Success' }); fetchHotels(); setIsDialogOpen(false); }
  };

  const deleteHotel = async (id: string) => {
    const { error } = await supabase.from('hotels').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchHotels(); }
  };

  if (isLoading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">{hotels.length} hotels • {hotels.filter(h => h.is_active).length} active</div>
        <Button onClick={() => openDialog()} size="sm" className="h-9 gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Hotel</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className={`border-0 shadow-card overflow-hidden group hover:shadow-lg transition-shadow ${!hotel.is_active ? 'opacity-60' : ''}`}>
            <div className="relative h-40 overflow-hidden">
              <img src={hotel.image_url || '/placeholder.svg'} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {hotel.star_rating && (
                <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  {Array.from({ length: hotel.star_rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-accent text-accent" />)}
                </div>
              )}
              {!hotel.is_active && <Badge variant="destructive" className="absolute top-2 left-2 text-[10px] h-5">Inactive</Badge>}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{hotel.name}</h3>
                  {hotel.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{hotel.location}</p>}
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(hotel)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete "{hotel.name}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteHotel(hotel.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {hotel.amenities.slice(0, 3).map((a, i) => <Badge key={i} variant="outline" className="text-[10px] h-5">{a}</Badge>)}
                  {hotel.amenities.length > 3 && <Badge variant="outline" className="text-[10px] h-5">+{hotel.amenities.length - 3}</Badge>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {hotels.length === 0 && (
        <Card className="border-0 shadow-card"><CardContent className="p-12 text-center text-muted-foreground">No hotels yet. Add your first!</CardContent></Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingHotel ? 'Edit Hotel' : 'Add New Hotel'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-xs font-medium text-muted-foreground">Hotel Name *</label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Location</label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="mt-1" /></div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Star Rating</label>
              <div className="flex gap-1 mt-1">{[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => setFormData({ ...formData, star_rating: s })}><Star className={`w-6 h-6 ${s <= formData.star_rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} /></button>)}</div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Amenities (comma-separated)</label><Input value={formData.amenities} onChange={(e) => setFormData({ ...formData, amenities: e.target.value })} placeholder="WiFi, Parking, Restaurant" className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Image URL</label><Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="mt-1" /></div>
            <div className="flex items-center gap-3"><Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} /><label className="text-sm">Active</label></div>
            <div className="flex gap-2 pt-2"><Button type="submit">{editingHotel ? 'Update' : 'Create'}</Button><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}