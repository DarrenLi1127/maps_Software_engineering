import Mapbox from "./Mapbox";
import "../styles/Map.css";
import { useUser } from "@clerk/clerk-react";

export default function MapsGearup() {
  const { user } = useUser();

  return (
      <div className="maps-gearup">
        <header className="maps-header">
          <h1 aria-label="Map Title">Redlining Map</h1>
          {user && (
              <p className="user-welcome">
                Welcome, {user.firstName || "User"}! Click on the map to add a pin.
              </p>
          )}
        </header>
        <Mapbox />
      </div>
  );
}
