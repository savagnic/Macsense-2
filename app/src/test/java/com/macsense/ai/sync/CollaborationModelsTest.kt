package com.macsense.ai.sync

import org.junit.Assert.*
import org.junit.Test

class CollaborationModelsTest {

    @Test
    fun `ProjectShareLink has all access levels`() {
        val levels = ProjectShareLink.AccessLevel.values()
        assertTrue(levels.contains(ProjectShareLink.AccessLevel.VIEW_ONLY))
        assertTrue(levels.contains(ProjectShareLink.AccessLevel.COMMENT))
        assertTrue(levels.contains(ProjectShareLink.AccessLevel.PROPOSE_EDITS))
        assertTrue(levels.contains(ProjectShareLink.AccessLevel.FULL_EDIT))
    }

    @Test
    fun `ProjectComment anchors to section, stem, lyric, and time range`() {
        val sectionAnchor = ProjectComment.CommentAnchor.SectionAnchor("verse-1")
        val stemAnchor = ProjectComment.CommentAnchor.StemAnchor("verse-1", "808/Bass")
        val lyricAnchor = ProjectComment.CommentAnchor.LyricAnchor("verse-1", 2)
        val timeAnchor = ProjectComment.CommentAnchor.TimeRangeAnchor(30.0, 45.0)

        assertTrue(sectionAnchor is ProjectComment.CommentAnchor.SectionAnchor)
        assertTrue(stemAnchor is ProjectComment.CommentAnchor.StemAnchor)
        assertTrue(lyricAnchor is ProjectComment.CommentAnchor.LyricAnchor)
        assertTrue(timeAnchor is ProjectComment.CommentAnchor.TimeRangeAnchor)
    }

    @Test
    fun `BranchProposal starts as PENDING`() {
        val proposal = BranchProposal(
            id = "prop-1", projectId = "proj-1", branchId = "branch-1",
            proposerUserId = "user-1", proposerName = "Alice",
            title = "New hook melody", description = "Try this",
            createdAt = 1_700_000_000_000L
        )
        assertEquals(BranchProposal.ProposalStatus.PENDING, proposal.status)
        assertNull(proposal.reviewedAt)
        assertNull(proposal.reviewerUserId)
    }

    @Test
    fun `CollaborationState EMPTY has no pending items`() {
        assertEquals(0, CollaborationState.EMPTY.pendingCommentCount)
        assertEquals(0, CollaborationState.EMPTY.pendingProposalCount)
        assertNull(CollaborationState.EMPTY.shareLink)
    }
}
