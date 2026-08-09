package com.macsense.ai.sync

import com.macsense.ai.data.local.ProjectEntity
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

// ============================================================
// Collaboration data shapes (P8 async collab — issue #43)
// ============================================================

/**
 * The Supabase wire shape for a comment row in the `project_comments` table.
 *
 * Named Cloud* to match CloudProject and to keep it distinct from the domain model
 * ProjectComment in CollaborationModels.kt, which is anchored to sections/stems/lyrics
 * rather than to a table row. Both existed under one name and the package would not compile.
 */
@Serializable
data class CloudProjectComment(
    @SerialName("id") val id: String? = null,
    @SerialName("project_local_id") val projectLocalId: String,
    @SerialName("author_id") val authorId: String,
    @SerialName("author_name") val authorName: String,
    @SerialName("text") val text: String,
    @SerialName("bar_position") val barPosition: Int? = null,
    @SerialName("created_at_ms") val createdAtMs: Long = System.currentTimeMillis()
)

/**
 * A shared-project invite record in Supabase `project_shares` table.
 */
@Serializable
data class ProjectShare(
    @SerialName("id") val id: String? = null,
    @SerialName("project_local_id") val projectLocalId: String,
    @SerialName("shared_by") val sharedBy: String,
    @SerialName("shared_with_email") val sharedWithEmail: String,
    @SerialName("permission") val permission: String = "view",  // "view" | "edit"
    @SerialName("created_at_ms") val createdAtMs: Long = System.currentTimeMillis()
)

/**
 * A version branch for A/B version diffing (ghost-branch collab),
 * stored in Supabase `project_branches` table.
 */
@Serializable
data class ProjectBranch(
    @SerialName("id") val id: String? = null,
    @SerialName("project_local_id") val projectLocalId: String,
    @SerialName("branch_name") val branchName: String,
    @SerialName("created_by") val createdBy: String,
    @SerialName("snapshot_json") val snapshotJson: String,
    @SerialName("created_at_ms") val createdAtMs: Long = System.currentTimeMillis()
)

// ============================================================
// Collaboration remote interface
// ============================================================

interface CollaborationRemote {
    suspend fun postComment(comment: CloudProjectComment): CloudProjectComment
    suspend fun fetchComments(projectLocalId: String): List<CloudProjectComment>
    suspend fun shareProject(share: ProjectShare): ProjectShare
    suspend fun fetchShares(projectLocalId: String): List<ProjectShare>
    suspend fun pushBranch(branch: ProjectBranch): ProjectBranch
    suspend fun fetchBranches(projectLocalId: String): List<ProjectBranch>
}

// ============================================================
// PostgREST implementation
// ============================================================

class SupabaseCollaborationRemote(
    private val baseUrl: String,
    private val apiKey: String,
    private val client: OkHttpClient = OkHttpClient(),
    private val json: Json = Json { ignoreUnknownKeys = true }
) : CollaborationRemote {

    private val mediaType = "application/json".toMediaType()
    private val headers get() = mapOf(
        "apikey" to apiKey,
        "Authorization" to "Bearer $apiKey",
        "Content-Type" to "application/json"
    )

    override suspend fun postComment(comment: CloudProjectComment): CloudProjectComment =
        upsertRow("project_comments", json.encodeToString(CloudProjectComment.serializer(), comment))

    override suspend fun fetchComments(projectLocalId: String): List<CloudProjectComment> =
        fetchRows("project_comments?project_local_id=eq.$projectLocalId&order=created_at_ms.asc",
            kotlinx.serialization.builtins.ListSerializer(CloudProjectComment.serializer()))

    override suspend fun shareProject(share: ProjectShare): ProjectShare =
        upsertRow("project_shares", json.encodeToString(ProjectShare.serializer(), share))

    override suspend fun fetchShares(projectLocalId: String): List<ProjectShare> =
        fetchRows("project_shares?project_local_id=eq.$projectLocalId",
            kotlinx.serialization.builtins.ListSerializer(ProjectShare.serializer()))

    override suspend fun pushBranch(branch: ProjectBranch): ProjectBranch =
        upsertRow("project_branches", json.encodeToString(ProjectBranch.serializer(), branch))

    override suspend fun fetchBranches(projectLocalId: String): List<ProjectBranch> =
        fetchRows("project_branches?project_local_id=eq.$projectLocalId&order=created_at_ms.desc",
            kotlinx.serialization.builtins.ListSerializer(ProjectBranch.serializer()))

    private inline fun <reified T> upsertRow(
        table: String,
        body: String
    ): T {
        val request = buildPost("$baseUrl/rest/v1/$table", body,
            extra = mapOf("Prefer" to "resolution=merge-duplicates,return=representation"))
        client.newCall(request).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            check(resp.isSuccessful) { "Supabase upsert $table failed: HTTP ${resp.code} $text" }
            val rows = json.decodeFromString(
                kotlinx.serialization.builtins.ListSerializer(
                    json.serializersModule.serializer<T>()
                ), text
            )
            return rows.first()
        }
    }

    private fun <T> fetchRows(path: String, deserializer: kotlinx.serialization.DeserializationStrategy<List<T>>): List<T> {
        val request = Request.Builder().url("$baseUrl/rest/v1/$path")
            .apply { headers.forEach { (k, v) -> header(k, v) } }.get().build()
        client.newCall(request).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            check(resp.isSuccessful) { "Supabase fetch $path failed: HTTP ${resp.code} $text" }
            return json.decodeFromString(deserializer, text)
        }
    }

    private fun buildPost(url: String, body: String, extra: Map<String, String> = emptyMap()) =
        Request.Builder().url(url)
            .apply { (headers + extra).forEach { (k, v) -> header(k, v) } }
            .post(body.toRequestBody(mediaType)).build()
}
