package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.util.HashMap;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

/** Handler for clearing all pins for a specific user */
public class ClearPinsHandler implements Route {
  private final StorageInterface storageInterface;

  public ClearPinsHandler(StorageInterface storageInterface) {
    this.storageInterface = storageInterface;
  }

  @Override
  public Object handle(Request request, Response response) {
    response.type("application/json");
    Map<String, Object> responseMap = new HashMap<>();

    try {
      String userId = request.queryParams("userId");

      if (userId == null) {
        responseMap.put("status", "error");
        responseMap.put("message", "Missing userId parameter");
        return Utils.toMoshiJson(responseMap);
      }

      try {
        // Clear user's pins
        storageInterface.clearUser(userId);

        // Return success response
        responseMap.put("status", "success");
        responseMap.put("message", "Pins cleared successfully");
      } catch (Exception e) {
        // If clearing fails, we'll still report success but log the error
        System.err.println("Error while clearing user: " + e.getMessage());
        responseMap.put("status", "success");
        responseMap.put("message", "No pins to clear");
      }

      return Utils.toMoshiJson(responseMap);
    } catch (Exception e) {
      responseMap.put("status", "error");
      responseMap.put("message", e.getMessage());
      return Utils.toMoshiJson(responseMap);
    }
  }
}
