import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;

const QUICK_PROMPTS = [
  "🏔️ Best tours for beginners?",
  "💰 Any active deals?",
  "📅 Best time to visit Hunza?",
  "🚐 Available vehicles?",
];

async function streamChat({
  messages,
  context,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  context: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, context }),
  });

  if (!resp.ok || !resp.body) {
    const errorData = await resp.json().catch(() => ({}));
    onError(errorData.error || "Failed to connect to AI assistant");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Salam! 🏔️ I'm your **Indus Tours** travel assistant. Ask me anything about Northern Pakistan — tours, destinations, deals, weather tips, or help planning your dream adventure!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Lock body scroll on mobile when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const sendMessage = async (overrideMsg?: string) => {
    const msgText = overrideMsg || input.trim();
    if (!msgText || isLoading) return;
    if (!overrideMsg) setInput('');
    const userMessage: Message = { role: 'user', content: msgText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const [toursRes, destsRes, dealsRes, vehiclesRes, hotelsRes] = await Promise.all([
        supabase.from('tours').select('title, description, price, discount_price, duration, difficulty, includes').eq('is_active', true).limit(20),
        supabase.from('destinations').select('name, description, best_time, location, highlights').limit(20),
        supabase.from('deals').select('title, description, discount_percent, code, valid_until').eq('is_active', true).limit(10),
        supabase.from('vehicles').select('name, type, capacity, price_per_day, features').eq('is_available', true).limit(10),
        supabase.from('hotels').select('name, location, star_rating, amenities').eq('is_active', true).limit(10),
      ]);

      const context = `
Available Tours: ${JSON.stringify(toursRes.data || [])}
Destinations: ${JSON.stringify(destsRes.data || [])}
Active Deals: ${JSON.stringify(dealsRes.data || [])}
Vehicles for Rent: ${JSON.stringify(vehiclesRes.data || [])}
Hotels: ${JSON.stringify(hotelsRes.data || [])}
Company: Indus Tours Pakistan, based in Islamabad, specializing in Northern Pakistan tours.
Contact: WhatsApp +92-311-8088007, Email admin@industours.pk
Website: industourspakistan.lovable.app
Booking Page: /booking
`;

      let assistantSoFar = "";
      const allMessages = [...messages, userMessage];

      const upsertAssistant = (nextChunk: string) => {
        assistantSoFar += nextChunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.content === msgText) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      await streamChat({
        messages: allMessages,
        context,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
        onError: (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: err || "Sorry, I couldn't process that. Please try again!" }]);
          setIsLoading(false);
        },
      });
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection issue. Please try again!" }]);
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      { role: 'assistant', content: "Salam! 🏔️ I'm your **Indus Tours** travel assistant. Ask me anything about Northern Pakistan — tours, destinations, deals, weather tips, or help planning your dream adventure!" }
    ]);
  };

  const showQuickPrompts = messages.length <= 1 && !isLoading;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform animate-bounce sm:bottom-24 sm:right-6"
        aria-label="Open AI Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-4 z-50 sm:w-[400px] sm:h-[550px] bg-background sm:border sm:border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden sm:max-h-[80vh]">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">Indus AI Assistant</p>
            <p className="text-[11px] opacity-70 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Always ready to help
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={resetChat} className="hover:bg-primary-foreground/20 rounded-lg p-2 transition-colors" title="New Chat">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:bg-primary-foreground/20 rounded-lg p-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1 [&>p+p]:mt-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mt-2 [&>h3]:mb-1 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-accent" />
              </div>
            )}
          </div>
        ))}

        {/* Quick prompts */}
        {showQuickPrompts && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Quick questions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-3 py-2 rounded-full bg-primary/5 text-primary border border-primary/15 hover:bg-primary/10 hover:border-primary/30 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about tours, destinations..."
            className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30 placeholder:text-muted-foreground/60"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-center text-muted-foreground/50 mt-2">Powered by Indus Tours AI</p>
      </div>
    </div>
  );
}
