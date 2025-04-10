package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.util.HashMap;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

public class AddPins implements Route {
  private final StorageInterface storage;

  public AddPins(StorageInterface storage) {
    this.storage = storage;
  }

  @Override
  public Object handle(Request request, Response response) {
    try {
      // Get parameters from request
      String userId = request.queryParams("userId");
      String pinId = request.queryParams("pinId");
      String latitude = request.queryParams("latitude");
      String longitude = request.queryParams("longitude");
      String timestamp = request.queryParams("timestamp");

      // Validate required parameters
      if (userId == null
          || pinId == null
          || latitude == null
          || longitude == null
          || timestamp == null) {
        response.status(400);
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("result", "error");
        errorResponse.put("message", "Missing required parameters");
        return Utils.toMoshiJson(errorResponse);
      }

      // Create pin data
      Map<String, Object> pinData = new HashMap<>();
      pinData.put("id", pinId);
      pinData.put("latitude", Double.parseDouble(latitude));
      pinData.put("longitude", Double.parseDouble(longitude));
      pinData.put("userId", userId);
      pinData.put("timestamp", Long.parseLong(timestamp));

      // Store in Firebase using simplified structure
      storage.addDocument(userId, pinId, pinData);

      // Return success response
      Map<String, Object> successResponse = new HashMap<>();
      successResponse.put("result", "success");
      successResponse.put("pin", pinData);
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
