import { UserCirclePlusIcon } from "@phosphor-icons/react";
import type { usePatients } from "./usePatients";
import type { useConsultations } from "../consultation/useConsultations";

type Patients = ReturnType<typeof usePatients>;
type Consultations = ReturnType<typeof useConsultations>;

// Seletores de paciente e de consulta, com atalhos para criar paciente e nova consulta.
export default function PatientSidebar({
  isOpen,
  isLoading,
  patientId,
  patientName,
  consultationId,
  patients,
  consultations,
}: {
  isOpen: boolean;
  isLoading: boolean;
  patientId: string | null;
  patientName: string | null;
  consultationId: string | null;
  patients: Patients;
  consultations: Consultations;
}) {
  const { allPatients, setShowNewPatientModal, handleSelectPatient, clearPatientSelection } =
    patients;
  const {
    patientConsultations,
    setShowImportHistoryModal,
    setSelectedConsultationIdsToImport,
    handleSelectConsultation,
    handleCreateNewConsultation,
    clearConsultationSelection,
  } = consultations;

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`} style={{ borderBottom: "1px solid #ccc" }}>
      <h2>Pacientes</h2>

      <div className="new-patient-div">
        <select
          className="patient-select"
          value={patientId || ""}
          onChange={(e) => {
            const selectedPatient = allPatients.find((p) => p.id === e.target.value);
            if (selectedPatient) {
              handleSelectPatient(selectedPatient.id, selectedPatient.name);
            } else {
              clearPatientSelection();
            }
          }}
          disabled={isLoading}
        >
          <option value="">Selecione um Paciente</option>
          {allPatients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name} ({patient.id.substring(0, 8)}...)
            </option>
          ))}
        </select>

        <div className="patient-controls">
          <button
            className="btn-green small"
            onClick={() => setShowNewPatientModal(true)}
            disabled={isLoading}
          >
            <UserCirclePlusIcon size={21} weight="fill" />
          </button>
        </div>
      </div>

      {patientId && (
        <>
          <h2>Paciente: {patientName || patientId.substring(0, 8)}</h2>
          <div className="consultation-controls">
            <button
              className="btn-white"
              onClick={() => setShowImportHistoryModal(true)}
              disabled={isLoading}
              style={{ marginRight: "5px" }}
            >
              Importar Consulta
            </button>
            <button
              className="btn-green"
              onClick={() => {
                setSelectedConsultationIdsToImport([]);
                handleCreateNewConsultation();
              }}
              disabled={isLoading}
            >
              Nova Consulta
            </button>
          </div>

          <select
            className="patient-select"
            value={consultationId || ""}
            onChange={(e) => {
              const selectedConsultation = patientConsultations.find(
                (c) => c.id === e.target.value
              );
              if (selectedConsultation) {
                handleSelectConsultation(selectedConsultation.id, selectedConsultation.title);
              } else {
                clearConsultationSelection();
              }
            }}
            disabled={isLoading || patientConsultations.length === 0}
          >
            <option value="">Selecione uma Consulta</option>
            {patientConsultations.map((consultation) => (
              <option key={consultation.id} value={consultation.id}>
                {consultation.title} ({consultation.id.substring(0, 8)}...)
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
