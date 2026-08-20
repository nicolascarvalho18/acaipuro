import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { LeafletMap } from '../delivery/LeafletMap';
import { fetchDeliveryDrivers, fetchDriverAssignments } from '../../services/deliveryService';
import {
  Navigation,
  Bike,
  MapPin,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  User,
  ExternalLink,
  Radio,
  AlertTriangle
} from 'lucide-react';

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  vehicle_plate?: string;
  availability_status: 'available' | 'busy' | 'offline';
  last_latitude?: number;
  last_longitude?: number;
  last_accuracy?: number;
  last_location_at?: string;
}

interface ActiveDelivery {
  id: string;
  order_number: string;
  status: string;
  delivery_fee: number;
  driver?: DriverItem;
  order?: {
    customer_name: string;
    customer_phone?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    total: number;
  };
  created_at: string;
  accepted_at?: string;
}

export const AdminLiveDeliveries: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<ActiveDelivery | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveDeliveries = useCallback(async () => {
    try {
      const [driversList, assignmentsList] = await Promise.all([
        fetchDeliveryDrivers(),
        fetchDriverAssignments(),
      ]);

      if (Array.isArray(driversList)) {
        setDrivers(driversList);
      }

      if (Array.isArray(assignmentsList)) {
        setDeliveries(assignmentsList);
      }
    } catch (e) {
      console.warn('Error fetching live deliveries:', e);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchLiveDeliveries().finally(() => setIsLoading(false));
    const interval = setInterval(fetchLiveDeliveries, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveDeliveries]);

  // Entregador selecionado ou primeiro entregador em trânsito
  const activeDriver = selectedDelivery?.driver || drivers.find(d => d.availability_status === 'busy' || d.last_latitude);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      
      {/* Topo do Módulo */}
      <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#28242A]">Entregas em Tempo Real</h3>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 animate-pulse">
              <Radio className="w-3 h-3 text-emerald-500" />
              <span>LIVE GPS</span>
            </span>
          </div>
          <p className="text-xs text-[#726C74]">Acompanhe no mapa a posição exata de cada entregador e o trajeto até o cliente</p>
        </div>

        <button
          onClick={fetchLiveDeliveries}
          className="px-3.5 py-2 bg-purple-50 text-[#69318A] hover:bg-purple-100 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Mapa</span>
        </button>
      </div>

      {/* Grid Principal: Mapa e Painel Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mapa Interativo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-3">
            <LeafletMap
              height="440px"
              storeLocation={{ lat: -23.9618, lng: -46.3322, label: 'Açaí Puro Sabor (Santos)' }}
              driverLocation={activeDriver?.last_latitude && activeDriver?.last_longitude ? {
                name: activeDriver.name,
                vehicleType: activeDriver.vehicle_type,
                vehiclePlate: activeDriver.vehicle_plate,
                lat: activeDriver.last_latitude,
                lng: activeDriver.last_longitude,
                updatedAt: activeDriver.last_location_at,
              } : undefined}
              destinationLocation={selectedDelivery?.order?.neighborhood ? {
                lat: -23.9680,
                lng: -46.3260,
                label: selectedDelivery.order.street || selectedDelivery.order.neighborhood,
              } : undefined}
              showRoute={true}
            />

            {/* Legenda do Mapa */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-[#ECE8F0] text-[#726C74]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#69318A]" />
                  <span>Loja (Santos)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <span>Entregador em Movimento</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-600" />
                  <span>Destino do Cliente</span>
                </div>
              </div>

              {activeDriver?.last_location_at && (
                <span className="text-[11px]">
                  Última posição: {new Date(activeDriver.last_location_at).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          {/* Cards de Entregadores */}
          <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Entregadores Cadastrados</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {drivers.map(drv => (
                <div
                  key={drv.id}
                  className="p-3.5 rounded-2xl border border-[#ECE8F0] bg-[#FCFAF7] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#28242A]">{drv.name}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      drv.availability_status === 'available'
                        ? 'bg-emerald-100 text-emerald-800'
                        : drv.availability_status === 'busy'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-200 text-gray-700'
                    }`}>
                      {drv.availability_status === 'available' ? 'Disponível' : drv.availability_status === 'busy' ? 'Em corrida' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-[#726C74] text-[11px]">
                    {drv.vehicle_type === 'bicycle' ? '🚲 Bicicleta' : `🏍️ Moto ${drv.vehicle_plate ? `(${drv.vehicle_plate})` : ''}`}
                  </p>
                  {drv.last_location_at && (
                    <p className="text-[10px] text-[#69318A]">
                      GPS: {drv.last_latitude?.toFixed(4)}, {drv.last_longitude?.toFixed(4)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel Lateral: Corridas Ativas */}
        <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECE8F0]">
              <h4 className="text-xs font-bold text-[#726C74] uppercase tracking-wider">Corridas & Entregas</h4>
              <span className="text-xs font-bold text-[#69318A]">{deliveries.length} ativas</span>
            </div>

            {/* Filtros */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'offered', label: 'Aguardando' },
                { id: 'in_transit', label: 'Em Trânsito' },
                { id: 'delivered', label: 'Entregues' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-[#69318A] text-white'
                      : 'bg-[#FCFAF7] text-[#726C74] hover:bg-[#F3EDF6]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Lista de Corridas */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {deliveries.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#726C74] space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-purple-300" />
                  <p>Nenhuma corrida ativa no momento</p>
                </div>
              ) : (
                deliveries
                  .filter(d => statusFilter === 'all' || d.status === statusFilter)
                  .map(delivery => {
                    const isSelected = selectedDelivery?.id === delivery.id;
                    return (
                      <div
                        key={delivery.id}
                        onClick={() => setSelectedDelivery(delivery)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-xs ${
                          isSelected
                            ? 'border-[#69318A] bg-purple-50/40 shadow-sm ring-1 ring-[#69318A]'
                            : 'border-[#ECE8F0] bg-[#FCFAF7] hover:border-purple-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#28242A]">Pedido #{delivery.order_number}</span>
                          <span className="font-extrabold text-[#69318A]">{formatCurrency(delivery.delivery_fee || 5.00)}</span>
                        </div>

                        <div className="text-[11px] text-[#726C74] space-y-0.5">
                          <p><strong>Entregador:</strong> {delivery.driver?.name || 'Aguardando aceite...'}</p>
                          <p><strong>Status:</strong> {delivery.status}</p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
