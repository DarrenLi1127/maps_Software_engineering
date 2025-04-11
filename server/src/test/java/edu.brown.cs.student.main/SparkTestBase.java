package edu.brown.cs.student.main;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import spark.Spark;

/**
 * Abstract base class for Spark server tests. Handles the common setup and teardown of Spark server
 * for testing.
 */
public abstract class SparkTestBase {

  @BeforeAll
  public static void setupBeforeEverything() {
    Spark.stop(); // Stop any existing server
  }

  @BeforeEach
  public void setupEach() {
    // Stop and reset Spark
    Spark.stop();
    Spark.awaitStop();

    // Configure Spark
    Spark.port(0); // random port

    // Call child class setup
    setupSparkRoutes();

    // Start Spark
    Spark.init();
    Spark.awaitInitialization();
  }

  @AfterEach
  public void teardownEach() {
    // Stop Spark
    Spark.stop();
    Spark.awaitStop();
  }

  // Child classes must implement this to set up their routes
  protected abstract void setupSparkRoutes();
}
