package com.macsense.ai.data.local

import androidx.room.Database
import androidx.room.Room
import androidx.room.TypeConverters
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Regression test for the "missed migration" scenario: Room throws [IllegalStateException] when
 * a database file is reopened against a higher schema version with no migration path and no
 * `fallbackToDestructiveMigration()` configured.
 *
 * This test documents two behaviors:
 * 1. Without fallback → the upgrade throws, which is the correct and expected fail-closed behavior
 *    in [com.macsense.ai.di.AppContainer] (user data is preserved; the app fails loudly rather
 *    than silently wiping projects).
 * 2. With explicit fallback → the database recreates its schema, shown here so recovery tooling
 *    can reference the pattern. AppContainer intentionally does NOT configure this fallback in
 *    production because destroying user projects is worse than a clean upgrade failure.
 */
@RunWith(RobolectricTestRunner::class)
class DestructiveMigrationFallbackTest {

    @Database(
        entities = [
            ProjectEntity::class,
            SectionEntity::class,
            SoundGenomeEntity::class,
            VersionNodeEntity::class,
            SoundArchiveEntryEntity::class,
            ClipEntity::class
        ],
        version = 99,
        exportSchema = false
    )
    @TypeConverters(Converters::class)
    abstract class FutureVersionDatabaseNoFallback : androidx.room.RoomDatabase() {
        abstract fun dao(): MacSenseDao
    }

    private val dbName = "fallback_test_${System.nanoTime()}.db"

    private fun allRealMigrations() = arrayOf(
        Migrations.MIGRATION_1_2, Migrations.MIGRATION_2_3, Migrations.MIGRATION_3_4
    )

    @Test(expected = IllegalStateException::class)
    fun reopeningAtHigherVersionWithoutFallback_throws() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()

        // Open + close at the real, current schema version first.
        val original = Room.databaseBuilder(context, MacSenseDatabase::class.java, dbName)
            .addMigrations(*allRealMigrations())
            .build()
        original.openHelper.writableDatabase
        original.close()

        // Reopen the same file against a higher-version schema with no migration path and no
        // fallback configured — this is the crash this fix prevents in AppContainer.
        val brokenUpgrade = Room.databaseBuilder(context, FutureVersionDatabaseNoFallback::class.java, dbName)
            .build()
        brokenUpgrade.openHelper.writableDatabase
    }

    @Test
    fun reopeningAtHigherVersionWithFallback_recreatesInsteadOfCrashing() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()

        val original = Room.databaseBuilder(context, MacSenseDatabase::class.java, dbName)
            .addMigrations(*allRealMigrations())
            .build()
        original.openHelper.writableDatabase
        original.close()

        // Same missed-migration scenario as above, but this time with the fallback explicitly
        // enabled — demonstrating the recovery path that tooling can use if needed.
        val recovered = Room.databaseBuilder(context, FutureVersionDatabaseNoFallback::class.java, dbName)
            .fallbackToDestructiveMigration()
            .build()

        val db = recovered.openHelper.writableDatabase
        assertEquals(99, db.version)
        recovered.close()
    }
}
