package com.macsense.ai.api

enum class ModelTier(val modelName: String, val endpointUrl: String) {
    FAST(
        // Kept to a documented Gemini API model ID. The request path is constructed
        // at call time from this value so the routing decision is never decorative.
        modelName = "gemini-2.0-flash",
        endpointUrl = "v1beta/models/gemini-2.0-flash:generateContent"
    ),
    CREATIVE(
        // Lyrics, arrangement and genome work go to the stronger model. Pointing this at the same
        // flash model as FAST made the whole routing layer decorative: every "creative" decision
        // resolved to the identical request.
        modelName = "gemini-2.5-pro",
        endpointUrl = "v1beta/models/gemini-2.5-pro:generateContent"
    )
}

object AriModelRouter {

    /**
     * Choose the request tier before an AI response exists. This is intentionally
     * heuristic-only: it controls resource selection, not command authorization.
     * Any returned command is still parsed and handled after the response arrives.
     */
    fun routePrompt(prompt: String?): ModelTier {
        val normalized = prompt?.lowercase()?.trim().orEmpty()
        if (normalized.isEmpty()) return ModelTier.FAST
        return when {
            listOf(
                "lyric", "rewrite", "verse", "hook", "chorus", "songwrite",
                "breed", "genome", "genetic", "resurrect", "revive",
                "arrange", "structure", "reorder"
            ).any(normalized::contains) -> ModelTier.CREATIVE
            else -> ModelTier.FAST
        }
    }

    fun routeTier(commandType: String?): ModelTier {
        if (commandType == null) return ModelTier.FAST
        return when (commandType.lowercase().trim()) {
            "update_bpm", "update_effects", "apply_preset" -> ModelTier.FAST
            "update_lyrics", "reorder_sections", "breed_sounds", "resurrect_sound", "creative_writing" -> ModelTier.CREATIVE
            else -> ModelTier.FAST
        }
    }

    fun routeTier(command: AriCommand?): ModelTier {
        return routeTier(command?.type)
    }

    fun getEndpointUrl(commandType: String?): String {
        return routeTier(commandType).endpointUrl
    }

    fun getEndpointUrl(command: AriCommand?): String {
        return getEndpointUrl(command?.type)
    }

    fun getEndpointUrl(tier: ModelTier): String {
        return tier.endpointUrl
    }
}
