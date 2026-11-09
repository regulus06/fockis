/**
 * organization-visit.schema.ts
 * -----------------------------------------------------------------------------
 * A request to visit an organization (a church service, a school tour, an
 * office visit…), sent from the organization's "Plan a visit" form.
 *
 * Anyone can send one, signed in or not. The organization's admins see them
 * in Admin → Visit requests and move them through the statuses below.
 * A signed-in visitor sees their own requests in their member portal.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const VISIT_STATUSES = ['new', 'contacted', 'scheduled', 'visited', 'cancelled', 'no_show'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

@Schema({ _id: false })
export class VisitHistoryEntry {
  @Prop({ type: Date, default: () => new Date() }) at!: Date;
  @Prop({ type: String }) status?: string;
  @Prop({ type: String, default: '' }) note?: string;
  @Prop({ type: Types.ObjectId, default: null }) byUserId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) byName?: string;
}
export const VisitHistoryEntrySchema = SchemaFactory.createForClass(VisitHistoryEntry);

@Schema({ timestamps: true, collection: 'organization_visits' })
export class OrganizationVisit {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  /** Set when the visitor was signed in. */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  userId?: Types.ObjectId | null;

  /** Branch / campus / location, when the organization has more than one. */
  @Prop({ type: Types.ObjectId, default: null })
  branchId?: Types.ObjectId | null;

  @Prop({ type: String, default: '' }) branchName?: string;

  /** "YYYY-MM-DD" in the visitor's own calendar. */
  @Prop({ type: String, required: true }) visitDate!: string;

  /** Free text such as "9:00 AM" or "Morning". */
  @Prop({ type: String, default: '' }) visitTime?: string;

  @Prop({ type: Number, default: 1, min: 1 }) adults!: number;
  @Prop({ type: Number, default: 0, min: 0 }) children!: number;

  @Prop({ type: String, required: true, trim: true }) firstName!: string;
  @Prop({ type: String, default: '', trim: true }) lastName?: string;
  @Prop({ type: String, default: '', trim: true, lowercase: true }) email?: string;
  @Prop({ type: String, default: '', trim: true }) phone?: string;

  @Prop({ type: String, default: '' }) accessibility?: string;
  @Prop({ type: String, default: '' }) notes?: string;

  @Prop({ type: String, enum: VISIT_STATUSES, default: 'new', index: true })
  status!: VisitStatus;

  /** Note from the organization, visible to its admins only. */
  @Prop({ type: String, default: '' }) staffNote?: string;

  @Prop({ type: [VisitHistoryEntrySchema], default: [] })
  history!: VisitHistoryEntry[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationVisitDocument = HydratedDocument<OrganizationVisit>;
export const OrganizationVisitSchema = SchemaFactory.createForClass(OrganizationVisit);
OrganizationVisitSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
