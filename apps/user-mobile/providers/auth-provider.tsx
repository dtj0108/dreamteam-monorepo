import { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

export interface SignupData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Suppress onAuthStateChange during initialization to prevent transient
  // SIGNED_OUT events (caused by refresh token races) from flickering state.
  const isInitializingRef = useRef(true);

  useEffect(() => {
    // Get initial session and validate it's still usable
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Validate the stored session — getSession() only reads from memory,
        // so the token may be expired. getUser() makes a network call that
        // will attempt to refresh the token if needed.
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          // Only sign out on auth-specific errors (invalid/expired refresh token).
          // Transient network errors should NOT clear the session — the user may
          // still have a valid refresh token that will work on the next attempt.
          const isAuthError = error?.status === 401 || error?.status === 403;
          if (isAuthError) {
            console.log("[AuthProvider] Session expired, clearing:", error?.message);
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
            setUser(null);
          } else {
            // Non-auth error (network timeout, server error, etc.) — trust the
            // stored session and let Supabase's autoRefreshToken handle renewal.
            console.log("[AuthProvider] getUser non-auth error, keeping session:", error?.message);
            setSession(session);
            setUser(session.user);
          }
        } else {
          // Re-read session to get potentially refreshed tokens.
          // getUser() may have triggered a token refresh, so the original
          // captured `session` variable is stale.
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setSession(currentSession);
          setUser(user);
        }
      } else {
        setSession(null);
        setUser(null);
      }
      isInitializingRef.current = false;
      setIsLoading(false);
    }).catch((error) => {
      console.error("Error getting session:", error);
      isInitializingRef.current = false;
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthProvider] onAuthStateChange:", event);
      // During initialization, getUser() may trigger transient SIGNED_OUT events
      // from refresh token races. Ignore auth state changes until init completes.
      if (isInitializingRef.current) return;
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: data.phone,
          company_name: data.companyName,
        },
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    login,
    signup,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

