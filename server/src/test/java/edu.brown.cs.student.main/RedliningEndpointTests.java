/**
 * This file was adjusted with assistance of Claude 3.7 Sonnet (Anthropic, 2025).
 */

package edu.brown.cs.student.main;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.squareup.moshi.JsonAdapter;
import com.squareup.moshi.Moshi;
import com.squareup.moshi.Types;
import edu.brown.cs.student.main.server.geoJson.GeoJsonParser;
import edu.brown.cs.student.main.server.geoJson.RedliningDataCache;
import edu.brown.cs.student.main.server.handlers.GetRedliningData;
import edu.brown.cs.student.main.server.handlers.SearchRedliningAreas;
import edu.brown.cs.student.main.server.storage.StorageInterface;
import java.io.IOException;
import java.lang.reflect.Type;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.concurrent.ExecutionException;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import spark.Spark;

/** Tests for the backend server API endpoints. */
public class RedliningEndpointTests extends SparkTestBase {

  private String baseUrl;
  private static GeoJsonParser geoJsonParser;
  private static RedliningDataCache redliningCache;
  private static Path testFilePath;

  // Mock storage implementation for testing, mimicing Firebase
  private static class MockStorage implements StorageInterface {
    private final Map<String, Map<String, Object>> pins = new HashMap<>();

    @Override
    public void addDocument(String userId, String pinId, Map<String, Object> data)
        throws ExecutionException, InterruptedException {
      pins.put(pinId, data);
    }

    @Override
    public List<Map<String, Object>> getAllPins() throws ExecutionException, InterruptedException {
      return new ArrayList<>(pins.values());
    }

    @Override
    public void clearUser(String userId) throws ExecutionException, InterruptedException {
      // Create a copy of the pins set to avoid concurrent modification
      List<String> toRemove = new ArrayList<>();
      for (Map.Entry<String, Map<String, Object>> entry : pins.entrySet()) {
        if (entry.getValue().get("userId").equals(userId)) {
          toRemove.add(entry.getKey());
        }
      }

      // Remove all pins for this user
      for (String pinId : toRemove) {
        pins.remove(pinId);
      }
    }
  }

  // Track if cache was hit for testing
  private static class TestableRedliningDataCache extends RedliningDataCache {
    private int cacheHits = 0;
    private int cacheMisses = 0;

    @Override
    public synchronized boolean hasData(String key) {
      boolean result = super.hasData(key);
      if (result) {
        cacheHits++;
      } else {
        cacheMisses++;
      }
      return result;
    }

    public int getCacheHits() {
      return cacheHits;
    }

    public int getCacheMisses() {
      return cacheMisses;
    }

    public void resetCounters() {
      cacheHits = 0;
      cacheMisses = 0;
    }
  }

  private static MockStorage mockStorage = new MockStorage();
  private static TestableRedliningDataCache testableCache;

  @BeforeAll
  public static void setUpOnce() throws IOException {
    // Create a minimal test GeoJSON file
    testFilePath = createTestGeoJsonFile();

    // Initialize the parser and cache once for all tests
    geoJsonParser = new GeoJsonParser(testFilePath);
    testableCache = new TestableRedliningDataCache();
    redliningCache = testableCache;
  }

  private static Path createTestGeoJsonFile() throws IOException {
    Path tempFile = Files.createTempFile("test-geojson", ".json");
    String minimalGeoJson =
        "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[100.0, 0.0],[101.0, 0.0],[101.0, 1.0],[100.0, 1.0],[100.0, 0.0]]]]},\"properties\":{\"city\":\"TestCity\",\"holc_grade\":\"A\",\"area_description_data\":{\"key1\":\"This is test data about housing conditions\"}}}]}";
    Files.writeString(tempFile, minimalGeoJson);
    return tempFile;
  }

  @BeforeEach
  public void setUp() {
    // Get the server port
    int port = Spark.port();
    baseUrl = "http://localhost:" + port;

    // Reset the cache counters before each test
    if (testableCache != null) {
      testableCache.resetCounters();
    }
  }

  @Override
  protected void setupSparkRoutes() {
    // Set up the routes needed for testing
    Spark.get("/get-redlining-data", new GetRedliningData(geoJsonParser, redliningCache));
    Spark.get("/search-redlining", new SearchRedliningAreas(geoJsonParser));

    // Add mock endpoints for pins
    Spark.get(
        "/add-pin",
        (req, res) -> {
          String userId = req.queryParams("userId");
          String pinId = req.queryParams("pinId");
          String latitude = req.queryParams("latitude");
          String longitude = req.queryParams("longitude");
          String timestamp = req.queryParams("timestamp");

          if (userId == null
              || pinId == null
              || latitude == null
              || longitude == null
              || timestamp == null) {
            res.status(400);
            return "{\"result\":\"error\",\"message\":\"Missing required parameters\"}";
          }

          Map<String, Object> pinData = new HashMap<>();
          pinData.put("id", pinId);
          pinData.put("latitude", Double.parseDouble(latitude));
          pinData.put("longitude", Double.parseDouble(longitude));
          pinData.put("userId", userId);
          pinData.put("timestamp", Long.parseLong(timestamp));

          try {
            mockStorage.addDocument(userId, pinId, pinData);
          } catch (Exception e) {
            res.status(500);
            return "{\"result\":\"error\",\"message\":\"" + e.getMessage() + "\"}";
          }

          return "{\"result\":\"success\",\"pin\":" + toJson(pinData) + "}";
        });

    Spark.get(
        "/get-all-pins",
        (req, res) -> {
          try {
            List<Map<String, Object>> allPins = mockStorage.getAllPins();
            return "{\"result\":\"success\",\"pins\":" + toJson(allPins) + "}";
          } catch (Exception e) {
            res.status(500);
            return "{\"result\":\"error\",\"message\":\"" + e.getMessage() + "\"}";
          }
        });

    Spark.get(
        "/drop-pins",
        (req, res) -> {
          String userId = req.queryParams("userId");

          if (userId == null) {
            res.status(400);
            return "{\"result\":\"error\",\"message\":\"Missing required userId parameter\"}";
          }

          try {
            mockStorage.clearUser(userId);
            return "{\"result\":\"success\",\"message\":\"All pins for user "
                + userId
                + " have been cleared\"}";
          } catch (Exception e) {
            res.status(500);
            return "{\"result\":\"error\",\"message\":\"" + e.getMessage() + "\"}";
          }
        });
  }

  private String toJson(Object obj) {
    Moshi moshi = new Moshi.Builder().build();
    JsonAdapter<Object> adapter = moshi.adapter(Object.class);
    return adapter.toJson(obj);
  }

  /** Helper method to make HTTP requests for testing. */
  private Map<String, Object> makeRequest(String endpoint) throws IOException {
    URL requestURL = new URL(baseUrl + endpoint);
    HttpURLConnection clientConnection = (HttpURLConnection) requestURL.openConnection();
    clientConnection.connect();

    int status = clientConnection.getResponseCode();

    // Read the response regardless of status code
    Scanner scanner;
    if (status >= 200 && status < 300) {
      scanner = new Scanner(clientConnection.getInputStream());
    } else {
      scanner = new Scanner(clientConnection.getErrorStream());
    }

    StringBuilder responseBody = new StringBuilder();
    while (scanner.hasNext()) {
      responseBody.append(scanner.nextLine());
    }
    scanner.close();
    clientConnection.disconnect();

    // For error responses in test, we'll just check the status code separately
    if (status != 200) {
      Map<String, Object> errorResponse = new HashMap<>();
      errorResponse.put("status", status);
      errorResponse.put("message", responseBody.toString());
      return errorResponse;
    }

    // Parse the JSON response
    Moshi moshi = new Moshi.Builder().build();
    Type mapType = Types.newParameterizedType(Map.class, String.class, Object.class);
    JsonAdapter<Map<String, Object>> adapter = moshi.adapter(mapType);
    return adapter.fromJson(responseBody.toString());
  }

  @Test
  public void testGetRedliningDataWithBoundingBox() throws IOException {
    // Test the bounding box filtering functionality
    Map<String, Object> response =
        makeRequest("/get-redlining-data?minLat=0.0&minLng=100.0&maxLat=1.0&maxLng=101.0");

    // The test data should be returned when using these coordinates
    assertNotNull(response);
    assertTrue(response.containsKey("features"), "Response should contain features array");

    // Check if the response contains our test data
    List<Map<String, Object>> features = (List<Map<String, Object>>) response.get("features");
    assertFalse(features.isEmpty(), "Features array should not be empty");
  }

  @Test
  public void testSearchRedliningAreas() throws IOException {
    // Test searching for keyword in area descriptions
    Map<String, Object> response = makeRequest("/search-redlining?keyword=housing");

    assertNotNull(response);
    assertEquals("success", response.get("result"), "Search should be successful");
    assertEquals("housing", response.get("keyword"), "Keyword should match");

    // Our test data contains "housing conditions" so it should match
    List<String> matchingFeatures = (List<String>) response.get("matchingFeatures");
    assertNotNull(matchingFeatures, "Should have matchingFeatures field");
    assertFalse(matchingFeatures.isEmpty(), "Should find at least one match");
  }

  @Test
  public void testPinLifecycle() throws IOException {
    // Test adding a pin
    String userId = "testUser123";
    String pinId = "testPin456";
    String addPinEndpoint =
        String.format(
            "/add-pin?userId=%s&pinId=%s&latitude=42.3601&longitude=-71.0589&timestamp=1649673600000",
            userId, pinId);

    Map<String, Object> addResponse = makeRequest(addPinEndpoint);
    assertEquals("success", addResponse.get("result"), "Should successfully add pin");

    // Test getting all pins
    Map<String, Object> getAllResponse = makeRequest("/get-all-pins");
    assertEquals("success", getAllResponse.get("result"), "Should successfully get all pins");

    List<Map<String, Object>> pins = (List<Map<String, Object>>) getAllResponse.get("pins");
    assertNotNull(pins);
    assertFalse(pins.isEmpty(), "Should have at least one pin");

    // Find our test pin
    boolean foundPin = false;
    for (Map<String, Object> pin : pins) {
      if (pin.get("id").equals(pinId)) {
        foundPin = true;
        assertEquals(userId, pin.get("userId"), "Pin should have correct userId");
        assertEquals(
            42.3601, (Double) pin.get("latitude"), 0.0001, "Pin should have correct latitude");
        assertEquals(
            -71.0589, (Double) pin.get("longitude"), 0.0001, "Pin should have correct longitude");
        break;
      }
    }
    assertTrue(foundPin, "Should find our test pin in results");

    // Test dropping pins
    Map<String, Object> dropResponse = makeRequest("/drop-pins?userId=" + userId);
    assertEquals("success", dropResponse.get("result"), "Should successfully drop all pins");

    // Verify pins were dropped
    Map<String, Object> verifyResponse = makeRequest("/get-all-pins");
    List<Map<String, Object>> remainingPins =
        (List<Map<String, Object>>) verifyResponse.get("pins");

    boolean pinStillExists = false;
    for (Map<String, Object> pin : remainingPins) {
      if (pin.get("id").equals(pinId)) {
        pinStillExists = true;
        break;
      }
    }
    assertFalse(pinStillExists, "Pin should have been deleted");
  }

  @Test
  public void testInvalidParameters() throws IOException {
    // Test missing required parameters for add-pin
    try {
      // Only pass userId parameter (missing the other required ones)
      Map<String, Object> response = makeRequest("/add-pin?userId=testUser");
      assertEquals(400, response.get("status"), "Should return 400 for missing parameters");
    } catch (Exception e) {
      // If there's an exception, that's fine too - just make sure we're handling the error
      assertTrue(
          e.getMessage().contains("400") || e.getMessage().contains("Bad Request"),
          "Should get a 400 error for missing parameters");
    }

    // Test missing userId for drop-pins
    try {
      Map<String, Object> response = makeRequest("/drop-pins");
      assertEquals(400, response.get("status"), "Should return 400 for missing userId");
    } catch (Exception e) {
      // If there's an exception, that's fine too - just make sure we're handling the error
      assertTrue(
          e.getMessage().contains("400") || e.getMessage().contains("Bad Request"),
          "Should get a 400 error for missing userId");
    }
  }

  @Test
  public void testCachingFunctionality() throws IOException {
    // Make first request - should be a cache miss
    String boundingBoxQuery = "/get-redlining-data?minLat=0.0&minLng=100.0&maxLat=1.0&maxLng=101.0";
    Map<String, Object> firstResponse = makeRequest(boundingBoxQuery);

    // Verify first request works
    assertNotNull(firstResponse);
    assertTrue(firstResponse.containsKey("features"));

    // There should be one cache miss and no hits yet
    assertEquals(1, testableCache.getCacheMisses(), "First request should be a cache miss");
    assertEquals(0, testableCache.getCacheHits(), "There should be no cache hits yet");

    // Make second identical request - should be a cache hit
    Map<String, Object> secondResponse = makeRequest(boundingBoxQuery);

    // Verify second request returns same data
    assertNotNull(secondResponse);
    assertTrue(secondResponse.containsKey("features"));

    // Verify we got a cache hit on the second request
    assertEquals(1, testableCache.getCacheMisses(), "Cache misses should still be 1");
    assertEquals(1, testableCache.getCacheHits(), "Second request should be a cache hit");

    // Make a request with different parameters - should be another miss
    Map<String, Object> thirdResponse =
        makeRequest("/get-redlining-data?minLat=0.5&minLng=100.5&maxLat=0.8&maxLng=100.8");

    // Verify third request works
    assertNotNull(thirdResponse);
    assertTrue(thirdResponse.containsKey("features"));

    // This should be another cache miss
    assertEquals(2, testableCache.getCacheMisses(), "Third request should be another cache miss");
    assertEquals(1, testableCache.getCacheHits(), "Cache hits should still be 1");
  }

  @Test
  public void testEndToEndWorkflow() throws IOException {
    // STEP 1: Add a pin to the map
    String userId = "endToEndUser";
    String pinId = "endToEndPin";
    Map<String, Object> addResponse =
        makeRequest(
            String.format(
                "/add-pin?userId=%s&pinId=%s&latitude=41.8781&longitude=-87.6298&timestamp=1649673600000",
                userId, pinId));
    assertEquals("success", addResponse.get("result"), "Should successfully add pin");

    // STEP 2: Search for redlining areas with a keyword
    Map<String, Object> searchResponse = makeRequest("/search-redlining?keyword=housing");
    assertEquals("success", searchResponse.get("result"), "Search should be successful");
    List<String> matchingFeatures = (List<String>) searchResponse.get("matchingFeatures");
    assertFalse(matchingFeatures.isEmpty(), "Should find matching features");

    // STEP 3: Get redlining data for a specific bounding box
    Map<String, Object> redliningResponse =
        makeRequest("/get-redlining-data?minLat=0.0&minLng=100.0&maxLat=1.0&maxLng=101.0");
    List<Map<String, Object>> features =
        (List<Map<String, Object>>) redliningResponse.get("features");
    assertFalse(features.isEmpty(), "Should return redlining features");

    // STEP 4: Verify pin is stored by getting all pins
    Map<String, Object> getAllResponse = makeRequest("/get-all-pins");
    List<Map<String, Object>> pins = (List<Map<String, Object>>) getAllResponse.get("pins");

    boolean foundPin = false;
    for (Map<String, Object> pin : pins) {
      if (pin.get("id").equals(pinId)) {
        foundPin = true;
        break;
      }
    }
    assertTrue(foundPin, "End-to-end pin should be retrievable");

    // STEP 5: Clear pins for this user
    Map<String, Object> dropResponse = makeRequest("/drop-pins?userId=" + userId);
    assertEquals("success", dropResponse.get("result"), "Should successfully drop pins");

    // STEP 6: Verify pin is removed
    Map<String, Object> finalCheckResponse = makeRequest("/get-all-pins");
    List<Map<String, Object>> remainingPins =
        (List<Map<String, Object>>) finalCheckResponse.get("pins");

    boolean pinStillExists = false;
    for (Map<String, Object> pin : remainingPins) {
      if (pin.get("id").equals(pinId)) {
        pinStillExists = true;
        break;
      }
    }
    assertFalse(pinStillExists, "Pin should have been removed in end-to-end test");
  }
}
