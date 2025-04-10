import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState, useRef } from "react";
import Map, {
  Layer,
  MapLayerMouseEvent,
  Source,
  ViewStateChangeEvent,
  Marker,
  Popup,
  NavigationControl
} from "react-map-gl";
import { fetchRedliningData, geoLayer } from "../utils/overlay";
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

// Input fields for the bounding box
interface BoundingBoxInputs {
  minLat: string;
  minLng: string;
  maxLat: string;
  maxLng: string;
}

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

  // Track if initial data has been loaded
  const initialLoadRef = useRef(false);

  // State for form inputs
  const [showForm, setShowForm] = useState(false);
  const [inputs, setInputs] = useState<BoundingBoxInputs>({
    minLat: "41.72",  // Default values for Providence area
    minLng: "-71.48",
    maxLat: "41.92",
    maxLng: "-71.28"
  });

  // State for the current bounding box visualization
  const [boundingBox, setBoundingBox] = useState<GeoJSON.Feature | null>(null);

  // Get current user
  const { user } = useUser();
  const userId = user?.id || "anonymous";

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch pins from the backend on component mount
  useEffect(() => {
    const fetchPins = async () => {
      try {
        setIsLoading(true);
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

  // Initial data load
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!initialLoadRef.current) {
        setIsLoading(true);
        try {
          // Load initial data (full dataset or centered on Providence)
          const data = await fetchRedliningData();
          setOverlay(data);
          initialLoadRef.current = true;
        } catch (error) {
          console.error("Error fetching initial data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
  }, []);

  // Apply the filter with the coordinates from the form
  const applyFilter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Parse the input values as numbers
    const minLat = parseFloat(inputs.minLat);
    const minLng = parseFloat(inputs.minLng);
    const maxLat = parseFloat(inputs.maxLat);
    const maxLng = parseFloat(inputs.maxLng);

    // Validate inputs
    if (isNaN(minLat) || isNaN(minLng) || isNaN(maxLat) || isNaN(maxLng)) {
      alert("Please enter valid numbers for all coordinates");
      return;
    }

    if (minLat >= maxLat || minLng >= maxLng) {
      alert("Min values must be less than max values");
      return;
    }

    try {
      setIsLoading(true);

      // Create a GeoJSON polygon for visualization
      const boundingBoxFeature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat] // Close the polygon
            ]
          ]
        }
      };

      setBoundingBox(boundingBoxFeature);

      // Fetch filtered data
      const data = await fetchRedliningData(minLat, minLng, maxLat, maxLng);
      setOverlay(data);

      // Fly to the bounding box
      setViewState({
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
        zoom: Math.min(12, calculateZoomLevel(minLat, minLng, maxLat, maxLng))
      });

      // Hide the form after applying
      setShowForm(false);
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate appropriate zoom level based on bounding box size
  const calculateZoomLevel = (minLat: number, minLng: number, maxLat: number, maxLng: number): number => {
    const latDiff = Math.abs(maxLat - minLat);
    const lngDiff = Math.abs(maxLng - minLng);
    const maxDiff = Math.max(latDiff, lngDiff);

    // Rough estimation - adjust as needed
    if (maxDiff > 5) return 5;
    if (maxDiff > 2) return 7;
    if (maxDiff > 1) return 9;
    if (maxDiff > 0.5) return 10;
    if (maxDiff > 0.1) return 12;
    return 14;
  };

  // Reset the view and clear any bounding box filters
  const resetView = async () => {
    setBoundingBox(null);

    // Reset to default view
    setViewState({
      longitude: ProvidenceLatLong.long,
      latitude: ProvidenceLatLong.lat,
      zoom: initialZoom,
    });

    // Fetch full dataset
    setIsLoading(true);
    try {
      const data = await fetchRedliningData();
      setOverlay(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Layer for the bounding box
  // @ts-ignore
  const boundingBoxLayer: Layer = {
    id: 'bounding-box',
    type: 'fill',
    paint: {
      'fill-color': '#4286f4',
      'fill-opacity': 0.2,
    },
  };

  // Layer for the bounding box outline
  // @ts-ignore
  const boundingBoxOutlineLayer: Layer = {
    id: 'bounding-box-outline',
    type: 'line',
    paint: {
      'line-color': '#4286f4',
      'line-width': 2,
    },
  };

  return (
      <div className="map-container">
        <div className="map-controls" style={{
          padding: '10px',
          backgroundColor: '#f8f8f8',
          borderBottom: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <button
                  onClick={() => setShowForm(!showForm)}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontSize: '14px',
                    margin: '4px 2px',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
              >
                {showForm ? "Hide Filter Form" : "Filter by Coordinates"}
              </button>

              {boundingBox && (
                  <button
                      onClick={resetView}
                      style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'inline-block',
                        fontSize: '14px',
                        margin: '4px 2px',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                  >
                    Reset View
                  </button>
              )}

              <button
                  onClick={handleClearMyPins}
                  disabled={isLoading}
                  style={{
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontSize: '14px',
                    margin: '4px 2px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    opacity: isLoading ? 0.7 : 1
                  }}
              >
                {isLoading ? "Processing..." : "Clear My Pins"}
              </button>
            </div>

            <div className="info-box" style={{
              padding: '10px',
              backgroundColor: 'white',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginLeft: '10px'
            }}>
              {overlay && overlay.features ? (
                  <span>Showing {overlay.features.length} redlined areas</span>
              ) : (
                  <span>Loading redlining data...</span>
              )}
            </div>
          </div>

          {/* Coordinate input form */}
          {showForm && (
              <form
                  onSubmit={applyFilter}
                  style={{
                    marginTop: '10px',
                    padding: '15px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      Min Latitude:
                    </label>
                    <input
                        type="text"
                        name="minLat"
                        value={inputs.minLat}
                        onChange={handleInputChange}
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '120px'
                        }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      Min Longitude:
                    </label>
                    <input
                        type="text"
                        name="minLng"
                        value={inputs.minLng}
                        onChange={handleInputChange}
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '120px'
                        }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      Max Latitude:
                    </label>
                    <input
                        type="text"
                        name="maxLat"
                        value={inputs.maxLat}
                        onChange={handleInputChange}
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '120px'
                        }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      Max Longitude:
                    </label>
                    <input
                        type="text"
                        name="maxLng"
                        value={inputs.maxLng}
                        onChange={handleInputChange}
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '120px'
                        }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                        type="submit"
                        style={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          padding: '8px 15px',
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'inline-block',
                          fontSize: '14px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          height: '35px'
                        }}
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
                  <p>Enter the latitude and longitude values to define a bounding box. For Providence area, try the defaults.</p>
                </div>
              </form>
          )}
        </div>

        <div className="map">
          <Map
              mapboxAccessToken={MAPBOX_API_KEY}
              {...viewState}
              style={{ width: window.innerWidth, height: window.innerHeight - (showForm ? 220 : 100) }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              onMove={(ev: ViewStateChangeEvent) => setViewState(ev.viewState)}
              onClick={handleMapClick}
          >
            {/* Navigation controls */}
            <NavigationControl position="top-right" />

            {/* Redlining data layer */}
            {overlay && (
                <Source id="geo_data" type="geojson" data={overlay}>
                  <Layer {...geoLayer} />
                </Source>
            )}

            {/* Bounding box visualization */}
            {boundingBox && (
                <Source id="bounding-box-source" type="geojson" data={boundingBox}>
                  <Layer {...boundingBoxLayer} />
                  <Layer {...boundingBoxOutlineLayer} />
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
                      style={{ fontSize: '24px' }}
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
                <div className="loading-overlay" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000
                }}>
                  <div className="loading-spinner" style={{
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}>
                    Loading...
                  </div>
                </div>
            )}
          </Map>
        </div>
      </div>
  );
}