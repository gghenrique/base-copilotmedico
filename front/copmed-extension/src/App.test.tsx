// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { P1, P2, PACIENTE_SALVO, TOKEN, chamadasPara, fake, instalarFakes } from "./test/extensaoFake";

// Testes de comportamento da extensão pela interface: a API e o chrome.storage são simulados,
// então os mesmos testes valem para qualquer organização interna do App.

beforeEach(instalarFakes);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function abrirComPacienteSalvo() {
  Object.assign(fake.store, PACIENTE_SALVO);
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
    expect(fake.chamadas).toEqual([]);
  });

  it("token inválido é apagado e volta ao login com aviso", async () => {
    Object.assign(fake.store, TOKEN);
    fake.authMeStatus = 401;
    render(<App />);
    await screen.findByText("Sessão expirada. Entre novamente.");
    expect(fake.chamadas[0]).toMatchObject({ method: "GET", path: "/api/auth/me", auth: "Bearer tok-salvo" });
    expect(fake.store.copmed_extension_token).toBeUndefined();
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
    expect(fake.store.copmed_extension_token).toBe("tok-novo");
    await screen.findByText("Bem-vindo! Selecione ou crie um paciente para começar.");
    await waitFor(() => expect(chamadasPara("GET", "/api/all-patients")[0]?.auth).toBe("Bearer tok-novo"));
  });

  it("login sem senha mostra erro e não chama a API", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Entrar" });
    fireEvent.change(screen.getByPlaceholderText("medico@clinica.com"), { target: { value: "medico@teste.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText("Informe e-mail, senha e perfil.");
    expect(fake.chamadas).toEqual([]);
  });

  it("sair apaga sessão e paciente e volta ao login", async () => {
    await abrirComPacienteSalvo();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByRole("heading", { name: "Entrar" });
    expect(fake.store).toEqual({});
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
    expect(fake.store).toMatchObject({ patientId: P2.id, patientName: P2.name, consultationId: "c3zzzzzzzz" });
  });

  it("trocar de consulta carrega o histórico dela", async () => {
    const { container } = await abrirComPacienteSalvo();
    const seletorConsulta = container.querySelectorAll<HTMLSelectElement>("select.patient-select")[1];
    await waitFor(() => expect(seletorConsulta.disabled).toBe(false));
    fireEvent.change(seletorConsulta, { target: { value: "c2yyyyyyyy" } });

    await waitFor(() =>
      expect(chamadasPara("GET", `/api/patients/${P1.id}/consultations/c2yyyyyyyy/history`)).not.toHaveLength(0)
    );
    expect(fake.store).toMatchObject({ consultationId: "c2yyyyyyyy", consultationTitle: "Consulta B" });
    await waitFor(() => expect(screen.queryByText("Pergunta da consulta A")).toBeNull());
  });

  it("limpar o paciente volta para a mensagem inicial", async () => {
    const { container } = await abrirComPacienteSalvo();
    fireEvent.change(container.querySelector("select.patient-select")!, { target: { value: "" } });
    await screen.findByText("Bem-vindo! Selecione ou crie um paciente para começar.");
    expect(screen.queryByText(/^Paciente: /)).toBeNull();
  });

  it("cria paciente pelo modal e seleciona a primeira consulta", async () => {
    Object.assign(fake.store, TOKEN);
    const { container } = render(<App />);
    await screen.findByText("Bem-vindo! Selecione ou crie um paciente para começar.");
    fireEvent.click(container.querySelector(".patient-controls button")!);

    await screen.findByText("Criar Novo Paciente");
    fireEvent.change(screen.getByPlaceholderText("Nome do Paciente"), { target: { value: "Beltrano Novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await screen.findByText("Paciente: Beltrano Novo");
    expect(chamadasPara("POST", "/api/patients")[0].body).toEqual({ name: "Beltrano Novo" });
    expect(fake.store).toMatchObject({ patientId: "p3ccccccccc", consultationId: "c5vvvvvvvv" });
    expect(screen.queryByText("Criar Novo Paciente")).toBeNull();
  });

  it("nova consulta é criada sem importar histórico", async () => {
    await abrirComPacienteSalvo();
    fireEvent.click(screen.getByRole("button", { name: "Nova Consulta" }));

    await waitFor(() => expect(fake.store.consultationId).toBe("c9novaaaaa"));
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

    await waitFor(() => expect(fake.store.consultationId).toBe("c9novaaaaa"));
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
