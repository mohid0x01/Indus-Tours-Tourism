import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Image as ImageIcon, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { destinationsApi } from '@/lib/api';
import ImageUpload from '@/components/common/ImageUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Destination {
  id: string; name: string; location: string | null; description: string | null;
  image_url: string | null; highlights: string[] | null; best_time: string | null; is_featured: boolean;
}

const emptyDestination = { name: '', location: '', description: '', image_url: '', highlights: [] as string[], best_time: '', is_featured: false };

export default function AdminDestinations() {
  const { toast } = useToast();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDest, setEditingDest] = useState<typeof emptyDestination & { id?: string }>(emptyDestination);
  const [highlightInput, setHighlightInput] = useState('');

  useEffect(() => { fetchDestinations(); }, []);

  const fetchDestinations = async () => {
    setIsLoading(true);
    const { data, error } = await destinationsApi.getAll();
    if (!error && data) setDestinations(data as Destination[]);
    setIsLoading(false);
  };

  const saveDestination = async () => {
    const destData = {
      name: editingDest.name, location: editingDest.location || null, description: editingDest.description || null,
      image_url: editingDest.image_url || null, highlights: editingDest.highlights || [],
      best_time: editingDest.best_time || null, is_featured: editingDest.is_featured,
    };
    const result = editingDest.id ? await destinationsApi.update(editingDest.id, destData) : await destinationsApi.create(destData);
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else { toast({ title: 'Success' }); setIsEditing(false); setEditingDest(emptyDestination); fetchDestinations(); }
  };

  const deleteDestination = async (id: string) => {
    const { error } = await destinationsApi.delete(id);
    if (!error) { toast({ title: 'Deleted' }); fetchDestinations(); }
    else toast({ title: 'Error', description: error, variant: 'destructive' });
  };

  const addHighlight = () => {
    if (highlightInput.trim()) {
      setEditingDest({ ...editingDest, highlights: [...(editingDest.highlights || []), highlightInput.trim()] });
      setHighlightInput('');
    }
  };

  if (isLoading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">{destinations.length} destinations • {destinations.filter(d => d.is_featured).length} featured</div>
        <Button onClick={() => { setEditingDest(emptyDestination); setIsEditing(true); }} size="sm" className="h-9 gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Destination</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {destinations.map((dest) => (
          <Card key={dest.id} className="border-0 shadow-card overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-muted relative overflow-hidden">
              {dest.image_url ? (
                <img src={dest.image_url} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><ImageIcon className="w-8 h-8 mb-1" /><span className="text-xs">No image</span></div>
              )}
              {dest.is_featured && <Badge className="absolute top-2 left-2 text-[10px] h-5 bg-primary border-0">⭐ Featured</Badge>}
            </div>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{dest.name}</h3>
                  {dest.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{dest.location}</p>}
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingDest(dest); setIsEditing(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete "{dest.name}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteDestination(dest.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {dest.best_time && <Badge variant="outline" className="text-[10px] h-5">🗓️ {dest.best_time}</Badge>}
              {dest.highlights && dest.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1">{dest.highlights.slice(0, 3).map((h, i) => <Badge key={i} variant="secondary" className="text-[10px] h-5">{h}</Badge>)}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDest.id ? 'Edit' : 'Add'} Destination</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-muted-foreground">Name *</label><Input value={editingDest.name} onChange={(e) => setEditingDest({ ...editingDest, name: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Location</label><Input value={editingDest.location || ''} onChange={(e) => setEditingDest({ ...editingDest, location: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={editingDest.description || ''} onChange={(e) => setEditingDest({ ...editingDest, description: e.target.value })} rows={3} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Best Time</label><Input value={editingDest.best_time || ''} onChange={(e) => setEditingDest({ ...editingDest, best_time: e.target.value })} placeholder="April - October" className="mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Image</label><div className="mt-1"><ImageUpload value={editingDest.image_url || null} onChange={(url) => setEditingDest({ ...editingDest, image_url: url || '' })} folder="destinations" /></div></div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Highlights</label>
              <div className="flex gap-2 mt-1"><Input value={highlightInput} onChange={(e) => setHighlightInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())} /><Button type="button" onClick={addHighlight} size="sm">Add</Button></div>
              <div className="flex flex-wrap gap-1.5 mt-2">{editingDest.highlights?.map((h, i) => <Badge key={i} variant="secondary" className="gap-1">{h}<button onClick={() => setEditingDest({ ...editingDest, highlights: editingDest.highlights?.filter((_, idx) => idx !== i) })}><X className="w-3 h-3" /></button></Badge>)}</div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingDest.is_featured} onChange={(e) => setEditingDest({ ...editingDest, is_featured: e.target.checked })} /> Featured</label>
            <div className="flex gap-2 pt-2"><Button onClick={saveDestination} disabled={!editingDest.name}>{editingDest.id ? 'Update' : 'Create'}</Button><Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}