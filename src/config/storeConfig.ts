import type { StoreConfig } from '../types';

export const STORE_CONFIG: StoreConfig = {
  storeName: "Açaí Puro Sabor",
  tagline: "O puro açaí artesanal do Pará, batido na hora com muito amor.",
  phone: "(11) 98765-4321",
  whatsappNumber: "5511987654321", // 55 + DDD + Número sem traços ou espaços
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
  mapsUrl: "https://maps.google.com/?q=Av.+Paulista,+1234+-+Bela+Vista,+São+Paulo+-+SP",
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
    coveredNeighborhoods: [
      "Bela Vista",
      "Consolação",
      "Jardins",
      "Paraíso",
      "Cerqueira César",
      "Aclimação",
      "Liberdade",
      "Vila Mariana"
    ]
  },
  pix: {
    key: "contato@acaipurosabor.com.br",
    keyType: "E-mail",
    receiverName: "Açaiteria Puro Sabor LTDA",
    city: "São Paulo"
  },
  // Opcional: URL pública de planilha Google Sheets em formato CSV
  // Exemplo: https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv
  googleSheetCsvUrl: "",
  announcementBanner: {
    enabled: true,
    text: "🔥 FRETE GRÁTIS em pedidos acima de R$ 45,00 hoje! Aproveite e monte seu açaí!",
    badgeText: "PROMOÇÃO DO DIA"
  }
};
