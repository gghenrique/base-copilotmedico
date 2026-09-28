import { useCallback, useEffect, useState } from "react";
import { getTranscriptionLog, sendAudio as sendAudioRequest } from "../../services/api";
import {
  botMessage,
  type TranscriptionLogItem,
  type WindowWithWebkitAudio,
} from "../shared/types";
import type { RecordingParams } from "./useAudioRecording";
import { audioBufferToWavBlob } from "./wav";

const invalidPhrases = [
  "Não foi possível entender o áudio",
  "Não foi possível entender o áudio.",
  "Erro na API de reconhecimento de fala",
];

// Histórico de transcrições do paciente e envio do áudio gravado para transcrição.
export function useTranscriptionUpload({
  patientId,
  consultationId,
  setMessages,
  handleSendMessage,
}: RecordingParams) {
  const [transcriptionLog, setTranscriptionLog] = useState<TranscriptionLogItem[]>([]); // Histórico separado

  // --- EFEITO 2: CARREGAR HISTÓRICO DE TRANSCRIÇÕES ---
  useEffect(() => {
    if (patientId) {
      getTranscriptionLog(patientId)
        .then((data) => {
          if (data.status === "success") {
            setTranscriptionLog(data.logs);
          }
        })
        .catch((err) => console.error("Erro ao carregar log de transcrições:", err));
    } else {
      setTranscriptionLog([]);
    }
  }, [patientId]);

  // --- Envio do áudio para o servidor ---
  const sendAudioToServer = useCallback(
    async (wavBlob: Blob, duration: number) => {
      try {
        if (!patientId || !consultationId) {
          console.error("IDs ausentes para envio de áudio.");
          return;
        }

        const form = new FormData();
        const file = new File([wavBlob], "recording.wav", { type: "audio/wav" });
        form.append("audio_file", file);
        form.append("patient_id", patientId);
        form.append("consultation_id", consultationId);
        form.append("duration", duration.toString());

        const data = await sendAudioRequest(form);

        if (data && data.transcription && !data.is_error) {
          const texto = String(data.transcription).trim();
          const ehErro = invalidPhrases.some((phrase) => texto.includes(phrase));

          if (!ehErro && texto.length > 0) {
            // Atualiza lista visual de logs
            if (data.log_entry) {
              setTranscriptionLog((prev) => [data.log_entry, ...prev]);
            }
            // Envia transcrição para o fluxo de chat
            await handleSendMessage(texto);
          } else {
            setMessages((prev) => [
              ...prev,
              botMessage("❌ Não foi possível transcrever o áudio. Tente falar mais claro."),
            ]);
          }
        }
      } catch (err) {
        console.error("Erro ao enviar áudio:", err);
        setMessages((prev) => [
          ...prev,
          botMessage("❌ Erro ao enviar áudio. Verifique sua conexão."),
        ]);
      }
    },
    [handleSendMessage, patientId, consultationId, setMessages]
  );

  // --- Processamento de Áudio ---
  const processAndSendAudio = useCallback(
    async (blob: Blob, duration: number) => {
      if (blob.size < 1000) {
        console.log("Áudio muito curto, ignorando...");
        return;
      }
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioCtx =
          window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
        if (!AudioCtx) {
          throw new Error("AudioContext indisponível neste navegador.");
        }
        const audioCtx = new AudioCtx();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const wavBlob = audioBufferToWavBlob(decodedBuffer);

        await sendAudioToServer(wavBlob, duration);

        if (audioCtx.state !== "closed") await audioCtx.close();
      } catch (err) {
        console.error("Erro ao processar áudio:", err);
        throw err;
      }
    },
    [sendAudioToServer]
  );

  return { transcriptionLog, processAndSendAudio };
}
