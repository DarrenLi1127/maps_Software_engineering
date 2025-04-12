/**
 * This file was adjusted with assistance of Claude 3.7 Sonnet (Anthropic, 2025).
 */

package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.geoJson.GeoJsonObject;
import edu.brown.cs.student.main.server.geoJson.GeoJsonParser;
import edu.brown.cs.student.main.server.geoJson.RedliningDataCache;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

/**
 * Handler for the /get-redlining-data endpoint. Serves redlining GeoJSON data, filtered by a
 * bounding box if specified.
 */
public class GetRedliningData implements Route {
  private final GeoJsonParser geoJsonParser;
  private final RedliningDataCache cache;

  /**
   * Constructor for the GetRedliningData handler.
   *
   * @param geoJsonParser The parser to use for GeoJSON data
   * @param cache The cache to use for caching filtered results
   */
  public GetRedliningData(GeoJsonParser geoJsonParser, RedliningDataCache cache) {
    this.geoJsonParser = geoJsonParser;
    this.cache = cache;
  }

  @Override
  public Object handle(Request request, Response response) {
    try {
      // Set content type for GeoJSON response
      response.type("application/json");

      // Parse bounding box parameters, default to entire dataset if not provided
      Double minLat = parseDoubleParam(request, "minLat", -90.0);
      Double minLng = parseDoubleParam(request, "minLng", -180.0);
      Double maxLat = parseDoubleParam(request, "maxLat", 90.0);
      Double maxLng = parseDoubleParam(request, "maxLng", 180.0);

      // Generate cache key based on bounding box parameters
      String cacheKey = String.format("%.6f:%.6f:%.6f:%.6f", minLat, minLng, maxLat, maxLng);

      // Check if we have this query in cache
      if (cache.hasData(cacheKey)) {
        System.out.println("Cache hit for key: " + cacheKey);
        return cache.getData(cacheKey);
      }

      // If not in cache, filter the data
      System.out.println("Cache miss for key: " + cacheKey + ", filtering data...");
      GeoJsonObject fullData = geoJsonParser.getData();
      GeoJsonObject filteredData = filterByBoundingBox(fullData, minLat, minLng, maxLat, maxLng);

      // Convert to JSON string
      String jsonResponse = geoJsonParser.toJson(filteredData);

      // Cache the result
      cache.putData(cacheKey, jsonResponse);

      return jsonResponse;
    } catch (Exception e) {
      e.printStackTrace();
      response.status(500);
      Map<String, Object> errorResponse = new HashMap<>();
      errorResponse.put("result", "error");
      errorResponse.put("message", e.getMessage());
      return Utils.toMoshiJson(errorResponse);
    }
  }

  /**
   * Filter GeoJSON data by a bounding box.
   *
   * @param data The full GeoJSON data
   * @param minLat Minimum latitude
   * @param minLng Minimum longitude
   * @param maxLat Maximum latitude
   * @param maxLng Maximum longitude
   * @return Filtered GeoJSON data
   */
  private GeoJsonObject filterByBoundingBox(
      GeoJsonObject data, double minLat, double minLng, double maxLat, double maxLng) {
    if (data == null || data.features == null) {
      return data;
    }

    GeoJsonObject filteredData = new GeoJsonObject();
    filteredData.type = data.type;
    filteredData.features = new ArrayList<>();

    for (GeoJsonObject.Feature feature : data.features) {
      if (feature.geometry != null
          && isFeatureInBoundingBox(feature, minLat, minLng, maxLat, maxLng)) {
        filteredData.features.add(feature);
      }
    }

    return filteredData;
  }

  /**
   * Check if a feature is contained within the bounding box.
   *
   * @param feature The feature to check
   * @param minLat Minimum latitude
   * @param minLng Minimum longitude
   * @param maxLat Maximum latitude
   * @param maxLng Maximum longitude
   * @return true if the feature is within the bounding box
   */
  private boolean isFeatureInBoundingBox(
      GeoJsonObject.Feature feature, double minLat, double minLng, double maxLat, double maxLng) {
    if (feature.geometry == null || feature.geometry.coordinates == null) {
      return false;
    }

    // The coordinates are in a complex nested structure: MultiPolygon -> Polygon -> Linear Ring ->
    // Point
    // For each point, check if it's within the bounding box
    for (List<List<List<Double>>> polygon : feature.geometry.coordinates) {
      for (List<List<Double>> ring : polygon) {
        for (List<Double> point : ring) {
          // GeoJSON uses [longitude, latitude] order
          double lng = point.get(0);
          double lat = point.get(1);

          // If any point is outside the bounding box, the feature is not fully contained
          if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
            return false;
          }
        }
      }
    }

    // All points are within the bounding box
    return true;
  }

  /**
   * Parse a double parameter from the request, using a default value if not provided.
   *
   * @param request The HTTP request
   * @param paramName The parameter name
   * @param defaultValue The default value
   * @return The parsed double value
   */
  private Double parseDoubleParam(Request request, String paramName, Double defaultValue) {
    String paramValue = request.queryParams(paramName);
    if (paramValue == null || paramValue.isEmpty()) {
      return defaultValue;
    }
    try {
      return Double.parseDouble(paramValue);
    } catch (NumberFormatException e) {
      return defaultValue;
    }
  }
}
