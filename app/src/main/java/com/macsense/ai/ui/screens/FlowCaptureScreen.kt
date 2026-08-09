package com.macsense.ai.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.macsense.ai.ui.viewmodel.FlowCaptureViewModel
import com.macsense.ai.ui.viewmodel.RecordSession
import kotlin.math.sin

class FlowCaptureViewModelFactory(private val context: android.content.Context) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        return FlowCaptureViewModel(context) as T
    }
}

/**
 * Displays the vocal capture interface for recording, configuring, and managing takes.
 *
 * @param viewModel The view model that provides recording state and handles capture actions.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlowCaptureScreen(
    viewModel: FlowCaptureViewModel = viewModel(
        factory = FlowCaptureViewModelFactory(LocalContext.current)
    )
) {
    val isRecording by viewModel.isRecording.collectAsState()
    val elapsedSeconds by viewModel.elapsedSeconds.collectAsState()
    val autoBpm by viewModel.autoBpm.collectAsState()
    val recordedTakes by viewModel.recordedTakes.collectAsState()
    val cadenceStyle by viewModel.cadenceStyle.collectAsState()
    val quantizeFeel by viewModel.quantizeFeel.collectAsState()
    val performanceStyle by viewModel.performanceStyle.collectAsState()
    val autoAlignToBeat by viewModel.autoAlignEnabled.collectAsState()
    val context = LocalContext.current
    val microphoneReady = ContextCompat.checkSelfPermission(
        context, Manifest.permission.RECORD_AUDIO
    ) == PackageManager.PERMISSION_GRANTED

    val liveInputLevel = if (isRecording) {
        val infiniteTransition = rememberInfiniteTransition(label = "")
        val phase by infiniteTransition.animateFloat(
            initialValue = -50f, targetValue = -3f,
            animationSpec = infiniteRepeatable(
                animation = tween(400, easing = FastOutLinearInEasing),
                repeatMode = RepeatMode.Reverse
            ), label = ""
        )
        phase
    } else -60f

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("⏱ ", color = PurpleNeon, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("FLOW CAPTURE STUDIO", color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceDark)
            )
        },
        containerColor = BackgroundDark,
        modifier = Modifier.testTag("flow_capture_screen")
    ) { paddingValues ->
        Row(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column(modifier = Modifier.weight(1.2f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(1.dp, Color(0x1F8B5CF6))
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text("FLOW STATE ENGINE", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        val secondsInt = elapsedSeconds.toInt()
                        Text(String.format("%02d:%02d", secondsInt / 60, secondsInt % 60), color = if (isRecording) Color.Red else TextPrimary, fontSize = 64.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        Column(modifier = Modifier.fillMaxWidth(0.8f)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Signal Input Monitor", color = TextSecondary, fontSize = 11.sp)
                                Text("${String.format("%.1f", liveInputLevel)} dB", color = TextPrimary, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            val fillRatio = ((liveInputLevel + 60f) / 60f).coerceIn(0f, 1f)
                            Box(modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(5.dp)).background(SurfaceSubtle)) {
                                Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(fillRatio).background(if (liveInputLevel > -3.0f) Color.Red else CyanNeon))
                            }
                        }
                        LiveCaptureWaveform(isRecording)
                        Button(
                            onClick = { viewModel.toggleRecording() },
                            enabled = microphoneReady || isRecording,
                            colors = ButtonDefaults.buttonColors(containerColor = if (isRecording) Color.Red else PurpleNeon),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(0.8f).height(52.dp)
                        ) {
                            Text(if (isRecording) "■  STOP CAPTURE" else "●  TAP TO CAPTURE FLOW", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        if (!microphoneReady && !isRecording) {
                            Text("Microphone access is needed to capture audio.", color = TextSecondary, fontSize = 12.sp, textAlign = TextAlign.Center)
                        }
                        if (autoBpm > 0.0) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("⏱ ", color = CyanNeon, fontSize = 14.sp)
                                Text("Auto-Detected BPM: ${String.format("%.1f", autoBpm)}", color = CyanNeon, fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }
                        }
                    }
                }
                // AI Realtime Style Tuning Card
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = SurfaceDark), border = BorderStroke(1.dp, Color(0x1F8B5CF6)), shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("AUTO-ALIGN & ASSISTANT TUNING", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("Auto-Align To Project BPM", color = TextPrimary, fontSize = 13.sp)
                                Text("Preserves captured performance timing for review", color = TextSecondary, fontSize = 11.sp)
                            }
                            Switch(checked = autoAlignToBeat, onCheckedChange = { viewModel.setAutoAlignEnabled(it) }, colors = SwitchDefaults.colors(checkedThumbColor = CyanNeon, checkedTrackColor = CyanNeon.copy(alpha = 0.3f)))
                        }
                        Divider(color = Color(0x1FA855F7))
                        Column {
                            Text("Flow Cadence Accent Style", color = TextSecondary, fontSize = 11.sp)
                            FlowStyleSelector(listOf("Trap / Triplets", "Boom Bap 16ths", "Drill Syncopated", "Ambient / Loose"), cadenceStyle) { viewModel.setCadenceStyle(it) }
                        }
                        Divider(color = Color(0x1FA855F7))
                        Column {
                            Text("Quantization Metric Snap", color = TextSecondary, fontSize = 11.sp)
                            FlowStyleSelector(listOf("Straight 16ths", "Triplet 8ths", "Loose Swing", "No Quantize"), quantizeFeel) { viewModel.setQuantizeFeel(it) }
                        }
                    }
                }
            }
            Column(modifier = Modifier.weight(0.8f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Card(modifier = Modifier.fillMaxSize(), colors = CardDefaults.cardColors(containerColor = SurfaceDark), border = BorderStroke(1.dp, Color(0x1FA855F7)), shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "CAPTURED VOCAL TAKES SHELF",
                                color = TextSecondary,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                "${recordedTakes.size} ${if (recordedTakes.size == 1) "take" else "takes"}",
                                color = CyanNeon,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        if (recordedTakes.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text("No takes recorded yet.\nTap Record above to begin.", color = TextSecondary, fontSize = 13.sp, textAlign = TextAlign.Center)
                            }
                        } else {
                            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize()) {
                                itemsIndexed(recordedTakes, key = { _, take -> take.id }) { _, take -> TakeItemRow(take) { viewModel.deleteTake(take.id) } }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LiveCaptureWaveform(isRecording: Boolean) {
    val phase = if (isRecording) {
        rememberInfiniteTransition(label = "capture-waveform").animateFloat(0f, 2f * Math.PI.toFloat(), infiniteRepeatable(tween(1000, easing = LinearEasing), RepeatMode.Restart), label = "capture-phase").value
    } else 0f
    Canvas(modifier = Modifier.fillMaxWidth().height(110.dp).clip(RoundedCornerShape(12.dp)).background(BackgroundDark).border(BorderStroke(1.dp, Color(0x1FA855F7)), RoundedCornerShape(12.dp))) {
        val midY = size.height / 2f
        val path = Path()
        path.moveTo(0f, midY)
        for (x in 0..size.width.toInt() step 4) {
            val ratio = x / size.width
            val envelope = sin(ratio * Math.PI).toFloat()
            val wave = if (isRecording) sin(ratio * 25f + phase).toFloat() * 30f + sin(ratio * 50f).toFloat() * 12f else sin(ratio * 12f).toFloat() * 3f
            path.lineTo(x.toFloat(), midY + wave * envelope)
        }
        drawPath(path, PurpleNeon, style = Stroke(width = 2.5f))
    }
}
