package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

/** Handler for listing all pins from all users */
public class ListPinsHandler implements Route {
  private final StorageInterface storageInterface;

  public ListPinsHandler(StorageInterface storageInterface) {
    this.storageInterface = storageInterface;
  }

  @Override
  public Object handle(Request request, Response response) {
    response.type("application/json");
    Map<String, Object> responseMap = new HashMap<>();

    try {
      // We'll get pins from all users in the "users" collection
      // First, we need to get a list of all user IDs
      // For now, we'll just use the userId from the query param to get that user's pins
      String userId = request.queryParams("userId");

      if (userId == null) {
        responseMap.put("status", "error");
        responseMap.put("message", "Missing userId parameter");
        return Utils.toMoshiJson(responseMap);
      }

      // Get pins for this user
      List<Map<String, Object>> pins = storageInterface.getCollection(userId, "pins");

      // Return success response
      responseMap.put("status", "success");
      responseMap.put("pins", pins);
      return Utils.toMoshiJson(responseMap);
    } catch (Exception e) {
      responseMap.put("status", "error");
      responseMap.put("message", e.getMessage());
      return Utils.toMoshiJson(responseMap);
    }
  }
}
