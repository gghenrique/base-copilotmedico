import type { TranscriptionDialogueTurn, TranscriptionLogItem } from "../shared/types";

// Estiliza os balões do chat baseado no ID/Role do falante
const getBubbleStyle = (roleKey: string | undefined) => {
  // Ajuste aqui se sua chave for 'doctor' ou 'Médico'
  const isDoctor = roleKey === "doctor" || roleKey === "Médico";

  return {
    alignSelf: isDoctor ? "flex-start" : "flex-end", // Médico na esquerda
    backgroundColor: isDoctor ? "#2c3e50" : "#27ae60", // Cores distintas
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "12px",
    // Borda arredondada diferenciada ("bico" do balão)
    borderTopLeftRadius: isDoctor ? "0" : "12px",
    borderTopRightRadius: isDoctor ? "12px" : "0",
    maxWidth: "85%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  };
};

// Modo leitura: exibe uma transcrição salva, diarizada (médico/paciente) ou em texto corrido.
export default function TranscriptionViewer({
  log,
  onClose,
}: {
  log: TranscriptionLogItem;
  onClose: () => void;
}) {
  const logDate = new Date(log.timestamp || log.created_at || Date.now());

  return (
    <div
      style={{
        backgroundColor: "#2d2d2d", // Fundo escuro tipo editor
        border: "1px solid #444",
        borderRadius: "8px",
        padding: "15px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minHeight: "400px", // AUMENTADO PARA MELHOR VISUALIZAÇÃO
        maxHeight: "600px",
        animation: "fadeIn 0.2s", // Simples efeito visual
      }}
    >
      {/* Cabeçalho do Arquivo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #555",
          paddingBottom: "10px",
          marginBottom: "5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>📄</span>
          <div>
            <div style={{ color: "#fff", fontWeight: "bold", fontSize: "0.9em" }}>
              Transcrição de {logDate.toLocaleDateString()}
            </div>
            <div style={{ color: "#aaa", fontSize: "0.8em" }}>
              Horário: {logDate.toLocaleTimeString()} • Duração: {log.duration}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid #666",
            color: "#fff",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "5px 10px",
            fontSize: "0.8em",
          }}
        >
          ❌ Fechar Arquivo
        </button>
      </div>

      {/* Conteúdo do Texto ou CHAT DIARIZADO */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          backgroundColor: "#1a1a1a", // Fundo ligeiramente diferente para o chat
          borderRadius: "4px",
          border: "1px solid #333",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Verifica se é um log moderno com diarização */}
        {log.dialogue && Array.isArray(log.dialogue) ? (
          log.dialogue.map((turn: TranscriptionDialogueTurn, idx: number) => (
            <div
              key={idx}
              style={getBubbleStyle(turn.role_key || (turn.role === "Médico" ? "doctor" : "patient"))}
            >
              <div
                style={{
                  fontSize: "0.75em",
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: "4px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                {turn.role}
              </div>
              <div style={{ lineHeight: "1.4" }}>{turn.text}</div>
            </div>
          ))
        ) : (
          // Fallback para logs antigos (Texto corrido)
          <div
            style={{
              whiteSpace: "pre-wrap",
              color: "#e0e0e0",
              lineHeight: "1.5",
              fontSize: "0.95em",
            }}
          >
            {log.text || log.text_summary}
          </div>
        )}
      </div>

      <div style={{ textAlign: "right", fontSize: "0.75em", color: "#666" }}>
        ID Ref: {log.consultation_id}
      </div>
    </div>
  );
}
