package com.macsense.ai.api

import com.macsense.ai.telemetry.AppLogger
import kotlinx.coroutines.delay
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.Path
import retrofit2.http.POST
import java.io.IOException
import java.util.concurrent.TimeUnit

@Serializable
data class GenerateContentRequest(
    val contents: List<Content>,
    val generationConfig: GenerationConfig? = null,
    val systemInstruction: Content? = null
)

@Serializable
data class Content(
    val role: String? = null,
    val parts: List<Part>
)

@Serializable
data class Part(
    val text: String? = null
)

@Serializable
data class GenerationConfig(
    val temperature: Float? = null,
    val topP: Float? = null,
    val maxOutputTokens: Int? = null
)

@Serializable
data class GenerateContentResponse(
    val candidates: List<Candidate>? = null
)

@Serializable
data class Candidate(
    val content: Content? = null
)

interface GeminiApiService {
    // The API key is now sent as a request header (x-goog-api-key) instead of a URL query
    // parameter. Query parameters are logged by proxies, CDNs, and server access logs far
    // more often than headers, so this meaningfully reduces the chance of key exposure.
    @POST("v1beta/models/{model}:generateContent")
    suspend fun generateContent(
        @Path("model") model: String,
        @Header("x-goog-api-key") apiKey: String,
        @Body request: GenerateContentRequest
    ): GenerateContentResponse
}

/**
 * Redacts the x-goog-api-key header from OkHttp logs so the raw secret never lands in
 * Logcat, crash breadcrumbs, or any log aggregator connected to AppLogger.
 */
private class RedactApiKeyInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val hasKey = request.header("x-goog-api-key") != null
        if (hasKey) {
            AppLogger.d("GeminiApi", "-> ${request.method} ${request.url.encodedPath} (api key header redacted)")
        }
        return chain.proceed(request)
    }
}

/**
 * Retries transient failures (timeouts, 5xx, connectivity blips) with exponential backoff
 * before giving up. Client errors (4xx other than 429) are not retried since retrying a
 * malformed request will never succeed.
 */
private class RetryInterceptor(
    private val maxRetries: Int = 3,
    private val initialBackoffMs: Long = 500
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var attempt = 0
        var lastException: IOException? = null
        while (attempt <= maxRetries) {
            try {
                val response = chain.proceed(chain.request())
                val shouldRetry = response.code == 429 || response.code >= 500
                if (!shouldRetry || attempt == maxRetries) {
                    if (attempt > 0) {
                        AppLogger.i("GeminiApi", "Request succeeded after $attempt retr${if (attempt == 1) "y" else "ies"}")
                    }
                    return response
                }
                AppLogger.w("GeminiApi", "Retryable HTTP ${response.code} on attempt ${attempt + 1}/$maxRetries")
                response.close()
            } catch (e: IOException) {
                lastException = e
                AppLogger.w("GeminiApi", "Network error on attempt ${attempt + 1}/$maxRetries: ${e.message}")
                if (attempt == maxRetries) throw e
            }
            val backoffMs = initialBackoffMs * (1L shl attempt)
            try {
                Thread.sleep(backoffMs)
            } catch (interrupted: InterruptedException) {
                Thread.currentThread().interrupt()
                throw IOException("Retry backoff interrupted", interrupted)
            }
            attempt++
        }
        throw lastException ?: IOException("Gemini request failed after $maxRetries retries")
    }
}

object RetrofitClient {
    private const val BASE_URL = "https://generativelanguage.googleapis.com/"

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(RedactApiKeyInterceptor())
        .addInterceptor(RetryInterceptor())
        .build()

    val service: GeminiApiService by lazy {
        val json = Json { ignoreUnknownKeys = true }
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
        retrofit.create(GeminiApiService::class.java)
    }
}

/**
 * Suspends with exponential backoff retries around a Gemini call at the call-site level,
 * complementing the OkHttp-level [RetryInterceptor] with coroutine-friendly retry semantics
 *
 * **Retry budget**: [RetryInterceptor] already retries up to `maxRetries` times (default 3) at
 * the HTTP layer for 429/5xx/network errors. This function adds a second layer on top for
 * serialization or other non-HTTP exceptions. Callers should keep [maxAttempts] low (default 2)
 * to avoid excessive total request counts (max = [maxAttempts] × (RetryInterceptor.maxRetries+1)).
 * for logic that needs to react to specific exception types (e.g. offline fallback).
 */
suspend fun <T> withGeminiRetry(
    maxAttempts: Int = 2,
    initialDelayMs: Long = 300,
    block: suspend () -> T
): T {
    var attempt = 0
    var currentDelay = initialDelayMs
    while (true) {
        try {
            return block()
        } catch (e: Exception) {
            attempt++
            if (attempt >= maxAttempts) {
                AppLogger.e("GeminiApi", "Giving up after $attempt attempts: ${e.message}")
                throw e
            }
            AppLogger.w("GeminiApi", "Attempt $attempt failed (${e.message}), retrying in ${currentDelay}ms")
            delay(currentDelay)
            currentDelay *= 2
        }
    }
}
