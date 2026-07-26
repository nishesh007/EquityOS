import { afterEach, describe, expect, it } from "vitest";
import {
  diskPersistenceMode,
  isDiskPersistenceEnabled,
  isServerlessRuntime,
} from "@/lib/platform/runtime-fs";

describe("runtime-fs disk persistence gate", () => {
  const keys = [
    "VERCEL",
    "VERCEL_ENV",
    "AWS_LAMBDA_FUNCTION_NAME",
    "LAMBDA_TASK_ROOT",
    "EQUITYOS_FORCE_DISK_PERSISTENCE",
    "EQUITYOS_DISABLE_DISK_PERSISTENCE",
    "NODE_ENV",
  ] as const;

  const snapshot = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  afterEach(() => {
    for (const k of keys) {
      const v = snapshot[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("disables disk when VERCEL=1", () => {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "development";
    delete process.env.EQUITYOS_FORCE_DISK_PERSISTENCE;
    expect(isServerlessRuntime()).toBe(true);
    expect(isDiskPersistenceEnabled()).toBe(false);
    expect(diskPersistenceMode()).toBe("memory");
  });

  it("allows disk in local production (non-Vercel)", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    delete process.env.LAMBDA_TASK_ROOT;
    delete process.env.EQUITYOS_FORCE_DISK_PERSISTENCE;
    process.env.NODE_ENV = "production";
    expect(isDiskPersistenceEnabled()).toBe(true);
  });

  it("allows force override on Vercel", () => {
    process.env.VERCEL = "1";
    process.env.EQUITYOS_FORCE_DISK_PERSISTENCE = "1";
    expect(isDiskPersistenceEnabled()).toBe(true);
  });
});
