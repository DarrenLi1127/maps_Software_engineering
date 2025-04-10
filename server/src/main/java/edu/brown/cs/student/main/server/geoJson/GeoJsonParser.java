package edu.brown.cs.student.main.server.geoJson;

import com.squareup.moshi.JsonAdapter;
import com.squareup.moshi.Moshi;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Path;

/** Parser for GeoJSON data. */
public class GeoJsonParser {
  private final Path filePath;
  private GeoJsonObject geoJsonData;
  private final Moshi moshi;
  private final JsonAdapter<GeoJsonObject> adapter;

  /**
   * Constructor for the GeoJsonParser.
   *
   * @param filePath Path to the GeoJSON file
   */
  public GeoJsonParser(Path filePath) {
    this.filePath = filePath;
    this.moshi = new Moshi.Builder().build();
    this.adapter = moshi.adapter(GeoJsonObject.class);
    this.loadData();
  }

  /** Load the GeoJSON data from the file. */
  private void loadData() {
    try {
      // Read the file content
      FileReader jsonReader = new FileReader(filePath.toFile());
      BufferedReader br = new BufferedReader(jsonReader);
      StringBuilder fileStringBuilder = new StringBuilder();
      String line;
      while ((line = br.readLine()) != null) {
        fileStringBuilder.append(line);
      }
      jsonReader.close();

      // Parse JSON to GeoJsonObject
      String fileString = fileStringBuilder.toString();
      this.geoJsonData = adapter.fromJson(fileString);

      System.out.println(
          "Successfully loaded GeoJSON data with "
              + (geoJsonData != null && geoJsonData.features != null
                  ? geoJsonData.features.size()
                  : 0)
              + " features");
    } catch (IOException e) {
      System.err.println("Error loading GeoJSON data: " + e.getMessage());
      e.printStackTrace();
      this.geoJsonData = new GeoJsonObject();
      this.geoJsonData.features = java.util.Collections.emptyList();
    }
  }

  /**
   * Get the GeoJSON data.
   *
   * @return The GeoJSON data
   */
  public GeoJsonObject getData() {
    return this.geoJsonData;
  }

  /**
   * Convert a GeoJsonObject to a JSON string.
   *
   * @param data The GeoJsonObject to convert
   * @return JSON string representation
   */
  public String toJson(GeoJsonObject data) {
    return adapter.toJson(data);
  }
}
