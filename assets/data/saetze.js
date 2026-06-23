/* Satz-Vorlagen für die dynamische Satzbildung (window.SATZ_TEMPLATES).
   Schlüssel = exakter `pattern`-String aus grammatik.js.
   Aufbau einer Vorlage:
     jp    : Mustersatz; {slot} sind Platzhalter, durch Leerzeichen in Chunks getrennt
             (für die „Wörter ordnen"-Übung), Satzende mit 。
     de    : deutsche Übersetzung; {slot} wird durch die deutsche Bedeutung des Füllers ersetzt
     slots : pro Platzhalter entweder { tag:"…" } (Füller aus VOKABULAR_TAGS) oder
             { fixed:"…", de:"…" } (fest verdrahtet, z. B. das Verb)
     blank : Partikel, die in der Lücken-/MC-Übung abgefragt wird (muss als Token in jp vorkommen)
   Jede Vorlage × viele Füller ⇒ viele konkrete Sätze. Handgeprüft, leicht erweiterbar. */
window.SATZ_TEMPLATES = {
  "N を V": [
    { jp: "{subj} は {obj} を {verb} 。", de: "{subj} isst {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "food" }, verb: { fixed: "たべます", de: "isst" } }, blank: "を" },
    { jp: "{subj} は {obj} を {verb} 。", de: "{subj} trinkt {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "drink" }, verb: { fixed: "のみます", de: "trinkt" } }, blank: "を" },
    { jp: "{subj} は {obj} を {verb} 。", de: "{subj} liest {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "readable" }, verb: { fixed: "よみます", de: "liest" } }, blank: "を" },
    { jp: "{subj} は {obj} を {verb} 。", de: "{subj} kauft {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "thing" }, verb: { fixed: "かいます", de: "kauft" } }, blank: "を" },
  ],

  "[Ort] へ 行きます": [
    { jp: "{subj} は {place} へ {verb} 。", de: "{subj} geht zu: {place}.",
      slots: { subj: { tag: "subj3" }, place: { tag: "place" }, verb: { fixed: "いきます", de: "geht" } }, blank: "へ" },
    { jp: "{subj} は {fam} と {place} へ いきます 。", de: "{subj} geht mit {fam} zu: {place}.",
      slots: { subj: { tag: "subj3" }, fam: { tag: "family" }, place: { tag: "place" } }, blank: "へ" },
  ],

  "[Verkehrsmittel] で 行きます": [
    { jp: "{subj} は {trans} で {place} へ いきます 。", de: "{subj} fährt mit {trans} zu: {place}.",
      slots: { subj: { tag: "subj3" }, trans: { tag: "transport" }, place: { tag: "place" } }, blank: "で" },
  ],

  "[Ort] で V": [
    { jp: "{subj} は {place} で {obj} を {verb} 。", de: "{subj} isst {obj} an diesem Ort: {place}.",
      slots: { subj: { tag: "subj3" }, place: { tag: "place" }, obj: { tag: "food" }, verb: { fixed: "たべます", de: "isst" } }, blank: "で" },
  ],

  "[Person] と V": [
    { jp: "{subj} は {fam} と えいがを みます 。", de: "{subj} sieht mit {fam} einen Film.",
      slots: { subj: { tag: "subj3" }, fam: { tag: "family" } }, blank: "と" },
    { jp: "{subj} は {fam} と レストランへ いきます 。", de: "{subj} geht mit {fam} ins Restaurant.",
      slots: { subj: { tag: "subj3" }, fam: { tag: "family" } }, blank: "と" },
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
    { jp: "{subj} は {obj} が すきです 。", de: "{subj} mag {obj} gern.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "drink" } }, blank: "が" },
  ],

  "N が ほしいです": [
    { jp: "{subj} は {thing} が ほしいです 。", de: "{subj} möchte {thing} haben.",
      slots: { subj: { tag: "subj3" }, thing: { tag: "thing" } }, blank: "が" },
  ],

  "V たいです": [
    { jp: "{subj} は {obj} を たべたいです 。", de: "{subj} möchte {obj} essen.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "food" } }, blank: "を" },
    { jp: "{subj} は {obj} を のみたいです 。", de: "{subj} möchte {obj} trinken.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "drink" } }, blank: "を" },
    { jp: "{subj} は {place} へ いきたいです 。", de: "{subj} möchte zu {place} gehen.",
      slots: { subj: { tag: "subj3" }, place: { tag: "place" } }, blank: "へ" },
  ],

  "V て ください": [
    { jp: "{obj} を たべて ください 。", de: "Iss bitte {obj}.",
      slots: { obj: { tag: "food" } }, blank: "を" },
    { jp: "{obj} を よんで ください 。", de: "Lies bitte {obj}.",
      slots: { obj: { tag: "readable" } }, blank: "を" },
  ],

  "V て います (Verlauf)": [
    { jp: "{subj} は {obj} を のんでいます 。", de: "{subj} trinkt gerade {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "drink" } }, blank: "を" },
    { jp: "{subj} は {obj} を よんでいます 。", de: "{subj} liest gerade {obj}.",
      slots: { subj: { tag: "subj3" }, obj: { tag: "readable" } }, blank: "を" },
  ],

  "N1 は N2 より ～です": [
    { jp: "{a} は {b} より おおきいです 。", de: "{a} ist größer als {b}.",
      slots: { a: { tag: "place" }, b: { tag: "place" } }, blank: "より" },
    { jp: "{a} は {b} より はやいです 。", de: "{a} ist schneller als {b}.",
      slots: { a: { tag: "transport" }, b: { tag: "transport" } }, blank: "より" },
  ],

  "～く／～に なります": [
    { jp: "{place} は {na} に なりました 。", de: "{place} ist {na} geworden.",
      slots: { place: { tag: "place" }, na: { tag: "na_place" } }, blank: "に" },
  ],

  "い-Adj.／な-Adj. ＋ です": [
    { jp: "{place} は {na} です 。", de: "{place} ist {na}.",
      slots: { place: { tag: "place" }, na: { tag: "na_place" } }, blank: "は" },
    { jp: "{thing} は {iadj} です 。", de: "{thing} ist {iadj}.",
      slots: { thing: { tag: "thing" }, iadj: { tag: "i_adj" } }, blank: "は" },
  ],
};
