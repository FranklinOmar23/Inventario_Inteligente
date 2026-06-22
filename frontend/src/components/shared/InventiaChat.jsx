import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}
      <div
        className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function InventiaChat() {
  const { tenant } = useAuth();
  const isPro = tenant?.plan === 'pro' || tenant?.plan === 'enterprise';

  const [open,       setOpen]       = useState(false);
  const [minimized,  setMinimized]  = useState(false);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [history,    setHistory]    = useState([
    { role: 'assistant', content: `¡Hola! Soy **Inventia**, tu asistente de inventario 👋\n\nPuedo ayudarte a consultar el estado actual del inventario, buscar artículos, ver estadísticas por categoría o departamento, y más. ¿En qué te ayudo?` },
  ]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, minimized, history]);

  if (!isPro) return null;

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg };
    setHistory(h => [...h, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const contextHistory = history
        .filter(h => h.role !== 'system')
        .slice(-10)
        .map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));

      const { data } = await api.post('/ai/chat', {
        message: msg,
        history: contextHistory,
      });
      setHistory(h => [...h, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Ocurrió un error. Intenta de nuevo.';
      setHistory(h => [...h, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* FAB trigger */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
          title="Hablar con Inventia"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl transition-all duration-200 ${
            minimized ? 'h-14 w-80' : 'w-96 h-[540px]'
          }`}
          style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 2rem)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border rounded-t-2xl bg-primary text-primary-foreground flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-none">Inventia</p>
              <p className="text-xs opacity-70 mt-0.5">Asistente de Inventario</p>
            </div>
            <button
              onClick={() => setMinimized(m => !m)}
              className="p-1 rounded hover:bg-primary-foreground/20 transition-colors"
            >
              {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-primary-foreground/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {history.map((msg, i) => <Message key={i} msg={msg} />)}
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Consultando inventario…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex items-end gap-2 p-3 border-t border-border flex-shrink-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Pregunta sobre el inventario…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary max-h-28 disabled:opacity-50 leading-relaxed"
                  style={{ overflowY: 'auto' }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
