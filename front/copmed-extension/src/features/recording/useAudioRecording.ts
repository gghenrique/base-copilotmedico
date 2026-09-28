import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { botMessage, type Message, type TranscriptionLogItem } from "../shared/types";
import { formatDuration } from "./wav";
import { useTranscriptionUpload } from "./useTranscriptionUpload";

export type RecordingParams = {
  patientId: string | null;
  consultationId: string | null;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  handleSendMessage: (messageText: string) => Promise<void>;
};

// Gravação da consulta: início automático, pausa, parada, envio para transcrição e histórico.
export function useAudioRecording({
  patientId,
  consultationId,
  setMessages,
  handleSendMessage,
}: RecordingParams) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showRecordingHistory, setShowRecordingHistory] = useState<boolean>(false);
  const [hasRecordedAudio, setHasRecordedAudio] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingDurationRef = useRef<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // Cronômetro visual
  const [viewingLog, setViewingLog] = useState<TranscriptionLogItem | null>(null); // Armazena o log que está sendo lido

  // --- EFEITO 1: LIMPEZA DE ESTADO ---
  useEffect(() => {
    return () => {
      console.log("🔄 Trocando de contexto/consulta. Limpando gravador...");

      // 1. Para o Hardware
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // 2. Reseta Referências
      streamRef.current = null;
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      audioBlobRef.current = null;
      recordingDurationRef.current = 0;

      // 3. Reseta Estados Visuais
      setIsRecording(false);
      setIsPaused(false);
      setIsProcessing(false);
      setHasRecordedAudio(false);
      setElapsedTime(0); // Zera o relógio visual
    };
  }, [consultationId]);

  // --- EFEITO 2: HISTÓRICO E ENVIO DE TRANSCRIÇÕES ---
  const { transcriptionLog, processAndSendAudio } = useTranscriptionUpload({
    patientId,
    consultationId,
    setMessages,
    handleSendMessage,
  });

  // --- EFEITO 3: CRONÔMETRO VISUAL (Atualiza a cada segundo) ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        // Calcula o tempo total: acumulado anterior + tempo da sessão atual
        const currentSessionTime = (Date.now() - recordingStartTimeRef.current) / 1000;
        setElapsedTime(recordingDurationRef.current + currentSessionTime);
      }, 1000);
    }

    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // --- Função para iniciar gravação (Com DELAY Anti-Alucinação) ---
  const startAudioRecording = useCallback(async () => {
    try {
      if (isProcessing || isRecording || isPaused) return;
      if (!consultationId) return;

      console.log("🎤 Preparando gravação automática...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      audioBlobRef.current = null;

      // Reseta contadores antes de começar
      setElapsedTime(0);
      recordingStartTimeRef.current = Date.now();
      recordingDurationRef.current = 0;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        console.log("⏹️ Gravação parada");

        const finalDuration = recordingDurationRef.current;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        audioBlobRef.current = blob;

        if (blob.size > 1000) {
          setHasRecordedAudio(true);
          console.log(`✅ Áudio gravado. Duração: ${formatDuration(finalDuration)}`);

          setIsProcessing(true);
          try {
            await processAndSendAudio(blob, finalDuration);
          } catch (error) {
            console.error("Erro ao processar:", error);
          } finally {
            setIsProcessing(false);
          }
        } else {
          console.log("Áudio muito curto...");
          setHasRecordedAudio(false);
          audioBlobRef.current = null;
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        chunksRef.current = [];
      };

      // --- CORREÇÃO DE ALUCINAÇÃO: Pequeno delay de 200ms ---
      setTimeout(() => {
        if (mediaRecorder.state === "inactive") {
          mediaRecorder.start();
          setIsRecording(true);
          setIsPaused(false);
          setHasRecordedAudio(false);

          // Define o tempo inicial real AGORA, após o delay
          recordingStartTimeRef.current = Date.now();
          recordingDurationRef.current = 0;
          setElapsedTime(0);
        }
      }, 200);
    } catch (error: unknown) {
      console.error("Erro ao iniciar gravação:", error);
      let errorMessage = "Erro ao acessar o microfone.";
      const errorName = error instanceof Error ? error.name : "";
      if (errorName === "NotAllowedError") errorMessage = "Permissão de microfone negada.";
      setMessages((prev) => [...prev, botMessage(errorMessage)]);
    }
  }, [isProcessing, isRecording, isPaused, processAndSendAudio, consultationId, setMessages]);

  // --- Função para pausar gravação ---
  const togglePauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      // PAUSAR
      mediaRecorderRef.current.pause();
      setIsRecording(false);
      setIsPaused(true);
      // Congela a duração acumulada até agora
      recordingDurationRef.current += (Date.now() - recordingStartTimeRef.current) / 1000;
      console.log("⏸️ Gravação pausada");
    } else if (mediaRecorderRef.current && !isRecording && isPaused) {
      // RETOMAR
      mediaRecorderRef.current.resume();
      setIsRecording(true);
      setIsPaused(false);
      // Reinicia o "ponto de partida" do segmento atual
      recordingStartTimeRef.current = Date.now();
      console.log("▶️ Gravação retomada");
    }
  }, [isRecording, isPaused]);

  // --- Função para parar gravação ---
  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      // Se estava gravando, soma o último segmento
      if (!isPaused) {
        recordingDurationRef.current += (Date.now() - recordingStartTimeRef.current) / 1000;
      }
      // Para forçado o relógio visual no valor final
      setElapsedTime(recordingDurationRef.current);

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      console.log("⏹️ Gravação finalizada manualmente");
    }
  }, [isRecording, isPaused]);

  // --- Função para ver histórico ---
  const toggleRecordingHistory = useCallback(() => {
    setShowRecordingHistory((prev) => !prev);
  }, []);

  useEffect(() => {
    // --- Auto-Start ---
    if (consultationId && !isRecording && !isProcessing && !isPaused && !viewingLog) {
      const timer = setTimeout(() => {
        startAudioRecording();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [consultationId, isRecording, isProcessing, isPaused, startAudioRecording, viewingLog]);

  return {
    isRecording,
    isPaused,
    isProcessing,
    hasRecordedAudio,
    elapsedTime,
    showRecordingHistory,
    transcriptionLog,
    viewingLog,
    setViewingLog,
    togglePauseRecording,
    stopAudioRecording,
    toggleRecordingHistory,
  };
}
