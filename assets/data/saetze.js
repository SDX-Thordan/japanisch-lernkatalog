/* Satz-Vorlagen für die dynamische Satzbildung (window.SATZ_TEMPLATES).
   Schlüssel = exakter `pattern`-String aus grammatik.js.
   Aufbau einer Vorlage:
     jp    : Mustersatz; {slot} sind Platzhalter, durch Leerzeichen in Chunks getrennt
             (für die „Wörter ordnen"-Übung), Satzende mit 。
     de    : deutsche Übersetzung; {slot} wird durch die deutsche Bedeutung des Füllers ersetzt
     slots : pro Platzhalter entweder { tag:"…" } (Füller aus VOKABULAR_TAGS) oder
             { fixed:"…", de:"…" } (fest verdrahtet, z. B. das Verb)
     blank : Partikel, die in der Lücken-/MC-Übung abgefragt wird
   Jede Vorlage × viele Füller ⇒ viele konkrete Sätze. Handgeprüft, leicht erweiterbar. */
window.SATZ_TEMPLATES = {
  "N を V": [
    { jp: "{subj} は {obj} を {verb} 。", de: "{subj} isst {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "food" }, verb: { fixed: "たべます", de: "isst" } }, blank: "を" },
    { jp: "{subj} は {obj} を {verb} 。", de: "{subj} trinkt {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "drink" }, verb: { fixed: "のみます", de: "trinkt" } }, blank: "を" },
    { jp: "{subj} は {obj} を {verb} 。", de: "{subj} liest {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "readable" }, verb: { fixed: "よみます", de: "liest" } }, blank: "を" },
  ],
  "[Ort] へ 行きます": [
    { jp: "{subj} は {place} へ {verb} 。", de: "{subj} geht zu: {place}.",
      slots: { subj: { tag: "subj3" }, place: { tag: "place" }, verb: { fixed: "いきます", de: "geht" } }, blank: "へ" },
  ],
  "[Verkehrsmittel] で 行きます": [
    { jp: "{subj} は {trans} で {place} へ いきます 。", de: "{subj} fährt mit {trans} zu: {place}.",
      slots: { subj: { tag: "subj3" }, trans: { tag: "transport" }, place: { tag: "place" } }, blank: "で" },
  ],
  "[Ort] で V": [
    { jp: "{subj} は {place} で {obj} を {verb} 。", de: "{subj} isst {obj} an diesem Ort: {place}.",
      slots: { subj: { tag: "subj3" }, place: { tag: "place" }, obj: { tag: "food" }, verb: { fixed: "たべます", de: "isst" } }, blank: "で" },
  ],
  "N1 は N2 です": [
    { jp: "{subj} は {role} です 。", de: "{subj} ist {role}.",
      slots: { subj: { tag: "subj3" }, role: { tag: "role" } }, blank: "は" },
  ],
  "N も N です": [
    { jp: "{subj} も {role} です 。", de: "{subj} ist auch {role}.",
      slots: { subj: { tag: "subj3" }, role: { tag: "role" } }, blank: "も" },
  ],
  "N が すき／じょうず です": [
    { jp: "{subj} は {obj} が すきです 。", de: "{subj} mag {obj} gern.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "food" } }, blank: "が" },
  ],
  "い-Adj.／な-Adj. ＋ です": [
    { jp: "{place} は {na} です 。", de: "{place} ist {na}.",
      slots: { place: { tag: "place" }, na: { tag: "na_adj" } }, blank: "は" },
  ],
};
