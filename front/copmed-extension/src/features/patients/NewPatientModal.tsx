// Modal para criar novo paciente
export default function NewPatientModal({
  name,
  isLoading,
  onNameChange,
  onCancel,
  onCreate,
}: {
  name: string;
  isLoading: boolean;
  onNameChange: (name: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="modal">
      <div className="new-patient-modal">
        <h3>Criar Novo Paciente</h3>
        <input
          type="text"
          placeholder="Nome do Paciente"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          style={{
            width: "calc(100% - 20px)",
            marginBottom: "10px",
            padding: "8px",
          }}
        />
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
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
