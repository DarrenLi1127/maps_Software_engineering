import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState } from "react";
import Map, {
  Layer,
  MapLayerMouseEvent,
  Source,
  ViewStateChangeEvent,
  Marker,
  Popup
} from "react-map-gl";
import { geoLayer, overlayData } from "../utils/overlay";
import { Pin, addPin, getAllPins, clearUserPins} from "./pinType";
import { useUser } from "@clerk/clerk-react";

const MAPBOX_API_KEY = process.env.MAPBOX_TOKEN;
if (!MAPBOX_API_KEY) {
  console.error("Mapbox API key not found. Please add it to your .env file.");
}

export interface LatLong {
  lat: number;
  long: number;
}
const ProvidenceLatLong: LatLong = {
  lat: 41.8240,
  long: -71.4128
};
const initialZoom = 12;

export default function Mapbox() {
  const [viewState, setViewState] = useState({
    longitude: ProvidenceLatLong.long,
    latitude: ProvidenceLatLong.lat,
    zoom: initialZoom,
  });

  // State for the overlay GeoJSON data
  const [overlay, setOverlay] = useState<GeoJSON.FeatureCollection | undefined>(undefined);

  // State for pins
  const [pins, setPins] = useState<Pin[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // State for selected pin (for popup)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  // Get current user
  const { user } = useUser();
  const userId = user?.id || "anonymous";

  // Fetch the overlay data and load pins from Firebase on component mount
  useEffect(() => {
    setOverlay(overlayData());

    // Fetch pins from server
    const fetchPins = async () => {
      setIsLoading(true);
      try {
        const serverPins = await getAllPins();
        setPins(serverPins);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching pins from server:", error);
        setIsLoading(false);
      }
    };

    fetchPins();
  }, []);

  const handleMapClick = async (ev: MapLayerMouseEvent) => {
    if (!user) return; // Only logged in users can add pins

    try {
      setIsLoading(true);
      const newPin = await addPin(ev.lngLat.lat, ev.lngLat.lng, userId);
      setPins([...pins, newPin]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error adding pin:", error);
      setIsLoading(false);
    }
  };

  const handleClearMyPins = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      await clearUserPins(userId);
      // Refresh pins from server
      const updatedPins = await getAllPins();
      setPins(updatedPins);
      setIsLoading(false);
    } catch (error) {
      console.error("Error clearing pins:", error);
      setIsLoading(false);
    }
  };

  return (
      <div className="map-container">
        <div className="map-controls">
          <button
              onClick={handleClearMyPins}
              className="clear-pins-button"
              aria-label="Clear My Pins"
              disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Clear My Pins"}
          </button>
        </div>
        <div className="map">
          <Map
              mapboxAccessToken={MAPBOX_API_KEY}
              {...viewState}
              style={{ width: window.innerWidth, height: window.innerHeight - 100 }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              onMove={(ev: ViewStateChangeEvent) => setViewState(ev.viewState)}
              onClick={handleMapClick}
          >
            {overlay && (
                <Source id="geo_data" type="geojson" data={overlay}>
                  <Layer {...geoLayer} />
                </Source>
            )}

            {/* Display all pins */}
            {pins.map((pin) => (
                <Marker
                    key={pin.id}
                    longitude={pin.longitude}
                    latitude={pin.latitude}
                    anchor="bottom"
                    onClick={e => {
                      e.originalEvent.stopPropagation();
                      setSelectedPin(pin);
                    }}
                >
                  <div
                      className={`map-pin ${pin.userId === userId ? 'my-pin' : 'other-pin'}`}
                      aria-label={`Pin at latitude ${pin.latitude}, longitude ${pin.longitude}`}
                  >
                    📍
                  </div>
                </Marker>
            ))}

            {/* Popup for selected pin */}
            {selectedPin && (
                <Popup
                    longitude={selectedPin.longitude}
                    latitude={selectedPin.latitude}
                    anchor="top"
                    onClose={() => setSelectedPin(null)}
                >
                  <div>
                    <p>Negative landlord experience reported</p>
                    <p>Added {new Date(selectedPin.timestamp).toLocaleString()}</p>
                    <p>By {selectedPin.userId === userId ? 'you' : 'another user'}</p>
                  </div>
                </Popup>
            )}

            {/* Loading indicator */}
            {isLoading && (
                <div className="loading-overlay">
                  <div className="loading-spinner">Loading...</div>
                </div>
            )}
          </Map>
        </div>
      </div>
  );
}