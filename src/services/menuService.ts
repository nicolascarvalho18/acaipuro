import type { Product, ProductCategory, AdditionalItem } from '../types';
import { INITIAL_PRODUCTS, ALL_ADDITIONALS, DEFAULT_SIZES, BASE_OPTIONS } from '../data/mockProducts';
import { STORE_CONFIG } from '../config/storeConfig';

/**
 * Converte linhas de CSV em objetos Product
 */
export function parseGoogleSheetsCsv(csvText: string): Product[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Cabeçalho da planilha
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const products: Product[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Parser simples de CSV respeitando aspas
    const row = parseCsvRow(lines[i]);
    if (!row || row.length === 0) continue;

    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index] ? row[index].trim() : '';
    });

    if (!rowData['nome'] && !rowData['name']) continue;

    const name = rowData['nome'] || rowData['name'] || 'Produto sem nome';
    const id = rowData['id'] || rowData['identificador'] || `prod_${i}`;
    const description = rowData['descricao'] || rowData['description'] || '';
    const category = (rowData['categoria'] || rowData['category'] || 'acai').toLowerCase() as ProductCategory;
    const price = parseFloat((rowData['preco'] || rowData['price'] || '0').replace(',', '.')) || 0;
    const promoPrice = rowData['preco_promocional'] || rowData['promotional_price'] 
      ? parseFloat((rowData['preco_promocional'] || rowData['promotional_price']).replace(',', '.')) 
      : undefined;
    const image = rowData['imagem'] || rowData['image_url'] || 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80';
    const isAvailable = rowData['disponivel'] !== '0' && rowData['disponivel'] !== 'false' && rowData['available'] !== 'false';
    const isFeatured = rowData['destaque'] === '1' || rowData['destaque'] === 'true' || rowData['featured'] === 'true';
    const isPromotion = rowData['promocao'] === '1' || rowData['promocao'] === 'true' || !!promoPrice;
    const isBestSeller = rowData['mais_vendido'] === '1' || rowData['mais_vendido'] === 'true';
    const badge = rowData['selo'] || rowData['badge'] || undefined;
    const allowsCustomization = rowData['personalizavel'] !== '0' && rowData['personalizavel'] !== 'false';
    const maxFreeAdditionals = rowData['limite_adicionais_gratis'] ? parseInt(rowData['limite_adicionais_gratis'], 10) : 3;

    products.push({
      id,
      name,
      description,
      category: ['all', 'acai', 'combos', 'barcas', 'bebidas', 'sobremesas', 'picoles'].includes(category) ? category : 'acai',
      price,
      promotionalPrice: promoPrice && promoPrice < price ? promoPrice : undefined,
      image,
      isAvailable,
      isFeatured,
      isBestSeller,
      isPromotion,
      badge,
      sizes: category === 'acai' ? DEFAULT_SIZES : undefined,
      bases: category === 'acai' ? BASE_OPTIONS : undefined,
      allowsCustomization,
      maxFreeAdditionals,
      displayOrder: i,
    });
  }

  return products;
}

function parseCsvRow(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Busca os produtos da planilha do Google Sheets ou retorna a base mockada
 */
export async function fetchProducts(): Promise<{ products: Product[]; isFromGoogleSheets: boolean; error?: string }> {
  const url = STORE_CONFIG.googleSheetCsvUrl;

  if (!url || !url.trim().startsWith('http')) {
    return {
      products: INITIAL_PRODUCTS,
      isFromGoogleSheets: false,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv, text/plain, */*'
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const parsed = parseGoogleSheetsCsv(csvText);

    if (parsed.length > 0) {
      return {
        products: parsed,
        isFromGoogleSheets: true,
      };
    } else {
      return {
        products: INITIAL_PRODUCTS,
        isFromGoogleSheets: false,
        error: 'Planilha lida com sucesso, mas nenhum produto válido foi encontrado. Usando cardápio local.',
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha ao conectar com o Google Sheets';
    console.warn('Usando produtos locais devido a erro no Google Sheets:', errorMsg);
    return {
      products: INITIAL_PRODUCTS,
      isFromGoogleSheets: false,
      error: `Não foi possível carregar a planilha online (${errorMsg}). O cardápio local foi carregado normalmente.`,
    };
  }
}

export function getAdditionals(): AdditionalItem[] {
  return ALL_ADDITIONALS;
}
