/* Semantische Tags für die Satz-Engine (window.VOKABULAR_TAGS).
   Schlüssel = abgeleitete SRS-ID "v:<kana>|<lesson>" (siehe srs.js · srsId).
   Nur Vokabeln, die in SATZ_TEMPLATES als Slot-Füller gebraucht werden, sind getaggt.
   Tags beschreiben die semantische Rolle (person, food, drink, place, …), damit Slots
   sinnvolle Füller bekommen. Bewusst klein gehalten und leicht erweiterbar. */
window.VOKABULAR_TAGS = {
  /* Personen (Subjekt/Thema). subj3 = 3. Person Singular, damit die deutsche
     Übersetzung („Der Student isst …") in der Verbform stimmt. */
  "v:わたし|1": ["person"],
  "v:あなた|1": ["person"],
  "v:あのひと|1": ["person", "subj3"],
  "v:せんせい|1": ["person", "role", "subj3"],
  "v:がくせい|1": ["person", "role", "subj3"],

  /* Rollen/Berufe (Prädikatsnomen) */
  "v:かいしゃいん|1": ["role"],
  "v:いしゃ|1": ["role"],

  /* Essen (transitives Objekt zu „essen") */
  "v:パン|6": ["food"],
  "v:たまご|6": ["food"],
  "v:さかな|6": ["food"],
  "v:にく|6": ["food"],
  "v:ごはん|6": ["food"],
  "v:やさい|6": ["food"],
  "v:くだもの|6": ["food"],

  /* Getränke (Objekt zu „trinken") */
  "v:みず|6": ["drink"],
  "v:おちゃ|6": ["drink"],
  "v:コーヒー|2": ["drink"],
  "v:ジュース|6": ["drink"],
  "v:ビール|6": ["drink"],
  "v:ぎゅうにゅう|6": ["drink"],
  "v:こうちゃ|6": ["drink"],

  /* Lesbares (Objekt zu „lesen") */
  "v:ほん|2": ["readable"],
  "v:しんぶん|2": ["readable"],
  "v:ざっし|2": ["readable"],

  /* Orte (Ziel/Ort) */
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

  /* Verkehrsmittel (で-Partikel) */
  "v:でんしゃ|5": ["transport"],
  "v:バス|5": ["transport"],
  "v:くるま|8": ["transport"],
  "v:じてんしゃ|5": ["transport"],
  "v:ちかてつ|5": ["transport"],
  "v:タクシー|5": ["transport"],

  /* な-Adjektive (Prädikat „… ist ruhig/berühmt") */
  "v:きれい|8": ["na_adj"],
  "v:しずか|8": ["na_adj"],
  "v:にぎやか|8": ["na_adj"],
  "v:ゆうめい|8": ["na_adj"],
  "v:げんき|8": ["na_adj"],
};
