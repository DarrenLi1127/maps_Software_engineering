package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.geoJson.GeoJsonObject;
import edu.brown.cs.student.main.server.geoJson.GeoJsonParser;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

/**
 * Handler for the /search-redlining endpoint. Searches through redlining area descriptions for
 * keywords.
 */
public class SearchRedliningAreas implements Route {
  private final GeoJsonParser geoJsonParser;

  /**
   * Constructor for the SearchRedliningAreas handler.
   *
   * @param geoJsonParser The parser to use for GeoJSON data
   */
  public SearchRedliningAreas(GeoJsonParser geoJsonParser) {
    this.geoJsonParser = geoJsonParser;
  }

  @Override
  public Object handle(Request request, Response response) {
    try {
      // Set content type for JSON response
      response.type("application/json");

      // Get the search keyword from the request (case insensitive)
      String keyword = request.queryParams("keyword");
      if (keyword == null || keyword.trim().isEmpty()) {
        response.status(400);
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("result", "error");
        errorResponse.put("message", "Search keyword is required");
        return Utils.toMoshiJson(errorResponse);
      }

      keyword = keyword.trim().toLowerCase();
      System.out.println("Searching for keyword: " + keyword);

      // Get all redlining data
      GeoJsonObject allData = geoJsonParser.getData();
      if (allData == null || allData.features == null) {
        response.status(500);
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("result", "error");
        errorResponse.put("message", "Failed to get redlining data");
        return Utils.toMoshiJson(errorResponse);
      }

      // Search for features with the keyword in their area descriptions
      List<String> matchingFeatureIds = new ArrayList<>();

      for (GeoJsonObject.Feature feature : allData.features) {
        if (feature.properties != null) {
          boolean found = false;

          // Search in area_description_data map as per user story requirements
          if (feature.properties.area_description_data != null) {
            for (Map.Entry<String, String> entry : feature.properties.area_description_data.entrySet()) {
              String value = entry.getValue();
              if (value != null && value.toLowerCase().contains(keyword)) {
                found = true;
                break;
              }
            }
          }

          // Also check the main area_description field if it exists
          if (!found && feature.properties.area_description != null) {
            if (feature.properties.area_description.toLowerCase().contains(keyword)) {
              found = true;
            }
          }

          // If we found the keyword, add this feature's identifier to the list
          if (found) {
            // Create a unique identifier for this feature (combining city and holc_grade)
            String featureId =
                (feature.properties.city != null ? feature.properties.city : "")
                    + "-"
                    + (feature.properties.holc_grade != null ? feature.properties.holc_grade : "")
                    + "-"
                    + matchingFeatureIds.size(); // Add index to ensure uniqueness
            matchingFeatureIds.add(featureId);
          }
        }
      }

      // Prepare response
      Map<String, Object> successResponse = new HashMap<>();
      successResponse.put("result", "success");
      successResponse.put("keyword", keyword);
      successResponse.put("matchingFeatures", matchingFeatureIds);
      successResponse.put("totalMatches", matchingFeatureIds.size());

      System.out.println("Found " + matchingFeatureIds.size() + " matches for keyword: " + keyword);

      return Utils.toMoshiJson(successResponse);
    } catch (Exception e) {
      e.printStackTrace();
      response.status(500);
      Map<String, Object> errorResponse = new HashMap<>();
      errorResponse.put("result", "error");
      errorResponse.put("message", e.getMessage());
      return Utils.toMoshiJson(errorResponse);
    }
  }
}