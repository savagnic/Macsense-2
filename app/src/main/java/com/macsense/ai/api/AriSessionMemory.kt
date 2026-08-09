package com.macsense.ai.api

data class ChatMessage(
    val role: String,
    val text: String
)

class AriSessionMemory(
    var genre: String? = null,
    var key: String? = null,
    var mood: String? = null,
    private val maxHistorySize: Int = 20,
    /** Maximum number of prior Ari commands kept in memory. Older entries are evicted so
     *  [buildSystemInstruction] never grows the system prompt without bound. */
    private val maxCommandHistorySize: Int = 20
) {
    private val _priorCommands = mutableListOf<AriCommand>()
    val priorCommands: List<AriCommand> get() = _priorCommands.toList()

    private val _conversationHistory = mutableListOf<ChatMessage>()
    val conversationHistory: List<ChatMessage> get() = _conversationHistory.toList()

    fun updateContext(genre: String? = this.genre, key: String? = this.key, mood: String? = this.mood) {
        genre?.let { this.genre = it }
        key?.let { this.key = it }
        mood?.let { this.mood = it }
    }

    fun addCommand(command: AriCommand) {
        _priorCommands.add(command)
        if (_priorCommands.size > maxCommandHistorySize) {
            _priorCommands.removeAt(0)
        }
    }

    fun addMessage(role: String, text: String) {
        _conversationHistory.add(ChatMessage(role, text))
        if (_conversationHistory.size > maxHistorySize) {
            _conversationHistory.removeAt(0)
        }
    }

    fun addMessage(message: ChatMessage) {
        addMessage(message.role, message.text)
    }

    fun clear() {
        genre = null
        key = null
        mood = null
        _priorCommands.clear()
        _conversationHistory.clear()
    }

    fun buildSystemInstruction(): String {
        val builder = StringBuilder()
        builder.append("You are Ari, an AI music co-producer for the MacSense DAW.\n")
        builder.append("Session Context:\n")

        genre?.let { builder.append("- Genre: $it\n") }
        key?.let { builder.append("- Key: $it\n") }
        mood?.let { builder.append("- Mood: $it\n") }

        if (_priorCommands.isNotEmpty()) {
            builder.append("- Prior Commands Executed:\n")
            _priorCommands.forEach { cmd ->
                builder.append("  * ${cmd.type}: ${cmd.explanation}\n")
            }
        }

        return builder.toString().trim()
    }
}
