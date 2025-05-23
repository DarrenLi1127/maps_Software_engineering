import { FeatureCollection } from "geojson";
import { FillLayer } from "react-map-gl";

const propertyName = "holc_grade";
export const geoLayer: FillLayer = {
  id: "geo_data",
  type: "fill",
  paint: {
    "fill-color": [
      "match",
      ["get", propertyName],
      "A",
      "#5bcc04",
      "B",
      "#04b8cc",
      "C",
      "#e9ed0e",
      "D",
      "#d11d1d",
      "#ccc",
    ],
    "fill-opacity": 0.2,
  },
};

// Layer for highlighted areas (for search results)
export const highlightLayer: FillLayer = {
  id: "highlight_data",
  type: "fill",
  paint: {
    "fill-color": "#FF4500", // Orange-red highlight color
    "fill-opacity": 0.6,
  },
};

// API base URL - same as in pinType.ts
const API_BASE_URL = "http://localhost:3232";

function isFeatureCollection(json: any): json is FeatureCollection {
  return json.type === "FeatureCollection";
}

/**
 * Fetch redlining data from the backend API with optional bounding box
 * @param minLat Optional minimum latitude
 * @param minLng Optional minimum longitude
 * @param maxLat Optional maximum latitude
 * @param maxLng Optional maximum longitude
 * @returns GeoJSON FeatureCollection
 */
export async function fetchRedliningData(
    minLat?: number,
    minLng?: number,
    maxLat?: number,
    maxLng?: number
): Promise<GeoJSON.FeatureCollection | undefined> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (minLat !== undefined) params.append("minLat", minLat.toString());
    if (minLng !== undefined) params.append("minLng", minLng.toString());
    if (maxLat !== undefined) params.append("maxLat", maxLat.toString());
    if (maxLng !== undefined) params.append("maxLng", maxLng.toString());

    // Construct URL with query parameters
    const queryString = params.toString();
    const url = `${API_BASE_URL}/get-redlining-data${queryString ? `?${queryString}` : ''}`;

    // Fetch data from backend
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (isFeatureCollection(data)) {
      return data;
    } else {
      console.error("Received data is not a valid FeatureCollection", data);
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching redlining data:", error);
    return undefined;
  }
}

/**
 * Search for areas containing the specified keyword in their descriptions
 * @param keyword The search keyword
 * @returns Array of matching feature IDs
 */
export async function searchRedliningAreas(keyword: string): Promise<string[]> {
  try {
    // Build the search URL with the keyword
    const url = `${API_BASE_URL}/search-redlining?keyword=${encodeURIComponent(keyword)}`;

    // Fetch search results from backend
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.result === "success") {
      return data.matchingFeatures || [];
    } else {
      console.error("Search failed:", data.message);
      return [];
    }
  } catch (error) {
    console.error("Error searching redlining areas:", error);
    return [];
  }
}

/**
 * Create a GeoJSON feature collection containing only the matching features
 * @param allData The complete GeoJSON data
 * @param matchingFeatureIds Array of feature IDs that match the search
 * @returns GeoJSON feature collection with only matching features
 */
export function createHighlightedFeatureCollection(
    allData: GeoJSON.FeatureCollection,
    matchingFeatureIds: string[]
): GeoJSON.FeatureCollection {
  if (!allData || !allData.features || !matchingFeatureIds || matchingFeatureIds.length === 0) {
    return {
      type: "FeatureCollection",
      features: []
    };
  }

  // Create a tracking map to keep track of which features we've already matched
  // This helps prevent duplicate matches
  const matchedFeatures = new Set<number>();
  const resultFeatures: GeoJSON.Feature[] = [];

  // Go through each matchingFeatureId from the backend
  for (const featureId of matchingFeatureIds) {
    const parts = featureId.split('-');
    const city = parts[0] || "";
    const grade = parts[1] || "";
    const index = parts.length > 2 ? parseInt(parts[2]) : -1;

    // Find the first matching feature that hasn't been matched yet
    for (let i = 0; i < allData.features.length; i++) {
      if (matchedFeatures.has(i)) continue; // Skip already matched features

      const feature = allData.features[i];
      if (!feature.properties) continue;

      const featureCity = feature.properties.city || "";
      const featureGrade = feature.properties.holc_grade || "";

      // Check if this feature matches the city and grade
      if (featureCity === city && featureGrade === grade) {
        matchedFeatures.add(i);
        resultFeatures.push(feature);
        break; // Only match one feature per ID
      }
    }
  }

  console.log(`Found ${resultFeatures.length} matching features for ${matchingFeatureIds.length} IDs`);

  return {
    type: "FeatureCollection",
    features: resultFeatures
  };
}