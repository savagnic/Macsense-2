package com.macsense.ai.ui.writingsurface

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.macsense.ai.ui.theme.*

@Composable
fun LyricDiffEditor(
    originalText: String,
    suggestedText: String,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    modifier: Modifier = Modifier,
    /** Shows the suggestion as deterministic local automation so it is never mistaken for cloud AI. */
    isLocalAutomation: Boolean = false
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(2.dp, MacsenseGoldPrimary, RoundedCornerShape(12.dp))
            .testTag("lyric_diff_editor"),
        colors = CardDefaults.cardColors(containerColor = MacsensePanelPurple),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ARI SUGGESTION (DIFF PREVIEW)",
                    color = MacsenseGoldPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = if (isLocalAutomation) "LOCAL AUTOMATION — NOT CLOUD AI" else "PREVIEW MODE",
                    color = MacsenseTextSecondary,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier
                        .background(MacsenseCardPurple, RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                        .testTag("diff_source_badge")
                )
            }

            // Original Text Block (Red background with strike-through)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(MacsenseError.copy(alpha = 0.15f))
                    .border(1.dp, MacsenseError.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                    .padding(12.dp)
            ) {
                Text(
                    text = "ORIGINAL",
                    color = MacsenseError,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = originalText,
                    color = MacsenseTextPrimary,
                    fontSize = 14.sp,
                    textDecoration = TextDecoration.LineThrough,
                    fontFamily = FontFamily.SansSerif
                )
            }

            // Suggested Text Block (Green background)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(MacsenseSuccess.copy(alpha = 0.15f))
                    .border(1.dp, MacsenseSuccess.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                    .padding(12.dp)
            ) {
                Text(
                    text = "SUGGESTION",
                    color = MacsenseSuccess,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = suggestedText,
                    color = MacsenseTextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.SansSerif,
                    modifier = Modifier.testTag("diff_suggested_text")
                )
            }

            // Accept & Reject Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = onReject,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MacsenseCardPurple,
                        contentColor = MacsenseTextPrimary
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("reject_diff_button")
                ) {
                    Text(
                        text = "REJECT",
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Button(
                    onClick = onAccept,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MacsenseGoldPrimary,
                        contentColor = MacsenseVoidBlack
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("accept_diff_button")
                ) {
                    Text(
                        text = "ACCEPT",
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}
