import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Revisar si hay una sesión guardada al abrir la app
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // 2. Escuchar cambios en tiempo real (cuando se registra o cierra sesión)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string) => {
        // Se removió 'data' ya que solo evaluamos 'error'
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            alert(`Error: ${error.message}`);
            return false;
        }
        return true;
    };

    const signIn = async (email: string, password: string) => {
        // Se removió 'data' ya que solo evaluamos 'error'
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(`Error al iniciar sesión: ${error.message}`);
            return false;
        }
        return true;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);