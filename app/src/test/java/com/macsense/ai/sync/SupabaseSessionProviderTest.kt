package com.macsense.ai.sync

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The session provider is the only path by which a user token can reach the sync engine.
 * These tests pin the fail-closed default: with no sign-in, there is no token, so cloud
 * sync stays unavailable rather than silently writing to a shared identity.
 */
class SupabaseSessionProviderTest {

    @After
    fun tearDown() {
        SupabaseSessionProvider.clearSession()
    }

    @Test
    fun `no session by default so the install is local-only`() {
        SupabaseSessionProvider.clearSession()

        assertNull(SupabaseSessionProvider.currentAccessToken())
        assertFalse(SupabaseSessionProvider.hasSession())
    }

    @Test
    fun `a signed-in session exposes its access token`() {
        SupabaseSessionProvider.setSession(
            SupabaseSessionProvider.Session(userId = "user-1", accessToken = "real-token"),
        )

        assertEquals("real-token", SupabaseSessionProvider.currentAccessToken())
        assertTrue(SupabaseSessionProvider.hasSession())
    }

    @Test
    fun `a blank token is treated as no session`() {
        SupabaseSessionProvider.setSession(
            SupabaseSessionProvider.Session(userId = "user-1", accessToken = "   "),
        )

        assertNull(SupabaseSessionProvider.currentAccessToken())
        assertFalse(SupabaseSessionProvider.hasSession())
    }

    @Test
    fun `sign-out revokes access immediately`() {
        SupabaseSessionProvider.setSession(
            SupabaseSessionProvider.Session(userId = "user-1", accessToken = "real-token"),
        )
        SupabaseSessionProvider.clearSession()

        assertNull(SupabaseSessionProvider.currentAccessToken())
        assertFalse(SupabaseSessionProvider.hasSession())
    }

    @Test
    fun `a token from the provider still has to pass config validation`() {
        // A runtime token is necessary but not sufficient: the project URL and key are
        // validated too, so a token alone cannot switch on sync in a misconfigured build.
        val validation = SupabaseSyncConfiguration.validate(
            baseUrl = "",
            anonKey = "",
            userAccessToken = "real-token",
        )

        assertFalse(validation.isConfigured)
    }
}
