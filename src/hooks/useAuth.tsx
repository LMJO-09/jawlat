import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  isTimedOut: boolean;
  restrictedSections: string[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isModerator: false,
  isSuperAdmin: false,
  isTimedOut: false,
  restrictedSections: [],
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = ['abdalrhmanmaaith1@gmail.com', 'abdalrhmanmaaith24@gmail.com'];
  const SUPER_ADMIN_EMAIL = 'abdalrhmanmaaith24@gmail.com';

  // Connection test & Persistence
  useEffect(() => {
    const init = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        console.error("Auth init error:", error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Subscribe to profile changes
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: any = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || '',
              role: (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email)) ? 'admin' : 'user',
              isBlocked: false,
              restrictedActions: [],
              restrictedSections: [],
              hasFlame: false,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            };
            try {
              // Only set if it still doesn't exist to avoid theoretical races
              await setDoc(profileRef, newProfile, { merge: true });
              // Snapshot will handle setting the profile state
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });

        // Update last login
        updateDoc(profileRef, { lastLogin: serverTimestamp() }).catch(() => {});

        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const isAdmin = profile?.role === 'admin' || (user?.email ? ADMIN_EMAILS.includes(user.email) : false);
  const isModerator = isAdmin || profile?.role === 'moderator';
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  
  const restrictedSections = profile?.restrictedSections || [];
  const isTimedOut = !!(profile?.timeoutUntil && (
    profile.timeoutUntil?.toDate ? profile.timeoutUntil.toDate() > new Date() : new Date(profile.timeoutUntil) > new Date()
  ));

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isModerator, isSuperAdmin, isTimedOut, restrictedSections }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
