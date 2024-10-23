// // First file: ~/config/firebase.ts
// import { initializeApp, getApp, getApps } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

// // Initialize Firebase
// const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const db = getFirestore(app);
// const auth = getAuth(app);

// export { app, db, auth };

// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyDebV3bmGhwhq10XramZh9rJrawx8n17XI",
//   authDomain: "nvc-dev-c2735.firebaseapp.com",
//   projectId: "nvc-dev-c2735",
//   storageBucket: "nvc-dev-c2735.appspot.com",
//   messagingSenderId: "409641438048",
//   appId: "1:409641438048:web:f106738f21bebf852eec05",
//   measurementId: "G-F3KMHLRL3F"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
