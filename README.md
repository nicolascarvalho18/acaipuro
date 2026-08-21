# Açaí Puro Sabor — Sistema Completo de Pedidos em Tempo Real

Sistema Full Stack de delivery e autoatendimento para açaiterias e sorveterias, integrando cardápio digital interativo para o cliente, painel de gestão operacional de cozinha em tempo real e aplicativo web para entregadores com rastreamento GPS.

---

## 🎯 Principais Funcionalidades

### 1. Cardápio Digital & Checkout do Cliente
- **Personalização de Copos & Tigelas:** Seleção de tamanhos (300ml a 1L, barcas), bases artesanais e adicionais com cálculo automático de valores.
- **Carrinho & Modos de Atendimento:** Alternância entre **Entrega em Domicílio** e **Retirada no Balcão**.
- **Checkout Seguro:** Validação de loja aberta/fechada, cálculo de frete por taxa/distância e geração de número de pedido exclusivo (`#PED-XXXX`).
- **Acompanhamento em Tempo Real:** Tela de rastreamento com status atualizado automaticamente e mapa ao vivo com a rota do entregador.

### 2. Painel de Atendimento & Gestão da Loja (`/admin/pedidos`)
- **Gestão de Pedidos em Tempo Real:**
  - **Novos:** Pedidos pendentes com alerta sonoro e visual pulsante.
  - **Em preparo:** Cozinha e montagem com impressão de comanda térmica 80mm.
  - **Em entrega:** Pedidos despachados para os motoboys com painel de entregadores ativos.
  - **Prontos para retirada:** Pedidos aguardando o cliente no balcão.
  - **Concluídos:** Pedidos entregues e computados no financeiro diário.
  - **Cancelados:** Registro do motivo de cancelamento com histórico para o lojista e cliente.
  - **Todos do dia:** Visão geral da operação do dia atual (reinicia visualmente a cada novo dia, mantendo todo o histórico seguro no banco).
- **Ações Rápidas:** Aceite direto para preparo, despacho de entregador, atalho para WhatsApp do cliente e cancelamento com motivos pré-definidos.
- **Filtros e Exportação:** Busca por cliente, pedido, telefone ou bairro; filtro por período (*Hoje*, *Ontem*, *7 dias*, *Todos*) e botão para exportar relatórios em formato CSV.
- **Gestão do Cardápio:** Edição rápida de produtos, preços, adicionais, combos e controle de estoque.
- **Controle de Caixa & Financeiro:** Abertura, fechamento diário, sangrias e suprimentos.

### 3. Aplicativo do Entregador (`/entregador`)
- Login rápido por telefone e PIN.
- Notificação e aceite de novas corridas de delivery.
- Envio contínuo de coordenadas de geolocalização (Live GPS) durante a rota até o cliente.
- Confirmação de entrega finalizando automaticamente a comanda no painel administrativo.

---

## 📁 Estrutura de Pastas do Projeto

```text
├── api/                       # Funções Serverless (Vercel Backend API)
│   ├── _services/             # Camada de serviços unificada
│   │   ├── db.ts              # Persistência no banco de dados (Supabase + Fallback seguro)
│   │   └── whatsapp.ts        # Integração com API WhatsApp Cloud da Meta
│   ├── delivery/              # Endpoints de entregadores e corridas
│   │   ├── assign.ts          # Atribuição de corrida a um entregador
│   │   ├── drivers.ts         # Listagem e disponibilidade dos entregadores
│   │   ├── location.ts        # Transmissão de GPS do entregador
│   │   └── status.ts          # Atualização de status da entrega
│   ├── orders/                # Endpoints de pedidos
│   │   ├── index.ts           # Criação (POST) e listagem (GET) de pedidos
│   │   ├── update-status.ts   # Atualização atômica de status do pedido
│   │   ├── tracking.ts        # Consulta de rastreamento do cliente
│   │   └── notify.ts          # Disparo de notificações
│   ├── catalog.ts             # Gestão de produtos e configurações da loja
│   ├── cash-register.ts       # Controle de sessões e movimentações de caixa
│   └── diagnostic.ts          # Diagnóstico de integridade do sistema
│
├── src/                       # Frontend (React 19 + TypeScript + Tailwind)
│   ├── components/            # Componentes reutilizáveis de interface
│   │   ├── admin/             # Módulos do painel administrativo
│   │   │   ├── AdminDashboard.tsx      # Painel operacional principal de pedidos
│   │   │   ├── AdminLiveDeliveries.tsx # Mapa GPS ao vivo dos entregadores
│   │   │   └── AdminLogin.tsx          # Tela de login do lojista
│   │   ├── delivery/          # Módulo do entregador
│   │   │   ├── DriverApp.tsx           # PWA do entregador para aceitar e realizar entregas
│   │   │   └── LeafletMap.tsx          # Renderização de mapas com rota
│   │   ├── Header.tsx         # Cabeçalho da loja com status de funcionamento
│   │   ├── ProductCard.tsx    # Card de produto do cardápio
│   │   ├── ProductModal.tsx   # Modal de montagem e adicionais do açaí
│   │   ├── CartDrawer.tsx     # Gaveta lateral do carrinho de compras
│   │   ├── CheckoutModal.tsx  # Finalização do pedido
│   │   └── OrderTrackingModal.tsx # Acompanhamento do pedido pelo cliente
│   ├── contexts/              # Provedores de estado global
│   │   ├── CartContext.tsx    # Gerenciamento de itens e carrinho
│   │   └── StoreContext.tsx   # Status da loja, catálogo e configurações
│   ├── services/              # Clientes de comunicação com a API
│   │   ├── orderService.ts    # Operações de pedidos e status
│   │   ├── deliveryService.ts # Operações de entregadores e corridas
│   │   ├── menuService.ts     # Carregamento de cardápio
│   │   └── supabaseClient.ts  # Cliente Supabase e conexão realtime
│   ├── types/                 # Definições de tipagem TypeScript
│   ├── utils/                 # Formatadores de moeda, telefone e datas
│   ├── App.tsx                # Roteamento principal do frontend
│   └── main.tsx               # Ponto de entrada da aplicação
│
├── supabase/                  # Estrutura do Banco de Dados
│   └── schema.sql             # Script SQL de criação das tabelas e índices
│
├── public/                    # Ativos estáticos e sons de notificação
├── package.json               # Dependências do projeto
└── vite.config.ts             # Configuração do bundler Vite
```

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide React, Leaflet (Mapas GPS).
- **Backend:** Node.js, Vercel Serverless Functions.
- **Banco de Dados:** Supabase (PostgreSQL) com suporte a Realtime.
- **Comunicação:** WhatsApp Meta Cloud API, Web Audio API (alertas de pedidos).

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/nicolascarvalho18/acaipuro.git
cd acaipuro
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Executar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173` no navegador.

### 4. Compilar para produção
```bash
npm run build
```

---

## ⚙️ Variáveis de Ambiente (Opcional)

Para conectar um banco de dados Supabase próprio e integrações externas, configure as seguintes variáveis no arquivo `.env.local` ou no painel da Vercel:

```env
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
SUPABASE_ANON_KEY=eyJhbGciOi...
STORE_WHATSAPP_NUMBER=5513991509733
ADMIN_PASSWORD=admin123
```

---

## 🔒 Acesso às Rotas do Sistema

- **Cardápio Online do Cliente:** `/`
- **Painel de Pedidos em Tempo Real:** `/admin/pedidos` *(Senha padrão: `admin123`)*
- **App do Entregador:** `/entregador` *(PIN padrão: `1234`)*
