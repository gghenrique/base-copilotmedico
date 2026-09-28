import { useState } from "react";
import Chat from "../../modules/Chat/chat";
import AppHeader from "../shared/AppHeader";
import { useConsultationChat } from "./useConsultationChat";
import { useConsultations } from "./useConsultations";
import DebugPanel from "./DebugPanel";
import { usePatients } from "../patients/usePatients";
import PatientSidebar from "../patients/PatientSidebar";
import NewPatientModal from "../patients/NewPatientModal";
import ImportHistoryModal from "../patients/ImportHistoryModal";
import { useAudioRecording } from "../recording/useAudioRecording";
import RecordingPanel from "../recording/RecordingPanel";

// --- Componente Principal Autenticado ---
// Guarda o paciente e a consulta ativos e compõe as features de pacientes, chat e gravação.
export default function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [, setConsultationTitle] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const chat = useConsultationChat({ patientId, consultationId, setPatientId, setConsultationId });

  const selection = {
    patientId,
    consultationId,
    setPatientId,
    setPatientName,
    setConsultationId,
    setConsultationTitle,
    setMessages: chat.setMessages,
    setIsLoading: chat.setIsLoading,
    setIsSidebarOpen,
    loadConsultationHistory: chat.loadConsultationHistory,
  };
  const patients = usePatients(selection);
  const consultations = useConsultations(selection);

  const recording = useAudioRecording({
    patientId,
    consultationId,
    setMessages: chat.setMessages,
    handleSendMessage: chat.handleSendMessage,
  });

  return (
    <div className="App">
      <AppHeader>
        <button
          onClick={onLogout}
          style={{
            marginLeft: "auto",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            padding: "6px 10px",
            background: "#ffffff",
            color: "#336B29",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Sair
        </button>
      </AppHeader>

      <PatientSidebar
        isOpen={isSidebarOpen}
        isLoading={chat.isLoading}
        patientId={patientId}
        patientName={patientName}
        consultationId={consultationId}
        patients={patients}
        consultations={consultations}
      />

      {consultationId && <RecordingPanel recording={recording} />}

      {/* Main Chat Area */}
      <div className="chat-container">
        <Chat
          messages={chat.messages}
          isLoading={chat.isLoading}
          onSendMessage={chat.handleSendMessage}
          onUploadPdf={chat.handleUploadPdf}
        />
      </div>

      <div>
        <DebugPanel />
        {/* Botão de Extrair Dados da Página */}
        <button
          onClick={chat.handleExtractAndSend}
          disabled={chat.isLoading || !patientId || !consultationId}
          style={{ marginTop: "10px", padding: "10px", width: "100%" }}
        >
          Extrair Dados da Página
        </button>
      </div>

      {patients.showNewPatientModal && (
        <NewPatientModal
          name={patients.newPatientName}
          isLoading={chat.isLoading}
          onNameChange={patients.setNewPatientName}
          onCancel={() => patients.setShowNewPatientModal(false)}
          onCreate={patients.handleCreateNewPatient}
        />
      )}

      {consultations.showImportHistoryModal && patientId && (
        <ImportHistoryModal
          consultations={consultations.patientConsultations}
          currentConsultationId={consultationId}
          selectedIds={consultations.selectedConsultationIdsToImport}
          setSelectedIds={consultations.setSelectedConsultationIdsToImport}
          isLoading={chat.isLoading}
          onCancel={() => {
            consultations.setSelectedConsultationIdsToImport([]);
            consultations.setShowImportHistoryModal(false);
          }}
          onCreate={() => {
            consultations.handleCreateNewConsultation();
          }}
        />
      )}
    </div>
  );
}
