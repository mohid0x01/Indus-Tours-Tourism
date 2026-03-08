import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Calendar, MapPin, Loader2, LogOut, 
  Clock, CheckCircle, XCircle, AlertCircle,
  Phone, Mail, Edit2, Save, X, Tag,
  Shield, Lock, Eye, EyeOff, Trash2,
  BarChart3, TrendingUp, Award, Heart,
  MessageSquare, HelpCircle, ChevronRight,
  Star, Plane, CreditCard, Bell, Settings
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Booking {
  id: string;
  travel_date: string;
  num_travelers: number;
  status: string | null;
  total_price: number | null;
  created_at: string;
  special_requests: string | null;
  tours?: { title: string } | null;
  deals?: { title: string; discount_percent: number | null } | null;
}

interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Feedback {
  id: string;
  rating: number;
  message: string;
  tour_name: string | null;
  created_at: string;
  is_approved: boolean | null;
}

// ─── Booking Card ─────────────────────────────
function BookingCard({ booking, getStatusColor, getStatusIcon, onCancel, onReschedule }: {
  booking: Booking;
  getStatusColor: (s: string | null) => string;
  getStatusIcon: (s: string | null) => JSX.Element;
  onCancel: (id: string) => void;
  onReschedule: (id: string, d: string) => void;
}) {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(booking.travel_date);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canReschedule = booking.status === 'pending';

  return (
    <div className="group bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {booking.tours?.title || 'Custom Tour Request'}
            </h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
              {getStatusIcon(booking.status)}
              {booking.status || 'pending'}
            </span>
          </div>
          {booking.deals && (
            <div className="flex items-center gap-1 text-xs text-accent">
              <Tag className="w-3 h-3" />
              <span>{booking.deals.title} ({booking.deals.discount_percent}% off)</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(booking.travel_date).toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span className="flex items-center gap-1"><User className="w-4 h-4" />{booking.num_travelers} traveler(s)</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />Booked {new Date(booking.created_at).toLocaleDateString()}</span>
          </div>
          {booking.special_requests && (
            <p className="text-sm text-muted-foreground italic">Note: {booking.special_requests}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
          <div>
            <p className="text-xl sm:text-2xl font-bold text-primary">PKR {Number(booking.total_price || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Amount</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReschedule && (
              isRescheduling ? (
                <div className="flex items-center gap-2">
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-auto h-8 text-sm" />
                  <Button size="sm" onClick={() => { if (newDate && newDate !== booking.travel_date) { onReschedule(booking.id, newDate); setIsRescheduling(false); } }}><CheckCircle className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsRescheduling(false)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsRescheduling(true)} className="border-border/50">
                  <Calendar className="w-4 h-4 mr-1" /> Reschedule
                </Button>
              )
            )}
            {canCancel && !isRescheduling && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>This will cancel your booking for {booking.tours?.title || 'this tour'}.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onCancel(booking.id)} className="bg-destructive text-destructive-foreground">Yes, Cancel</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border/50 hover:border-primary/20 transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });

  // Security tab state
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences (local state — could persist to DB)
  const [notifPrefs, setNotifPrefs] = useState({
    booking_updates: true,
    promotions: false,
    newsletter: true,
    sms_alerts: false,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();
      fetchProfile();
      fetchFeedbacks();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    setIsLoadingBookings(true);
    const { data } = await supabase
      .from('bookings')
      .select('id, travel_date, num_travelers, status, total_price, created_at, special_requests, tours(title), deals(title, discount_percent)')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (data) setBookings(data);
    setIsLoadingBookings(false);
  };

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoadingProfile(true);
    const { data } = await supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', user.id).maybeSingle();
    if (data) {
      setProfile(data);
      setEditForm({ full_name: data.full_name || '', phone: data.phone || '' });
    } else {
      setEditForm({ full_name: user.user_metadata?.full_name || '', phone: '' });
    }
    setIsLoadingProfile(false);
  };

  const fetchFeedbacks = async () => {
    if (!user) return;
    const { data } = await supabase.from('feedback').select('id, rating, message, tour_name, created_at, is_approved').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setFeedbacks(data);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: editForm.full_name, phone: editForm.phone, updated_at: new Date().toISOString() });
    if (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } else {
      toast({ title: 'Profile Updated', description: 'Your changes have been saved.' });
      setProfile({ ...profile, ...editForm, avatar_url: profile?.avatar_url || null });
      setIsEditingProfile(false);
    }
    setIsSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (passwords.new.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
      setPasswords({ current: '', new: '', confirm: '' });
    }
    setIsChangingPassword(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleRescheduleBooking = async (id: string, newDate: string) => {
    const { error } = await supabase.from('bookings').update({ travel_date: newDate }).eq('id', id);
    if (error) toast({ title: 'Error', description: 'Failed to reschedule', variant: 'destructive' });
    else { toast({ title: 'Rescheduled', description: `Travel date updated to ${new Date(newDate).toLocaleDateString()}` }); fetchBookings(); }
  };

  const handleCancelBooking = async (id: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast({ title: 'Error', description: 'Failed to cancel', variant: 'destructive' });
    else { toast({ title: 'Cancelled', description: 'Your booking has been cancelled.' }); fetchBookings(); }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-primary" />;
      default: return <AlertCircle className="w-4 h-4 text-accent" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'completed': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-accent/10 text-accent border-accent/20';
    }
  };

  // Travel stats
  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
    const completedTrips = bookings.filter(b => b.status === 'completed').length;
    const upcomingTrips = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
    const totalTravelers = bookings.reduce((sum, b) => sum + b.num_travelers, 0);
    const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '—';
    return { totalSpent, completedTrips, upcomingTrips, totalTravelers, totalBookings: bookings.length, avgRating, totalReviews: feedbacks.length };
  }, [bookings, feedbacks]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-mountain overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-snow/10 backdrop-blur-sm border border-snow/20 flex items-center justify-center">
                <User className="w-10 h-10 text-snow" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-snow">
                  {profile?.full_name || user.user_metadata?.full_name || 'Traveler'}
                </h1>
                <p className="text-snow/70 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" /> {user.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-primary/20 text-snow border-primary/30 text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    {stats.completedTrips >= 5 ? 'Gold Traveler' : stats.completedTrips >= 2 ? 'Silver Traveler' : 'Explorer'}
                  </Badge>
                  <Badge className="bg-snow/10 text-snow/80 border-snow/20 text-xs">
                    Member since {new Date(user.created_at).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {isAdmin && (
                <Button variant="outline" asChild className="bg-snow/10 border-snow/20 text-snow hover:bg-snow/20">
                  <Link to="/admin">Admin Panel</Link>
                </Button>
              )}
              <Button variant="outline" onClick={handleSignOut} className="bg-snow/10 border-snow/20 text-snow hover:bg-snow/20">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              { label: 'Total Trips', value: stats.totalBookings, icon: Plane, color: 'bg-primary/20 text-snow' },
              { label: 'Upcoming', value: stats.upcomingTrips, icon: Calendar, color: 'bg-emerald-500/20 text-emerald-300' },
              { label: 'Amount Spent', value: `PKR ${(stats.totalSpent / 1000).toFixed(0)}K`, icon: CreditCard, color: 'bg-accent/20 text-accent' },
              { label: 'Reviews Given', value: stats.totalReviews, icon: Star, color: 'bg-yellow-500/20 text-yellow-300' },
            ].map((s, i) => (
              <div key={i} className="bg-snow/[0.06] backdrop-blur-sm rounded-xl p-3 border border-snow/10">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-snow/50 uppercase tracking-wider">{s.label}</p>
                    <p className="text-sm font-bold text-snow">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-10">
        <div className="container mx-auto px-6">
          <Tabs defaultValue="bookings" className="space-y-8">
            <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
              <TabsTrigger value="bookings" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="w-4 h-4" /> My Bookings
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="w-4 h-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Shield className="w-4 h-4" /> Security
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Star className="w-4 h-4" /> My Reviews
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="w-4 h-4" /> Notifications
              </TabsTrigger>
            </TabsList>

            {/* ─── Bookings Tab ─── */}
            <TabsContent value="bookings" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-foreground">Your Bookings</h2>
                <Button variant="gold" asChild><Link to="/booking">Book New Tour</Link></Button>
              </div>

              {isLoadingBookings ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : bookings.length === 0 ? (
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-border/50">
                  <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Bookings Yet</h3>
                  <p className="text-muted-foreground mb-6">Start your adventure by booking your first tour!</p>
                  <Button variant="gold" asChild><Link to="/tours">Explore Tours</Link></Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookings.map((b) => (
                    <BookingCard key={b.id} booking={b} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} onCancel={handleCancelBooking} onReschedule={handleRescheduleBooking} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Profile Tab ─── */}
            <TabsContent value="profile" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-foreground">Your Profile</h2>
                {!isEditingProfile && (
                  <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                )}
              </div>

              {isLoadingProfile ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid gap-6 max-w-3xl">
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditingProfile ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                            <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Enter your full name" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                            <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+92 300 1234567" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                            <Input value={user.email || ''} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                              {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                              Save Changes
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <User className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{profile?.full_name || 'Not set'}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {[
                              { icon: Phone, label: 'Phone', value: profile?.phone || 'Not provided' },
                              { icon: Mail, label: 'Email', value: user.email || '' },
                              { icon: Calendar, label: 'Member Since', value: new Date(user.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }) },
                              { icon: Plane, label: 'Total Bookings', value: `${bookings.length} booking(s)` },
                            ].map((item, i) => (
                              <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><item.icon className="w-3 h-3" />{item.label}</p>
                                <p className="text-sm font-medium text-foreground">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Travel Stats Card */}
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-accent" />
                        </div>
                        Travel Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard icon={Plane} label="Total Trips" value={stats.totalBookings} color="bg-primary/10 text-primary" />
                        <StatCard icon={CheckCircle} label="Completed" value={stats.completedTrips} color="bg-emerald-500/10 text-emerald-500" />
                        <StatCard icon={TrendingUp} label="Upcoming" value={stats.upcomingTrips} color="bg-blue-500/10 text-blue-500" />
                        <StatCard icon={User} label="Travelers" value={stats.totalTravelers} color="bg-purple-500/10 text-purple-500" />
                        <StatCard icon={CreditCard} label="Total Spent" value={`PKR ${stats.totalSpent.toLocaleString()}`} color="bg-accent/10 text-accent" />
                        <StatCard icon={Star} label="Avg Rating" value={stats.avgRating} color="bg-yellow-500/10 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ─── Security Tab ─── */}
            <TabsContent value="security" className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-foreground">Account Security</h2>
              <div className="grid gap-6 max-w-2xl">
                {/* Change Password */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(['new', 'confirm'] as const).map((field) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-foreground mb-2 capitalize">{field === 'new' ? 'New Password' : 'Confirm Password'}</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showPasswords[field] ? 'text' : 'password'}
                            value={passwords[field]}
                            onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                            placeholder={field === 'new' ? 'Min 6 characters' : 'Re-enter password'}
                            className="pl-10 pr-10"
                          />
                          <button type="button" onClick={() => setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <Button onClick={handleChangePassword} disabled={isChangingPassword || !passwords.new || !passwords.confirm} className="mt-2">
                      {isChangingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : <><Shield className="w-4 h-4 mr-2" /> Update Password</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Session Info */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-blue-500" />
                      </div>
                      Session Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { label: 'User ID', value: user.id.slice(0, 8) + '...' },
                        { label: 'Auth Provider', value: user.app_metadata?.provider || 'email' },
                        { label: 'Last Sign In', value: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A' },
                        { label: 'Account Created', value: new Date(user.created_at).toLocaleDateString() },
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border border-destructive/20 bg-destructive/[0.02]">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base text-destructive flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </div>
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Once you sign out, your session will be cleared. To delete your account, please contact support.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleSignOut} className="border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out All Devices
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Reviews Tab ─── */}
            <TabsContent value="reviews" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-foreground">My Reviews</h2>
                <Button variant="gold" asChild><Link to="/feedback">Write a Review</Link></Button>
              </div>
              
              {feedbacks.length === 0 ? (
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-border/50">
                  <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground mb-6">Share your travel experiences to help other travelers!</p>
                  <Button variant="gold" asChild><Link to="/feedback">Write Your First Review</Link></Button>
                </div>
              ) : (
                <div className="grid gap-4 max-w-3xl">
                  {feedbacks.map((fb) => (
                    <Card key={fb.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-4 h-4 ${i < fb.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                                ))}
                              </div>
                              {fb.tour_name && <Badge variant="outline" className="text-xs">{fb.tour_name}</Badge>}
                            </div>
                            <p className="text-sm text-foreground">{fb.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">{new Date(fb.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <Badge className={fb.is_approved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-accent/10 text-accent border-accent/20'}>
                            {fb.is_approved ? 'Published' : 'Pending'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Notifications Tab ─── */}
            <TabsContent value="notifications" className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-foreground">Notification Preferences</h2>
              <div className="max-w-2xl">
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-6">
                    {[
                      { key: 'booking_updates' as const, icon: Calendar, title: 'Booking Updates', desc: 'Get notified about booking confirmations, cancellations, and changes' },
                      { key: 'promotions' as const, icon: Tag, title: 'Deals & Promotions', desc: 'Receive exclusive deals and limited-time offers' },
                      { key: 'newsletter' as const, icon: Mail, title: 'Newsletter', desc: 'Monthly travel tips, destination guides, and inspiration' },
                      { key: 'sms_alerts' as const, icon: Phone, title: 'SMS Alerts', desc: 'Important booking reminders via text message' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifPrefs[item.key]}
                          onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, [item.key]: checked })}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm mt-6">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4 text-accent" />
                      </div>
                      Quick Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: 'Contact Support', href: '/contact', icon: MessageSquare },
                      { label: 'Give Feedback', href: '/feedback', icon: Star },
                      { label: 'Browse Tours', href: '/tours', icon: MapPin },
                      { label: 'View Deals', href: '/deals', icon: Tag },
                    ].map((link, i) => (
                      <Link key={i} to={link.href} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-3">
                          <link.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
}
