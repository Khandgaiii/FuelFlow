import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { getApp } from '@react-native-firebase/app';
import {
  FirebaseAuthTypes,
  getAuth,
  onAuthStateChanged,
  signOut,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface AuthContextType {
  isLoggedIn: boolean;
  user: FirebaseAuthTypes.User | null; // Access name, email, photo
  logout: () => Promise<void>;
  initializing: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const firebaseAuth = getAuth(getApp());

  // Handle user state changes
  const handleAuthStateChanged = useCallback(
    (currentUser: FirebaseAuthTypes.User | null) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    },
    [initializing],
  );

  useEffect(() => {
    const subscriber = onAuthStateChanged(firebaseAuth, handleAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, [firebaseAuth, handleAuthStateChanged]);

  const logout = async () => {
    try {
      const hasGoogleSession = await GoogleSignin.hasPreviousSignIn();
      if (hasGoogleSession) {
        await GoogleSignin.signOut(); // Sign out of Google if session exists
      }

      // Firebase throws auth/no-current-user when already signed out.
      if (firebaseAuth.currentUser) {
        await signOut(firebaseAuth);
      }
    } catch (error: any) {
      if (error?.code === 'auth/no-current-user') {
        return;
      }
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    isLoggedIn: !!user, // Automatically true if user exists
    user,
    logout,
    initializing,
  };

  // Force it to show children even if initializing is true
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
