package com.macsense.ai.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.text.TextStyle
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.macsense.ai.ui.viewmodel.DawViewModel
import com.macsense.ai.ui.viewmodel.SectionInfo
import kotlin.math.sin
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay


/**
 * Displays the main vertical digital audio workstation interface.
 *
 * @param viewModel The view model providing playback, timeline, section, and audio visualization state.
 */
@Composable
fun VerticalDawScreen(viewModel: DawViewModel = viewModel()) {
    val isPlaying by viewModel.isPlaying.collectAsState()
    val barPosition by viewModel.barPosition.collectAsState()
    val sections by viewModel.sections.collectAsState()
    val bpm by viewModel.bpm.collectAsState()
    val timecode by viewModel.timecode.collectAsState()
    val meterL by viewModel.meterL.collectAsState()
    val meterR by viewModel.meterR.collectAsState()
    val spectrum by viewModel.spectrumData.collectAsState()

    var isLeftRailExpanded by remember { mutableStateOf(true) }
    var isRightToolsExpanded by remember { mutableStateOf(true) }
    var leftRailWidth by remember { mutableStateOf(240.dp) }
    var rightToolsWidth by remember { mutableStateOf(280.dp) }
    var globalMode by remember { mutableStateOf("Produce") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .testTag("vertical_daw_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Global Mode Tabs Bar
            GlobalModesRow(selectedMode = globalMode, onModeSelect = { globalMode = it })

            Row(modifier = Modifier.weight(1f)) {
                // Collapsible Left Rail
                if (isLeftRailExpanded) {
                    Row(modifier = Modifier.fillMaxHeight()) {
                        LeftRailContent(
                            width = leftRailWidth,
                            onCollapse = { isLeftRailExpanded = false },
                            onWidthChange = { leftRailWidth = it }
                        )
                        VerticalDivider(
                            modifier = Modifier.fillMaxHeight().width(1.dp),
                            color = Color(0x1FA855F7)
                        )
                    }
                } else {
                    IconButton(
                        onClick = { isLeftRailExpanded = true },
                        modifier = Modifier
                            .background(SurfaceDark)
                            .fillMaxHeight()
                            .width(48.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = "Expand Rail",
                            tint = PurpleNeon
                        )
                    }
                }

                // Middle Main Section: Vertical Stacked Timeline
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .padding(16.dp)
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Section Header Stats Panel
                        HeaderStatsRow(bpm, timecode, barPosition)

                        // Vertical Timeline Scrolling Cards
                        LazyColumn(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .border(BorderStroke(1.dp, Color(0x1FA855F7)), RoundedCornerShape(12.dp))
                                .padding(8.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            itemsIndexed(sections, key = { _, section -> section.id }) { index, section ->
                                SectionCard(
                                    section = section,
                                    isPlayingNow = isPlaying && (barPosition % sections.size == index),
                                    onToggleExpand = { viewModel.toggleSectionExpanded(section.id) },
                                    onReorderUp = { if (index > 0) viewModel.reorderSection(index, index - 1) },
                                    onReorderDown = { if (index < sections.size - 1) viewModel.reorderSection(index, index + 1) },
                                    onLyricsChange = { viewModel.updateSectionLyrics(section.id, it) },
                                    onStepToggle = { lane, step ->
                                        val currentVal = section.instrumentGrid[lane]?.get(step) ?: false
                                        viewModel.updateInstrumentStep(section.id, lane, step, !currentVal)
                                    },
                                    onReverbChange = { viewModel.updateSectionReverb(section.id, it) },
                                    onDelayChange = { viewModel.updateSectionDelay(section.id, it) },
                                    onFilterChange = { viewModel.updateSectionFilter(section.id, it) },
                                    onVolumeChange = { viewModel.updateSectionVolume(section.id, it) }
                                )
                            }
                        }

                        // Bottom Instrument Map Legend
                        InstrumentMapLegend()
                    }

                    // Fixed Centered Playhead Line Overlay
                    if (isPlaying) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(2.dp)
                                .align(Alignment.Center)
                                .background(Brush.horizontalGradient(listOf(Color.Transparent, CyanNeon, Color.Transparent)))
                        )
                    }
                }

                // Collapsible Extra Tools Sidebar (Right)
                if (isRightToolsExpanded) {
                    Row(modifier = Modifier.fillMaxHeight()) {
                        VerticalDivider(
                            modifier = Modifier.fillMaxHeight().width(1.dp),
                            color = Color(0x1FA855F7)
                        )
                        RightToolsContent(
                            viewModel = viewModel,
                            width = rightToolsWidth,
                            onCollapse = { isRightToolsExpanded = false },
                            onWidthChange = { rightToolsWidth = it }
                        )
                    }
                } else {
                    IconButton(
                        onClick = { isRightToolsExpanded = true },
                        modifier = Modifier
                            .background(SurfaceDark)
                            .fillMaxHeight()
                            .width(48.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Expand Tools",
                            tint = MagentaNeon
                        )
                    }
                }
            }

            // Phase 4 (issue #39): typed stem tracks with per-stem gain/mute/solo
            val stems by viewModel.stemTracks.collectAsState()
            StemMixerPanel(
                stems = stems,
                onGainChange = { id, gain -> viewModel.setStemGain(id, gain) },
                onToggleMute = { viewModel.toggleStemMute(it) },
                onToggleSolo = { viewModel.toggleStemSolo(it) }
            )

            // Bottom Transport Bar
            TransportBar(
                isPlaying = isPlaying,
                onPlayPause = { viewModel.togglePlayPause() },
                bpm = bpm,
                onBpmChange = { viewModel.updateBpm(it) },
                timecode = timecode,
                barPosition = barPosition,
                meterL = meterL,
                meterR = meterR,
                spectrum = spectrum
            )
        }
    }
}

@Composable
fun GlobalModesRow(selectedMode: String, onModeSelect: (String) -> Unit) {
    val modes = listOf("Write", "Record", "Produce", "Mix", "Master", "Video", "Business")
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(SurfaceDark)
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = CyanNeon,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "MACSENSE AI",
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                modes.forEach { mode ->
                    val isSelected = mode == selectedMode
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) PurpleNeon else Color.Transparent)
                            .clickable { onModeSelect(mode) }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = mode,
                            color = if (isSelected) Color.White else TextSecondary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
        HorizontalDivider(
            modifier = Modifier.fillMaxWidth().height(1.dp),
            color = Color(0x3FA855F7)
        )
    }
}

/**
 * Displays the studio navigation rail with menu items and a draggable width.
 *
 * @param width The current width of the navigation rail.
 * @param onCollapse Called when the rail collapse control is selected.
 * @param onWidthChange Called with the updated width after the rail is resized.
 */
@Composable
fun LeftRailContent(
    width: androidx.compose.ui.unit.Dp,
    onCollapse: () -> Unit,
    onWidthChange: (androidx.compose.ui.unit.Dp) -> Unit
) {
    val menuItems = listOf(
        "New Project" to Icons.Default.Add,
        "Projects" to Icons.Default.List,
        "Library" to Icons.Default.List,
        "Sounds" to Icons.Default.Star,
        "Plugins" to Icons.Default.Settings,
        "Presets" to Icons.Default.Settings,
        "AI Tasks" to Icons.Default.Star,
        "Learn" to Icons.Default.Info,
        "Store" to Icons.Default.Settings,
        "Social" to Icons.Default.Share,
        "Settings" to Icons.Default.Settings
    )

    Column(
        modifier = Modifier
            .width(width)
            .fillMaxHeight()
            .background(SurfaceDark)
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    val newWidth = (width + dragAmount.x.toDp()).coerceIn(160.dp, 360.dp)
                    onWidthChange(newWidth)
                }
            }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("STUDIO RAIL", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            IconButton(onClick = onCollapse) {
                Icon(Icons.Default.Menu, contentDescription = "Collapse", tint = TextSecondary)
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            itemsIndexed(menuItems, key = { _, item -> item.first }) { _, item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(item.second, contentDescription = item.first, tint = PurpleNeon, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(item.first, color = TextPrimary, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
fun HeaderStatsRow(bpm: Double, timecode: String, barPosition: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "VERTICAL TIMELINE",
            color = TextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            HeaderStatBox("TEMPO", String.format("%.1f BPM", bpm), CyanNeon)
            HeaderStatBox("TIMECODE", timecode, MagentaNeon)
            HeaderStatBox("BAR", barPosition.toString(), PurpleNeon)
        }
    }
}

@Composable
fun HeaderStatBox(label: String, valStr: String, glowColor: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(SurfaceDark)
            .border(BorderStroke(1.dp, glowColor.copy(alpha = 0.25f)), RoundedCornerShape(8.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Column(horizontalAlignment = Alignment.End) {
            Text(label, color = TextSecondary, fontSize = 9.sp)
            Text(
                valStr,
                color = TextPrimary,
                fontSize = 13.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun SectionCard(
    section: SectionInfo,
    isPlayingNow: Boolean,
    onToggleExpand: () -> Unit,
    onReorderUp: () -> Unit,
    onReorderDown: () -> Unit,
    onLyricsChange: (String) -> Unit,
    onStepToggle: (String, Int) -> Unit,
    onReverbChange: (Float) -> Unit,
    onDelayChange: (Float) -> Unit,
    onFilterChange: (Float) -> Unit,
    onVolumeChange: (Float) -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "Active Glow")
    val alphaGlow by infiniteTransition.animateFloat(
        initialValue = 0.1f,
        targetValue = 0.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ), label = "Glow"
    )

    val borderStroke = if (isPlayingNow) {
        BorderStroke(2.dp, CyanNeon.copy(alpha = alphaGlow + 0.5f))
    } else {
        BorderStroke(1.dp, PurpleNeon.copy(alpha = 0.2f))
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggleExpand() }
            .shadow(if (isPlayingNow) 12.dp else 2.dp, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = if (isPlayingNow) SurfaceSubtle else SurfaceDark),
        border = borderStroke,
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = if (isPlayingNow) "▶ " else "★ ",
                        color = if (isPlayingNow) CyanNeon else PurpleNeon,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(section.name, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "${section.barCount} Bars",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onReorderUp, modifier = Modifier.size(28.dp)) {
                        Text("▲", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    IconButton(onClick = onReorderDown, modifier = Modifier.size(28.dp)) {
                        Text("▼", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            AnimatedVisibility(visible = section.isExpanded) {
                Column(modifier = Modifier.padding(top = 16.dp)) {
                    // Custom Glowing Waveform
                    Text("WAVEFORM MONITOR", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    NeonWaveform(isPlayingNow)

                    Spacer(modifier = Modifier.height(12.dp))

                    // Lyrics Studio Inline
                    Text("LYRICS studio", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = section.lyrics,
                        onValueChange = onLyricsChange,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PurpleNeon,
                            unfocusedBorderColor = Color(0x3F8B5CF6),
                            focusedContainerColor = BackgroundDark,
                            unfocusedContainerColor = BackgroundDark,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Interactive Instrument Grid
                    Text("INSTRUMENT SEQUENCE MAP", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    InstrumentGrid(section.instrumentGrid, onStepToggle)

                    Spacer(modifier = Modifier.height(12.dp))

                    // Automation sliders
                    Text("EFFECTS & AUTOMATION LANES", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    AutomationSlider("Reverb", section.reverb, PurpleNeon, onReverbChange)
                    AutomationSlider("Delay", section.delay, MagentaNeon, onDelayChange)
                    AutomationSlider("Filter", section.filter, CyanNeon, onFilterChange)
                    AutomationSlider("Volume", section.volume, GreenActive, onVolumeChange)
                }
            }
        }
    }
}

@Composable
fun NeonWaveform(isPlayingNow: Boolean) {
    val phase by rememberInfiniteTransition(label = "").animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ), label = ""
    )

    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp)
            .padding(vertical = 8.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(BackgroundDark)
            .border(BorderStroke(1.dp, Color(0x1FA855F7)), RoundedCornerShape(8.dp))
    ) {
        val width = size.width
        val height = size.height
        val midY = height / 2f
        val path = Path()
        
        path.moveTo(0f, midY)
        for (x in 0..width.toInt() step 5) {
            val ratio = x / width
            val envelope = sin(ratio * Math.PI).toFloat()
            val wave = if (isPlayingNow) {
                sin(ratio * 15f + phase).toFloat() * 25f + sin(ratio * 30f).toFloat() * 10f
            } else {
                sin(ratio * 15f).toFloat() * 15f
            }
            path.lineTo(x.toFloat(), midY + wave * envelope)
        }
        
        drawPath(
            path = path,
            color = PurpleNeon,
            style = Stroke(width = 2.5f)
        )
    }
}

@Composable
fun InstrumentGrid(grid: Map<String, List<Boolean>>, onStepToggle: (String, Int) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(BackgroundDark)
            .border(BorderStroke(1.dp, Color(0x1F8B5CF6)), RoundedCornerShape(8.dp))
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        grid.forEach { (lane, steps) ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = lane,
                    color = TextPrimary,
                    fontSize = 11.sp,
                    modifier = Modifier.width(90.dp),
                    fontFamily = FontFamily.Monospace
                )
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    steps.forEachIndexed { idx, isActive ->
                        val laneColor = getLaneColor(lane)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(3.dp))
                                .background(if (isActive) laneColor else SurfaceSubtle)
                                .border(BorderStroke(1.dp, if (isActive) Color.White.copy(alpha = 0.4f) else Color.Transparent))
                                .clickable { onStepToggle(lane, idx) }
                        )
                    }
                }
            }
        }
    }
}

fun getLaneColor(lane: String): Color {
    return when (lane) {
        "808/Bass" -> Color(0xFFEF4444)
        "Kick" -> Color(0xFFF97316)
        "Snare" -> Color(0xFFFBBF24)
        "Hi-Hat" -> Color(0xFF34D399)
        "Clap" -> Color(0xFF60A5FA)
        "Percussion" -> Color(0xFF818CF8)
        "Riser" -> Color(0xFFA78BFA)
        "Crash" -> Color(0xFFF472B6)
        "Bass Synth" -> Color(0xFFEC4899)
        "Lead" -> Color(0xFF10B981)
        "Pads" -> Color(0xFF06B6D4)
        "Vocal/Adlib" -> Color(0xFF8B5CF6)
        else -> Color.Gray
    }
}

@Composable
fun AutomationSlider(label: String, value: Float, neonColor: Color, onValueChange: (Float) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = TextSecondary,
            fontSize = 11.sp,
            modifier = Modifier.width(60.dp)
        )
        Slider(
            value = value,
            onValueChange = onValueChange,
            colors = SliderDefaults.colors(
                thumbColor = neonColor,
                activeTrackColor = neonColor,
                inactiveTrackColor = SurfaceSubtle
            ),
            modifier = Modifier.weight(1f)
        )
        Text(
            text = String.format("%.2f", value),
            color = TextPrimary,
            fontSize = 11.sp,
            modifier = Modifier.width(40.dp),
            textAlign = TextAlign.End,
            fontFamily = FontFamily.Monospace
        )
    }
}

@Composable
fun InstrumentMapLegend() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .background(SurfaceDark)
            .border(BorderStroke(1.dp, Color(0x1FA855F7)), RoundedCornerShape(8.dp))
            .padding(8.dp)
    ) {
        Text("INSTRUMENT LEGEND", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val items = listOf("Bass/808" to Color(0xFFEF4444), "Drums" to Color(0xFFFBBF24), "Synths" to Color(0xFF10B981), "Vocals" to Color(0xFF8B5CF6))
            items.forEach { (name, color) ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(10.dp).clip(RoundedCornerShape(2.dp)).background(color))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(name, color = TextPrimary, fontSize = 11.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RightToolsContent(
    viewModel: DawViewModel,
    width: androidx.compose.ui.unit.Dp,
    onCollapse: () -> Unit,
    onWidthChange: (androidx.compose.ui.unit.Dp) -> Unit
) {
    var activeTab by remember { mutableStateOf(0) } // 0: ARI AI, 1: AI STEMS, 2: CREATORS
    val tabs = listOf("ARI AI", "AI STEMS", "CREATORS")
    val scope = rememberCoroutineScope()

    // XP State
    val xpAmount by viewModel.xpAmount.collectAsState()
    val level = 4
    val nextLevelXp = 5000
    val progressXp = xpAmount.toFloat() / nextLevelXp

    // Stem Separator States (Suno/Udio style)
    var selectedTake by remember { mutableStateOf("Lead Vocal Take") }
    val takesList = listOf("Lead Vocal Take", "Synth Doubles", "Adlib Track", "Room Acoustic Take")
    var isStemSplitting by remember { mutableStateOf(false) }
    var stemSplitComplete by remember { mutableStateOf(false) }

    // Faders states
    var vocalVol by remember { mutableStateOf(0.8f) }
    var vocalMuted by remember { mutableStateOf(false) }
    var vocalSolo by remember { mutableStateOf(false) }

    var drumVol by remember { mutableStateOf(0.75f) }
    var drumMuted by remember { mutableStateOf(false) }
    var drumSolo by remember { mutableStateOf(false) }

    var bassVol by remember { mutableStateOf(0.85f) }
    var bassMuted by remember { mutableStateOf(false) }
    var bassSolo by remember { mutableStateOf(false) }

    var melodyVol by remember { mutableStateOf(0.65f) }
    var melodyMuted by remember { mutableStateOf(false) }
    var melodySolo by remember { mutableStateOf(false) }

    // Creative States
    var highBoost by remember { mutableStateOf(45f) }
    val sections by viewModel.sections.collectAsState()
    var selectedSectionId by remember { mutableStateOf(sections.firstOrNull()?.id ?: "intro") }
    var aiFeedbackTip by remember { mutableStateOf("Dynamics analysis: Verse-1 transitions sound clean. Try boosting hi-hat intensity.") }
    var isAnalyzingFeedback by remember { mutableStateOf(false) }

    // Dropdown for Section/Take selection
    var isSectionDropdownExpanded by remember { mutableStateOf(false) }
    var isTakeDropdownExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .width(width)
            .fillMaxHeight()
            .background(SurfaceDark)
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    val newWidth = (width - dragAmount.x.toDp()).coerceIn(240.dp, 400.dp)
                    onWidthChange(newWidth)
                }
            }
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("EXTRA AI TOOLS", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            IconButton(onClick = onCollapse) {
                Icon(Icons.Default.Close, contentDescription = "Close Tools", tint = TextSecondary)
            }
        }

        // Tab Selector
        TabRow(
            selectedTabIndex = activeTab,
            containerColor = SurfaceSubtle,
            contentColor = CyanNeon,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[activeTab]),
                    color = CyanNeon
                )
            },
            modifier = Modifier.clip(RoundedCornerShape(8.dp)).height(36.dp)
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = activeTab == index,
                    onClick = { activeTab = index },
                    text = { Text(title, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        if (activeTab == 0) {
            // --- ARI AI INTERACTIVE STUDIO PARTNER ---
            AriAiChatView(viewModel)
        } else if (activeTab == 1) {
            // SUNO / UDIO STYLE STEM SPLITTER
            Text("AI MULTI-TRACK STEM SEPARATOR", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            
            // Dropdown selection of takes
            Box(modifier = Modifier.fillMaxWidth()) {
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { isTakeDropdownExpanded = true },
                    colors = CardDefaults.cardColors(containerColor = SurfaceSubtle),
                    border = BorderStroke(1.dp, Color(0x1FA855F7))
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(selectedTake, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text("▼", color = CyanNeon, fontSize = 10.sp)
                    }
                }
                DropdownMenu(
                    expanded = isTakeDropdownExpanded,
                    onDismissRequest = { isTakeDropdownExpanded = false },
                    modifier = Modifier.background(SurfaceSubtle)
                ) {
                    takesList.forEach { take ->
                        DropdownMenuItem(
                            text = { Text(take, color = TextPrimary, fontSize = 12.sp) },
                            onClick = {
                                selectedTake = take
                                isTakeDropdownExpanded = false
                            }
                        )
                    }
                }
            }

            Button(
                onClick = {
                    isStemSplitting = true
                    stemSplitComplete = false
                    scope.launch {
                        delay(1200) // realistic splitting processing
                        isStemSplitting = false
                        stemSplitComplete = true
                        viewModel.addXp(350) // award split XP!
                    }
                },
                modifier = Modifier.fillMaxWidth().height(42.dp).testTag("stem_split_button"),
                colors = ButtonDefaults.buttonColors(containerColor = PurpleNeon),
                enabled = !isStemSplitting
            ) {
                if (isStemSplitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("EXTRACTING STEMS...", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("SPLIT INTO 4 STEMS", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Stem faders deck
            Text("STEM MIXING DESK", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)

            if (!stemSplitComplete && !isStemSplitting) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(SurfaceSubtle)
                        .border(BorderStroke(1.dp, Color(0x0FA855F7)), RoundedCornerShape(8.dp))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "No split stems active.\nSelect a take above & split to reveal multitrack controls.",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    item {
                        StemFaderRow("VOCALS", vocalVol, vocalMuted, vocalSolo, PurpleNeon, { vocalVol = it }, { vocalMuted = it }, { vocalSolo = it })
                        StemFaderRow("DRUMS", drumVol, drumMuted, drumSolo, Color(0xFFFBBF24), { drumVol = it }, { drumMuted = it }, { drumSolo = it })
                        StemFaderRow("BASS", bassVol, bassMuted, bassSolo, Color(0xFFEF4444), { bassVol = it }, { bassMuted = it }, { bassSolo = it })
                        StemFaderRow("MELODY", melodyVol, melodyMuted, melodySolo, Color(0xFF10B981), { melodyVol = it }, { melodyMuted = it }, { melodySolo = it })
                    }
                }
            }
        } else {
            // CREATIVE COMPILATION & TEMPLATE GENERATORS
            
            // LEVEL TRACKER CARD
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SurfaceSubtle),
                border = BorderStroke(1.dp, Color(0x3FD946EF))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("LEVEL $level BEATMAKER", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Text("$xpAmount / $nextLevelXp XP", color = MagentaNeon, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = progressXp.coerceIn(0f, 1f),
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                        color = MagentaNeon,
                        trackColor = BackgroundDark
                    )
                }
            }

            // TRANSIST BOOSTER
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SurfaceSubtle),
                border = BorderStroke(1.dp, Color(0x1F8B5CF6))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("HIGH EYE OPTIMIZE", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Enhance high frequency transients & air presence.", color = TextSecondary, fontSize = 10.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Slider(
                            value = highBoost,
                            onValueChange = { highBoost = it },
                            valueRange = 0f..100f,
                            modifier = Modifier.weight(1f),
                            colors = SliderDefaults.colors(activeTrackColor = CyanNeon, thumbColor = CyanNeon)
                        )
                        Text("${highBoost.toInt()}%", color = CyanNeon, fontSize = 11.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.width(36.dp), textAlign = TextAlign.End)
                    }
                }
            }

            // SIGNATURE BAR BANK (INJECTION SYSTEM)
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SurfaceSubtle),
                border = BorderStroke(1.dp, Color(0x1F06B6D4))
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("SIGNATURE BAR BANK", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("Auto-inject sequenced drum blueprints into the active section.", color = TextSecondary, fontSize = 10.sp)
                    
                    // Select Target Section Dropdown
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable { isSectionDropdownExpanded = true },
                            colors = CardDefaults.cardColors(containerColor = BackgroundDark),
                            border = BorderStroke(1.dp, Color(0x1F8B5CF6))
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val sectionName = sections.firstOrNull { it.id == selectedSectionId }?.name ?: "Intro"
                                Text("Section: $sectionName", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("▼", color = PurpleNeon, fontSize = 9.sp)
                            }
                        }
                        DropdownMenu(
                            expanded = isSectionDropdownExpanded,
                            onDismissRequest = { isSectionDropdownExpanded = false },
                            modifier = Modifier.background(SurfaceDark)
                        ) {
                            sections.forEach { section ->
                                DropdownMenuItem(
                                    text = { Text(section.name, color = TextPrimary, fontSize = 12.sp) },
                                    onClick = {
                                        selectedSectionId = section.id
                                        isSectionDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Preset Buttons
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Trap 16ths", "BoomBap Swing", "Synthwave 8ths", "Reggaeton 3-2").chunked(2).forEach { rowPresets ->
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                rowPresets.forEach { preset ->
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(BackgroundDark)
                                            .border(BorderStroke(1.dp, CyanNeon.copy(alpha = 0.3f)), RoundedCornerShape(6.dp))
                                            .clickable {
                                                viewModel.applyRhythmPreset(selectedSectionId, preset)
                                            }
                                            .padding(vertical = 8.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(preset, color = TextPrimary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // REAL-TIME AI CRITIQUE ENGINE
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SurfaceSubtle),
                border = BorderStroke(1.dp, Color(0x1FA855F7))
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("AI FEEDBACK ENGINE", color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        IconButton(
                            onClick = {
                                isAnalyzingFeedback = true
                                scope.launch {
                                    delay(600)
                                    val sectionName = sections.firstOrNull { it.id == selectedSectionId }?.name ?: "Active section"
                                    aiFeedbackTip = "Feedback for $sectionName at ${viewModel.bpm.value} BPM:\n" +
                                            "Excellent transient drive. We advise dropping snare volume by 1.5dB to optimize high-mids."
                                    isAnalyzingFeedback = false
                                    viewModel.addXp(80)
                                }
                            },
                            modifier = Modifier.size(24.dp)
                        ) {
                            if (isAnalyzingFeedback) {
                                CircularProgressIndicator(color = MagentaNeon, modifier = Modifier.size(14.dp), strokeWidth = 1.5.dp)
                            } else {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh Critique", tint = MagentaNeon, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                    Text(
                        aiFeedbackTip,
                        color = TextSecondary,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.SansSerif,
                        lineHeight = 15.sp
                    )
                }
            }
        }
    }
}

@Composable
fun StemFaderRow(
    label: String,
    volume: Float,
    isMuted: Boolean,
    isSolo: Boolean,
    glowColor: Color,
    onVolumeChange: (Float) -> Unit,
    onMuteToggle: (Boolean) -> Unit,
    onSoloToggle: (Boolean) -> Unit
) {
    val peakValue = remember(volume, isMuted) {
        if (isMuted) 0f else volume * (0.6f + (Math.random().toFloat() * 0.4f))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = BackgroundDark),
        border = BorderStroke(1.dp, glowColor.copy(alpha = 0.2f))
    ) {
        Column(modifier = Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(label, color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                    // Mute Button
                    Box(
                        modifier = Modifier
                            .size(26.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (isMuted) Color.Red else SurfaceSubtle)
                            .clickable { onMuteToggle(!isMuted) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text("M", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                    // Solo Button
                    Box(
                        modifier = Modifier
                            .size(26.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (isSolo) glowColor else SurfaceSubtle)
                            .clickable { onSoloToggle(!isSolo) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text("S", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Slider(
                    value = volume,
                    onValueChange = onVolumeChange,
                    modifier = Modifier.weight(1f),
                    colors = SliderDefaults.colors(activeTrackColor = glowColor, thumbColor = glowColor)
                )

                Spacer(modifier = Modifier.width(8.dp))

                // Small bouncing visual meter bar
                Box(
                    modifier = Modifier
                        .width(48.dp)
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(SurfaceSubtle)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(peakValue.coerceIn(0f, 1f))
                            .background(glowColor)
                    )
                }
            }
        }
    }
}

@Composable
fun TransportBar(
    isPlaying: Boolean,
    onPlayPause: () -> Unit,
    bpm: Double,
    onBpmChange: (Double) -> Unit,
    timecode: String,
    barPosition: Int,
    meterL: Float,
    meterR: Float,
    spectrum: FloatArray
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SurfaceDark)
            .border(BorderStroke(1.dp, Color(0x3F8B5CF6)))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Controls left (prev / play / next)
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = {}) {
                Text("◀◀", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
            IconButton(
                onClick = onPlayPause,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(PurpleNeon)
            ) {
                Text(
                    text = if (isPlaying) "‖" else "▶",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            IconButton(onClick = {}) {
                Text("▶▶", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Mid - BPM, bar count, timecode
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("BPM", color = TextSecondary, fontSize = 10.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { onBpmChange(bpm - 1) }) {
                        Text("-", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(
                        text = String.format("%.1f", bpm),
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = { onBpmChange(bpm + 1) }) {
                        Text("+", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("TIMECODE", color = TextSecondary, fontSize = 10.sp)
                Text(
                    timecode,
                    color = MagentaNeon,
                    fontSize = 16.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("BAR", color = TextSecondary, fontSize = 10.sp)
                Text(
                    barPosition.toString(),
                    color = CyanNeon,
                    fontSize = 16.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Stereo meter and Live spectrum analyzer drawings
        Row(
            modifier = Modifier.width(220.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Live spectrum analyzer drawing using canvas
            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .height(40.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(BackgroundDark)
            ) {
                val barWidth = size.width / spectrum.size
                spectrum.forEachIndexed { i, value ->
                    val heightRatio = (value + 80f) / 80f // 0 to 1 range
                    val barHeight = size.height * heightRatio.coerceIn(0f, 1f)
                    drawRect(
                        color = PurpleNeon.copy(alpha = 0.8f),
                        topLeft = Offset(i * barWidth, size.height - barHeight),
                        size = androidx.compose.ui.geometry.Size(barWidth - 1f, barHeight)
                    )
                }
            }

            // Stereo Meters
            Column(modifier = Modifier.width(60.dp)) {
                MeterBar("L", meterL)
                Spacer(modifier = Modifier.height(4.dp))
                MeterBar("R", meterR)
            }
        }
    }
}

@Composable
fun MeterBar(label: String, dbValue: Float) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = TextSecondary, fontSize = 9.sp, modifier = Modifier.width(10.dp))
        val barFill = ((dbValue + 60f) / 60f).coerceIn(0f, 1f)
        Box(
            modifier = Modifier
                .weight(1f)
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(SurfaceSubtle)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(barFill)
                    .clip(RoundedCornerShape(3.dp))
                    .background(if (dbValue > -3.0f) Color.Red else CyanNeon)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AriAiChatView(viewModel: DawViewModel) {
    val chatLog by viewModel.ariChatLog.collectAsState()
    val isTyping by viewModel.isAriTyping.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // Scroll to bottom when new messages arrive
    LaunchedEffect(chatLog.size, isTyping) {
        if (chatLog.isNotEmpty()) {
            listState.animateScrollToItem(chatLog.size - 1)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Chat Bubbles area
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(BackgroundDark)
                .border(BorderStroke(1.dp, Color(0x0FA855F7)), RoundedCornerShape(8.dp))
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(chatLog) { msg ->
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (msg.role == "user") Alignment.End else Alignment.Start
                ) {
                    // Chat Bubble
                    Box(
                        modifier = Modifier
                            .clip(
                                RoundedCornerShape(
                                    topStart = 12.dp,
                                    topEnd = 12.dp,
                                    bottomStart = if (msg.role == "user") 12.dp else 0.dp,
                                    bottomEnd = if (msg.role == "user") 0.dp else 12.dp
                                )
                            )
                            .background(if (msg.role == "user") SurfaceSubtle else Color(0xFF191330))
                            .border(
                                BorderStroke(
                                    1.dp,
                                    if (msg.role == "user") CyanNeon.copy(alpha = 0.4f) else PurpleNeon.copy(alpha = 0.4f)
                                ),
                                RoundedCornerShape(
                                    topStart = 12.dp,
                                    topEnd = 12.dp,
                                    bottomStart = if (msg.role == "user") 12.dp else 0.dp,
                                    bottomEnd = if (msg.role == "user") 0.dp else 12.dp
                                )
                            )
                            .padding(10.dp)
                    ) {
                        Text(
                            text = msg.text,
                            color = if (msg.role == "user") CyanNeon else TextPrimary,
                            fontSize = 11.sp,
                            lineHeight = 15.sp
                        )
                    }

                    // Special Directive Card (if pending command exists)
                    msg.pendingCommand?.let { cmd ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Card(
                            modifier = Modifier
                                .fillMaxWidth(0.95f)
                                .align(Alignment.Start),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF23113D)),
                            border = BorderStroke(1.dp, MagentaNeon)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(MagentaNeon)
                                    )
                                    Text(
                                        text = "ARI EXECUTIVE ORDER",
                                        color = MagentaNeon,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = cmd.explanation,
                                    color = TextPrimary,
                                    fontSize = 10.sp,
                                    lineHeight = 14.sp
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = { viewModel.applyAriCommand(cmd) },
                                    modifier = Modifier.fillMaxWidth().height(32.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = MagentaNeon),
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Icon(
                                            Icons.Default.PlayArrow,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = "APPLY CO-PRODUCER CUT (+250 XP)",
                                            color = Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (isTyping) {
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(4.dp)
                    ) {
                        CircularProgressIndicator(
                            color = PurpleNeon,
                            modifier = Modifier.size(10.dp),
                            strokeWidth = 1.dp
                        )
                        Text(
                            text = "ari is analyzing DAW state...",
                            color = TextSecondary,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }
        }

        // Fast Action chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            val chips = listOf(
                "critique" to "critique my structure",
                "rewrite" to "rewrite active section lyrics",
                "beat" to "give me a trap beat",
                "reverb" to "space out active section reverb"
            )
            chips.forEach { chip ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(4.dp))
                        .background(SurfaceSubtle)
                        .border(BorderStroke(1.dp, Color(0x1FA855F7)), RoundedCornerShape(4.dp))
                        .clickable { viewModel.sendMessageToAri(chip.second) }
                        .padding(vertical = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = chip.first,
                        color = PurpleNeon,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        // Input Field Area
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            TextField(
                value = inputText,
                onValueChange = { inputText = it },
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .border(BorderStroke(1.dp, Color(0x3FA855F7)), RoundedCornerShape(8.dp)),
                placeholder = { Text("pitch a revision to Ari...", color = TextSecondary, fontSize = 11.sp) },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = SurfaceDark,
                    unfocusedContainerColor = SurfaceDark,
                    disabledContainerColor = SurfaceDark,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    cursorColor = CyanNeon,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                textStyle = TextStyle(fontSize = 11.sp),
                singleLine = true
            )

            IconButton(
                onClick = {
                    if (inputText.isNotBlank()) {
                        viewModel.sendMessageToAri(inputText)
                        inputText = ""
                    }
                },
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(CyanNeon)
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Send",
                    tint = Color.White,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
