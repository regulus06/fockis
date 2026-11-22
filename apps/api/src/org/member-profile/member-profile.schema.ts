/**
 * member-profile.schema.ts
 * -----------------------------------------------------------------------------
 * Church member profile details that the membership record (church_members)
 * does not hold: preferred name, gender, languages, emergency contact,
 * membership number/type, church role, baptism, confirmation, faith journey,
 * family, ministry assignment details, history entries, notes and documents.
 *
 * One document per membership (unique membershipId). Name, email, phone,
 * address, date of birth, status and organization role stay on the
 * membership and are edited through the existing member endpoints.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type SacramentStatus = "not_recorded" | "scheduled" | "completed";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface BaptismRecord {
  status: SacramentStatus;
  date: string | null;
  location: string;
  officiant: string;
  notes: string;
}

export interface ConfirmationRecord {
  status: SacramentStatus;
  date: string | null;
  details: string;
}

export interface FamilyPerson {
  id: string;
  name: string;
  relationship: string;
  /** Linked church member, when the person is a member too. */
  membershipId: string | null;
  birthDate: string | null;
}

export interface FamilyConnections {
  spouse: FamilyPerson | null;
  children: FamilyPerson[];
  household: FamilyPerson[];
}

export interface MinistryAssignment {
  id: string;
  departmentId: string;
  role: string;
  leaderMembershipId: string | null;
  startDate: string | null;
  responsibilities: string;
  assignedAt: Date;
  assignedByName: string;
  endedAt: Date | null;
}

export type HistoryKind = "milestone" | "record";

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  type: string;
  title: string;
  description: string;
  date: string;
  createdAt: Date;
  createdByName: string;
}

export type NoteVisibility = "admin" | "pastoral";

export interface MemberNote {
  id: string;
  category: string;
  visibility: NoteVisibility;
  body: string;
  authorUserId: string;
  authorName: string;
  createdAt: Date;
}

export interface MemberDocument {
  id: string;
  category: string;
  title: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  issuedAt: string | null;
  expiresAt: string | null;
  /** Generated certificates have no file: they are printed from the profile. */
  generated: boolean;
  serial: string | null;
  uploadedByName: string;
  createdAt: Date;
}

@Schema({ collection: "church_member_profiles", timestamps: true })
export class MemberProfile {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, unique: true })
  membershipId!: Types.ObjectId;

  @Prop({ type: String, default: "", maxlength: 80 })
  preferredName!: string;

  @Prop({ type: String, default: "", maxlength: 40 })
  gender!: string;

  @Prop({ type: [String], default: [] })
  languages!: string[];

  @Prop({ type: Object, default: null })
  emergencyContact!: EmergencyContact | null;

  @Prop({ type: String, default: "", maxlength: 40 })
  membershipNumber!: string;

  @Prop({ type: String, default: "", maxlength: 60 })
  membershipType!: string;

  /** Church membership role, e.g. Member, Deacon, Elder, Usher. */
  @Prop({ type: String, default: "", maxlength: 60 })
  churchRole!: string;

  @Prop({ type: Object, default: null })
  baptism!: BaptismRecord | null;

  @Prop({ type: Object, default: null })
  confirmation!: ConfirmationRecord | null;

  /** Pastoral: only owners, administrators and pastors see it. */
  @Prop({ type: String, default: "", maxlength: 5000 })
  faithJourney!: string;

  @Prop({ type: Object, default: null })
  family!: FamilyConnections | null;

  @Prop({ type: [Object], default: [] })
  ministryAssignments!: MinistryAssignment[];

  @Prop({ type: [Object], default: [] })
  history!: HistoryEntry[];

  @Prop({ type: [Object], default: [] })
  notes!: MemberNote[];

  @Prop({ type: [Object], default: [] })
  documents!: MemberDocument[];

  @Prop({ type: Number, default: 0 })
  certificateCounter!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type MemberProfileDocument = HydratedDocument<MemberProfile>;
export const MemberProfileSchema = SchemaFactory.createForClass(MemberProfile);
MemberProfileSchema.index({ organizationId: 1, membershipId: 1 });
