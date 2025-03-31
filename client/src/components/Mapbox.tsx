import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState } from "react";
import Map, {
  Layer,
  MapLayerMouseEvent,
  Source,
  ViewStateChangeEvent,
} from "react-map-gl";
import { geoLayer, overlayData } from "../utils/overlay";

const MAPBOX_API_KEY = process.env.MAPBOX_TOKEN;
if (!MAPBOX_API_KEY) {
  console.error("Mapbox API key not found. Please add it to your .env file.");
}

export interface LatLong {
  lat: number;
  long: number;
}

// TODO: MAPS PART 1:
// - fill out starting map state and add to viewState
//
// const ProvidenceLatLong: LatLong = {
//   ...
// };
// const initialZoom = ...


function onMapClick(e: MapLayerMouseEvent) {
  console.log(e.lngLat.lat);
  console.log(e.lngLat.lng);
}

export default function Mapbox() {
  const [viewState, setViewState] = useState({

    // ...
  });

  // TODO: MAPS PART 5:
  // - add the overlay useState
  // - implement the useEffect to fetch the overlay data


  return (
    <div className="map">
      <Map
        mapboxAccessToken={MAPBOX_API_KEY}
        {...viewState}
      // TODO: MAPS PART 2:
      // - add the primary props to the Map (style, mapStyle, onMove).

      // style=...
      // mapStyle=...
      // onMove=...

      // TODO: MAPS PART 3:
      // - add the onClick handler

      // onClick=...
      >
        {/* TODO: MAPS PART 6:
            - add the Source and Layer components to the Map that take in data "overlay"
            TODO: MAPS PART 7:
            - add the geoLayer to the Layer component
        */}
      </Map>
    </div>
  );
}