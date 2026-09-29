// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

// Testes de comportamento da extensão pela interface: a API e o chrome.storage são simulados,
// então os mesmos testes valem para qualquer organização interna do App.

type Consulta = { id: string; title: string; date: string };
type Historico = { role: string; parts: { text: string }[]; timestamp: string };
type Chamada = { method: string; path: string; body: unknown; auth: string | undefined };

const P1 = { id: "p1aaaaaaaaa", name: "Fulano Teste" };
const P2 = { id: "p2bbbbbbbbb", name: "Ciclano Teste" };
const TOKEN = { copmed_extension_token: "tok-salvo" };
const PACIENTE_SALVO = {
  ...TOKEN,
  patientId: P1.id,
  patientName: P1.name,
  consultationId: "c1xxxxxxxx",
  consultationTitle: "Consulta A",
};

let store: Record<string, unknown>;
let chamadas: Chamada[];
let authMeStatus: number;
let pacientes: { id: string; name: string }[];
let consultas: Record<string, Consulta[]>;
let historicos: Record<string, Historico[]>;

function msg(role: string, text: string): Historico {
  return { role, parts: [{ text }], timestamp: "2026-01-01T10:00:00Z" };
}

function resposta(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

function api(method: string, path: string, body: Record<string, unknown>) {
  let m: RegExpMatchArray | null;
  if (path === "/api/auth/login") {
    return resposta(200, { token: "tok-novo", user: { email: body.email }, profile: { role: "medico" } });
  }
  if (path === "/api/auth/me") {
    return authMeStatus === 200
      ? resposta(200, { user: { email: "medico@teste.com" }, profile: { role: "medico" } })
      : resposta(401, { message: "Token inválido" });
  }
  if (path === "/api/all-patients") return resposta(200, { status: "success", patients: pacientes });
  if (path === "/api/patients" && method === "POST") {
    const novo = { id: "p3ccccccccc", name: String(body.name) };
    pacientes = [...pacientes, novo];
    consultas[novo.id] = [{ id: "c5vvvvvvvv", title: "Primeira Consulta", date: "2026-04-01" }];
    return resposta(200, {
      status: "success",
      patient_id: novo.id,
      patient_name: novo.name,
      first_consultation_id: "c5vvvvvvvv",
    });
  }
  if ((m = path.match(/^\/api\/patients\/([^/]+)\/consultations$/))) {
    const pid = decodeURIComponent(m[1]);
    if (method === "POST") {
      consultas[pid] = [...(consultas[pid] || []), { id: "c9novaaaaa", title: "Consulta nova", date: "2026-05-01" }];
      return resposta(200, { status: "success", consultation_id: "c9novaaaaa", consultation_title: "Consulta nova" });
    }
    return resposta(200, { status: "success", consultations: [...(consultas[pid] || [])] });
  }
  if ((m = path.match(/^\/api\/patients\/[^/]+\/consultations\/([^/]+)\/history$/))) {
    return resposta(200, { status: "success", history: historicos[decodeURIComponent(m[1])] || [] });
  }
  if ((m = path.match(/^\/api\/patients\/([^/]+)\/transcription-log$/))) {
    const logs =
      decodeURIComponent(m[1]) === P1.id
        ? [
            {
              id: 1,
              timestamp: "2026-01-01T10:00:00Z",
              duration: "0:42",
              consultation_id: "c1xxxxxxxx",
              dialogue: [
                { role: "Médico", role_key: "doctor", text: "Bom dia, o que houve?" },
                { role: "Paciente", role_key: "patient", text: "Estou com dor de cabeça." },
              ],
            },
          ]
        : [];
    return resposta(200, { status: "success", logs });
  }
  if (path === "/api/chat") {
    const cid = String(body.consultation_id);
    historicos[cid] = [
      ...(historicos[cid] || []),
      msg("user", String(body.message)),
      msg("model", "Resposta do assistente"),
    ];
    return resposta(200, { status: "success" });
  }
  return resposta(404, { message: `rota não simulada: ${method} ${path}` });
}

beforeEach(() => {
  store = {};
  chamadas = [];
  authMeStatus = 200;
  pacientes = [P1, P2];
  consultas = {
    [P1.id]: [
      { id: "c1xxxxxxxx", title: "Consulta A", date: "2026-01-01" },
      { id: "c2yyyyyyyy", title: "Consulta B", date: "2026-02-01" },
    ],
    [P2.id]: [
      { id: "c4wwwwwwww", title: "Primeira", date: "2025-12-01" },
      { id: "c3zzzzzzzz", title: "Retorno", date: "2026-03-01" },
    ],
  };
  historicos = {
    c1xxxxxxxx: [msg("user", "Pergunta da consulta A"), msg("model", "Resposta da consulta A")],
    c3zzzzzzzz: [msg("user", "Pergunta do retorno")],
  };

  const pick = (keys: string | string[]) => {
    const out: Record<string, unknown> = {};
    for (const k of Array.isArray(keys) ? keys : [keys]) if (k in store) out[k] = store[k];
    return out;
  };
  const chromeFake = {
    storage: {
      local: {
        get: (keys: string | string[], cb: (r: Record<string, unknown>) => void) =>
          setTimeout(() => cb(pick(keys)), 0),
        set: (values: Record<string, unknown>, cb?: () => void) => {
          Object.assign(store, values);
          if (cb) setTimeout(cb, 0);
        },
        remove: (keys: string[], cb?: () => void) => {
          for (const k of keys) delete store[k];
          if (cb) setTimeout(cb, 0);
        },
      },
    },
  };
  vi.stubGlobal("chrome", chromeFake);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = new URL(url).pathname;
      const method = init.method || "GET";
      const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
      const headers = (init.headers || {}) as Record<string, string>;
      chamadas.push({ method, path, body, auth: headers.Authorization });
      return api(method, path, body);
    })
  );

  // A gravação começa sozinha ao abrir uma consulta; aqui o microfone nunca responde.
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: () => new Promise(() => {}) },
  });
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function chamadasPara(method: string, path: string) {
  return chamadas.filter((c) => c.method === method && c.path === path);
}

async function abrirComPacienteSalvo() {
  Object.assign(store, PACIENTE_SALVO);
  const view = render(<App />);
  await screen.findByText("Paciente: Fulano Teste");
  await screen.findByText("Resposta da consulta A");
  await waitFor(() => expect(screen.getByPlaceholderText("Digite sua mensagem...")).toBeTruthy());
  return view;
}

describe("sessão", () => {
  it("sem token salvo mostra o login e não chama a API", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Entrar" });
    expect(chamadas).toEqual([]);
  });

  it("token inválido é apagado e volta ao login com aviso", async () => {
    Object.assign(store, TOKEN);
    authMeStatus = 401;
    render(<App />);
    await screen.findByText("Sessão expirada. Entre novamente.");
    expect(chamadas[0]).toMatchObject({ method: "GET", path: "/api/auth/me", auth: "Bearer tok-salvo" });
    expect(store.copmed_extension_token).toBeUndefined();
  });

  it("login guarda o token e abre o app sem paciente", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Entrar" });
    fireEvent.change(screen.getByPlaceholderText("medico@clinica.com"), { target: { value: "medico@teste.com" } });
    fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "senha123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await screen.findByRole("button", { name: "Sair" });
    expect(chamadasPara("POST", "/api/auth/login")[0].body).toEqual({
      email: "medico@teste.com",
      password: "senha123",
      profile: "medico",
    });
    expect(store.copmed_extension_token).toBe("tok-novo");
    await screen.findByText("Bem-vindo! Selecione ou crie um paciente para começar.");
    await waitFor(() => expect(chamadasPara("GET", "/api/all-patients")[0]?.auth).toBe("Bearer tok-novo"));
  });

  it("login sem senha mostra erro e não chama a API", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Entrar" });
    fireEvent.change(screen.getByPlaceholderText("medico@clinica.com"), { target: { value: "medico@teste.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText("Informe e-mail, senha e perfil.");
    expect(chamadas).toEqual([]);
  });

  it("sair apaga sessão e paciente e volta ao login", async () => {
    await abrirComPacienteSalvo();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByRole("heading", { name: "Entrar" });
    expect(store).toEqual({});
  });
});

describe("pacientes e consultas", () => {
  it("restaura o paciente salvo com consultas, histórico e transcrições", async () => {
    const { container } = await abrirComPacienteSalvo();
    const [seletorPaciente, seletorConsulta] = container.querySelectorAll<HTMLSelectElement>("select.patient-select");

    expect(seletorPaciente.value).toBe(P1.id);
    expect(Array.from(seletorPaciente.options).map((o) => o.textContent)).toEqual([
      "Selecione um Paciente",
      "Fulano Teste (p1aaaaaa...)",
      "Ciclano Teste (p2bbbbbb...)",
    ]);
    await waitFor(() =>
      expect(Array.from(seletorConsulta.options).map((o) => o.textContent)).toEqual([
        "Selecione uma Consulta",
        "Consulta B (c2yyyyyy...)",
        "Consulta A (c1xxxxxx...)",
      ])
    );
    expect(seletorConsulta.value).toBe("c1xxxxxxxx");
    screen.getByText("Pergunta da consulta A");
    await screen.findByRole("button", { name: "📂 Transcrições (1)" });
  });

  it("trocar de paciente abre a consulta mais recente dele", async () => {
    const { container } = await abrirComPacienteSalvo();
    const seletorPaciente = container.querySelector<HTMLSelectElement>("select.patient-select")!;
    fireEvent.change(seletorPaciente, { target: { value: P2.id } });

    await screen.findByText("Paciente: Ciclano Teste");
    await screen.findByText("Pergunta do retorno");
    expect(store).toMatchObject({ patientId: P2.id, patientName: P2.name, consultationId: "c3zzzzzzzz" });
  });

  it("trocar de consulta carrega o histórico dela", async () => {
    const { container } = await abrirComPacienteSalvo();
    const seletorConsulta = container.querySelectorAll<HTMLSelectElement>("select.patient-select")[1];
    await waitFor(() => expect(seletorConsulta.disabled).toBe(false));
    fireEvent.change(seletorConsulta, { target: { value: "c2yyyyyyyy" } });

    await waitFor(() =>
      expect(chamadasPara("GET", `/api/patients/${P1.id}/consultations/c2yyyyyyyy/history`)).not.toHaveLength(0)
    );
    expect(store).toMatchObject({ consultationId: "c2yyyyyyyy", consultationTitle: "Consulta B" });
    await waitFor(() => expect(screen.queryByText("Pergunta da consulta A")).toBeNull());
  });

  it("limpar o paciente volta para a mensagem inicial", async () => {
    const { container } = await abrirComPacienteSalvo();
    fireEvent.change(container.querySelector("select.patient-select")!, { target: { value: "" } });
    await screen.findByText("Bem-vindo! Selecione ou crie um paciente para começar.");
    expect(screen.queryByText(/^Paciente: /)).toBeNull();
  });

  it("cria paciente pelo modal e seleciona a primeira consulta", async () => {
    Object.assign(store, TOKEN);
    const { container } = render(<App />);
    await screen.findByText("Bem-vindo! Selecione ou crie um paciente para começar.");
    fireEvent.click(container.querySelector(".patient-controls button")!);

    await screen.findByText("Criar Novo Paciente");
    fireEvent.change(screen.getByPlaceholderText("Nome do Paciente"), { target: { value: "Beltrano Novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await screen.findByText("Paciente: Beltrano Novo");
    expect(chamadasPara("POST", "/api/patients")[0].body).toEqual({ name: "Beltrano Novo" });
    expect(store).toMatchObject({ patientId: "p3ccccccccc", consultationId: "c5vvvvvvvv" });
    expect(screen.queryByText("Criar Novo Paciente")).toBeNull();
  });

  it("nova consulta é criada sem importar histórico", async () => {
    await abrirComPacienteSalvo();
    fireEvent.click(screen.getByRole("button", { name: "Nova Consulta" }));

    await waitFor(() => expect(store.consultationId).toBe("c9novaaaaa"));
    const [criacao] = chamadasPara("POST", `/api/patients/${P1.id}/consultations`);
    expect(criacao.body).toMatchObject({ import_consultation_ids: [] });
    expect(String((criacao.body as { title: string }).title)).toMatch(/^Consulta em /);
    await waitFor(() => expect(screen.queryByText("Pergunta da consulta A")).toBeNull());
  });

  it("importar consulta cria uma nova com o histórico escolhido", async () => {
    await abrirComPacienteSalvo();
    fireEvent.click(screen.getByRole("button", { name: "Importar Consulta" }));

    const opcao = await screen.findByLabelText(/Consulta B/);
    expect(screen.queryByLabelText(/Consulta A/)).toBeNull();
    fireEvent.click(opcao);
    fireEvent.click(screen.getByRole("button", { name: "Criar Nova Consulta com Histórico(s)" }));

    await waitFor(() => expect(store.consultationId).toBe("c9novaaaaa"));
    expect(chamadasPara("POST", `/api/patients/${P1.id}/consultations`)[0].body).toMatchObject({
      import_consultation_ids: ["c2yyyyyyyy"],
    });
  });
});

describe("chat e transcrições", () => {
  it("enviar mensagem chama /api/chat e recarrega o histórico", async () => {
    await abrirComPacienteSalvo();
    const campo = screen.getByPlaceholderText("Digite sua mensagem...");
    fireEvent.change(campo, { target: { value: "Como está a pressão?" } });
    fireEvent.submit(campo.closest("form")!);

    await screen.findByText("Resposta do assistente");
    expect(chamadasPara("POST", "/api/chat")[0].body).toEqual({
      message: "Como está a pressão?",
      patient_id: P1.id,
      consultation_id: "c1xxxxxxxx",
    });
  });

  it("abre e fecha uma transcrição salva", async () => {
    await abrirComPacienteSalvo();
    fireEvent.click(await screen.findByRole("button", { name: "📂 Transcrições (1)" }));
    fireEvent.click(await screen.findByText("0:42"));

    await screen.findByText("Bom dia, o que houve?");
    screen.getByText("Estou com dor de cabeça.");
    screen.getByText(/^Transcrição de /);
    fireEvent.click(screen.getByRole("button", { name: "❌ Fechar Arquivo" }));
    await waitFor(() => expect(screen.queryByText("Bom dia, o que houve?")).toBeNull());
  });
});
