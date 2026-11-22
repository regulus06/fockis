import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  PayoutPlan,
  PayoutPlanAssignment,
  PayoutPlanAssignmentDocument,
  PayoutPlanDocument,
  PayoutPlanStatus,
} from "../schemas/payout-plan.schema";
import { FinanceAuditService } from "./finance-audit.service";

/** What an admin may send when creating or editing a plan. */
export interface PayoutPlanInput {
  name?: string;
  description?: string;
  currency?: string;
  earlyPayout?: {
    enabled?: boolean;
    percentBps?: number;
    fixedCents?: number;
    minFeeCents?: number;
    maxFeeCents?: number | null;
    tiers?: Array<{ upToCents: number | null; percentBps: number; fixedCents: number }>;
  };
  minPayoutCents?: number;
  maxPayoutCents?: number | null;
  waitDaysAfterPayment?: number;
  payoutScheduleLabel?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

function wholeCents(value: unknown, label: string, allowNull = false): number | null {
  if (allowNull && (value === null || value === "" || value === undefined)) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new BadRequestException(`${label} must be a whole number of cents, 0 or more.`);
  }
  return n;
}

function bps(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 10000) {
    throw new BadRequestException(`${label} must be between 0 and 10000 basis points (0–100 %).`);
  }
  return n;
}

function optionalDate(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} is not a valid date.`);
  return date;
}

function toObjectId(value: string, label: string): Types.ObjectId {
  if (!value || !Types.ObjectId.isValid(value)) throw new BadRequestException(`A valid ${label} is required.`);
  return new Types.ObjectId(value);
}

@Injectable()
export class PayoutPlansService {
  constructor(
    @InjectModel(PayoutPlan.name)
    private readonly planModel: Model<PayoutPlanDocument>,
    @InjectModel(PayoutPlanAssignment.name)
    private readonly assignmentModel: Model<PayoutPlanAssignmentDocument>,
    private readonly audit: FinanceAuditService,
  ) {}

  /* ------------------------------------------------------------------------
     Validation
  ------------------------------------------------------------------------ */

  private normalize(input: PayoutPlanInput, current?: PayoutPlan): Partial<PayoutPlan> {
    const out: Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) throw new BadRequestException("Plan name is required.");
      if (name.length > 80) throw new BadRequestException("Plan name is too long (80 characters max).");
      out.name = name;
    } else if (!current) {
      throw new BadRequestException("Plan name is required.");
    }
    if (input.description !== undefined) out.description = String(input.description).trim().slice(0, 500);
    if (input.currency !== undefined) {
      const currency = String(input.currency).trim().toLowerCase();
      if (!/^[a-z]{3}$/.test(currency)) throw new BadRequestException("Currency must be a 3-letter code like USD.");
      out.currency = currency;
    }
    if (input.payoutScheduleLabel !== undefined) {
      out.payoutScheduleLabel = String(input.payoutScheduleLabel).trim().slice(0, 40);
    }

    if (input.earlyPayout !== undefined) {
      const e = input.earlyPayout ?? {};
      const before = current?.earlyPayout;
      const early = {
        enabled: e.enabled !== undefined ? Boolean(e.enabled) : Boolean(before?.enabled),
        percentBps: e.percentBps !== undefined ? bps(e.percentBps, "Early payout percentage") : before?.percentBps ?? 0,
        fixedCents: e.fixedCents !== undefined ? (wholeCents(e.fixedCents, "Fixed fee") as number) : before?.fixedCents ?? 0,
        minFeeCents:
          e.minFeeCents !== undefined ? (wholeCents(e.minFeeCents, "Minimum fee") as number) : before?.minFeeCents ?? 0,
        maxFeeCents:
          e.maxFeeCents !== undefined ? wholeCents(e.maxFeeCents, "Maximum fee", true) : before?.maxFeeCents ?? null,
        tiers: before?.tiers ?? [],
      };
      if (e.tiers !== undefined) {
        if (!Array.isArray(e.tiers)) throw new BadRequestException("Fee tiers must be a list.");
        const seen = new Set<string>();
        early.tiers = e.tiers.map((tier, index) => {
          const upToCents = wholeCents(tier?.upToCents, `Tier ${index + 1} limit`, true);
          const key = String(upToCents);
          if (seen.has(key)) throw new BadRequestException("Two fee tiers have the same limit.");
          seen.add(key);
          return {
            upToCents,
            percentBps: bps(tier?.percentBps ?? 0, `Tier ${index + 1} percentage`),
            fixedCents: wholeCents(tier?.fixedCents ?? 0, `Tier ${index + 1} fixed fee`) as number,
          };
        });
      }
      if (early.maxFeeCents !== null && early.maxFeeCents < early.minFeeCents) {
        throw new BadRequestException("Maximum fee cannot be lower than the minimum fee.");
      }
      out.earlyPayout = early;
    }

    if (input.minPayoutCents !== undefined) out.minPayoutCents = wholeCents(input.minPayoutCents, "Minimum payout");
    if (input.maxPayoutCents !== undefined) out.maxPayoutCents = wholeCents(input.maxPayoutCents, "Maximum payout", true);
    const minPayout = (out.minPayoutCents as number | undefined) ?? current?.minPayoutCents ?? 0;
    const maxPayout =
      out.maxPayoutCents !== undefined ? (out.maxPayoutCents as number | null) : current?.maxPayoutCents ?? null;
    if (maxPayout !== null && maxPayout < minPayout) {
      throw new BadRequestException("Maximum payout cannot be lower than the minimum payout.");
    }

    if (input.waitDaysAfterPayment !== undefined) {
      const days = Number(input.waitDaysAfterPayment);
      if (!Number.isInteger(days) || days < 0 || days > 365) {
        throw new BadRequestException("Waiting days must be a whole number from 0 to 365.");
      }
      out.waitDaysAfterPayment = days;
    }

    if (input.effectiveFrom !== undefined) out.effectiveFrom = optionalDate(input.effectiveFrom, "Start date");
    if (input.effectiveTo !== undefined) out.effectiveTo = optionalDate(input.effectiveTo, "End date");
    const from = (out.effectiveFrom as Date | null | undefined) ?? current?.effectiveFrom ?? null;
    const to = (out.effectiveTo as Date | null | undefined) ?? current?.effectiveTo ?? null;
    if (from && to && to <= from) throw new BadRequestException("The end date must be after the start date.");

    return out as Partial<PayoutPlan>;
  }

  private async assertUniqueName(name: string, exceptId?: Types.ObjectId) {
    const clash = await this.planModel
      .findOne({
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        status: { $ne: "archived" },
        ...(exceptId ? { _id: { $ne: exceptId } } : {}),
      })
      .lean()
      .exec();
    if (clash) throw new ConflictException(`A plan named "${name}" already exists.`);
  }

  /* ------------------------------------------------------------------------
     Plans
  ------------------------------------------------------------------------ */

  async list(includeArchived = false) {
    const plans = await this.planModel
      .find(includeArchived ? {} : { status: { $ne: "archived" } })
      .sort({ isDefault: -1, name: 1 })
      .lean()
      .exec();
    const counts = await this.assignmentModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: "$planId", count: { $sum: 1 } } },
    ]);
    const byPlan = new Map(counts.map((c) => [String(c._id), c.count]));
    return plans.map((plan) => ({ ...plan, assignedStores: byPlan.get(String(plan._id)) ?? 0 }));
  }

  async get(planId: string) {
    const plan = await this.planModel.findById(toObjectId(planId, "plan ID")).exec();
    if (!plan) throw new NotFoundException("Payout plan not found.");
    return plan;
  }

  async create(actor: string, input: PayoutPlanInput) {
    const data = this.normalize({ earlyPayout: {}, ...input });
    await this.assertUniqueName(String(data.name));
    const anyDefault = await this.planModel.exists({ isDefault: true, status: "active" });
    const plan = await this.planModel.create({
      ...data,
      // The first plan becomes the default so every store has one.
      isDefault: !anyDefault,
      status: "active",
      version: 1,
      createdBy: actor,
      updatedBy: actor,
    });
    await this.audit.record("plan_created", "payout_plan", String(plan._id), actor, { plan: plan.toObject() });
    return plan;
  }

  async update(actor: string, planId: string, input: PayoutPlanInput) {
    const plan = await this.get(planId);
    if (plan.status === "archived") throw new BadRequestException("Archived plans cannot be edited.");
    const data = this.normalize(input, plan);
    if (data.name) await this.assertUniqueName(data.name, plan._id);

    const before = plan.toObject();
    plan.set({ ...data, version: (plan.version ?? 1) + 1, updatedBy: actor });
    await plan.save();
    await this.audit.record("plan_updated", "payout_plan", String(plan._id), actor, {
      before,
      after: plan.toObject(),
    });
    return plan;
  }

  async setStatus(actor: string, planId: string, status: PayoutPlanStatus) {
    if (!["active", "inactive", "archived"].includes(status)) {
      throw new BadRequestException("Status must be active, inactive or archived.");
    }
    const plan = await this.get(planId);
    if (plan.isDefault && status !== "active") {
      throw new BadRequestException("Make another plan the default before turning this one off.");
    }
    const previous = plan.status;
    plan.status = status;
    plan.updatedBy = actor;
    await plan.save();
    await this.audit.record("plan_status_changed", "payout_plan", String(plan._id), actor, {
      from: previous,
      to: status,
    });
    return plan;
  }

  async makeDefault(actor: string, planId: string) {
    const plan = await this.get(planId);
    if (plan.status !== "active") throw new BadRequestException("Only an active plan can be the default.");
    await this.planModel.updateMany({ _id: { $ne: plan._id }, isDefault: true }, { $set: { isDefault: false } }).exec();
    plan.isDefault = true;
    plan.updatedBy = actor;
    await plan.save();
    await this.audit.record("plan_made_default", "payout_plan", String(plan._id), actor, {});
    return plan;
  }

  /* ------------------------------------------------------------------------
     Assignments
  ------------------------------------------------------------------------ */

  async assign(actor: string, storeId: string, planId: string | null) {
    const store = toObjectId(storeId, "store ID");
    const previous = await this.assignmentModel.findOne({ storeId: store }).lean().exec();

    if (!planId) {
      await this.assignmentModel.deleteOne({ storeId: store }).exec();
      await this.audit.record(
        "plan_unassigned",
        "plan_assignment",
        storeId,
        actor,
        { previousPlanId: previous ? String(previous.planId) : null },
        storeId,
      );
      return { storeId, planId: null };
    }

    const plan = await this.get(planId);
    if (plan.status !== "active") throw new BadRequestException("Only an active plan can be assigned.");
    await this.assignmentModel
      .updateOne({ storeId: store }, { $set: { planId: plan._id, assignedBy: actor } }, { upsert: true })
      .exec();
    await this.audit.record(
      "plan_assigned",
      "plan_assignment",
      storeId,
      actor,
      { planId: String(plan._id), planName: plan.name, previousPlanId: previous ? String(previous.planId) : null },
      storeId,
    );
    return { storeId, planId: String(plan._id) };
  }

  async assignmentsFor(storeIds: string[]) {
    const ids = storeIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    const rows = await this.assignmentModel.find({ storeId: { $in: ids } }).lean().exec();
    return new Map(rows.map((row) => [String(row.storeId), String(row.planId)]));
  }

  private isInEffect(plan: PayoutPlan, now = new Date()): boolean {
    if (plan.status !== "active") return false;
    if (plan.effectiveFrom && plan.effectiveFrom > now) return false;
    if (plan.effectiveTo && plan.effectiveTo <= now) return false;
    return true;
  }

  /**
   * The plan that applies to a store right now: its assigned plan if that plan
   * is in effect, otherwise the default plan. null when no plan is usable.
   */
  async planForStore(storeId: string): Promise<{ plan: PayoutPlanDocument | null; source: "assigned" | "default" | "none" }> {
    const assignment = Types.ObjectId.isValid(storeId)
      ? await this.assignmentModel.findOne({ storeId: new Types.ObjectId(storeId) }).lean().exec()
      : null;

    if (assignment) {
      const assigned = await this.planModel.findById(assignment.planId).exec();
      if (assigned && this.isInEffect(assigned)) return { plan: assigned, source: "assigned" };
    }

    const fallback = await this.planModel.findOne({ isDefault: true, status: "active" }).exec();
    if (fallback && this.isInEffect(fallback)) return { plan: fallback, source: "default" };
    return { plan: null, source: "none" };
  }
}
