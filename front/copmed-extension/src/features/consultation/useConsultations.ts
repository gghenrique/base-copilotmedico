import { useCallback, useEffect, useState } from "react";
import { createConsultation, getPatientConsultations } from "../../services/api";
import { botMessage, getErrorMessage, type ConsultationListItem } from "../shared/types";
import type { SelectionParams } from "../patients/usePatients";

export const byMostRecent = (a: ConsultationListItem, b: ConsultationListItem) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

// Consultas do paciente ativo: lista, seleção, criação e importação de históricos anteriores.
export function useConsultations({
  patientId,
  consultationId,
  setConsultationId,
  setConsultationTitle,
  setMessages,
  setIsLoading,
  setIsSidebarOpen,
  loadConsultationHistory,
}: SelectionParams) {
  const [patientConsultations, setPatientConsultations] = useState<ConsultationListItem[]>([]);
  const [selectedConsultationIdsToImport, setSelectedConsultationIdsToImport] = useState<
    string[]
  >([]);
  const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);

  const fetchPatientConsultations = useCallback(
    async (pId: string) => {
      setIsLoading(true);
      try {
        const data = await getPatientConsultations(pId);
        if (data.status === "success") {
          setPatientConsultations(data.consultations.sort(byMostRecent));
        } else {
          console.error("Erro ao carregar consultas:", data.message);
          setPatientConsultations([
            {
              id: Date.now().toString(),
              title: `Erro ao carregar consultas: ${data.message}`,
              date: new Date().toISOString(),
            },
          ]);
        }
      } catch (error: unknown) {
        console.error("Erro na requisição de consultas:", error);
        setPatientConsultations([
          {
            id: Date.now().toString(),
            title: `Erro de rede ao carregar consultas: ${getErrorMessage(error, "Erro desconhecido")}`,
            date: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading]
  );

  // Carrega o histórico da consulta quando patientId ou consultationId mudam
  useEffect(() => {
    if (patientId && consultationId) {
      loadConsultationHistory(patientId, consultationId);
    } else {
      setMessages([botMessage("Bem-vindo! Selecione ou crie um paciente para começar.")]);
    }
  }, [patientId, consultationId, loadConsultationHistory, setMessages]);

  // Carrega as consultas do paciente quando o patientId muda
  useEffect(() => {
    if (patientId) {
      fetchPatientConsultations(patientId);
    } else {
      setPatientConsultations([]);
    }
  }, [patientId, fetchPatientConsultations]);

  // --- Handlers de Ação ---

  const handleSelectConsultation = useCallback(
    async (cId: string, cTitle: string) => {
      if (!patientId) {
        setMessages((prev) => [
          ...prev,
          botMessage("Nenhum paciente selecionado. Por favor, selecione um paciente primeiro."),
        ]);
        return;
      }
      setIsLoading(true);
      chrome.storage.local.set({ consultationId: cId, consultationTitle: cTitle }, () => {
        setConsultationId(cId);
        setConsultationTitle(cTitle);
        loadConsultationHistory(patientId, cId);
        setMessages((prev) => [
          ...prev,
          botMessage(`Consulta "${cTitle}" (${cId.substring(0, 8)}...) carregada.`),
        ]);
      });
      setIsSidebarOpen(false);
    },
    [
      patientId,
      loadConsultationHistory,
      setIsLoading,
      setIsSidebarOpen,
      setMessages,
      setConsultationId,
      setConsultationTitle,
    ]
  );

  const handleCreateNewConsultation = useCallback(async () => {
    if (!patientId) {
      setMessages((prev) => [
        ...prev,
        botMessage("Por favor, selecione ou crie um paciente primeiro."),
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const newConsultationTitle = `Consulta em ${new Date().toLocaleDateString(
        "pt-BR"
      )} ${new Date().toLocaleTimeString("pt-BR")}`;
      const data = await createConsultation(patientId, {
        title: newConsultationTitle,
        import_consultation_ids: selectedConsultationIdsToImport,
      });

      if (data.status === "success") {
        const newConsultId = data.consultation_id;
        const newConsultTitle = data.consultation_title;

        chrome.storage.local.set(
          {
            consultationId: newConsultId,
            consultationTitle: newConsultTitle,
            patientId: patientId,
          },
          () => {
            setConsultationId(newConsultId);
            setConsultationTitle(newConsultTitle);
            loadConsultationHistory(patientId, newConsultId);
            setMessages((prev) => [
              ...prev,
              botMessage(`Nova consulta "${newConsultTitle}" criada e selecionada.`),
            ]);

            setSelectedConsultationIdsToImport([]);
            fetchPatientConsultations(patientId);
          }
        );
      } else {
        setMessages((prev) => [
          ...prev,
          botMessage(`Erro ao criar nova consulta: ${data.message}`),
        ]);
      }
    } catch (error: unknown) {
      console.error("Erro ao criar nova consulta:", error);
      setMessages((prev) => [
        ...prev,
        botMessage(`Erro de rede ao criar nova consulta: ${getErrorMessage(error, "Erro desconhecido")}`),
      ]);
    } finally {
      setIsLoading(false);
      setShowImportHistoryModal(false);
    }
  }, [
    patientId,
    selectedConsultationIdsToImport,
    loadConsultationHistory,
    fetchPatientConsultations,
    setIsLoading,
    setMessages,
    setConsultationId,
    setConsultationTitle,
  ]);

  // Opção vazia do seletor de consultas
  const clearConsultationSelection = useCallback(() => {
    setConsultationId(null);
    setConsultationTitle(null);
    setMessages([botMessage("Nenhuma consulta selecionada para o paciente atual.")]);
  }, [setConsultationId, setConsultationTitle, setMessages]);

  return {
    patientConsultations,
    showImportHistoryModal,
    setShowImportHistoryModal,
    selectedConsultationIdsToImport,
    setSelectedConsultationIdsToImport,
    handleSelectConsultation,
    handleCreateNewConsultation,
    clearConsultationSelection,
  };
}
