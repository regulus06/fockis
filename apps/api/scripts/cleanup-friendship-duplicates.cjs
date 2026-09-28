const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;

    const i = s.indexOf("=");
    if (i === -1) continue;

    const key = s.slice(0, i).trim();
    let value = s.slice(i + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv(path.join(process.cwd(), ".env"));
loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env.development"));

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("");
  console.error("ERROR: MONGO_URI or MONGODB_URI was not found.");
  console.error("");
  process.exit(1);
}

const FriendshipSchema = new mongoose.Schema(
  {
    requester: mongoose.Schema.Types.ObjectId,
    receiver: mongoose.Schema.Types.ObjectId,
    status: String,
    blockedBy: mongoose.Schema.Types.ObjectId,
    pairKey: String,
  },
  {
    collection: "friendships",
    timestamps: true,
  }
);

const Friendship = mongoose.model(
  "FriendshipCleanup",
  FriendshipSchema
);

function pairKey(a, b) {
  return [String(a), String(b)].sort().join(":");
}

function statusPriority(status) {
  if (status === "accepted") return 4;
  if (status === "blocked") return 3;
  if (status === "pending") return 2;
  if (status === "rejected") return 1;
  return 0;
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.log("");
  console.log("================================================");
  console.log(" FOCKIS FRIENDSHIP DUPLICATE CLEANUP");
  console.log("================================================");
  console.log("");

  if (apply) {
    console.log("WARNING: APPLY MODE");
    console.log("Duplicate records WILL be deleted.");
  } else {
    console.log("DRY RUN MODE");
    console.log("Nothing will be deleted.");
  }

  console.log("");

  await mongoose.connect(MONGO_URI);

  console.log("Connected to MongoDB.");
  console.log("");

  const records = await Friendship.find({}).lean();

  console.log(`Found ${records.length} friendship documents.`);
  console.log("");

  const groups = new Map();

  for (const record of records) {
    if (!record.requester || !record.receiver) {
      console.log(
        `Skipping ${record._id}: missing requester/receiver`
      );
      continue;
    }

    const key = pairKey(
      record.requester,
      record.receiver
    );

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(record);
  }

  let duplicateGroups = 0;
  let duplicateDocuments = 0;

  for (const [key, group] of groups) {
    if (group.length <= 1) continue;

    duplicateGroups++;

    group.sort((a, b) => {
      const statusDifference =
        statusPriority(b.status) -
        statusPriority(a.status);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    const keep = group[0];
    const remove = group.slice(1);

    duplicateDocuments += remove.length;

    console.log("-----------------------------------------------");
    console.log(`PAIR: ${key}`);
    console.log(`RECORDS: ${group.length}`);
    console.log("");

    console.log(
      `KEEP   ${keep._id} | ${keep.status} | ${keep.requester} -> ${keep.receiver}`
    );

    for (const record of remove) {
      console.log(
        `DELETE ${record._id} | ${record.status} | ${record.requester} -> ${record.receiver}`
      );
    }

    if (apply) {
      await Friendship.updateOne(
        { _id: keep._id },
        {
          $set: {
            pairKey: key,
          },
        }
      );

      await Friendship.deleteMany({
        _id: {
          $in: remove.map((r) => r._id),
        },
      });
    }
  }

  console.log("");
  console.log("================================================");
  console.log(" SUMMARY");
  console.log("================================================");
  console.log(`Total documents:       ${records.length}`);
  console.log(`Duplicate pair groups: ${duplicateGroups}`);
  console.log(`Documents to remove:   ${duplicateDocuments}`);
  console.log("");

  if (apply) {
    console.log("CLEANUP COMPLETE.");
    console.log("Remaining records now have pairKey.");
  } else {
    console.log("DRY RUN COMPLETE.");
    console.log("NO records were deleted.");
    console.log("");
    console.log(
      "If everything looks correct, run:"
    );
    console.log("");
    console.log(
      "node .\\scripts\\cleanup-friendship-duplicates.cjs --apply"
    );
  }

  console.log("");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("");
  console.error("CLEANUP FAILED");
  console.error(error);
  console.error("");

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
