package edu.brown.cs.student.main.server.handlers;

import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import spark.Request;
import spark.Response;
import spark.Route;

public class GetAllPins implements Route {
  private final StorageInterface storage;

  public GetAllPins(StorageInterface storage) {
    this.storage = storage;
  }

  @Override
  public Object handle(Request request, Response response) {
    try {
      // Get all pins from the single pins collection
      List<Map<String, Object>> allPins = storage.getAllPins();

      // Return success response
      Map<String, Object> successResponse = new HashMap<>();
      successResponse.put("result", "success");
      successResponse.put("pins", allPins);
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
