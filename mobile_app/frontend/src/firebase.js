import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAulABGFuaX1OYFnE4ffYuA-NksFiIZEFE",
  authDomain: "ridit1-396d3.firebaseapp.com",
  databaseURL: "https://ridit1-396d3-default-rtdb.firebaseio.com",
  projectId: "ridit1-396d3",
  storageBucket: "ridit1-396d3.firebasestorage.app",
  messagingSenderId: "215152595541",
  appId: "1:215152595541:web:a05c603c71bb271daebadc",
  measurementId: "G-7V85E8Z5SM"
};

// Validate config has required fields
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error("Firebase config incomplete. Required fields missing:", {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: !!firebaseConfig.authDomain,
    projectId: !!firebaseConfig.projectId
  });
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  console.error("Firebase app initialization failed:", err.message);
  throw err;
}

let auth;
try {
  auth = getAuth(app);
  if (!auth) throw new Error("getAuth() returned null or undefined");
} catch (err) {
  console.error("Firebase auth initialization failed:", err.message);
  throw err;
}

let storage;
try {
  storage = getStorage(app);
  if (!storage) throw new Error("getStorage() returned null or undefined");
} catch (err) {
  console.error("Firebase storage initialization failed:", err.message);
  throw err;
}

export { auth, storage };
