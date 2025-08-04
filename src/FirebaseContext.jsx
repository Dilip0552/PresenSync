// src/FirebaseContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, loadModels } from './firebase';
import Spinner from './Spinner'; // Make sure you have a Spinner component

// Create the context
const FirebaseContext = createContext(null);

// Custom hook to easily use the context
export const useFirebase = () => useContext(FirebaseContext);

// The provider component that wraps your app
export const FirebaseProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    // 1. Load the face-api.js models
    const initializeModels = async () => {
      try {
        await loadModels();
        setModelsLoading(false);
      } catch (error) {
        console.error("Error loading face-api models:", error);
        // Handle model loading failure if necessary
        setModelsLoading(false); // Still stop loading to not block the app
      }
    };
    
    initializeModels();

    // 2. Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
        } else {
          setUserData(null); // Handle case where user exists in auth but not firestore
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setAuthLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // The value that will be supplied to all consuming components
  const value = {
    user,
    userData,
    setUserData, // Allow components to update user data state if needed
    loading: authLoading || modelsLoading, // Combined loading state
    modelsLoaded: !modelsLoading,
  };

  // Show a full-screen loader until both auth and models are ready
  if (authLoading || modelsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Spinner />
        <p className="mt-4 text-gray-600">
          {authLoading ? "Authenticating..." : "Loading recognition models..."}
        </p>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};
