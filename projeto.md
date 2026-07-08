Projeto PaperTrack

---

## Documento de Proposição e Especificação de Projeto (P&D)

### 1. Descrição do Projeto

O projeto **PaperTrack** consiste no desenvolvimento de uma aplicação web inovadora de Pesquisa e Desenvolvimento (P&D) focada em indexação, curadoria e catalogação de "ciência falada". A plataforma conecta-se à API do Spotify para escanear de forma profunda metadados de programas de podcast e áudio científico, transformando conteúdos em formato de áudio em fontes bibliográficas legítimas para a comunidade acadêmica (estudantes de ensino médio, graduação, pós-graduação e pesquisadores seniores).

Tradicionalmente, o conhecimento gerado em entrevistas, debates de laboratório, painéis e episódios de divulgação científica permanece inacessível para indexadores acadêmicos textuais (como Google Scholar ou Scopus), criando um apagão de fontes orais modernas e registros de discussões de ponta. O *PaperTrack* resolve este gap ao mapear, contextualizar e formatar automaticamente esses dados de áudio em strings de citações normatizadas (ABNT, APA, Vancouver), reduzindo a fricção de busca e validação para o usuário final por meio de uma interface integrada desenvolvida com Next.js, Tailwind CSS e Shadcn/ui.

---

### 2. Objetivos

#### 2.1 Objetivo Geral

Desenvolver, testar e homologar uma plataforma computacional integrada à API do Spotify que funcione como um ecossistema de busca e indexação temática de conteúdos de áudio de cunho científico e acadêmico, convertendo mídias orais em citações bibliográficas estruturadas de alta confiabilidade para o cenário educacional global.

#### 2.2 Objetivos Específicos

* **Investigar e Mapear Padrões de Metadados:** Analisar a estrutura de objetos JSON fornecida pelos endpoints de busca (`/v1/search`) de episódios (`type=episode`) e programas (`type=show`) do Spotify, identificando padrões de palavras-chave nas descrições que validem a autoridade científica da fonte.
* **Implementar Algoritmo de Filtragem e Relevância Acadêmica:** Construir uma camada de software descritiva (através de *vibe coding* no ecossistema Antigravity/VS Code) que use filtros de exclusão e uma *White List* dinâmica para mitigar ruídos e separar episódios de entretenimento de conteúdos de legítima divulgação científica.
* **Automatizar o Mecanismo de Citação:** Programar um motor de formatação em JavaScript puro para processar variáveis de tempo (`release_date`), duração (`duration_ms`), títulos e identificadores únicos (URIs) das mídias, gerando automaticamente referências bibliográficas prontas nos padrões ABNT e APA.
* **Garantir Acessibilidade e Interface de Fricção Zero:** Desenvolver uma interface *front-end* minimalista com arquitetura baseada em Next.js (App Router), aplicando as diretrizes estritas de marca e design do Spotify (como uso de fontes do sistema e bordas arredondadas de 8px nas artes de capa) para assegurar fluidez e adoção imediata por parte dos usuários.
* **Validar o Potencial Metodológico (História Oral):** Oferecer aos pesquisadores e estudantes uma ferramenta que valorize a descolonização do saber, permitindo que entrevistas de cientistas contemporâneos sirvam de dados qualitativos e fontes primárias para teses, artigos e trabalhos de conclusão de curso (TCC).

---

### 3. Justificativa Técnica e Inovação (Diferencial Competitivo)

O **PaperTrack** propõe um salto qualitativo na integração entre produção científica e plataformas de consumo midiático contemporâneo. A relevância metodológica desta ferramenta reside na capacidade de resgatar o "texto falado", transformando o registro efêmero de um podcast em documento científico indexável e verificável. 

**Inovação e Diferenciação:**
1. **Indexação semântica de áudio:** Ao contrário de ferramentas genéricas que listam resultados por popularidade, o PaperTrack utiliza uma lógica de filtragem (aditiva e exclusiva) baseada em terminologia acadêmica ("genômica", "física quântica", "ecologia política"), agregando valor científico à busca.
2. **Automatismo de Citação Padrão:** A capacidade de gerar strings de referência no formato ABNT e APA elimina uma etapa burocrática fundamental para estudantes, elevando a produtividade acadêmica.
3. **Design Responsivo e Hierárquico:** Seguindo o *Human Interface Guidelines* do Spotify, a interface garante que o usuário encontre conteúdo relevante (foco no card de capa e nome do programa) e mantenha a consistência visual com a qual já está habituado.
4. **História Oral Científica:** Posiciona a ciência falada como fonte primária, desafiando o viés tradicional das publicações textuais e valorizando a pluralidade de vozes na produção do conhecimento.

**Desafios Técnicos (Mapeamento de Riscos):**
* **Volume de Dados vs. Performance:** O Spotify possui milhões de episódios. É crucial implementar paginação eficiente (`limit` e `offset`) e cache local para garantir que a API não seja sobrecarregada.
* **Ambiguidades de Linguagem:** Termos científicos podem aparecer em contextos de entretenimento ("Conexão Podpah Science"). A lógica de *filtering* deve ser robusta para evitar falsos positivos.
* **Adesão à API (Rate Limits):** É mandatório implementar uma política de rate limiting (delay entre requisições) e recuperação de erros (exponential backoff) para respeitar as cotas da API do Spotify e evitar bloqueios de IP.

### 3. Público-Alvo

O ecossistema do *PaperTrack* foi desenhado para atender três frentes distintas do cenário educacional e científico, categorizadas por suas necessidades de pesquisa:

* **Pesquisadores Seniores e Pós-Graduandos (Mestrado/Doutorado):** Indivíduos que necessitam coletar fontes primárias de dados (entrevistas com cientistas, debates contemporâneos e história oral) para embasamento de suas teses, artigos e dissertações.
* **Estudantes de Graduação e Ensino Médio:** Alunos em fase de elaboração de Trabalhos de Conclusão de Curso (TCC), iniciação científica ou artigos escolares que buscam diversificar seus referenciais teóricos além dos livros texto estáticos.
* **Professores e Orientadores Acadêmicos:** Educadores que necessitam validar a idoneidade das mídias em áudio consumidas e citadas por seus alunos, utilizando a plataforma como um validador de autoridade científica.

---

### 4. Plano de Ação (Cronograma de Desenvolvimento)

O desenvolvimento será executado em regime de **vibe coding** no ambiente VS Code + Antigravity, estruturado em cinco fases sequenciais:

```
[Fase 1: Setup & Auth] ➡️ [Fase 2: Motor de Busca] ➡️ [Fase 3: Motor de Citação] ➡️ [Fase 4: UI/UX Spotify] ➡️ [Fase 5: Deploy]

```

* **Fase 1: Configuração do Ambiente e Autenticação (Dias 1-3)**
* Setup do repositório no GitHub integrado ao ecossistema Next.js (App Router).
* Configuração do NextAuth.js (Auth.js) utilizando o *provider* do Spotify para login seguro com fricção zero.
* Homologação das chaves de API (`CLIENT_ID` e `CLIENT_SECRET`) no painel de desenvolvedor do Spotify.


* **Fase 2: Construção do Motor de Busca Avançada (Dias 4-7)**
* Desenvolvimento do pipeline de integração com o endpoint `GET /v1/search`.
* Implementação dos algoritmos de filtro de string (exclusão de termos comerciais e inclusão de palavras-chave como `entrevista`, `painel`, `ciência`).
* Criação da *White List* estática com IDs de podcasts de universidades proeminentes.


* **Fase 3: Desenvolvimento do Motor de Citação Automática (Dias 8-10)**
* Criação da lógica em JavaScript para parsear os objetos de resposta do Spotify (`release_date`, `show.name`, `name`, `external_urls.spotify`).
* Estruturação dos algoritmos de saída de texto formatado conforme as normas vigentes da ABNT e APA.


* **Fase 4: Refinamento de Interface (UI/UX) e Design Compliance (Dias 11-13)**
* Montagem da interface responsiva utilizando Tailwind CSS e componentes estruturais do Shadcn/ui (`Cards`, `Tabs`, `Toast`).
* Aplicação rigorosa das diretrizes visuais do Spotify (fundo `#191414`, fontes sans-serif do sistema e bordas de 8px nas capas dos programas).


* **Fase 5: Testes de Integração, Deploy e Publicação do Portfólio (Dias 14-15)**
* Testes de fluxo de login, expiração de token e paginação de resultados.
* Deploy automatizado na plataforma Vercel com injeção segura de variáveis de ambiente.
* Documentação detalhada do projeto no `README.md` do GitHub com vídeo demonstrativo embutido.


---

### 5. Recursos

#### 5.1 Recursos de Software e Infraestrutura

* **Ambiente de Desenvolvimento:** VS Code integrado à IA do Antigravity.
* **Framework Principal:** Next.js (React) para geração de páginas estáticas e rotas de API seguras no servidor.
* **Estilização:** Tailwind CSS combinado com a biblioteca de componentes agnósticos Shadcn/ui.
* **Hospedagem e CI/CD:** Vercel conectado diretamente ao repositório público do GitHub.
* **Provedor de Dados:** Spotify Web API (Endpoints de Busca e Metadados).
* **Repositório:** GitHub. Link: [https://github.com/diegolhos/PaperTrack](https://github.com/diegolhos/PaperTrack)
* **Guide Design:** [https://developer.spotify.com/documentation/design](https://developer.spotify.com/documentation/design)
* **Documentation Web API:** [https://developer.spotify.com/documentation/web-api](https://developer.spotify.com/documentation/web-api)



#### 5.2 Recursos Humanos

* **1 Desenvolvedor Full-Stack (EU):** Responsável por conduzir os prompts lógicos da IA, gerenciar a arquitetura de arquivos e garantir a consistência das regras de negócio do aplicativo.

---

### 6. Resultados Esperados

* **Código Aberto e Portfólio de Autoimpacto:** Disponibilização de um repositório limpo, modular e altamente profissional no GitHub, demonstrando domínio em consumo de APIs REST corporativas e tratamento assíncrono de dados.
* **Redução Drástica de Fricção Operacional:** Um usuário final deve ser capaz de realizar o login, digitar o tema, localizar um episódio relevante e extrair uma citação válida em menos de **45 segundos**.
* **Geração Automática de Citações com Erro Zero:** Formatação computacional sem falhas de sintaxe de strings nas normas ABNT e APA, prontas para transferência via área de transferência (Copy/Paste) para o editor de texto do pesquisador.
* **Interface Estética e Fluida:** Uma aplicação Web App estável, com visual escuro premium que passe a sensação de ser um produto proprietário oficial ou extensão autorizada do ecossistema Spotify.

---

### 7. Avaliação (Métricas de Sucesso)

O sucesso do projeto de P&D *PaperTrack* será mensurado com base nos seguintes indicadores de performance e engenharia de software:

* **Tempo de Resposta da API (Performance):** A renderização dos resultados filtrados na tela do usuário não deve exceder **1.5 segundos** após o acionamento do gatilho de busca.
* **Acurácia dos Filtros Acadêmicos:** Em testes amostrais com 50 buscas temáticas distintas, pelo menos **80%** dos resultados exibidos na primeira página devem possuir relevância de cunho informativo, educacional ou acadêmico.
* **Métricas de Código (Qualidade):** Obter uma estrutura de código limpa no VS Code, avaliada pela ausência de chaves de API expostas (vazamento de dados) e tratamento correto de erros de requisição da API (ex: tratamento do erro `401 Unauthorized` por token expirado).
* **Engajamento de Portfólio (Validação de Mercado):** Obtenção de feedback positivo em comunidades de desenvolvimento (LinkedIn/GitHub) quanto à originalidade da arquitetura de cruzamento de dados aplicada ao nicho EdTech.


