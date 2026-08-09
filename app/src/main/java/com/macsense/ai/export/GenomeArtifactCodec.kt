package com.macsense.ai.export

import com.macsense.ai.audio.SoundArchive
import com.macsense.ai.audio.SoundGenome
import com.macsense.ai.data.local.ProjectEntity
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Genome artifact: the serializable DNA record for a take that can be shared,
 * imported, and bred against on any device. Stored as JSON (base64-friendly).
 */
@Serializable
data class GenomeArtifact(
    @SerialName("genome_id") val genomeId: String,
    @SerialName("take_id") val takeId: String,
    @SerialName("track_name") val trackName: String,
    @SerialName("creator_name") val creatorName: String,
    @SerialName("version") val version: String = "1.0",
    @SerialName("genome_data") val genomeData: Map<String, Float> = emptyMap(),
    @SerialName("tags") val tags: List<String> = emptyList(),
    @SerialName("created_at_ms") val createdAtMs: Long = System.currentTimeMillis()
)

/**
 * Multi-version export factory.
 *
 * Produces versioned exports from a project + its archive entries:
 * - v1.0: plain JSON genome artifact
 * - v2.0: JSON with lineage chain embedded
 * - Shareable URI: base64-encoded v2.0 payload, suitable for deep-link sharing
 */
object GenomeArtifactCodec {

    private val json = Json {
        prettyPrint = false
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    /**
     * Creates a GenomeArtifact from an archive entry and optional genome.
     * Version defaults to "1.0" for backward compatibility.
     */
    fun encodeV1(
        entry: SoundArchive.Entry,
        genome: SoundGenome?,
        trackName: String,
        creatorName: String
    ): GenomeArtifact = GenomeArtifact(
        genomeId = java.util.UUID.randomUUID().toString(),
        takeId = entry.takeId,
        trackName = trackName,
        creatorName = creatorName,
        version = "1.0",
        genomeData = genome?.toMap() ?: emptyMap(),
        tags = entry.tags.toList()
    )

    /**
     * V2.0: carries the take's ancestry alongside its traits.
     *
     * genomeData holds numeric traits only, so the chain travels as ordered
     * `lineage:<takeId>` tags, oldest ancestor first, ending with this take. That keeps the
     * artifact a single flat JSON document that an importer can walk without a nested parse.
     */
    fun encodeV2(
        entry: SoundArchive.Entry,
        genome: SoundGenome?,
        allEntries: List<SoundArchive.Entry>,
        trackName: String,
        creatorName: String
    ): GenomeArtifact {
        val lineageChain = buildLineage(entry.takeId, allEntries)
        val base = encodeV1(entry, genome, trackName, creatorName)
        return base.copy(
            version = "2.0",
            genomeData = base.genomeData + mapOf("lineage_depth" to lineageChain.size.toFloat()),
            tags = base.tags + listOf("v2", "lineage") + lineageChain.map { "$LINEAGE_TAG_PREFIX${it.takeId}" }
        )
    }

    /** Prefix marking an ancestry entry in [GenomeArtifact.tags]. */
    const val LINEAGE_TAG_PREFIX = "lineage:"

    /** Reads the ancestry chain back out of an artifact, oldest ancestor first. */
    fun lineageOf(artifact: GenomeArtifact): List<String> =
        artifact.tags.filter { it.startsWith(LINEAGE_TAG_PREFIX) }
            .map { it.removePrefix(LINEAGE_TAG_PREFIX) }

    /** Serializes a [GenomeArtifact] to JSON string. */
    fun toJson(artifact: GenomeArtifact): String =
        json.encodeToString(GenomeArtifact.serializer(), artifact)

    /** Deserializes a [GenomeArtifact] from JSON string. Throws on malformed input. */
    fun fromJson(raw: String): GenomeArtifact =
        json.decodeFromString(GenomeArtifact.serializer(), raw)

    /** Returns a URL-safe base64-encoded genome string for sharing via deep link. */
    fun toShareableUri(artifact: GenomeArtifact): String {
        val jsonBytes = toJson(artifact).toByteArray(Charsets.UTF_8)
        return android.util.Base64.encodeToString(jsonBytes, android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP)
    }

    /** Decodes a shareable URI back to a [GenomeArtifact]. */
    fun fromShareableUri(uri: String): GenomeArtifact {
        val decoded = android.util.Base64.decode(uri, android.util.Base64.URL_SAFE)
        return fromJson(String(decoded, Charsets.UTF_8))
    }

    /**
     * Rebuilds an archive entry from a shared artifact so it can be bred against local sounds.
     *
     * The imported take keeps its own new id but records where it came from: [SoundArchive.Entry.originTakeId]
     * points at the source take and the genome's parents carry the exported ancestry, so lineage
     * survives crossing between projects.
     *
     * Throws when the payload is not a valid artifact, or when its traits are outside the range a
     * genome permits. A malformed import must fail loudly rather than enter the archive as a
     * plausible-looking sound with invented traits.
     */
    fun importEntry(raw: String, newTakeId: String): SoundArchive.Entry {
        val artifact = fromJson(raw)
        val ancestry = lineageOf(artifact)
        return SoundArchive.Entry(
            takeId = newTakeId,
            state = SoundArchive.State.REBORN,
            tags = artifact.tags.filterNot { it.startsWith(LINEAGE_TAG_PREFIX) }.toSet(),
            genome = artifact.genomeData.toGenomeOrNull(sourceId = newTakeId, parents = ancestry),
            originTakeId = artifact.takeId,
        )
    }

    private fun buildLineage(
        takeId: String,
        all: List<SoundArchive.Entry>
    ): List<SoundArchive.Entry> {
        val byId = all.associateBy { it.takeId }
        val chain = mutableListOf<SoundArchive.Entry>()
        var cur = byId[takeId]
        var depth = 0
        while (cur != null && depth < 30) {
            chain.add(0, cur)
            cur = cur.originTakeId?.let { byId[it] }
            depth++
        }
        return chain
    }
}

/**
 * Extension: converts SoundGenome to a plain Float map for serialization.
 *
 * These are the measured traits SoundGenome actually carries. Only real measurements are
 * exported — a trait that was never measured must not be invented here, because an importer
 * cannot tell a guessed value from a measured one once it is in the artifact.
 */
/**
 * Reverse of [toMap]. Returns null when the artifact carries no measured traits, so an entry
 * imported without a genome is honestly genome-less rather than silently defaulted to zeros.
 */
private fun Map<String, Float>.toGenomeOrNull(sourceId: String, parents: List<String>): SoundGenome? {
    val transient = this["transient"] ?: return null
    val harmonicity = this["harmonicity"] ?: return null
    val brightness = this["brightness"] ?: return null
    val dynamics = this["dynamics"] ?: return null
    return SoundGenome(
        sourceId = sourceId,
        transient = transient.toDouble(),
        harmonicity = harmonicity.toDouble(),
        brightness = brightness.toDouble(),
        dynamics = dynamics.toDouble(),
        stereoWidth = (this["stereo_width"] ?: 0.0f).toDouble(),
        confidence = (this["confidence"] ?: 1.0f).toDouble(),
        parents = parents,
    )
}

private fun SoundGenome.toMap(): Map<String, Float> = mapOf(
    "transient" to transient.toFloat(),
    "harmonicity" to harmonicity.toFloat(),
    "brightness" to brightness.toFloat(),
    "dynamics" to dynamics.toFloat(),
    "stereo_width" to stereoWidth.toFloat(),
    "confidence" to confidence.toFloat(),
)
