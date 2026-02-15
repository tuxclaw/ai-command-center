import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export type { UnlistenFn };

export interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface SystemStats {
  cpu_percent: number;
  ram_total: number;
  ram_used: number;
  ram_percent: number;
  disk_total: number;
  disk_used: number;
  disk_percent: number;
  uptime: number;
  ollama_status: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export async function fetchModels(): Promise<OllamaModel[]> {
  return invoke<OllamaModel[]>('list_models');
}

export async function fetchConversations(): Promise<Conversation[]> {
  return invoke<Conversation[]>('list_conversations');
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  return invoke<Message[]>('get_conversation', { id: conversationId });
}

export async function createConversation(title: string, model: string): Promise<Conversation> {
  return invoke<Conversation>('create_conversation', { title, model });
}

export async function saveMessage(conversationId: string, role: string, content: string): Promise<Message> {
  return invoke<Message>('save_message', { conversationId, role, content });
}

export async function deleteConversation(id: string): Promise<void> {
  return invoke<void>('delete_conversation', { id });
}

export async function fetchSystemStats(): Promise<SystemStats> {
  return invoke<SystemStats>('get_system_stats');
}

export async function streamChat(
  model: string,
  messages: ChatMessage[],
  conversationId: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<UnlistenFn[]> {
  const unlisteners: UnlistenFn[] = [];

  const unlistenToken = await listen<{ token: string; conversation_id: string }>('chat-token', (event) => {
    if (event.payload.conversation_id === conversationId) {
      onToken(event.payload.token);
    }
  });
  unlisteners.push(unlistenToken);

  const unlistenDone = await listen<{ conversation_id: string }>('chat-done', (event) => {
    if (event.payload.conversation_id === conversationId) {
      onDone();
    }
  });
  unlisteners.push(unlistenDone);

  invoke('stream_chat', { model, messages, conversationId }).catch((err: unknown) => {
    onError(String(err));
  });

  return unlisteners;
}
