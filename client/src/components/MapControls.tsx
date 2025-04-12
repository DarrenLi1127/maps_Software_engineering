/**
 * This file was adjusted with assistance of Claude 3.7 Sonnet (Anthropic, 2025).
 */

import React from 'react';
import { BoundingBoxInputs, DetailedSearchResult } from './Mapbox';
import { MapUtils } from './MapUtils';
import '../styles/MapControls.css';

interface MapControlsProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  boundingBox: GeoJSON.Feature | null;
  searchResults: string[];
  resetView: () => Promise<void>;
  handleClearMyPins: () => Promise<void>;
  isLoading: boolean;
  overlay: GeoJSON.FeatureCollection | undefined;
  searchResultsCount: number | null;
  searchKeyword: string;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearch: (e?: React.FormEvent) => Promise<void>;
  clearSearch: () => void;
  showSearchResults: boolean;
  detailedResults: DetailedSearchResult[];
  selectedResult: string | null;
  focusOnResult: (resultId: string) => void;
  inputs: BoundingBoxInputs;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyFilter: (e?: React.FormEvent) => Promise<void>;
}

const MapControls: React.FC<MapControlsProps> = ({
                                                   showForm,
                                                   setShowForm,
                                                   boundingBox,
                                                   searchResults,
                                                   resetView,
                                                   handleClearMyPins,
                                                   isLoading,
                                                   overlay,
                                                   searchResultsCount,
                                                   searchKeyword,
                                                   handleSearchChange,
                                                   handleSearch,
                                                   clearSearch,
                                                   showSearchResults,
                                                   detailedResults,
                                                   selectedResult,
                                                   focusOnResult,
                                                   inputs,
                                                   handleInputChange,
                                                   applyFilter
                                                 }) => {
  return (
      <div className="map-controls">
        {/* Control buttons */}
        <div className="button-row">
          <div className="button-group">
            <button
                onClick={() => setShowForm(!showForm)}
                className="btn btn-primary"
            >
              {showForm ? "Hide Filter" : "Filter"}
            </button>

            {(boundingBox || searchResults.length > 0) && (
                <button
                    onClick={resetView}
                    className="btn btn-secondary"
                >
                  Reset
                </button>
            )}

            <button
                onClick={handleClearMyPins}
                disabled={isLoading}
                className="btn btn-warning"
            >
              Clear Pins
            </button>
          </div>
          {/* Right-aligned search with dropdown */}
          <div className="controls-layout">
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <input
                    type="text"
                    value={searchKeyword}
                    onChange={handleSearchChange}
                    placeholder="Search area descriptions..."
                    className="search-input"
                />
                <button
                    type="submit"
                    className="btn btn-search"
                >
                  Search
                </button>
                {searchResults.length > 0 && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="btn btn-danger"
                    >
                      Clear
                    </button>
                )}
              </form>

              {/* Dropdown Results */}
              {showSearchResults && detailedResults.length > 0 && (
                  <div className="results-dropdown">
                    <h3 className="results-title">
                      Results for "{searchKeyword}" ({detailedResults.length})
                    </h3>
                    <div className="results-list">
                      {detailedResults.map((result, index) => (
                          <div
                              key={`${result.id}-${index}`}
                              onClick={() => focusOnResult(result.id)}
                              className={`result-item ${selectedResult === result.id ? 'selected' : ''}`}
                          >
                            <div
                                className="grade-indicator"
                                style={{
                                  backgroundColor: MapUtils.getGradeColor(result.grade)
                                }}
                            />
                            <div className="result-content">
                              <div className="result-name">Area {index}</div>
                              <div className="result-meta">
                                {result.city} • Grade {result.grade}
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              <p className="search-hint">
                Search for keywords in area descriptions
              </p>
            </div>
          </div>
        </div>


        {/* Coordinate input form */}
        {showForm && (
            <div className="filter-form-container">
              <form onSubmit={applyFilter} className="filter-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Min Latitude:</label>
                    <input
                        type="text"
                        name="minLat"
                        value={inputs.minLat}
                        onChange={handleInputChange}
                        className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Min Longitude:</label>
                    <input
                        type="text"
                        name="minLng"
                        value={inputs.minLng}
                        onChange={handleInputChange}
                        className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Latitude:</label>
                    <input
                        type="text"
                        name="maxLat"
                        value={inputs.maxLat}
                        onChange={handleInputChange}
                        className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Longitude:</label>
                    <input
                        type="text"
                        name="maxLng"
                        value={inputs.maxLng}
                        onChange={handleInputChange}
                        className="form-input"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-apply">
                  Apply Filter
                </button>
              </form>
            </div>
        )}
      </div>
  );
};

export default MapControls;