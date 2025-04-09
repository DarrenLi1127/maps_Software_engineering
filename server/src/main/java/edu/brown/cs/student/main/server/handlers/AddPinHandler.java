package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.util.HashMap;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

/** Handler for adding a pin to a user's map */
public class AddPinHandler implements Route {
  private final StorageInterface storageInterface;

  public AddPinHandler(StorageInterface storageInterface) {
    this.storageInterface = storageInterface;
  }

  @Override
  public Object handle(Request request, Response response) {
    response.type("application/json");
    Map<String, Object> responseMap = new HashMap<>();

    try {
      // Get parameters from the request
      String userId = request.queryParams("userId");
      String pinId = request.queryParams("pinId");
      String latitude = request.queryParams("latitude");
      String longitude = request.queryParams("longitude");
      String timestamp = request.queryParams("timestamp");

      // Validate parameters
      if (userId == null
          || pinId == null
          || latitude == null
          || longitude == null
          || timestamp == null) {
        responseMap.put("status", "error");
        responseMap.put("message", "Missing required parameters");
        return Utils.toMoshiJson(responseMap);
      }

      // Create pin data
      Map<String, Object> pinData = new HashMap<>();
      pinData.put("id", pinId);
      pinData.put("latitude", Double.parseDouble(latitude));
      pinData.put("longitude", Double.parseDouble(longitude));
      pinData.put("userId", userId);
      pinData.put("timestamp", Long.parseLong(timestamp));

      // Add pin to Firestore
      storageInterface.addDocument(userId, "pins", pinId, pinData);

      // Return success response
      responseMap.put("status", "success");
      responseMap.put("pin", pinData);
      return Utils.toMoshiJson(responseMap);
    } catch (Exception e) {
      responseMap.put("status", "error");
      responseMap.put("message", e.getMessage());
      return Utils.toMoshiJson(responseMap);
    }
  }
}
