# 📋 RELATÓRIO TÉCNICO COMPLETO – PARA INTEGRAÇÃO DE AGENTE IA BETA TESTER

## 1️⃣ ARQUITETURA GERAL

- **Linguagem do backend**: Node.js (Express)
- **Linguagem do frontend**: HTML5 / CSS3 / Vanilla JavaScript (ES6+)
- **Frameworks utilizados**: Express (Backend), WebGL2 + HTML5 Canvas (Frontend)
- **Base de Dados**: MongoDB (opcional), localStorage para persistência de estado local
- **O servidor é autoritativo?**: Não (Lógica de jogo gerida maioritariamente no cliente/browser)
- **A lógica do jogo está totalmente separada da UI?**: Sim, estruturada em módulos independentes (`CommanderModule`, `WeaponsModule`, `RadarModule`, etc.)
- **Existe modo headless?**: Não (A simulação de combate e radar depende do ciclo de renderização do DOM/Canvas)

## 2️⃣ GAME LOOP

- **O jogo corre em ticks ou frame-based?**: Frame-based (`requestAnimationFrame`) para renderização; Ticks de simulação via `setInterval` (~50ms) para combate e radar.
- **Frequência do tick (ms)**: ~50ms (Simulação), ~16.6ms (Visual/Render)
- **Existe sistema determinístico?**: Atualmente probabilístico (Spawn de inimigos e geração de contratos utilizam `Math.random`)
- **É possível fazer replay determinístico?**: Não implementado.

## 3️⃣ ESTADO DO JOGO (STATE STRUCTURE)

- **Jogador**: Nome (Identity), Créditos (RUC), Inventário (O2, Iron, Titanium), Níveis de Skill (Skill Tree).
- **Mundo**: Drones hostis ativos, Entidades em radar, Contratos de mercado disponíveis.
- **Unidades**: HP dos drones, Velocidade e Dano dos mísseis (MK1 a MK-X).
- **Economia**: Taxas de fabricação, Custos de pesquisa, Balanço de créditos.
- **Exemplo JSON do Estado**:

```json
{
  "commander": {
    "name": "COMMANDER_X",
    "credits": 5000,
    "inventory": { "OXYGEN": 450, "IRON": 1200, "TITANIUM": 300 },
    "skills": { 
      "power_grid_calibration": { "level": 4 }, 
      "kernel_boot_sequence": { "level": 1 },
      "ordnance_systems_ignition": { "level": 1 }
    }
  },
  "weapons": {
    "storage": { "mk1": 15, "mk2_vesta": 2 },
    "research": { "mk1": { "completed": true, "progress": 100 } },
    "autoFire": { "mk1": true }
  },
  "station": { 
    "isOnline": true, 
    "integrity": { "shield": 100, "armor": 100, "hull": 85 } 
  }
}
```

## 4️⃣ AÇÕES POSSÍVEIS

- **Macro**: Ativar Sistemas (Online/Radar), Gerir Skill Queue, Aceitar Contratos.
- **Micro**: Pesquisar Mísseis (Research), Fabricar Munição (Fabricate), Toggle Auto-fire por Slot.
- **Ações Condicionais**: Requisitos de Gating (ex: Skill A Lvl 4 para desbloquear Sistema B).
- **Cooldowns**: Research Time (10s - 15min), Fabrication Time (8s - 10min).
- **Total de ações**: ~20 ações discretas.

## 5️⃣ ECONOMIA

- **Recursos**: IRON, TITANIUM, FUSION CELL, OXYGEN, RUC (Créditos).
- **Geração**: Conclusão de Contratos de Mercado.
- **Consumo**: Pesquisa, Fabricação, Consumo Vital (O2) - Scalable via skills.
- **Snowballing**: Presente via skills de eficiência e velocidade de treino.
- **Caps**: Capacidade máxima de armazenamento (Logistics capacity).

## 6️⃣ COMBATE

- **Sistema**: Híbrido (Targeting geométrico + Projécteis discretos).
- **Dano**: Fixo por tipo de míssil (ex: MK1: 60) aplicado recursivamente (Shield -> Armor -> Hull).
- **Targeting**: Automático (Auto-fire range: 450px) ou Manual.
- **RNG**: Spawn position e HP base de unidades hostis.

## 7️⃣ ESPIONAGEM / INFORMAÇÃO PARCIAL

- **Scan**: Baseado em Radar (WebGL); Range e Resolução escalam com Skills de Radar.
- **Informação**: Entidades fora do alcance do radar são invisíveis à simulação tática.

## 8️⃣ CONDIÇÕES DE VITÓRIA

- **Vitória**: Sandbox (Progressão Infinita / Maxing Skill Tree).
- **Derrota**: Destruição total do Hull (Hull = 0%).

## 9️⃣ SISTEMA MULTI-AGENTE

- **Jogadores**: Single-player local com persistência.
- **NPCs**: Swarms de drones hostis e Entidades comerciais.

## 🔟 LOGGING E DEBUG

- **Logging**: Consola de Diagnóstico Engine (emite alertas em erros fatais e logs de subsistemas).
- **Monitorização**: Notificações in-game via `showGameNotification`.

## 1️⃣1️⃣ PERFORMANCE

- **CPU/RAM**: ~2% CPU / < 200MB RAM (Optimizado para browser).
- **Benchmark**: Estável em 60 FPS com 50+ entidades ativas.

## 1️⃣2️⃣ NÍVEL ATUAL DO PROJETO

- **Classificação**: **Protótipo Funcional / Alpha Interna**. Sistemas core (Economia, Combate, Progressão) operacionais. Estética 4K/Scifi estabilizada.

## 1️⃣3️⃣ OBJETIVO DO AGENTE IA

- **Múltiplos**:
  - **B)** Encontrar bugs estruturais (ex: falhas de gating ou persistência).
  - **C)** Testar balanceamento (Curva de custos vs Tempo de progressão).
  - **D)** Criar adversário oficial (Simulação de ameaças dinâmicas).
