/* Semantische Tags für die Satz-Engine (window.VOKABULAR_TAGS).
   Schlüssel = abgeleitete SRS-ID "v:<kana>|<lesson>" (siehe srs.js · srsId).
   Tags beschreiben die semantische Rolle (person, food, drink, place, …), damit Slots in
   SATZ_TEMPLATES sinnvolle Füller bekommen.
   Hinweise:
     subj3 = 3. Person Singular (für korrekte deutsche Verbform „Der Student isst …").
     na_place = na-Adjektive, die zu einem Ort passen (für „[Ort] ist … (geworden)").
   Erweiterbar: neue Kategorie anlegen, hier Vokabeln taggen, in saetze.js referenzieren. */
window.VOKABULAR_TAGS = {
  /* ---- Personen / Subjekte ---- */
  "v:わたし|1": ["person"],
  "v:あなた|1": ["person"],
  "v:あのひと|1": ["person", "subj3"],
  "v:せんせい|1": ["person", "role", "subj3"],
  "v:がくせい|1": ["person", "role", "subj3"],
  "v:こども|9": ["person", "subj3"],

  /* ---- Familie (Begleiter mit と) ---- */
  "v:ちち|7": ["person", "family"],
  "v:はは|7": ["person", "family"],
  "v:あに|11": ["person", "family"],
  "v:あね|11": ["person", "family"],
  "v:おとうと|11": ["person", "family"],
  "v:いもうと|11": ["person", "family"],

  /* ---- Rollen/Berufe (Prädikatsnomen) ---- */
  "v:かいしゃいん|1": ["role"],
  "v:いしゃ|1": ["role"],

  /* ---- Essen (Objekt zu „essen") ---- */
  "v:パン|6": ["food"],
  "v:たまご|6": ["food"],
  "v:さかな|6": ["food"],
  "v:にく|6": ["food"],
  "v:ごはん|6": ["food"],
  "v:やさい|6": ["food"],
  "v:くだもの|6": ["food"],

  /* ---- Getränke (Objekt zu „trinken") ---- */
  "v:みず|6": ["drink"],
  "v:おちゃ|6": ["drink"],
  "v:コーヒー|2": ["drink"],
  "v:ジュース|6": ["drink"],
  "v:ビール|6": ["drink"],
  "v:ぎゅうにゅう|6": ["drink"],
  "v:こうちゃ|6": ["drink"],

  /* ---- Lesbares (Objekt zu „lesen") ---- */
  "v:ほん|2": ["readable"],
  "v:しんぶん|2": ["readable"],
  "v:ざっし|2": ["readable"],

  /* ---- Dinge (kaufbar / Objekt zu „haben wollen, kaufen") ---- */
  "v:かばん|2": ["thing"],
  "v:カメラ|2": ["thing"],
  "v:とけい|2": ["thing"],
  "v:くつ|3": ["thing"],
  "v:かさ|2": ["thing"],
  "v:かぎ|2": ["thing"],
  "v:パソコン|7": ["thing"],

  /* ---- Orte (Ziel/Ort) ---- */
  "v:がっこう|5": ["place"],
  "v:えき|5": ["place"],
  "v:だいがく|1": ["place"],
  "v:かいしゃ|3": ["place"],
  "v:びょういん|1": ["place"],
  "v:ぎんこう|4": ["place"],
  "v:デパート|4": ["place"],
  "v:としょかん|4": ["place"],
  "v:こうえん|10": ["place"],
  "v:スーパー|5": ["place"],
  "v:レストラン|6": ["place"],

  /* ---- Verkehrsmittel (で-Partikel) ---- */
  "v:でんしゃ|5": ["transport"],
  "v:バス|5": ["transport"],
  "v:くるま|8": ["transport"],
  "v:じてんしゃ|5": ["transport"],
  "v:ちかてつ|5": ["transport"],
  "v:タクシー|5": ["transport"],

  /* ---- い-Adjektive ---- */
  "v:おおきい|8": ["i_adj"],
  "v:ちいさい|8": ["i_adj"],
  "v:あたらしい|8": ["i_adj"],
  "v:たかい|8": ["i_adj"],
  "v:やすい|8": ["i_adj"],
  "v:おもしろい|8": ["i_adj"],
  "v:おいしい|8": ["i_adj"],
  "v:たのしい|8": ["i_adj"],

  /* ---- な-Adjektive (Prädikat) ---- */
  "v:きれい|8": ["na_adj", "na_place"],
  "v:ゆうめい|8": ["na_adj", "na_place"],
  "v:げんき|8": ["na_adj"],
  "v:しんせつ|8": ["na_adj"],
  "v:ハンサム|8": ["na_adj"],
  "v:すてき|8": ["na_adj"],
  "v:しずか|8": ["na_place"],
  "v:にぎやか|8": ["na_place"],
  "v:べんり|8": ["na_place"],
};
