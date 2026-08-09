package com.macsense.ai.ui.writingsurface

import com.macsense.ai.BuildConfig
import com.macsense.ai.api.ModelTier
import com.macsense.ai.api.RetrofitClient
import com.macsense.ai.api.GenerateContentRequest
import com.macsense.ai.api.Content as ApiContent
import com.macsense.ai.api.Part
import com.macsense.ai.api.withGeminiRetry
import com.macsense.ai.telemetry.AppLogger
import com.macsense.ai.telemetry.StartupValidator

/**
 * Result of a lyric edit.
 *
 * [isLocalAutomation] is carried alongside the text rather than prefixed onto it. The text is
 * substituted straight into the user's lyrics when they accept the diff, so a "[Local automation]"
 * banner inside it would end up as a line in the song. The caller shows the label on the diff
 * instead, which keeps the promise that offline output is never passed off as a cloud AI response.
 */
data class LyricEdit(val text: String, val isLocalAutomation: Boolean)

class AriLyricEditingService {

    /** Returns just the edited text. See [requestLyricEditDetailed] to also learn where it came from. */
    suspend fun requestLyricEdit(
        selectedText: String,
        action: String,
        artistIdentity: String
    ): String = requestLyricEditDetailed(selectedText, action, artistIdentity).text

    suspend fun requestLyricEditDetailed(
        selectedText: String,
        action: String, // "Rewrite", "Make more aggressive", "Improve rhyme", "Better cadence", "Change flow"
        artistIdentity: String // e.g. "Grimy Boom-Bap", "Aggressive Trap", "Melodic R&B", "Poetic Folk"
    ): LyricEdit {
        val apiKey = BuildConfig.GEMINI_API_KEY
        val validation = StartupValidator.validateGeminiKey(apiKey)

        if (!validation.isGeminiKeyConfigured) {
            AppLogger.i("AriLyricEditingService", "GEMINI_API_KEY is not configured. Running deterministic local edit.")
            return LyricEdit(generateOfflineEdit(selectedText, action, artistIdentity), isLocalAutomation = true)
        }

        return try {
            val systemPrompt = """
                you are "ari", the dominant, elite, hyper-opinionated executive music producer and resident lyricist.
                you write and edit lyrics to perfection based on the requested style, action, and artist persona.
                you always return the newly edited lyric segment as plain text. do not include any markdown, explanations, quotes, or tags.
                return ONLY the edited text.
            """.trimIndent()

            val userPrompt = """
                action: $action
                artist persona / identity: $artistIdentity
                original selected lyric segment: "$selectedText"

                rewrite the lyric segment to satisfy the requested action and identity. return ONLY the modified segment.
            """.trimIndent()

            val request = GenerateContentRequest(
                contents = listOf(
                    ApiContent(role = "user", parts = listOf(Part(text = userPrompt)))
                ),
                systemInstruction = ApiContent(parts = listOf(Part(text = systemPrompt)))
            )

            AppLogger.i("AriLyricEditingService", "Sending lyric edit request to Gemini (action=$action, identity=$artistIdentity)")
            val response = withGeminiRetry {
                RetrofitClient.service.generateContent(ModelTier.CREATIVE.modelName, apiKey, request)
            }

            val result = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text?.trim()
            if (result.isNullOrEmpty()) {
                AppLogger.w("AriLyricEditingService", "Received empty response from Gemini, falling back to offline.")
                LyricEdit(generateOfflineEdit(selectedText, action, artistIdentity), isLocalAutomation = true)
            } else {
                LyricEdit(result, isLocalAutomation = false)
            }
        } catch (e: Exception) {
            AppLogger.e("AriLyricEditingService", "Failed online lyric edit, falling back to offline.", e)
            LyricEdit(generateOfflineEdit(selectedText, action, artistIdentity), isLocalAutomation = true)
        }
    }

    private fun generateOfflineEdit(
        selectedText: String,
        action: String,
        artistIdentity: String
    ): String {
        val clean = selectedText.trim()
        if (clean.isEmpty()) return "empty bars are silent bars. select something first."

        return when (action) {
            "Rewrite" -> {
                when (artistIdentity) {
                    "Aggressive Trap" -> "drippin gold, MACSENSE roll, we never fold"
                    "Melodic R&B" -> "floating through the neon shadows of my mind"
                    "Poetic Folk" -> "like a neon spark drifting in a quiet wood"
                    else -> "switching up the blueprint, setting the canvas free"
                }
            }
            "Make more aggressive" -> {
                when (artistIdentity) {
                    "Aggressive Trap" -> "MACSENSE setting fire, we burn the whole block down"
                    "Melodic R&B" -> "heavy bass beating hard inside my bruised chest"
                    "Poetic Folk" -> "thunder in the valley, we break down the fences"
                    else -> "tearing up the step sequencer, maximum intensity"
                }
            }
            "Improve rhyme" -> {
                when (artistIdentity) {
                    "Aggressive Trap" -> "stacking digits in the night, morning light, shining bright"
                    "Melodic R&B" -> "caught up in your velvet glow, love the tempo, watch it flow"
                    "Poetic Folk" -> "carving out a path of stone, in the bone, far from home"
                    else -> "lock the rhythm to the beat, in the street, no defeat"
                }
            }
            "Better cadence" -> {
                when (artistIdentity) {
                    "Aggressive Trap" -> "double cup, MPC, setting me free, wait and see"
                    "Melodic R&B" -> "soft delay, wash away, fade to gray, here to stay"
                    "Poetic Folk" -> "wind blows cold, story told, gold is old, truth be bold"
                    else -> "hit the snare, drop the bass, in the air, everywhere"
                }
            }
            "Change flow" -> {
                when (artistIdentity) {
                    "Aggressive Trap" -> "spitting hot fire, we double the friction, no restriction"
                    "Melodic R&B" -> "fusing our soul, midnight control, taking a toll"
                    "Poetic Folk" -> "rivers of dust, starlight we trust, iron to rust"
                    else -> "shift the grid, change the space, find the pace, win the race"
                }
            }
            else -> "blueprint modified: $clean"
        }
    }
}
