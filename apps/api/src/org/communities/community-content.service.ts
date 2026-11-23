/**
 * community-content.service.ts
 * -----------------------------------------------------------------------------
 * What happens inside a group: announcements & discussions, Bible study,
 * prayer requests, meetings, activities (church events with groupId),
 * attendance, tasks, documents (church media tagged "group:<id>") and the
 * calendar. Privacy and permissions are enforced here.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Membership, MembershipDocument } from '../members/schemas/membership.schema';
import { ChurchEvent, ChurchEventDocument } from '../events/schemas/church-event.schema';
import { EventType } from '../enums/event-type.enum';
import { ChurchMedia, ChurchMediaDocument, ChurchMediaType, ChurchMediaVisibility } from '../media/schemas/church-media.schema';
import { ChurchMediaService, MEDIA_UPLOAD_TYPES } from '../media/services/church-media.service';
import { MembershipStatus } from '../enums/membership-status.enum';
import { CommunityAccessService, sameId, type GroupRights } from './community-access.service';
import { CommunitiesService } from './communities.service';
import {
  ATTENDANCE_STATUSES,
  GroupAttendance,
  GroupAttendanceDocument,
  GroupLesson,
  GroupLessonDocument,
  GroupLessonNote,
  GroupLessonNoteDocument,
  GroupMeeting,
  GroupMeetingDocument,
  GroupPost,
  GroupPostDocument,
  GroupPrayer,
  GroupPrayerDocument,
  GroupTask,
  GroupTaskDocument,
  GroupTeam,
  GroupTeamDocument,
} from './community.schemas';

type AnyModel = Model<any>;
type LeanMember = { _id: Types.ObjectId; userId: Types.ObjectId; profile?: { displayName?: string } };
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const nameOf = (m?: { profile?: { displayName?: string } } | null) => m?.profile?.displayName?.trim() || 'Member';
const urlList = (v: unknown, max = 10) =>
  (Array.isArray(v) ? v : [])
    .map((u) => str(u, 600))
    .filter((u) => /^(\/|https?:\/\/)/.test(u))
    .slice(0, max);
const dateOrNull = (v: unknown) => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};
export const groupMediaTag = (groupId: string) => `group:${groupId}`;

@Injectable()
export class CommunityContentService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(ChurchEvent.name) private readonly eventModel: Model<ChurchEventDocument>,
    @InjectModel(ChurchMedia.name) private readonly mediaModel: Model<ChurchMediaDocument>,
    @InjectModel(GroupPost.name) private readonly postModel: Model<GroupPostDocument>,
    @InjectModel(GroupLesson.name) private readonly lessonModel: Model<GroupLessonDocument>,
    @InjectModel(GroupLessonNote.name) private readonly noteModel: Model<GroupLessonNoteDocument>,
    @InjectModel(GroupPrayer.name) private readonly prayerModel: Model<GroupPrayerDocument>,
    @InjectModel(GroupMeeting.name) private readonly meetingModel: Model<GroupMeetingDocument>,
    @InjectModel(GroupAttendance.name) private readonly attendanceModel: Model<GroupAttendanceDocument>,
    @InjectModel(GroupTask.name) private readonly taskModel: Model<GroupTaskDocument>,
    @InjectModel(GroupTeam.name) private readonly teamModel: Model<GroupTeamDocument>,
    private readonly access: CommunityAccessService,
    private readonly communities: CommunitiesService,
    private readonly mediaService: ChurchMediaService,
  ) {}

  private get m() {
    return {
      member: this.membershipModel as unknown as AnyModel,
      event: this.eventModel as unknown as AnyModel,
      media: this.mediaModel as unknown as AnyModel,
      post: this.postModel as unknown as AnyModel,
      lesson: this.lessonModel as unknown as AnyModel,
      note: this.noteModel as unknown as AnyModel,
      prayer: this.prayerModel as unknown as AnyModel,
      meeting: this.meetingModel as unknown as AnyModel,
      attendance: this.attendanceModel as unknown as AnyModel,
      task: this.taskModel as unknown as AnyModel,
      team: this.teamModel as unknown as AnyModel,
    };
  }

  private oid(v: string, label: string) {
    return this.access.toId(v, label);
  }

  private link(r: GroupRights, tab: string) {
    return this.communities.groupLink(String(r.group.organizationId), String(r.group._id), tab);
  }

  private myTeamIds(r: GroupRights) {
    return new Set(r.record?.teamIds ?? []);
  }

  /* ==========================================================================
     POSTS — announcements, notices, discussions
     ========================================================================== */

  async posts(organizationId: string, userId: string, groupId: string, kind: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    if (kind === 'discussion') this.access.requireService(r, 'discussions');
    const filter: Record<string, unknown> = { groupId: r.group._id, kind: kind === 'discussion' ? 'discussion' : { $in: ['announcement', 'notice'] } };
    if (!r.canCoordinate) {
      filter.$or = [{ audience: 'all' }, { audience: 'team', teamId: { $in: [...this.myTeamIds(r)].map((x) => new Types.ObjectId(x)) } }];
    }
    const rows = (await this.m.post.find(filter).sort({ pinned: -1, createdAt: -1 }).limit(100).lean().exec()) as Array<Record<string, any>>;
    return {
      canPost: kind === 'discussion' ? r.isMember || r.canCoordinate : r.canCoordinate,
      items: rows.map((p) => ({
        id: String(p._id),
        kind: p.kind,
        audience: p.audience,
        teamId: p.teamId ? String(p.teamId) : null,
        title: p.title ?? '',
        body: p.body,
        attachmentUrls: p.attachmentUrls ?? [],
        pinned: Boolean(p.pinned),
        authorName: p.authorName ?? '',
        createdAt: iso(p.createdAt),
        canDelete: r.canCoordinate || sameId(p.authorUserId, userId),
        comments: (p.comments ?? []).map((c: Record<string, any>) => ({ id: String(c._id), authorName: c.authorName ?? '', body: c.body, createdAt: iso(c.createdAt), canDelete: r.canCoordinate || sameId(c.authorUserId, userId) })),
      })),
    };
  }

  async createPost(organizationId: string, userId: string, groupId: string, input: Record<string, unknown>) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    const kind = ['announcement', 'notice', 'discussion'].includes(String(input.kind)) ? String(input.kind) : 'discussion';
    if (kind === 'discussion') {
      this.access.requireService(r, 'discussions');
      if (!r.isMember && !r.canCoordinate) throw new ForbiddenException('Only members can start discussions.');
    } else if (!r.canCoordinate) throw new ForbiddenException('Only group leaders can publish announcements.');
    const body = str(input.body, 6000);
    if (!body) throw new BadRequestException('Write something first.');
    const audience = kind === 'discussion' ? 'all' : ['all', 'team', 'leaders'].includes(String(input.audience)) ? String(input.audience) : 'all';
    const teamId = audience === 'team' && Types.ObjectId.isValid(String(input.teamId)) ? new Types.ObjectId(String(input.teamId)) : null;
    if (audience === 'team' && !teamId) throw new BadRequestException('Choose a team.');
    const doc = await this.m.post.create({
      organizationId: r.group.organizationId,
      groupId: r.group._id,
      kind,
      audience,
      teamId,
      title: str(input.title, 160),
      body,
      attachmentUrls: urlList(input.attachmentUrls),
      pinned: r.canCoordinate && Boolean(input.pinned),
      authorUserId: new Types.ObjectId(userId),
      authorName: r.actor.displayName,
    });
    if (kind !== 'discussion' && r.settings.notifyMembersOnAnnouncement) {
      const to =
        audience === 'leaders'
          ? await this.communities.leaderUserIds(r.group, ['leader', 'assistant_leader', 'coordinator', 'secretary', 'treasurer'])
          : await this.communities.memberUserIds(r.group, teamId ? String(teamId) : null);
      await this.communities.notify(to.filter((u) => u !== userId), `${r.group.name}: ${kind === 'notice' ? 'Important notice' : 'Announcement'}`, str(input.title, 80) || body.slice(0, 120), this.link(r, 'discussions'), String(doc._id));
    }
    await this.access.audit(organizationId, r.group._id, r.actor, `${kind}_posted`, str(input.title, 80) || body.slice(0, 80));
    return { id: String(doc._id) };
  }

  async comment(organizationId: string, userId: string, groupId: string, postId: string, body: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    const text = str(body, 2000);
    if (!text) throw new BadRequestException('Write a comment.');
    const res = await this.m.post.updateOne(
      { _id: this.oid(postId, 'Post ID'), groupId: r.group._id },
      { $push: { comments: { authorUserId: new Types.ObjectId(userId), authorName: r.actor.displayName, body: text, createdAt: new Date() } } },
    );
    if (!res.matchedCount) throw new NotFoundException('Post not found.');
    return { ok: true };
  }

  async deletePost(organizationId: string, userId: string, groupId: string, postId: string, commentId?: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    const post = (await this.m.post.findOne({ _id: this.oid(postId, 'Post ID'), groupId: r.group._id }).lean().exec()) as Record<string, any> | null;
    if (!post) throw new NotFoundException('Post not found.');
    if (commentId) {
      const c = (post.comments ?? []).find((x: Record<string, any>) => String(x._id) === commentId);
      if (!c) throw new NotFoundException('Comment not found.');
      if (!r.canCoordinate && !sameId(c.authorUserId, userId)) throw new ForbiddenException('You cannot delete this comment.');
      await this.m.post.updateOne({ _id: post._id }, { $pull: { comments: { _id: c._id } } });
    } else {
      if (!r.canCoordinate && !sameId(post.authorUserId, userId)) throw new ForbiddenException('You cannot delete this post.');
      await this.m.post.deleteOne({ _id: post._id });
    }
    return { ok: true };
  }

  /* ==========================================================================
     BIBLE STUDY
     ========================================================================== */

  async lessons(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'bibleStudy');
    const filter: Record<string, unknown> = { groupId: r.group._id };
    if (!r.canCoordinate) filter.status = 'published';
    const rows = (await this.m.lesson.find(filter).sort({ scheduledAt: -1, createdAt: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>;
    const mine = r.actor.membershipId
      ? ((await this.m.note.find({ groupId: r.group._id, membershipId: new Types.ObjectId(r.actor.membershipId) }).lean().exec()) as Array<Record<string, any>>)
      : [];
    const counts = (await this.m.note.aggregate([{ $match: { groupId: r.group._id, completed: true } }, { $group: { _id: '$lessonId', n: { $sum: 1 } } }])) as { _id: Types.ObjectId; n: number }[];
    return {
      canManage: r.canCoordinate,
      programs: [...new Set(rows.map((l) => l.program || 'General'))],
      items: rows.map((l) => {
        const n = mine.find((x) => sameId(x.lessonId, l._id));
        return {
          id: String(l._id),
          program: l.program || 'General',
          title: l.title,
          passages: l.passages ?? [],
          body: l.body ?? '',
          questions: l.questions ?? [],
          reading: l.reading ?? '',
          scheduledAt: iso(l.scheduledAt),
          documentUrls: l.documentUrls ?? [],
          allowAnswers: Boolean(l.allowAnswers),
          status: l.status,
          authorName: l.authorName ?? '',
          createdAt: iso(l.createdAt),
          completedCount: r.canCoordinate ? (counts.find((c) => sameId(c._id, l._id))?.n ?? 0) : undefined,
          mine: n ? { answers: n.answers ?? [], privateNotes: n.privateNotes ?? '', completed: Boolean(n.completed) } : null,
        };
      }),
    };
  }

  async saveLesson(organizationId: string, userId: string, groupId: string, lessonId: string | null, input: Record<string, unknown>) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can publish lessons.');
    this.access.requireService(r, 'bibleStudy');
    const title = str(input.title, 160);
    if (!title) throw new BadRequestException('Give the lesson a title.');
    const data = {
      program: str(input.program, 100) || 'General',
      title,
      passages: (Array.isArray(input.passages) ? input.passages : []).map((p) => str(p, 80)).filter(Boolean).slice(0, 20),
      body: str(input.body, 20000),
      questions: (Array.isArray(input.questions) ? input.questions : []).map((q) => str(q, 500)).filter(Boolean).slice(0, 30),
      reading: str(input.reading, 500),
      scheduledAt: dateOrNull(input.scheduledAt),
      documentUrls: urlList(input.documentUrls),
      allowAnswers: input.allowAnswers !== false,
      status: input.status === 'draft' ? 'draft' : 'published',
    };
    let id = lessonId;
    if (lessonId) {
      const res = await this.m.lesson.updateOne({ _id: this.oid(lessonId, 'Lesson ID'), groupId: r.group._id }, { $set: data });
      if (!res.matchedCount) throw new NotFoundException('Lesson not found.');
    } else {
      const doc = await this.m.lesson.create({ ...data, organizationId: r.group.organizationId, groupId: r.group._id, authorUserId: new Types.ObjectId(userId), authorName: r.actor.displayName });
      id = String(doc._id);
      if (data.status === 'published') {
        await this.communities.notify((await this.communities.memberUserIds(r.group)).filter((u) => u !== userId), `${r.group.name}: new Bible study`, title, this.link(r, 'study'), id);
      }
    }
    await this.access.audit(organizationId, r.group._id, r.actor, lessonId ? 'lesson_updated' : 'lesson_created', title);
    return { id };
  }

  async deleteLesson(organizationId: string, userId: string, groupId: string, lessonId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can delete lessons.');
    const res = await this.m.lesson.deleteOne({ _id: this.oid(lessonId, 'Lesson ID'), groupId: r.group._id });
    if (!res.deletedCount) throw new NotFoundException('Lesson not found.');
    await this.m.note.deleteMany({ lessonId: this.oid(lessonId, 'Lesson ID') });
    return { ok: true };
  }

  async saveLessonNote(organizationId: string, userId: string, groupId: string, lessonId: string, input: Record<string, unknown>) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    if (!r.actor.membershipId) throw new ForbiddenException('Only members can save study notes.');
    const lesson = (await this.m.lesson.findOne({ _id: this.oid(lessonId, 'Lesson ID'), groupId: r.group._id, status: 'published' }).lean().exec()) as Record<string, any> | null;
    if (!lesson) throw new NotFoundException('Lesson not found.');
    const set: Record<string, unknown> = { memberName: r.actor.displayName };
    if (input.answers !== undefined) {
      if (!lesson.allowAnswers) throw new ForbiddenException('Answers are not enabled for this lesson.');
      set.answers = (Array.isArray(input.answers) ? input.answers : []).map((a) => str(a, 3000)).slice(0, (lesson.questions ?? []).length);
    }
    if (input.privateNotes !== undefined) set.privateNotes = str(input.privateNotes, 10000);
    if (input.completed !== undefined) set.completed = Boolean(input.completed);
    await this.m.note.updateOne({ lessonId: lesson._id, membershipId: new Types.ObjectId(r.actor.membershipId) }, { $set: set, $setOnInsert: { groupId: r.group._id } }, { upsert: true });
    return { ok: true };
  }

  /** Leaders see members' answers (never their private notes). */
  async lessonAnswers(organizationId: string, userId: string, groupId: string, lessonId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can see answers.');
    const rows = (await this.m.note.find({ groupId: r.group._id, lessonId: this.oid(lessonId, 'Lesson ID') }).lean().exec()) as Array<Record<string, any>>;
    return { items: rows.filter((n) => (n.answers ?? []).some(Boolean) || n.completed).map((n) => ({ memberName: n.memberName ?? '', answers: n.answers ?? [], completed: Boolean(n.completed), updatedAt: iso(n.updatedAt) })) };
  }

  /* ==========================================================================
     PRAYER REQUESTS
     ========================================================================== */

  private canSeePrayer(r: GroupRights, p: Record<string, any>) {
    if (r.canCoordinate) return true;
    if (sameId(p.authorUserId, r.actor.userId)) return true;
    if (p.privacy === 'members') return r.isMember;
    if (p.privacy === 'team') return Boolean(p.teamId && this.myTeamIds(r).has(String(p.teamId)));
    return false;
  }

  async prayers(organizationId: string, userId: string, groupId: string, q: { status?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'prayer');
    const filter: Record<string, unknown> = { groupId: r.group._id };
    filter.status = q.status === 'archived' ? 'archived' : { $ne: 'archived' };
    const rows = (await this.m.prayer.find(filter).sort({ createdAt: -1 }).limit(300).lean().exec()) as Array<Record<string, any>>;
    return {
      canManage: r.canCoordinate,
      items: rows
        .filter((p) => this.canSeePrayer(r, p))
        .map((p) => {
          const mine = sameId(p.authorUserId, userId);
          return {
            id: String(p._id),
            title: p.title,
            body: p.body ?? '',
            category: p.category ?? '',
            attachmentUrl: p.attachmentUrl ?? '',
            privacy: p.privacy,
            anonymous: Boolean(p.anonymous),
            // Anonymous requests hide the name from everyone except the author.
            authorName: p.anonymous && !mine ? 'Anonymous' : (p.authorName ?? ''),
            status: p.status,
            isMine: mine,
            createdAt: iso(p.createdAt),
            responses: (p.responses ?? []).map((x: Record<string, any>) => ({ id: String(x._id), authorName: x.authorName ?? '', body: x.body, createdAt: iso(x.createdAt) })),
          };
        }),
    };
  }

  async createPrayer(organizationId: string, userId: string, groupId: string, input: Record<string, unknown>) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'prayer');
    if (!r.actor.membershipId) throw new ForbiddenException('Only members can submit prayer requests.');
    const title = str(input.title, 160);
    if (!title) throw new BadRequestException('Give your prayer request a title.');
    const privacy = ['leaders', 'team', 'members'].includes(String(input.privacy)) ? String(input.privacy) : 'leaders';
    let teamId: Types.ObjectId | null = null;
    if (privacy === 'team') {
      if (!Types.ObjectId.isValid(String(input.teamId))) throw new BadRequestException('Choose the prayer team.');
      const team = await this.m.team.findOne({ _id: new Types.ObjectId(String(input.teamId)), groupId: r.group._id }).lean().exec();
      if (!team) throw new BadRequestException('Choose the prayer team.');
      teamId = new Types.ObjectId(String(input.teamId));
    }
    const doc = await this.m.prayer.create({
      organizationId: r.group.organizationId,
      groupId: r.group._id,
      authorUserId: new Types.ObjectId(userId),
      authorMembershipId: new Types.ObjectId(r.actor.membershipId),
      authorName: r.actor.displayName,
      title,
      body: str(input.body, 4000),
      category: str(input.category, 60),
      attachmentUrl: urlList([input.attachmentUrl], 1)[0] ?? '',
      privacy,
      teamId,
      anonymous: Boolean(input.anonymous),
    });
    // Leaders are told a request arrived — never its contents.
    const leaders = await this.communities.leaderUserIds(r.group, ['leader', 'assistant_leader', 'coordinator']);
    await this.communities.notify(leaders.filter((u) => u !== userId), `${r.group.name}: new prayer request`, 'A new prayer request was shared with the group leadership.', this.link(r, 'prayer'), String(doc._id));
    return { id: String(doc._id) };
  }

  async updatePrayer(organizationId: string, userId: string, groupId: string, prayerId: string, input: { status?: string; response?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    const p = await this.prayerModel.findOne({ _id: this.oid(prayerId, 'Prayer ID'), groupId: r.group._id });
    if (!p || !this.canSeePrayer(r, p.toObject())) throw new NotFoundException('Prayer request not found.');
    const mine = sameId(p.authorUserId, userId);
    if (input.status !== undefined) {
      if (!['open', 'praying', 'answered', 'archived'].includes(input.status)) throw new BadRequestException('Unknown status.');
      if (!r.canCoordinate && !(mine && ['answered', 'archived'].includes(input.status))) throw new ForbiddenException('Only leaders can update this prayer request.');
      p.status = input.status;
    }
    if (input.response !== undefined) {
      const text = str(input.response, 2000);
      if (!text) throw new BadRequestException('Write a response.');
      if (!r.canCoordinate && !mine) throw new ForbiddenException('Only leaders can respond to prayer requests.');
      p.responses.push({ authorUserId: new Types.ObjectId(userId), authorName: r.actor.displayName, body: text, createdAt: new Date() } as any);
      if (!mine) await this.communities.notify([String(p.authorUserId)], `${r.group.name}: someone responded to your prayer request`, p.title, this.link(r, 'prayer'), String(p._id));
    }
    await p.save();
    return { ok: true };
  }

  /* ==========================================================================
     MEETINGS
     ========================================================================== */

  private canSeeMeeting(r: GroupRights, mt: Record<string, any>) {
    if (r.canCoordinate) return true;
    if (mt.audience === 'team') return Boolean(mt.teamId && this.myTeamIds(r).has(String(mt.teamId)));
    if (mt.audience === 'selected') return (mt.participantIds ?? []).some((x: Types.ObjectId) => sameId(x, r.actor.membershipId));
    return r.isMember;
  }

  async meetings(organizationId: string, userId: string, groupId: string, q: { when?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'meetings');
    const now = new Date();
    const past = q.when === 'past';
    // Recurring meetings stay "upcoming" until their series ends.
    const filter: Record<string, unknown> = past
      ? { groupId: r.group._id, startsAt: { $lt: now }, $or: [{ recurrence: 'none' }, { recurrenceUntil: { $lt: now } }] }
      : { groupId: r.group._id, $or: [{ startsAt: { $gte: now } }, { recurrence: { $ne: 'none' }, $or: [{ recurrenceUntil: null }, { recurrenceUntil: { $gte: now } }] }] };
    const rows = (await this.m.meeting.find(filter).sort({ startsAt: past ? -1 : 1 }).limit(100).lean().exec()) as Array<Record<string, any>>;
    return {
      canManage: r.canCoordinate,
      items: rows.filter((mt) => this.canSeeMeeting(r, mt)).map((mt) => this.meetingView(mt, r)),
    };
  }

  private nextOccurrence(mt: Record<string, any>): Date {
    const start = new Date(mt.startsAt);
    if (mt.recurrence === 'none') return start;
    const now = Date.now();
    const d = new Date(start);
    let guard = 0;
    while (d.getTime() < now && guard++ < 1000) {
      if (mt.recurrence === 'weekly') d.setDate(d.getDate() + 7);
      else if (mt.recurrence === 'biweekly') d.setDate(d.getDate() + 14);
      else d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  private meetingView(mt: Record<string, any>, r: GroupRights) {
    const mine = (mt.registrations ?? []).some((x: Record<string, any>) => sameId(x.membershipId, r.actor.membershipId));
    return {
      id: String(mt._id),
      title: mt.title,
      description: mt.description ?? '',
      meetingType: mt.meetingType,
      mode: mt.mode,
      startsAt: iso(mt.startsAt),
      nextAt: iso(this.nextOccurrence(mt)),
      endsAt: iso(mt.endsAt),
      location: mt.location ?? '',
      fockisMeetingId: mt.fockisMeetingId || null,
      meetingLink: mt.meetingLink || '',
      recurrence: mt.recurrence,
      recurrenceUntil: iso(mt.recurrenceUntil),
      audience: mt.audience,
      teamId: mt.teamId ? String(mt.teamId) : null,
      requiresRegistration: Boolean(mt.requiresRegistration),
      capacity: mt.capacity ?? null,
      registered: (mt.registrations ?? []).length,
      isRegistered: mine,
      registrations: r.canCoordinate ? (mt.registrations ?? []).map((x: Record<string, any>) => x.name) : undefined,
      organizerName: mt.organizerName ?? '',
      status: mt.status,
    };
  }

  async saveMeeting(organizationId: string, userId: string, groupId: string, meetingId: string | null, input: Record<string, unknown>) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can schedule meetings.');
    this.access.requireService(r, 'meetings');
    const title = str(input.title, 140);
    const startsAt = dateOrNull(input.startsAt);
    if (!title || !startsAt) throw new BadRequestException('A meeting needs a title and a start time.');
    const endsAt = dateOrNull(input.endsAt);
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('The end must be after the start.');
    const mode = ['in_person', 'online', 'hybrid'].includes(String(input.mode)) ? String(input.mode) : 'in_person';
    const audience = ['all', 'team', 'selected'].includes(String(input.audience)) ? String(input.audience) : 'all';
    const link = str(input.meetingLink, 500);
    if (link && !/^(\/|https?:\/\/)/.test(link)) throw new BadRequestException('Enter a valid meeting link.');
    const data: Record<string, unknown> = {
      title,
      description: str(input.description, 3000),
      meetingType: ['bible_study', 'prayer', 'fellowship', 'leadership', 'other'].includes(String(input.meetingType)) ? input.meetingType : 'fellowship',
      mode,
      startsAt,
      endsAt,
      location: str(input.location, 300),
      fockisMeetingId: /^[a-zA-Z0-9_-]{1,64}$/.test(String(input.fockisMeetingId ?? '')) ? String(input.fockisMeetingId) : '',
      meetingLink: link,
      recurrence: ['none', 'weekly', 'biweekly', 'monthly'].includes(String(input.recurrence)) ? input.recurrence : 'none',
      recurrenceUntil: dateOrNull(input.recurrenceUntil),
      audience,
      teamId: audience === 'team' && Types.ObjectId.isValid(String(input.teamId)) ? new Types.ObjectId(String(input.teamId)) : null,
      participantIds:
        audience === 'selected'
          ? (Array.isArray(input.participantIds) ? input.participantIds : []).filter((x) => Types.ObjectId.isValid(String(x))).map((x) => new Types.ObjectId(String(x)))
          : [],
      requiresRegistration: Boolean(input.requiresRegistration),
      capacity: Number(input.capacity) > 0 ? Math.floor(Number(input.capacity)) : null,
    };
    if (input.status !== undefined && ['scheduled', 'cancelled', 'completed'].includes(String(input.status))) data.status = input.status;
    let id = meetingId;
    if (meetingId) {
      const res = await this.m.meeting.updateOne({ _id: this.oid(meetingId, 'Meeting ID'), groupId: r.group._id }, { $set: data });
      if (!res.matchedCount) throw new NotFoundException('Meeting not found.');
    } else {
      const doc = await this.m.meeting.create({ ...data, organizationId: r.group.organizationId, groupId: r.group._id, organizerUserId: new Types.ObjectId(userId), organizerName: r.actor.displayName });
      id = String(doc._id);
    }
    // Notify invited people.
    let to: string[] = [];
    if (audience === 'selected') {
      const rows = (await this.m.member.find({ _id: { $in: data.participantIds as Types.ObjectId[] }, groupIds: r.group._id }).select('userId').lean().exec()) as LeanMember[];
      to = rows.map((x) => String(x.userId));
    } else to = await this.communities.memberUserIds(r.group, audience === 'team' ? String(data.teamId) : null);
    await this.communities.notify(to.filter((u) => u !== userId), `${r.group.name}: ${meetingId ? 'meeting updated' : 'new meeting'}`, `${title} — ${startsAt.toUTCString().slice(0, 22)}`, this.link(r, 'meetings'), id ?? undefined);
    await this.access.audit(organizationId, r.group._id, r.actor, meetingId ? 'meeting_updated' : 'meeting_scheduled', title);
    return { id };
  }

  async deleteMeeting(organizationId: string, userId: string, groupId: string, meetingId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can delete meetings.');
    const res = await this.m.meeting.deleteOne({ _id: this.oid(meetingId, 'Meeting ID'), groupId: r.group._id });
    if (!res.deletedCount) throw new NotFoundException('Meeting not found.');
    return { ok: true };
  }

  async registerMeeting(organizationId: string, userId: string, groupId: string, meetingId: string, register: boolean) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    if (!r.actor.membershipId) throw new ForbiddenException('Only members can register.');
    const mt = (await this.m.meeting.findOne({ _id: this.oid(meetingId, 'Meeting ID'), groupId: r.group._id }).lean().exec()) as Record<string, any> | null;
    if (!mt || !this.canSeeMeeting(r, mt)) throw new NotFoundException('Meeting not found.');
    const mid = new Types.ObjectId(r.actor.membershipId);
    if (register) {
      if (mt.capacity && (mt.registrations ?? []).length >= mt.capacity) throw new ConflictException('This meeting is full.');
      await this.m.meeting.updateOne({ _id: mt._id, 'registrations.membershipId': { $ne: mid } }, { $push: { registrations: { membershipId: mid, name: r.actor.displayName, at: new Date() } } });
    } else {
      await this.m.meeting.updateOne({ _id: mt._id }, { $pull: { registrations: { membershipId: mid } } });
    }
    return { ok: true };
  }

  /* ==========================================================================
     ACTIVITIES — church events linked to the group
     ========================================================================== */

  async activities(organizationId: string, userId: string, groupId: string, q: { when?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'activities');
    const now = new Date();
    const past = q.when === 'past';
    const rows = (await this.m.event
      .find({ organizationId: r.group.organizationId, groupId: r.group._id, startsAt: past ? { $lt: now } : { $gte: now } })
      .sort({ startsAt: past ? -1 : 1 })
      .limit(100)
      .lean()
      .exec()) as Array<Record<string, any>>;
    const mid = r.actor.membershipId;
    return {
      canManage: r.canCoordinate,
      items: rows.map((e) => ({
        id: String(e._id),
        title: e.title,
        description: e.description ?? '',
        eventType: e.eventType,
        startsAt: iso(e.startsAt),
        endsAt: iso(e.endsAt),
        location: e.location ?? '',
        isOnline: Boolean(e.isOnline),
        onlineUrl: e.onlineUrl ?? '',
        coverImageUrl: e.coverImageUrl ?? null,
        capacity: e.capacity ?? null,
        requiresRsvp: Boolean(e.requiresRsvp),
        going: (e.rsvps ?? []).filter((x: Record<string, any>) => x.status === 'going').length,
        myRsvp: mid ? ((e.rsvps ?? []).find((x: Record<string, any>) => sameId(x.memberId, mid))?.status ?? null) : null,
        status: new Date(e.startsAt) < now ? 'completed' : 'upcoming',
      })),
    };
  }

  async saveActivity(organizationId: string, userId: string, groupId: string, eventId: string | null, input: Record<string, unknown>) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can organize activities.');
    this.access.requireService(r, 'activities');
    const title = str(input.title, 140);
    const startsAt = dateOrNull(input.startsAt);
    if (!title || !startsAt) throw new BadRequestException('An activity needs a title and a start time.');
    const endsAt = dateOrNull(input.endsAt);
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('The end must be after the start.');
    const cover = urlList([input.coverImageUrl], 1)[0] ?? null;
    const data = {
      title,
      description: str(input.description, 3000) || null,
      location: str(input.location, 300) || null,
      isOnline: Boolean(input.isOnline),
      onlineUrl: urlList([input.onlineUrl], 1)[0] ?? null,
      coverImageUrl: cover,
      startsAt,
      endsAt,
      capacity: Number(input.capacity) > 0 ? Math.floor(Number(input.capacity)) : null,
      requiresRsvp: Boolean(input.requiresRsvp),
    };
    let id = eventId;
    if (eventId) {
      const res = await this.m.event.updateOne({ _id: this.oid(eventId, 'Activity ID'), groupId: r.group._id }, { $set: data });
      if (!res.matchedCount) throw new NotFoundException('Activity not found.');
    } else {
      const doc = await this.m.event.create({
        ...data,
        organizationId: r.group.organizationId,
        groupId: r.group._id,
        departmentId: r.group.departmentId ?? null,
        eventType: r.group.groupType === 'bible_study' ? EventType.BibleStudy : EventType.SpecialEvent,
        rsvps: [],
      });
      id = String(doc._id);
      await this.communities.notify((await this.communities.memberUserIds(r.group)).filter((u) => u !== userId), `${r.group.name}: new activity`, `${title} — ${startsAt.toUTCString().slice(0, 22)}`, this.link(r, 'activities'), id);
    }
    await this.access.audit(organizationId, r.group._id, r.actor, eventId ? 'activity_updated' : 'activity_created', title);
    return { id };
  }

  async deleteActivity(organizationId: string, userId: string, groupId: string, eventId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can delete activities.');
    const res = await this.m.event.deleteOne({ _id: this.oid(eventId, 'Activity ID'), groupId: r.group._id });
    if (!res.deletedCount) throw new NotFoundException('Activity not found.');
    return { ok: true };
  }

  async rsvpActivity(organizationId: string, userId: string, groupId: string, eventId: string, status: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    if (!r.actor.membershipId) throw new ForbiddenException('Only members can respond.');
    if (!['going', 'maybe', 'not_going'].includes(status)) throw new BadRequestException('Choose going, maybe or not going.');
    const ev = (await this.m.event.findOne({ _id: this.oid(eventId, 'Activity ID'), groupId: r.group._id }).lean().exec()) as Record<string, any> | null;
    if (!ev) throw new NotFoundException('Activity not found.');
    const mid = new Types.ObjectId(r.actor.membershipId);
    if (status === 'going' && ev.capacity) {
      const going = (ev.rsvps ?? []).filter((x: Record<string, any>) => x.status === 'going' && !sameId(x.memberId, mid)).length;
      if (going >= ev.capacity) throw new ConflictException('This activity is full.');
    }
    await this.m.event.updateOne({ _id: ev._id }, { $pull: { rsvps: { memberId: mid } } });
    await this.m.event.updateOne({ _id: ev._id }, { $push: { rsvps: { memberId: mid, status, respondedAt: new Date() } } });
    return { ok: true };
  }

  /* ==========================================================================
     CALENDAR — meetings + activities + lessons in a date range
     ========================================================================== */

  async calendar(organizationId: string, userId: string, groupId: string, q: { from?: string; to?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    const from = dateOrNull(q.from) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = dateOrNull(q.to) ?? new Date(from.getFullYear(), from.getMonth() + 1, 1);
    if (to.getTime() - from.getTime() > 400 * 86400000) throw new BadRequestException('Choose a shorter range.');
    const items: { id: string; kind: string; title: string; startsAt: string; location: string }[] = [];
    if (r.settings.services.meetings) {
      const mts = (await this.m.meeting.find({ groupId: r.group._id, status: { $ne: 'cancelled' }, startsAt: { $lt: to } }).lean().exec()) as Array<Record<string, any>>;
      for (const mt of mts.filter((x) => this.canSeeMeeting(r, x))) {
        const d = new Date(mt.startsAt);
        const until = mt.recurrenceUntil ? new Date(mt.recurrenceUntil) : to;
        let guard = 0;
        while (d < to && d <= until && guard++ < 400) {
          if (d >= from) items.push({ id: String(mt._id), kind: 'meeting', title: mt.title, startsAt: d.toISOString(), location: mt.mode === 'online' ? 'Online' : mt.location ?? '' });
          if (mt.recurrence === 'none') break;
          if (mt.recurrence === 'weekly') d.setDate(d.getDate() + 7);
          else if (mt.recurrence === 'biweekly') d.setDate(d.getDate() + 14);
          else d.setMonth(d.getMonth() + 1);
        }
      }
    }
    if (r.settings.services.activities) {
      const evs = (await this.m.event.find({ groupId: r.group._id, startsAt: { $gte: from, $lt: to } }).select('title startsAt location').lean().exec()) as Array<Record<string, any>>;
      for (const e of evs) items.push({ id: String(e._id), kind: 'activity', title: e.title, startsAt: iso(e.startsAt)!, location: e.location ?? '' });
    }
    if (r.settings.services.bibleStudy) {
      const ls = (await this.m.lesson.find({ groupId: r.group._id, status: 'published', scheduledAt: { $gte: from, $lt: to } }).select('title scheduledAt').lean().exec()) as Array<Record<string, any>>;
      for (const l of ls) items.push({ id: String(l._id), kind: 'study', title: l.title, startsAt: iso(l.scheduledAt)!, location: '' });
    }
    if (r.settings.services.tasks) {
      const ts = (await this.m.task.find({ groupId: r.group._id, status: { $in: ['todo', 'in_progress'] }, dueDate: { $gte: from.toISOString().slice(0, 10), $lt: to.toISOString().slice(0, 10) } }).select('title dueDate').lean().exec()) as Array<Record<string, any>>;
      for (const t of ts) items.push({ id: String(t._id), kind: 'task', title: `Due: ${t.title}`, startsAt: `${t.dueDate}T09:00:00.000Z`, location: '' });
    }
    return { from: from.toISOString(), to: to.toISOString(), items: items.sort((a, b) => a.startsAt.localeCompare(b.startsAt)) };
  }

  /* ==========================================================================
     ATTENDANCE
     ========================================================================== */

  async attendanceSummary(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'attendance');
    const g = r.group;
    if (!r.canCoordinate) {
      // Members see only their own history.
      const own = r.actor.membershipId
        ? ((await this.m.attendance.find({ groupId: g._id, membershipId: new Types.ObjectId(r.actor.membershipId) }).sort({ sessionDate: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>)
        : [];
      const present = own.filter((a) => a.status === 'present' || a.status === 'late').length;
      return {
        canRecord: false,
        mine: { rate: own.length ? Math.round((present / own.length) * 100) : null, records: own.map((a) => ({ sessionTitle: a.sessionTitle, sessionDate: a.sessionDate, sessionType: a.sessionType, status: a.status })) },
      };
    }
    const [members, sessions, monthly, byMember] = await Promise.all([
      this.m.member.countDocuments({ organizationId: g.organizationId, groupIds: g._id, status: MembershipStatus.Active }),
      this.m.attendance.aggregate([
        { $match: { groupId: g._id } },
        {
          $group: {
            _id: { t: '$sessionType', s: '$sessionId', d: '$sessionDate' },
            title: { $first: '$sessionTitle' },
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          },
        },
        { $sort: { '_id.d': -1 } },
        { $limit: 60 },
      ]),
      this.m.attendance.aggregate([
        { $match: { groupId: g._id } },
        { $group: { _id: { $substr: ['$sessionDate', 0, 7] }, total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),
      this.m.attendance.aggregate([
        { $match: { groupId: g._id } },
        { $group: { _id: '$membershipId', name: { $last: '$memberName' }, total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
        { $sort: { name: 1 } },
      ]),
    ]);
    const rate = (p: number, t: number) => (t ? Math.round((p / t) * 100) : null);
    const allT = (sessions as Array<{ total: number; present: number }>).reduce((a, s) => a + s.total, 0);
    const allP = (sessions as Array<{ total: number; present: number }>).reduce((a, s) => a + s.present, 0);
    return {
      canRecord: true,
      totalMembers: members,
      sessionsRecorded: (sessions as unknown[]).length,
      attendanceRate: rate(allP, allT),
      sessions: (sessions as Array<{ _id: { t: string; s: string; d: string }; title: string; total: number; present: number }>).map((s) => ({
        sessionType: s._id.t,
        sessionId: s._id.s,
        sessionDate: s._id.d,
        title: s.title,
        present: s.present,
        total: s.total,
        rate: rate(s.present, s.total),
      })),
      monthly: (monthly as Array<{ _id: string; total: number; present: number }>).map((x) => ({ month: x._id, rate: rate(x.present, x.total), records: x.total })).reverse(),
      members: (byMember as Array<{ _id: Types.ObjectId; name: string; total: number; present: number }>).map((x) => ({ membershipId: String(x._id), name: x.name, sessions: x.total, present: x.present, rate: rate(x.present, x.total) })),
    };
  }

  /** The roster for one session, with any statuses already recorded. */
  async attendanceSheet(organizationId: string, userId: string, groupId: string, q: { sessionType?: string; sessionId?: string; sessionDate?: string }) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can record attendance.');
    this.access.requireService(r, 'attendance');
    const key = this.sessionKey(q);
    const [people, recs] = await Promise.all([
      this.m.member.find({ organizationId: r.group.organizationId, groupIds: r.group._id, status: MembershipStatus.Active }).select('profile.displayName').sort({ 'profile.displayName': 1 }).lean().exec(),
      this.m.attendance.find({ groupId: r.group._id, ...key }).lean().exec(),
    ]);
    const by = new Map((recs as Array<Record<string, any>>).map((x) => [String(x.membershipId), x.status]));
    return { ...key, rows: (people as LeanMember[]).map((p) => ({ membershipId: String(p._id), name: nameOf(p), status: by.get(String(p._id)) ?? null })) };
  }

  private sessionKey(q: { sessionType?: string; sessionId?: string; sessionDate?: string }) {
    const sessionType = ['meeting', 'activity', 'lesson', 'session'].includes(String(q.sessionType)) ? String(q.sessionType) : 'session';
    const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(String(q.sessionDate)) ? String(q.sessionDate) : '';
    if (!sessionDate) throw new BadRequestException('Choose the session date.');
    const sessionId = sessionType === 'session' ? '' : Types.ObjectId.isValid(String(q.sessionId)) ? String(q.sessionId) : '';
    if (sessionType !== 'session' && !sessionId) throw new BadRequestException('Choose the meeting, activity or lesson.');
    return { sessionType, sessionId, sessionDate };
  }

  async recordAttendance(organizationId: string, userId: string, groupId: string, input: { sessionType?: string; sessionId?: string; sessionDate?: string; sessionTitle?: string; entries?: { membershipId: string; status: string }[] }) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can record attendance.');
    this.access.requireService(r, 'attendance');
    const key = this.sessionKey(input);
    let title = str(input.sessionTitle, 140);
    if (key.sessionType === 'meeting') {
      const mt = (await this.m.meeting.findOne({ _id: new Types.ObjectId(key.sessionId), groupId: r.group._id }).select('title').lean().exec()) as { title: string } | null;
      if (!mt) throw new NotFoundException('Meeting not found.');
      title = mt.title;
    } else if (key.sessionType === 'activity') {
      const ev = (await this.m.event.findOne({ _id: new Types.ObjectId(key.sessionId), groupId: r.group._id }).select('title').lean().exec()) as { title: string } | null;
      if (!ev) throw new NotFoundException('Activity not found.');
      title = ev.title;
    } else if (key.sessionType === 'lesson') {
      const ls = (await this.m.lesson.findOne({ _id: new Types.ObjectId(key.sessionId), groupId: r.group._id }).select('title').lean().exec()) as { title: string } | null;
      if (!ls) throw new NotFoundException('Lesson not found.');
      title = ls.title;
    }
    if (!title) title = 'Group session';
    const entries = (input.entries ?? []).filter((e) => Types.ObjectId.isValid(String(e.membershipId)) && (ATTENDANCE_STATUSES as readonly string[]).includes(e.status)).slice(0, 2000);
    if (!entries.length) throw new BadRequestException('Mark at least one person.');
    const people = (await this.m.member.find({ _id: { $in: entries.map((e) => new Types.ObjectId(e.membershipId)) }, groupIds: r.group._id }).select('profile.displayName').lean().exec()) as LeanMember[];
    const names = new Map(people.map((p) => [String(p._id), nameOf(p)]));
    let saved = 0;
    for (const e of entries) {
      if (!names.has(e.membershipId)) continue;
      // Upsert on the unique session key: one entry per member per session.
      await this.m.attendance.updateOne(
        { groupId: r.group._id, ...key, membershipId: new Types.ObjectId(e.membershipId) },
        {
          $set: { status: e.status, sessionTitle: title, memberName: names.get(e.membershipId), recordedByUserId: new Types.ObjectId(userId) },
          $setOnInsert: { organizationId: r.group.organizationId },
        },
        { upsert: true },
      );
      saved += 1;
    }
    await this.access.audit(organizationId, r.group._id, r.actor, 'attendance_recorded', `${title} (${key.sessionDate}): ${saved}`);
    return { saved };
  }

  /* ==========================================================================
     TASKS
     ========================================================================== */

  async tasks(organizationId: string, userId: string, groupId: string, q: { mine?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'tasks');
    const filter: Record<string, unknown> = { groupId: r.group._id };
    if (!r.canCoordinate || q.mine === '1') filter.assigneeMembershipId = r.actor.membershipId ? new Types.ObjectId(r.actor.membershipId) : null;
    const rows = (await this.m.task.find(filter).sort({ status: 1, dueDate: 1, createdAt: -1 }).limit(300).lean().exec()) as Array<Record<string, any>>;
    return {
      canManage: r.canCoordinate,
      items: rows.map((t) => ({
        id: String(t._id),
        title: t.title,
        description: t.description ?? '',
        assigneeMembershipId: t.assigneeMembershipId ? String(t.assigneeMembershipId) : null,
        assigneeName: t.assigneeName ?? '',
        dueDate: t.dueDate ?? '',
        priority: t.priority,
        status: t.status,
        attachmentUrls: t.attachmentUrls ?? [],
        createdByName: t.createdByName ?? '',
        isMine: sameId(t.assigneeMembershipId, r.actor.membershipId),
      })),
    };
  }

  async saveTask(organizationId: string, userId: string, groupId: string, taskId: string | null, input: Record<string, unknown>) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'tasks');
    if (taskId && !r.canCoordinate) {
      // Assignees may only move their own task along.
      const t = (await this.m.task.findOne({ _id: this.oid(taskId, 'Task ID'), groupId: r.group._id }).lean().exec()) as Record<string, any> | null;
      if (!t || !sameId(t.assigneeMembershipId, r.actor.membershipId)) throw new ForbiddenException('You can only update tasks assigned to you.');
      const status = String(input.status ?? '');
      if (!['todo', 'in_progress', 'completed'].includes(status)) throw new BadRequestException('Choose a status.');
      await this.m.task.updateOne({ _id: t._id }, { $set: { status } });
      return { id: taskId };
    }
    if (!r.canCoordinate) throw new ForbiddenException('Only group leaders can assign tasks.');
    const title = str(input.title, 160);
    if (!title) throw new BadRequestException('Give the task a title.');
    let assigneeName = '';
    let assignee: Types.ObjectId | null = null;
    if (input.assigneeMembershipId) {
      const p = (await this.m.member.findOne({ _id: this.oid(String(input.assigneeMembershipId), 'Member ID'), groupIds: r.group._id }).select('profile.displayName userId').lean().exec()) as LeanMember | null;
      if (!p) throw new BadRequestException('Tasks can only be assigned to group members.');
      assignee = p._id;
      assigneeName = nameOf(p);
    }
    const data = {
      title,
      description: str(input.description, 3000),
      assigneeMembershipId: assignee,
      assigneeName,
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(input.dueDate ?? '')) ? String(input.dueDate) : '',
      priority: ['low', 'medium', 'high'].includes(String(input.priority)) ? input.priority : 'medium',
      status: ['todo', 'in_progress', 'completed', 'cancelled'].includes(String(input.status)) ? input.status : 'todo',
      attachmentUrls: urlList(input.attachmentUrls),
    };
    let id = taskId;
    let notifyUser: string | null = null;
    if (taskId) {
      const before = (await this.m.task.findOneAndUpdate({ _id: this.oid(taskId, 'Task ID'), groupId: r.group._id }, { $set: data }).lean().exec()) as Record<string, any> | null;
      if (!before) throw new NotFoundException('Task not found.');
      if (assignee && !sameId(before.assigneeMembershipId, assignee)) notifyUser = String(assignee);
    } else {
      const doc = await this.m.task.create({ ...data, organizationId: r.group.organizationId, groupId: r.group._id, createdByUserId: new Types.ObjectId(userId), createdByName: r.actor.displayName });
      id = String(doc._id);
      if (assignee) notifyUser = String(assignee);
    }
    if (notifyUser) {
      const p = (await this.m.member.findById(notifyUser).select('userId').lean().exec()) as LeanMember | null;
      if (p) await this.communities.notify([String(p.userId)], `${r.group.name}: task assigned`, title, this.link(r, 'tasks'), id ?? undefined);
    }
    return { id };
  }

  async deleteTask(organizationId: string, userId: string, groupId: string, taskId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can delete tasks.');
    const res = await this.m.task.deleteOne({ _id: this.oid(taskId, 'Task ID'), groupId: r.group._id });
    if (!res.deletedCount) throw new NotFoundException('Task not found.');
    return { ok: true };
  }

  /* ==========================================================================
     DOCUMENTS — church media library, tagged per group
     ========================================================================== */

  async documents(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'documents');
    const filter: Record<string, unknown> = { organizationId: r.group.organizationId, tags: groupMediaTag(String(r.group._id)) };
    // "leaders" documents carry an extra tag and are hidden from members.
    if (!r.canCoordinate) filter.tags = { $all: [groupMediaTag(String(r.group._id))], $nin: ['group-access:leaders'] };
    const rows = (await this.m.media.find(filter).select('title description fileUrl fileName mimeType fileSize mediaType category tags createdAt uploadedByMembershipId').sort({ createdAt: -1 }).limit(300).lean().exec()) as Array<Record<string, any>>;
    const uploaderIds = [...new Set(rows.map((d) => d.uploadedByMembershipId).filter(Boolean).map(String))];
    const people = (await this.m.member.find({ _id: { $in: uploaderIds.map((x) => new Types.ObjectId(x)) } }).select('profile.displayName').lean().exec()) as LeanMember[];
    const names = new Map(people.map((p) => [String(p._id), nameOf(p)]));
    return {
      canUpload: r.canCoordinate,
      items: rows.map((d) => ({
        id: String(d._id),
        title: d.title,
        description: d.description ?? '',
        category: (d.tags ?? []).find((t: string) => t.startsWith('group-cat:'))?.slice(10) ?? 'general',
        access: (d.tags ?? []).includes('group-access:leaders') ? 'leaders' : 'members',
        fileUrl: d.fileUrl,
        fileName: d.fileName ?? null,
        mimeType: d.mimeType ?? null,
        fileSize: d.fileSize ?? null,
        mediaType: d.mediaType,
        uploadedBy: d.uploadedByMembershipId ? (names.get(String(d.uploadedByMembershipId)) ?? '') : '',
        createdAt: iso(d.createdAt),
      })),
    };
  }

  async uploadDocument(organizationId: string, userId: string, groupId: string, file: any, input: { title?: string; category?: string; access?: string }) {
    const cleanup = async () => {
      if (file?.path) await import('fs').then((fs) => fs.promises.unlink(file.path)).catch(() => undefined);
    };
    let r: GroupRights;
    try {
      r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can upload documents.');
      this.access.requireService(r, 'documents');
    } catch (e) {
      await cleanup();
      throw e;
    }
    const kind = MEDIA_UPLOAD_TYPES[String(file?.mimetype ?? '').toLowerCase()];
    if (!kind) {
      await cleanup();
      throw new BadRequestException('This file type is not supported.');
    }
    const stored = (await this.mediaService.storeAuthorizedUpload(organizationId, file, kind.type)) as { fileUrl: string; fileName?: string; mimeType?: string; fileSize?: number };
    const category = str(input.category, 30).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';
    const tags = [groupMediaTag(groupId), `group-cat:${category}`];
    if (input.access === 'leaders') tags.push('group-access:leaders');
    const doc = await this.m.media.create({
      organizationId: r.group.organizationId,
      title: str(input.title, 160) || String(file.originalname ?? 'Document').replace(/\.[^.]+$/, ''),
      description: '',
      mediaType: kind.type,
      visibility: ChurchMediaVisibility.Members,
      fileUrl: stored.fileUrl,
      fileName: stored.fileName ?? file.originalname ?? null,
      mimeType: stored.mimeType ?? file.mimetype ?? null,
      fileSize: stored.fileSize ?? file.size ?? null,
      category: 'resource',
      tags,
      publishedAt: new Date(),
      uploadedByUserId: new Types.ObjectId(userId),
      uploadedByMembershipId: r.actor.membershipId ? new Types.ObjectId(r.actor.membershipId) : null,
    });
    await this.access.audit(organizationId, r.group._id, r.actor, 'document_uploaded', String(doc.title));
    return { id: String(doc._id), fileUrl: doc.fileUrl, mediaType: kind.type === ChurchMediaType.Document ? 'document' : String(kind.type) };
  }

  async deleteDocument(organizationId: string, userId: string, groupId: string, documentId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canCoordinate', 'Only group leaders can remove documents.');
    const doc = (await this.m.media.findOne({ _id: this.oid(documentId, 'Document ID'), organizationId: r.group.organizationId, tags: groupMediaTag(groupId) }).exec()) as any;
    if (!doc) throw new NotFoundException('Document not found.');
    await doc.deleteOne();
    await this.access.audit(organizationId, r.group._id, r.actor, 'document_removed', String(doc.title));
    return { ok: true };
  }
}
