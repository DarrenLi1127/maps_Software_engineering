package edu.brown.cs.student.main.server.storage;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

public class FirebaseUtilities implements StorageInterface {
  private Firestore firestore;

  public FirebaseUtilities() throws IOException {
    // Get the current working directory
    String workingDirectory = System.getProperty("user.dir");

    // Create the path to the firebase config file
    Path firebaseConfigPath =
        Paths.get(workingDirectory, "src", "main", "resources", "firebase_config.json");

    System.out.println("Looking for Firebase config at: " + firebaseConfigPath.toString());

    try {
      // Initialize Firebase with credentials
      FileInputStream serviceAccount = new FileInputStream(firebaseConfigPath.toFile());

      FirebaseOptions options =
          new FirebaseOptions.Builder()
              .setCredentials(GoogleCredentials.fromStream(serviceAccount))
              .build();

      if (FirebaseApp.getApps().isEmpty()) {
        FirebaseApp.initializeApp(options);
      }

      this.firestore = FirestoreClient.getFirestore();
      System.out.println(
          "Successfully initialized Firebase with config from: " + firebaseConfigPath.toString());

    } catch (IOException e) {
      System.err.println(
          "Error: Could not find or load Firebase config from: " + firebaseConfigPath.toString());
      System.err.println("Current working directory: " + workingDirectory);
      throw e;
    }
  }

  @Override
  public void addDocument(String userId, String collectionName, Map<String, Object> data)
      throws ExecutionException, InterruptedException {
    // Generate a new document ID if not provided
    String documentId =
        data.containsKey("id")
            ? (String) data.get("id")
            : "pin_" + UUID.randomUUID().toString().replace("-", "");

    // Store pins directly in a "pins" collection for simplified structure
    DocumentReference docRef = firestore.collection("pins").document(documentId);

    // Ensure userId is in the data
    if (!data.containsKey("userId")) {
      data.put("userId", userId);
    }

    // Ensure id is in the data
    if (!data.containsKey("id")) {
      data.put("id", documentId);
    }

    docRef.set(data).get();
  }

  @Override
  public List<Map<String, Object>> getAllPins() throws ExecutionException, InterruptedException {
    List<Map<String, Object>> allPins = new ArrayList<>();
    List<QueryDocumentSnapshot> documents = firestore.collection("pins").get().get().getDocuments();

    for (QueryDocumentSnapshot document : documents) {
      Map<String, Object> pinData = document.getData();
      // Ensure the ID is included in the data
      if (!pinData.containsKey("id")) {
        pinData.put("id", document.getId());
      }
      allPins.add(pinData);
    }

    return allPins;
  }

  @Override
  public void clearUser(String userId) throws ExecutionException, InterruptedException {
    // Get all pins for the user from the flattened structure
    List<QueryDocumentSnapshot> documents =
        firestore.collection("pins").whereEqualTo("userId", userId).get().get().getDocuments();

    // Delete each document
    for (QueryDocumentSnapshot document : documents) {
      document.getReference().delete().get();
    }
  }
}
