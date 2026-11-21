import { describe, expect, it } from "vitest";
import {
  couverture,
  etatSuiviInitial,
  formaterDuree,
  fusionnerSegments,
  horodatage,
  integrerReleve,
  secondesCouvertes,
  segmentsPlausibles,
  seuilAtteint,
  vider,
  type Releve,
} from "./visionnage";

/** Simule une lecture continue de `de` à `a` à la vitesse donnée. */
function lecture(de: number, a: number, vitesse = 1, pasMs = 250, horlogeDepart = 0): Releve[] {
  const releves: Releve[] = [];
  let horloge = horlogeDepart;
  for (let p = de; p <= a + 1e-9; p += (pasMs / 1000) * vitesse) {
    releves.push({ position: p, horloge, vitesse, enLecture: true });
    horloge += pasMs;
  }
  return releves;
}

function suivre(releves: Releve[]) {
  return releves.reduce((e, r) => integrerReleve(e, r), etatSuiviInitial());
}

describe("fusion des segments", () => {
  it("fusionne les chevauchements et les contacts", () => {
    expect(fusionnerSegments([[10, 20], [0, 5], [15, 30], [30.3, 40]])).toEqual([[0, 5], [10, 40]]);
  });
  it("ignore les segments vides ou inversés", () => {
    expect(fusionnerSegments([[5, 5], [8, 3], [NaN, 4]])).toEqual([]);
  });
  it("revoir la même minute ne compte qu'une fois", () => {
    expect(secondesCouvertes([[0, 60], [0, 60], [30, 60]], 600)).toBe(60);
  });
  it("borne à la durée de la vidéo", () => {
    expect(secondesCouvertes([[590, 700]], 600)).toBe(10);
  });
});

describe("seuil", () => {
  it("90 % de 100 s atteint avec 90 s uniques", () => {
    expect(seuilAtteint([[0, 45], [50, 95]], 100)).toBe(true);
    expect(seuilAtteint([[0, 45], [50, 94]], 100)).toBe(false);
  });
  it("couverture nulle pour une durée nulle", () => {
    expect(couverture([[0, 10]], 0)).toBe(0);
  });
});

describe("suivi du lecteur", () => {
  it("une lecture continue produit un seul segment", () => {
    const { segments } = vider(suivre(lecture(0, 30)));
    expect(segments).toHaveLength(1);
    expect(segments[0][0]).toBe(0);
    expect(segments[0][1]).toBeCloseTo(30, 0);
  });

  it("un saut en avant casse le segment et n'est pas compté", () => {
    const avant = lecture(0, 10);
    const apres = lecture(100, 110, 1, 250, avant[avant.length - 1].horloge + 250);
    const etat = suivre([...avant, ...apres]);
    const { segments } = vider(etat);
    expect(secondesCouvertes(segments, 200)).toBeLessThan(21);
    expect(etat.sauts).toBe(1);
  });

  it("une lecture à ×4 ne compte pas (vitesse max ×2)", () => {
    const { segments } = vider(suivre(lecture(0, 60, 4)));
    expect(secondesCouvertes(segments, 100)).toBe(0);
  });

  it("une lecture à ×1,5 compte", () => {
    const { segments } = vider(suivre(lecture(0, 30, 1.5)));
    expect(secondesCouvertes(segments, 100)).toBeGreaterThan(29);
  });

  it("la pause interrompt le segment sans rien perdre", () => {
    const r = lecture(0, 10);
    const pause: Releve = { ...r[r.length - 1], horloge: r[r.length - 1].horloge + 5000, enLecture: false };
    const reprise = lecture(10, 20, 1, 250, pause.horloge + 250);
    const { segments } = vider(suivre([...r, pause, ...reprise]));
    expect(secondesCouvertes(segments, 100)).toBeGreaterThan(19);
  });

  it("vider deux fois ne recompte pas le même segment", () => {
    const etat1 = suivre(lecture(0, 10));
    const v1 = vider(etat1);
    const suite = lecture(10, 20, 1, 250, 10_250).reduce((e, r) => integrerReleve(e, r), v1.etat);
    const v2 = vider(suite);
    const total = secondesCouvertes([...v1.segments, ...v2.segments], 100);
    expect(total).toBeGreaterThan(19);
    expect(total).toBeLessThanOrEqual(20.5);
  });
});

describe("contrôle serveur", () => {
  it("rogne un segment impossible au regard du temps écoulé", () => {
    const retenus = segmentsPlausibles([[0, 7200]], 10, 7200);
    expect(secondesCouvertes(retenus, 7200)).toBeLessThanOrEqual(10 * 2 + 3);
  });
  it("garde un segment plausible", () => {
    expect(segmentsPlausibles([[0, 30]], 31, 600)).toEqual([[0, 30]]);
  });
});

describe("formats", () => {
  it("durées lisibles", () => {
    expect(formaterDuree(3725)).toBe("1 h 02");
    expect(formaterDuree(185)).toBe("3 min");
    expect(horodatage(754)).toBe("12:34");
    expect(horodatage(3725)).toBe("1:02:05");
  });
});
