import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("actor onboarding screen result contract", () => {
  it.each([
    ["Bursar", "../src/pages/onboarding/CreateBursar.tsx"],
    ["Vice Principal", "../src/pages/onboarding/CreateVP.tsx"],
  ])("%s screen handles recovered identities without exposing a PIN", (_name, path) => {
    const source = read(path);
    expect(source).toContain("pin: string | null;");
    expect(source).toContain("recovered: boolean;");
    expect(source).toContain("resData.provisioning.recovered");
    expect(source).toContain("pin_not_reissued: resData.pin_not_reissued");
    expect(source).toContain("success.pin && !success.recovered");
    expect(source).toContain("if (success?.pin)");
  });

  it("Parent screen maps recovery state and suppresses PIN copy for recovered identities", () => {
    const source = read("../src/pages/onboarding/CreateParent.tsx");
    expect(source).toContain("pin: string | null;");
    expect(source).toContain("rpcData.provisioning.recovered");
    expect(source).toContain("rpcData.pin_not_reissued");
    expect(source).toContain("success.pin && !success.recovered");
    expect(source).toContain("if (success?.pin)");
    expect(source).not.toContain("is_existing: false");
  });

  it("Higher Education screen shows PIN only for newly provisioned identities", () => {
    const source = read("../src/pages/onboarding/HigherEducationOnboarding.tsx");
    expect(source).toContain("latestAccount.provisioning.recovered");
    expect(source).toContain("latestAccount.pin && !latestAccount.provisioning.recovered");
    expect(source).toContain("copyValue(\"pin\", latestAccount.pin!)");
    expect(source).toContain("no PIN has been generated or reissued");
    expect(source).toContain("Recovered identities retain their existing PIN, which is never reissued.");
  });
});
