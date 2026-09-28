import { Key, ReactNode } from "react";

// --- Tipos ---
export type Message = {
  id: Key;
  text: ReactNode;
  sender: "user" | "bot";
  timestamp: string;
};

export type PatientListItem = {
  id: string;
  name: string;
};

export type ConsultationListItem = {
  id: string;
  title: string;
  date: string;
};

export type ChatHistoryMessage = {
  role?: string;
  parts?: Array<{ text?: string }>;
  timestamp?: string;
};

export type TranscriptionDialogueTurn = {
  role?: string;
  role_key?: string;
  text?: string;
};

export type TranscriptionLogItem = {
  id?: Key;
  consultation_id?: string | null;
  timestamp?: string;
  created_at?: string;
  duration?: string;
  text?: string;
  text_summary?: string;
  dialogue?: TranscriptionDialogueTurn[];
};

export type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Mensagem do assistente exibida no chat (avisos, erros e confirmações).
export function botMessage(text: ReactNode): Message {
  return {
    id: Date.now(),
    text,
    sender: "bot",
    timestamp: new Date().toISOString(),
  };
}
