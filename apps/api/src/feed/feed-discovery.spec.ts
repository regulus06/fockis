import { Types } from "mongoose";

import { InMemoryModel } from "../reports/testing/in-memory-model";
import { FeedDiscoveryService, hashtagsIn, rankHashtags } from "./feed-discovery.service";

describe("feed discovery", () => {
  it("reads hashtags once per post, case-insensitively, skipping numbers", () => {
    expect(hashtagsIn("Bonjou #Haiti #haiti #FockisLive #2026 #é")).toEqual(["Haiti", "FockisLive"]);
  });

  it("ranks tags by real post counts and keeps a thumbnail", () => {
    const now = Date.now();
    const posts = [
      { content: "#Haiti #Vlog", createdAt: new Date(now - 1000), media: "post-media/a.jpg" },
      { content: "#haiti", createdAt: new Date(now - 2000) },
      { content: "#Fockis", createdAt: new Date(now - 500) },
    ];
    const ranked = rankHashtags(posts, 5);
    expect(ranked[0]).toMatchObject({ tag: "Haiti", posts: 2, thumbnail: "post-media/a.jpg", thumbnailType: "image" });
    expect(ranked.map((t) => t.tag)).toEqual(["Haiti", "Fockis", "Vlog"]);
  });

  function setup() {
    const users = new InMemoryModel("User");
    const follows = new InMemoryModel("Follow");
    const posts = new InMemoryModel("Post");
    const me = new Types.ObjectId();
    const rel = { followedIds: [] as string[], friendIds: [] as string[], blockedIds: [] as string[] };
    const feed = { relationshipsFor: async () => rel, visibilityFilterFor: () => ({ audience: "public" }) } as any;
    const service = new FeedDiscoveryService(posts as any, { models: { User: users, Follow: follows } } as any, feed);
    return { users, follows, posts, me, rel, service };
  }

  it("suggests mutual connections first and never people already followed or blocked", async () => {
    const { users, follows, me, rel, service } = setup();
    const [friend, mutualA, popular, blocked, followedAlready] = [0, 1, 2, 3, 4].map(() => new Types.ObjectId());
    await users.create({ _id: me, username: "me" });
    await users.create({ _id: friend, username: "friend", followersCount: 5 });
    await users.create({ _id: mutualA, username: "mutual", followersCount: 1 });
    await users.create({ _id: popular, username: "popular", followersCount: 900, verified: true });
    await users.create({ _id: blocked, username: "blocked", followersCount: 5000 });
    await users.create({ _id: followedAlready, username: "known", followersCount: 800 });
    rel.followedIds = [String(friend), String(followedAlready)];
    rel.blockedIds = [String(blocked)];
    await follows.create({ followerId: friend, followingId: mutualA });
    const people = await service.people(String(me), { limit: 5 });
    const names = people.map((p) => p.username);
    expect(names[0]).toBe("mutual");
    expect(people[0].mutualCount).toBe(1);
    expect(names).toContain("popular");
    expect(names).not.toContain("me");
    expect(names).not.toContain("blocked");
    expect(names).not.toContain("known");
    expect(names).not.toContain("friend");
  });

  it("respects the exclude list", async () => {
    const { users, me, service } = setup();
    const a = new Types.ObjectId();
    await users.create({ _id: a, username: "a", followersCount: 3 });
    expect((await service.people(String(me), { exclude: [String(a)] })).map((p) => p.username)).not.toContain("a");
  });
});
