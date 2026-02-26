import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { View, Text, ActivityIndicator } from 'react-native';

export interface AuthContextType {
  isLoggedIn: boolean;
  user: FirebaseAuthTypes.User | null; // Access name, email, photo
  logout: () => Promise<void>;
  initializing: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  // Handle user state changes
  function onAuthStateChanged(user: FirebaseAuthTypes.User | null) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    // This is the "Heartbeat" listener
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  const logout = async () => {
    try {
      await GoogleSignin.signOut(); // Sign out of Google
      await auth().signOut();       // Sign out of Firebase
    } catch (error) {
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
return (
  <AuthContext.Provider value={value}>
    {children} 
  </AuthContext.Provider>
);
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};