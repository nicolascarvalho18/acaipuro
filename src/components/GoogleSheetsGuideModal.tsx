import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';

interface GoogleSheetsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnlineSource: boolean;
  onRefreshProducts?: () => void;
}

export const GoogleSheetsGuideModal: React.FC<GoogleSheetsGuideModalProps> = ({
  isOpen,
  onClose,
  isOnlineSource,
  onRefreshProducts
}) => {
  const [copiedHeader, setCopiedHeader] = useState(false);

  if (!isOpen) return null;

  const csvHeadersExample = "id,nome,descricao,categoria,preco,preco_promocional,imagem,disponivel,destaque,promocao,mais_vendido,selo,personalizavel,limite_adicionais_gratis";

  const handleCopyHeaders = () => {
    navigator.clipboard.writeText(csvHeadersExample);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-purple-100 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Topo */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B0938] via-[#3D0C5A] to-[#4A0E69] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-['Outfit']">Gerenciamento do Cardápio</h2>
              <p className="text-xs text-purple-200">Como atualizar preços e itens via Google Sheets</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Fechar guia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm text-gray-700">
          
          {/* Status Atual do Cardápio */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isOnlineSource 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-purple-50 border-purple-200 text-purple-950'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isOnlineSource ? 'bg-emerald-200 text-emerald-800' : 'bg-purple-200 text-purple-800'
              }`}>
                {isOnlineSource ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold">
                  {isOnlineSource ? 'Cardápio conectado ao Google Sheets' : 'Cardápio Local de Alta Performance'}
                </p>
                <p className="text-[11px] opacity-80">
                  {isOnlineSource 
                    ? 'Seus produtos estão sendo carregados em tempo real da sua planilha.' 
                    : 'Os produtos estão carregando a partir do catálogo nativo em src/data/mockProducts.ts.'}
                </p>
              </div>
            </div>

            {onRefreshProducts && (
              <button
                onClick={onRefreshProducts}
                className="px-3 py-1.5 bg-white text-purple-900 hover:bg-purple-100 rounded-xl border border-purple-200 font-bold text-xs shrink-0 cursor-pointer shadow-xs"
              >
                Recarregar
              </button>
            )}
          </div>

          {/* Passo a Passo */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#2B0938] uppercase tracking-wider font-['Outfit']">
              Como conectar sua própria planilha em 4 passos:
            </h3>

            <div className="space-y-2.5">
              
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#3D0C5A] text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-bold text-gray-900">Crie uma planilha no Google Sheets</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Coloque as colunas na primeira linha (linha de cabeçalho).
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#3D0C5A] text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-bold text-gray-900">Publique a planilha na Web como CSV</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    No Google Sheets, clique em <strong>Arquivo → Compartilhar → Publicar na Web</strong>. Selecione <strong>Valores separados por vírgula (.csv)</strong> e clique em <strong>Publicar</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#3D0C5A] text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-bold text-gray-900">Cole o link gerado no arquivo de configuração</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Abra o arquivo <code className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-mono">src/config/storeConfig.ts</code> e cole a URL no campo <code className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-mono">googleSheetCsvUrl</code>.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#3D0C5A] text-white font-bold text-xs flex items-center justify-center shrink-0">4</span>
                <div>
                  <p className="font-bold text-gray-900">Pronto! Edição 100% autônoma</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Ao alterar preços, fotos ou itens na sua planilha, o site atualizará os produtos automaticamente para seus clientes.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Cabeçalho CSV para Copiar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                Colunas Recomendadas da Planilha:
              </span>
              <button
                type="button"
                onClick={handleCopyHeaders}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-[11px] rounded-lg border border-purple-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedHeader ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHeader ? 'Copiado!' : 'Copiar Colunas'}</span>
              </button>
            </div>

            <pre className="p-3 bg-gray-900 text-purple-300 rounded-2xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap select-all">
              {csvHeadersExample}
            </pre>
          </div>

          {/* Segurança */}
          <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Segurança e Privacidade</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                A planilha é utilizada em modo <strong>somente leitura</strong>. Nenhuma senha, token privado ou chave confidencial é exposta no código front-end.
              </p>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#3D0C5A] hover:bg-[#2B0938] text-white font-bold text-xs rounded-2xl transition-colors cursor-pointer"
          >
            Entendi, fechar
          </button>
        </div>

      </div>
    </div>
  );
};
