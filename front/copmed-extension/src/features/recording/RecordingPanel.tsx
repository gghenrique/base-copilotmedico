import type { useAudioRecording } from "./useAudioRecording";
import { formatDuration } from "./wav";
import TranscriptionFiles from "./TranscriptionFiles";
import TranscriptionViewer from "./TranscriptionViewer";

type Recording = ReturnType<typeof useAudioRecording>;

// Área de gravação da consulta: controles, status e transcrições salvas.
export default function RecordingPanel({ recording }: { recording: Recording }) {
  const {
    isRecording,
    isPaused,
    isProcessing,
    hasRecordedAudio,
    elapsedTime,
    showRecordingHistory,
    transcriptionLog,
    viewingLog,
    setViewingLog,
    togglePauseRecording,
    stopAudioRecording,
    toggleRecordingHistory,
  } = recording;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginTop: "10px",
        padding: "0 10px",
        position: "relative", // Importante para transições se quiser animar depois
      }}
    >
      {/* === MODO LEITURA (Arquivo Aberto) === */}
      {viewingLog ? (
        <TranscriptionViewer log={viewingLog} onClose={() => setViewingLog(null)} />
      ) : (
        /* === MODO GRAVAÇÃO E LISTA (Padrão) === */
        <>
          {/* Controles de Gravação (Só aparecem se não estiver lendo) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <button
              onClick={togglePauseRecording}
              disabled={(!isRecording && !isPaused) || isProcessing}
              style={{
                padding: "10px 15px",
                backgroundColor: isRecording ? "#FFA500" : isPaused ? "#4CAF50" : "#cccccc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isRecording || isPaused ? "pointer" : "not-allowed",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              {isRecording ? "⏸️ Pausar" : isPaused ? "▶️ Retomar" : "⏸️ Pausar/Retomar"}
            </button>

            <button
              onClick={stopAudioRecording}
              disabled={(!isRecording && !isPaused) || isProcessing}
              style={{
                padding: "10px 15px",
                backgroundColor: "#e66060",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              ⏹️ Parar
            </button>

            <button
              onClick={toggleRecordingHistory}
              style={{
                padding: "10px 15px",
                backgroundColor: showRecordingHistory ? "#1976D2" : "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {showRecordingHistory ? "📂 Ocultar Arq." : "📂 Transcrições"} ({transcriptionLog.length})
            </button>
          </div>

          {/* Status Messages */}
          <div style={{ textAlign: "center" }}>
            {isProcessing && (
              <div style={{ color: "orange", fontWeight: "bold" }}>⏳ Processando...</div>
            )}
            {isRecording && (
              <div style={{ color: "#e66060", fontWeight: "bold" }}>
                ● Gravando... ({formatDuration(elapsedTime)})
              </div>
            )}
            {isPaused && <div style={{ color: "#FFA500", fontWeight: "bold" }}>⏸️ Pausado</div>}
            {hasRecordedAudio && !isRecording && !isPaused && (
              <div style={{ color: "#4CAF50", fontWeight: "bold" }}>✓ Arquivo salvo</div>
            )}
          </div>

          {/* Painel de Arquivos (Lista de Ícones) */}
          {showRecordingHistory && (
            <TranscriptionFiles
              logs={transcriptionLog}
              onOpen={(log) => {
                // Ao clicar no arquivo:
                // 1. Se estiver gravando, PAUSA para o usuário ler em paz
                if (isRecording) togglePauseRecording();
                // 2. Abre o modo leitura
                setViewingLog(log);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
