import request from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createEditor } from "../../helpers/auth";

const createPlayer = () => prisma.player.create({
  data: { firstName: "Alex", lastName: "Martin" },
});

const errorCodeOf = (body: unknown): string => (body as { error: { code: string } }).error.code;

describe("PATCH /api/v1/players/:playerId optimistic versioning", () => {
  it("returns the incremented version and rejects a stale second edit", async () => {
    const editor = await createEditor();
    const player = await createPlayer();

    const first = await request(app)
      .patch(`/api/v1/players/${player.id}`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ firstName: "Alexandre", version: player.version });

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ id: player.id, firstName: "Alexandre", version: 1 });

    const stale = await request(app)
      .patch(`/api/v1/players/${player.id}`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ lastName: "Durand", version: player.version });

    expect(stale.status).toBe(409);
    expect(errorCodeOf(stale.body)).toBe("RESOURCE_VERSION_CONFLICT");
    await expect(prisma.player.findUnique({ where: { id: player.id } }))
      .resolves.toMatchObject({ firstName: "Alexandre", lastName: "Martin", version: 1 });
  });
});
