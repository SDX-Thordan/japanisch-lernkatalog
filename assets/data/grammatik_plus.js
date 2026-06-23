/* Erweiterte Grammatik (window.GRAMMATIK_PLUS).
   Schlüssel = exakter `pattern`-String aus grammatik.js.
   Felder je Eintrag (alle optional):
     erklaerung_lang : ausführliche Erklärung mit Nuancen
     fehler          : Liste häufiger Fehler
     kontrast        : Liste {a, b, note} — Abgrenzung verwandter Formen
     uebungen        : Liste von Übungen
                       { typ:"mc",    frage, optionen:[…], richtig:Index, erkl }
                       { typ:"cloze", satz (mit ＿), luecke:"…", erkl }
   Wird im Katalog additiv unter „Mehr erklären" angezeigt; Übungen laufen über window.Exercises. */
window.GRAMMATIK_PLUS = {
  "N1 は N2 です": {
    erklaerung_lang: "は (geschrieben mit dem Hiragana ха, gesprochen „wa“) markiert das Thema des Satzes — das, worüber gesprochen wird. です ist die höfliche Kopula und steht immer am Satzende. Anders als das deutsche „sein“ wird です nicht an Person oder Zahl angepasst. Die Verneinung lautet じゃありません (umgangssprachlich) bzw. ではありません (förmlich).",
    fehler: [
      "は als Themenpartikel wird „wa“ gesprochen, nicht „ha“.",
      "Kein です vergessen — der höfliche Satz endet darauf.",
      "Verneinung ist nicht „です + ない“, sondern じゃ／ではありません.",
    ],
    kontrast: [
      { a: "は", b: "が", note: "は nennt das (bekannte) Thema, が hebt neue/betonte Information hervor." },
    ],
    uebungen: [
      { typ: "mc", frage: "わたし＿ミラーです。", optionen: ["は", "を", "が", "に"], richtig: 0, erkl: "は markiert das Thema „ich“." },
      { typ: "cloze", satz: "サントスさんは学生じゃ＿。（Verneinung）", luecke: "ありません", erkl: "じゃありません = „ist nicht“." },
    ],
  },

  "～か": {
    erklaerung_lang: "Die Partikel か am Satzende macht aus einer Aussage eine Frage. Die Wortstellung bleibt gleich — es wird nichts umgestellt wie im Deutschen. Im Höflichkeitsstil steht か nach です／ます. Ein Fragezeichen ist im Japanischen nicht nötig (の Punkt 。 genügt).",
    fehler: [
      "Wortstellung NICHT umstellen — nur か anhängen.",
      "Nach です／ます kommt か, nicht „ですか？“ mit zusätzlichem westlichem Fragezeichen.",
    ],
    uebungen: [
      { typ: "mc", frage: "ミラーさんは会社員です＿。", optionen: ["か", "ね", "よ", "の"], richtig: 0, erkl: "か bildet die Ja/Nein-Frage." },
    ],
  },

  "N を V": {
    erklaerung_lang: "を markiert das direkte Objekt — das, worauf sich die Handlung richtet. Es steht direkt vor dem transitiven Verb. を wird wie „o“ gesprochen. Das Verb steht im Japanischen immer am Satzende.",
    fehler: [
      "を nur bei transitiven Verben (essen, trinken, lesen …), nicht bei Bewegungszielen — dort へ／に.",
      "を wird „o“ gesprochen, nicht „wo“.",
    ],
    kontrast: [
      { a: "を", b: "が", note: "を = direktes Objekt; が = Subjekt/neue Information." },
      { a: "を", b: "へ", note: "を = was getan wird; へ = wohin man geht." },
    ],
    uebungen: [
      { typ: "mc", frage: "毎朝コーヒー＿のみます。", optionen: ["を", "は", "で", "へ"], richtig: 0, erkl: "コーヒー ist das Objekt von „trinken“." },
      { typ: "cloze", satz: "本＿よみます。（Objekt-Partikel）", luecke: "を", erkl: "Direktes Objekt → を." },
    ],
  },

  "[Ort] へ 行きます": {
    erklaerung_lang: "へ (als Richtungspartikel gesprochen „e“) markiert das Ziel einer Bewegung. Häufig ist auch に möglich; へ betont stärker die Richtung, に das Ankunftsziel. Verben der Bewegung sind z. B. 行きます (gehen/fahren), 来ます (kommen), 帰ります (zurückkehren).",
    fehler: [
      "へ als Richtungspartikel wird „e“ gesprochen, nicht „he“.",
      "Bei Bewegungszielen kein を verwenden.",
    ],
    kontrast: [
      { a: "へ", b: "に", note: "Beide markieren das Ziel; へ = Richtung, に = Ankunftspunkt. Oft austauschbar." },
    ],
    uebungen: [
      { typ: "mc", frage: "あした東京＿行きます。", optionen: ["へ", "を", "が", "も"], richtig: 0, erkl: "Ziel der Bewegung → へ (oder に)." },
    ],
  },

  "V て-Form": {
    erklaerung_lang: "Die て-Form ist eine Verbindungsform ohne eigene Zeit. Sie reiht Handlungen, bildet Bitten (〜てください), Verlaufsformen (〜ています) u. v. m. Bildung nach Verbgruppe: Gruppe II = ます-Stamm + て; Gruppe III します→して, きます→きて; Gruppe I nach Endung: う・つ・る→って, む・ぶ・ぬ→んで, く→いて, ぐ→いで, す→して. Ausnahme: 行きます→行って.",
    fehler: [
      "Gruppe I: む・ぶ・ぬ werden zu んで (nicht んて).",
      "行きます ist Ausnahme: 行って, nicht 行いて.",
    ],
    uebungen: [
      { typ: "cloze", satz: "のみます → の＿（て-Form）", luecke: "んで", erkl: "む → んで." },
      { typ: "mc", frage: "行きます → ?", optionen: ["行って", "行いて", "行きて", "行んで"], richtig: 0, erkl: "Ausnahme 行く → 行って." },
    ],
  },

  "V ない-Form": {
    erklaerung_lang: "Die ない-Form ist die einfache (Plain-)Verneinung. Gruppe II: ます-Stamm + ない (たべない). Gruppe III: しない, こない. Gruppe I: der i-Laut der ます-Form wird zum a-Laut + ない (かきます→かかない); endet die Wörterbuchform auf 〜う, wird daraus 〜わない (かいます→かわない). Sie ist Basis für 〜なければなりません, 〜ないでください u. a.",
    fehler: [
      "Gruppe I 〜います → 〜わない (nicht 〜あない).",
      "きます (kommen) → こない, nicht きない.",
    ],
    uebungen: [
      { typ: "mc", frage: "かいます → ?", optionen: ["かわない", "かあない", "かない", "かいない"], richtig: 0, erkl: "〜います → 〜わない." },
      { typ: "cloze", satz: "きます → ＿（ない-Form, „nicht kommen“）", luecke: "こない", erkl: "Unregelmäßig: こない." },
    ],
  },

  "V 辞書形 (Wörterbuchform)": {
    erklaerung_lang: "Die Wörterbuchform (辞書形) ist die Grundform, unter der Verben im Wörterbuch stehen. Aus der ます-Form: Gruppe II ます→る (たべます→たべる); Gruppe III します→する, きます→くる; Gruppe I i-Laut → u-Laut (かきます→かく, のみます→のむ). Sie ist Basis für ことができます, 〜まえに, 〜とき u. a.",
    fehler: [
      "Gruppe I: nur den letzten Laut von -i nach -u ändern (き→く, み→む …).",
      "Gruppe II endet immer auf る (たべる, みる).",
    ],
    uebungen: [
      { typ: "mc", frage: "のみます → ?", optionen: ["のむ", "のる", "のみる", "のまる"], richtig: 0, erkl: "み → む (Gruppe I)." },
      { typ: "cloze", satz: "たべます → ＿（Wörterbuchform）", luecke: "たべる", erkl: "Gruppe II: ます→る." },
    ],
  },

  "N が すき／じょうず です": {
    erklaerung_lang: "Bei すき (mögen), きらい (nicht mögen), じょうず (gut können) und へた (schlecht können) steht das Bezugsobjekt mit が, nicht mit を. Das Thema (die Person) steht mit は. Muster: [Person] は [Sache] が すきです.",
    fehler: [
      "Nach すき／じょうず steht が, nicht を.",
      "すき und じょうず sind な-Adjektive: すきです, nicht すきいです.",
    ],
    kontrast: [
      { a: "が", b: "を", note: "Bei Vorlieben/Können steht das Objekt mit が, nicht mit を." },
    ],
    uebungen: [
      { typ: "mc", frage: "わたしは日本語＿すきです。", optionen: ["が", "を", "は", "に"], richtig: 0, erkl: "すき verlangt が." },
    ],
  },
};
