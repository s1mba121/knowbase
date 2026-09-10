import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  humanizeAuthUrlError,
  readAuthUrlError,
  stripAuthUrlError,
} from '../lib/auth-url-error'

/** Catch Supabase Auth errors in the URL hash/query and send the user to /auth with a message. */
export function AuthUrlErrorHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const err = readAuthUrlError()
    if (!err) return

    const message = humanizeAuthUrlError(err)
    const cleaned = stripAuthUrlError(window.location.href)
    window.history.replaceState({}, '', cleaned)
    navigate(`/auth?error=${encodeURIComponent(message)}`, { replace: true })
  }, [navigate])

  return null
}
