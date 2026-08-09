package com.macsense.ai.sync

/**
 * Supplies the authenticated user's Supabase access token at runtime.
 *
 * Cloud sync needs three things: the project URL, the public anon key, and a token proving
 * *which user* is writing. The first two are build configuration and are safe to compile in.
 * The third is a per-user credential and must never be baked into the APK — a token embedded
 * at build time belongs to whoever ran the build, is shared by every install, cannot be
 * revoked or refreshed, and is readable by anyone who unzips the artifact.
 *
 * MA¢SENSE has no user login yet, so [currentAccessToken] returns null and every install runs
 * local-only. This is a deliberate fail-closed default: it is better for sync to be visibly
 * unavailable than for it to appear to work while writing every user's projects into one
 * shared cloud identity.
 *
 * To enable sync, a real authentication flow must set [session] with a short-lived token and
 * clear it on sign-out or refresh failure. Nothing else about the sync engine needs to change.
 */
object SupabaseSessionProvider {

    /** An authenticated user session. [accessToken] is expected to be short-lived. */
    data class Session(val userId: String, val accessToken: String)

    @Volatile
    private var session: Session? = null

    /** Records an authenticated session. Called by the sign-in flow once it exists. */
    fun setSession(newSession: Session) {
        session = newSession
    }

    /** Clears the session on sign-out, token-refresh failure, or revocation. */
    fun clearSession() {
        session = null
    }

    /** The current user's access token, or null when no one is signed in (local-only mode). */
    fun currentAccessToken(): String? = session?.accessToken?.takeIf { it.isNotBlank() }

    /** True when a real authenticated session is available for cloud writes. */
    fun hasSession(): Boolean = currentAccessToken() != null
}
