# 🍧 Açaí Puro Sabor — Landing Page & Cardápio Digital Interativo

Landing page moderna, responsiva, ultra rápida e focada em conversão para açaiterias e deliveries de açaí, com cardápio digital interativo, personalização completa de adicionais, carrinho de compras e finalização direta de pedidos pelo WhatsApp.

Desenvolvido com **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Lucide Icons** e **Canvas Confetti**.

---

## 🚀 Funcionalidades Principais

1. **Identidade Visual Premium e Apetitosa:**
   - Paleta rica com roxo profundo do açaí (`#2B0938`), lilás vibrante (`#9333EA`), rosa berry (`#EC4899`) e verde WhatsApp (`#22C55E`).
   - Tipografia comercial forte com *Plus Jakarta Sans* e *Outfit*.
   - Fotos reais em alta resolução de açaís, frutas frescas, cremes, doces e bebidas.

2. **Cardápio Digital Interativo:**
   - Categorias com navegação horizontal no mobile (*Açaí no Copo & Tigela, Combos & Ofertas, Barcas & Roletas, Bebidas & Smoothies, Sobremesas, Picolés*).
   - Busca em tempo real por nome ou ingrediente com botão de limpar.
   - Selos visuais para *Mais Pedido*, *Oferta Especial*, *Destaque* e *Esgotado*.

3. **Personalizador Completo de Açaí (Modal):**
   - Escolha de tamanho (300ml, 500ml, 700ml, 1 Litro, Barcas).
   - Escolha de base (Tradicional Cremoso, Zero Açúcar Fit, Cupuaçu, Trufado, Pitaya).
   - Contador inteligente de adicionais gratuitos (ex: *3 de 3 grátis selecionados*).
   - Cobrança automática de adicionais extras excedentes (+R$ 2,50, +R$ 4,00, etc.).
   - Campo para observações personalizadas por item.
   - Atualização do valor total em tempo real com microinterações.

4. **Carrinho de Compras Funcional (Drawer & Mobile Bar):**
   - Persistência dos itens no navegador usando `localStorage`.
   - Alternância entre **Entrega (Delivery)** e **Retirada na Loja**.
   - Barra de progresso para **Frete Grátis** (ex: *Faltam R$ 12,00 para frete grátis*).
   - Barra fixa flutuante no mobile para navegação com uma mão.

5. **Finalização do Pedido & WhatsApp:**
   - Identificador único do pedido gerado no momento do envio (`PED-YYYYMMDD-HHMMSS-XXX`).
   - Coleta de dados (Nome, Telefone com máscara, Endereço de entrega ou Retirada).
   - Formas de pagamento: **Pix** (com botão para copiar chave), **Cartão** (Crédito/Débito) e **Dinheiro** (com cálculo de troco).
   - Envio da mensagem estruturada e codificada via `encodeURIComponent` para o WhatsApp da loja.
   - Tela de confirmação com efeito de celebração (confetti) e botão para copiar texto do pedido.

6. **Gerenciamento do Cardápio (Google Sheets ou Local):**
   - Pode ser atualizado em tempo real pelo lojista através de uma planilha Google Sheets publicada em CSV.
   - Catálogo nativo local de alta performance como fallback automático.
   - Sem expor chaves privadas ou tokens no front-end.

---

## 🛠️ Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).

### Passo a passo
1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra o navegador no endereço exibido no terminal (geralmente `http://localhost:5173`).

4. Para gerar a versão de produção:
   ```bash
   npm run build
   ```

---

## ⚙️ Como Configurar a Açaiteria

Toda a personalização da loja está centralizada no arquivo:
👉 `src/config/storeConfig.ts`

```typescript
export const STORE_CONFIG: StoreConfig = {
  storeName: "Açaí Puro Sabor",
  tagline: "O puro açaí artesanal do Pará, batido na hora com muito amor.",
  phone: "(11) 98765-4321",
  whatsappNumber: "5511987654321", // 55 + DDD + Número (Apenas números)
  whatsappFormatted: "(11) 98765-4321",
  instagram: "@acaipurosabor.oficial",
  
  address: {
    street: "Av. Paulista",
    number: "1234",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310-100",
    fullAddress: "Av. Paulista, 1234 - Bela Vista, São Paulo - SP"
  },
  
  openingHours: {
    weekdays: "Segunda a Sexta: 13h às 23h",
    weekend: "Sábado, Domingo e Feriados: 12h às 23h30",
    hoursSummary: "Terça a Domingo • 13h às 23h",
    startHour: 13,
    endHour: 23
  },
  
  delivery: {
    defaultFee: 5.00,
    freeDeliveryThreshold: 45.00,
    estimatedTime: "30-45 min",
    coveredNeighborhoods: ["Bela Vista", "Consolação", "Jardins", "Paraíso"]
  },
  
  pix: {
    key: "contato@acaipurosabor.com.br",
    keyType: "E-mail",
    receiverName: "Açaiteria Puro Sabor LTDA",
    city: "São Paulo"
  },

  // Link público do Google Sheets publicado como CSV (opcional)
  googleSheetCsvUrl: ""
};
```

---

## 📊 Como Conectar uma Planilha do Google Sheets

Se o dono da loja quiser alterar produtos, preços e fotos sem mexer no código:

1. Crie uma planilha no **Google Sheets** com as seguintes colunas na 1ª linha:
   ```csv
   id,nome,descricao,categoria,preco,preco_promocional,imagem,disponivel,destaque,promocao,mais_vendido,selo,personalizavel,limite_adicionais_gratis
   ```
2. No menu do Google Sheets, clique em:
   **Arquivo → Compartilhar → Publicar na Web**
3. Selecione o formato **Valores separados por vírgula (.csv)** e clique em **Publicar**.
4. Copie o link gerado e cole no campo `googleSheetCsvUrl` em `src/config/storeConfig.ts`.

O site passará a carregar os produtos diretamente da planilha! Se a planilha estiver vazia ou offline, o site carregará automaticamente o cardápio local de fallback sem quebrar a experiência do cliente.

---

## 📦 Como Publicar na Web

### Vercel (Recomendado)
1. Crie uma conta gratuita em [vercel.com](https://vercel.com).
2. Conecte seu repositório Git ou envie a pasta do projeto.
3. A Vercel detectará automaticamente o Vite. Clique em **Deploy**.

### Netlify
1. Crie uma conta em [netlify.com](https://netlify.com).
2. Arraste a pasta `dist` gerada após executar `npm run build` ou conecte ao repositório GitHub.

---

## 📁 Estrutura de Arquivos

```
src/
  ├── components/          # Componentes visuais e interativos
  │   ├── AnnouncementBar.tsx
  │   ├── CategoryFilter.tsx
  │   ├── CartDrawer.tsx
  │   ├── CheckoutModal.tsx
  │   ├── ContactSection.tsx
  │   ├── Diferenciais.tsx
  │   ├── FloatingCartBar.tsx
  │   ├── Footer.tsx
  │   ├── GoogleSheetsGuideModal.tsx
  │   ├── Header.tsx
  │   ├── Hero.tsx
  │   ├── Icons.tsx
  │   ├── ProductCard.tsx
  │   ├── ProductModal.tsx
  │   ├── Promotions.tsx
  │   ├── Testimonials.tsx
  │   └── ToastNotification.tsx
  ├── config/              # Configurações centralizadas da loja
  │   └── storeConfig.ts
  ├── contexts/            # Estado global (Carrinho, Checkout, Modais)
  │   └── CartContext.tsx
  ├── data/                # Produtos, tamanhos, adicionais e depoimentos
  │   └── mockProducts.ts
  ├── services/            # Leitor de Google Sheets e fallback
  │   └── menuService.ts
  ├── types/               # Tipos TypeScript
  │   └── index.ts
  ├── utils/               # Formatadores de moeda, WhatsApp e Order ID
  │   └── formatters.ts
  ├── App.tsx
  ├── index.css
  └── main.tsx
```

---

## ⚖️ Licença e Uso

Desenvolvido para uso comercial em açaiterias, sorveterias e deliveries. Pronto para produção e customização.
