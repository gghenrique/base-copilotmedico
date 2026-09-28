import type { TranscriptionLogItem } from "../shared/types";

// Painel de arquivos: grade com as transcrições salvas do paciente.
export default function TranscriptionFiles({
  logs,
  onOpen,
}: {
  logs: TranscriptionLogItem[];
  onOpen: (log: TranscriptionLogItem) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "10px",
        backgroundColor: "#5e5e5eff",
        maxHeight: "250px",
        overflowY: "auto",
      }}
    >
      <h4
        style={{
          margin: "0 0 10px 0",
          borderBottom: "1px solid #777",
          paddingBottom: "5px",
          color: "#fff",
        }}
      >
        Arquivos de Transcrição
      </h4>

      {logs.length === 0 ? (
        <p style={{ margin: 0, color: "#ccc", fontStyle: "italic" }}>Nenhum arquivo encontrado.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "10px",
          }}
        >
          {logs.map((log) => (
            <div
              key={log.id}
              onClick={() => onOpen(log)}
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "1px solid #666",
                borderRadius: "6px",
                padding: "10px",
                cursor: "pointer",
                transition: "background 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "5px",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
            >
              {/* Ícone de Arquivo */}
              <div style={{ fontSize: "2rem" }}>📄</div>

              <div style={{ color: "#fff", fontWeight: "bold", fontSize: "0.85em" }}>
                {new Date(log.timestamp || log.created_at || Date.now()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <div style={{ color: "#bbb", fontSize: "0.75em" }}>
                {new Date(log.timestamp || log.created_at || Date.now()).toLocaleDateString()}
              </div>

              <div
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  borderRadius: "10px",
                  padding: "2px 8px",
                  fontSize: "0.7em",
                  marginTop: "2px",
                }}
              >
                {log.duration}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
