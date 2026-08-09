package com.macsense.ai.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
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
import com.macsense.ai.audio.SoundArchive
import androidx.lifecycle.viewmodel.compose.viewModel
import com.macsense.ai.ui.viewmodel.DawViewModel

/**
 * Genome DNA export/import panel used inside BreedingScreen.
 *
 * Lets the user:
 * 1. Export a take's Sound DNA as shareable text (MACSENSE_DNA_V1 payload)
 * 2. Import a raw DNA string back to create a new archive entry
 */
@Composable
fun SoundDnaPanel(
    selectedTakeId: String?,
    exportedArtifact: String?,
    importedEntry: SoundArchive.Entry?,
    onExport: (String) -> Unit,
    onImport: (String) -> Unit
) {
    var importText by remember { mutableStateOf("") }
    var showImportField by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, PurpleNeon.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                "SOUND DNA — EXPORT / IMPORT",
                color = TextSecondary, fontSize = 10.sp,
                fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace
            )

            // Export
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { selectedTakeId?.let { onExport(it) } },
                    enabled = selectedTakeId != null,
                    modifier = Modifier.weight(1f).testTag("export_dna_button"),
                    colors = ButtonDefaults.buttonColors(containerColor = PurpleNeon)
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Export DNA", fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { showImportField = !showImportField },
                    modifier = Modifier.weight(1f).testTag("import_dna_button"),
                    border = BorderStroke(1.dp, CyanNeon)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp), tint = CyanNeon)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Import DNA", color = CyanNeon, fontWeight = FontWeight.Bold)
                }
            }

            exportedArtifact?.let { artifact ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceSubtle),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("EXPORTED ARTIFACT", color = PurpleNeon, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Copy this Sound DNA and paste it into another project to breed with it.",
                            color = TextSecondary, fontSize = 11.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        SelectionContainer {
                            Text(
                                artifact,
                                color = TextPrimary, fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 160.dp)
                                    .verticalScroll(rememberScrollState())
                                    .testTag("exported_dna_text")
                            )
                        }
                    }
                }
            }

            if (showImportField) {
                OutlinedTextField(
                    value = importText,
                    onValueChange = { importText = it },
                    modifier = Modifier.fillMaxWidth().testTag("import_dna_text_field"),
                    label = { Text("Paste DNA string here", color = TextSecondary) },
                    placeholder = { Text("{\"genomeId\":\"...\"", color = TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyanNeon,
                        unfocusedBorderColor = Color(0x1F8B5CF6),
                        cursorColor = CyanNeon,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    maxLines = 6
                )
                Button(
                    onClick = {
                        if (importText.isNotBlank()) {
                            onImport(importText.trim())
                            importText = ""
                            showImportField = false
                        }
                    },
                    enabled = importText.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = CyanNeon)
                ) {
                    Text("IMPORT & CREATE ENTRY", fontWeight = FontWeight.Bold, color = BackgroundDark)
                }
            }

            importedEntry?.let { entry ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceSubtle),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("IMPORTED", color = CyanNeon, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Text(entry.takeId.take(16), color = TextPrimary, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(CyanNeon.copy(alpha = 0.2f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(entry.state.name, color = CyanNeon, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
