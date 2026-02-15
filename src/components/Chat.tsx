import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import {
  streamChat, createConversation, saveMessage, fetchMessages,
  type Message, type ChatMessage, type UnlistenFn
} from '../lib/api';

interface Props {
  model: string;
  conversationId: string | null;
  messages: Message[];
  onConversationCreated: (id: string) => void;
  onMessageSent: () => void;
}

export default function Chat({ model, conversationId, messages, onConversationCreated, onMessageSent }: Props) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unlistenersRef = useRef<UnlistenFn[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalMessages(messages);
    setStreamingContent('');
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, streamingContent]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      unlistenersRef.current.forEach(fn => fn());
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming || !model) return;

    const userContent = input.trim();
    setInput('');
    setStreaming(true);
    setStreamingContent('');

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const title = userContent.slice(0, 50) + (userContent.length > 50 ? '...' : '');
        const conv = await createConversation(title, model);
        convId = conv.id;
        onConversationCreated(convId);
      }

      // Save user message
      await saveMessage(convId, 'user', userContent);

      // Refresh messages from DB
      const msgs = await fetchMessages(convId);
      setLocalMessages(msgs);

      // Build chat messages for Ollama
      const chatMessages: ChatMessage[] = msgs.map(m => ({ role: m.role, content: m.content }));

      // Stream response
      let fullContent = '';
      unlistenersRef.current = await streamChat(
        model,
        chatMessages,
        convId,
        (token) => {
          fullContent += token;
          setStreamingContent(prev => prev + token);
        },
        async () => {
          // Save assistant message
          if (fullContent) {
            await saveMessage(convId!, 'assistant', fullContent);
          }
          setStreamingContent('');
          setStreaming(false);
          // Refresh
          const updated = await fetchMessages(convId!);
          setLocalMessages(updated);
          onMessageSent();
          // Cleanup listeners
          unlistenersRef.current.forEach(fn => fn());
          unlistenersRef.current = [];
        },
        (error) => {
          setStreamingContent(prev => prev + `\n\n⚠️ Error: ${error}`);
          setStreaming(false);
          unlistenersRef.current.forEach(fn => fn());
          unlistenersRef.current = [];
        }
      );
    } catch (err) {
      setStreamingContent(`⚠️ Error: ${err}`);
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function stopStreaming() {
    unlistenersRef.current.forEach(fn => fn());
    unlistenersRef.current = [];
    if (streamingContent) {
      setLocalMessages(prev => [...prev, {
        id: String(Date.now()),
        conversation_id: conversationId || '',
        role: 'assistant' as const,
        content: streamingContent,
        created_at: new Date().toISOString()
      }]);
      setStreamingContent('');
    }
    setStreaming(false);
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {localMessages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium mb-1">AI Command Center</p>
            <p className="text-sm">Select a model and start chatting</p>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {localMessages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {streamingContent && (
            <MessageBubble role="assistant" content={streamingContent} />
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-dark-border p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={model ? 'Type a message...' : 'Select a model first'}
            disabled={!model}
            rows={1}
            className="flex-1 bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '200px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 200) + 'px';
            }}
          />
          {streaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !model}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
