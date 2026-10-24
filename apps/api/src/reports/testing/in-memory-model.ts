/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";

/**
 * Minimal in-memory stand-in for a Mongoose model, used only by the
 * reports specs. It supports the query/update operators the reports
 * module uses and enforces unique indexes (E11000), so duplicate
 * prevention and the conditional "only one winner" updates are tested
 * for real rather than mocked.
 */

type Doc = Record<string, any>;

function clone<T>(value: T): T {
  if (value instanceof Types.ObjectId) return new Types.ObjectId(String(value)) as any;
  if (value instanceof Date) return new Date(value.getTime()) as any;
  if (Array.isArray(value)) return value.map(clone) as any;
  if (value && typeof value === "object") {
    const out: Doc = {};
    for (const [key, inner] of Object.entries(value)) out[key] = clone(inner);
    return out as T;
  }
  return value;
}

function norm(value: any): any {
  if (value instanceof Types.ObjectId) return `oid:${String(value)}`;
  if (value instanceof Date) return value.getTime();
  return value;
}

function getPath(doc: Doc, path: string): any {
  return path.split(".").reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), doc);
}

function setPath(doc: Doc, path: string, value: any) {
  const keys = path.split(".");
  let cursor = doc;
  keys.slice(0, -1).forEach((key) => {
    if (cursor[key] == null || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
}

function equals(a: any, b: any) {
  if (Array.isArray(a)) return a.some((item) => norm(item) === norm(b));
  if (a === undefined && b === null) return true;
  return norm(a) === norm(b);
}

function matchCondition(value: any, condition: any): boolean {
  if (
    condition &&
    typeof condition === "object" &&
    !(condition instanceof Types.ObjectId) &&
    !(condition instanceof Date) &&
    !(condition instanceof RegExp) &&
    !Array.isArray(condition) &&
    Object.keys(condition).some((key) => key.startsWith("$"))
  ) {
    return Object.entries(condition).every(([op, arg]: [string, any]) => {
      switch (op) {
        case "$in":
          return arg.some((item: any) => equals(value, item));
        case "$nin":
          return !arg.some((item: any) => equals(value, item));
        case "$ne":
          return !equals(value, arg);
        case "$gt":
          return value != null && norm(value) > norm(arg);
        case "$gte":
          return value != null && norm(value) >= norm(arg);
        case "$lt":
          return value != null && norm(value) < norm(arg);
        case "$lte":
          return value != null && norm(value) <= norm(arg);
        case "$exists":
          return arg ? value !== undefined : value === undefined;
        default:
          throw new Error(`Unsupported operator ${op}`);
      }
    });
  }

  if (condition instanceof RegExp) return typeof value === "string" && condition.test(value);

  return equals(value, condition);
}

export function matches(doc: Doc, filter: Doc = {}): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return (condition as Doc[]).some((inner) => matches(doc, inner));
    if (key === "$and") return (condition as Doc[]).every((inner) => matches(doc, inner));
    return matchCondition(getPath(doc, key), condition);
  });
}

function applyUpdate(doc: Doc, update: Doc, inserting: boolean) {
  for (const [op, fields] of Object.entries(update)) {
    for (const [path, value] of Object.entries(fields as Doc)) {
      switch (op) {
        case "$set":
          setPath(doc, path, clone(value));
          break;
        case "$setOnInsert":
          if (inserting) setPath(doc, path, clone(value));
          break;
        case "$inc":
          setPath(doc, path, (Number(getPath(doc, path)) || 0) + Number(value));
          break;
        case "$max": {
          const current = getPath(doc, path);
          if (current == null || norm(value) > norm(current)) setPath(doc, path, clone(value));
          break;
        }
        case "$push": {
          const current = getPath(doc, path);
          setPath(doc, path, [...(Array.isArray(current) ? current : []), clone(value)]);
          break;
        }
        default:
          throw new Error(`Unsupported update operator ${op}`);
      }
    }
  }
  doc.updatedAt = new Date();
}

class Query<T> {
  private sortSpec: Record<string, 1 | -1> | null = null;
  private skipN = 0;
  private limitN = 0;

  constructor(private readonly run: () => Promise<T>) {}

  lean<R = T>() {
    return this as unknown as Query<R>;
  }
  select() {
    return this;
  }
  populate() {
    return this;
  }
  sort(spec: Record<string, 1 | -1>) {
    this.sortSpec = spec;
    return this;
  }
  skip(n: number) {
    this.skipN = n;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  async exec(): Promise<T> {
    let result: any = await this.run();
    if (Array.isArray(result)) {
      if (this.sortSpec) {
        const spec = Object.entries(this.sortSpec);
        result = [...result].sort((a, b) => {
          for (const [key, dir] of spec) {
            const av = norm(getPath(a, key));
            const bv = norm(getPath(b, key));
            if (av === bv) continue;
            return (av > bv ? 1 : -1) * dir;
          }
          return 0;
        });
      }
      result = result.slice(this.skipN, this.limitN ? this.skipN + this.limitN : undefined);
    }
    return result;
  }
  then<R1 = T, R2 = never>(ok?: (value: T) => R1 | PromiseLike<R1>, fail?: (reason: any) => R2 | PromiseLike<R2>) {
    return this.exec().then(ok, fail);
  }
}

export class InMemoryModel {
  docs: Doc[] = [];

  constructor(readonly modelName: string, private readonly uniqueIndexes: string[][] = []) {}

  private assertUnique(candidate: Doc, ignore?: Doc) {
    for (const keys of this.uniqueIndexes) {
      const clash = this.docs.find(
        (doc) => doc !== ignore && keys.every((key) => norm(getPath(doc, key)) === norm(getPath(candidate, key))),
      );
      if (clash) {
        const error: any = new Error(`E11000 duplicate key error collection: ${this.modelName}`);
        error.code = 11000;
        throw error;
      }
    }
  }

  async create(input: Doc) {
    const doc = { _id: new Types.ObjectId(), createdAt: new Date(), updatedAt: new Date(), ...clone(input) };
    this.assertUnique(doc);
    this.docs.push(doc);
    return { ...clone(doc), toObject: () => clone(doc) };
  }

  find(filter: Doc = {}) {
    return new Query(async () => this.docs.filter((doc) => matches(doc, filter)).map(clone));
  }

  findOne(filter: Doc = {}) {
    return new Query(async () => {
      const doc = this.docs.find((item) => matches(item, filter));
      return doc ? clone(doc) : null;
    });
  }

  findById(id: any) {
    return this.findOne({ _id: Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : id });
  }

  exists(filter: Doc) {
    return new Query(async () => (this.docs.some((doc) => matches(doc, filter)) ? { _id: true } : null));
  }

  countDocuments(filter: Doc = {}) {
    return new Query(async () => this.docs.filter((doc) => matches(doc, filter)).length);
  }

  estimatedDocumentCount() {
    return new Query(async () => this.docs.length);
  }

  aggregate() {
    return new Query(async () => [] as any[]);
  }

  updateOne(filter: Doc, update: Doc) {
    return new Query(async () => {
      const doc = this.docs.find((item) => matches(item, filter));
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      const next = clone(doc);
      applyUpdate(next, update, false);
      this.assertUnique(next, doc);
      Object.assign(doc, next);
      return { matchedCount: 1, modifiedCount: 1 };
    });
  }

  updateMany(filter: Doc, update: Doc) {
    return new Query(async () => {
      const targets = this.docs.filter((item) => matches(item, filter));
      for (const doc of targets) {
        const next = clone(doc);
        applyUpdate(next, update, false);
        this.assertUnique(next, doc);
        Object.assign(doc, next);
      }
      return { matchedCount: targets.length, modifiedCount: targets.length };
    });
  }

  deleteOne(filter: Doc) {
    return new Query(async () => {
      const index = this.docs.findIndex((item) => matches(item, filter));
      if (index >= 0) this.docs.splice(index, 1);
      return { deletedCount: index >= 0 ? 1 : 0 };
    });
  }

  findOneAndUpdate(filter: Doc, update: Doc, options: { upsert?: boolean; returnDocument?: "before" | "after" } = {}) {
    return new Query(async () => {
      const doc = this.docs.find((item) => matches(item, filter));

      if (!doc) {
        if (!options.upsert) return null;
        const created: Doc = { _id: new Types.ObjectId(), createdAt: new Date() };
        for (const [key, value] of Object.entries(filter)) {
          if (!key.startsWith("$") && (typeof value !== "object" || value instanceof Types.ObjectId)) {
            setPath(created, key, clone(value));
          }
        }
        applyUpdate(created, update, true);
        this.assertUnique(created);
        this.docs.push(created);
        return options.returnDocument === "after" ? clone(created) : null;
      }

      const before = clone(doc);
      const next = clone(doc);
      applyUpdate(next, update, false);
      this.assertUnique(next, doc);
      Object.assign(doc, next);
      return options.returnDocument === "after" ? clone(doc) : before;
    });
  }
}
