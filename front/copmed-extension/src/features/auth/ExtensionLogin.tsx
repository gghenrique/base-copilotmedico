import { ChangeEvent, FormEvent, useState } from "react";
import { login as loginRequest, type ExtensionSession } from "../../services/api";
import AppHeader from "../shared/AppHeader";

const labelStyle = { display: "grid", gap: "6px", color: "#333", fontWeight: 700 } as const;
const fieldStyle = { minHeight: "40px", padding: "0 10px" } as const;

export default function ExtensionLogin({
  error: initialError,
  onLoginSuccess,
}: {
  error: string;
  onLoginSuccess: (session: ExtensionSession) => void;
}) {
  const [form, setForm] = useState({ email: "", password: "", profile: "medico" });
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  function updateField(field: "email" | "password" | "profile") {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password || !form.profile) {
      setError("Informe e-mail, senha e perfil.");
      return;
    }

    setLoading(true);
    try {
      const data = await loginRequest(form);
      onLoginSuccess({
        token: data.token,
        user: data.user,
        profile: data.profile,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível entrar.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <AppHeader />

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "12px",
          padding: "18px",
          background: "#ffffff",
        }}
      >
        <h2 style={{ margin: 0, color: "#336B29" }}>Entrar</h2>
        {error && (
          <div
            style={{
              padding: "10px",
              borderRadius: "6px",
              color: "#991b1b",
              background: "#fef2f2",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        <label style={labelStyle}>
          E-mail
          <input
            type="email"
            value={form.email}
            onChange={updateField("email")}
            placeholder="medico@clinica.com"
            autoComplete="email"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Senha
          <input
            type="password"
            value={form.password}
            onChange={updateField("password")}
            placeholder="Sua senha"
            autoComplete="current-password"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Perfil
          <select value={form.profile} onChange={updateField("profile")} style={fieldStyle}>
            <option value="medico">Médico</option>
            <option value="administrador">Administrador</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            minHeight: "42px",
            border: 0,
            borderRadius: "6px",
            background: "#336B29",
            color: "#ffffff",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.75 : 1,
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
