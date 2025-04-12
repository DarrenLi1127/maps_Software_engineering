/**
 * This file was adjusted with assistance of Claude 3.7 Sonnet (Anthropic, 2025).
 */

package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.util.HashMap;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

public class DropPins implements Route {
  private final StorageInterface storage;

  public DropPins(StorageInterface storage) {
    this.storage = storage;
  }

  @Override
  public Object handle(Request request, Response response) {
    try {
      // Get userId parameter
      String userId = request.queryParams("userId");

      // Validate required parameter
      if (userId == null) {
        response.status(400);
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("result", "error");
        errorResponse.put("message", "Missing required userId parameter");
        return Utils.toMoshiJson(errorResponse);
      }

      // Clear pins for this user by querying the flat structure
      storage.clearUser(userId);

      // Return success response
      Map<String, Object> successResponse = new HashMap<>();
      successResponse.put("result", "success");
      successResponse.put("message", "All pins for user " + userId + " have been cleared");
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
