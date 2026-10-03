import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { claimAnalyses } from '../lib/anonymousSession'

const AuthContext = createContext(null)

const missingSupabase = { data: null, error: new Error('Supabase is not configured') }

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(supabase ? undefined : null) // undefined = loading
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    if (!supabase) return missingSupabase
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error) await claimAnalyses()   // rattache les analyses anonymes
    return { data, error }
  }

  const signIn = async (email, password) => {
    if (!supabase) return missingSupabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) await claimAnalyses()
    return { data, error }
  }

  const signOut = () => (supabase ? supabase.auth.signOut() : Promise.resolve())

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
