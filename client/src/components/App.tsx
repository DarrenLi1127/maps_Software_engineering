import { initializeApp } from "firebase/app";
import "../styles/App.css";
import MapsGearup from "./MapsGearup";
import { useEffect } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton,
} from "@clerk/clerk-react";
import { loadPinsFromStorage } from "./pinType";

// REMEMBER TO PUT YOUR API KEY IN A FOLDER THAT IS GITIGNORED!!
// (for instance, /src/private/api_key.tsx)
// import {API_KEY} from "./private/api_key"

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};

initializeApp(firebaseConfig);

function App() {
  // Load pins from localStorage on app initialization
  useEffect(() => {
    loadPinsFromStorage();
  }, []);

  return (
      <div className="App">
        {/* @ts-ignore - Clerk component typing issue */}
        <SignedOut>
          <div className="sign-in-container">
            <h1>Redlining Map Visualization</h1>
            <p>Please sign in to view and interact with the map</p>
            <SignInButton mode="modal" />
          </div>
        </SignedOut>

        {/* @ts-ignore - Clerk component typing issue */}
        <SignedIn>
          <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
              }}
          >
            <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 20px",
                  backgroundColor: "#f0f2f5",
                  borderBottom: "1px solid #ddd",
                }}
            >
              <h2 style={{ margin: 0 }}>Redlining Map</h2>
              <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
              >
                <UserButton />
                <SignOutButton />
              </div>
            </div>
            <MapsGearup />
          </div>
        </SignedIn>
      </div>
  );
}

export default App;