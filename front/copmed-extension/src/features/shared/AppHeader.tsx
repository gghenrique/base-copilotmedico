import { ReactNode } from "react";
import { FirstAidIcon } from "@phosphor-icons/react";

// Cabeçalho comum às telas de validação de sessão, login e app autenticado.
export default function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="App-header">
      <h1>Copilot Médico</h1>
      <FirstAidIcon weight="fill" size={32} />
      {children}
    </header>
  );
}
