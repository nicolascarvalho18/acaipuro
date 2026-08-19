import type { StoreConfig } from '../types';

export const STORE_CONFIG: StoreConfig = {
  storeName: "Açaí Puro Sabor",
  tagline: "Açaí artesanal preparado na hora com acompanhamentos selecionados.",
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
    fullAddress: "Consulte a disponibilidade de entrega para o seu endereço"
  },
  mapsUrl: "https://maps.google.com",
  openingHours: {
    weekdays: "Segunda a Sexta: 13h às 23h",
    weekend: "Sábados, Domingos e Feriados: 13h às 23h",
    hoursSummary: "Todos os dias • 13h às 23h",
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
    text: "Entrega em 30 a 45 minutos • Consulte a disponibilidade para sua região",
    badgeText: ""
  }
};
