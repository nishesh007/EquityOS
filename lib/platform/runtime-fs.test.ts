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

  function writeEnv(
    key: (typeof keys)[number],
    value: string | undefined
  ): void {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
      return;
    }
    Reflect.set(process.env, key, value);
  }

  afterEach(() => {
    for (const k of keys) {
      writeEnv(k, snapshot[k]);
    }
  });

  it("disables disk when VERCEL=1", () => {
    writeEnv("VERCEL", "1");
    writeEnv("NODE_ENV", "development");
    writeEnv("EQUITYOS_FORCE_DISK_PERSISTENCE", undefined);
    expect(isServerlessRuntime()).toBe(true);
    expect(isDiskPersistenceEnabled()).toBe(false);
    expect(diskPersistenceMode()).toBe("memory");
  });

  it("allows disk in local production (non-Vercel)", () => {
    writeEnv("VERCEL", undefined);
    writeEnv("VERCEL_ENV", undefined);
    writeEnv("AWS_LAMBDA_FUNCTION_NAME", undefined);
    writeEnv("LAMBDA_TASK_ROOT", undefined);
    writeEnv("EQUITYOS_FORCE_DISK_PERSISTENCE", undefined);
    writeEnv("NODE_ENV", "production");
    expect(isDiskPersistenceEnabled()).toBe(true);
  });

  it("allows force override on Vercel", () => {
    writeEnv("VERCEL", "1");
    writeEnv("EQUITYOS_FORCE_DISK_PERSISTENCE", "1");
    expect(isDiskPersistenceEnabled()).toBe(true);
  });
});
