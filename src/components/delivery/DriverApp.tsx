import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { LeafletMap } from './LeafletMap';
import { supabase } from '../../services/supabaseClient';
import { 
  fetchDriverAssignments, 
  sendDriverLocation, 
  loginDriver, 
  updateDeliveryStatus 
} from '../../services/deliveryService';
import {
  Navigation,
  CheckCircle2,
  Bike,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Check,
  X
} from 'lucide-react';

interface DriverData {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  vehicle_plate?: string;
  availability_status: 'available' | 'busy' | 'offline';
}

interface DeliveryOffer {
  id: string;
  order_number: string;
  delivery_fee: number;
  status: string;
  order?: {
    customer_name: string;
    customer_phone?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    total: number;
    items?: any[];
  };
  created_at: string;
}

// Bairros de Santos e coordenadas aproximadas para geocodificação
const SANTOS_COORDS: Record<string, { lat: number; lng: number }> = {
  'Gonzaga': { lat: -23.9660, lng: -46.3340 },
  'Boqueirão': { lat: -23.9680, lng: -46.3260 },
  'Embaré': { lat: -23.9720, lng: -46.3150 },
  'Ponta da Praia': { lat: -23.9850, lng: -46.3000 },
  'Aparecida': { lat: -23.9750, lng: -46.3100 },
  'Campo Grande': { lat: -23.9550, lng: -46.3400 },
  'Marapé': { lat: -23.9600, lng: -46.3500 },
  'Encruzilhada': { lat: -23.9500, lng: -46.3300 },
  'Vila Mathias': { lat: -23.9450, lng: -46.3280 },
  'Centro': { lat: -23.9350, lng: -46.3250 },
};

export const DriverApp: React.FC<{ onBackToSite?: () => void }> = ({ onBackToSite }) => {
  const [driver, setDriver] = useState<DriverData | null>(() => {
    try {
      const saved = localStorage.getItem('acai_driver_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [phoneInput, setPhoneInput] = useState('(13) 99111-2222');
  const [pinInput, setPinInput] = useState('1234');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [offers, setOffers] = useState<DeliveryOffer[]>([]);
  const [activeRun, setActiveRun] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // GPS em Tempo Real
  const [gpsActive, setGpsActive] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastGpsSentAt, setLastGpsSentAt] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const gpsIntervalRef = useRef<any>(null);

  // 1. Carregar ofertas e corrida ativa
  const fetchDriverData = useCallback(async () => {
    if (!driver) return;
    try {
      const assignments = await fetchDriverAssignments(driver.id);
      if (Array.isArray(assignments)) {
        // Encontrar corrida ativa do motorista
        const active = assignments.find((a: any) => 
          a.driver_id === driver.id && ['accepted', 'going_to_store', 'at_store', 'picked_up', 'in_transit'].includes(a.status)
        );
        setActiveRun(active || null);

        // Filtrar ofertas disponíveis abertas
        const openOffers = assignments.filter((a: any) => a.status === 'offered' && !a.driver_id);
        setOffers(openOffers);
      }
    } catch (e) {
      console.warn('Error fetching driver data:', e);
    }
  }, [driver]);

  useEffect(() => {
    if (driver) {
      fetchDriverData();
      const interval = setInterval(fetchDriverData, 4000);
      return () => clearInterval(interval);
    }
  }, [driver, fetchDriverData]);

  // 2. Rastreamento GPS com Geolocation API
  const sendLocationToBackend = useCallback(async (lat: number, lng: number, accuracy?: number) => {
    if (!driver) return;
    try {
      await sendDriverLocation(driver.id, lat, lng, accuracy, activeRun?.id);
      setLastGpsSentAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      console.warn('GPS send error:', e);
    }
  }, [driver, activeRun]);

  useEffect(() => {
    if (!driver || !gpsActive) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocalização não suportada neste aparelho');
      return;
    }

    // Obter posição e observar mudanças
    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setCurrentCoords({ lat: latitude, lng: longitude, accuracy });
      setGpsError(null);
      sendLocationToBackend(latitude, longitude, accuracy);
    };

    const handleError = (err: GeolocationPositionError) => {
      setGpsError(err.message || 'Permissão de localização negada');
      // Fallback para coordenadas da loja em Santos para não quebrar o visual
      if (!currentCoords) {
        setCurrentCoords({ lat: -23.9618, lng: -46.3322 });
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    });

    // Enviar coordenadas a cada 15s
    gpsIntervalRef.current = setInterval(() => {
      if (currentCoords) {
        sendLocationToBackend(currentCoords.lat, currentCoords.lng, currentCoords.accuracy);
      }
    }, 15000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
    };
  }, [driver, gpsActive, sendLocationToBackend]);

  // 3. Ações do Entregador
  const handleLogin = async (phone: string, pin: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const data = await loginDriver(phone, pin);
      if (data.success && data.driver) {
        setDriver(data.driver);
        localStorage.setItem('acai_driver_session', JSON.stringify(data.driver));
      } else {
        setLoginError(data.error || 'Erro ao realizar login');
      }
    } catch {
      setLoginError('Erro de conexão com o servidor');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('acai_driver_session');
    setDriver(null);
    setActiveRun(null);
    setOffers([]);
  };

  const handleToggleAvailability = async (newStatus: 'available' | 'offline') => {
    if (!driver) return;
    try {
      setDriver(prev => prev ? { ...prev, availability_status: newStatus } : null);
      let res = await fetch('/api/delivery/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_availability',
          driverId: driver.id,
          availabilityStatus: newStatus,
        }),
      });
      if (!res.ok) {
        await fetch('/api/delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_availability',
            driverId: driver.id,
            availabilityStatus: newStatus,
          }),
        });
      }
    } catch {}
  };

  const handleAcceptOffer = async (assignment: DeliveryOffer) => {
    if (!driver) return;
    setIsLoading(true);
    try {
      let res = await fetch('/api/delivery/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_offer',
          driverId: driver.id,
          assignmentId: assignment.id,
          orderNumber: assignment.order_number,
        }),
      });
      if (!res.ok) {
        res = await fetch('/api/delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'accept_offer',
            driverId: driver.id,
            assignmentId: assignment.id,
            orderNumber: assignment.order_number,
          }),
        });
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveRun(data.assignment);
        setOffers(prev => prev.filter(o => o.id !== assignment.id));
      } else {
        alert(data.error || 'Não foi possível aceitar a corrida.');
        fetchDriverData();
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRunStatus = async (newStatus: string, reason?: string) => {
    if (!activeRun) return;
    setIsLoading(true);
    try {
      const data = await updateDeliveryStatus(activeRun.id, activeRun.order_number, driver?.id, newStatus, reason);
      if (data && data.success) {
        if (newStatus === 'delivered' || newStatus === 'cancelled') {
          setActiveRun(null);
          setDriver(prev => prev ? { ...prev, availability_status: 'available' } : null);
        } else {
          setActiveRun((prev: any) => ({ ...prev, status: newStatus }));
        }
        fetchDriverData();
      }
    } catch {
      alert('Erro ao atualizar status.');
    } finally {
      setIsLoading(false);
    }
  };

  // Coordenadas de destino do cliente
  const destCoords = activeRun?.order?.neighborhood && SANTOS_COORDS[activeRun.order.neighborhood]
    ? SANTOS_COORDS[activeRun.order.neighborhood]
    : { lat: -23.9680, lng: -46.3260 };

  // =========================================================================
  // TELA DE LOGIN DO ENTREGADOR
  // =========================================================================
  if (!driver) {
    return (
      <div className="min-h-screen bg-[#30143D] text-white flex flex-col justify-between p-5 sm:p-8 font-sans">
        <div className="max-w-md w-full mx-auto space-y-6 pt-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-[#803FA0] text-white flex items-center justify-center mx-auto shadow-lg border border-purple-300/30">
              <Bike className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold font-['DM_Sans']">Portal do Entregador</h1>
            <p className="text-xs text-purple-200">Açaí Puro Sabor • Entregas em Tempo Real</p>
          </div>

          <div className="bg-white text-[#28242A] p-6 rounded-3xl shadow-xl space-y-4 border border-[#ECE8F0]">
            <h2 className="text-sm font-bold text-[#49245B]">Entrar com Telefone e PIN</h2>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {loginError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#726C74] font-bold mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="(13) 99999-9999"
                  className="w-full p-3 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[#726C74] font-bold mb-1">PIN de Acesso (4 dígitos)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="1234"
                  className="w-full p-3 bg-[#FCFAF7] border border-[#ECE8F0] rounded-xl outline-none font-mono font-bold tracking-widest text-center text-base"
                />
              </div>

              <button
                onClick={() => handleLogin(phoneInput, pinInput)}
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-[#69318A] hover:bg-[#572185] text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                <span>Acessar Painel de Entregas</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#ECE8F0] text-[11px] text-[#726C74]">
              <span className="font-bold block mb-1.5 text-[#28242A]">Contas de Demonstração Rápidas:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { setPhoneInput('(13) 99111-2222'); setPinInput('1234'); }}
                  className="p-2 bg-purple-50 hover:bg-purple-100 text-[#69318A] rounded-lg font-semibold text-left"
                >
                  🏍️ Lucas (Moto)
                </button>
                <button
                  onClick={() => { setPhoneInput('(13) 99222-3333'); setPinInput('1234'); }}
                  className="p-2 bg-purple-50 hover:bg-purple-100 text-[#69318A] rounded-lg font-semibold text-left"
                >
                  🚲 Marcos (Bike)
                </button>
              </div>
            </div>
          </div>
        </div>

        {onBackToSite && (
          <div className="text-center pt-4">
            <button onClick={onBackToSite} className="text-xs text-purple-200 hover:text-white underline">
              ← Voltar ao site da Açaí Puro Sabor
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // PAINEL PRINCIPAL DO ENTREGADOR
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8F6FA] text-[#28242A] flex flex-col font-sans">
      
      {/* Topo / Header */}
      <header className="bg-[#30143D] text-white p-4 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#803FA0] flex items-center justify-center font-bold text-white shadow-xs">
            {driver.vehicle_type === 'bicycle' ? <Bike className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">{driver.name}</h1>
            <p className="text-[11px] text-purple-200">
              {driver.vehicle_type === 'bicycle' ? '🚲 Bicicleta' : `🏍️ Moto ${driver.vehicle_plate ? `(${driver.vehicle_plate})` : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status de Disponibilidade */}
          <button
            onClick={() => handleToggleAvailability(driver.availability_status === 'available' ? 'offline' : 'available')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              driver.availability_status === 'available'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/15 text-purple-200 hover:bg-white/25'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${driver.availability_status === 'available' ? 'bg-white animate-pulse' : 'bg-red-400'}`} />
            <span>{driver.availability_status === 'available' ? 'Disponível' : 'Offline'}</span>
          </button>

          <button onClick={handleLogout} className="p-2 rounded-xl bg-white/10 hover:bg-red-600/80 text-white transition-colors" title="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Barra de Status do GPS */}
      <div className="bg-white border-b border-[#ECE8F0] px-4 py-2 text-[11px] flex items-center justify-between text-[#726C74]">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${gpsActive && !gpsError ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          <span>
            {gpsError ? gpsError : gpsActive ? 'GPS Ativo • Compartilhando localização' : 'GPS Pausado'}
          </span>
        </div>
        {lastGpsSentAt && <span>Última posição: {lastGpsSentAt}</span>}
      </div>

      <main className="flex-1 p-4 sm:p-6 max-w-xl w-full mx-auto space-y-4">
        
        {/* CORRIDA ATIVA EM ANDAMENTO */}
        {activeRun ? (
          <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-[#69318A] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE8F0]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-purple-100 text-[#69318A] rounded-xl text-xs font-black">
                  CORRIDA ATIVA
                </span>
                <span className="text-sm font-black text-[#28242A]">#{activeRun.order_number}</span>
              </div>
              <span className="text-sm font-extrabold text-emerald-600 font-['DM_Sans']">
                +{formatCurrency(activeRun.delivery_fee || 5.00)}
              </span>
            </div>

            {/* Mapa da Corrida com Rota Real */}
            <div className="rounded-2xl overflow-hidden shadow-inner">
              <LeafletMap
                height="220px"
                storeLocation={{ lat: -23.9618, lng: -46.3322, label: 'Açaí Puro Sabor (Loja)' }}
                destinationLocation={{
                  lat: destCoords.lat,
                  lng: destCoords.lng,
                  label: activeRun.order?.street || activeRun.order?.neighborhood || 'Destino',
                }}
                driverLocation={currentCoords ? {
                  name: driver.name,
                  vehicleType: driver.vehicle_type,
                  lat: currentCoords.lat,
                  lng: currentCoords.lng,
                } : undefined}
                showRoute={true}
              />
            </div>

            {/* Dados da Entrega */}
            <div className="bg-[#FCFAF7] p-4 rounded-2xl border border-[#ECE8F0] space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
                <span className="text-[#726C74]">Cliente:</span>
                <span className="font-bold text-[#28242A]">{activeRun.order?.customer_name || 'Cliente'}</span>
              </div>

              {activeRun.order?.customer_phone && (
                <div className="flex justify-between items-center pb-2 border-b border-[#ECE8F0]">
                  <span className="text-[#726C74]">Telefone:</span>
                  <a href={`tel:${activeRun.order.customer_phone}`} className="font-bold text-[#69318A] flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{activeRun.order.customer_phone}</span>
                  </a>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[#726C74] block">Endereço de Entrega:</span>
                <p className="font-bold text-[#28242A]">
                  {activeRun.order?.street ? `${activeRun.order.street}, Nº ${activeRun.order.number || 'S/N'}` : 'Endereço informado no pedido'}
                </p>
                <p className="text-[11px] text-[#726C74]">
                  Bairro: {activeRun.order?.neighborhood || 'Santos'} {activeRun.order?.complement ? `(${activeRun.order.complement})` : ''}
                </p>
              </div>

              {/* Botão para abrir no Waze / Google Maps */}
              <div className="pt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${activeRun.order?.street || ''}, ${activeRun.order?.number || ''} - ${activeRun.order?.neighborhood || ''}, Santos - SP`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 border border-blue-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Rota no Google Maps / Waze</span>
                </a>
              </div>
            </div>

            {/* BOTÕES DE PROGRESSÃO DA CORRIDA */}
            <div className="space-y-2 pt-1">
              {activeRun.status === 'accepted' && (
                <button
                  onClick={() => handleUpdateRunStatus('going_to_store')}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#69318A] hover:bg-[#572185] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>1. Indo para a Loja Retirar</span>
                </button>
              )}

              {activeRun.status === 'going_to_store' && (
                <button
                  onClick={() => handleUpdateRunStatus('at_store')}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>2. Cheguei na Loja</span>
                </button>
              )}

              {activeRun.status === 'at_store' && (
                <button
                  onClick={() => handleUpdateRunStatus('picked_up')}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. Pedido Retirado (Iniciar Entrega)</span>
                </button>
              )}

              {(activeRun.status === 'picked_up' || activeRun.status === 'in_transit') && (
                <button
                  onClick={() => handleUpdateRunStatus('delivered')}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>✓ Concluir Entrega (Pedido Entregue)</span>
                </button>
              )}

              <button
                onClick={() => {
                  const reason = prompt('Informe a ocorrência:');
                  if (reason) handleUpdateRunStatus('problem', reason);
                }}
                className="w-full py-2 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl border border-red-200 transition-colors"
              >
                Informar Problema na Entrega
              </button>
            </div>
          </div>
        ) : (
          /* LISTA DE CORRIDAS DISPONÍVEIS */
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#28242A] font-['DM_Sans']">Corridas Disponíveis</h2>
                <p className="text-xs text-[#726C74]">Aceite pedidos prontos para entrega imediata</p>
              </div>
              <button
                onClick={fetchDriverData}
                className="p-2 bg-purple-50 text-[#69318A] hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                title="Atualizar ofertas"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {offers.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-[#ECE8F0] text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-purple-50 text-[#69318A] flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-[#28242A]">Nenhuma corrida disponível no momento</h3>
                <p className="text-xs text-[#726C74] max-w-xs mx-auto">
                  Mantenha-se disponível. Assim que um pedido for confirmado pela loja, ele aparecerá aqui instantaneamente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map(offer => (
                  <div
                    key={offer.id}
                    className="bg-white p-5 rounded-3xl border border-[#ECE8F0] shadow-xs space-y-3 hover:border-[#69318A] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#28242A]">Pedido #{offer.order_number}</span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200">
                        +{formatCurrency(offer.delivery_fee || 5.00)}
                      </span>
                    </div>

                    <div className="text-xs text-[#726C74] space-y-1 bg-[#FCFAF7] p-3 rounded-2xl border border-[#ECE8F0]">
                      <p><strong className="text-[#28242A]">Bairro:</strong> {offer.order?.neighborhood || 'Santos'}</p>
                      <p><strong className="text-[#28242A]">Loja:</strong> Açaí Puro Sabor (Gonzaga)</p>
                    </div>

                    <button
                      onClick={() => handleAcceptOffer(offer)}
                      disabled={isLoading}
                      className="w-full py-3 bg-[#69318A] hover:bg-[#572185] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aceitar Corrida</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
};
