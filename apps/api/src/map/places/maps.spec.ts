/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Types } from "mongoose";

import { InMemoryModel } from "../../reports/testing/in-memory-model";
import { decodePolyline, encodePlusCode, encodePolyline } from "../geo/geo-utils";
import { GeoService } from "../geo/geo.service";
import { estimateFlightSeconds, greatCircle, nearestAirports } from "../geo/flights";
import { PlacesService } from "./places.service";
import { AddressVerificationService } from "./address-verification.service";

describe("geo utils", () => {
  it("encodes Plus Codes like the reference library", () => {
    // Values checked against Google's open-location-code package.
    expect(encodePlusCode(18.5944, -72.3074)).toBe("77C9HMVV+Q29");
    expect(encodePlusCode(18.5944, -72.3074, 10)).toBe("77C9HMVV+Q2");
  });

  it("round-trips polylines", () => {
    const pts: Array<[number, number]> = [
      [-72.3074, 18.5944],
      [-72.3, 18.6],
      [-72.29, 18.61],
    ];
    expect(decodePolyline(encodePolyline(pts))).toEqual(pts);
  });
});

describe("GeoService routing", () => {
  const shape = encodePolyline([
    [-72.3074, 18.5944],
    [-72.305, 18.597],
    [-72.3, 18.6],
  ]);
  const trip = {
    summary: { length: 1.234, time: 300 },
    legs: [
      {
        shape,
        summary: { has_toll: false, has_ferry: false },
        maneuvers: [
          { type: 1, instruction: "Drive north.", verbal_pre_transition_instruction: "Drive north.", length: 0.3, time: 60, begin_shape_index: 0, end_shape_index: 1 },
          { type: 10, instruction: "Turn right onto Route de Delmas.", verbal_pre_transition_instruction: "Turn right onto Route de Delmas.", street_names: ["Route de Delmas"], length: 0.9, time: 230, begin_shape_index: 1, end_shape_index: 2 },
          { type: 4, instruction: "You have arrived.", length: 0, time: 0, begin_shape_index: 2, end_shape_index: 2 },
        ],
      },
    ],
  };

  const geo = new GeoService({ models: {} } as any);
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("normalises a Valhalla trip", () => {
    const r = geo.normalizeTrip(trip);
    expect(r.distanceM).toBe(1234);
    expect(r.durationS).toBe(300);
    expect(r.summary).toBe("Route de Delmas");
    expect(r.geometry.coordinates).toHaveLength(3);
    expect(r.steps[1]).toMatchObject({ type: "turn", modifier: "right", distanceM: 900, location: [-72.305, 18.597] });
  });

  it("returns alternatives and warns when the destination is off-road", async () => {
    global.fetch = jest.fn(async () => ({ status: 200, text: async () => JSON.stringify({ trip, alternates: [{ trip }] }) })) as any;
    const res = await geo.route({ lat: 18.5944, lon: -72.3074 }, { lat: 18.605, lon: -72.3 }, "motorcycle");
    expect(res.routes).toHaveLength(2);
    expect(res.warnings.join(" ")).toMatch(/road ends/);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.costing).toBe("motorcycle");
    expect(body.alternates).toBe(2);
  });

  it("explains unroutable points", async () => {
    global.fetch = jest.fn(async () => ({ status: 400, text: async () => JSON.stringify({ error_code: 171, error: "No suitable edges" }) })) as any;
    await expect(geo.route({ lat: 18.5944, lon: -72.3074 }, { lat: 18.6, lon: -72.3 }, "driving")).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("only exposes browser-safe config", () => {
    process.env.MAPTILER_KEY = "public-key";
    process.env.TOMTOM_TRAFFIC_KEY = "secret-tomtom";
    const cfg = geo.config();
    expect(JSON.stringify(cfg)).not.toContain("secret-tomtom");
    expect(cfg.satellite).toBe(true);
    delete process.env.MAPTILER_KEY;
    delete process.env.TOMTOM_TRAFFIC_KEY;
    expect(geo.config().satellite).toBe(false);
  });

  it("searches worldwide when the selected country has no match", async () => {
    const springfield = { osm_type: "relation", osm_id: 1, name: "Springfield", display_name: "Springfield, Clark County, Ohio, United States", lat: "39.92", lon: "-83.81", type: "city" };
    global.fetch = jest.fn(async (url: string) => ({
      status: 200,
      text: async () => JSON.stringify(String(url).includes("countrycodes=ht") ? [] : [springfield]),
    })) as any;
    const results = await new GeoService({ models: {} } as any).search("u1", "springfield, Ohio", { lat: 18.59, lon: -72.3 }, "ht");
    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("countrycodes=ht");
    expect(urls[1]).not.toContain("countrycodes");
    expect(results[0]).toMatchObject({ name: "Springfield", lat: 39.92, lon: -83.81 });
  }, 10_000);

  it("falls back to the street when the house number isn't mapped", async () => {
    const street = { osm_type: "way", osm_id: 2, name: "Riggsby Road", display_name: "Riggsby Road, Georgia, United States", lat: "33.7", lon: "-84.1", type: "residential" };
    global.fetch = jest.fn(async (url: string) => ({
      status: 200,
      text: async () => JSON.stringify(/q=807/.test(String(url)) ? [] : [street]),
    })) as any;
    const results = await new GeoService({ models: {} } as any).search("u1", "807 Riggsby Road, Georgia", undefined, "us");
    expect(results[0]).toMatchObject({ name: "Riggsby Road", approximate: true });
  }, 10_000);

  it("reports a provider outage instead of 'no results'", async () => {
    global.fetch = jest.fn(async () => ({ status: 503, text: async () => "" })) as any;
    await expect(new GeoService({ models: {} } as any).search("u1", "Delmas", undefined, "ht")).rejects.toThrow("Search is unavailable");
  });
});

describe("PlacesService (Smart Address)", () => {
  function setup() {
    const locations = new InMemoryModel("SavedLocation", [["smartAddressId"]]);
    const counters = new InMemoryModel("MapCounter");
    const routes = new InMemoryModel("SavedRoute");
    const service = new PlacesService(locations as any, counters as any, routes as any);
    return { service, locations, user: String(new Types.ObjectId()), other: String(new Types.ObjectId()) };
  }

  const home = {
    kind: "home" as const,
    label: "My Home",
    latitude: 18.5944,
    longitude: -72.3074,
    department: "Ouest",
    commune: "Delmas",
    neighborhood: "Delmas 33",
    landmarks: [{ name: "Église Baptiste de Delmas", relation: "near" as const }],
    directions: "Second house after the school, on the left.",
  };

  it("creates sequential Smart Address IDs with Plus Codes", async () => {
    const { service, user } = setup();
    const a = await service.create(user, home);
    const b = await service.create(user, { ...home, kind: "saved", label: "Mom" });
    expect(a.smartAddressId).toBe("FSA-HT-000001");
    expect(b.smartAddressId).toBe("FSA-HT-000002");
    expect(a.plusCode).toBe("77C9HMVV+Q29");
    expect(a.isDefault).toBe(true);
    expect(a.landmarks[0].name).toBe("Église Baptiste de Delmas");
  });

  it("allows one home, keeps the ID when the pin moves, and hides places from others", async () => {
    const { service, user, other } = setup();
    const a = await service.create(user, home);
    await expect(service.create(user, home)).rejects.toBeInstanceOf(BadRequestException);
    const moved = await service.update(user, a.id, { latitude: 18.595, longitude: -72.307 });
    expect(moved.smartAddressId).toBe(a.smartAddressId);
    expect(moved.plusCode).not.toBe(a.plusCode);
    await expect(service.get(other, a.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(other, a.id, { label: "x" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("shares and revokes links", async () => {
    const { service, user } = setup();
    const a = await service.create(user, home);
    const link = await service.share(user, a.id, 7);
    const seen: any = await service.shared(link.token);
    expect(seen).toMatchObject({ smartAddressId: a.smartAddressId, directions: home.directions });
    expect(seen.id).toBeUndefined();
    await service.unshare(user, a.id);
    await expect(service.shared(link.token)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("saves and deletes routes per user", async () => {
    const { service, user, other } = setup();
    const r = await service.saveRoute(user, { name: "To work", origin: { lat: 18.59, lon: -72.3 }, destination: { lat: 18.6, lon: -72.31 }, mode: "motorcycle", distanceM: 4800, durationS: 720 });
    expect((await service.listRoutes(user))[0].name).toBe("To work");
    await expect(service.removeRoute(other, r.id)).rejects.toBeInstanceOf(NotFoundException);
    await service.removeRoute(user, r.id);
    expect(await service.listRoutes(user)).toHaveLength(0);
  });
});

describe("Smart Address verification", () => {
  function setup() {
    const locations = new InMemoryModel("SavedLocation", [["smartAddressId"]]);
    const counters = new InMemoryModel("MapCounter");
    const routes = new InMemoryModel("SavedRoute");
    const created: any[] = [];
    const notifications = { create: jest.fn(async (n: any) => created.push(n)) };
    const admin = new Types.ObjectId();
    const users = new InMemoryModel("User");
    const connection = { models: { User: users } } as any;
    const verification = new AddressVerificationService(locations as any, connection, notifications as any);
    const places = new PlacesService(locations as any, counters as any, routes as any, verification);
    return { places, verification, users, created, admin, owner: String(new Types.ObjectId()) };
  }
  const addr = { kind: "home" as const, label: "Lakay", latitude: 18.5944, longitude: -72.3074, neighborhood: "Delmas 33", commune: "Delmas", directions: "Blue gate" };
  const flush = () => new Promise((r) => setImmediate(r));

  it("sends every new address to reviewers as pending", async () => {
    const { places, verification, users, created, admin, owner } = setup();
    await users.create({ _id: admin, username: "boss", role: "admin" });
    const p = await places.create(owner, addr);
    await flush();
    expect(p.verification.status).toBe("pending");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ recipientId: String(admin), title: "New address to verify", link: `/admin/map/addresses/${p.id}` });
    const list = await verification.list({ status: "pending" });
    expect(list.counts).toMatchObject({ pending: 1, verified: 0 });
    expect(list.items[0]).toMatchObject({ id: p.id, status: "pending", smartAddressId: p.smartAddressId });
  });

  it("verifies, notifies the owner and records history", async () => {
    const { places, verification, created, admin, owner } = setup();
    const p = await places.create(owner, addr);
    const d = await verification.decide({ id: String(admin), role: "admin", permissions: ["map.addresses.verify"] }, p.id, "verify");
    expect(d.status).toBe("verified");
    expect(d.history.map((h: any) => h.action)).toEqual(["verified", "submitted"]);
    expect(created.at(-1)).toMatchObject({ recipientId: owner, title: "Address verified", link: `/map?place=${p.id}` });
    expect((await places.get(owner, p.id)).verification.status).toBe("verified");
    await expect(verification.decide({ id: String(admin), role: "admin" }, p.id, "verify")).rejects.toThrow("already verified");
  });

  it("requires a reason to reject or ask for information", async () => {
    const { places, verification, admin, owner } = setup();
    const p = await places.create(owner, addr);
    await expect(verification.decide({ id: String(admin), role: "admin" }, p.id, "reject", "")).rejects.toThrow("why");
    const d = await verification.decide({ id: String(admin), role: "admin" }, p.id, "needs_info", "Please add the house colour.");
    expect(d.status).toBe("needs_info");
    expect((await places.get(owner, p.id)).verification.note).toBe("Please add the house colour.");
  });

  it("goes back to pending when the owner moves the pin, not when renaming", async () => {
    const { places, verification, admin, owner } = setup();
    const p = await places.create(owner, addr);
    await verification.decide({ id: String(admin), role: "admin" }, p.id, "verify");
    expect((await places.update(owner, p.id, { label: "Kay manman" })).verification.status).toBe("verified");
    const moved = await places.update(owner, p.id, { latitude: 18.5951, longitude: -72.3074 });
    expect(moved.verification.status).toBe("pending");
    expect((await verification.detail(p.id)).history[0].action).toBe("changed");
  });

  it("lets the owner resubmit after a rejection", async () => {
    const { places, verification, admin, owner } = setup();
    const p = await places.create(owner, addr);
    await verification.decide({ id: String(admin), role: "admin" }, p.id, "reject", "The pin is in the sea.");
    const again = await places.requestVerification(owner, p.id, "Fixed, it's the blue house.");
    expect(again.verification.status).toBe("pending");
    await expect(places.requestVerification(owner, p.id)).rejects.toThrow("already waiting");
  });

  it("stops admins (not super admins) from verifying their own address", async () => {
    const { places, verification, owner } = setup();
    const p = await places.create(owner, addr);
    await expect(verification.decide({ id: owner, role: "admin" }, p.id, "verify")).rejects.toThrow("Another reviewer");
    expect((await verification.decide({ id: owner, role: "super_admin" }, p.id, "verify")).status).toBe("verified");
  });
});

describe("Flights", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const delmas = { lat: 18.5944, lon: -72.3074 };
  const springfield = { lat: 39.9242, lon: -83.8088 };

  it("finds real airports near a point, big airports first", () => {
    expect(nearestAirports(delmas)[0].iata).toBe("PAP");
    const near = nearestAirports(springfield).map((a) => a.iata);
    expect(near).toContain("DAY");
    expect(near).toContain("CMH");
  });

  it("estimates time and draws a great circle", () => {
    expect(Math.round(estimateFlightSeconds(800_000) / 60)).toBe(90);
    const arc = greatCircle({ lat: 18.58, lon: -72.29 }, { lat: 40.0, lon: -82.89 }, 10);
    expect(arc).toHaveLength(11);
    expect(arc[0]).toEqual([-72.29, 18.58]);
    expect(arc[10]).toEqual([-82.89, 40]);
    // Crossing the antimeridian stays continuous (no 360° jump).
    const pacific = greatCircle({ lat: 21.3, lon: 157.9 }, { lat: 21.3, lon: -157.9 }, 8);
    for (let i = 1; i < pacific.length; i++) expect(Math.abs(pacific[i][0] - pacific[i - 1][0])).toBeLessThan(180);
  });

  it("plans a flight with drives to and from the airports", async () => {
    const trip = { summary: { length: 12, time: 1500 }, legs: [{ shape: encodePolyline([[-72.3, 18.59], [-72.29, 18.58]]), summary: {}, maneuvers: [] }] };
    global.fetch = jest.fn(async () => ({ status: 200, text: async () => JSON.stringify({ trip }) })) as any;
    const plan = await new GeoService({ models: {} } as any).flight(delmas, springfield);
    expect(plan.departure.iata).toBe("PAP");
    expect(["CMH", "DAY"]).toContain(plan.arrival.iata);
    expect(plan.international).toBe(true);
    expect(plan.flightDistanceM).toBeGreaterThan(2_000_000);
    expect(plan.toAirport?.durationS).toBe(1500);
    expect(plan.searchUrl).toContain(`PAP%20to%20${plan.arrival.iata}`);
    expect(plan.warnings[0]).toMatch(/estimate/);
  });

  it("refuses flights for short trips", async () => {
    await expect(new GeoService({ models: {} } as any).flight(delmas, { lat: 18.6, lon: -72.2 })).rejects.toThrow("too close");
  });
});
