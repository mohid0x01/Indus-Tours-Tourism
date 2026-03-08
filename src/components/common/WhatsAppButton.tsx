import { MessageCircle } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function WhatsAppButton() {
  const { data: content } = useSiteContent();
  const whatsappNumber = ((content?.whatsapp as string) || '+923118088007').replace(/[^0-9+]/g, '');
  const cleanNumber = whatsappNumber.replace('+', '');

  return (
    <a
      href={`https://wa.me/${cleanNumber}?text=Hi%20Indus%20Tours!%20I%20am%20interested%20in%20booking%20a%20tour.`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 fill-current" />
      <span className="absolute right-16 bg-card text-foreground text-sm px-3 py-2 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Chat with us!
      </span>
    </a>
  );
}
