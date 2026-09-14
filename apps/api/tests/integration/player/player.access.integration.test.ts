import request from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createAdmin, createEditor, createModerator, createUser } from "../../helpers/auth";

const createPlayer = () => prisma.player.create({ data: { firstName: "Alex", lastName: "Martin" } });

describe("player role actions", () => {
  it.each([
    ["ADMIN", createAdmin],
    ["MODERATOR", createModerator],
    ["EDITOR", createEditor],
  ] as const)("allows %s to deactivate and activate a player", async (_role, createUserForTest) => {
    const user = await createUserForTest();
    const player = await createPlayer();
    const base = request(app).post(`/api/v1/players/${player.id}/deactivate`).set("Authorization", `Bearer ${user.accessToken}`);

    expect((await base).status).toBe(200);
    expect((await request(app).post(`/api/v1/players/${player.id}/activate`).set("Authorization", `Bearer ${user.accessToken}`)).status).toBe(200);
  });

  it("denies status actions to USER", async () => {
    const user = await createUser();
    const player = await createPlayer();

    const response = await request(app)
      .post(`/api/v1/players/${player.id}/deactivate`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(403);
  });

  it("restricts permanent deletion to ADMIN", async () => {
    const moderator = await createModerator();
    const admin = await createAdmin();
    const moderatorPlayer = await createPlayer();
    const adminPlayer = await createPlayer();

    const forbidden = await request(app)
      .delete(`/api/v1/players/${moderatorPlayer.id}`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ confirm: true });
    const deleted = await request(app)
      .delete(`/api/v1/players/${adminPlayer.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ confirm: true });

    expect(forbidden.status).toBe(403);
    expect(deleted.status).toBe(204);
  });
});
