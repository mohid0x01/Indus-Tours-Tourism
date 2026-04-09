import { useState, useEffect } from 'react';
import { MapPin, Navigation, Mountain, Users, User, Loader2, Sun, CloudRain, Snowflake, Leaf, Backpack, Thermometer, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import WeatherWidget from '@/components/common/WeatherWidget';
import { getDestinationImage } from '@/lib/destinationImages';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';

interface Destination {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  highlights: string[] | null;
  best_time: string | null;
  is_featured: boolean;
}

interface Tour {
  id: string;
  title: string;
  price: number;
  discount_price: number | null;
  max_group_size: number | null;
}

// Famous places data for northern Pakistan destinations
const famousPlaces: Record<string, string[]> = {
  'hunza': ['Karimabad', 'Eagle\'s Nest', 'Baltit Fort', 'Altit Fort', 'Attabad Lake', 'Passu Cones', 'Borith Lake'],
  'skardu': ['Shangrila Resort', 'Upper Kachura Lake', 'Lower Kachura Lake', 'Deosai Plains', 'Satpara Lake', 'Skardu Fort'],
  'fairy meadows': ['Nanga Parbat Base Camp', 'Beyal Camp', 'Raikot Bridge', 'Tattu Village'],
  'swat': ['Malam Jabba', 'Fizagat Park', 'Mingora Bazaar', 'Swat Museum', 'Mahodand Lake', 'Ushu Forest'],
  'naran': ['Saif ul Malook Lake', 'Lulusar Lake', 'Babusar Pass', 'Ansoo Lake', 'Lalazar Plateau'],
  'kaghan': ['Shogran', 'Siri Paye', 'Payee Meadows', 'Dudipatsar Lake'],
  'chitral': ['Kalash Valley', 'Shandur Pass', 'Garam Chashma', 'Chitral Fort', 'Shahi Mosque'],
  'gilgit': ['Naltar Valley', 'Kargah Buddha', 'Gilgit River', 'Phander Lake'],
  'neelum': ['Sharda', 'Kel', 'Arang Kel', 'Ratti Gali Lake', 'Shounter Lake'],
  'murree': ['Mall Road', 'Pindi Point', 'Kashmir Point', 'Patriata (New Murree)', 'Ayubia National Park'],
  'nathia gali': ['Mushkpuri Top', 'Miranjani Top', 'Ayubia National Park', 'Pipeline Track'],
  'kumrat': ['Jahaz Banda', 'Katora Lake', 'Do Kala Chashma', 'Kumrat Waterfall'],
  'deosai': ['Sheosar Lake', 'Bara Pani', 'Kala Pani', 'Deosai Wildlife'],
  'astore': ['Rama Lake', 'Rama Meadows', 'Rupal Valley', 'Nanga Parbat South Face', 'Gudai Waterfall', 'Rattu Fort', 'Minimarg'],
  'khunjerab': ['Khunjerab Pass (4,693m)', 'Pakistan-China Border', 'Marco Polo Sheep', 'Snow Leopard Territory', 'Khunjerab National Park', 'Dih Village'],
  'naltar': ['Satrangi Lake', 'Pari Lake', 'Naltar Ski Resort', 'Naltar Pine Forest', 'Bashkiri Lake', 'Naltar Meadows'],
  'islamabad': ['Faisal Mosque', 'Margalla Hills', 'Trail 5', 'Daman-e-Koh', 'Pakistan Monument', 'Lok Virsa Museum', 'Centaurus Mall', 'Saidpur Village', 'Rawal Lake'],
  'ayubia': ['Ayubia National Park', 'Pipeline Track', 'Dunga Gali', 'Mushkpuri Top', 'Miranjani Top', 'Nathia Gali Church', 'Khanspur'],
};

// Approximate distances from Islamabad (km)
const distancesFromIslamabad: Record<string, number> = {
  'hunza': 610, 'skardu': 620, 'fairy meadows': 510, 'swat': 270, 'naran': 275,
  'kaghan': 250, 'chitral': 465, 'gilgit': 550, 'neelum': 230, 'murree': 65,
  'nathia gali': 85, 'kumrat': 350, 'deosai': 560, 'astore': 520, 'khunjerab': 810,
  'naltar': 580, 'islamabad': 0, 'ayubia': 80,
};

// Seasonal travel guide data
interface SeasonInfo {
  season: string;
  months: string;
  icon: 'sun' | 'rain' | 'snow' | 'leaf';
  temp: string;
  rating: number; // 1-5 stars
  crowd: string;
  highlight: string;
  packing: string[];
}

const seasonalGuides: Record<string, SeasonInfo[]> = {
  'hunza': [
    { season: 'Spring', months: 'Mar–May', icon: 'leaf', temp: '8–22°C', rating: 5, crowd: 'Moderate', highlight: 'Cherry blossoms in full bloom, clear mountain views', packing: ['Light layers', 'Camera', 'Sunscreen', 'Warm jacket for evenings'] },
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '15–30°C', rating: 4, crowd: 'High', highlight: 'Best weather, all roads open, festival season', packing: ['Light clothes', 'Sunscreen SPF 50+', 'Hat', 'Comfortable shoes'] },
    { season: 'Autumn', months: 'Sep–Nov', icon: 'leaf', temp: '5–20°C', rating: 5, crowd: 'Moderate', highlight: 'Golden foliage, harvest festivals, crystal-clear skies', packing: ['Warm layers', 'Camera', 'Fleece jacket', 'Walking shoes'] },
    { season: 'Winter', months: 'Dec–Feb', icon: 'snow', temp: '-10–5°C', rating: 2, crowd: 'Low', highlight: 'Snowy landscapes, KKH may close, very cold', packing: ['Heavy winter gear', 'Thermals', 'Snow boots', 'Hand warmers'] },
  ],
  'skardu': [
    { season: 'Spring', months: 'Apr–May', icon: 'leaf', temp: '5–18°C', rating: 3, crowd: 'Low', highlight: 'Snow melting, waterfalls at peak, roads reopening', packing: ['Warm layers', 'Waterproof boots', 'Rain jacket'] },
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '10–25°C', rating: 5, crowd: 'High', highlight: 'Best time — Deosai open, lakes accessible, clear skies', packing: ['Layered clothing', 'Sunscreen', 'Trekking boots', 'Altitude medicine'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '5–18°C', rating: 4, crowd: 'Moderate', highlight: 'Stunning fall colors, fewer crowds, pleasant weather', packing: ['Warm jacket', 'Camera', 'Comfortable shoes'] },
    { season: 'Winter', months: 'Nov–Mar', icon: 'snow', temp: '-15–0°C', rating: 1, crowd: 'Very Low', highlight: 'Extreme cold, roads blocked, frozen lakes', packing: ['Extreme cold gear', 'Not recommended for tourism'] },
  ],
  'fairy meadows': [
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '5–20°C', rating: 5, crowd: 'High', highlight: 'Best trekking weather, wildflowers, clear Nanga Parbat views', packing: ['Trekking boots', 'Rain gear', 'Sleeping bag', 'Warm layers'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '0–15°C', rating: 4, crowd: 'Moderate', highlight: 'Golden meadows, fewer trekkers, stunning light', packing: ['Heavy warm layers', 'Trekking poles', 'Headlamp'] },
    { season: 'Spring', months: 'May', icon: 'leaf', temp: '3–15°C', rating: 3, crowd: 'Low', highlight: 'Trail opening, some snow patches, fresh greenery', packing: ['Waterproof boots', 'Warm clothing', 'Rain jacket'] },
    { season: 'Winter', months: 'Nov–Apr', icon: 'snow', temp: '-15–-5°C', rating: 1, crowd: 'Closed', highlight: 'Inaccessible — heavy snow, trails closed', packing: ['Not accessible'] },
  ],
  'swat': [
    { season: 'Spring', months: 'Mar–May', icon: 'leaf', temp: '15–28°C', rating: 5, crowd: 'Moderate', highlight: 'Flowers blooming, pleasant weather, green valleys', packing: ['Light layers', 'Camera', 'Sunscreen', 'Walking shoes'] },
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '20–35°C', rating: 3, crowd: 'Very High', highlight: 'Warm in Mingora, pleasant in Kalam, monsoon rains', packing: ['Light clothes', 'Umbrella', 'Insect repellent'] },
    { season: 'Autumn', months: 'Sep–Nov', icon: 'leaf', temp: '10–25°C', rating: 4, crowd: 'Moderate', highlight: 'Pleasant weather, fall foliage, ideal for Kalam', packing: ['Light jacket', 'Camera', 'Comfortable shoes'] },
    { season: 'Winter', months: 'Dec–Feb', icon: 'snow', temp: '0–15°C', rating: 4, crowd: 'High (ski)', highlight: 'Malam Jabba skiing, snow-covered valleys, magical', packing: ['Winter gear', 'Ski equipment', 'Snow boots', 'Thermals'] },
  ],
  'naran': [
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '10–25°C', rating: 5, crowd: 'Very High', highlight: 'All lakes open, Saif ul Malook shining, wildflowers', packing: ['Warm jacket', 'Rain gear', 'Camera', 'Motion sickness pills'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '5–18°C', rating: 4, crowd: 'Moderate', highlight: 'Golden valley, fewer crowds, clear mountain views', packing: ['Warm layers', 'Camera', 'Sturdy shoes'] },
    { season: 'Spring', months: 'Apr–May', icon: 'leaf', temp: '5–15°C', rating: 2, crowd: 'Low', highlight: 'Roads opening, snow still at lakes, limited access', packing: ['Warm clothes', 'Waterproof shoes'] },
    { season: 'Winter', months: 'Nov–Mar', icon: 'snow', temp: '-10–0°C', rating: 1, crowd: 'Closed', highlight: 'Roads closed, heavy snowfall, not accessible', packing: ['Not accessible'] },
  ],
  'chitral': [
    { season: 'Summer', months: 'Jun–Sep', icon: 'sun', temp: '20–35°C', rating: 5, crowd: 'Moderate', highlight: 'Kalash festivals (Chilimjusht May, Uchal Aug), Shandur Polo July', packing: ['Light clothes', 'Camera', 'Modest dress', 'Cash'] },
    { season: 'Spring', months: 'Apr–May', icon: 'leaf', temp: '15–28°C', rating: 4, crowd: 'Low', highlight: 'Fruit blossoms, pleasant weather, Chilimjusht festival', packing: ['Light layers', 'Camera', 'Walking shoes'] },
    { season: 'Autumn', months: 'Oct–Nov', icon: 'leaf', temp: '10–22°C', rating: 3, crowd: 'Low', highlight: 'Harvest season, Choimus festival preparations', packing: ['Warm layers', 'Fleece', 'Camera'] },
    { season: 'Winter', months: 'Dec–Mar', icon: 'snow', temp: '-5–10°C', rating: 2, crowd: 'Very Low', highlight: 'Choimus festival (Dec), roads may close via Lowari', packing: ['Heavy winter gear', 'Thermals', 'Flexible schedule'] },
  ],
  'kumrat': [
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '15–28°C', rating: 5, crowd: 'Moderate', highlight: 'Lush green valley, all trails open, Jahaz Banda accessible', packing: ['Trekking boots', 'Rain gear', 'Warm layers', 'Cash'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '8–20°C', rating: 4, crowd: 'Low', highlight: 'Fall colors, clear skies, fewer visitors', packing: ['Warm jacket', 'Trekking poles', 'Camera'] },
    { season: 'Spring', months: 'May', icon: 'leaf', temp: '10–22°C', rating: 3, crowd: 'Low', highlight: 'Wildflowers, river at full flow, some trails still snowy', packing: ['Waterproof boots', 'Layers', 'First aid'] },
    { season: 'Winter', months: 'Nov–Apr', icon: 'snow', temp: '-10–5°C', rating: 1, crowd: 'Closed', highlight: 'Inaccessible — heavy snowfall blocks roads', packing: ['Not accessible'] },
  ],
  'neelum': [
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '15–30°C', rating: 5, crowd: 'High', highlight: 'All valleys accessible, Ratti Gali Lake open, lush greenery', packing: ['Trekking boots', 'Rain jacket', 'Camera', 'Warm layers'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '8–22°C', rating: 5, crowd: 'Moderate', highlight: 'Stunning fall foliage, clearer skies, fewer crowds', packing: ['Warm jacket', 'Camera', 'Sturdy shoes'] },
    { season: 'Spring', months: 'Apr–May', icon: 'leaf', temp: '10–25°C', rating: 3, crowd: 'Low', highlight: 'Blooming trees, rivers full, some trails still snowy', packing: ['Warm layers', 'Waterproof shoes', 'Rain gear'] },
    { season: 'Winter', months: 'Nov–Mar', icon: 'snow', temp: '-5–5°C', rating: 1, crowd: 'Very Low', highlight: 'Heavy snow, roads blocked beyond Kel, very cold', packing: ['Not recommended'] },
  ],
  'murree': [
    { season: 'Summer', months: 'May–Sep', icon: 'sun', temp: '15–25°C', rating: 4, crowd: 'Very High', highlight: 'Pleasant escape from heat, but extremely crowded on weekends', packing: ['Light layers', 'Umbrella', 'Camera', 'Comfortable shoes'] },
    { season: 'Spring', months: 'Mar–Apr', icon: 'leaf', temp: '10–20°C', rating: 5, crowd: 'Moderate', highlight: 'Blooming flowers, mild weather, perfect for hiking', packing: ['Light jacket', 'Walking shoes', 'Camera'] },
    { season: 'Autumn', months: 'Oct–Nov', icon: 'leaf', temp: '8–18°C', rating: 4, crowd: 'Low', highlight: 'Beautiful fall colors, quiet atmosphere, crisp air', packing: ['Warm jacket', 'Sweater', 'Camera'] },
    { season: 'Winter', months: 'Dec–Feb', icon: 'snow', temp: '-5–5°C', rating: 5, crowd: 'Very High', highlight: 'Snowfall! Magical white landscape, busy with tourists', packing: ['Winter coat', 'Snow boots', 'Gloves & hat', 'Thermals'] },
  ],
  'nathia gali': [
    { season: 'Summer', months: 'May–Sep', icon: 'sun', temp: '12–22°C', rating: 5, crowd: 'High', highlight: 'Perfect trekking weather, Pipeline Track at its best', packing: ['Trekking shoes', 'Rain jacket', 'Layers', 'Camera'] },
    { season: 'Spring', months: 'Mar–Apr', icon: 'leaf', temp: '8–18°C', rating: 4, crowd: 'Moderate', highlight: 'Wildflowers, fresh greenery, excellent for forest walks', packing: ['Light jacket', 'Walking shoes', 'Binoculars'] },
    { season: 'Autumn', months: 'Oct–Nov', icon: 'leaf', temp: '5–15°C', rating: 5, crowd: 'Low', highlight: 'Stunning fall foliage, misty trails, photographer\'s paradise', packing: ['Warm layers', 'Camera', 'Trekking shoes'] },
    { season: 'Winter', months: 'Dec–Feb', icon: 'snow', temp: '-5–5°C', rating: 3, crowd: 'Low', highlight: 'Snow-covered forests, quiet trails, cold but beautiful', packing: ['Heavy winter gear', 'Snow boots', 'Thermals', 'Hot drinks thermos'] },
  ],
  'ayubia': [
    { season: 'Summer', months: 'May–Sep', icon: 'sun', temp: '12–22°C', rating: 5, crowd: 'High', highlight: 'Perfect for Pipeline Track, Mushkpuri Top, lush forests', packing: ['Trekking shoes', 'Rain jacket', 'Camera', 'Water bottle'] },
    { season: 'Spring', months: 'Mar–Apr', icon: 'leaf', temp: '8–18°C', rating: 4, crowd: 'Moderate', highlight: 'Wildflowers, rhododendrons blooming, bird watching season', packing: ['Light layers', 'Binoculars', 'Walking shoes'] },
    { season: 'Autumn', months: 'Oct–Nov', icon: 'leaf', temp: '5–15°C', rating: 5, crowd: 'Low', highlight: 'Golden oak forests, misty mornings, perfect photography', packing: ['Warm jacket', 'Camera', 'Trekking poles'] },
    { season: 'Winter', months: 'Dec–Feb', icon: 'snow', temp: '-5–5°C', rating: 3, crowd: 'Low', highlight: 'Snow-dusted trails, winter birding, peaceful atmosphere', packing: ['Winter gear', 'Waterproof boots', 'Thermals'] },
  ],
  'islamabad': [
    { season: 'Spring', months: 'Mar–Apr', icon: 'leaf', temp: '20–30°C', rating: 5, crowd: 'Moderate', highlight: 'Perfect weather, Margalla wildflowers, jacaranda blooms', packing: ['Light clothes', 'Sunscreen', 'Walking shoes', 'Camera'] },
    { season: 'Summer', months: 'May–Jul', icon: 'sun', temp: '35–45°C', rating: 2, crowd: 'Low', highlight: 'Very hot, monsoon rains Jul-Aug, indoor attractions best', packing: ['Light cotton clothes', 'Umbrella', 'Water bottle', 'Sunscreen'] },
    { season: 'Autumn', months: 'Oct–Nov', icon: 'leaf', temp: '18–28°C', rating: 5, crowd: 'Moderate', highlight: 'Pleasant weather, ideal for hiking trails & sightseeing', packing: ['Light layers', 'Comfortable shoes', 'Camera'] },
    { season: 'Winter', months: 'Dec–Feb', icon: 'snow', temp: '5–18°C', rating: 4, crowd: 'Low', highlight: 'Mild winter, foggy mornings, comfortable exploration', packing: ['Light jacket', 'Sweater', 'Comfortable shoes'] },
  ],
  'astore': [
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '10–25°C', rating: 5, crowd: 'Low', highlight: 'Best time — Rama Lake accessible, Rupal Valley open, wildflowers', packing: ['Trekking boots', 'Warm layers', 'Altitude medicine', 'Binoculars'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '5–18°C', rating: 4, crowd: 'Very Low', highlight: 'Golden meadows, crystal-clear views of Nanga Parbat', packing: ['Heavy warm layers', 'Camera', 'Trekking gear'] },
    { season: 'Spring', months: 'May', icon: 'leaf', temp: '5–18°C', rating: 3, crowd: 'Very Low', highlight: 'Snow melting, waterfalls at peak, roads reopening', packing: ['Waterproof boots', 'Warm clothes', 'First aid'] },
    { season: 'Winter', months: 'Nov–Apr', icon: 'snow', temp: '-15–0°C', rating: 1, crowd: 'Closed', highlight: 'Roads blocked, extreme cold, not accessible', packing: ['Not accessible'] },
  ],
  'khunjerab': [
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '-5–10°C', rating: 5, crowd: 'Moderate', highlight: 'Pass open, border crossing active, Marco Polo sheep sightings', packing: ['Heavy down jacket', 'Thermals', 'Altitude medicine', 'Gloves', 'UV sunglasses'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '-10–5°C', rating: 3, crowd: 'Low', highlight: 'Pass may close early, stunning clear views, less traffic', packing: ['Heavy winter gear', 'Thermal base layers', 'Camera'] },
    { season: 'Spring', months: 'May', icon: 'leaf', temp: '-10–5°C', rating: 2, crowd: 'Low', highlight: 'Pass reopening, unstable weather, limited services', packing: ['Winter gear', 'Flexible schedule', 'Emergency supplies'] },
    { season: 'Winter', months: 'Nov–Apr', icon: 'snow', temp: '-25–-10°C', rating: 1, crowd: 'Closed', highlight: 'Pass completely closed, extreme cold', packing: ['Not accessible'] },
  ],
  'naltar': [
    { season: 'Summer', months: 'Jun–Aug', icon: 'sun', temp: '10–22°C', rating: 5, crowd: 'Moderate', highlight: 'Lakes at their most colorful, wildflower meadows, perfect hiking', packing: ['Trekking shoes', 'Warm layers', 'Camera with polarizer', 'Rain jacket'] },
    { season: 'Autumn', months: 'Sep–Oct', icon: 'leaf', temp: '5–15°C', rating: 4, crowd: 'Low', highlight: 'Fall foliage around lakes, fewer visitors, crisp air', packing: ['Warm jacket', 'Camera', 'Fleece layers'] },
    { season: 'Winter', months: 'Dec–Mar', icon: 'snow', temp: '-10–0°C', rating: 4, crowd: 'Moderate (ski)', highlight: 'Pakistan\'s best skiing! Naltar Ski Resort, snow sports', packing: ['Ski gear', 'Winter clothing', 'Snow boots', 'Thermals'] },
    { season: 'Spring', months: 'Apr–May', icon: 'leaf', temp: '5–15°C', rating: 3, crowd: 'Low', highlight: 'Snow melting, forests freshening up, roads clearing', packing: ['Waterproof boots', 'Layers', 'Rain jacket'] },
  ],
  'deosai': [
    { season: 'Summer', months: 'Jul–Aug', icon: 'sun', temp: '0–15°C', rating: 5, crowd: 'Moderate', highlight: 'Only accessible months! Wildflower carpets, brown bear sightings', packing: ['Heavy warm gear', 'Sleeping bag', 'Altitude medicine', 'Binoculars', 'Thermos'] },
    { season: 'Early Summer', months: 'Jun', icon: 'leaf', temp: '-5–10°C', rating: 3, crowd: 'Low', highlight: 'Park opening, some areas still snowy, limited wildlife', packing: ['Winter gear', 'Waterproof boots', '4x4 essential'] },
    { season: 'Autumn', months: 'Sep', icon: 'leaf', temp: '-5–10°C', rating: 3, crowd: 'Low', highlight: 'Last chance before closing, golden grasslands, clear views', packing: ['Heavy warm gear', 'Emergency supplies', 'First aid'] },
    { season: 'Winter', months: 'Oct–May', icon: 'snow', temp: '-30–-10°C', rating: 1, crowd: 'Closed', highlight: 'Completely inaccessible, buried under meters of snow', packing: ['Not accessible'] },
  ],
};

const seasonIcons = {
  sun: Sun,
  rain: CloudRain,
  snow: Snowflake,
  leaf: Leaf,
};

function getDestKey(name: string): string | undefined {
  const lower = name.toLowerCase();
  return Object.keys(famousPlaces).find(k => lower.includes(k));
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const destCoords: Record<string, [number, number]> = {
  'hunza': [36.316, 74.649], 'skardu': [35.297, 75.633], 'fairy meadows': [35.375, 74.588],
  'swat': [35.222, 72.362], 'naran': [34.909, 73.651], 'kaghan': [34.801, 73.512],
  'chitral': [35.852, 71.782], 'gilgit': [35.920, 74.308], 'neelum': [34.753, 73.909],
  'murree': [33.908, 73.392], 'nathia gali': [34.073, 73.385], 'kumrat': [35.524, 72.227],
  'deosai': [35.088, 75.491], 'astore': [35.366, 74.856], 'khunjerab': [36.850, 75.423],
  'naltar': [36.167, 74.175], 'islamabad': [33.684, 73.048], 'ayubia': [34.060, 73.395],
};

const ISLAMABAD_COORDS: [number, number] = [33.6844, 73.0479];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= rating ? 'bg-accent' : 'bg-muted'}`} />
      ))}
    </div>
  );
}

interface Props {
  dest: Destination | null;
  onClose: () => void;
}

export default function DestinationDetailDialog({ dest, onClose }: Props) {
  const { format } = useCurrency();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loadingTours, setLoadingTours] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);

  useEffect(() => {
    if (!dest) return;
    setLoadingTours(true);
    setExpandedSeason(null);
    supabase
      .from('tours')
      .select('id, title, price, discount_price, max_group_size')
      .eq('destination_id', dest.id)
      .eq('is_active', true)
      .then(({ data }) => {
        setTours(data || []);
        setLoadingTours(false);
      });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => setLocationDenied(true),
        { timeout: 5000 }
      );
    } else {
      setLocationDenied(true);
    }
  }, [dest]);

  if (!dest) return null;

  const key = getDestKey(dest.name);
  const places = key ? famousPlaces[key] : null;
  const destCoord = key ? destCoords[key] : null;
  const seasons = key ? seasonalGuides[key] : null;

  let distanceKm: number | null = null;
  let distanceFrom = 'Islamabad';

  if (destCoord) {
    if (userLocation && !locationDenied) {
      distanceKm = Math.round(calculateDistance(userLocation[0], userLocation[1], destCoord[0], destCoord[1]));
      distanceFrom = 'your location';
    } else if (key && distancesFromIslamabad[key]) {
      distanceKm = distancesFromIslamabad[key];
      distanceFrom = 'Islamabad';
    }
  }

  return (
    <Dialog open={!!dest} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{dest.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <img
            src={getDestinationImage(dest.name, dest.image_url)}
            alt={dest.name}
            className="w-full h-48 object-cover rounded-xl"
          />

          {dest.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              {dest.location}
            </div>
          )}

          {distanceKm !== null && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Navigation className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Distance from {distanceFrom}</p>
                <p className="font-semibold text-foreground">~{distanceKm.toLocaleString()} km</p>
              </div>
            </div>
          )}

          {dest.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{dest.description}</p>
          )}

          {dest.best_time && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground">Best Time to Visit</p>
              <p className="font-medium text-foreground">{dest.best_time}</p>
            </div>
          )}

          {/* Seasonal Travel Guide */}
          {seasons && seasons.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Seasonal Travel Guide
              </p>
              <div className="grid grid-cols-2 gap-2">
                {seasons.map((s, i) => {
                  const IconComp = seasonIcons[s.icon];
                  const isExpanded = expandedSeason === i;
                  return (
                    <button
                      key={s.season}
                      onClick={() => setExpandedSeason(isExpanded ? null : i)}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                        isExpanded
                          ? 'col-span-2 bg-primary/5 border-primary/20 shadow-sm'
                          : 'bg-secondary/50 border-border/30 hover:border-primary/20 hover:bg-secondary/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <IconComp className={`w-3.5 h-3.5 ${s.rating >= 4 ? 'text-accent' : s.rating >= 3 ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-semibold text-foreground">{s.season}</span>
                        <RatingStars rating={s.rating} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{s.months}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Thermometer className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{s.temp}</span>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 animate-fade-up">
                          <p className="text-xs text-foreground leading-relaxed">{s.highlight}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="w-3 h-3" />
                            Crowd: {s.crowd}
                          </div>
                          {s.packing.length > 0 && s.packing[0] !== 'Not accessible' && s.packing[0] !== 'Not recommended' && (
                            <div>
                              <p className="text-[10px] font-medium text-foreground flex items-center gap-1 mb-1">
                                <Backpack className="w-3 h-3 text-primary" />
                                What to Pack
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {s.packing.map((item) => (
                                  <span key={item} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {(s.packing[0] === 'Not accessible' || s.packing[0] === 'Not recommended') && (
                            <p className="text-[10px] text-destructive font-medium">⚠️ {s.packing[0]}</p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Famous Places */}
          {places && places.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Mountain className="w-4 h-4 text-primary" />
                Famous Visiting Places
              </p>
              <div className="flex flex-wrap gap-1.5">
                {places.map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {dest.highlights && dest.highlights.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Highlights</p>
              <div className="flex flex-wrap gap-1.5">
                {dest.highlights.map((h) => (
                  <span key={h} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tour Prices */}
          {loadingTours ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : tours.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Tour Packages & Pricing</p>
              <div className="space-y-2">
                {tours.map((tour) => {
                  const price = tour.discount_price || tour.price;
                  const groupSize = tour.max_group_size || 10;
                  return (
                    <div key={tour.id} className="p-3 rounded-xl bg-secondary/50 border border-border/30">
                      <p className="text-sm font-medium text-foreground mb-2">{tour.title}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Per Person</p>
                            <p className="text-sm font-bold text-primary">{format(price)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/5">
                          <Users className="w-3.5 h-3.5 text-accent" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">Group ({groupSize} pax)</p>
                            <p className="text-sm font-bold text-accent">
                              {format(Math.round(price * groupSize * 0.85))}
                            </p>
                          </div>
                        </div>
                      </div>
                      {tour.discount_price && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-through">
                          Original: {format(tour.price)}/person
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">No tours currently linked to this destination</p>
            </div>
          )}

          <WeatherWidget location={dest.name} />

          <div className="flex gap-2">
            <Button variant="gold" className="flex-1" asChild>
              <Link to={`/tours`}>Browse Tours in {dest.name}</Link>
            </Button>
            <Button variant="default" className="flex-1" asChild>
              <Link to={`/booking`}>Book Now</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
