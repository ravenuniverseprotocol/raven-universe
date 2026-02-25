# 🦅 Raven Universe - Diário Evolutivo

Este documento serve como registo central de todo o desenvolvimento do jogo, arquitetura técnica e progresso das funcionalidades.

## PROTOCOLO DE SUBORDINACAO - RESTRICOES CRITICAS

ESTAS REGRAS SAO ABSOLUTAS E DEVEM SER LIDAS ANTES DE QUALQUER ATUALIZACAO:

1. PROIBIDO INTERPRETAR: Seguir apenas o comando literal. Não assumir intenções.
2. PROIBIDO DECIDIR DESIGN: Não alterar estéticas, cores ou estruturas sem ordem direta.
3. PROIBIDO UNIFICAR/SIMPLIFICAR: Não alterar código que já funciona para "limpar" ou "sincronizar" sem ordem.
4. PROIBIDO AGIR SEM COMANDO: Não fazer nada que não tenha sido pedido.
5. PROIBIDO FALHAR NO RESTAURO: Prioridade total em voltar ao estado anterior em caso de erro.
6. PROIBIDO REMOVER FOTOS DE PERFIL OU DADOS DE PERSONALIZAÇÃO: Nunca remover, limpar ou substituir fotos/dados carregados pelo utilizador, mesmo em processos de limpeza ou resets.
7. QUANDO NAO SABE FAZER, ESTA TOTALMENTE PROIBIDO DE INVENTAR OU ALTERAR O QUE SEJA.
8. PROIBIDO DE ESTRAGAR QUALQUER BOM FUNCIONAMENTO EM TODA A LOGICA DE CADA MODULO EXISTENTE NO PROJETO!

---

## 🕹️ Guia de Funcionamento do Jogo

O **Raven Universe** é um simulador tático de gestão de estação espacial e exploração galáctica. Abaixo estão os pilares mecânicos do estado atual:

### 1. Sistema de Progressão e Skills

* **Treino Dinâmico**: Cada skill demora 10 segundos por nível para ser treinada.
* **Fila de Espera (Queue)**: O jogador pode clicar em múltiplas skills para as colocar em fila. O treino é sequencial.
* **Especialização (Mastery)**: Ao atingir o Nível 5, a skill é movida para o histórico de "Mastery".

### 2. Ciclo de Ativação da Estação (Gating)

O jogo utiliza um sistema de bloqueio por software para simular o arranque de uma estação real:

1. **Estado "Dark"**: A estação começa offline.
2. **Systems Online**: Requer as 10 skills de **Station Operations** a Nível 1. Ativa a iluminação da estação e a voz de sistema.
3. **Identidade**: Após o online, o Comandante deve identificar-se e carregar o seu perfil.
4. **Radar & Escudos**: Desbloqueiam-se após a identificação.
5. **Funcionalidade Tática**: O Radar Visual e a Vista de Sistema detalhada requerem as skills de **Radar Systems** a Nível 1.
6. **Defesas Ativas**: O escudo (Núcleo + Bolha) requer as skills de **Shield Systems** a Nível 1.

### 3. Navegação e Exploração

* **Mapa Galáctico**: Permite visualizar os 100 sistemas da galáxia "Nebulis Prime".
* **Vista de Sistema**: Através do mapa (duplo-clique), o jogador acede à grelha tática local para monitorizar frotas, asteroides e anomalias.
* **HUD**: Localizado no topo direito, indica sempre a localização atual no universo.

### 4. Persistência

* Todos os dados (Skills, Nome, Foto de Perfil, Estado dos Sistemas) são guardados no `localStorage` do browser.

---

## 🛠️ Arquitetura Técnica Implementada

O projeto foi modularizado para garantir estabilidade e facilidade de expansão:

* **`main.js`**: Motor central, gestão do ciclo de desenho (Canvas), estrelas e diagnóstico de erros.
* **`CommanderModule.js`**: Gestão do perfil do jogador, lógica de skills, fila de treino e estados de desbloqueio (Radar/Escudos).
* **`StationModule.js`**: Renderização da interface de sistemas da estação e lógica visual de "Online".
* **`MapModule.js`**: Motor do mapa galáctico procedural e navegação entre setores.
* **`RadarModule.js`**: Simulação tática de entidades em tempo real.
* **`MarketModule.js`**: Gestão do mercado galáctico e transações.
* **`HangarModule.js`**: Gestão de frotas e monitorização de naves.
* **`UIUtils.js`**: Utilitários para janelas arrastáveis e notificações globais.
* **`style.css`**: Design system completo (Orange Core / Blue Commander) com efeitos 4K.

---

## 📅 Histórico de Progresso

### Fase 1: Fundação & UI

* **Estéticas Premium**: Fundo preto total, estrelas realistas em 4K, cintilação subtil.
* **Sidebar Neocom**: Barra lateral com ícones SVG e efeito neon (Orange Multi-Layered Bloom).
* **Janelas Draggable**: Sistema de janelas arrastáveis com cabeçalho.
* **Commander System**: Upload de foto, nome dinâmico e fila de treino azul.
* **Station Systems**: 10 competências base com visual laranja e mecânica de acordeão.

### Fase 2: Interatividade & Tática

* **Radar Tático**: Implementação de radar visual com varrimento e detecção de frotas/asteroides.
* **Mapa Nebulis Prime**: 100 sistemas procedurais com nébulas e grelha tática.
* **Vista de Sistema Detalhada**: Grelha de scan profundo inspirada em *Fragile Allegiance*.
* **Sistemas de Escudos (Overhaul 4K)**:
  * **Núcleo de Energia**: Ignição no topo da torre da estação.
  * **Bolha Cinemática**: Escudo oval vertical ajustado à estação, sem bordas sólidas e com pulsação respiratória.
* **Áudio de Sistema**: Integração de vozes (Systems Online, Welcome Comander, Radar/Shields Online).
* **Estatismo vs Dinamismo**: Estação e satélite tornados estáticos para foco em clareza tática.

### Fase 3: Estabilidade & Ferramentas

* **START_RAVEN.bat**: Lançador direto para evitar vistas de diretório no Windows.
* **Diagnóstico de Motor**: Alertas em tempo real para falhas de scripts.
* **Mercado Galáctico (Fases 1 & 2)**:
  * **Financeiro**: Implementação de créditos (RUC) e carteira persistente.
  * **Inventário**: Sistema de armazenamento para commodities com lógica de BUY/SELL funcional.
  * **Interface**: Janela tática com indicadores de tendência e stock em tempo real.

### Fase 4: Gestão de Frotas & Hangar

* **Operações de Hangar (Fase 1)**:
  * **Interface de Comando**: Novo botão de Hangar na sidebar e janela de monitorização de frota.
  * **Monitorização Real-time**: Visualização de status (IDLE/TRANSIT) e coordenadas de todas as naves no Hangar.
* **Gestão de Frotas (Fase 2 - Docking & Deployment)**:
  * **Modelo de Docking**: Naves começam docadas e invisíveis no grid até serem lançadas.
  * **Comandos UNDOCK/RECALL**: Sistema de lançamento e recolha automática com deteção de proximidade.
  * **Status Dinâmico**: Estados de `DOCKED`, `UNDOCKING` e `RETURNING` integrados no Hangar.
* **Hangar & Gestão de Frotas (Fase 3 - Visuals & Specs)**:
  * **Miniaturas no Hangar**: Coluna de PREVIEW com ícones reais das naves.
  * **Identificação Técnica**: Campos de Classe e Descrições Técnicas integrados por nave.
* **Gestão de Frotas (Fase 4 - Mining & Cinematic Undock)**:
  * **Seleção de Alvos**: Interface de seleção de minerais obrigatória pré-lançamento.
  * **Sequência Cinemática**: Animação de saída da estação até abandono da vista táctica.
    * **Transmissão de Longo Alcance**: Integração de naves em operação de mineração profunda no Radar Táctico (blips verdes).
* **Gestão de Frotas (Fase 5 - Radar Requirement)**:
  * **Gating de Segurança**: Comando **UNDOCK** bloqueado se o Radar estiver offline.
  * **Interlock Táctico**: Feedback de erro "RADAR SYSTEMS OFFLINE" para prevenir perda de contacto com a frota.

### Fase 5: Sincronização Estelar & Heads-less Engine

* **Motor de Dados "Headless"**:
  * **Refatoração Estrutural (`SystemViewModule.js`)**: O motor de frotas foi desacoplado da interface. Agora corre em plano de fundo sem necessidade de janela modal ou canvas próprio, servindo dados para todo o ecossistema.
  * **Restauro de Integridade (`main.js`)**: Reativação do ciclo de vida das naves após limpeza de interface.
* **Rastreio Galáctico & Colisão Tática**:
  * **Integração no Mapa (`MapModule.js`)**: Visualização em tempo real de naves como pontos verdes pulsantes diretamente no Mapa Galáctico.
  * **Lógica de Fronteira (Tactical Collision)**: Implementação de gatilho de visibilidade baseado nos limites físicos da tela (`innerWidth/Height`). A nave só é "transmitida" para o mapa ao cruzar o perímetro da estação.
  * **Sincronização de Escalas 1:1**: Calibração dinâmica da escala do mapa para que o perímetro da tela corresponda exatamente ao raio do nó do sistema (8 unidades), garantindo precisão milimétrica na transição visual.
  * **Persistência Galáctica (ADN Estelar)**: Implementação de algoritmo `seededRandom` (Seed 777) para garantir que as posições e nomes dos 100 sistemas sejam imutáveis após refresh.
* **Notificações Táticas**: Sistema de alerta de perda de sinal local e transição para vigilância estelar.

---

## 🚀 Roteiro Futuro (Roadmap)

* [x] **Nave do Jogador**: Implementação de asset visual e lógica de movimento via comandos.
* [x] **Sincronização Estelar**: Rastreio de frotas no mapa com lógica de colisão de borda.
* [ ] **Câmara & Zoom**: Controlo de zoom in/out no espaço.
* [x] **Módulos de Mercado/Inventário**: Implementação das Fases 1 e 2 (Interface, Carteira e Stock).
* [x] **Operações de Hangar**: Gestão de frotas e monitorização de status.

---

### Fase 6: Defesa Tática & Estabilização de Núcleo

* **Interface de Escudos (Shield HUD)**:
  * **Visualização Holográfica**: Implementação de uma coluna de energia vertical que utiliza `glassmorphism`, uma grelha táctica hexagonal e um núcleo de plasma pulsante.
  * **Motor de Força e Regeneração (`ShieldModule.js`)**: Lógica dedicada para cálculo de HP máximo e taxa de recarga com base nas skills de "Shield Operations", "Upgrades", "Management" e "Compensation".
  * **Sincronização Táctica**: O HUD só é ativado quando os sistemas de escudo estão funcionais (Nível 1+). A cor da barra varia dinamicamente entre Azul (Carregado), Verde (Estável) e Vermelho (Crítico).
* **Estabilização de Sistemas**:
  * **Correção de "Line 0"**: Resolução de erro crítico de inicialização através da restauração do subsistema `UIUtils.js` e otimização da ordem de carregamento dos módulos em `index.html`.
  * **Robustez de Inicialização**: Refatoração do `CommanderModule.js` para garantir que o gestor de competências esteja disponível para todos os sistemas no momento do arranque.

* **Lógica de Operações (Níveis 2-5)**:
  * **Systems Thinking**: Implementação de multiplicador de velocidade de treino global.
  * **Eficiência Estelar**: Integração de bónus de lançamento (Logística) e descoberta de recursos (Decisão Operacional) nas naves.
  * **Expansão de Mercado**: Desbloqueio de slots de contratos e lucros marginais escaláveis.

* **Sistemas de Radar (Níveis 2-5)**:
  * **Perímetro Táctico**: Implementação do anel de alcance ciano pulsante.
  * **Inteligência IFF**: Diferenciação visual de alvos (Verde/Laranja/Vermelho) e assinaturas térmicas.
  * **Filtragem e Rastro**: Remoção de estática em cinturões e adição de rastros de movimento (Ghost Trails).

---

* **Estabilização de Sistemas de Progressão**:
  * **Protocolo Minimalista Final**: Remoção definitiva das 9 competências de gestão redundantes, focando exclusivamente nas 4 skills de operação base para um arranque limpo.
  * **Correção de Interlock de Identidade**: Resolução de bug crítico onde utilizadores já identificados ficavam com acesso ao Radar/Escudos bloqueado após o Online. Sincronização imediata de gating implementada.
  * **Otimização de Renderização**: Refatoração do ciclo de `update` para garantir que o desbloqueio de sistemas seja refletido visualmente sem necessidade de interação manual.
  * **Centralização de Interface**: Eliminação do menu "SKILLS" e da janela "STATION SYSTEMS OPERATION". Toda a progressão de competências foi consolidada na janela do Commander, reduzindo a redundância e simplificando a UX.
  * **Lógica de Gating de Energia (Power-Gated)**: Implementação da `Power Grid Calibration` como base física dos subsistemas. O Radar agora requer Nível 2 e os Escudos Nível 3. Tempos de treino acelerados para os níveis iniciais (20s-40s) para garantir o fluxo de jogo.
  * **HUD de Comando Triple-A (Cockpit Overhaul)**:
    * **Estrutura Mecânica (Bracket-UI)**: Transição de um círculo simples para uma base estrutural metálica com arcos segmentados de 180 graus.
    * **Motor Core de Alta Fidelidade**: Fusão do motor de partículas (Motion Trails) com o novo cockpit estrutural.
    * **Tecnologia 2.5D Parallax**: Implementação de profundidade visual dinâmica; o HUD inclina-se subtilmente seguindo o movimento do rato.
    * **Materiais & Detalhes**: Adição de "Tick-marks" mecânicos, filtros de distorção de vidro (Glassmorphism) e texturas de metal escovado via CSS.
    * **Gestão de Frotas (Fase 6 - Persistência de Sinal & Web Cleanup)**:
  * **Rastreio de Longo Alcance**: Implementação do status "SIGNAL LOST" na vista tática para naves além do alcance do radar, garantindo que o jogador saiba que a mineração continua mesmo sem contacto visual direto.
  * **Sincronização de Transição**: Calibração do gatilho `onMap` para coincidir com o limite do radar, eliminando a "zona morta" de visibilidade.
  * **Diferenciação Visual (Hangar)**: Criação da classe `status-active` para mineração, com pulsação cénica verde, separando-a visualmente do estado `IDLE`.
  * **Purga GameMaker**: Eliminação total de frotas e scripts residuais de GameMaker, consolidando o Raven Universe como um projeto 100% WebPlay.
* **Fase 7: Padronização de Inventário & Persistência de Dados**:
  * **Normalização de IDs**: Implementação de lógica de auto-correção no `CommanderModule.js` que padroniza nomes de recursos (ex: converte "Fusion Cells" para `FUSION_CELLS`), eliminando falhas de depósito por erros de sintaxe.
  * **Fix de Persistência Crítica**: Identificação e remoção de redundâncias de debug que apagavam o inventário e créditos no refresh do browser. Os bens minerados agora persistem permanentemente.
  * **Transparência Operacional**: Adição de logs de consola (`[INVENTORY]`) para monitorização técnica de fluxos de carga.
* **Fase 8: Comandantes Fantasma (NPC AI System)**:
  * **IA "Ghost Player"**: Criação do `NPCManager.js` com entidades autónomas que seguem as mesmas regras do jogador (créditos, skills, frota).
  * **Soberania de Território (FIX)**: Relocalização definitiva dos NPCs. As naves AI agora mineram em coordenadas relativas às suas próprias "bases" distantes, impedindo que invadam o sistema do jogador para extrair recursos.
  * **Filtros de Radar Tático**: Atualização do `SystemViewModule.js` para silenciar sinais de mineiros distantes; NPCs só aparecem no radar local quando estão em missão diplomática/comercial na Raven Station.
  * **Interatividade Económica**: NPCs agora compram bens do jogador no Storefront e listam os seus próprios bens para venda, dinamizando a economia.
  * **Identificação IFF**: Integração visual de naves NPC em cor âmbar no radar e mapa tático, permitindo a coexistência e competição por recursos.
    * **Autonomia Operacional**: NPCs tomam decisões independentes de treino de habilidades e rotas de mineração baseadas na rentabilidade do mercado.

### Fase 9: Migração Fullstack & Neural Cloud Link (MongoDB)

* **Arquitetura Intelligence Hub (Backend)**:
  * **Cérebro Central (`server.js`)**: Transição de uma aplicação puramente cliente para uma infraestrutura Client-Server baseada em Node.js e Express.
  * **Segurança de Dados (Auth Gate)**: Implementação de um protocolo de identificação obrigatório (`AuthModule.js`) com encriptação Bcrypt e tokens JWT para acesso à estação.
  * **Sincronização em Nuvem**: Refatoração do `CommanderModule.js` e `main.js` para persistência em tempo real via API assíncrona, eliminando a dependência exclusiva do `localStorage`.
* **Persistência Galáctica (MongoDB Atlas)**:
  * **Migração de Dados**: Abandono do armazenamento em ficheiros JSON locais em favor de um cluster de base de dados NoSQL na nuvem, garantindo persistência 24/7.
  * **Esquema de Comandante**: Estruturação de dados para suporte multi-utilizador, permitindo que diferentes comandantes operem na mesma galáxia com progressos independentes.
* **Acesso Externo & Tunneling**:
  * **Protocolo Ngrok**: Integração de túneis seguros para permitir que dispositivos externos acedam à estação via HTTPS sem necessidade de configuração de router.

---

## 🔐 Infraestrutura & Credenciais de Acesso (DADOS CRÍTICOS)

> [!CAUTION]
> **ACESSO RESTRITO:** Estas credenciais são necessárias para a manutenção do Cérebro da Estação e integridade dos dados.

### 1. Neural Cloud (MongoDB Atlas)

* **Username**: `raven_admin`
* **Password**: `1234`
* **Connection String**: `mongodb+srv://raven_admin:1234@ravenuniverse.4p9njow.mongodb.net/?appName=RavenUniverse`

### 2. Intelligence Hub (Local)

* **Porta**: `3000` (Node.js)
* **Comando de Arranque**: `node server.js`
* **Túnel Ngrok**: `ngrok http 3000`

### 3. Segurança JWT

* **Secret Key**: `RAVEN_PROJECT_SECRET_KEY_2026` (Configurado em `.env`)

---

## 🚀 Roteiro Futuro (Atualizado)

* [x] **Migração Fullstack**: Backend ativo com persistência cloud.
* [x] **Acesso Remoto**: Testado e funcional via Ngrok.
* [ ] **Deployment 24/7 (Render)**: Migração do código para hosting permanente (Pendente: GitHub Repo).
* [ ] **Multiplayer Real-time**: Visualização de outros comandantes humanos no mesmo sistema via WebSockets.
