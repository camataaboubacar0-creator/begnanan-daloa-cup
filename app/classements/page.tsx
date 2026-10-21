import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { trierClassement } from "@/lib/classement";
import { getClassement } from "@/lib/data";
import type { Club } from "@/lib/types";

export const revalidate = 30;
export const metadata: Metadata = { title: "Classements" };

const POULES = ["A", "B", "C", "D", "E", "F", "G", "H"];

function Tableau() {
  const huitiemes: [string, string][] = [];
  for (let i = 0; i < 8; i += 2) {
    huitiemes.push([`1er ${POULES[i]}`, `2e ${POULES[i + 1]}`], [`1er ${POULES[i + 1]}`, `2e ${POULES[i]}`]);
  }
  const tours: { titre: string; rencontres: [string, string][]; finale?: boolean }[] = [
    { titre: "Huitièmes", rencontres: huitiemes },
    { titre: "Quarts", rencontres: [0, 1, 2, 3].map((i) => [`Vainq. H${i * 2 + 1}`, `Vainq. H${i * 2 + 2}`]) },
    { titre: "Demi-finales", rencontres: [["Vainq. Q1", "Vainq. Q2"], ["Vainq. Q3", "Vainq. Q4"]] },
    { titre: "Finale", rencontres: [["Vainq. D1", "Vainq. D2"]], finale: true },
  ];
  return (
    <div className="bracket">
      {tours.map((t) => (
        <div key={t.titre} className={`round ${t.finale ? "final" : ""}`}>
          <h4>{t.titre}</h4>
          {t.rencontres.map(([a, b]) => (
            <div key={a + b} className="slot">
              <div className="ph"><span>{a}</span><span>–</span></div>
              <div className="ph"><span>{b}</span><span>–</span></div>
            </div>
          ))}
          {t.finale && <div className="trophy">🏆 Vainqueur</div>}
        </div>
      ))}
    </div>
  );
}

export default async function Classements() {
  const lignes = await getClassement();
  const poules = POULES.map((p) => ({ poule: p, ...trierClassement(lignes.filter((l) => l.poule === p)) })).filter((p) => p.triees.length);

  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="head">
            <div>
              <div className="eyebrow">Classements</div>
              <h1 className="h2">Phase de poules</h1>
              <p>
                Calculés automatiquement à partir des seuls résultats validés par le comité. Barème affiché : 3 points la
                victoire, 1 le nul (à confirmer dans le règlement).
              </p>
            </div>
          </div>
          {poules.length ? (
            <div className="grid g2">
              {poules.map(({ poule, triees, egalites }) => (
                <div key={poule}>
                  <h3 style={{ marginBottom: 10 }}>Poule {poule}</h3>
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th><th>Équipe</th>
                          <th className="n">J</th><th className="n">G</th><th className="n">N</th><th className="n">P</th>
                          <th className="n">Diff</th><th className="n">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {triees.map((l, i) => (
                          <tr key={l.club_id} className={i < 2 ? "q" : ""}>
                            <td className="rank">{i + 1}{egalites.has(l.club_id) ? "*" : ""}</td>
                            <td>
                              <div className="trow">
                                <Crest club={{ id: l.club_id, nom: l.nom, sigle: l.sigle, couleur: l.couleur } as Club} />
                                <span className="nm">{l.nom}</span>
                              </div>
                            </td>
                            <td className="n">{l.joues}</td><td className="n">{l.gagnes}</td>
                            <td className="n">{l.nuls}</td><td className="n">{l.perdus}</td>
                            <td className="n">{l.difference > 0 ? "+" : ""}{l.difference}</td>
                            <td className="n pts">{l.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {egalites.size > 0 && <p className="small" style={{ marginTop: 6 }}>* Égalité parfaite : décision du comité attendue.</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="card vide"><h3>Classements à venir</h3><p className="small">Les poules seront affichées après le tirage au sort.</p></div>
          )}
          <p className="small" style={{ marginTop: 12 }}>Liseré vert : places qualificatives (format à confirmer).</p>
        </div>
      </section>
      <section className="band alt">
        <div className="wrap">
          <div className="head">
            <div>
              <div className="eyebrow">Tableau final</div>
              <h2>Route vers le trophée</h2>
              <p>Schéma indicatif, il se remplira une fois le format de la phase finale validé.</p>
            </div>
          </div>
          <div className="tbl-wrap" style={{ padding: 16, border: 0, background: "transparent" }}>
            <Tableau />
          </div>
        </div>
      </section>
    </>
  );
}
