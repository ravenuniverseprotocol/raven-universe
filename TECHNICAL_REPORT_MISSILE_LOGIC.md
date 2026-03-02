# 🚀 RELATÓRIO TÁTICO: LÓGICA DE MÍSSEIS

Comandante, verifiquei toda a árvore lógica dos sistemas de armamento orbital. Abaixo estão as especificações detalhadas do funcionamento dos mísseis na Estação Raven.

## 1. PROTOCOLO DE ATIVAÇÃO EXTERNA (GATING)

Para que o sistema de mísseis seja sequer ligado, o sistema exige:

- **Energia**: `Power Grid Calibration` em **Nível 4**.
- **Ignição**: `Ordnance Systems Ignition` em **Nível 1**.
- **Competência**: **Nível 1** em TODAS as 4 skills de Orbital Weapons:
  - `ballistic_weaponry`
  - `missile_guidance_systems`
  - `ordnance_logistics`
  - `advanced_warhead_design`

## 2. CICLO DE VIDA DO ARMAMENTO

A lógica está dividida em três fases persistentes:

1. **Pesquisa (R&D)**: Cada classe de míssil requer um tempo de calibração (`researchTime`). Uma vez concluído, o esquema é guardado permanentemente.
2. **Fabricação**: Consome recursos reais (`IRON`, `TITANIUM`, `RUC`). A fabricação é bloqueada até que a pesquisa esteja concluída.
3. **Armazenamento**: Os estoques são geridos localmente e exibidos na **Artillery HUD Console**.

## 3. LÓGICA DE INTERCEÇÃO AUTOMÁTICA (SIMULAÇÃO)

O módulo `MissileSimulation.js` gere a defesa automatizada:

- **Alcance de Disparo**: 450px de raio em torno da estação.
- **Prioridade de Munição**: O sistema escolhe automaticamente o míssil mais forte disponível que esteja em modo **AUTO ON**.
  - *Ordem de Seleção*: MK5 > MK4 > MK3 > MK2 > MK1.
- **Deteção de Ameaça**: Inimigos aparecem a cada 15 segundos. Se atingirem o perímetro de 100px, causam dano direto à integridade da estação (150 de dano por impacto).
- **Consumo**: Cada disparo deduz instantaneamente a unidade do inventário e atualiza a interface.

## 4. ARSENAL DISPONÍVEL (MATRIZ DE DADOS)

| Míssil | Função Tática | Dano (GJ) | Velocidade |
| :--- | :--- | :--- | :--- |
| **MK1 Pulse** | Anti-Fighter | 60 | 6.0 |
| **MK2 Vesta** | Precision Interceptor | 90 | 12.0 |
| **MK3 Typhon** | Anti-Fleet (Area) | 250 | 8.0 |
| **MK4 Hyperion** | Heavy Breach | 650 | 5.0 |
| **MK5 Zeus** | Strategic EMP | 1200 | 7.0 |
| **MK-X Voyager** | Strategic Annihilation | 4500 | 25.0 |

## 5. ATAQUE ESTRATÉGICO (MK-X VOYAGER)

O míssil **MK-X** possui uma lógica única integrada no `MapModule.js`:

- Não é disparado automaticamente pela defesa.
- Requer seleção manual de um sistema no **Mapa Estelar**.
- Inicia um trânsito inter-sistémico com animação de trajetória e confirmação de impacto estratégico.

A lógica está 100% funcional e integrada entre o `WeaponsModule`, `MissileSimulation` e `MapModule`.
