import { describe, expect, it } from "vitest";
import { isRegistrationFlagEnabled } from "@/lib/auth/registration-flag";

describe("isRegistrationFlagEnabled", () => {
  it("acepta los valores habituales de verdadero", () => {
    for (const v of ["true", "TRUE", " true ", '"true"', "'true'", "1", "yes"]) {
      expect(isRegistrationFlagEnabled(v)).toBe(true);
    }
  });
  it("rechaza el resto", () => {
    for (const v of ["", "false", "FALSE", '"false"', "0", "no", "verdadero"]) {
      expect(isRegistrationFlagEnabled(v)).toBe(false);
    }
  });
  it("sin argumento lee la variable de entorno", () => {
    const previous = process.env.ALLOW_REGISTRATION;
    try {
      delete process.env.ALLOW_REGISTRATION;
      expect(isRegistrationFlagEnabled()).toBe(false);
      process.env.ALLOW_REGISTRATION = "true";
      expect(isRegistrationFlagEnabled()).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.ALLOW_REGISTRATION;
      else process.env.ALLOW_REGISTRATION = previous;
    }
  });
});
