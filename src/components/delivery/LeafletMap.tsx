import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface LocationCoord {
  lat: number;
  lng: number;
  label?: string;
}

export interface DriverInfoMap {
  name: string;
  vehicleType?: 'motorcycle' | 'bicycle' | 'car';
  vehiclePlate?: string;
  lat: number;
  lng: number;
  heading?: number;
  updatedAt?: string;
}

interface LeafletMapProps {
  storeLocation?: LocationCoord;
  destinationLocation?: LocationCoord;
  driverLocation?: DriverInfoMap;
  height?: string;
  showRoute?: boolean;
  onRouteCalculated?: (distanceKm: number, durationMinutes: number) => void;
  className?: string;
}

// Fallback padrão Santos - SP
const DEFAULT_STORE_COORD: LocationCoord = {
  lat: -23.9618,
  lng: -46.3322,
  label: 'Açaí Puro Sabor',
};

// Ícone customizado da Loja (Roxo)
const createStoreIcon = () => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background: #69318A; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(105, 49, 138, 0.4); border: 2.5px solid #FFFFFF;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #69318A; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [38, 44],
    iconAnchor: [19, 44],
  });
};

// Ícone customizado do Entregador (Moto / Bike)
const createDriverIcon = (vehicleType: string = 'motorcycle', heading: number = 0) => {
  const isBike = vehicleType === 'bicycle';
  const isCar = vehicleType === 'car';
  
  return L.divIcon({
    className: 'custom-driver-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background: #2563EB; color: white; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.5); border: 3px solid #FFFFFF; transform: rotate(${heading}deg); transition: transform 0.4s ease;">
          ${isBike ? `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          ` : isCar ? `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
            </svg>
          ` : `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 17h4V5H2v12h3"/>
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
              <path d="M14 17h1"/>
              <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          `}
        </div>
        <div style="position: absolute; -top: 4px; right: -4px; width: 12px; height: 12px; background: #22C55E; border: 2px solid #FFF; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

// Ícone do Cliente / Destino
const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background: #DC2626; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4); border: 2.5px solid #FFFFFF;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #DC2626; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [36, 41],
    iconAnchor: [18, 41],
  });
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  storeLocation = DEFAULT_STORE_COORD,
  destinationLocation,
  driverLocation,
  height = '320px',
  showRoute = true,
  onRouteCalculated,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

  // Inicializar o Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = driverLocation?.lat || storeLocation?.lat || DEFAULT_STORE_COORD.lat;
    const initialLng = driverLocation?.lng || storeLocation?.lng || DEFAULT_STORE_COORD.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Adicionar camada de mapa limpa (CartoDB Positron / OSM)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Controles de zoom discretos
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Atualizar Marcadores e Rota
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([]);

    // 1. Marcador da Loja
    if (storeLocation) {
      if (!storeMarkerRef.current) {
        storeMarkerRef.current = L.marker([storeLocation.lat, storeLocation.lng], {
          icon: createStoreIcon(),
        }).addTo(map);
        storeMarkerRef.current.bindPopup(`<strong>${storeLocation.label || 'Açaí Puro Sabor'}</strong>`);
      } else {
        storeMarkerRef.current.setLatLng([storeLocation.lat, storeLocation.lng]);
      }
      bounds.extend([storeLocation.lat, storeLocation.lng]);
    }

    // 2. Marcador do Destino
    if (destinationLocation) {
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destinationLocation.lat, destinationLocation.lng], {
          icon: createDestinationIcon(),
        }).addTo(map);
        destMarkerRef.current.bindPopup(`<strong>Destino da Entrega</strong><br/>${destinationLocation.label || ''}`);
      } else {
        destMarkerRef.current.setLatLng([destinationLocation.lat, destinationLocation.lng]);
      }
      bounds.extend([destinationLocation.lat, destinationLocation.lng]);
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // 3. Marcador do Entregador
    if (driverLocation && driverLocation.lat && driverLocation.lng) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], {
          icon: createDriverIcon(driverLocation.vehicleType, driverLocation.heading || 0),
        }).addTo(map);
        driverMarkerRef.current.bindPopup(`<strong>${driverLocation.name}</strong><br/>Entregador em trânsito`);
      } else {
        // Interpolação de movimento suave
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
        driverMarkerRef.current.setIcon(createDriverIcon(driverLocation.vehicleType, driverLocation.heading || 0));
      }
      bounds.extend([driverLocation.lat, driverLocation.lng]);
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    // Ajustar zoom para enquadrar todos os pontos relevantes
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    // 4. Calcular e Desenhar Rota Real pelas Ruas via OSRM
    if (showRoute) {
      const origin = driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : storeLocation;
      const target = destinationLocation || storeLocation;

      if (origin && target && (origin.lat !== target.lat || origin.lng !== target.lng)) {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${target.lng},${target.lat}?overview=full&geometries=geojson`;

        fetch(osrmUrl)
          .then(res => res.json())
          .then(data => {
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const coords = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

              const distanceKm = Number((route.distance / 1000).toFixed(1));
              const durationMinutes = Math.ceil(route.duration / 60);

              setRouteInfo({ distanceKm, durationMinutes });
              if (onRouteCalculated) {
                onRouteCalculated(distanceKm, durationMinutes);
              }

              if (routePolylineRef.current) {
                routePolylineRef.current.setLatLngs(coords);
              } else {
                routePolylineRef.current = L.polyline(coords, {
                  color: '#69318A',
                  weight: 4.5,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                }).addTo(map);
              }
            }
          })
          .catch(() => {
            // Se o serviço OSRM falhar temporariamente, desenha linha suave
            if (routePolylineRef.current) {
              routePolylineRef.current.setLatLngs([
                [origin.lat, origin.lng],
                [target.lat, target.lng],
              ]);
            }
          });
      }
    }
  }, [storeLocation, destinationLocation, driverLocation, showRoute]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden shadow-inner border border-[#ECE8F0] ${className}`}>
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Cartão Informativo de Previsão sobre o Mapa */}
      {routeInfo && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-xl shadow-md border border-[#ECE8F0] text-xs flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-[#28242A]">
            Chegada em ~{routeInfo.durationMinutes} min
          </span>
          <span className="text-[#726C74]">({routeInfo.distanceKm} km)</span>
        </div>
      )}
    </div>
  );
};
