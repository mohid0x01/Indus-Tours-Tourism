import { useState, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { TestimonialSkeleton } from '@/components/common/LoadingSkeleton';

interface Feedback {
  id: string;
  name: string;
  message: string;
  rating: number;
  tour_name: string | null;
  is_featured: boolean;
  created_at: string;
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Feedback[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from('feedback_public')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) setTestimonials(data as Feedback[]);
      setIsLoading(false);
    };
    fetchTestimonials();
  }, []);

  const navigate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      if (newDirection > 0) return (prev + 1) % testimonials.length;
      return (prev - 1 + testimonials.length) % testimonials.length;
    });
  }, [testimonials.length]);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => navigate(1), 6000);
    return () => clearInterval(timer);
  }, [testimonials.length, navigate]);

  if (isLoading) return <TestimonialSkeleton />;
  if (testimonials.length === 0) return null;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const current = testimonials[currentIndex];

  return (
    <section id="testimonials" data-section className="py-20 md:py-32 bg-secondary/20 overflow-hidden luxury-section relative">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center max-w-3xl mx-auto mb-14 md:mb-20"
        >
          <span className="premium-badge mb-6 inline-flex">
            <MessageCircle className="w-4 h-4" />
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-4 md:mb-6">
            What Our Travelers
            <span className="text-gradient-gold"> Say</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground px-4 leading-relaxed max-w-2xl mx-auto">
            Real stories from real travelers who experienced the magic of Pakistan's north with us.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-gold" />
            <div className="gold-divider" />
            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-gold" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-primary/30" />
          </div>
        </motion.div>

        {/* Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <div className="relative glass-ultra rounded-2xl sm:rounded-3xl p-8 sm:p-10 md:p-14 shadow-ultra min-h-[280px] sm:min-h-[320px]">
            {/* Decorative quote */}
            <div className="absolute top-6 right-6 sm:top-8 sm:right-8 opacity-[0.06]">
              <Quote className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
            </div>
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8">
              <div className="w-12 h-px bg-gradient-to-r from-accent/30 to-transparent" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="space-y-6"
              >
                {/* Stars */}
                <div className="flex gap-1.5">
                  {Array.from({ length: current.rating || 0 }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent drop-shadow-sm" />
                  ))}
                </div>

                {/* Message */}
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground leading-relaxed font-serif italic">
                  "{current.message}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 pt-6 border-t border-border/30">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-teal ring-2 ring-primary/20">
                    {getInitials(current.name)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-base sm:text-lg">
                      {current.name}
                    </h4>
                    {current.tour_name && (
                      <p className="text-sm text-primary/70 font-medium mt-0.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-accent" />
                        {current.tour_name}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Nav */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center justify-center gap-5 mt-10"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full border-border/30 hover:border-primary/30 hover:bg-primary/5 hover:shadow-teal transition-all w-11 h-11"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex gap-2.5">
              {testimonials.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => { setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
                  className={`rounded-full transition-colors duration-300 ${
                    index === currentIndex
                      ? 'bg-primary shadow-teal'
                      : 'bg-muted-foreground/15 hover:bg-muted-foreground/30'
                  }`}
                  animate={{
                    width: index === currentIndex ? 40 : 10,
                    height: 10,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(1)}
              className="rounded-full border-border/30 hover:border-primary/30 hover:bg-primary/5 hover:shadow-teal transition-all w-11 h-11"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
