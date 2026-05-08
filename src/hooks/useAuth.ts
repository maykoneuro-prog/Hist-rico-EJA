import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { userService } from '../services/db';
import { AppUser } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const profile = await userService.syncProfile(u);
        setAppUser(profile || null);
      } else {
        setUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, appUser, loading };
}
