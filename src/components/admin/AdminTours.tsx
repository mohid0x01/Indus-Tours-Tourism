import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Image as ImageIcon, Search, Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { toursApi } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import ImageUpload from '@/components/common/ImageUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HotelOption { id: string; name: string; location: string | null; star_rating: number | null; }

interface Tour {
  id: string; title: string; description: string | null; duration: string | null;
  price: number; discount_price: number | null; max_group_size: number | null;
  difficulty: string | null; includes: string[] | null; image_url: string | null;
  is_featured: boolean; is_active: boolean; hotel_id: string | null;
}

const emptyTour = {
  title: '', description: '', duration: '', price: 0, discount_price: null as number | null,
  max_group_size: 10, difficulty: 'Moderate', includes: [] as string[], image_url: '',
  is_featured: false, is_active: true, hotel_id: null as string | null,
};

export default function AdminTours() {
  const { toast } = useToast();
  const [tours, setTours] = useState<Tour[]>([]);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTour, setEditingTour] = useState<typeof emptyTour & { id?: string }>(emptyTour);
  const [includeInput, setIncludeInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => { fetchTours(); fetchHotels(); }, []);

  const fetchHotels = async () => {
    const { data } = await supabase.from('hotels').select('id, name, location, star_rating').eq('is_active', true).order('name');
    if (data) setHotels(data);
  };

  const fetchTours = async () => {
    setIsLoading(true);
    const { data, error } = await toursApi.getAll();
    if (!error && data) setTours(data as Tour[]);
    setIsLoading(false);
  };

  const saveTour = async () => {
    const tourData = {
      title: editingTour.title, description: editingTour.description || null,
      duration: editingTour.duration || null, price: editingTour.price,
      discount_price: editingTour.discount_price || null, max_group_size: editingTour.max_group_size || 10,
      difficulty: editingTour.difficulty || 'Moderate', includes: editingTour.includes || [],
      image_url: editingTour.image_url || null, is_featured: editingTour.is_featured,
      is_active: editingTour.is_active, hotel_id: editingTour.hotel_id || null,
    };
    const result = editingTour.id ? await toursApi.update(editingTour.id, tourData) : await toursApi.create(tourData);
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else { toast({ title: 'Success', description: `Tour ${editingTour.id ? 'updated' : 'created'}` }); setIsEditing(false); setEditingTour(emptyTour); fetchTours(); }
  };

  const deleteTour = async (id: string) => {
    const { error } = await toursApi.delete(id);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchTours(); }
  };

  const addInclude = () => {
    if (includeInput.trim()) {
      setEditingTour({ ...editingTour, includes: [...(editingTour.includes || []), includeInput.trim()] });
      setIncludeInput('');
    }
  };

  const filteredTours = tours.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' || (filterStatus === 'active' ? t.is_active : !t.is_active);
    return matchesSearch && matchesFilter;
  });

  if (isLoading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tours..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)} className="capitalize text-xs h-9">
                {s}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={() => { setEditingTour(emptyTour); setIsEditing(true); }} size="sm" className="h-9 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Tour
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{tours.length} total</span>
        <span>•</span>
        <span>{tours.filter(t => t.is_active).length} active</span>
        <span>•</span>
        <span>{tours.filter(t => t.is_featured).length} featured</span>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTours.map((tour) => (
          <Card key={tour.id} className={`border-0 shadow-card overflow-hidden group hover:shadow-lg transition-shadow ${!tour.is_active ? 'opacity-60' : ''}`}>
            <div className="aspect-video bg-muted relative overflow-hidden">
              {tour.image_url ? (
                <img src={tour.image_url} alt={tour.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mb-1" /><span className="text-xs">No image</span>
                </div>
              )}
              {/* Overlay badges */}
              <div className="absolute top-2 left-2 flex gap-1.5">
                {tour.is_featured && <Badge className="text-[10px] h-5 bg-accent text-accent-foreground border-0">⭐ Featured</Badge>}
                {!tour.is_active && <Badge variant="destructive" className="text-[10px] h-5">Inactive</Badge>}
              </div>
              {tour.discount_price && (
                <Badge className="absolute top-2 right-2 text-[10px] h-5 bg-destructive border-0">
                  {Math.round(((tour.price - tour.discount_price) / tour.price) * 100)}% OFF
                </Badge>
              )}
            </div>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-foreground line-clamp-1">{tour.title}</h3>
                <div className="flex gap-0.5 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingTour(tour); setIsEditing(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete "{tour.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTour(tour.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tour.duration && <Badge variant="outline" className="text-[10px] h-5">{tour.duration}</Badge>}
                {tour.difficulty && <Badge variant="outline" className="text-[10px] h-5">{tour.difficulty}</Badge>}
                {tour.max_group_size && <Badge variant="outline" className="text-[10px] h-5"><Users className="w-3 h-3 mr-0.5" />{tour.max_group_size}</Badge>}
              </div>
              <div className="flex items-baseline gap-2">
                {tour.discount_price ? (
                  <>
                    <span className="text-lg font-bold text-foreground">PKR {tour.discount_price.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground line-through">PKR {tour.price.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-foreground">PKR {tour.price.toLocaleString()}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTour.id ? 'Edit Tour' : 'Add New Tour'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-muted-foreground">Title *</label><Input value={editingTour.title} onChange={(e) => setEditingTour({ ...editingTour, title: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={editingTour.description || ''} onChange={(e) => setEditingTour({ ...editingTour, description: e.target.value })} rows={3} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground">Duration</label><Input value={editingTour.duration || ''} onChange={(e) => setEditingTour({ ...editingTour, duration: e.target.value })} placeholder="e.g., 7 Days" className="mt-1" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                <select value={editingTour.difficulty || 'Moderate'} onChange={(e) => setEditingTour({ ...editingTour, difficulty: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1 text-sm">
                  <option>Easy</option><option>Moderate</option><option>Challenging</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground">Price (PKR) *</label><Input type="number" value={editingTour.price} onChange={(e) => setEditingTour({ ...editingTour, price: Number(e.target.value) })} className="mt-1" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Discount Price</label><Input type="number" value={editingTour.discount_price || ''} onChange={(e) => setEditingTour({ ...editingTour, discount_price: e.target.value ? Number(e.target.value) : null })} className="mt-1" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Max Group</label><Input type="number" value={editingTour.max_group_size || 10} onChange={(e) => setEditingTour({ ...editingTour, max_group_size: Number(e.target.value) })} className="mt-1" /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Partner Hotel</label>
              <select value={editingTour.hotel_id || ''} onChange={(e) => setEditingTour({ ...editingTour, hotel_id: e.target.value || null })} className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1 text-sm">
                <option value="">No hotel</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name} {h.location ? `- ${h.location}` : ''} {h.star_rating ? `(${h.star_rating}★)` : ''}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Image</label><div className="mt-1"><ImageUpload value={editingTour.image_url || null} onChange={(url) => setEditingTour({ ...editingTour, image_url: url || '' })} folder="tours" /></div></div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Includes</label>
              <div className="flex gap-2 mt-1"><Input value={includeInput} onChange={(e) => setIncludeInput(e.target.value)} placeholder="e.g., Accommodation" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())} /><Button type="button" onClick={addInclude} size="sm">Add</Button></div>
              <div className="flex flex-wrap gap-1.5 mt-2">{editingTour.includes?.map((item, i) => (
                <Badge key={i} variant="secondary" className="gap-1">{item}<button onClick={() => setEditingTour({ ...editingTour, includes: editingTour.includes?.filter((_, idx) => idx !== i) })}><X className="w-3 h-3" /></button></Badge>
              ))}</div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingTour.is_active} onChange={(e) => setEditingTour({ ...editingTour, is_active: e.target.checked })} className="rounded" /> Active</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingTour.is_featured} onChange={(e) => setEditingTour({ ...editingTour, is_featured: e.target.checked })} className="rounded" /> Featured</label>
            </div>
            <div className="flex gap-2 pt-2"><Button onClick={saveTour} disabled={!editingTour.title || !editingTour.price}>{editingTour.id ? 'Update' : 'Create'} Tour</Button><Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}