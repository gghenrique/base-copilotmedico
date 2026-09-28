import { Dispatch, SetStateAction } from "react";
import type { ConsultationListItem } from "../shared/types";

// Modal para seleção de históricos de consulta para importação
export default function ImportHistoryModal({
  consultations,
  currentConsultationId,
  selectedIds,
  setSelectedIds,
  isLoading,
  onCancel,
  onCreate,
}: {
  consultations: ConsultationListItem[];
  currentConsultationId: string | null;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  isLoading: boolean;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="modal">
      <div className="history-import-modal">
        <h3 style={{ marginTop: "0" }}>Selecionar Históricos para Nova Consulta</h3>
        <p>
          Marque os históricos de consultas anteriores que você deseja importar para a nova
          conversa.
        </p>

        {consultations.length === 0 ? (
          <p>Nenhuma consulta anterior encontrada para este paciente.</p>
        ) : (
          <div style={{ marginBottom: "15px" }}>
            {consultations.map(
              (consultation) =>
                consultation.id !== currentConsultationId && (
                  <div
                    key={consultation.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`consultation-${consultation.id}`}
                      checked={selectedIds.includes(consultation.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, consultation.id]);
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => id !== consultation.id));
                        }
                      }}
                      style={{ marginRight: "10px" }}
                    />
                    <label
                      htmlFor={`consultation-${consultation.id}`}
                      style={{ flexGrow: 1, cursor: "pointer" }}
                    >
                      <strong>{consultation.title}</strong>
                      <br />
                      <small>
                        ID: {consultation.id.substring(0, 8)}... - Criada em:{" "}
                        {new Date(consultation.date).toLocaleDateString("pt-BR")}
                      </small>
                    </label>
                  </div>
                )
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 15px",
              cursor: "pointer",
              backgroundColor: "#D9D9D9",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onCreate}
            disabled={isLoading}
            style={{
              padding: "8px 15px",
              cursor: "pointer",
              backgroundColor: "#336B29",
              color: "white",
            }}
          >
            Criar Nova Consulta com Histórico(s)
          </button>
        </div>
      </div>
    </div>
  );
}
