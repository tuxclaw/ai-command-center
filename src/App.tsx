import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import ModelSelector from './components/ModelSelector';
import SystemStats from './components/SystemStats';
import {
  fetchConversations, fetchMessages,
  deleteConversation as deleteConv,
  type Conversation, type Message
} from './lib/api';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [model, setModel] = useState(() => localStorage.getItem('selected-model') || '');

  useEffect(() => {
    if (model) localStorage.setItem('selected-model', model);
  }, [model]);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await fetchConversations());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  async function selectConversation(id: string) {
    setActiveConvId(id);
    try {
      setMessages(await fetchMessages(id));
    } catch { setMessages([]); }
  }

  function newChat() {
    setActiveConvId(null);
    setMessages([]);
  }

  async function handleDelete(id: string) {
    await deleteConv(id);
    if (activeConvId === id) newChat();
    loadConversations();
  }

  function handleConversationCreated(id: string) {
    setActiveConvId(id);
    loadConversations();
  }

  function handleMessageSent() {
    loadConversations();
    if (activeConvId) {
      fetchMessages(activeConvId).then(setMessages).catch(() => {});
    }
  }

  return (
    <div className="h-screen flex">
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={selectConversation}
        onNew={newChat}
        onDelete={handleDelete}
      />

      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="h-14 border-b border-dark-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-300">Model:</span>
            <ModelSelector selectedModel={model} onSelect={setModel} />
          </div>
          <SystemStats />
        </div>

        {/* Chat area */}
        <Chat
          model={model}
          conversationId={activeConvId}
          messages={messages}
          onConversationCreated={handleConversationCreated}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
