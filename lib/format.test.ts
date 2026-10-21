import { test } from "node:test";
import assert from "node:assert/strict";
import { sigleDe, whatsAppNumero } from "./format.ts";

test("sigle tiré des initiales, sans accents", () => {
  assert.equal(sigleDe("Étoiles de Lobia"), "EDL");
  assert.equal(sigleDe("Orly Football Club Daloa Est"), "OFCD");
});

test("sigle d'un nom en un seul mot", () => {
  assert.equal(sigleDe("Tazibouo"), "TAZ");
  assert.equal(sigleDe("A"), "AX");
});

test("lien WhatsApp avec l'indicatif ivoirien", () => {
  assert.equal(whatsAppNumero("07 00 00 00 00"), "https://wa.me/2250700000000");
  assert.equal(whatsAppNumero("+225 07 00 00 00 00"), "https://wa.me/2250700000000");
});
