import { randomUUID } from "node:crypto";
import type { PaginatedStaffMembersResponse, StaffMemberDetail } from "@lucarne/shared";
import request from "supertest";
import prisma from "../../../database/prisma";
import app from "../../../src/app";
import { createEditor, createUser } from "../../helpers/auth";
import { describe, expect, it } from "vitest";

const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const createTeam = (isActive = true) => prisma.team.create({ data: { name: `Team ${randomUUID()}`, isActive } });
const createStaffMember = () => prisma.staffMember.create({ data: { firstName: "Camille", lastName: "Durand", nationality: "France" } });

describe("staff member API", () => {
  it("creates an independent staff member and exposes it in the list", async () => {
    const editor = await createEditor();
    const created = await request(app)
      .post("/api/v1/staff-members")
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ firstName: " Camille ", lastName: " Durand ", nationality: " France ", pictureUrl: " https://example.com/camille.png " });
    const createdBody = created.body as StaffMemberDetail;

    expect(created.status).toBe(201);
    expect(createdBody).toMatchObject({ firstName: "Camille", lastName: "Durand", nationality: "France", pictureUrl: "https://example.com/camille.png", activeTeam: null, assignments: [] });
    const listed = await request(app).get("/api/v1/staff-members").set("Authorization", `Bearer ${editor.accessToken}`);
    const listedBody = listed.body as PaginatedStaffMembersResponse;
    expect(listed.status).toBe(200);
    expect(listedBody.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: createdBody.id, activeTeam: null })]));
  });

  it("creates an initial assignment atomically and rejects an inactive team", async () => {
    const [editor, activeTeam, inactiveTeam] = await Promise.all([createEditor(), createTeam(), createTeam(false)]);
    const assigned = await request(app)
      .post("/api/v1/staff-members")
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ firstName: "Camille", lastName: "Durand", nationality: "France", teamId: activeTeam.id, jobTitle: "COACH", joinedAt: "2026-09-14" });
    const rejected = await request(app)
      .post("/api/v1/staff-members")
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ firstName: "Alex", lastName: "Martin", nationality: "France", teamId: inactiveTeam.id, jobTitle: "ASSISTANT", joinedAt: "2026-09-14" });

    expect(assigned.status).toBe(201);
    expect(assigned.body).toMatchObject({ activeTeam: { id: activeTeam.id }, assignments: [{ team: { id: activeTeam.id }, jobTitle: "COACH", state: "CURRENT" }] });
    expect(rejected.status).toBe(409);
    expect(rejected.body).toMatchObject({ error: { code: "TEAM_INACTIVE" } });
    await expect(prisma.staffMember.count({ where: { firstName: "Alex" } })).resolves.toBe(0);
  });

  it("aligns assignment planning and history with players", async () => {
    const [editor, currentTeam, futureTeam, anotherTeam, staffMember] = await Promise.all([createEditor(), createTeam(), createTeam(), createTeam(), createStaffMember()]);
    await prisma.teamStaffMember.create({ data: { staffMemberId: staffMember.id, teamId: currentTeam.id, jobTitle: "COACH", joinedAt: date("2026-01-01") } });
    const planned = await request(app)
      .post(`/api/v1/staff-members/${staffMember.id}/assignments`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ teamId: futureTeam.id, jobTitle: "DIRECTOR", joinedAt: "2099-01-01" });
    const duplicate = await request(app)
      .post(`/api/v1/staff-members/${staffMember.id}/assignments`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ teamId: anotherTeam.id, jobTitle: "COACH", joinedAt: "2099-01-01" });
    const plannedBody = planned.body as StaffMemberDetail;

    expect(planned.status).toBe(201);
    expect(plannedBody).toMatchObject({ activeTeam: { id: currentTeam.id } });
    expect(plannedBody.assignments.some((assignment) => assignment.team.id === currentTeam.id && assignment.leftAt === "2098-12-31" && assignment.state === "CURRENT")).toBe(true);
    expect(plannedBody.assignments.some((assignment) => assignment.team.id === futureTeam.id && assignment.jobTitle === "DIRECTOR" && assignment.state === "PLANNED")).toBe(true);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ error: { code: "ASSIGNMENT_PERIOD_CONFLICT" } });
  });

  it("enforces writer and administrator permissions", async () => {
    const [user, editor, staffMember] = await Promise.all([createUser(), createEditor(), createStaffMember()]);
    const forbidden = await request(app)
      .post(`/api/v1/staff-members/${staffMember.id}/deactivate`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    const deleteForbidden = await request(app)
      .delete(`/api/v1/staff-members/${staffMember.id}`)
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ confirm: true });

    expect(forbidden.status).toBe(403);
    expect(deleteForbidden.status).toBe(403);
  });
});
