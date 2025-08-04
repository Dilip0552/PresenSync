import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'; // Import setDoc

// Create the Firebase Context
const FirebaseContext = createContext(null);

// Custom hook to use the Firebase context
export const useFirebase = () => useContext(FirebaseContext);

// Firebase Provider component
export const FirebaseProvider = ({ children }) => {
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [idToken, setIdToken] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                const firebaseConfig = {
                    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                    appId: import.meta.env.VITE_FIREBASE_APP_ID,
                };

                const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

                const firebaseApp = initializeApp(firebaseConfig);
                setApp(firebaseApp);

                const firestoreDb = getFirestore(firebaseApp);
                setDb(firestoreDb);

                const firebaseAuth = getAuth(firebaseApp);
                setAuth(firebaseAuth);

                await setPersistence(firebaseAuth, browserLocalPersistence);

                const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                        const token = await user.getIdToken();
                        setIdToken(token);

                        // Ensure user profile documents exist (private and public)
                        const privateUserProfileRef = doc(firestoreDb, `artifacts/${appId}/users/${user.uid}/profile`, 'userProfile');
                        const publicUserProfileRef = doc(firestoreDb, `artifacts/${appId}/public/data/allUserProfiles`, user.uid);

                        const privateUserDocSnap = await getDoc(privateUserProfileRef);
                        const publicUserDocSnap = await getDoc(publicUserProfileRef);

                        // If either profile document is missing, create/update it
                        if (!privateUserDocSnap.exists() || !publicUserDocSnap.exists()) {
                            const initialProfileData = {
                                uid: user.uid,
                                email: user.email || null,
                                displayName: user.displayName || `User-${user.uid.substring(0, 6)}`,
                                fullName: user.displayName || `User-${user.uid.substring(0, 6)}`, // Ensure fullName is set
                                role: 'student', // Default to student if profile is being created by FirebaseContext
                                createdAt: new Date().toISOString(),
                            };

                            // Use setDoc with merge:true to create if not exists, or update if it does
                            if (!privateUserDocSnap.exists()) {
                                await setDoc(privateUserProfileRef, initialProfileData, { merge: true });
                            }
                            if (!publicUserDocSnap.exists()) {
                                await setDoc(publicUserProfileRef, initialProfileData, { merge: true });
                            }
                        }
                    } else {
                        setUserId(null);
                        setIdToken(null);
                    }
                    setLoadingAuth(false);
                });

                return () => unsubscribe();

            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setLoadingAuth(false);
            }
        };

        initializeFirebase();
    }, []);

    return (
        <FirebaseContext.Provider value={{ app, db, auth, userId, idToken, loadingAuth }}>
            {children}
        </FirebaseContext.Provider>
    );
};
