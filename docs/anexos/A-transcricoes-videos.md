# Anexo A — Transcrições dos vídeos (revisadas)

Transcrições obtidas das legendas automáticas do YouTube em 15/09/2026 e **revisadas apenas para corrigir erros de reconhecimento de fala** (ex.: "Beckend" → backend, "Space" → spaCy, "Trelo" → Trello, "FET API" → Fetch API, "Ampled" → Amplimed, "Jason" → JSON). Conteúdo e ordem preservados. Canal: **REACT Labs | UPE – POLI**.

---

## 1. EQUIPE 3 — COPILOT MEDICO — PITCH
https://www.youtube.com/watch?v=_0SnWv-aAp0 · ciclo 1 (v1.0)

**Pontos‑chave:** problema = sobrecarga cognitiva do médico; demo no Amplimed com caso de dengue; "o médico precisa sempre validar"; depoimento da Dra. Lorena Mazoni; ideia trazida pelo Rui.

> Bem, pessoal, vamos lá. É a apresentação da ferramenta CoPilot Médico, que é o assistente inteligente para profissionais da saúde. O nosso problema, que fez com que a gente desenvolvesse essa ferramenta, é justamente algo que muito provavelmente alguém que está me escutando neste exato momento já passou, ou conhece alguém que passou: seja demora no atendimento, seja uma desatenção por parte do profissional, que muitas vezes nós julgamos como um desleixo na hora do atendimento, quando na verdade pode ser uma sobrecarga cognitiva. A rotina dos profissionais de saúde se torna cada vez mais desafiadora a cada dia que passa, e surge a necessidade de atendimento do máximo de pacientes no menor tempo possível. Para isso nós desenvolvemos o CoPilot Médico, que vai ser justamente um auxiliar no dia a dia do médico nos prontuários eletrônicos.
>
> Estamos simulando para este caso um paciente com algumas informações características, como manchas vermelhas no corpo, refere fadiga, sensação de corpo mole — enfim, toda uma anamnese feita a partir do primeiro contato com o paciente, além de algumas informações do exame físico: altura, peso, IMC. A partir disso a ferramenta vai nesse diagnóstico. Inicialmente é necessário clicar na área de extrair os dados, para que os dados sejam extraídos da ferramenta do Amplimed e enviados para a API, para que seja processada essa possível resposta. A partir do que foi processado, tivemos um retorno da ferramenta com uma possível hipótese diagnóstica, que o médico precisa avaliar a partir do que foi trazido e ver se é válida ou não a utilização dessa informação. Como podemos ver, muito provavelmente a maior hipótese aqui é justamente de dengue; ele demonstra algumas outras hipóteses, como a de zika, mas de acordo com as características do paciente muito provavelmente é um caso de dengue. Então a gente copia as informações — e, mais uma vez, o médico vai precisar sempre validar esses dados.
>
> Como podemos ver, a ferramenta do CoPilot pode agregar muito no dia a dia do médico: seja com agilidade no atendimento, seja num apoio para a tomada de uma decisão clínica, ou até mesmo por uma diminuição da sobrecarga cognitiva, tendo em vista que ele vai ter todo o seu raciocínio passando por um *double check*. É uma otimização do fluxo de trabalho; vai ter um ambiente mais estruturado, visto que a ferramenta vai estar apoiando com a anamnese do paciente; e, por último, não menos importante, uma maior segurança na confiança do diagnóstico.
>
> Outro ponto interessante é um depoimento que nós tivemos da nossa cliente final, a Dra. Lorena Mazoni, que destacou esses pontos principais que mostramos da ferramenta. Quando o Rui trouxe para ela a ideia, na fase embrionária, ela ficou encantada; e quando viu a ferramenta em funcionamento, ela trouxe essa satisfação com as possíveis melhorias que a ferramenta vai trazer no dia a dia dela.

---

## 2. EQUIPE 3 — COPILOT MEDICO — RELATÓRIO TÉCNICO
https://www.youtube.com/watch?v=wJ56Jl9cktE · ciclo 1 (v1.0)

**Pontos‑chave:** backend Python + OpenAI (GPT‑4 com instruções de treinamento); front TypeScript + extensão Chrome + React + Node; scraping do prontuário; branches por feature; justificativas de escolha.

> Eu vou apresentar agora um pouco do processo de desenvolvimento do CoPilot Médico e alguns detalhes técnicos sobre a nossa ferramenta. Primeiramente, as ferramentas utilizadas: no backend, Python e a OpenAI; no frontend, TypeScript, a extensão do Chrome e o Node; também foi utilizado no frontend o React.
>
> Aqui temos o nosso GitHub. Utilizamos a opção de branches para poder trabalhar melhor como equipe, onde cada um foi desenvolvendo a sua feature; no final juntamos tudo na `main`. Aqui temos o nosso código. O front basicamente faz um web scraping da página de um prontuário médico. Essa coleta de dados é feita de forma automática: o médico só precisa apertar um botão, não precisa digitar nada, não tem muitos passos a mais. Ele vai fazendo o trabalho dele como normalmente faz no dia a dia e, quando terminar, caso queira a opinião da nossa ferramenta, abre a extensão e aperta o botão de coletar dados. Os dados que estão no prontuário são coletados e enviados para a API. Aqui temos uma API configurada da OpenAI, onde configuramos um GPT‑4 já com *fine tuning* — uma série de comandos de treinamento — para que ele trouxesse uma resposta que nos agradasse. Após os dados serem mandados, eles são analisados pela API e retornados para o nosso front. Basicamente é isso.
>
> Quanto ao porquê das ferramentas que escolhemos: para a API foi escolhido o Python por causa da facilidade de tratamento de dados — caso precisássemos modificar alguma coisa na entrada ou na saída do material fornecido — além da questão da linguagem natural, já que estamos trabalhando com uma linguagem mais falada, mais escrita, não é como se fosse um comando. Acreditamos que o Python seria mais fácil para aplicar qualquer outra ferramenta necessária no futuro, não só agora na cadeira como também caso decidamos continuar com o projeto. Já no frontend optamos por utilizar o TypeScript junto com a extensão do Google Chrome, porque ela tem uma coleta dinâmica de dados: conseguíamos pegar os dados antes de mandar uma requisição na página, o que facilitava bastante.

---

## 3. Equipe 4 — Copilot Médico — Pitch
https://www.youtube.com/watch?v=cxFWvGYqn2U · ciclo 2 (v2.0)

**Pontos‑chave:** Gemini; leitura direta do Amplimed; upload de PDF; NLP local remove o nome antes de enviar à nuvem; IDs de paciente para histórico anônimo; protótipos de áudio em teste.

> A rotina médica é uma corrida contra o tempo. Entre consultas, análises de exames e a complexidade dos prontuários eletrônicos, informações cruciais podem se perder. E se o médico tivesse um assistente inteligente, sempre a postos para otimizar cada decisão? Apresentamos o CoPilot Médico, uma ferramenta de inteligência artificial construída com a poderosa API Gemini do Google, que funciona como uma extensão no seu navegador, transformando a maneira como você interage com os dados do paciente.
>
> Nossa ferramenta lê e interpreta diretamente os dados da página do prontuário eletrônico do Amplimed, incluindo rapidamente os dados do paciente direto na ferramenta. Recebeu um exame novo? Basta fazer o upload do PDF. Nossa ferramenta extrai as informações relevantes, integrando‑as instantaneamente à análise do caso. E a privacidade do paciente é nossa prioridade máxima: desenvolvemos um sistema de processamento de linguagem natural que roda localmente no seu computador. Ele filtra e remove o nome do paciente antes de qualquer dado ser enviado para a API na nuvem. Segurança e confidencialidade em primeiro lugar.
>
> Já estamos olhando para o futuro. Com a implementação inicial de um sistema de IDs de paciente, buscamos criar um histórico contínuo e anônimo. Além disso, protótipos para processamento de áudio estão em teste, visando transcrever conversas e otimizar ainda mais o tempo da consulta. CoPilot Médico: menos tempo com burocracia, mais tempo com o que realmente importa — o cuidado ao paciente. A inteligência artificial a serviço da medicina.

---

## 4. Equipe 4 — Copilot Médico — Relatório Técnico
https://www.youtube.com/watch?v=qFYitWekCEI · ciclo 2 (v2.0)

**Pontos‑chave:** React + TS + Vite; content scripts + service worker + Fetch API; `chrome.storage.local`; Flask + spaCy + Gemini; PyPDF2; banco JSON; GitHub com branches de dev/teste/produção; Trello por sprints.

> Olá, sejam todos bem‑vindos ao relatório técnico da aplicação do CoPilot Médico, uma solução médica prática para o seu navegador Chrome. No desenvolvimento estruturamos a aplicação em duas grandes camadas: frontend, que é a interface com o usuário, e backend, responsável pelo processamento das informações.
>
> No frontend utilizamos React com TypeScript, integrados por meio do Vite para otimizar o processo de build. Toda a aplicação funciona como uma extensão do Google Chrome, permitindo que o médico interaja diretamente com o prontuário eletrônico, faça perguntas à IA e envie arquivos com poucos cliques. Para isso usamos também JavaScript moderno, scripts de conteúdo e service workers que se comunicam com o backend via Fetch API, além do `chrome.storage.local` para persistir dados como o ID do paciente e o histórico do chat.
>
> Já no backend, construído em Python com o microframework Flask, temos a lógica de negócio central. Essa camada trata o texto recebido, faz a anonimização dos dados sensíveis usando a biblioteca spaCy e envia os dados processados à API do Google Gemini, que retorna respostas contextualizadas para o médico. Também integramos a biblioteca PyPDF2 para extrair texto de exames médicos em PDF e contamos com um pequeno banco de dados local em JSON, que guarda o histórico de interações por paciente.
>
> Durante o desenvolvimento utilizamos o GitHub como repositório principal de versionamento. Mantivemos uma estrutura bem organizada, com branches específicas para desenvolvimento, testes e produção. Os merges foram feitos de forma cuidadosa, sempre revisando o código antes de integrar às branches principais, o que garantiu maior controle sobre a estabilidade da aplicação e facilitou a colaboração. Para o gerenciamento das tarefas e do progresso utilizamos o Trello: criamos um quadro dividido por sprints, com tarefas atribuídas de forma clara a cada membro, e realizamos atualizações periódicas para acompanhar o andamento e redefinir prioridades quando necessário. Toda essa integração garante uma experiência fluida, segura e eficiente, com foco na assistência clínica através da inteligência artificial.

---

## 5. Equipe 6 — Copilot Medico — Pitch
https://www.youtube.com/watch?v=FmpYD-HKD9A · ciclo 3 (v3.0)

**Pontos‑chave:** narrativa da escuta; fluxo em 4 passos (criar perfil, gravar, parar, ler transcrito); tela transcrição bruta × análise da IA; impacto (foco, precisão, menos burocracia, prontuários completos).

> Sabe, uma consulta médica é um momento super complexo. De um lado tem um paciente procurando respostas, querendo ser ouvido; do outro, um profissional de saúde numa corrida contra o tempo para não perder nenhum detalhe. Mas e se a tecnologia, em vez de atrapalhar, pudesse fortalecer essa conexão?
>
> Tudo começa geralmente com uma voz, a voz do paciente: "coração vive disparando, tem uma dor de cabeça que aperta, muita ansiedade, estou com medo de coisas que eu não tinha antes". Cada palavra tem um peso. E é exatamente aí que mora o grande desafio: como um médico consegue ouvir com atenção, mostrar empatia e ao mesmo tempo anotar cada vírgula dessa enxurrada de informações vitais? Em menos de um minuto o paciente falou de sintoma físico, de medo, de mudança de comportamento. Para quem está ouvindo, isso é um fluxo de dados gigantesco que precisa ser entendido, organizado, e na hora. O ato de ficar digitando enquanto a pessoa fala pode quebrar totalmente a conexão, o olho no olho, a confiança. O desafio é esse equilíbrio quase impossível entre escutar de verdade e documentar tudo perfeitamente.
>
> É para resolver esse dilema que entra em cena o CoPilot Médico. Ele foi pensado para ser um assistente inteligente, para estar ali em cada consulta sem ser uma distração. A tela de início é simples: zero complicação, zero caos. O fluxo de trabalho se resume a quatro passos: primeiro, cria o perfil do paciente; depois, grava a consulta; aí é só parar a gravação que o sistema processa tudo; e por último o transcrito está lá, prontinho para acessar. Um único toque no ícone e um novo paciente foi criado. Logo em seguida a gravação começa, o que deixa o médico livre para focar no paciente, nos gestos, naquilo que às vezes nem é dito em palavras. Quando a consulta acaba, é só parar a gravação; o sistema salva e processa o áudio automaticamente, e em questão de segundos o resultado está na mão: um arquivo com a transcrição completa.
>
> E se essa tecnologia fosse além de apenas registrar as palavras? O CoPilot Médico usa inteligência artificial para analisar o diálogo, encontrar *insights* e transformar aquela conversa em dados clínicos organizados e estruturados. À esquerda, a transcrição bruta; à direita, a análise da IA, um resumo com os dados principais, já destacando a dor de cabeça, o uso de medicação, e sugerindo que precisa coletar mais informações para um diagnóstico mais preciso. É sair do texto puro para um apoio clínico de verdade. A ferramenta devolve ao médico a coisa mais preciosa que existe: tempo. O impacto: mais foco no paciente, o que melhora a relação; a precisão do diagnóstico aumenta porque menos detalhes se perdem; a carga administrativa diminui, o que ajuda a combater o burnout; e os prontuários ficam mais completos e organizados. Não é só sobre uma ferramenta nova, mas sobre uma nova forma de trabalhar.

---

## 6. Equipe 6 — Copilot Medico — Relatório Técnico
https://www.youtube.com/watch?v=9zBD2nv-5uk · ciclo 3 (v3.0)

**Pontos‑chave:** React + TS; seletores CSS no prontuário; sessão persistida localmente; Fetch assíncrono; Flask; spaCy remove nome; banco JSON; Gemini; pipeline de áudio WAV → classe `Diarizador` (Vosk + Google Speech) classifica médico/paciente; GitHub + Trello.

> Olá. Detalharemos a arquitetura técnica da solução CoPilot Médico, uma ferramenta de inteligência artificial projetada para otimizar a rotina clínica, funcionando como uma extensão integrada ao Google Chrome. A arquitetura é dividida em duas grandes camadas interconectadas: o frontend e o backend.
>
> Frontend — a extensão de navegador. O frontend é a interface direta com o usuário, operando no navegador para coletar informações. Utilizamos React com TypeScript para uma interface robusta. Sua função principal é ler e interpretar dados do prontuário eletrônico na aba ativa, extraindo conteúdos cruciais usando seletores CSS. Dados de sessão, como o ID e o nome do paciente, são persistidos localmente, garantindo que o contexto da consulta esteja sempre à mão, mesmo antes de se comunicar com o servidor. A comunicação com o backend é feita de forma assíncrona usando a Fetch API.
>
> Backend — lógica de negócio e segurança. O backend é o motor de processamento, construído em Python utilizando o microframework Flask. É aqui que a segurança e a inteligência central são implementadas. A privacidade é prioridade: antes que qualquer informação sensível seja enviada à nuvem, o backend executa um rigoroso processo de anonimização. Usando a biblioteca spaCy, ele filtra e remove o nome do paciente, garantindo a conformidade e a segurança dos dados clínicos. Para manter o histórico de interações, utilizamos um pequeno banco de dados JSON local. O coração do CoPilot Médico é a poderosa API Gemini do Google.
>
> O pipeline avançado de áudio — diarização. Uma expansão crucial da arquitetura é o processamento de áudio. O frontend gerencia a gravação e converte o áudio capturado na web em um arquivo WAV, que é enviado ao backend. No backend entra em ação a classe `Diarizador`: integrando o Vosk para a segmentação de falantes e a API de reconhecimento de fala do Google, o sistema não só transcreve a conversa, mas também identifica e classifica os falantes como médico ou paciente. Essa transcrição rica em detalhes é então salva e integrada ao fluxo principal do chat, alimentando o Gemini com o diálogo completo.
>
> Gestão do projeto. Para garantir controle e estabilidade, a equipe utiliza o GitHub para controle e versionamento, com branches bem definidas, e o Trello para gestão de tarefas e sprints.
