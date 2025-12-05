import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAsuhQpozAApkknqUZAShXO6IrRQLnoHXI",
  authDomain: "dsm-play-6667b.firebaseapp.com",
  projectId: "dsm-play-6667b",
  storageBucket: "dsm-play-6667b.firebasestorage.app",
  messagingSenderId: "265498895416",
  appId: "1:265498895416:web:9f4912ffc3abb4098232cd",
  measurementId: "G-YH63FG2GTZ"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 데이터베이스 인스턴스
export const db = getFirestore(app);