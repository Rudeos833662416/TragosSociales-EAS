import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("connects with the configured public credentials", async () => {
    const projectUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    expect(projectUrl).toMatch(/^https:\/\/[^\s/]+\.supabase\.co\/?$/);
    expect(anonKey).toBeTruthy();

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: {
        apikey: anonKey as string,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
