import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { executeArbitraryScriptOnActiveTab } from "../../utils/utils";
import {
  getConsultationHistory,
  sendChatMessage,
  sendExtractedData,
  uploadPdf,
} from "../../services/api";
import {
  botMessage,
  getErrorMessage,
  type ChatHistoryMessage,
  type Message,
} from "../shared/types";

type Params = {
  patientId: string | null;
  consultationId: string | null;
  setPatientId: Dispatch<SetStateAction<string | null>>;
  setConsultationId: Dispatch<SetStateAction<string | null>>;
};

// Mensagens do chat da consulta ativa: histórico, envio de texto, PDF e dados extraídos do PEP.
export function useConsultationChat({
  patientId,
  consultationId,
  setPatientId,
  setConsultationId,
}: Params) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadConsultationHistory = useCallback(async (pId: string, cId: string) => {
    setIsLoading(true);
    try {
      const data = await getConsultationHistory(pId, cId);
      if (data.status === "success") {
        const loadedMessages: Message[] = data.history.map(
          (msg: ChatHistoryMessage, index: number) => ({
            id: `${msg.timestamp}-${index}-${Math.random()}`,
            text: msg.parts && msg.parts.length > 0 ? msg.parts[0].text : "",
            sender: msg.role === "user" ? "user" : "bot",
            timestamp: msg.timestamp,
          })
        );
        setMessages(loadedMessages);
      } else {
        console.error("Erro ao carregar histórico da consulta:", data.message);
        setMessages([botMessage(`Erro ao carregar histórico: ${data.message}`)]);
      }
    } catch (error: unknown) {
      console.error("Erro de rede ao carregar histórico:", error);
      setMessages([
        botMessage(
          `Erro de rede ao carregar histórico: ${getErrorMessage(error, "Erro desconhecido")}`
        ),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Após uma resposta de sucesso, recarrega o histórico e adota ids novos devolvidos pela API.
  const syncAfterSuccess = useCallback(
    async (data: { patient_id?: string; consultation_id?: string }) => {
      if (patientId && consultationId) {
        await loadConsultationHistory(patientId, consultationId);
      }

      if (data.patient_id && data.patient_id !== patientId) {
        setPatientId(data.patient_id);
        chrome.storage.local.set({ patientId: data.patient_id });
      }
      if (data.consultation_id && data.consultation_id !== consultationId) {
        setConsultationId(data.consultation_id);
        chrome.storage.local.set({ consultationId: data.consultation_id });
      }
    },
    [patientId, consultationId, loadConsultationHistory, setPatientId, setConsultationId]
  );

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || !patientId || !consultationId) return;

      const userMessage: Message = {
        id: Date.now(),
        text: messageText,
        sender: "user",
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setIsLoading(true);

      try {
        const data = await sendChatMessage({
          message: messageText,
          patient_id: patientId,
          consultation_id: consultationId,
        });
        if (data.status === "success") {
          await syncAfterSuccess(data);
        } else {
          setMessages((prevMessages) => [...prevMessages, botMessage(`Erro: ${data.message}`)]);
        }
      } catch (error: unknown) {
        console.error("Erro de rede:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          botMessage(`Erro de conexão: ${getErrorMessage(error, "Erro desconhecido")}`),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, consultationId, syncAfterSuccess]
  );

  const handleUploadPdf = useCallback(
    async (file: File) => {
      if (!file || !patientId || !consultationId) return;

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("patient_id", patientId);
      formData.append("consultation_id", consultationId);

      setIsLoading(true);
      setMessages((prev) => [...prev, botMessage(`Analisando PDF "${file.name}"...`)]);

      try {
        const data = await uploadPdf(formData);
        if (data.status === "success") {
          await syncAfterSuccess(data);
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            botMessage(`Erro ao processar PDF: ${data.message}`),
          ]);
        }
      } catch (error: unknown) {
        console.error("Erro de rede no upload de PDF:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          botMessage(
            `Erro de conexão ao enviar PDF: ${getErrorMessage(error, "Erro desconhecido")}`
          ),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, consultationId, syncAfterSuccess]
  );

  const handleSendExtractedDataToServer = useCallback(
    async (extractedData: Record<string, string | string[]>) => {
      if (!patientId || !consultationId) {
        setMessages((prev) => [
          ...prev,
          botMessage("Por favor, selecione ou crie um paciente e uma consulta primeiro."),
        ]);
        return;
      }

      setIsLoading(true);
      setMessages((prev) => [...prev, botMessage("Enviando dados extraídos para análise...")]);

      try {
        const data = await sendExtractedData({
          patient_id: patientId,
          consultation_id: consultationId,
          extracted_data: extractedData,
        });
        if (data.status === "success") {
          if (patientId && consultationId) {
            await loadConsultationHistory(patientId, consultationId);
          }
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            botMessage(`Erro ao enviar dados extraídos: ${data.message}`),
          ]);
        }
      } catch (error: unknown) {
        console.error("Erro de rede ao enviar dados extraídos:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          botMessage(
            `Erro de conexão ao enviar dados extraídos: ${getErrorMessage(error, "Erro desconhecido")}`
          ),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, consultationId, loadConsultationHistory]
  );

  const handleExtractAndSend = useCallback(async () => {
    if (!patientId || !consultationId) {
      setMessages((prev) => [
        ...prev,
        botMessage("Por favor, selecione um paciente e uma consulta primeiro para extrair dados."),
      ]);
      return;
    }

    setMessages((prev) => [...prev, botMessage("Extraindo dados da página...")]);
    setIsLoading(true);

    try {
      const editableNotesSelector = ".editable-notes";
      const createInputsSelector = ".create-input";

      const extractedContent = await executeArbitraryScriptOnActiveTab(
        (notesSel: string, inputsSel: string) => {
          const extractText = (selector: string) => {
            const element = document.querySelector(selector);
            return element ? element.textContent?.trim() || "" : "";
          };

          const extractInputs = (selector: string) => {
            const elements = Array.from(
              document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector)
            );
            return elements.map(
              (el) => `${el.name || el.id || el.placeholder || "Campo"}: ${el.value || ""}`
            );
          };

          const editableNotes = extractText(notesSel);
          const createInputs = extractInputs(inputsSel);

          return { editableNotes, createInputs };
        },
        editableNotesSelector,
        createInputsSelector
      );

      if (extractedContent) {
        await handleSendExtractedDataToServer(extractedContent);
      } else {
        setMessages((prev) => [...prev, botMessage("Nenhum conteúdo relevante extraído da página.")]);
      }
    } catch (error: unknown) {
      console.error("Erro ao extrair dados da página:", error);
      setMessages((prev) => [
        ...prev,
        botMessage(`Erro ao extrair dados: ${getErrorMessage(error, "Erro desconhecido")}`),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, consultationId, handleSendExtractedDataToServer]);

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    loadConsultationHistory,
    handleSendMessage,
    handleUploadPdf,
    handleExtractAndSend,
  };
}
