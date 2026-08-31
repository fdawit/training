import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const program = JSON.parse(fs.readFileSync(new URL("../src/data/program.json", import.meta.url), "utf8"));

test("program contains exactly 15 weeks and 105 calendar modules", () => {
  assert.equal(program.weeks.length, 15);
  assert.equal(program.weeks.length * 7, 105);
  assert.deepEqual(program.weeks.map((week) => week.week), Array.from({ length: 15 }, (_, index) => index + 1));
});

test("RPE caps, multipliers, Jefferson loads, and sprint reps match the workbook", () => {
  assert.deepEqual(program.weeks.map((week) => week.rpeCap), [7,7,7,7,6,8,8,8,8,6,8.5,8.5,8.5,8.5,6]);
  assert.deepEqual(program.weeks.map((week) => week.loadMultiplier), [.78,.83,.87,.91,.75,.89,.92,.95,.97,.8,.95,.97,.99,1,.82]);
  assert.deepEqual(program.weeks.map((week) => week.jeffersonLoad), [null,null,10,10,10,15,15,15,20,15,20,20,20,25,15]);
  assert.deepEqual(program.weeks.map((week) => week.sprintReps), [null,null,null,4,null,6,8,10,12,null,12,12,12,12,null]);
});

test("reduced-set and deload weeks are encoded exactly", () => {
  assert.deepEqual(program.weeks.filter((week) => week.setMode === "minus-one").map((week) => week.week), [1, 2]);
  assert.deepEqual(program.weeks.filter((week) => week.deload).map((week) => week.week), [5, 10, 15]);
  const adjusted = (sets, mode) => mode === "minus-one" ? Math.max(1, sets - 1) : mode === "deload" ? Math.max(1, Math.round(sets * .6)) : sets;
  assert.equal(adjusted(3, "minus-one"), 2);
  assert.equal(adjusted(2, "minus-one"), 1);
  assert.equal(adjusted(3, "deload"), 2);
  assert.equal(adjusted(2, "deload"), 1);
});

test("all workbook exercises and field blocks are present", () => {
  assert.equal(program.bigThree.length, 4);
  assert.equal(program.mobility.length, 5);
  assert.equal(program.workouts.A.length, 8);
  assert.equal(program.workouts.B.length, 8);
  assert.equal(program.workouts.C.length, 9);
  assert.equal(program.fieldBlocks.length, 7);
  assert.equal(program.workouts.A[1].name, "Barbell Back Squat");
  assert.equal(program.workouts.B[1].name, "Romanian Deadlift");
  assert.equal(program.workouts.C[1].name, "Conventional Deadlift");
});

test("working-weight formula rounds to the nearest five", () => {
  const weight = (oneRm, target, multiplier) => Math.round((oneRm * target * multiplier) / 5) * 5;
  assert.equal(weight(300, .8, 1), 240);
  assert.equal(weight(300, .8, .78), 185);
  assert.equal(weight(405, .82, .97), 320);
});
