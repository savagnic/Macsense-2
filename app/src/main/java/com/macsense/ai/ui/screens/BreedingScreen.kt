package com.macsense.ai.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.macsense.ai.audio.SoundArchive
import com.macsense.ai.ui.viewmodel.DawViewModel


/**
 * Breeding Lab screen — Milestone 4.
 *
 * Surfaces the Phase 5 sound-genetics pipeline (breeding, resurrection, lineage, DNA export/import)
 * that was previously only reachable via Ari chat commands.
 *
 * Parents A & B selection -> trait bias slider -> BREED button
 * Resurrection target selection -> RESURRECT button
 * Ancestry chain (LineageCard)
 * Sound DNA export/import (SoundDnaPanel)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BreedingScreen(viewModel: DawViewModel = viewModel()) {
    val archiveEntries by viewModel.archiveEntries.collectAsState()
    val lastBredEntry by viewModel.lastBredEntry.collectAsState()
    val lastResurrectedEntry by viewModel.lastResurrectedEntry.collectAsState()
    val lastExportedArtifact by viewModel.lastExportedArtifact.collectAsState()
    val lastImportedEntry by viewModel.lastImportedEntry.collectAsState()

    var selectedParentA by remember { mutableStateOf<String?>(null) }
    var selectedParentB by remember { mutableStateOf<String?>(null) }
    var traitBias by remember { mutableStateOf(0.5f) }
    var selectedResurrectionTarget by remember { mutableStateOf<String?>(null) }
    var showDiffDialog by remember { mutableStateOf(false) }
    var pendingBreedArgs by remember { mutableStateOf<Triple<String, String, Double>?>(null) }

    LaunchedEffect(Unit) { viewModel.refreshArchiveEntries() }

    // Diff-and-confirm dialog before breeding
    if (showDiffDialog && pendingBreedArgs != null) {
        val (a, b, bias) = pendingBreedArgs!!
        val entryA = archiveEntries.firstOrNull { it.takeId == a }
        val entryB = archiveEntries.firstOrNull { it.takeId == b }
        AlertDialog(
            onDismissRequest = { showDiffDialog = false; pendingBreedArgs = null },
            containerColor = SurfaceDark,
            title = { Text("Confirm Breed", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Parent A: ${a.take(12)}", color = TextPrimary, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
                    Text("Parent B: ${b.take(12)}", color = TextPrimary, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
                    Text("Trait bias toward B: ${(bias * 100).toInt()}%", color = TextSecondary, fontSize = 12.sp)
                    Divider(color = Color(0x1FA855F7))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(8.dp).clip(RoundedCornerShape(4.dp))
                                .background(if (entryA?.state == SoundArchive.State.LIVING) GreenActive else PurpleNeon)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("${entryA?.state?.name ?: "?"} → OFFSPRING (REBORN)", color = TextSecondary, fontSize = 11.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.breedSoundsFromUi(a, b, bias)
                        showDiffDialog = false; pendingBreedArgs = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = PurpleNeon)
                ) { Text("Breed", fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showDiffDialog = false; pendingBreedArgs = null }) {
                    Text("Cancel", color = TextSecondary)
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🧬", fontSize = 20.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("SOUND BREEDING LAB", color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceDark)
            )
        },
        containerColor = BackgroundDark,
        modifier = Modifier.testTag("breeding_screen")
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (archiveEntries.isEmpty()) {
                item { EmptyArchiveNotice() }
            } else {
                // Parent A
                item { SectionHeader("PARENT A") }
                items(archiveEntries, key = { "a-" + it.takeId }) { entry ->
                    ArchiveEntryRow(entry, selectedParentA == entry.takeId) { selectedParentA = entry.takeId }
                }

                // Parent B
                item { SectionHeader("PARENT B", topPad = true) }
                items(archiveEntries, key = { "b-" + it.takeId }) { entry ->
                    ArchiveEntryRow(entry, selectedParentB == entry.takeId) { selectedParentB = entry.takeId }
                }

                // Trait bias + breed button
                item {
                    Column {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Trait Bias → Parent B", color = TextSecondary, fontSize = 12.sp)
                            Text("${(traitBias * 100).toInt()}%", color = TextPrimary, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        }
                        Slider(
                            value = traitBias, onValueChange = { traitBias = it }, valueRange = 0f..1f,
                            colors = SliderDefaults.colors(activeTrackColor = PurpleNeon, thumbColor = PurpleNeon, inactiveTrackColor = SurfaceSubtle)
                        )
                    }
                }

                item {
                    val canBreed = selectedParentA != null && selectedParentB != null && selectedParentA != selectedParentB
                    Button(
                        onClick = {
                            val a = selectedParentA; val b = selectedParentB
                            if (a != null && b != null) {
                                pendingBreedArgs = Triple(a, b, traitBias.toDouble())
                                showDiffDialog = true
                            }
                        },
                        enabled = canBreed,
                        modifier = Modifier.fillMaxWidth().testTag("breed_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = PurpleNeon)
                    ) {
                        Icon(Icons.Default.Favorite, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("BREED SELECTED TAKES", fontWeight = FontWeight.Bold)
                    }
                }

                lastBredEntry?.let { bred ->
                    item { ResultCard("OFFSPRING CREATED", bred, PurpleNeon) }
                }

                // Resurrection
                item { SectionHeader("RESURRECT A TAKE", topPad = true) }
                items(
                    archiveEntries.filter { it.state != SoundArchive.State.LIVING }.ifEmpty { archiveEntries },
                    key = { "r-" + it.takeId }
                ) { entry ->
                    ArchiveEntryRow(entry, selectedResurrectionTarget == entry.takeId) { selectedResurrectionTarget = entry.takeId }
                }

                item {
                    Button(
                        onClick = { selectedResurrectionTarget?.let { viewModel.resurrectSoundFromUi(it, setOf("revived")) } },
                        enabled = selectedResurrectionTarget != null,
                        modifier = Modifier.fillMaxWidth().testTag("resurrect_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = CyanNeon)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("RESURRECT SELECTED TAKE", fontWeight = FontWeight.Bold, color = BackgroundDark)
                    }
                }

                lastResurrectedEntry?.let { item { ResultCard("TAKE RESURRECTED", it, CyanNeon) } }

                // Sound DNA
                item { SectionHeader("SOUND DNA", topPad = true) }
                item {
                    SoundDnaPanel(
                        selectedTakeId = selectedParentA ?: selectedResurrectionTarget,
                        exportedArtifact = lastExportedArtifact,
                        importedEntry = lastImportedEntry,
                        onExport = { takeId -> viewModel.exportGenomeArtifact(takeId, trackName = takeId, creatorName = "MacSense") },
                        onImport = { raw -> viewModel.importGenomeArtifact(raw) }
                    )
                }

                // Lineage
                item { SectionHeader("LINEAGE", topPad = true) }
                val focusTakeId = lastBredEntry?.takeId ?: lastResurrectedEntry?.takeId
                item {
                    if (focusTakeId != null) {
                        LineageCard(viewModel = viewModel, takeId = focusTakeId)
                    } else {
                        Text(
                            "Breed or resurrect a take above to see its ancestry chain.",
                            color = TextSecondary, fontSize = 12.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, topPad: Boolean = false) {
    Text(
        title,
        color = TextSecondary, fontSize = 11.sp,
        fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace,
        modifier = if (topPad) Modifier.padding(top = 16.dp) else Modifier
    )
}

@Composable
private fun EmptyArchiveNotice() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Color(0x1F8B5CF6))
    ) {
        Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("No archived takes yet", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "Record a take in the DAW first — it’s automatically archived with a genome.",
                color = TextSecondary, fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun ArchiveEntryRow(entry: SoundArchive.Entry, selected: Boolean, onClick: () -> Unit) {
    val stateTint = when (entry.state) {
        SoundArchive.State.LIVING -> GreenActive
        SoundArchive.State.DORMANT -> TextSecondary
        SoundArchive.State.REBORN -> PurpleNeon
    }
    Row(
        modifier = Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) PurpleNeon.copy(alpha = 0.18f) else SurfaceDark)
            .border(BorderStroke(1.dp, if (selected) PurpleNeon else Color(0x1F8B5CF6)), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(entry.takeId.take(8), color = TextPrimary, fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
            Text(entry.tags.joinToString(", ").ifEmpty { "no tags" }, color = TextSecondary, fontSize = 11.sp)
        }
        Box(
            modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(stateTint.copy(alpha = 0.2f)).padding(horizontal = 8.dp, vertical = 4.dp)
        ) { Text(entry.state.name, color = stateTint, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun ResultCard(title: String, entry: SoundArchive.Entry, tint: Color) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, tint.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, color = tint, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            Spacer(modifier = Modifier.height(6.dp))
            Text("Take: ${entry.takeId}", color = TextPrimary, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
            entry.originTakeId?.let { Text("Origin: $it", color = TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace) }
            Text("State: ${entry.state.name}", color = tint, fontSize = 11.sp)
        }
    }
}
