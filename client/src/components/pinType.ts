/**
 * This file handles pin management with Firebase backend integration.
 */

export interface Pin {
  id: string;
  latitude: number;
  longitude: number;
  userId: string;
  timestamp: number;
}

// Local cache of pins (in-memory only)
let localPinCache: Pin[] = [];

// Base URL for our backend API
const API_BASE_URL = "http://localhost:3232";

/**
 * Add a pin to the map and save it to Firebase
 */
export const addPin = async (lat: number, lng: number, userId: string): Promise<Pin> => {
  const newPin: Pin = {
    id: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    latitude: lat,
    longitude: lng,
    userId: userId,
    timestamp: Date.now()
  };

  try {
    // Save to Firebase via API
    const response = await fetch(
        `${API_BASE_URL}/add-pin?userId=${encodeURIComponent(userId)}&pinId=${encodeURIComponent(newPin.id)}&latitude=${lat}&longitude=${lng}&timestamp=${newPin.timestamp}`,
        { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Add to local cache for immediate display
    localPinCache.push(newPin);

    return newPin;
  } catch (error) {
    console.error('Failed to save pin to server:', error);

    // Add to local cache even if server save fails
    // This ensures the UI shows the pin even if Firebase save failed
    localPinCache.push(newPin);

    return newPin;
  }
};

/**
 * Get all pins from Firebase
 */
export const getAllPins = async (): Promise<Pin[]> => {
  try {
    // Fetch pins from server
    const response = await fetch(`${API_BASE_URL}/get-all-pins`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result === 'success') {
      localPinCache = data.pins;
      return data.pins;
    } else {
      throw new Error(data.message || 'Failed to get pins');
    }
  } catch (error) {
    console.error('Failed to get pins from server:', error);
    // Return whatever is in the local cache if server fetch fails
    return localPinCache;
  }
};

/**
 * Clear all pins for a specific user
 */
export const clearUserPins = async (userId: string): Promise<void> => {
  try {
    // Clear pins on server
    const response = await fetch(
        `${API_BASE_URL}/drop-pins?userId=${encodeURIComponent(userId)}`,
        { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Update local cache
    localPinCache = localPinCache.filter(pin => pin.userId !== userId);
  } catch (error) {
    console.error('Failed to clear pins on server:', error);

    localPinCache = localPinCache.filter(pin => pin.userId !== userId);
  }
};