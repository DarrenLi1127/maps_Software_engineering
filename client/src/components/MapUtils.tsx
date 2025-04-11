import React from 'react';

/**
 * Utility functions for the map component
 */
export class MapUtils {
  /**
   * Get color for HOLC grade
   */
  public static getGradeColor(grade: string): string {
    switch(grade.toUpperCase()) {
      case 'A': return '#5bcc04'; // Green
      case 'B': return '#04b8cc'; // Blue
      case 'C': return '#e9ed0e'; // Yellow
      case 'D': return '#d11d1d'; // Red
      default: return '#ccc';
    }
  }

  /**
   * Calculate appropriate zoom level based on bounding box size
   */
  public static calculateZoomLevel(minLat: number, minLng: number, maxLat: number, maxLng: number): number {
    const latDiff = Math.abs(maxLat - minLat);
    const lngDiff = Math.abs(maxLng - minLng);
    const maxDiff = Math.max(latDiff, lngDiff);

    // Rough estimation - adjust as needed
    if (maxDiff > 5) return 5;
    if (maxDiff > 2) return 7;
    if (maxDiff > 1) return 9;
    if (maxDiff > 0.5) return 10;
    if (maxDiff > 0.1) return 12;
    return 14;
  }

  /**
   * Format DateTime for pin popup
   */
  public static formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Create loading spinner component
   */
  public static LoadingSpinner: React.FC = () => (
      <div className="loading-spinner" style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        Loading...
      </div>
  );
}