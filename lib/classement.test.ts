import { test } from "node:test";
import assert from "node:assert/strict";
import { trierClassement, supplementLicences } from "./classement.ts";

const l = (club_id: string, points: number, difference: number, buts_pour: number, joues = 3) => ({
  club_id, nom: club_id, sigle: club_id, couleur: "#000", joues, gagnes: 0, nuls: 0, perdus: 0,
  buts_pour, buts_contre: buts_pour - difference, difference, points,
});

test("trie par points, puis différence, puis buts marqués", () => {
  const { triees } = trierClassement([l("A", 4, 1, 3), l("B", 6, 0, 2), l("C", 4, 2, 2), l("D", 4, 1, 5)]);
  assert.deepEqual(triees.map((x) => x.club_id), ["B", "C", "D", "A"]);
});

test("signale une égalité parfaite au lieu de la trancher", () => {
  const { egalites } = trierClassement([l("A", 4, 1, 3), l("B", 4, 1, 3), l("C", 1, -2, 1)]);
  assert.deepEqual([...egalites].sort(), ["A", "B"]);
});

test("pas d'égalité signalée avant le premier match", () => {
  const { egalites } = trierClassement([l("A", 0, 0, 0, 0), l("B", 0, 0, 0, 0)]);
  assert.equal(egalites.size, 0);
});

test("12 licences : 10 incluses et 2 payantes au tarif T", () => {
  assert.deepEqual(supplementLicences(12, 2000), { incluses: 10, payantes: 2, montant: 4000 });
});

test("aucun montant tant que le tarif n'est pas fixé", () => {
  assert.equal(supplementLicences(11, null).montant, null);
  assert.equal(supplementLicences(10, 2000).montant, 0);
});
