import type { StoreConfig } from '../types';

export const STORE_CONFIG: StoreConfig = {
  storeName: "Açaí Puro Sabor",
  tagline: "Açaí preparado na hora, com os acompanhamentos que você escolher.",
  phone: "(13) 99150-9733",
  whatsappNumber: "5513991509733", // WhatsApp oficial da loja
  whatsappFormatted: "(13) 99150-9733",
  instagram: "@acaipurosabor",
  address: {
    street: "Atendimento Delivery e Retirada",
    number: "",
    neighborhood: "Centro e Região",
    city: "Baixada Santista",
    state: "SP",
    zipCode: "",
    fullAddress: "Atendimento Delivery na Baixada Santista e Retirada"
  },
  mapsUrl: "https://maps.google.com",
  openingHours: {
    weekdays: "Todos os dias das 13h às 23h",
    weekend: "Todos os dias das 13h às 23h",
    hoursSummary: "Todos os dias das 13h às 23h",
    startHour: 13,
    endHour: 23
  },
  delivery: {
    defaultFee: 5.00,
    freeDeliveryThreshold: 45.00,
    estimatedTime: "30 a 45 minutos",
    coveredNeighborhoods: [
      "Centro",
      "Gonzaga",
      "Boqueirão",
      "Embaré",
      "Ponta da Praia",
      "Aparecida",
      "Campo Grande",
      "Marapé"
    ]
  },
  pix: {
    key: "",
    keyType: "WhatsApp",
    receiverName: "Açaí Puro Sabor",
    city: ""
  },
  googleSheetCsvUrl: "",
  announcementBanner: {
    enabled: true,
    text: "Entrega em 30 a 45 minutos • Atendimento todos os dias das 13h às 23h",
    badgeText: ""
  }
};
