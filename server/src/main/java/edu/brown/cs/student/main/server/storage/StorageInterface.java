package edu.brown.cs.student.main.server.storage;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

public interface StorageInterface {
  void addDocument(String userId, String pinId, Map<String, Object> data)
      throws ExecutionException, InterruptedException;

  List<Map<String, Object>> getAllPins() throws ExecutionException, InterruptedException;

  void clearUser(String userId) throws ExecutionException, InterruptedException;
}
