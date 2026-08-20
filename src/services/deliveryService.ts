// Helper service for unified delivery API calls

export async function fetchDeliveryDrivers() {
  try {
    let res = await fetch('/api/delivery-api?type=drivers');
    if (!res.ok) res = await fetch('/api/orders/manage?type=delivery_drivers');
    if (!res.ok) res = await fetch('/api/orders?type=delivery_drivers');
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
  const payload = { action: 'driver_login', phone, pin };
  let res = await fetch('/api/delivery-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  if (!res.ok) {
    res = await fetch('/api/orders', {
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
    params.set('type', 'assignments');
    if (driverId) params.set('driverId', driverId);
    if (orderNumber) params.set('orderNumber', orderNumber);

    let res = await fetch(`/api/delivery-api?${params.toString()}`);
    if (!res.ok) res = await fetch(`/api/orders/manage?${params.toString()}`);
    if (!res.ok) res = await fetch(`/api/orders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.assignments || [];
    }
  } catch (e) {
    console.warn('fetchDriverAssignments error:', e);
  }
  return [];
}

export async function createDeliveryOffer(orderNumber: string, orderId?: string, deliveryFee: number = 5.0) {
  const payload = { action: 'create_delivery_offer', orderNumber, orderId, deliveryFee };
  let res = await fetch('/api/delivery-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  if (!res.ok) {
    res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  return res.json();
}

export async function acceptDeliveryOffer(driverId: string, assignmentId?: string, orderNumber?: string) {
  const payload = { action: 'accept_delivery_offer', driverId, assignmentId, orderNumber };
  let res = await fetch('/api/delivery-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  if (!res.ok) {
    res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  return res.json();
}

export async function sendDriverLocation(driverId: string, lat: number, lng: number, accuracy?: number, assignmentId?: string) {
  const payload = {
    action: 'update_driver_location',
    driverId,
    assignmentId,
    latitude: lat,
    longitude: lng,
    accuracy,
  };

  try {
    let res = await fetch('/api/delivery-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      res = await fetch('/api/orders/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      res = await fetch('/api/orders', {
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
    let res = await fetch(`/api/delivery-api?type=location&orderNumber=${encodeURIComponent(orderNumber)}`);
    if (!res.ok) res = await fetch(`/api/orders/manage?type=driver_location&orderNumber=${encodeURIComponent(orderNumber)}`);
    if (!res.ok) res = await fetch(`/api/orders?type=driver_location&orderNumber=${encodeURIComponent(orderNumber)}`);
    if (res.ok) {
      const data = await res.json();
      return data.location || null;
    }
  } catch {}
  return null;
}

export async function updateDeliveryStatus(assignmentId?: string, orderNumber?: string, driverId?: string, status?: string, reason?: string) {
  const payload = {
    action: 'update_delivery_status',
    assignmentId,
    orderNumber,
    driverId,
    status,
    reason,
  };

  let res = await fetch('/api/delivery-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch('/api/orders/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  if (!res.ok) {
    res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  return res.json();
}
