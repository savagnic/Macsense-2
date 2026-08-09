package com.macsense.ai.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.macsense.ai.audio.VocalPresetScanner
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Vocal Preset Scanner screen — Milestone 5.
 *
 * Three preset modes: Match Closely / Fit My Voice / Blend Styles.
 * Each mode drives a full plugin chain (AutoTune, EQ, Compressor, FX).
 * Plugin settings are computed by [VocalPresetScanner.computePreset] and
 * exposed as editable sliders so the user can fine-tune after scanning.
 *
 * Ari command surface: parseVocalScannerCommand() in VocalScannerCommands.kt
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VocalScannerScreen() {
    var isScanning by remember { mutableStateOf(false) }
    var scanProgress by remember { mutableStateOf(0f) }
    var isScanComplete by remember { mutableStateOf(false) }
    var selectedMode by remember { mutableStateOf("Fit My Voice") }
    val scope = rememberCoroutineScope()

    // Derive preset from VocalPresetScanner whenever mode changes
    val preset by remember(selectedMode, isScanComplete) {
        derivedStateOf {
            VocalPresetScanner.computePreset(
                mode = VocalPresetScanner.modeFromString(selectedMode)
            )
        }
    }

    // Sliders mirror the preset but are individually editable
    var autoTuneSpeed by remember(preset) { mutableStateOf(preset.autoTuneSpeedMs) }
    var eqLow by remember(preset) { mutableStateOf(preset.eqLowDb) }
    var eqMid by remember(preset) { mutableStateOf(preset.eqMidDb) }
    var eqHigh by remember(preset) { mutableStateOf(preset.eqHighDb) }
    var compThreshold by remember(preset) { mutableStateOf(preset.compThresholdDb) }
    var compRatio by remember(preset) { mutableStateOf(preset.compRatio) }
    var reverbMix by remember(preset) { mutableStateOf(preset.reverbMixPct) }
    var delayFeedback by remember(preset) { mutableStateOf(preset.delayFeedbackPct) }

    fun runVocalScan() {
        isScanning = true
        isScanComplete = false
        scanProgress = 0f
        scope.launch {
            repeat(100) { i ->
                delay(28)
                scanProgress = (i + 1) / 100f
            }
            isScanning = false
            isScanComplete = true
        }
    }

    val infiniteRotation = rememberInfiniteTransition(label = "scan-spin")
    val rotationAngle by infiniteRotation.animateFloat(
        initialValue = 0f, targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(1600, easing = LinearEasing), RepeatMode.Restart),
        label = "spin"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Mic, contentDescription = null, tint = PurpleNeon, modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("VOCAL PRESET SCANNER", color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceDark)
            )
        },
        containerColor = BackgroundDark,
        modifier = Modifier.testTag("vocal_scanner_screen")
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Reference drop zone
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(1.dp, PurpleNeon.copy(alpha = 0.35f))
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth()
                            .clickable { if (!isScanning) runVocalScan() }
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        if (isScanning) {
                            Icon(
                                Icons.Default.Refresh, contentDescription = "Scanning",
                                tint = CyanNeon, modifier = Modifier.size(52.dp).rotate(rotationAngle)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("ANALYZING REFERENCE VOCAL PRINT...", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            LinearProgressIndicator(
                                progress = { scanProgress },
                                modifier = Modifier.fillMaxWidth(0.8f).height(6.dp).clip(RoundedCornerShape(3.dp)),
                                color = CyanNeon, trackColor = SurfaceSubtle
                            )
                        } else {
                            Text("⬆", color = PurpleNeon, fontSize = 44.sp, fontWeight = FontWeight.Black)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                if (isScanComplete) "✓ ANALYSIS COMPLETE — TAP TO RESCAN" else "DROP REFERENCE TRACK HERE",
                                color = if (isScanComplete) GreenActive else TextPrimary,
                                fontWeight = FontWeight.Bold, fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "Analyzes EQ curve, dynamics, tuning speed, and reverb space from any MP3/WAV.",
                                color = TextSecondary, fontSize = 11.sp, textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            // Mode selector
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Match Closely", "Fit My Voice", "Blend Styles").forEach { mode ->
                        val sel = mode == selectedMode
                        Box(
                            modifier = Modifier.weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (sel) PurpleNeon else SurfaceDark)
                                .border(BorderStroke(1.dp, if (sel) Color.White.copy(0.25f) else Color(0x1F8B5CF6)), RoundedCornerShape(10.dp))
                                .clickable { selectedMode = mode; if (isScanComplete) runVocalScan() }
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(mode, color = if (sel) Color.White else TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        }
                    }
                }
            }

            // Plugin chain
            item { Text("SUGGESTED PLUGIN CHAIN", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace) }

            item {
                PluginControlCard("Vocal Pitch Correction (Auto-Tune)", tint = CyanNeon) {
                    Column {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Retune Speed", color = TextSecondary, fontSize = 12.sp)
                            Text("${autoTuneSpeed.toInt()} ms", color = TextPrimary, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        }
                        Slider(value = autoTuneSpeed, onValueChange = { autoTuneSpeed = it }, valueRange = 0f..100f,
                            colors = SliderDefaults.colors(activeTrackColor = CyanNeon, thumbColor = CyanNeon, inactiveTrackColor = SurfaceSubtle))
                    }
                }
            }

            item {
                PluginControlCard("EQ Blueprint", tint = PurpleNeon) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        BlueprintSlider("Low Shelf", eqLow, -12f, 12f, tint = PurpleNeon) { eqLow = it }
                        BlueprintSlider("Presence Mid", eqMid, -12f, 12f, tint = PurpleNeon) { eqMid = it }
                        BlueprintSlider("Air High", eqHigh, -12f, 12f, tint = PurpleNeon) { eqHigh = it }
                    }
                }
            }

            item {
                PluginControlCard("Opto Compressor", tint = MagentaNeon) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        BlueprintSlider("Threshold", compThreshold, -48f, 0f, "dBFS", MagentaNeon) { compThreshold = it }
                        BlueprintSlider("Ratio", compRatio, 1f, 12f, ":1", MagentaNeon) { compRatio = it }
                    }
                }
            }

            item {
                PluginControlCard("Plate Reverb & Delay", tint = GreenActive) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        BlueprintSlider("Reverb Send", reverbMix, 0f, 100f, "%", GreenActive) { reverbMix = it }
                        BlueprintSlider("Delay Feedback", delayFeedback, 0f, 100f, "%", GreenActive) { delayFeedback = it }
                    }
                }
            }

            // Apply preset summary
            item {
                AnimatedVisibility(visible = isScanComplete) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, GreenActive.copy(alpha = 0.5f))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("✓ PRESET APPLIED: ${selectedMode.uppercase()}", color = GreenActive, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            Spacer(modifier = Modifier.height(6.dp))
                            // Kotlin has no C-style ternary; boosts are shown with an explicit
                            // "+" so a +3.0/-3.0 dB move is readable at a glance.
                            val eqSummary = listOf(eqLow, eqMid, eqHigh).joinToString("/") { db ->
                                (if (db > 0) "+" else "") + String.format("%.1f", db)
                            }
                            Text("AutoTune ${autoTuneSpeed.toInt()}ms • EQ $eqSummary dB • Comp ${compThreshold.toInt()}dBFS ${String.format("%.1f", compRatio)}:1 • Rev ${reverbMix.toInt()}%",
                                color = TextSecondary, fontSize = 11.sp, fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }
        }
    }
}
