import { test } from "node:test";
import assert from "node:assert/strict";
import { DOMAINE_IDENTIFIANT, emailDepuisIdentifiant, identifiantAffiche } from "./identifiant.ts";

test("un e-mail reste un e-mail, en minuscules", () => {
  assert.deepEqual(emailDepuisIdentifiant(" Koffi@Mail.CI "), { email: "koffi@mail.ci" });
});

test("un nom d'utilisateur devient une adresse interne, et s'affiche tel quel", () => {
  const r = emailDepuisIdentifiant("Lions.Lobia");
  assert.deepEqual(r, { email: `lions.lobia@${DOMAINE_IDENTIFIANT}` });
  assert.equal(identifiantAffiche((r as { email: string }).email), "lions.lobia");
  assert.equal(identifiantAffiche("koffi@mail.ci"), "koffi@mail.ci");
});

test("nom d'utilisateur trop court, accentué ou avec espace : refusé", () => {
  for (const s of ["ab", "élan", "les lions", "a@b"]) assert.ok("erreur" in emailDepuisIdentifiant(s), s);
});
