package edu.brown.cs.student.main.server.geoJson;

import java.util.List;
import java.util.Map;

/**
 * This class represents the GeoJSON data structure. It contains a list of features, each with
 * geometry and properties.
 */
public class GeoJsonObject {
  public String type;
  public List<Feature> features;

  public static class Feature {
    public String type;
    public Geometry geometry;
    public Properties properties;
  }

  public static class Geometry {
    public String type;
    // Coordinates structure for MultiPolygon:
    // MultiPolygon -> Polygon -> LinearRing -> Point (longitude, latitude)
    public List<List<List<List<Double>>>> coordinates;
  }

  public static class Properties {
    public String city;
    public String holc_grade;
    public Map<String, String> area_description_data;
  }
}
