// Helper service for unified delivery API calls with automatic fallback

export async function fetchDeliveryDrivers() {
  try {
    let res = await fetch('/api/delivery/drivers');
    if (!res.ok) res = await fetch('/api/delivery?type=drivers');
    if (res.ok) {
      const data = await res.json();
      return data.drivers || [];
    }
  } catch (e) {
    console.warn('fetchDeliveryDrivers error:', e);
  }
  return [];
}

export async function loginDriver(phone: string, pin: string) {
  const payload = { action: 'login', phone, pin };
  let res = await fetch('/api/delivery/drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch('/api/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  return res.json();
}

export async function fetchDriverAssignments(driverId?: string, orderNumber?: string) {
  try {
    const params = new URLSearchParams();
    if (driverId) params.set('driverId', driverId);
    if (orderNumber) params.set('orderNumber', orderNumber);

    let res = await fetch(`/api/delivery/assign?${params.toString()}`);
    if (!res.ok) res = await fetch(`/api/delivery?type=assign&${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.assignments || [];
    }
  } catch (e) {
    console.warn('fetchDriverAssignments error:', e);
  }
  return [];
}

export async function sendDriverLocation(driverId: string, lat: number, lng: number, accuracy?: number, assignmentId?: string) {
  const payload = {
    action: 'update_location',
    driverId,
    assignmentId,
    latitude: lat,
    longitude: lng,
    accuracy,
  };

  try {
    let res = await fetch('/api/delivery/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function getDriverLocation(orderNumber: string) {
  try {
    let res = await fetch(`/api/delivery/location?orderNumber=${encodeURIComponent(orderNumber)}`);
    if (!res.ok) res = await fetch(`/api/delivery?type=location&orderNumber=${encodeURIComponent(orderNumber)}`);
    if (res.ok) {
      const data = await res.json();
      return data.location || null;
    }
  } catch {}
  return null;
}

export async function updateDeliveryStatus(assignmentId?: string, orderNumber?: string, driverId?: string, status?: string, reason?: string) {
  const payload = {
    action: 'update_status',
    assignmentId,
    orderNumber,
    driverId,
    status,
    reason,
  };

  let res = await fetch('/api/delivery/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch('/api/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  return res.json();
}
