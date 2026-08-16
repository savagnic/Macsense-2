package com.macsense.ai.viewmodel

import com.macsense.ai.data.local.ClipEntity
import com.macsense.ai.data.local.MacSenseDao
import com.macsense.ai.data.local.VersionNodeEntity
import com.macsense.ai.data.local.SectionEntity
import com.macsense.ai.data.local.ProjectEntity
import com.macsense.ai.data.local.SoundArchiveEntryEntity
import com.macsense.ai.data.local.SoundGenomeEntity
import com.macsense.ai.data.repository.MacSenseRepository
import com.macsense.ai.ui.viewmodel.DawViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.test.resetMain
import org.junit.Before
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class DawViewModelTest {
    
    private val dispatcher = UnconfinedTestDispatcher()

    private class FakeClipBackedDao : MacSenseDao {
        override suspend fun getDirtyProjects(): List<ProjectEntity> = emptyList()
        override suspend fun markProjectSynced(id: String, cloudId: String, syncedAt: Long) = Unit
        override suspend fun markProjectDirty(id: String) = Unit
        override suspend fun upsertSection(section: SectionEntity) = Unit
        override suspend fun getSectionsForProject(projectId: String): List<SectionEntity> = emptyList()
        override suspend fun updateSectionAriPrompt(sectionId: String, prompt: String) = Unit
        override suspend fun insertVersionNode(node: VersionNodeEntity) = Unit
        override suspend fun getVersionNodesForProject(projectId: String): List<VersionNodeEntity> = emptyList()

        val projects = mutableListOf<ProjectEntity>()
        val archiveEntries = mutableListOf<SoundArchiveEntryEntity>()
        val genomes = mutableListOf<SoundGenomeEntity>()
        val clips = mutableListOf<ClipEntity>()
        private val archiveFlow = MutableStateFlow<List<SoundArchiveEntryEntity>>(emptyList())
        private val clipsFlow = MutableStateFlow<List<ClipEntity>>(emptyList())

        override suspend fun insertProject(project: ProjectEntity) { projects.add(project) }
        override suspend fun getProjectById(id: String) = projects.find { it.id == id }
        override fun getAllProjects() = flowOf(emptyList<ProjectEntity>())
        override suspend fun deleteProject(id: String) { projects.removeIf { it.id == id } }
        override suspend fun insertSoundArchiveEntry(entry: SoundArchiveEntryEntity) {
            archiveEntries.removeIf { it.takeId == entry.takeId }
            archiveEntries.add(entry)
            archiveFlow.value = archiveEntries.toList()
        }
        override suspend fun getAllSoundArchiveEntries(): List<SoundArchiveEntryEntity> = archiveEntries.toList()
        override fun observeSoundArchiveEntries() = archiveFlow.asStateFlow()
        override suspend fun getSoundArchiveEntryByTakeId(takeId: String): SoundArchiveEntryEntity? = archiveEntries.find { it.takeId == takeId }
        override suspend fun deleteSoundArchiveEntry(takeId: String) {
            archiveEntries.removeIf { it.takeId == takeId }
            archiveFlow.value = archiveEntries.toList()
        }
        override suspend fun insertSoundGenome(genome: SoundGenomeEntity) {
            genomes.removeIf { it.id == genome.id }
            genomes.add(genome)
        }
        override suspend fun getSoundGenomeById(id: String): SoundGenomeEntity? = genomes.find { it.id == id }
        override suspend fun getSoundGenomesForProject(projectId: String): List<SoundGenomeEntity> = genomes.filter { it.projectId == projectId }
        override suspend fun insertClip(clip: ClipEntity) {
            clips.removeIf { it.id == clip.id }
            clips.add(clip)
            clipsFlow.value = clips.toList()
        }
        override suspend fun getClipsForSection(sectionId: String): List<ClipEntity> = clips.filter { it.sectionId == sectionId }.sortedBy { it.startFrame }
        override fun observeClipsForSection(sectionId: String) = clipsFlow.asStateFlow()
        override suspend fun getClipById(id: String): ClipEntity? = clips.find { it.id == id }
        override suspend fun deleteClip(id: String) {
            clips.removeIf { it.id == id }
            clipsFlow.value = clips.toList()
        }
        override suspend fun deleteClipsForSection(sectionId: String) {
            clips.removeIf { it.sectionId == sectionId }
            clipsFlow.value = clips.toList()
        }
    }
    
    @Before
    fun setup() {
        Dispatchers.setMain(dispatcher)
    }
    
    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }
    
    @Test
    fun testPlayPauseStateTransition() {
        val vm = DawViewModel()
        assertFalse(vm.isPlaying.value)
        vm.togglePlayPause()
        assertTrue(vm.isPlaying.value)
        vm.togglePlayPause()
        assertFalse(vm.isPlaying.value)
    }
    
    @Test
    fun testSectionReorder() {
        val vm = DawViewModel()
        val initialSections = vm.sections.value
        assertEquals("intro", initialSections[0].id)
        assertEquals("verse1", initialSections[1].id)
        
        vm.reorderSection(0, 1)
        
        val newSections = vm.sections.value
        assertEquals("verse1", newSections[0].id)
        assertEquals("intro", newSections[1].id)
    }
    
    @Test
    fun testBarPositionAdvancesWithTransportClock() {
        val vm = DawViewModel()
        assertEquals(1, vm.barPosition.value)
        vm.advanceBar()
        assertEquals(2, vm.barPosition.value)
        vm.advanceBar()
        assertEquals(3, vm.barPosition.value)
    }

    @Test
    fun testSendMessageToAriAddsMessageToLog() {
        val vm = DawViewModel()
        val initialSize = vm.ariChatLog.value.size
        
        vm.sendMessageToAri("make it fast")
        
        assertEquals(initialSize + 1, vm.ariChatLog.value.size)
        assertEquals("user", vm.ariChatLog.value.last().role)
        assertEquals("make it fast", vm.ariChatLog.value.last().text)
    }

    @Test
    fun offlineAriResponse_doesNotDoubleLabel() = kotlinx.coroutines.test.runTest(dispatcher) {
        // Without a configured GEMINI_API_KEY the offline branch runs. The response text must
        // carry exactly ONE "[Local automation" prefix — the one prepended by the caller — not
        // an additional one baked into the reply body by generateOfflineAriResponse().
        val vm = DawViewModel()
        vm.sendMessageToAri("change the bpm")

        var attempts = 0
        while (vm.ariChatLog.value.size < 3 && attempts < 100) {
            kotlinx.coroutines.delay(20)
            attempts++
        }

        val assistantMsg = vm.ariChatLog.value.lastOrNull { it.role == "assistant" }
        val text = assistantMsg?.text ?: ""
        // The text starts with the prefix exactly once.
        assertTrue("Offline response must carry the local-automation label", text.contains("[Local automation"))
        // It must NOT contain the label twice (double-prefix regression).
        val firstIndex = text.indexOf("[Local automation")
        val secondIndex = text.indexOf("[Local automation", firstIndex + 1)
        assertEquals("Response must not contain the local-automation label twice", -1, secondIndex)
    }

    @Test
    fun testApplyAriCommandBpm() {
        val vm = DawViewModel()
        val cmd = com.macsense.ai.api.AriCommand(
            type = "update_bpm",
            bpm_value = 150.0,
            explanation = "too slow rookie"
        )
        
        vm.applyAriCommand(cmd)
        
        assertEquals(150.0, vm.bpm.value, 0.001)
    }

    @Test
    fun testApplyAriCommandLyrics() {
        val vm = DawViewModel()
        val cmd = com.macsense.ai.api.AriCommand(
            type = "update_lyrics",
            section_id = "intro",
            value = "ari lyrics hook drop",
            explanation = "hot bars"
        )
        
        vm.applyAriCommand(cmd)
        
        val introSection = vm.sections.value.find { it.id == "intro" }
        assertEquals("ari lyrics hook drop", introSection?.lyrics)
    }

    @Test
    fun testApplyAriCommandReorder() {
        val vm = DawViewModel()
        val originalOrder = vm.sections.value.map { it.id }
        
        val reversedOrder = originalOrder.reversed()
        val cmd = com.macsense.ai.api.AriCommand(
            type = "reorder_sections",
            section_order = reversedOrder,
            explanation = "switch it up"
        )
        
        vm.applyAriCommand(cmd)
        
        val newOrder = vm.sections.value.map { it.id }
        assertEquals(reversedOrder, newOrder)
    }

    @Test
    fun testApplyAriCommandEffects() {
        val vm = DawViewModel()
        val cmd = com.macsense.ai.api.AriCommand(
            type = "update_effects",
            section_id = "intro",
            reverb = 0.9f,
            delay = 0.8f,
            filter = 0.7f,
            volume = 0.6f,
            explanation = "wash out"
        )
        
        vm.applyAriCommand(cmd)
        
        val introSection = vm.sections.value.find { it.id == "intro" }
        assertEquals(0.9f, introSection?.reverb ?: 0f, 0.001f)
        assertEquals(0.8f, introSection?.delay ?: 0f, 0.001f)
        assertEquals(0.7f, introSection?.filter ?: 0f, 0.001f)
        assertEquals(0.6f, introSection?.volume ?: 0f, 0.001f)
    }

    @Test
    fun init_refreshesPersistedClipsIntoState() = kotlinx.coroutines.test.runTest(dispatcher) {
        val dao = FakeClipBackedDao()
        dao.clips.add(ClipEntity(id = "c1", sectionId = "verse1", lane = "Kick", takeId = "take1", startFrame = 0L, trimEndFrame = null))
        dao.clips.add(ClipEntity(id = "c2", sectionId = "hook", lane = "Snare", takeId = "take2", startFrame = 100L, trimEndFrame = null))
        val vm = DawViewModel(repository = MacSenseRepository(dao))

        var attempts = 0
        while (vm.clipsForSection("verse1").isEmpty() && attempts < 100) {
            delay(10)
            attempts++
        }

        assertEquals(1, vm.clipsForSection("verse1").size)
        assertEquals("c1", vm.clipsForSection("verse1").first().id)
        assertEquals(1, vm.clipsForSection("hook").size)
    }

    @Test
    fun upsertDeleteAndClearClip_updateVmStateAndRepository() = kotlinx.coroutines.test.runTest(dispatcher) {
        val dao = FakeClipBackedDao()
        val vm = DawViewModel(repository = MacSenseRepository(dao))

        vm.upsertClip(
            sectionId = "verse1",
            lane = "Kick",
            takeId = "take1",
            startFrame = 22050L,
            clipId = "clipA"
        )
        var attempts = 0
        while (vm.clipsForSection("verse1").isEmpty() && attempts < 100) {
            delay(10)
            attempts++
        }

        vm.upsertClip(
            sectionId = "verse1",
            lane = "Snare",
            takeId = "take2",
            startFrame = 0L,
            clipId = "clipB"
        )
        attempts = 0
        while (vm.clipsForSection("verse1").size < 2 && attempts < 100) {
            delay(10)
            attempts++
        }

        assertEquals(listOf("clipB", "clipA"), vm.clipsForSection("verse1").map { it.id })
        assertEquals(2, dao.clips.size)

        vm.deleteClip("clipA", "verse1")
        attempts = 0
        while (vm.clipsForSection("verse1").size != 1 && attempts < 100) {
            delay(10)
            attempts++
        }
        assertEquals(listOf("clipB"), vm.clipsForSection("verse1").map { it.id })

        vm.clearSectionClips("verse1")
        attempts = 0
        while (vm.clipsForSection("verse1").isNotEmpty() && attempts < 100) {
            delay(10)
            attempts++
        }
        assertTrue(vm.clipsForSection("verse1").isEmpty())
        assertTrue(dao.clips.none { it.sectionId == "verse1" })
    }
}
