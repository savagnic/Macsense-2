package com.macsense.ai.api

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AriSessionMemoryTest {

    @Test
    fun `initial memory is empty`() {
        val memory = AriSessionMemory()
        assertNull(memory.genre)
        assertNull(memory.key)
        assertNull(memory.mood)
        assertTrue(memory.priorCommands.isEmpty())
        assertTrue(memory.conversationHistory.isEmpty())
    }

    @Test
    fun `accumulates context and builds system instruction containing facts`() {
        val memory = AriSessionMemory(genre = "Trap", key = "F Minor", mood = "Aggressive")

        assertEquals("Trap", memory.genre)
        assertEquals("F Minor", memory.key)
        assertEquals("Aggressive", memory.mood)

        val systemInstruction = memory.buildSystemInstruction()
        assertTrue(systemInstruction.contains("Trap"))
        assertTrue(systemInstruction.contains("F Minor"))
        assertTrue(systemInstruction.contains("Aggressive"))
    }

    @Test
    fun `updates context incrementally`() {
        val memory = AriSessionMemory()
        memory.updateContext(genre = "Lo-Fi")
        assertEquals("Lo-Fi", memory.genre)

        memory.updateContext(key = "G Major", mood = "Chill")
        assertEquals("Lo-Fi", memory.genre)
        assertEquals("G Major", memory.key)
        assertEquals("Chill", memory.mood)

        val instruction = memory.buildSystemInstruction()
        assertTrue(instruction.contains("Lo-Fi"))
        assertTrue(instruction.contains("G Major"))
        assertTrue(instruction.contains("Chill"))
    }

    @Test
    fun `stores prior commands and includes them in system instruction`() {
        val memory = AriSessionMemory()
        val command = AriCommand(
            type = "update_bpm",
            bpm_value = 140.0,
            explanation = "Bump tempo to 140 BPM"
        )
        memory.addCommand(command)

        assertEquals(1, memory.priorCommands.size)
        assertEquals("update_bpm", memory.priorCommands[0].type)

        val instruction = memory.buildSystemInstruction()
        assertTrue(instruction.contains("update_bpm"))
        assertTrue(instruction.contains("Bump tempo to 140 BPM"))
    }

    @Test
    fun `accumulates conversation history and respects history capacity`() {
        val memory = AriSessionMemory(maxHistorySize = 3)
        memory.addMessage("user", "Hello Ari")
        memory.addMessage("model", "Hey there")
        memory.addMessage("user", "Change BPM to 120")

        assertEquals(3, memory.conversationHistory.size)

        memory.addMessage("model", "Updated BPM to 120")
        assertEquals(3, memory.conversationHistory.size)
        assertEquals("Hey there", memory.conversationHistory[0].text)
        assertEquals("Updated BPM to 120", memory.conversationHistory[2].text)
    }

    @Test
    fun `prior command history is bounded to avoid unbounded memory growth`() {
        val memory = AriSessionMemory(maxCommandHistorySize = 3)
        val cmd = AriCommand(type = "update_bpm", bpm_value = 120.0, explanation = "test")
        repeat(5) { memory.addCommand(cmd) }

        // Should be capped at 3, not 5.
        assertEquals(3, memory.priorCommands.size)
    }

    @Test
    fun `clear resets all session memory state`() {
        val memory = AriSessionMemory(genre = "R&B", key = "A Major", mood = "Smooth")
        memory.addCommand(AriCommand(type = "apply_preset", explanation = "Apply smooth preset"))
        memory.addMessage("user", "Make it smooth")

        memory.clear()

        assertNull(memory.genre)
        assertNull(memory.key)
        assertNull(memory.mood)
        assertTrue(memory.priorCommands.isEmpty())
        assertTrue(memory.conversationHistory.isEmpty())
    }
}
