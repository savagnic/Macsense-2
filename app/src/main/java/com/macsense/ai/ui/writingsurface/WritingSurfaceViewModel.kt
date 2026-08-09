package com.macsense.ai.ui.writingsurface

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.macsense.ai.BuildConfig
import com.macsense.ai.api.ModelTier
import com.macsense.ai.api.RetrofitClient
import com.macsense.ai.api.GenerateContentRequest
import com.macsense.ai.api.Content as ApiContent
import com.macsense.ai.api.Part
import com.macsense.ai.api.withGeminiRetry
import com.macsense.ai.telemetry.AppLogger
import com.macsense.ai.telemetry.StartupValidator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class TextSelection(val text: String, val start: Int, val end: Int)

data class LyricStats(
    val wordCount: Int,
    val syllableCount: Int,
    val rhymeDensityPercent: Int,
    val cadenceScore: Int,
    val vocabRichnessPercent: Int
)

data class SavedRequest(
    val id: String,
    val originalText: String,
    val action: String,
    val artistIdentity: String,
    val suggestion: String,
    val timestamp: String
)

data class ChatMessage(
    val role: String, // "user", "assistant"
    val text: String
)

class WritingSurfaceViewModel(
    private val editingService: AriLyricEditingService = AriLyricEditingService()
) : ViewModel() {

    private val _lyricsText = MutableStateFlow(
        "Yeah, double cup spilling on the MPC\n" +
        "Beat so hard, MACSENSE setting me free\n" +
        "Riding on the wave, neon in the night\n" +
        "Spitting raw science till the morning light"
    )
    val lyricsText: StateFlow<String> = _lyricsText.asStateFlow()

    private val _selectedTextSpan = MutableStateFlow<TextSelection?>(null)
    val selectedTextSpan: StateFlow<TextSelection?> = _selectedTextSpan.asStateFlow()

    private val _activeTab = MutableStateFlow(0) // 0: Solo Writing, 1: AI Assistance, 2: Saved Requests
    val activeTab: StateFlow<Int> = _activeTab.asStateFlow()

    private val _artistIdentity = MutableStateFlow("Aggressive Trap")
    val artistIdentity: StateFlow<String> = _artistIdentity.asStateFlow()

    private val _isDiffVisible = MutableStateFlow(false)
    val isDiffVisible: StateFlow<Boolean> = _isDiffVisible.asStateFlow()

    private val _diffOriginal = MutableStateFlow<TextSelection?>(null)
    val diffOriginal: StateFlow<TextSelection?> = _diffOriginal.asStateFlow()

    private val _diffSuggested = MutableStateFlow("")
    val diffSuggested: StateFlow<String> = _diffSuggested.asStateFlow()

    private val _isGenerating = MutableStateFlow(false)
    val isGenerating: StateFlow<Boolean> = _isGenerating.asStateFlow()

    private val _savedRequests = MutableStateFlow<List<SavedRequest>>(emptyList())
    val savedRequests: StateFlow<List<SavedRequest>> = _savedRequests.asStateFlow()

    private val _chatLog = MutableStateFlow(listOf(
        ChatMessage(
            role = "assistant",
            text = "sup. i'm ari. i'm docked in your writing surface now. highlight a lyric span to rewrite, change flow, or optimize cadence instantly."
        )
    ))
    val chatLog: StateFlow<List<ChatMessage>> = _chatLog.asStateFlow()

    private val _isAriTyping = MutableStateFlow(false)
    val isAriTyping: StateFlow<Boolean> = _isAriTyping.asStateFlow()

    private val _stats = MutableStateFlow(LyricStats(0, 0, 0, 0, 0))
    val stats: StateFlow<LyricStats> = _stats.asStateFlow()

    init {
        updateStats(_lyricsText.value)
    }

    fun updateLyrics(newText: String) {
        _lyricsText.value = newText
        updateStats(newText)
    }

    fun selectTextRange(start: Int, end: Int) {
        val fullText = _lyricsText.value
        if (start in 0..fullText.length && end in 0..fullText.length && start < end) {
            val selected = fullText.substring(start, end)
            _selectedTextSpan.value = TextSelection(selected, start, end)
        } else {
            _selectedTextSpan.value = null
        }
    }

    fun clearSelection() {
        _selectedTextSpan.value = null
    }

    fun setTab(tabIndex: Int) {
        _activeTab.value = tabIndex
    }

    fun setArtistIdentity(identity: String) {
        _artistIdentity.value = identity
    }

    fun triggerLyricEditAction(action: String) {
        val selection = _selectedTextSpan.value ?: return
        _isGenerating.value = true
        viewModelScope.launch {
            try {
                val suggestion = editingService.requestLyricEdit(
                    selectedText = selection.text,
                    action = action,
                    artistIdentity = _artistIdentity.value
                )
                _diffOriginal.value = selection
                _diffSuggested.value = suggestion
                _isDiffVisible.value = true

                // Save to Saved Requests list
                val newRequest = SavedRequest(
                    id = java.util.UUID.randomUUID().toString(),
                    originalText = selection.text,
                    action = action,
                    artistIdentity = _artistIdentity.value,
                    suggestion = suggestion,
                    timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                )
                _savedRequests.value = listOf(newRequest) + _savedRequests.value

            } catch (e: Exception) {
                AppLogger.e("WritingSurfaceViewModel", "Failed style alteration", e)
            } finally {
                _isGenerating.value = false
            }
        }
    }

    fun acceptDiff() {
        val original = _diffOriginal.value ?: return
        val suggested = _diffSuggested.value
        val fullText = _lyricsText.value
        if (original.start in 0..fullText.length && original.end in 0..fullText.length) {
            val updated = fullText.replaceRange(original.start, original.end, suggested)
            updateLyrics(updated)
        }
        _isDiffVisible.value = false
        _diffOriginal.value = null
        _diffSuggested.value = ""
        _selectedTextSpan.value = null
    }

    fun rejectDiff() {
        _isDiffVisible.value = false
        _diffOriginal.value = null
        _diffSuggested.value = ""
    }

    fun sendMessageToAri(userText: String) {
        if (userText.isBlank()) return
        val currentLog = _chatLog.value.toMutableList()
        currentLog.add(ChatMessage("user", userText))
        _chatLog.value = currentLog

        _isAriTyping.value = true
        viewModelScope.launch(Dispatchers.IO) {
            val key = BuildConfig.GEMINI_API_KEY
            val validation = StartupValidator.validateGeminiKey(key)

            if (!validation.isGeminiKeyConfigured) {
                delay(800)
                val reply = generateOfflineAriReply(userText)
                withContext(Dispatchers.Main) {
                    val updatedLog = _chatLog.value.toMutableList()
                    updatedLog.add(ChatMessage("assistant", reply))
                    _chatLog.value = updatedLog
                    _isAriTyping.value = false
                }
            } else {
                try {
                    val systemPrompt = """
                        you are "ari", the dominant, elite, hyper-opinionated executive music producer docked in the lyric writing surface.
                        you give direct critique, raw studio advice, and help with track structure in lowercase raw studio slang.
                    """.trimIndent()

                    val request = GenerateContentRequest(
                        contents = listOf(
                            ApiContent(role = "user", parts = listOf(Part(text = userText)))
                        ),
                        systemInstruction = ApiContent(parts = listOf(Part(text = systemPrompt)))
                    )

                    val response = withGeminiRetry {
                        RetrofitClient.service.generateContent(ModelTier.CREATIVE.modelName, key, request)
                    }
                    val reply = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                        ?: "my brain is fuzzing out. ask again, rookie."

                    withContext(Dispatchers.Main) {
                        val updatedLog = _chatLog.value.toMutableList()
                        updatedLog.add(ChatMessage("assistant", reply))
                        _chatLog.value = updatedLog
                        _isAriTyping.value = false
                    }
                } catch (e: Exception) {
                    delay(500)
                    val fallback = "[Local automation — no cloud AI response] " + generateOfflineAriReply(userText)
                    withContext(Dispatchers.Main) {
                        val updatedLog = _chatLog.value.toMutableList()
                        updatedLog.add(ChatMessage("assistant", fallback))
                        _chatLog.value = updatedLog
                        _isAriTyping.value = false
                    }
                }
            }
        }
    }

    private fun generateOfflineAriReply(userText: String): String {
        val lower = userText.lowercase()
        return when {
            lower.contains("hello") || lower.contains("hi") || lower.contains("sup") ->
                "sup rookie. what kind of bars we cooking up today?"
            lower.contains("vibe") || lower.contains("style") || lower.contains("identity") ->
                "we running on ${_artistIdentity.value} profile. keeping it heavy or shifting to melodic?"
            lower.contains("critique") || lower.contains("feedback") || lower.contains("check") ->
                "flow is looking decent, but some lines feel wordy. optimize the cadence on line 3."
            else ->
                "keep pushing the limit. highlight a section and choose rewrite if you get stuck."
        }
    }

    private fun updateStats(text: String) {
        val words = text.split(Regex("\\s+")).filter { it.isNotBlank() }
        val wordCount = words.size

        var syllables = 0
        val vowelsPattern = Regex("[aeiouyAEIOUY]+")
        for (w in words) {
            val matches = vowelsPattern.findAll(w).count()
            syllables += if (matches == 0) 1 else matches
        }

        // Rhyme density: ratio of lines or words containing a rhyming suffix like -y, -e, -ee, -ight, etc.
        var rhymingWords = 0
        val rhymingSuffixes = listOf("ee", "y", "ight", "at", "ar", "ow", "ack", "ine")
        for (w in words) {
            val lowerWord = w.lowercase()
            if (rhymingSuffixes.any { lowerWord.endsWith(it) }) {
                rhymingWords++
            }
        }
        val rhymeDensity = if (wordCount > 0) (rhymingWords * 100 / wordCount).coerceAtMost(100) else 0

        // Cadence consistency score: 0 to 100 based on standard deviation of line syllable counts
        val lines = text.split('\n').filter { it.isNotBlank() }
        val cadenceScore = if (lines.isNotEmpty()) {
            val lineSyllables = lines.map { line ->
                val lineWords = line.split(Regex("\\s+")).filter { it.isNotBlank() }
                lineWords.sumOf { w ->
                    val matches = vowelsPattern.findAll(w).count()
                    if (matches == 0) 1 else matches
                }
            }
            val average = lineSyllables.average()
            val variance = lineSyllables.map { (it - average) * (it - average) }.sum() / lines.size
            val stdDev = kotlin.math.sqrt(variance)
            (100 - (stdDev * 15).toInt()).coerceIn(10, 100)
        } else {
            0
        }

        // Vocabulary Richness (percentage of unique words)
        val uniqueWords = words.map { it.lowercase().filter { c -> c.isLetter() } }.filter { it.isNotEmpty() }.toSet().size
        val vocabRichness = if (wordCount > 0) (uniqueWords * 100 / wordCount).coerceAtMost(100) else 0

        _stats.value = LyricStats(
            wordCount = wordCount,
            syllableCount = syllables,
            rhymeDensityPercent = rhymeDensity,
            cadenceScore = cadenceScore,
            vocabRichnessPercent = vocabRichness
        )
    }
}
