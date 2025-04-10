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
import {
  fetchRedliningData,
  geoLayer,
  highlightLayer,
  searchRedliningAreas,
  createHighlightedFeatureCollection
} from "../utils/overlay";
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

// Interface for detailed search results
interface DetailedSearchResult {
  id: string;
  city: string;
  name: string;
  grade: string;
  matchedField: string;
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

  // States for search functionality
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [highlightedFeatures, setHighlightedFeatures] = useState<GeoJSON.FeatureCollection | null>(null);
  const [searchResultsCount, setSearchResultsCount] = useState<number | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [detailedResults, setDetailedResults] = useState<DetailedSearchResult[]>([]);

  // State for the selected result highlight
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  // Get current user
  const { user } = useUser();
  const userId = user?.id || "anonymous";

  // Handle input changes for bounding box
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle search keyword input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
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

  // Update highlighted features when search results or overlay data changes
  useEffect(() => {
    if (overlay && searchResults.length > 0) {
      const highlighted = createHighlightedFeatureCollection(overlay, searchResults);
      setHighlightedFeatures(highlighted);
      setSearchResultsCount(highlighted.features.length);

      // Create detailed search results from the features
      const detailed = highlighted.features.map((feature, index) => {
        const properties = feature.properties || {};
        return {
          id: searchResults[index] || `result-${index}`,
          city: properties.city || "Unknown",
          name: properties.name || "Unnamed Area",
          grade: properties.holc_grade || "Unknown Grade",
          matchedField: "area description" // Default value, actual matched field is not tracked in our current implementation
        };
      });

      setDetailedResults(detailed);

      // Show search results panel if there are results
      if (detailed.length > 0) {
        setShowSearchResults(true);
      }
    } else {
      setHighlightedFeatures(null);
      setSearchResultsCount(null);
      setDetailedResults([]);
      setShowSearchResults(false);
    }
  }, [searchResults, overlay]);

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

  // Perform search for keyword in area descriptions
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!searchKeyword.trim()) {
      alert("Please enter a search term");
      return;
    }

    try {
      setIsLoading(true);

      // Search for the keyword
      const results = await searchRedliningAreas(searchKeyword.trim());
      setSearchResults(results);

      if (results.length === 0) {
        alert(`No results found for "${searchKeyword}"`);
      }
    } catch (error) {
      console.error("Error searching area descriptions:", error);
      alert("Error performing search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Focus on a specific search result
  const focusOnResult = (resultId: string) => {
    // Find the feature in highlighted features
    if (highlightedFeatures) {
      const featureIndex = searchResults.findIndex(id => id === resultId);
      if (featureIndex >= 0 && featureIndex < highlightedFeatures.features.length) {
        const feature = highlightedFeatures.features[featureIndex];

        // Get the center of the feature (simplified approach)
        if (feature.geometry && feature.geometry.type === "MultiPolygon") {
          // Find the center of the first polygon in the multipolygon
          const coordinates = feature.geometry.coordinates[0][0]; // First polygon, outer ring
          if (coordinates && coordinates.length > 0) {
            // Calculate the average of all coordinates as a simple center
            let sumLng = 0;
            let sumLat = 0;
            for (const coord of coordinates) {
              sumLng += coord[0];
              sumLat += coord[1];
            }
            const centerLng = sumLng / coordinates.length;
            const centerLat = sumLat / coordinates.length;

            // Fly to the center of the feature
            setViewState({
              longitude: centerLng,
              latitude: centerLat,
              zoom: 14 // Zoomed in enough to see the feature
            });

            // Set this as the selected result
            setSelectedResult(resultId);
          }
        }
      }
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchKeyword("");
    setSearchResults([]);
    setHighlightedFeatures(null);
    setSearchResultsCount(null);
    setShowSearchResults(false);
    setDetailedResults([]);
    setSelectedResult(null);
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
    clearSearch();

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

  // Get the HOLC grade color
  const getGradeColor = (grade: string) => {
    switch(grade.toUpperCase()) {
      case 'A': return '#5bcc04'; // Green
      case 'B': return '#04b8cc'; // Blue
      case 'C': return '#e9ed0e'; // Yellow
      case 'D': return '#d11d1d'; // Red
      default: return '#ccc';
    }
  };

  return (
      <div className="map-container">
        <div className="map-controls" style={{
          padding: '10px',
          backgroundColor: '#f8f8f8',
          borderBottom: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
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

              {(boundingBox || searchResults.length > 0) && (
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
                  <span>
                Showing {overlay.features.length} redlined areas
                    {searchResultsCount !== null && (
                        <span> | <strong>{searchResultsCount}</strong> matching search for "{searchKeyword}"</span>
                    )}
              </span>
              ) : (
                  <span>Loading redlining data...</span>
              )}
            </div>
          </div>

          {/* Search input */}
          <div style={{
            marginBottom: '10px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
              <input
                  type="text"
                  value={searchKeyword}
                  onChange={handleSearchChange}
                  placeholder="Search area descriptions..."
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    flexGrow: 1
                  }}
              />
              <button
                  type="submit"
                  style={{
                    backgroundColor: '#673AB7',
                    color: 'white',
                    border: 'none',
                    padding: '8px 15px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontSize: '14px',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
              >
                Search
              </button>
              {searchResults.length > 0 && (
                  <button
                      type="button"
                      onClick={clearSearch}
                      style={{
                        backgroundColor: '#F44336',
                        color: 'white',
                        border: 'none',
                        padding: '8px 15px',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'inline-block',
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                  >
                    Clear Search
                  </button>
              )}
            </form>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
              <p>Search for keywords in area descriptions (e.g., "foreign", "mountain", "industrial", "italian" etc.)</p>
            </div>
          </div>

          {/* Search Results Panel */}
          {showSearchResults && detailedResults.length > 0 && (
              <div style={{
                marginBottom: '10px',
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                  Search Results for "{searchKeyword}" ({detailedResults.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailedResults.map((result, index) => (
                      <div
                          key={`${result.id}-${index}`}
                          onClick={() => focusOnResult(result.id)}
                          style={{
                            padding: '8px',
                            border: `1px solid ${selectedResult === result.id ? '#FF4500' : '#ddd'}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: selectedResult === result.id ? 'rgba(255, 69, 0, 0.1)' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                      >
                        <div
                            style={{
                              width: '18px',
                              height: '18px',
                              backgroundColor: getGradeColor(result.grade),
                              borderRadius: '50%',
                              flexShrink: 0
                            }}
                        />
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{result.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {result.city} • Grade {result.grade} • Contains "{searchKeyword}"
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
          )}

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
              style={{
                width: window.innerWidth,
                height: window.innerHeight - (showForm ? 220 : (showSearchResults ? 280 : 160))
              }}
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

            {/* Highlighted search results layer */}
            {highlightedFeatures && highlightedFeatures.features.length > 0 && (
                <Source id="highlight_data" type="geojson" data={highlightedFeatures}>
                  <Layer {...highlightLayer} />
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