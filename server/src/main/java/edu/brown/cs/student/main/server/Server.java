package edu.brown.cs.student.main.server;

import edu.brown.cs.student.main.server.geoJson.GeoJsonParser;
import edu.brown.cs.student.main.server.geoJson.RedliningDataCache;
import edu.brown.cs.student.main.server.handlers.AddPins;
import edu.brown.cs.student.main.server.handlers.DropPins;
import edu.brown.cs.student.main.server.handlers.GetAllPins;
import edu.brown.cs.student.main.server.handlers.GetRedliningData;
import edu.brown.cs.student.main.server.handlers.SearchRedliningAreas;
import edu.brown.cs.student.main.server.storage.FirebaseUtilities;
import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import spark.Spark;

/** Main server class that configures and starts the Spark server. */
public class Server {
  private static final int PORT = 3232;

  /**
   * Main method to start the server.
   *
   * @param args command line arguments (not used)
   */
  public static void main(String[] args) {
    try {
      // Initialize Firebase storage
      StorageInterface storage = new FirebaseUtilities();

      // Get the path to the redlining dataset in resources directory
      String workingDirectory = System.getProperty("user.dir");
      Path redliningFilePath =
          Paths.get(workingDirectory, "src", "main", "resources", "fullDownload.json");

      // Verify the file exists
      if (!Files.exists(redliningFilePath)) {
        System.err.println("WARNING: GeoJSON file not found at: " + redliningFilePath);
        System.err.println("Please ensure the file exists at this location.");
      } else {
        System.out.println("GeoJSON file found at: " + redliningFilePath);
      }

      // Initialize GeoJSON parser and cache
      System.out.println("Initializing GeoJSON parser with file: " + redliningFilePath);
      GeoJsonParser geoJsonParser = new GeoJsonParser(redliningFilePath);
      RedliningDataCache redliningCache = new RedliningDataCache();

      // Configure Spark
      Spark.port(PORT);

      // Set CORS headers
      Spark.before(
          (request, response) -> {
            response.header("Access-Control-Allow-Origin", "*");
            response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.header(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization, X-Requested-With, Content-Length, Accept, Origin");
          });

      // Handle OPTIONS requests for CORS preflight
      Spark.options(
          "/*",
          (request, response) -> {
            String accessControlRequestHeaders = request.headers("Access-Control-Request-Headers");
            if (accessControlRequestHeaders != null) {
              response.header("Access-Control-Allow-Headers", accessControlRequestHeaders);
            }

            String accessControlRequestMethod = request.headers("Access-Control-Request-Method");
            if (accessControlRequestMethod != null) {
              response.header("Access-Control-Allow-Methods", accessControlRequestMethod);
            }

            return "OK";
          });

      // Register API endpoints
      Spark.get("/add-pin", new AddPins(storage));
      Spark.get("/get-all-pins", new GetAllPins(storage));
      Spark.get("/drop-pins", new DropPins(storage));
      Spark.get("/get-redlining-data", new GetRedliningData(geoJsonParser, redliningCache));

      // Register new search endpoint
      Spark.get("/search-redlining", new SearchRedliningAreas(geoJsonParser));

      System.out.println("Server started on port " + PORT);

    } catch (IOException e) {
      System.err.println("Failed to initialize Firebase: " + e.getMessage());
      e.printStackTrace();
      System.exit(1);
    }
  }
}
