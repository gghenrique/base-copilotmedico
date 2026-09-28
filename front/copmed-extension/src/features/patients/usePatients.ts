import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import {
  createConsultation,
  createPatient,
  getPatientConsultations,
  getPatients,
} from "../../services/api";
import { byMostRecent } from "../consultation/useConsultations";
import {
  botMessage,
  getErrorMessage,
  type Message,
  type PatientListItem,
} from "../shared/types";

export type SelectionParams = {
  patientId: string | null;
  consultationId: string | null;
  setPatientId: Dispatch<SetStateAction<string | null>>;
  setPatientName: Dispatch<SetStateAction<string | null>>;
  setConsultationId: Dispatch<SetStateAction<string | null>>;
  setConsultationTitle: Dispatch<SetStateAction<string | null>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  loadConsultationHistory: (pId: string, cId: string) => Promise<void>;
};

// Pacientes do médico: lista, seleção (abre a consulta mais recente) e criação.
export function usePatients({
  setPatientId,
  setPatientName,
  setConsultationId,
  setConsultationTitle,
  setMessages,
  setIsLoading,
  setIsSidebarOpen,
  loadConsultationHistory,
}: SelectionParams) {
  const [allPatients, setAllPatients] = useState<PatientListItem[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");

  // --- Funções de Carregamento e Persistência ---

  const loadPatientDataFromStorage = useCallback(() => {
    chrome.storage.local.get(
      ["patientId", "patientName", "consultationId", "consultationTitle"],
      (result) => {
        if (result.patientId) {
          setPatientId(result.patientId);
          setPatientName(result.patientName || null);
          setConsultationId(result.consultationId || null);
          setConsultationTitle(result.consultationTitle || null);
        }
      }
    );
  }, [setPatientId, setPatientName, setConsultationId, setConsultationTitle]);

  const fetchAllPatients = useCallback(async () => {
    try {
      const data = await getPatients();
      if (data.status === "success") {
        setAllPatients(data.patients);
      } else {
        console.error("Erro ao buscar todos os pacientes:", data.message);
      }
    } catch (error) {
      console.error("Erro de rede ao buscar todos os pacientes:", error);
    }
  }, []);

  // Carrega dados do paciente e todas as listas de pacientes na inicialização
  useEffect(() => {
    loadPatientDataFromStorage();
    fetchAllPatients();
  }, [loadPatientDataFromStorage, fetchAllPatients]);

  // --- Handlers de Ação ---

  const handleCreateNewPatient = useCallback(async () => {
    if (!newPatientName.trim()) {
      alert("Por favor, insira um nome para o paciente.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await createPatient({ name: newPatientName });

      if (data.status === "success") {
        const newPId = data.patient_id;
        const newPName = data.patient_name;
        const newCId = data.first_consultation_id;

        chrome.storage.local.set(
          {
            patientId: newPId,
            patientName: newPName,
            consultationId: newCId,
            consultationTitle: "Primeira Consulta",
          },
          () => {
            console.log("Setting patientId to:", newPId, "and consultationId to:", newCId);
            setPatientId(newPId);
            setPatientName(newPName);
            setConsultationId(newCId);
            setConsultationTitle("Primeira Consulta");
            loadConsultationHistory(newPId, newCId);
            fetchAllPatients();
          }
        );
        setShowNewPatientModal(false);
        setNewPatientName("");
      } else {
        alert(`Erro ao criar paciente: ${data.message}`);
      }
    } catch (error: unknown) {
      console.error("Erro ao criar paciente:", error);
      alert(`Erro de rede ao criar paciente: ${getErrorMessage(error, "Erro desconhecido")}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    newPatientName,
    fetchAllPatients,
    loadConsultationHistory,
    setIsLoading,
    setPatientId,
    setPatientName,
    setConsultationId,
    setConsultationTitle,
  ]);

  const handleSelectPatient = useCallback(
    async (pId: string, pName: string) => {
      setIsLoading(true);
      try {
        const consultationsData = await getPatientConsultations(pId);

        let selectedConsultationToLoad: string | null = null;
        let selectedConsultationTitleToLoad: string | null = null;

        if (consultationsData.status === "success" && consultationsData.consultations.length > 0) {
          const sortedConsults = consultationsData.consultations.sort(byMostRecent);
          selectedConsultationToLoad = sortedConsults[0].id;
          selectedConsultationTitleToLoad = sortedConsults[0].title;
        } else {
          const createConsultationData = await createConsultation(pId, {
            title: `Consulta Padrão - ${new Date().toLocaleDateString("pt-BR")}`,
          });
          if (createConsultationData.status === "success") {
            selectedConsultationToLoad = createConsultationData.consultation_id;
            selectedConsultationTitleToLoad = createConsultationData.consultation_title;
          } else {
            throw new Error(
              `Falha ao criar consulta para paciente selecionado: ${createConsultationData.message}`
            );
          }
        }

        if (selectedConsultationToLoad) {
          chrome.storage.local.set(
            {
              patientId: pId,
              patientName: pName,
              consultationId: selectedConsultationToLoad,
              consultationTitle: selectedConsultationTitleToLoad,
            },
            () => {
              setPatientId(pId);
              setPatientName(pName);
              setConsultationId(selectedConsultationToLoad);
              setConsultationTitle(selectedConsultationTitleToLoad);
              loadConsultationHistory(pId, selectedConsultationToLoad);
              setMessages((prev) => [
                ...prev,
                botMessage(
                  `Paciente "${pName}" (${pId.substring(0, 8)}...) selecionado. Consulta "${selectedConsultationTitleToLoad}" carregada.`
                ),
              ]);
            }
          );
        }
      } catch (error: unknown) {
        console.error("Erro ao selecionar paciente:", error);
        setMessages((prev) => [
          ...prev,
          botMessage(`Erro ao selecionar paciente: ${getErrorMessage(error, "Erro desconhecido")}`),
        ]);
      } finally {
        setIsLoading(false);
        setIsSidebarOpen(false);
      }
    },
    [
      loadConsultationHistory,
      setIsLoading,
      setIsSidebarOpen,
      setMessages,
      setPatientId,
      setPatientName,
      setConsultationId,
      setConsultationTitle,
    ]
  );

  // Opção vazia do seletor de pacientes
  const clearPatientSelection = useCallback(() => {
    setPatientId(null);
    setPatientName(null);
    setConsultationId(null);
    setConsultationTitle(null);
    setMessages([botMessage("Nenhum paciente selecionado.")]);
  }, [setPatientId, setPatientName, setConsultationId, setConsultationTitle, setMessages]);

  return {
    allPatients,
    showNewPatientModal,
    setShowNewPatientModal,
    newPatientName,
    setNewPatientName,
    handleCreateNewPatient,
    handleSelectPatient,
    clearPatientSelection,
  };
}
