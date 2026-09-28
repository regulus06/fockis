/*
 * Fockis Friendship Duplicate Cleanup
 *
 * DRY RUN:
 *   node scripts/cleanup-friendship-duplicates.cjs
 *
 * APPLY:
 *   node scripts/cleanup-friendship-duplicates.cjs --apply
 *
 * Reads MONGO_URI or MONGODB_URI from the environment / .env.
 *
 * IMPORTANT:
 * - Default mode does NOT delete anything.
 * - It groups friendship records by the two users, regardless of direction.
 * - It keeps one record per user pair.
 * - Priority: accepted > blocked > pending > rejected.
 * - Within the same status, newest record is kept.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadDotEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/api/.env"),
    path.resolve(__dirname, "../.env"),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (
        !trimmed ||
        trimmed.startsWith("#") ||
        !trimmed.includes("=")
      ) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }

    break;
  }
}

loadDotEnv();

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI;

if (!mongoUri) {
  console.error(`
[FOCKIS FRIEND CLEANUP] MONGO_URI / MONGODB_URI was not found.

Set your MongoDB connection string first, for example:

PowerShell:
$env:MONGO_URI="your-mongodb-connection-string"

Then run:
node scripts/cleanup-friendship-duplicates.cjs
`);
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

const FriendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "blocked",
      ],
      required: true,
    },

    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    pairKey: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "friendships",
  },
);

const Friendship =
  mongoose.models.Friendship ||
  mongoose.model("Friendship", FriendshipSchema);

function getPairKey(firstUserId, secondUserId) {
  return [String(firstUserId), String(secondUserId)]
    .sort()
    .join(":");
}

function getStatusPriority(status) {
  switch (status) {
    case "accepted":
      return 4;

    case "blocked":
      return 3;

    case "pending":
      return 2;

    case "rejected":
      return 1;

    default:
      return 0;
  }
}

function dateValue(value) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

async function main() {
  console.log("");
  console.log("====================================================");
  console.log(" FOCKIS FRIENDSHIP DUPLICATE CLEANUP");
  console.log("====================================================");

  console.log(
    `[FOCKIS FRIEND CLEANUP] Mode: ${
      APPLY ? "APPLY / DELETE DUPLICATES" : "DRY RUN / NO DELETES"
    }`,
  );

  await mongoose.connect(mongoUri);

  console.log(
    `[FOCKIS FRIEND CLEANUP] MongoDB connected`,
  );

  console.log(
    `[FOCKIS FRIEND CLEANUP] Collection: ${Friendship.collection.name}`,
  );

  const records = await Friendship.find({})
    .sort({ createdAt: -1 })
    .lean();

  console.log(
    `[FOCKIS FRIEND CLEANUP] Total friendship records: ${records.length}`,
  );

  const groups = new Map();

  for (const record of records) {
    if (!record.requester || !record.receiver) {
      console.warn(
        `[FOCKIS FRIEND CLEANUP] SKIPPING malformed record: ${record._id}`,
      );

      continue;
    }

    const key = getPairKey(
      record.requester,
      record.receiver,
    );

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(record);
  }

  console.log(
    `[FOCKIS FRIEND CLEANUP] Unique user pairs: ${groups.size}`,
  );

  let duplicateCount = 0;
  let changedPairCount = 0;

  for (const [pairKey, group] of groups.entries()) {
    if (group.length === 0) {
      continue;
    }

    group.sort((a, b) => {
      const statusDifference =
        getStatusPriority(b.status) -
        getStatusPriority(a.status);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return (
        dateValue(b.createdAt) -
        dateValue(a.createdAt)
      );
    });

    const keep = group[0];
    const duplicates = group.slice(1);

    if (duplicates.length === 0) {
      /*
       * Even a non-duplicate record needs pairKey before the unique
       * database index is installed.
       */
      if (APPLY) {
        await Friendship.updateOne(
          { _id: keep._id },
          {
            $set: {
              pairKey,
            },
          },
        );
      }

      continue;
    }

    changedPairCount++;
    duplicateCount += duplicates.length;

    console.log("");
    console.log("--------------------------------------------");
    console.log(`[PAIR] ${pairKey}`);
    console.log(`Records: ${group.length}`);

    console.log(
      `[KEEP] ${keep._id} | ${keep.requester} -> ${keep.receiver} | ${keep.status}`,
    );

    for (const duplicate of duplicates) {
      console.log(
        `[DELETE] ${duplicate._id} | ${duplicate.requester} -> ${duplicate.receiver} | ${duplicate.status}`,
      );
    }

    if (!APPLY) {
      continue;
    }

    await Friendship.updateOne(
      { _id: keep._id },
      {
        $set: {
          pairKey,
        },
      },
    );

    await Friendship.deleteMany({
      _id: {
        $in: duplicates.map(
          (duplicate) => duplicate._id,
        ),
      },
    });
  }

  console.log("");
  console.log("====================================================");
  console.log(" FOCKIS FRIENDSHIP CLEANUP RESULT");
  console.log("====================================================");

  console.log(
    `[FOCKIS FRIEND CLEANUP] Unique pairs: ${groups.size}`,
  );

  console.log(
    `[FOCKIS FRIEND CLEANUP] Pairs containing duplicates: ${changedPairCount}`,
  );

  console.log(
    `[FOCKIS FRIEND CLEANUP] Duplicate records: ${duplicateCount}`,
  );

  if (APPLY) {
    console.log("");
    console.log(
      "[FOCKIS FRIEND CLEANUP] CLEANUP COMPLETE.",
    );

    console.log(
      "[FOCKIS FRIEND CLEANUP] Kept one relationship per user pair.",
    );

    console.log(
      "[FOCKIS FRIEND CLEANUP] pairKey has been written to retained records.",
    );

    console.log("");
    console.log(
      "NEXT: install the pairKey unique index through the updated Friendship schema.",
    );
  } else {
    console.log("");
    console.log(
      "[FOCKIS FRIEND CLEANUP] DRY RUN COMPLETE.",
    );

    console.log(
      "NO DATABASE RECORDS WERE DELETED.",
    );

    console.log("");
    console.log(
      "If the KEEP/DELETE output looks correct, run:",
    );

    console.log(
      "node scripts/cleanup-friendship-duplicates.cjs --apply",
    );
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("");
  console.error(
    "[FOCKIS FRIEND CLEANUP] ERROR:",
    error,
  );

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
