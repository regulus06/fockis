/**
 * organization-badge-design.schema.ts
 * -----------------------------------------------------------------------------
 * How an organization's member badges look: which template, its colour,
 * the title printed on it, the member-number prefix and which details show.
 * One document per organization; organizations without one use the defaults
 * in BADGE_DESIGN_DEFAULTS.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const BADGE_TEMPLATES = ['classic', 'modern', 'minimal', 'bold'] as const;
export type BadgeTemplate = (typeof BADGE_TEMPLATES)[number];

export const BADGE_DESIGN_DEFAULTS = {
  template: 'classic' as BadgeTemplate,
  accentColor: '#005a8d',
  badgeTitle: 'Member',
  showRole: true,
  showMemberSince: true,
  showDepartments: true,
  showGroups: false,
  showMemberDomain: false,
  footerText: '',
};

@Schema({ timestamps: true, collection: 'organization_badge_designs' })
export class OrganizationBadgeDesign {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: String, enum: BADGE_TEMPLATES, default: BADGE_DESIGN_DEFAULTS.template })
  template!: BadgeTemplate;

  /** "#rrggbb" */
  @Prop({ type: String, default: BADGE_DESIGN_DEFAULTS.accentColor })
  accentColor!: string;

  /** Printed on the badge: "Member", "Staff", "Student", "Volunteer"… */
  @Prop({ type: String, default: BADGE_DESIGN_DEFAULTS.badgeTitle, trim: true })
  badgeTitle!: string;

  /** Member numbers look like "<PREFIX>-A1B2C3". Empty = the organization's initials. */
  @Prop({ type: String, default: '', trim: true, uppercase: true })
  numberPrefix!: string;

  @Prop({ type: Boolean, default: BADGE_DESIGN_DEFAULTS.showRole }) showRole!: boolean;
  @Prop({ type: Boolean, default: BADGE_DESIGN_DEFAULTS.showMemberSince }) showMemberSince!: boolean;
  @Prop({ type: Boolean, default: BADGE_DESIGN_DEFAULTS.showDepartments }) showDepartments!: boolean;
  @Prop({ type: Boolean, default: BADGE_DESIGN_DEFAULTS.showGroups }) showGroups!: boolean;
  @Prop({ type: Boolean, default: BADGE_DESIGN_DEFAULTS.showMemberDomain }) showMemberDomain!: boolean;

  /** Small line at the bottom: a verse, a motto, "If found, call …". */
  @Prop({ type: String, default: '', trim: true })
  footerText!: string;

  @Prop({ type: Types.ObjectId, default: null })
  updatedByUserId?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationBadgeDesignDocument = HydratedDocument<OrganizationBadgeDesign>;
export const OrganizationBadgeDesignSchema = SchemaFactory.createForClass(OrganizationBadgeDesign);
