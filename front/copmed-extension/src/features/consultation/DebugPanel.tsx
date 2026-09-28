import { useCallback, useState } from "react";
import { executeScriptOnActiveTab } from "../../utils/utils";
import { getErrorMessage } from "../shared/types";

// Modo Debug: testa um seletor CSS na aba ativa (útil para ajustar a extração do PEP).
export default function DebugPanel() {
  const [debugMode, setDebugMode] = useState(false);
  const [selectorInput, setSelectorInput] = useState("");
  const [selectorResult, setSelectorResult] = useState("");

  const handleDebugSelector = useCallback(async () => {
    if (!selectorInput.trim()) {
      setSelectorResult("Por favor, insira um seletor CSS.");
      return;
    }

    try {
      const result = await executeScriptOnActiveTab(selectorInput, 0);
      setSelectorResult(result || "Nenhum elemento encontrado com este seletor.");
    } catch (error: unknown) {
      setSelectorResult(`Erro ao executar seletor: ${getErrorMessage(error, "Erro desconhecido")}`);
    }
  }, [selectorInput]);

  return (
    <>
      {/* Debug Mode Toggle */}
      <div style={{ marginTop: "10px", textAlign: "center" }}>
        <label>
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
          />
          Modo Debug
        </label>
      </div>
      {/* Debug Controls */}
      {debugMode && (
        <div
          style={{
            borderTop: "1px solid #eee",
            marginTop: "10px",
            paddingTop: "10px",
          }}
        >
          <h3>Debug Seletor CSS</h3>
          <input
            type="text"
            placeholder="Ex: .some-class div > span"
            value={selectorInput}
            onChange={(e) => setSelectorInput(e.target.value)}
            style={{ width: "calc(100% - 70px)", marginRight: "5px" }}
          />
          <button onClick={handleDebugSelector}>Testar</button>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: "150px",
              overflowY: "auto",
              border: "1px solid #ddd",
              padding: "5px",
              background: "#f9f9f9",
              marginTop: "5px",
            }}
          >
            {selectorResult}
          </pre>
        </div>
      )}
    </>
  );
}
