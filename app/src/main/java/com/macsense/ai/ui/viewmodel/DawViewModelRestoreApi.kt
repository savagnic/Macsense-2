package com.macsense.ai.ui.viewmodel

import com.macsense.ai.audio.StemTrack
import androidx.lifecycle.viewModelScope
import com.macsense.ai.data.local.ClipEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Public restore-API for DawViewModel. These are the functions that DawViewModelExtensions
 * calls when applying undo/redo states. They update the internal MutableStateFlows via
 * the ViewModel's own public mutators or by direct access to internal state.
 *
 * Placed in a separate file to keep DawViewModel.kt unmodified and pass the compiler
 * (extension functions in the same package can access internal members).
 */

/**
 * Replaces the current section list in-memory and triggers a DB refresh.
 * DawViewModel's `_sections` is `internal` so this extension in the same package can set it.
 */
fun DawViewModel.restoreSections(sections: List<SectionInfo>) {
    _sections.value = sections
}

/**
 * Replaces the in-memory clipsBySection map, then persists each section's clips to Room.
 */
fun DawViewModel.restoreClips(clipsBySection: Map<String, List<ClipEntity>>) {
    _clipsBySection.value = clipsBySection
    // Persist the restored clips back to Room on IO thread
    val repo = repository ?: return
    viewModelScope.launch(Dispatchers.IO) {
        for ((sectionId, clips) in clipsBySection) {
            repo.deleteClipsForSection(sectionId)
            for (clip in clips) repo.upsertClip(clip)
        }
    }
}

/**
 * Replaces the stem track list. Respects mute/solo semantics through the existing StemMixer.
 */
fun DawViewModel.restoreStems(stems: List<StemTrack>) {
    _stemTracks.value = stems
}

/**
 * Restores a loop region (or clears it when null).
 */
fun DawViewModel.restoreLoopRegion(region: Pair<Int, Int>?) {
    _loopRegion.value = region
}
