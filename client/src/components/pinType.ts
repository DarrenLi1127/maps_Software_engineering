/**
 * This file was adjusted with assistance of Claude 3.7 Sonnet (Anthropic, 2025).
 */

export interface Pin {
  id: string;
  latitude: number;
  longitude: number;
  userId: string;
  timestamp: number;
}


export const mockPinDb: {
  pins: Pin[];
} = {
  pins: []
};

export const addPin = (lat: number, lng: number, userId: string): Pin => {
  const newPin: Pin = {
    id: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    latitude: lat,
    longitude: lng,
    userId: userId,
    timestamp: Date.now()
  };

  mockPinDb.pins.push(newPin);

  try {
    localStorage.setItem('mapPins', JSON.stringify(mockPinDb.pins));
  } catch (error) {
    console.error('Failed to save pins to localStorage:', error);
  }

  return newPin;
};

export const getAllPins = (): Pin[] => {
  return mockPinDb.pins;
};

export const clearUserPins = (userId: string): void => {
  mockPinDb.pins = mockPinDb.pins.filter(pin => pin.userId !== userId);

  try {
    localStorage.setItem('mapPins', JSON.stringify(mockPinDb.pins));
  } catch (error) {
    console.error('Failed to save pins to localStorage:', error);
  }
};

export const loadPinsFromStorage = (): void => {
  try {
    const storedPins = localStorage.getItem('mapPins');
    if (storedPins) {
      mockPinDb.pins = JSON.parse(storedPins);
    }
  } catch (error) {
    console.error('Failed to load pins from localStorage:', error);
  }
};