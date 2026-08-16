package com.macsense.ai.ui.writingsurface

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.macsense.ai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WritingSurfaceScreen(
    viewModel: WritingSurfaceViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val lyrics by viewModel.lyricsText.collectAsState()
    val selection by viewModel.selectedTextSpan.collectAsState()
    val activeTab by viewModel.activeTab.collectAsState()
    val artistIdentity by viewModel.artistIdentity.collectAsState()
    val isDiffVisible by viewModel.isDiffVisible.collectAsState()
    val diffOriginal by viewModel.diffOriginal.collectAsState()
    val diffSuggested by viewModel.diffSuggested.collectAsState()
    val diffIsLocalAutomation by viewModel.diffIsLocalAutomation.collectAsState()
    val isGenerating by viewModel.isGenerating.collectAsState()
    val savedRequests by viewModel.savedRequests.collectAsState()
    val chatLog by viewModel.chatLog.collectAsState()
    val isAriTyping by viewModel.isAriTyping.collectAsState()
    val stats by viewModel.stats.collectAsState()

    // Map lyrics string to TextFieldValue to support selection monitoring
    var textFieldValueState by remember {
        mutableStateOf(TextFieldValue(text = lyrics, selection = TextRange.Zero))
    }

    // Keep TextFieldValue synchronized if lyrics are modified outside (like when accepting a diff)
    LaunchedEffect(lyrics) {
        if (textFieldValueState.text != lyrics) {
            textFieldValueState = textFieldValueState.copy(text = lyrics, selection = TextRange.Zero)
        }
    }

    // Sync selection from TextFieldValue back to ViewModel
    LaunchedEffect(textFieldValueState.selection) {
        val sel = textFieldValueState.selection
        if (sel.length > 0) {
            viewModel.selectTextRange(sel.start, sel.end)
        } else {
            viewModel.clearSelection()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MacsenseVoidBlack)
            .padding(16.dp)
            .testTag("writing_surface_screen")
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header Stats Strip
            CreativeStatsStrip(stats = stats)

            Row(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Left Area: Editor & Tabs
                Column(
                    modifier = Modifier
                        .weight(1.3f)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Navigation Tabs
                    TabRow(
                        selectedTabIndex = activeTab,
                        containerColor = MacsensePanelPurple,
                        contentColor = MacsenseGoldPrimary,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.dp, MacsenseBorderPurple, RoundedCornerShape(8.dp))
                            .testTag("writing_surface_tabs")
                    ) {
                        Tab(
                            selected = activeTab == 0,
                            onClick = { viewModel.setTab(0) },
                            text = { Text("SOLO WRITING", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace) },
                            modifier = Modifier.testTag("tab_solo_writing")
                        )
                        Tab(
                            selected = activeTab == 1,
                            onClick = { viewModel.setTab(1) },
                            text = { Text("AI ASSISTANCE", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace) },
                            modifier = Modifier.testTag("tab_ai_assistance")
                        )
                        Tab(
                            selected = activeTab == 2,
                            onClick = { viewModel.setTab(2) },
                            text = { Text("SAVED REQUESTS", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace) },
                            modifier = Modifier.testTag("tab_saved_requests")
                        )
                    }

                    // Content Pane based on selected tab
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MacsensePanelPurple),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MacsenseBorderPurple),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            when (activeTab) {
                                0 -> {
                                    // Tab 0: Solo Writing Area
                                    Column(modifier = Modifier.fillMaxSize()) {
                                        Text(
                                            text = "LYRICS BLUEPRINT COMPOSER",
                                            color = MacsenseTextSecondary,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace,
                                            modifier = Modifier.padding(bottom = 8.dp)
                                        )

                                        OutlinedTextField(
                                            value = textFieldValueState,
                                            onValueChange = { textFieldValueState = it },
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .testTag("lyrics_editor_text_field"),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedContainerColor = MacsenseVoidBlack,
                                                unfocusedContainerColor = MacsenseVoidBlack,
                                                focusedBorderColor = MacsenseGoldPrimary,
                                                unfocusedBorderColor = MacsenseBorderPurple,
                                                focusedTextColor = MacsenseTextPrimary,
                                                unfocusedTextColor = MacsenseTextPrimary
                                            ),
                                            textStyle = androidx.compose.ui.text.TextStyle(
                                                fontSize = 15.sp,
                                                lineHeight = 24.sp,
                                                fontFamily = FontFamily.SansSerif
                                            )
                                        )
                                    }
                                }
                                1 -> {
                                    // Tab 1: AI Assistance & Identity Bank
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        verticalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        Text(
                                            text = "CHORUS CO-WRITING AND PERSOS",
                                            color = MacsenseTextSecondary,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace
                                        )

                                        IdentityBank(
                                            selectedIdentityId = artistIdentity,
                                            onIdentitySelected = { viewModel.setArtistIdentity(it) }
                                        )

                                        // Quick Style actions help card
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            colors = CardDefaults.cardColors(containerColor = MacsenseCardPurple),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Column(modifier = Modifier.padding(12.dp)) {
                                                Text(
                                                    text = "CREATIVE TIPS FOR CO-PRODUCTION",
                                                    color = MacsenseGoldPrimary,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    fontFamily = FontFamily.Monospace
                                                )
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    text = "Highlight a word or lyric line in the Solo Writing tab, then select one of Ari's quick actions (e.g. Better Cadence) in the co-producer panel to get a styled acceptance diff preview.",
                                                    color = MacsenseTextSecondary,
                                                    fontSize = 11.sp,
                                                    lineHeight = 16.sp
                                                )
                                            }
                                        }
                                    }
                                }
                                2 -> {
                                    // Tab 2: Saved Requests / History
                                    Column(modifier = Modifier.fillMaxSize()) {
                                        Text(
                                            text = "SAVED REQUESTS HISTORY",
                                            color = MacsenseTextSecondary,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace,
                                            modifier = Modifier.padding(bottom = 8.dp)
                                        )

                                        if (savedRequests.isEmpty()) {
                                            Box(
                                                modifier = Modifier.fillMaxSize(),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    text = "No saved requests in this session.",
                                                    color = MacsenseTextMuted,
                                                    fontSize = 12.sp,
                                                    fontFamily = FontFamily.Monospace
                                                )
                                            }
                                        } else {
                                            LazyColumn(
                                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .testTag("saved_requests_history_list")
                                            ) {
                                                items(savedRequests) { req ->
                                                    Card(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        colors = CardDefaults.cardColors(containerColor = MacsenseCardPurple),
                                                        border = androidx.compose.foundation.BorderStroke(1.dp, MacsenseBorderPurple),
                                                        shape = RoundedCornerShape(8.dp)
                                                    ) {
                                                        Column(modifier = Modifier.padding(12.dp)) {
                                                            Row(
                                                                modifier = Modifier.fillMaxWidth(),
                                                                horizontalArrangement = Arrangement.SpaceBetween
                                                            ) {
                                                                Text(
                                                                    text = "${req.action.uppercase()} (${req.artistIdentity.uppercase()})",
                                                                    color = MacsenseGoldPrimary,
                                                                    fontSize = 10.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    fontFamily = FontFamily.Monospace
                                                                )
                                                                Text(
                                                                    text = req.timestamp,
                                                                    color = MacsenseTextMuted,
                                                                    fontSize = 9.sp,
                                                                    fontFamily = FontFamily.Monospace
                                                                )
                                                            }
                                                            Spacer(modifier = Modifier.height(4.dp))
                                                            Text(
                                                                text = "Original: \"${req.originalText}\"",
                                                                color = MacsenseTextSecondary,
                                                                fontSize = 11.sp,
                                                                fontFamily = FontFamily.Monospace
                                                            )
                                                            Spacer(modifier = Modifier.height(2.dp))
                                                            Text(
                                                                text = "Suggestion: \"${req.suggestion}\"",
                                                                color = MacsenseSuccess,
                                                                fontSize = 12.sp,
                                                                fontWeight = FontWeight.Bold
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Right Area: Docked Ari Panel
                AriDockedPanel(
                    chatLog = chatLog,
                    isAriTyping = isAriTyping,
                    onSendMessage = { viewModel.sendMessageToAri(it) },
                    selectedTextRange = selection,
                    onTriggerLyricEdit = { viewModel.triggerLyricEditAction(it) },
                    isGeneratingEdit = isGenerating,
                    modifier = Modifier.weight(0.9f)
                )
            }
        }

        // Floating Diff Editor Overlay
        if (isDiffVisible && diffOriginal != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable { /* dismiss or ignore click outside */ },
                contentAlignment = Alignment.Center
            ) {
                LyricDiffEditor(
                    originalText = diffOriginal?.text.orEmpty(),
                    suggestedText = diffSuggested,
                    isLocalAutomation = diffIsLocalAutomation,
                    onAccept = { viewModel.acceptDiff() },
                    onReject = { viewModel.rejectDiff() },
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .padding(16.dp)
                )
            }
        }
    }
}
