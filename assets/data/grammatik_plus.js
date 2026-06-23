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
      { typ: "cloze", satz: "あなたは学生です＿。（Frage）", luecke: "か", erkl: "Frage → か am Satzende." },
      { typ: "mc", frage: "Was ändert sich bei der Frage gegenüber der Aussage?", optionen: ["nur か anhängen", "Subjekt nach vorn", "Verb nach vorn", "です weglassen"], richtig: 0, erkl: "Wortstellung bleibt; nur か anhängen." },
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
      { typ: "cloze", satz: "うち＿帰ります。（nach Hause）", luecke: "へ", erkl: "Bewegungsziel → へ." },
      { typ: "mc", frage: "へ als Richtungspartikel spricht man …", optionen: ["e", "he", "we", "ye"], richtig: 0, erkl: "へ = „e“." },
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
      { typ: "mc", frage: "ミラーさんはテニス＿じょうずです。", optionen: ["が", "を", "に", "へ"], richtig: 0, erkl: "じょうず verlangt が." },
      { typ: "cloze", satz: "わたしはケーキ＿すきです。（Vorliebe）", luecke: "が", erkl: "Vorlieben/Können → が." },
    ],
  },

  "N も N です": {
    erklaerung_lang: "も ersetzt は (oder が) und bedeutet „auch“. Es signalisiert, dass für das genannte Thema dasselbe gilt wie für etwas zuvor Gesagtes.",
    fehler: ["も ersetzt は — nicht „は も“ zusammen verwenden."],
    kontrast: [{ a: "も", b: "は", note: "は führt ein neues Thema ein; も heißt „auch“ und schließt an Bekanntes an." }],
    uebungen: [
      { typ: "mc", frage: "カリナさんは学生です。ワンさん＿学生です。", optionen: ["も", "は", "が", "を"], richtig: 0, erkl: "„auch“ → も." },
      { typ: "cloze", satz: "わたしも会社員です。— あの人＿会社員です。", luecke: "も", erkl: "„auch“ → も." },
      { typ: "mc", frage: "Was bedeutet も?", optionen: ["auch", "aber", "nur", "und"], richtig: 0, erkl: "も = auch." },
    ],
  },

  "N1 の N2": {
    erklaerung_lang: "の verbindet zwei Nomen: N1 bestimmt N2 näher (Besitz, Zugehörigkeit, Herkunft, Material). N1 の N2 ≈ „N2 von/des N1“. Es kann auch ein Nomen ersetzen (わたしの = „meins“).",
    fehler: ["Reihenfolge: das Bestimmende (N1) steht vorn — わたしの本 = „mein Buch“, nicht 本のわたし."],
    uebungen: [
      { typ: "mc", frage: "これは＿本です。（mein Buch）", optionen: ["わたしの", "わたしは", "わたしが", "わたしも"], richtig: 0, erkl: "Besitz → の." },
      { typ: "cloze", satz: "IMC＿社員です。（Angestellter von IMC）", luecke: "の", erkl: "Zugehörigkeit → の." },
      { typ: "mc", frage: "日本語＿本（ein Japanisch-Buch）", optionen: ["の", "は", "を", "で"], richtig: 0, erkl: "N1 の N2." },
    ],
  },

  "これ／それ／あれ": {
    erklaerung_lang: "Demonstrativpronomen für Dinge: これ = beim Sprecher (hier), それ = beim Hörer (da), あれ = von beiden entfernt (dort drüben). Frage: どれ (welches von dreien?). Sie stehen allein, nicht vor einem Nomen.",
    fehler: ["これ/それ/あれ stehen allein; vor einem Nomen braucht man この/その/あの."],
    kontrast: [{ a: "これ", b: "この", note: "これ steht allein („das hier“); この steht vor einem Nomen (この本 = „dieses Buch“)." }],
    uebungen: [
      { typ: "mc", frage: "（beim Sprecher）＿は本です。", optionen: ["これ", "それ", "あれ", "どれ"], richtig: 0, erkl: "Beim Sprecher → これ." },
      { typ: "mc", frage: "（beim Hörer）＿は何ですか。", optionen: ["それ", "これ", "あれ", "どこ"], richtig: 0, erkl: "Beim Hörer → それ." },
      { typ: "cloze", satz: "（weit von beiden weg）＿は学校です。", luecke: "あれ", erkl: "Entfernt → あれ." },
    ],
  },

  "この／その／あの ＋ N": {
    erklaerung_lang: "この/その/あの stehen direkt vor einem Nomen und richten sich nach der Entfernung wie これ/それ/あれ. Frage: どの N (welches N?).",
    fehler: ["Nach この/その/あの folgt immer ein Nomen — nicht allein verwenden."],
    kontrast: [{ a: "この N", b: "これ", note: "この braucht ein Nomen (この人); これ steht allein." }],
    uebungen: [
      { typ: "mc", frage: "＿本はわたしのです。（dieses Buch hier）", optionen: ["この", "これ", "ここ", "こちら"], richtig: 0, erkl: "Vor Nomen → この." },
      { typ: "cloze", satz: "＿人はだれですか。（jene Person dort）", luecke: "あの", erkl: "Entfernt + Nomen → あの." },
      { typ: "mc", frage: "＿N = „welches N?“", optionen: ["どの", "どれ", "どこ", "だれ"], richtig: 0, erkl: "どの + Nomen." },
    ],
  },

  "そうです／そうじゃありません": {
    erklaerung_lang: "Antwort auf eine Nomen-Frage: はい、そうです bestätigt („ja, genau“). Verneinung: いいえ、そうじゃ(では)ありません. Nur bei Nomen-Sätzen (N です), nicht bei Verben oder Adjektiven.",
    fehler: ["そうです nur bei Nomen-Fragen; bei Verben/Adjektiven antwortet man mit dem Verb/Adjektiv."],
    uebungen: [
      { typ: "mc", frage: "それは本ですか。— はい、＿。", optionen: ["そうです", "そうします", "あります", "います"], richtig: 0, erkl: "Bestätigung → そうです." },
      { typ: "cloze", satz: "いいえ、そう＿ありません。（Verneinung）", luecke: "じゃ", erkl: "そうじゃありません." },
      { typ: "mc", frage: "Bei welchem Satztyp passt そうです?", optionen: ["N です", "V ます", "い-Adjektiv", "Bewegung"], richtig: 0, erkl: "Nur bei Nomen-Sätzen." },
    ],
  },

  "ここ／そこ／あそこ": {
    erklaerung_lang: "Ortsdemonstrativa: ここ = hier (beim Sprecher), そこ = da (beim Hörer), あそこ = dort drüben. Höflicher und zugleich Richtungsangabe: こちら/そちら/あちら. Frage: どこ (wo?) / どちら (höflich).",
    fehler: ["どこ fragt nach dem Ort; どちら ist die höfliche Variante (auch „welche Richtung/welches von zweien“)."],
    uebungen: [
      { typ: "mc", frage: "トイレは＿ですか。（wo?）", optionen: ["どこ", "どれ", "どの", "だれ"], richtig: 0, erkl: "Ort fragen → どこ." },
      { typ: "cloze", satz: "エレベーターは＿です。（dort drüben）", luecke: "あそこ", erkl: "Entfernt → あそこ." },
      { typ: "mc", frage: "höfliche Form von どこ:", optionen: ["どちら", "どれ", "どの", "どう"], richtig: 0, erkl: "どちら ist höflicher." },
    ],
  },

  "N は [Ort] です": {
    erklaerung_lang: "Gibt an, wo sich eine Sache oder Person befindet: N は + Ortsangabe + です. Für „Woher kommen Sie?“ dient おくにはどちらですか.",
    uebungen: [
      { typ: "mc", frage: "ミラーさんは＿です。（im Büro）", optionen: ["事務所", "行きます", "そうです", "します"], richtig: 0, erkl: "Ortsangabe + です." },
      { typ: "cloze", satz: "受付は2＿です。（zweite Etage）", luecke: "かい", erkl: "2かい = 2. Etage." },
      { typ: "mc", frage: "おくには＿ですか。（Woher kommen Sie?）", optionen: ["どちら", "どこ", "なに", "だれ"], richtig: 0, erkl: "Höflich → どちら." },
    ],
  },

  "今 ～時～分です": {
    erklaerung_lang: "Uhrzeit: 今 [Zahl]時[Zahl]分です. Sonderlesungen: 4時=よじ, 7時=しちじ, 9時=くじ; 1分=いっぷん, 3分=さんぷん. Frage: 今何時ですか。",
    fehler: ["4時 = „yoji“ (nicht „shiji“); 9時 = „kuji“.", "～分 wechselt zwischen ふん/ぷん (z. B. いっぷん, さんぷん)."],
    uebungen: [
      { typ: "mc", frage: "4時 liest man …", optionen: ["よじ", "しじ", "よんじ", "しちじ"], richtig: 0, erkl: "4時 = よじ." },
      { typ: "cloze", satz: "今何＿ですか。（Wie spät ist es?）", luecke: "時", erkl: "何時 = wie viel Uhr." },
      { typ: "mc", frage: "9時 liest man …", optionen: ["くじ", "きゅうじ", "ここのじ", "なじ"], richtig: 0, erkl: "9時 = くじ." },
    ],
  },

  "V ます／ました": {
    erklaerung_lang: "Die höfliche Verbform: Gegenwart/Zukunft bejaht ～ます, verneint ～ません; Vergangenheit bejaht ～ました, verneint ～ませんでした. Der ます-Stamm ist die Basis vieler weiterer Formen.",
    fehler: ["Verneinte Vergangenheit: ～ませんでした (nicht „～ましたじゃない“)."],
    kontrast: [{ a: "～ます", b: "～ました", note: "～ます = Gegenwart/Zukunft; ～ました = Vergangenheit." }],
    uebungen: [
      { typ: "mc", frage: "„ich habe gegessen“ (höflich):", optionen: ["たべました", "たべます", "たべません", "たべましょう"], richtig: 0, erkl: "Vergangenheit → ました." },
      { typ: "cloze", satz: "きのうは行き＿でした。（bin nicht gegangen）", luecke: "ません", erkl: "ませんでした = verneinte Vergangenheit." },
      { typ: "mc", frage: "„ich trinke nicht“ (höflich):", optionen: ["のみません", "のみます", "のみました", "のみましょう"], richtig: 0, erkl: "Verneinung → ません." },
    ],
  },

  "[Zeit] に V": {
    erklaerung_lang: "に markiert einen konkreten Zeitpunkt (Uhr, Wochentag, Datum): 7時に、月曜日に. Bei relativen Zeitangaben (きょう, あした, まいにち) und Tageszeiten ohne feste Zahl steht KEIN に.",
    fehler: ["Kein に bei きょう/あした/まいあさ/今.", "Wochentag + に ist möglich, aber oft weggelassen."],
    kontrast: [{ a: "7時に", b: "きょう", note: "Feste Uhrzeit/Datum → に; relative Zeit (きょう, あした) → ohne に." }],
    uebungen: [
      { typ: "mc", frage: "7時＿おきます。（um 7 Uhr）", optionen: ["に", "で", "を", "へ"], richtig: 0, erkl: "Zeitpunkt → に." },
      { typ: "mc", frage: "Wobei steht KEIN に?", optionen: ["あした", "7時", "月曜日", "9時半"], richtig: 0, erkl: "Relative Zeit → ohne に." },
      { typ: "cloze", satz: "日曜日＿どこも行きません。（am Sonntag）", luecke: "に", erkl: "Wochentag + に." },
    ],
  },

  "～から ～まで": {
    erklaerung_lang: "から = von/ab (Anfang), まで = bis (Ende). Für Zeit und Ort: 9時から5時まで、東京から大阪まで. から allein nennt nur den Anfang, まで allein nur das Ende.",
    uebungen: [
      { typ: "mc", frage: "9時＿5時まで（von 9 …）", optionen: ["から", "まで", "に", "で"], richtig: 0, erkl: "Anfang → から." },
      { typ: "cloze", satz: "うちから駅＿あるきます。（bis zum Bahnhof）", luecke: "まで", erkl: "Ende → まで." },
      { typ: "mc", frage: "„bis“ heißt …", optionen: ["まで", "から", "より", "ごろ"], richtig: 0, erkl: "まで = bis." },
    ],
  },

  "～ね／～よ": {
    erklaerung_lang: "Satzendpartikeln: ね sucht Zustimmung/Bestätigung („…, nicht wahr?“), よ teilt dem Hörer eine neue, betonte Information mit („ich sag dir …“).",
    fehler: ["よ nicht überstrapazieren — es betont/informiert und kann sonst aufdringlich wirken."],
    kontrast: [{ a: "ね", b: "よ", note: "ね = Zustimmung suchen; よ = neue Information geben/betonen." }],
    uebungen: [
      { typ: "mc", frage: "いいお天気です＿。（…, nicht wahr?）", optionen: ["ね", "よ", "か", "の"], richtig: 0, erkl: "Zustimmung → ね." },
      { typ: "mc", frage: "この電車は東京へ行きます＿。（Info: ich sag dir）", optionen: ["よ", "ね", "か", "の"], richtig: 0, erkl: "Neue Info → よ." },
      { typ: "cloze", satz: "そのケーキ、おいしいです＿。（Zustimmung erwartet）", luecke: "ね", erkl: "ね sucht Zustimmung." },
    ],
  },

  "[Zeitdauer] V （ohne に）": {
    erklaerung_lang: "Eine Zeitdauer (wie lange) steht OHNE Partikel direkt vor dem Verb: 2時間べんきょうします (zwei Stunden lernen). Unterscheide sie vom Zeitpunkt (mit に).",
    fehler: ["Dauer bekommt kein に: „2時間に“ ist falsch — richtig „2時間べんきょうします“."],
    kontrast: [{ a: "2時間 V", b: "2時に V", note: "Dauer (wie lange) → ohne に; Zeitpunkt (wann) → mit に." }],
    uebungen: [
      { typ: "mc", frage: "毎日2時間＿べんきょうします。（Dauer）", optionen: ["（nichts）", "に", "で", "を"], richtig: 0, erkl: "Dauer ohne Partikel." },
      { typ: "mc", frage: "Was braucht に?", optionen: ["7時 (Zeitpunkt)", "2時間 (Dauer)", "3週間 (Dauer)", "1年 (Dauer)"], richtig: 0, erkl: "Nur der Zeitpunkt." },
      { typ: "cloze", satz: "きのう3時間ねました。— „3時間“ ist eine ＿.（Begriff）", luecke: "Dauer", erkl: "Zeitdauer → ohne に." },
    ],
  },

  "[Verkehrsmittel] で 行きます": {
    erklaerung_lang: "で markiert das Verkehrsmittel/Beförderungsmittel: でんしゃで行きます (mit dem Zug fahren). „Zu Fuß“ ist die Ausnahme: あるいて行きます (kein で).",
    fehler: ["„Zu Fuß“ heißt あるいて — kein で."],
    uebungen: [
      { typ: "mc", frage: "タクシー＿行きます。（mit dem Taxi）", optionen: ["で", "に", "へ", "を"], richtig: 0, erkl: "Verkehrsmittel → で." },
      { typ: "cloze", satz: "ひこうき＿日本へ行きます。（mit dem Flugzeug）", luecke: "で", erkl: "Verkehrsmittel → で." },
      { typ: "mc", frage: "„zu Fuß gehen“:", optionen: ["あるいて行きます", "あしで行きます", "あるくで行きます", "あるきで行きます"], richtig: 0, erkl: "Ausnahme: あるいて." },
    ],
  },

  "[Person] と V": {
    erklaerung_lang: "と verbindet die Person, mit der man etwas tut: ともだちと行きます (mit Freunden gehen). „Allein“ ist ひとりで.",
    kontrast: [{ a: "と", b: "で", note: "[Person] と = zusammen mit jemandem; ひとりで = allein." }],
    uebungen: [
      { typ: "mc", frage: "かぞく＿レストランへ行きます。（mit der Familie）", optionen: ["と", "に", "で", "が"], richtig: 0, erkl: "mit Person → と." },
      { typ: "mc", frage: "„allein“ heißt …", optionen: ["ひとりで", "ひとりと", "ひとりに", "ひとりを"], richtig: 0, erkl: "allein → ひとりで." },
      { typ: "cloze", satz: "ミラーさん＿テニスをします。（mit Herrn Müller）", luecke: "と", erkl: "mit Person → と." },
    ],
  },

  "～ませんか／～ましょう": {
    erklaerung_lang: "～ませんか lädt höflich ein („Wollen wir nicht …?“). ～ましょう schlägt vor („Lass uns …“). ～ましょうか bietet Hilfe an oder fragt nach einem gemeinsamen Vorschlag.",
    kontrast: [{ a: "～ませんか", b: "～ましょう", note: "ませんか = Einladung/Frage; ましょう = (bereits einiger) Vorschlag „lass uns“." }],
    uebungen: [
      { typ: "mc", frage: "いっしょにえいがを見＿か。（Einladung）", optionen: ["ません", "ましょう", "ました", "ます"], richtig: 0, erkl: "Einladung → ～ませんか." },
      { typ: "mc", frage: "„Lass uns gehen!“:", optionen: ["行きましょう", "行きませんか", "行きます", "行きました"], richtig: 0, erkl: "Vorschlag → ～ましょう." },
      { typ: "cloze", satz: "つかれましたね。少しやすみ＿。（lass uns ausruhen）", luecke: "ましょう", erkl: "Vorschlag → ましょう." },
    ],
  },

  "[Ort] で V": {
    erklaerung_lang: "で markiert den Ort, AN DEM eine Handlung stattfindet: としょかんで本をよみます. Davon zu unterscheiden ist に (Existenzort/Ziel).",
    kontrast: [{ a: "で", b: "に", note: "で = Ort der Handlung (etwas TUN); に = Existenzort (sein/da) oder Ziel." }],
    uebungen: [
      { typ: "mc", frage: "レストラン＿ばんごはんをたべます。（Handlungsort）", optionen: ["で", "に", "へ", "を"], richtig: 0, erkl: "Handlung am Ort → で." },
      { typ: "cloze", satz: "うち＿べんきょうします。（zu Hause lernen）", luecke: "で", erkl: "Handlungsort → で." },
      { typ: "mc", frage: "Wo steht で?", optionen: ["本をよむ場所", "いる場所", "ある場所", "行く目的地"], richtig: 0, erkl: "Handlungsort → で." },
    ],
  },

  "いっしょに V": {
    erklaerung_lang: "いっしょに = „zusammen, gemeinsam“. Oft mit [Person]と kombiniert: ともだちといっしょに行きます.",
    uebungen: [
      { typ: "mc", frage: "Was bedeutet いっしょに?", optionen: ["zusammen", "allein", "oft", "bald"], richtig: 0, erkl: "いっしょに = gemeinsam." },
      { typ: "cloze", satz: "ともだちと＿に行きます。（zusammen）", luecke: "いっしょ", erkl: "いっしょに = zusammen." },
      { typ: "mc", frage: "„Lass uns zusammen essen.“:", optionen: ["いっしょにたべましょう", "ひとりでたべましょう", "いっしょにたべません", "いっしょをたべます"], richtig: 0, erkl: "いっしょに + ましょう." },
    ],
  },

  "[Werkzeug] で V": {
    erklaerung_lang: "で markiert auch Werkzeug, Mittel oder Sprache: はしでたべます (mit Stäbchen essen), 日本語ではなします (auf Japanisch sprechen).",
    kontrast: [{ a: "で (Werkzeug)", b: "で (Ort)", note: "Dieselbe Partikel で — der Kontext entscheidet: Mittel/Werkzeug vs. Handlungsort." }],
    uebungen: [
      { typ: "mc", frage: "はし＿たべます。（mit Stäbchen）", optionen: ["で", "を", "に", "へ"], richtig: 0, erkl: "Werkzeug → で." },
      { typ: "cloze", satz: "日本語＿手紙を書きます。（auf Japanisch）", luecke: "で", erkl: "Sprache/Mittel → で." },
      { typ: "mc", frage: "„mit dem Bleistift schreiben“:", optionen: ["えんぴつで書きます", "えんぴつを書きます", "えんぴつに書きます", "えんぴつへ書きます"], richtig: 0, erkl: "Werkzeug → で." },
    ],
  },

  "N に あげます／もらいます": {
    erklaerung_lang: "あげます = (jemandem) geben — der Empfänger steht mit に. もらいます = (von jemandem) bekommen — der Geber steht mit に oder から. くれます = (mir/uns) geben.",
    fehler: ["Bei もらいます steht der Geber mit に/から, nicht mit が."],
    kontrast: [{ a: "あげます", b: "もらいます", note: "あげます = ich gebe (Empfänger に); もらいます = ich bekomme (Geber に/から)." }],
    uebungen: [
      { typ: "mc", frage: "ともだち＿はなをあげます。（dem Freund geben）", optionen: ["に", "が", "を", "へ"], richtig: 0, erkl: "Empfänger → に." },
      { typ: "cloze", satz: "わたしは母＿プレゼントをもらいました。（von der Mutter）", luecke: "に", erkl: "Geber → に/から." },
      { typ: "mc", frage: "„(mir) geben“ heißt …", optionen: ["くれます", "あげます", "もらいます", "もちます"], richtig: 0, erkl: "An mich → くれます." },
    ],
  },

  "もう V ました ／ まだです": {
    erklaerung_lang: "もう = „schon“ (mit ～ました). まだ = „noch nicht“ — Antwort: いいえ、まだです bzw. まだ ～ていません.",
    kontrast: [{ a: "もう", b: "まだ", note: "もう ～ました = schon getan; まだです / まだ ～ていません = noch nicht." }],
    uebungen: [
      { typ: "mc", frage: "＿ひるごはんをたべましたか。（schon?）", optionen: ["もう", "まだ", "また", "もっと"], richtig: 0, erkl: "„schon“ → もう." },
      { typ: "mc", frage: "いいえ、＿です。（noch nicht）", optionen: ["まだ", "もう", "また", "もっと"], richtig: 0, erkl: "„noch nicht“ → まだ." },
      { typ: "cloze", satz: "＿しゅくだいをしていません。（noch nicht）", luecke: "まだ", erkl: "noch nicht → まだ." },
    ],
  },

  "い-Adj.／な-Adj. ＋ です": {
    erklaerung_lang: "い-Adjektive enden auf い (たかい) und werden als Prädikat ～いです. な-Adjektive (きれい, しずか) stehen als Prädikat einfach mit です. Verneinung: い-Adj. ～くないです; な-Adj. ～じゃ／ではありません. いい ist unregelmäßig (Verneinung よくないです).",
    fehler: ["い-Adjektiv-Verneinung: ～くないです (たかくないです), NICHT „たかいじゃない“.", "いい → よくない (unregelmäßig)."],
    kontrast: [{ a: "い-Adj.", b: "な-Adj.", note: "い-Adj. endet auf い und flektiert (たかくない); な-Adj. verhält sich wie ein Nomen (しずかじゃない)." }],
    uebungen: [
      { typ: "mc", frage: "このカメラは＿。（ist teuer）", optionen: ["たかいです", "たかいだ", "たかな", "たかくです"], richtig: 0, erkl: "い-Adj. + です." },
      { typ: "mc", frage: "Verneinung von „たかいです“:", optionen: ["たかくないです", "たかいじゃないです", "たかくです", "たかいくないです"], richtig: 0, erkl: "い-Adj.: ～くないです." },
      { typ: "cloze", satz: "この町はしずか＿ありません。（な-Adj. verneint）", luecke: "じゃ", erkl: "な-Adj.: じゃありません." },
    ],
  },

  "Adjektiv ＋ N": {
    erklaerung_lang: "Vor einem Nomen steht das い-Adjektiv direkt (あたらしいくるま), das な-Adjektiv mit な (しずかなまち).",
    fehler: ["な-Adjektiv braucht な vor dem Nomen: しずかなへや (nicht „しずかへや“)."],
    uebungen: [
      { typ: "mc", frage: "„ein ruhiges Zimmer“:", optionen: ["しずかなへや", "しずかへや", "しずくなへや", "しずかいへや"], richtig: 0, erkl: "な-Adj. + な + N." },
      { typ: "mc", frage: "„ein neues Auto“:", optionen: ["あたらしいくるま", "あたらしなくるま", "あたらしくるま", "あたらしいなくるま"], richtig: 0, erkl: "い-Adj. direkt + N." },
      { typ: "cloze", satz: "きれい＿はな（schöne Blume）", luecke: "な", erkl: "な-Adj. + な + N." },
    ],
  },

  "とても／あまり ＋ Adj.": {
    erklaerung_lang: "とても = „sehr“ (mit bejahtem Adjektiv). あまり = „nicht besonders“ und verlangt eine Verneinung.",
    fehler: ["あまり steht immer mit verneintem Adjektiv/Verb: あまり高くないです."],
    kontrast: [{ a: "とても", b: "あまり", note: "とても + bejaht (sehr); あまり + verneint (nicht besonders)." }],
    uebungen: [
      { typ: "mc", frage: "＿たかくないです。（nicht besonders teuer）", optionen: ["あまり", "とても", "よく", "もっと"], richtig: 0, erkl: "あまり + Verneinung." },
      { typ: "mc", frage: "＿きれいです。（sehr schön）", optionen: ["とても", "あまり", "まだ", "もう"], richtig: 0, erkl: "とても + bejaht." },
      { typ: "cloze", satz: "この本は＿おもしろくないです。（nicht besonders）", luecke: "あまり", erkl: "あまり + Verneinung." },
    ],
  },

  "N1 は どんな N2 ですか": {
    erklaerung_lang: "どんな + Nomen fragt nach Eigenschaften: „Was für ein …?“ Die Antwort enthält ein Adjektiv (きれいな町です).",
    uebungen: [
      { typ: "mc", frage: "京都は＿町ですか。（was für ein …?）", optionen: ["どんな", "どの", "どれ", "どこ"], richtig: 0, erkl: "Eigenschaft fragen → どんな." },
      { typ: "cloze", satz: "ミラーさんは＿人ですか。（was für ein Mensch）", luecke: "どんな", erkl: "どんな + Nomen." },
      { typ: "mc", frage: "Antwort auf „どんな町ですか“:", optionen: ["きれいな町です", "あそこです", "三つです", "そうです"], richtig: 0, erkl: "Mit Adjektiv antworten." },
    ],
  },

  "～から (Grund)": {
    erklaerung_lang: "から nach einem (höflichen oder einfachen) Satz bedeutet „weil/denn“: Grund + から、Folge. Die Frage nach dem Grund ist どうして.",
    kontrast: [{ a: "から (Grund)", b: "から (von)", note: "Nach einem Satz = „weil“; nach einem Nomen/Zeit/Ort = „von/ab“." }],
    uebungen: [
      { typ: "mc", frage: "さむいです＿、行きません。（weil）", optionen: ["から", "まで", "より", "が"], richtig: 0, erkl: "Grund → から." },
      { typ: "cloze", satz: "どうして来ませんか。— じかんがない＿です。（weil）", luecke: "から", erkl: "Grund → から." },
      { typ: "mc", frage: "どうして fragt nach …", optionen: ["dem Grund", "dem Ort", "der Zeit", "der Menge"], richtig: 0, erkl: "どうして = warum." },
    ],
  },

  "N が わかります／あります": {
    erklaerung_lang: "わかります (verstehen) und あります (haben/es gibt) verlangen das Bezugsobjekt mit が, nicht mit を.",
    fehler: ["Nach わかります/あります steht が, nicht を."],
    uebungen: [
      { typ: "mc", frage: "日本語＿わかります。（verstehen）", optionen: ["が", "を", "は", "に"], richtig: 0, erkl: "わかります verlangt が." },
      { typ: "cloze", satz: "わたしは車＿あります。（habe ein Auto）", luecke: "が", erkl: "あります verlangt が." },
      { typ: "mc", frage: "Was bedeutet わかります?", optionen: ["verstehen", "sprechen", "hören", "sehen"], richtig: 0, erkl: "わかります = verstehen." },
    ],
  },

  "あります／います": {
    erklaerung_lang: "Existenz: あります für Unbelebtes (Dinge, Pflanzen), います für Belebtes (Menschen, Tiere). „Es gibt …“ / „… ist da“.",
    fehler: ["Menschen/Tiere → います; Dinge/Pflanzen → あります."],
    kontrast: [{ a: "あります", b: "います", note: "あります = unbelebt; います = belebt (Menschen/Tiere)." }],
    uebungen: [
      { typ: "mc", frage: "つくえの上に本が＿。（Buch）", optionen: ["あります", "います", "です", "します"], richtig: 0, erkl: "Unbelebt → あります." },
      { typ: "mc", frage: "きょうしつに学生が＿。（Studenten）", optionen: ["います", "あります", "です", "します"], richtig: 0, erkl: "Belebt → います." },
      { typ: "cloze", satz: "にわに犬が＿。（Hund）", luecke: "います", erkl: "Tier → います." },
    ],
  },

  "[Ort] に N が あります": {
    erklaerung_lang: "Der Existenzort steht mit に, das Existierende mit が: つくえの上に本があります.",
    kontrast: [{ a: "に (Existenz)", b: "で (Handlung)", note: "に = wo etwas IST; で = wo etwas getan wird." }],
    uebungen: [
      { typ: "mc", frage: "テーブルの上＿りんごがあります。（Ort）", optionen: ["に", "で", "へ", "を"], richtig: 0, erkl: "Existenzort → に." },
      { typ: "cloze", satz: "へや＿テレビがあります。（im Zimmer）", luecke: "に", erkl: "Existenzort → に." },
      { typ: "mc", frage: "Richtige Reihenfolge:", optionen: ["Ort に N が あります", "N に Ort が あります", "Ort で N を あります", "N を Ort に あります"], richtig: 0, erkl: "Ort に N が あります." },
    ],
  },

  "Zahl ＋ Zählwort": {
    erklaerung_lang: "Mengen mit Zähleinheiten: allgemein ひとつ…とお; Personen ～人 (ひとり, ふたり, さんにん…); flache Dinge ～まい; lange Dinge ～本; kleine Dinge ～こ. Das Zählwort steht meist ohne Partikel direkt vor dem Verb.",
    fehler: ["1人 = ひとり, 2人 = ふたり (unregelmäßig)."],
    uebungen: [
      { typ: "mc", frage: "りんごを＿ください。（3 Stück, allgemein）", optionen: ["みっつ", "さんつ", "みつ", "さんまい"], richtig: 0, erkl: "3 (allgemein) → みっつ." },
      { typ: "mc", frage: "学生が＿います。（2 Personen）", optionen: ["ふたり", "にひと", "にじん", "ふたつ"], richtig: 0, erkl: "2 Personen → ふたり." },
      { typ: "cloze", satz: "きってを5＿ください。（5 flache Dinge）", luecke: "まい", erkl: "Flach → ～まい." },
    ],
  },

  "[Dauer／Preis] かかります": {
    erklaerung_lang: "かかります drückt aus, wie viel Zeit oder Geld etwas in Anspruch nimmt: 30分かかります、2000円かかります.",
    uebungen: [
      { typ: "mc", frage: "駅まで20分＿。（dauert）", optionen: ["かかります", "あります", "います", "します"], richtig: 0, erkl: "Zeit/Geld → かかります." },
      { typ: "cloze", satz: "タクシーは2000円＿。（kostet）", luecke: "かかります", erkl: "Preis → かかります." },
      { typ: "mc", frage: "かかります benutzt man für …", optionen: ["Zeit/Geld", "Ort", "Person", "Essen"], richtig: 0, erkl: "Dauer und Preis." },
    ],
  },

  "[Zeitraum] に Zahl回 V": {
    erklaerung_lang: "Häufigkeit: [Zeitraum]に [Zahl]回 — z. B. 1週間に2回 (zweimal pro Woche). に folgt dem Zeitraum.",
    uebungen: [
      { typ: "mc", frage: "1週間＿2回テニスをします。（pro Woche）", optionen: ["に", "で", "へ", "を"], richtig: 0, erkl: "Zeitraum + に." },
      { typ: "cloze", satz: "1か月＿1回りょこうします。（einmal pro Monat）", luecke: "に", erkl: "Zeitraum + に." },
      { typ: "mc", frage: "„dreimal“ heißt …", optionen: ["3回", "3本", "3まい", "3つ"], richtig: 0, erkl: "回 = Mal." },
    ],
  },

  "N／Adj. — Vergangenheit": {
    erklaerung_lang: "Vergangenheit von Nomen/な-Adjektiv: ～でした / ～じゃありませんでした. い-Adjektiv: ～かったです / ～くなかったです. いい ist unregelmäßig: よかったです.",
    fehler: ["い-Adjektiv-Vergangenheit: たかかったです (NICHT „たかいでした“).", "いい → よかった."],
    uebungen: [
      { typ: "mc", frage: "„war teuer“ (い-Adj.):", optionen: ["たかかったです", "たかいでした", "たかでした", "たかくでした"], richtig: 0, erkl: "い-Adj.: ～かったです." },
      { typ: "mc", frage: "„war Student“ (Nomen):", optionen: ["学生でした", "学生かったです", "学生いでした", "学生です"], richtig: 0, erkl: "Nomen: ～でした." },
      { typ: "cloze", satz: "きのうは天気がよ＿です。（war gut, いい→）", luecke: "かった", erkl: "いい → よかった." },
    ],
  },

  "N1 は N2 より ～です": {
    erklaerung_lang: "Vergleich: N1 は N2 より [Adjektiv]です — „N1 ist [Adj]er als N2“. より = „als“.",
    kontrast: [{ a: "より", b: "のほうが", note: "A は B より … (A ist …er als B); A のほうが B より … betont A („A ist eher …“)." }],
    uebungen: [
      { typ: "mc", frage: "東京は大阪＿大きいです。（als Osaka）", optionen: ["より", "から", "まで", "と"], richtig: 0, erkl: "Vergleich → より." },
      { typ: "cloze", satz: "ひこうきは電車＿はやいです。（als der Zug）", luecke: "より", erkl: "Vergleich → より." },
      { typ: "mc", frage: "より bedeutet …", optionen: ["als", "bis", "von", "auch"], richtig: 0, erkl: "より = als." },
    ],
  },

  "～の中で ～が いちばん ～": {
    erklaerung_lang: "Superlativ: [Gruppe]の中で [X]が いちばん [Adjektiv]です — „von allen … ist X am …“. いちばん = „am meisten / Nummer 1“.",
    uebungen: [
      { typ: "mc", frage: "くだもの＿中でなにがいちばんすきですか。", optionen: ["の", "に", "で", "が"], richtig: 0, erkl: "～の中で." },
      { typ: "cloze", satz: "1年でなつ＿いちばんあついです。（der Sommer）", luecke: "が", erkl: "Das Spitzenelement → が." },
      { typ: "mc", frage: "いちばん bedeutet …", optionen: ["am meisten", "ein wenig", "auch", "nicht"], richtig: 0, erkl: "いちばん = Nr. 1." },
    ],
  },

  "N が ほしいです": {
    erklaerung_lang: "ほしい (い-Adjektiv) = „(etwas) haben wollen“. Das Gewünschte steht mit が. Für Handlungen nutzt man ～たい.",
    fehler: ["ほしい für DINGE; für HANDLUNGEN → ～たい.", "Das Gewünschte steht mit が, nicht を."],
    uebungen: [
      { typ: "mc", frage: "わたしは新しいくつ＿ほしいです。", optionen: ["が", "を", "に", "へ"], richtig: 0, erkl: "Gewünschtes → が." },
      { typ: "cloze", satz: "なに＿ほしいですか。（was möchten Sie）", luecke: "が", erkl: "ほしい verlangt が." },
      { typ: "mc", frage: "„etwas TUN wollen“ nutzt …", optionen: ["～たい", "ほしい", "すき", "あります"], richtig: 0, erkl: "Handlung → ～たい." },
    ],
  },

  "V たいです": {
    erklaerung_lang: "～たい (am ます-Stamm) = „etwas tun wollen“. たい ist ein い-Adjektiv (Verneinung ～たくないです). Das Objekt kann が oder を nehmen.",
    fehler: ["～たい flektiert wie ein い-Adjektiv: のみたくないです (nicht „のみたいじゃない“)."],
    uebungen: [
      { typ: "mc", frage: "日本へ行き＿です。（will gehen）", optionen: ["たい", "たく", "たくて", "たいだ"], richtig: 0, erkl: "ます-Stamm + たい." },
      { typ: "cloze", satz: "なにを食べ＿ですか。（möchten essen）", luecke: "たい", erkl: "ます-Stamm + たい." },
      { typ: "mc", frage: "„nicht trinken wollen“:", optionen: ["のみたくないです", "のみたいじゃない", "のまたいです", "のみたいないです"], richtig: 0, erkl: "～たくないです." },
    ],
  },

  "[Ort] へ V(ます-Stamm)に 行きます": {
    erklaerung_lang: "Zweck einer Bewegung: ます-Stamm + に + 行きます/来ます/帰ります — „gehen, um zu …“ (映画を見に行きます).",
    fehler: ["Vor に steht der ます-Stamm (見に), nicht die Wörterbuchform."],
    uebungen: [
      { typ: "mc", frage: "デパートへかばんを買い＿行きます。（um zu kaufen）", optionen: ["に", "で", "へ", "を"], richtig: 0, erkl: "Zweck → ます-Stamm + に." },
      { typ: "cloze", satz: "レストランへ昼ごはんを食べ＿行きます。", luecke: "に", erkl: "Zweck → ます-Stamm + に." },
      { typ: "mc", frage: "Vor に steht …", optionen: ["der ます-Stamm", "die Wörterbuchform", "die て-Form", "die ない-Form"], richtig: 0, erkl: "ます-Stamm + に." },
    ],
  },

  "V て ください": {
    erklaerung_lang: "～てください (von der て-Form) ist die höfliche Bitte/Aufforderung: „Bitte tun Sie …“.",
    uebungen: [
      { typ: "mc", frage: "ここに名前を書い＿ください。", optionen: ["て", "た", "ない", "ます"], richtig: 0, erkl: "て-Form + ください." },
      { typ: "cloze", satz: "ちょっとまっ＿ください。（warten Sie）", luecke: "て", erkl: "まつ → まって." },
      { typ: "mc", frage: "„Bitte hören Sie“:", optionen: ["聞いてください", "聞きてください", "聞くください", "聞いたください"], richtig: 0, erkl: "聞く → 聞いて." },
    ],
  },

  "V て います (Verlauf)": {
    erklaerung_lang: "～ています an der て-Form drückt eine gerade ablaufende Handlung aus: 今、本を読んでいます (lese gerade).",
    kontrast: [{ a: "ています (Verlauf)", b: "ています (Zustand)", note: "Verlauf: gerade dabei; Zustand: dauerhaft (住んでいます, 知っています)." }],
    uebungen: [
      { typ: "mc", frage: "今、ごはんを食べ＿います。（gerade）", optionen: ["て", "た", "ない", "ます"], richtig: 0, erkl: "て-Form + います." },
      { typ: "cloze", satz: "父は今しんぶんを読＿います。（liest gerade, よむ→）", luecke: "んで", erkl: "よむ → よんで." },
      { typ: "mc", frage: "„Was machst du gerade?“ → 何をし＿いますか。", optionen: ["て", "た", "ない", "ましょう"], richtig: 0, erkl: "Verlauf → て + います." },
    ],
  },

  "V ましょうか": {
    erklaerung_lang: "～ましょうか bietet Hilfe an („Soll ich …?“) oder schlägt etwas gemeinsam vor.",
    uebungen: [
      { typ: "mc", frage: "にもつを持ち＿。（Soll ich tragen?）", optionen: ["ましょうか", "ませんか", "ました", "たいです"], richtig: 0, erkl: "Hilfe anbieten → ましょうか." },
      { typ: "cloze", satz: "あついですね。まどをあけ＿。（Soll ich öffnen?）", luecke: "ましょうか", erkl: "～ましょうか." },
      { typ: "mc", frage: "～ましょうか bedeutet …", optionen: ["Hilfe anbieten", "verbieten", "fragen ob erlaubt", "Vergangenheit"], richtig: 0, erkl: "Angebot/Vorschlag." },
    ],
  },

  "V ても いいです": {
    erklaerung_lang: "～てもいいです (von der て-Form) drückt eine Erlaubnis aus: „du darfst …“. Frage: ～てもいいですか.",
    kontrast: [{ a: "てもいいです", b: "てはいけません", note: "てもいいです = Erlaubnis; てはいけません = Verbot." }],
    uebungen: [
      { typ: "mc", frage: "ここでしゃしんをとっ＿いいですか。", optionen: ["ても", "ては", "ないで", "たら"], richtig: 0, erkl: "Erlaubnis → てもいい." },
      { typ: "cloze", satz: "えんぴつで書い＿いいです。（darf）", luecke: "ても", erkl: "Erlaubnis → てもいい." },
      { typ: "mc", frage: "～てもいいです bedeutet …", optionen: ["Erlaubnis", "Verbot", "Pflicht", "Wunsch"], richtig: 0, erkl: "Erlaubnis." },
    ],
  },

  "V ては いけません": {
    erklaerung_lang: "～てはいけません (von der て-Form) ist ein Verbot: „du darfst nicht …“.",
    kontrast: [{ a: "てはいけません", b: "なくてもいいです", note: "てはいけません = darf nicht; なくてもいいです = muss nicht." }],
    uebungen: [
      { typ: "mc", frage: "ここでたばこをすっ＿いけません。", optionen: ["ては", "ても", "ないで", "たら"], richtig: 0, erkl: "Verbot → てはいけません." },
      { typ: "cloze", satz: "ここに入っ＿いけません。（darf nicht）", luecke: "ては", erkl: "Verbot → てはいけません." },
      { typ: "mc", frage: "～てはいけません bedeutet …", optionen: ["Verbot", "Erlaubnis", "Wunsch", "Vorschlag"], richtig: 0, erkl: "Verbot." },
    ],
  },

  "V ています (Zustand)": {
    erklaerung_lang: "～ています beschreibt auch einen dauerhaften Zustand, eine Gewohnheit oder den Beruf: 大阪に住んでいます、結婚しています、知っています、銀行ではたらいています.",
    fehler: ["„kennen/wissen“ = 知っています; die Verneinung ist 知りません (nicht „知っていません“)."],
    uebungen: [
      { typ: "mc", frage: "わたしは大阪に住ん＿います。（wohne）", optionen: ["で", "て", "た", "ない"], richtig: 0, erkl: "すむ → すんで." },
      { typ: "cloze", satz: "兄は銀行ではたらい＿います。（arbeitet）", luecke: "て", erkl: "Zustand → て + います." },
      { typ: "mc", frage: "„kennen/wissen“:", optionen: ["知っています", "知ています", "知ります", "知ってます"], richtig: 0, erkl: "Zustand → 知っています." },
    ],
  },

  "V1 て、V2 / V1 てから V2": {
    erklaerung_lang: "Die て-Form reiht Handlungen in zeitlicher Folge: あさ起きて、ごはんを食べます. ～てから betont „erst nachdem …, dann …“.",
    uebungen: [
      { typ: "mc", frage: "あさ起き＿、かおをあらいます。", optionen: ["て", "た", "ない", "ます"], richtig: 0, erkl: "Reihung → て-Form." },
      { typ: "cloze", satz: "ばんごはんを食べ＿から、テレビを見ます。（nachdem）", luecke: "て", erkl: "～てから." },
      { typ: "mc", frage: "„nachdem“ betont …", optionen: ["てから", "ても", "ては", "たり"], richtig: 0, erkl: "てから = nachdem." },
    ],
  },

  "い-Adj.くて／な-Adj.で (Reihung)": {
    erklaerung_lang: "Eigenschaften verbinden: い-Adjektiv → ～くて (やすくて), な-Adjektiv/Nomen → ～で (しずかで). いい → よくて.",
    fehler: ["い-Adjektiv: ～くて (おおきくて); な-Adjektiv/Nomen: ～で (べんりで)."],
    uebungen: [
      { typ: "mc", frage: "このへやはひろ＿、きれいです。（い-Adj.: groß und …）", optionen: ["くて", "いで", "くで", "いて"], richtig: 0, erkl: "い-Adj. → ～くて." },
      { typ: "cloze", satz: "この町はしずか＿、いいです。（な-Adj.）", luecke: "で", erkl: "な-Adj. → ～で." },
      { typ: "mc", frage: "„billig und gut“:", optionen: ["やすくていいです", "やすいでいいです", "やすくでいいです", "やすいくていいです"], richtig: 0, erkl: "やすい → やすくて." },
    ],
  },

  "どうやって": {
    erklaerung_lang: "どうやって fragt nach der Methode/dem Weg: „Wie / auf welche Weise?“ Die Antwort beschreibt den Vorgang (oft mit て-Form gereiht).",
    uebungen: [
      { typ: "mc", frage: "駅まで＿行きますか。（wie?）", optionen: ["どうやって", "どこ", "いつ", "だれ"], richtig: 0, erkl: "Methode → どうやって." },
      { typ: "cloze", satz: "このりょうりは＿作りますか。（wie macht man）", luecke: "どうやって", erkl: "どうやって = wie." },
      { typ: "mc", frage: "どうやって fragt nach …", optionen: ["der Methode", "dem Grund", "dem Ort", "der Zeit"], richtig: 0, erkl: "Methode/Weg." },
    ],
  },

  "どの N／どれ が いちばん ～": {
    erklaerung_lang: "Auswahl aus drei oder mehr: どれが／どの N が いちばん [Adjektiv]ですか. Bei zwei Dingen nimmt man どちら.",
    kontrast: [{ a: "どれ (3+)", b: "どちら (2)", note: "どれ/どの N bei drei oder mehr; どちら bei genau zwei." }],
    uebungen: [
      { typ: "mc", frage: "3つの中で＿がいちばんいいですか。", optionen: ["どれ", "どちら", "どんな", "なに"], richtig: 0, erkl: "3+ → どれ." },
      { typ: "cloze", satz: "＿スポーツがいちばんすきですか。（welcher von vielen）", luecke: "どの", erkl: "どの + Nomen." },
      { typ: "mc", frage: "Bei genau ZWEI Dingen fragt man …", optionen: ["どちら", "どれ", "どの", "どんな"], richtig: 0, erkl: "2 → どちら." },
    ],
  },

  "V ないで ください": {
    erklaerung_lang: "～ないでください (von der ない-Form) ist die höfliche Bitte, etwas NICHT zu tun.",
    uebungen: [
      { typ: "mc", frage: "ここで写真をとら＿ください。（bitte nicht）", optionen: ["ないで", "ないと", "なくて", "なく"], richtig: 0, erkl: "Bitte nicht → ないでください." },
      { typ: "cloze", satz: "しんぱいし＿ください。（machen Sie sich keine Sorgen）", luecke: "ないで", erkl: "～ないでください." },
      { typ: "mc", frage: "„Bitte nicht rauchen“:", optionen: ["たばこをすわないでください", "たばこをすいないでください", "たばこをすわなくてください", "たばこをすわなくでください"], richtig: 0, erkl: "すう → すわない." },
    ],
  },

  "V なければ なりません": {
    erklaerung_lang: "～なければなりません (von der ない-Form: ～ない → ～なければ) = „müssen / notwendig sein“.",
    fehler: ["Von der ない-Form: 飲まない → 飲まなければなりません."],
    kontrast: [{ a: "なければなりません", b: "なくてもいいです", note: "müssen ↔ nicht müssen." }],
    uebungen: [
      { typ: "mc", frage: "くすりを飲ま＿なりません。（muss）", optionen: ["なければ", "なくては", "ないで", "なくても"], richtig: 0, erkl: "müssen → なければなりません." },
      { typ: "cloze", satz: "あした早く起き＿なりません。（muss aufstehen）", luecke: "なければ", erkl: "～なければなりません." },
      { typ: "mc", frage: "～なければなりません bedeutet …", optionen: ["müssen", "dürfen", "nicht müssen", "wollen"], richtig: 0, erkl: "Notwendigkeit." },
    ],
  },

  "V なくても いいです": {
    erklaerung_lang: "～なくてもいいです (von der ない-Form) = „nicht tun müssen“.",
    uebungen: [
      { typ: "mc", frage: "あした来＿いいです。（musst nicht kommen）", optionen: ["なくても", "なければ", "ないで", "ても"], richtig: 0, erkl: "nicht müssen → なくてもいい." },
      { typ: "cloze", satz: "お金をはらわ＿いいです。（müssen nicht zahlen）", luecke: "なくても", erkl: "～なくてもいいです." },
      { typ: "mc", frage: "～なくてもいいです bedeutet …", optionen: ["nicht müssen", "müssen", "nicht dürfen", "dürfen"], richtig: 0, erkl: "keine Pflicht." },
    ],
  },

  "V (辞書形) ことが できます": {
    erklaerung_lang: "Wörterbuchform + ことができます drückt Fähigkeit/Möglichkeit aus: „können / möglich sein“.",
    fehler: ["Vor ことができます steht die WÖRTERBUCHFORM, nicht die ます-Form."],
    uebungen: [
      { typ: "mc", frage: "わたしは日本語を話す＿ができます。", optionen: ["こと", "もの", "の", "ところ"], richtig: 0, erkl: "～ことができます." },
      { typ: "cloze", satz: "ピアノをひく＿ができます。（kann spielen）", luecke: "こと", erkl: "～ことができます." },
      { typ: "mc", frage: "Vor ことができます steht …", optionen: ["die Wörterbuchform", "die ます-Form", "die て-Form", "die ない-Form"], richtig: 0, erkl: "Wörterbuchform." },
    ],
  },

  "趣味は V(辞書形)ことです": {
    erklaerung_lang: "Hobby ausdrücken: 趣味は [Wörterbuchform]ことです — „Mein Hobby ist, … zu …“.",
    uebungen: [
      { typ: "mc", frage: "わたしの趣味は音楽を聞く＿です。", optionen: ["こと", "もの", "の", "ところ"], richtig: 0, erkl: "～ことです." },
      { typ: "cloze", satz: "趣味は写真をとる＿です。", luecke: "こと", erkl: "Wörterbuchform + ことです." },
      { typ: "mc", frage: "Was steht vor こと?", optionen: ["Wörterbuchform", "ます-Form", "て-Form", "Nomen"], richtig: 0, erkl: "Wörterbuchform." },
    ],
  },

  "V(辞書形)／Nの／Zahl ＋ まえに": {
    erklaerung_lang: "まえに = „vor / bevor“: [Wörterbuchform]まえに (寝るまえに), [Nomen]のまえに (食事のまえに), [Zeit]まえに (3年まえに).",
    fehler: ["Verb: Wörterbuchform + まえに. Nomen: Nomen + の + まえに."],
    uebungen: [
      { typ: "mc", frage: "寝る＿に歯をみがきます。（vor dem Schlafen）", optionen: ["まえ", "あと", "とき", "ながら"], richtig: 0, erkl: "vor → まえに." },
      { typ: "cloze", satz: "食事＿まえに手をあらいます。（Nomen + ? + まえに）", luecke: "の", erkl: "Nomen + の + まえに." },
      { typ: "mc", frage: "„vor 3 Jahren“:", optionen: ["3年まえに", "3年のまえに", "3年まえで", "3年あとに"], richtig: 0, erkl: "Zahl + まえに." },
    ],
  },

  "V た-Form": {
    erklaerung_lang: "Die た-Form ist die einfache Vergangenheit. Sie wird wie die て-Form gebildet, nur mit た／だ statt て／で: かいて→かいた, よんで→よんだ. Gruppe II: ます-Stamm + た (たべた); Gruppe III: した, きた. Sie ist Basis für ～たことがあります, ～たり, ～たら.",
    fehler: ["む・ぶ・ぬ → んだ (よんだ, あそんだ, しんだ).", "行く ist Ausnahme: 行った."],
    uebungen: [
      { typ: "mc", frage: "のみます → ?（た-Form）", optionen: ["のんだ", "のみた", "のった", "のんで"], richtig: 0, erkl: "む → んだ." },
      { typ: "mc", frage: "行きます → ?（た-Form）", optionen: ["行った", "行いた", "行きた", "行んだ"], richtig: 0, erkl: "Ausnahme 行く → 行った." },
      { typ: "cloze", satz: "たべます → ＿（た-Form）", luecke: "たべた", erkl: "Gruppe II: ます-Stamm + た." },
    ],
  },

  "V た ことが あります": {
    erklaerung_lang: "～たことがあります (た-Form + ことがあります) = „schon einmal getan haben“ (Erfahrung).",
    kontrast: [{ a: "たことがあります", b: "ています", note: "たことがあります = Erfahrung (schon mal); ています = Verlauf/Zustand." }],
    uebungen: [
      { typ: "mc", frage: "日本へ行っ＿ことがあります。", optionen: ["た", "て", "ない", "る"], richtig: 0, erkl: "た-Form + ことがあります." },
      { typ: "cloze", satz: "すしを食べた＿があります。（Erfahrung）", luecke: "こと", erkl: "～たことがあります." },
      { typ: "mc", frage: "～たことがあります drückt aus …", optionen: ["Erfahrung", "Pflicht", "Verlauf", "Wunsch"], richtig: 0, erkl: "schon einmal getan." },
    ],
  },

  "V たり、V たり します": {
    erklaerung_lang: "～たり、～たりします (た-Form + り) zählt beispielhaft mehrere Tätigkeiten auf (nicht abschließend, ohne feste Reihenfolge).",
    uebungen: [
      { typ: "mc", frage: "日曜日は本を読ん＿、音楽を聞いたりします。", optionen: ["だり", "たり", "たら", "ても"], richtig: 0, erkl: "読む → 読んだり." },
      { typ: "cloze", satz: "公園で走っ＿、あそんだりします。", luecke: "たり", erkl: "た-Form + り." },
      { typ: "mc", frage: "～たり～たり drückt aus …", optionen: ["Aufzählung von Beispielen", "feste Reihenfolge", "Verbot", "Pflicht"], richtig: 0, erkl: "beispielhafte Aufzählung." },
    ],
  },

  "～く／～に なります": {
    erklaerung_lang: "なります = „werden“ (Zustandsänderung): い-Adjektiv → ～く なります (おおきくなります), な-Adjektiv/Nomen → ～に なります (きれいになります、25さいになります).",
    fehler: ["い-Adjektiv: ～く なります (さむくなる); な-Adj./Nomen: ～に なります (べんりになる)."],
    kontrast: [{ a: "くなります", b: "になります", note: "い-Adjektiv → く; な-Adjektiv/Nomen → に." }],
    uebungen: [
      { typ: "mc", frage: "さむ＿なりました。（い-Adj.: kalt geworden）", optionen: ["く", "に", "で", "と"], richtig: 0, erkl: "い-Adj. → く." },
      { typ: "cloze", satz: "日本語が上手＿なりました。（な-Adj.）", luecke: "に", erkl: "な-Adj. → に." },
      { typ: "mc", frage: "„es wird warm“ (あたたかい):", optionen: ["あたたかくなります", "あたたかになります", "あたたかいになります", "あたたかくになります"], richtig: 0, erkl: "い-Adj. → く + なります." },
    ],
  },

  "普通形 (Plain-/Umgangsform)": {
    erklaerung_lang: "Das 普通形 (Plain-Form) ist die einfache Form: ～ます ↔ Wörterbuchform, ～ません ↔ ～ない, ～ました ↔ ～た. Nomen/な-Adjektiv: ～です → ～だ. い-Adjektiv bleibt (たかい). Wird unter Vertrauten und in Tagebüchern/Notizen genutzt.",
    fehler: ["Nomen plain: 学生だ (nicht „学生です“); im Casual oft nur 学生."],
    kontrast: [{ a: "丁寧形 (です/ます)", b: "普通形 (plain)", note: "ます-Form höflich (Fremde); plain (普通形) unter Freunden/Familie." }],
    uebungen: [
      { typ: "mc", frage: "行きます → 普通形?", optionen: ["行く", "行き", "行った", "行って"], richtig: 0, erkl: "ます → Wörterbuchform." },
      { typ: "mc", frage: "学生です → 普通形?", optionen: ["学生だ", "学生", "学生である", "学生です"], richtig: 0, erkl: "です → だ." },
      { typ: "cloze", satz: "たべません → ＿（普通形, „esse nicht“）", luecke: "たべない", erkl: "ません → ない." },
    ],
  },

  "くだけた会話 (Casual)": {
    erklaerung_lang: "Im lockeren Gespräch (くだけた会話) fällt die Höflichkeit weg: Fragen ohne か (nur Intonation), Nomen-Frage oft ohne だ, ～ている → ～てる. Nur unter engen Freunden/Familie passend.",
    fehler: ["Casual nur unter Vertrauten — gegenüber Fremden/Vorgesetzten bleibt die ます/です-Form."],
    uebungen: [
      { typ: "mc", frage: "höflich „行きますか“ → casual?", optionen: ["行く？", "行くか？", "行きますか", "行ったか"], richtig: 0, erkl: "Casual: nur Intonation, kein か." },
      { typ: "mc", frage: "„元気ですか“ → casual?", optionen: ["元気？", "元気だか", "元気ますか", "元気でしたか"], richtig: 0, erkl: "Nomen/な-Adj.-Frage ohne だ." },
      { typ: "cloze", satz: "„そうですね“ → casual: ＿だね。", luecke: "そう", erkl: "そうだね." },
    ],
  },

  "普通形 ＋ と思います": {
    erklaerung_lang: "～と思います = „ich denke/glaube, dass …“. Vor と steht die Plain-Form (普通形).",
    fehler: ["Vor と思います steht die Plain-Form: 来ると思います (nicht „来ますと思います“)."],
    uebungen: [
      { typ: "mc", frage: "あした雨が降る＿思います。", optionen: ["と", "って", "に", "を"], richtig: 0, erkl: "～と思います." },
      { typ: "cloze", satz: "ミラーさんは来ない＿思います。（denke, kommt nicht）", luecke: "と", erkl: "Plain-Form + と思います." },
      { typ: "mc", frage: "Vor と思います steht …", optionen: ["die Plain-Form", "die ます-Form", "die て-Form", "ein Nomen allein"], richtig: 0, erkl: "普通形 + と思います." },
    ],
  },

  "普通形 ＋ と言いました": {
    erklaerung_lang: "～と言いました = „hat gesagt, dass …“ (Zitat). Vor と steht die Plain-Form; ein wörtliches Zitat steht in 「 」.",
    uebungen: [
      { typ: "mc", frage: "田中さんはあした休む＿言いました。", optionen: ["と", "って", "を", "に"], richtig: 0, erkl: "～と言いました." },
      { typ: "cloze", satz: "「行きます」＿言いました。（wörtliches Zitat）", luecke: "と", erkl: "Zitat + と言いました." },
      { typ: "mc", frage: "～と言いました drückt aus …", optionen: ["ein Zitat", "eine Vermutung", "einen Wunsch", "eine Pflicht"], richtig: 0, erkl: "Wiedergabe einer Aussage." },
    ],
  },

  "～でしょう？": {
    erklaerung_lang: "～でしょう？ mit steigender Intonation sucht Zustimmung/Bestätigung zu einer Vermutung: „… oder?/nicht wahr?“. Ohne Intonation drückt でしょう eine Vermutung aus.",
    uebungen: [
      { typ: "mc", frage: "あした晴れる＿。（wohl, oder?）", optionen: ["でしょう", "ましょう", "ですか", "ません"], richtig: 0, erkl: "Vermutung/Rückfrage → でしょう." },
      { typ: "cloze", satz: "この問題はむずかしい＿？（schwer, oder?）", luecke: "でしょう", erkl: "～でしょう？." },
      { typ: "mc", frage: "～でしょう？ bedeutet …", optionen: ["Vermutung/Rückfrage", "Befehl", "Erlaubnis", "Verbot"], richtig: 0, erkl: "„… oder?“." },
    ],
  },

  "[Satz im 普通形] ＋ N": {
    erklaerung_lang: "Nomen-Modifikation (Relativsatz): ein Satz in der Plain-Form steht DIREKT vor dem Nomen, das er näher bestimmt: わたしが作った料理 (das Essen, das ich gekocht habe).",
    fehler: ["Das Verb im Relativsatz steht in der Plain-Form, nicht in ～ます."],
    uebungen: [
      { typ: "mc", frage: "きのう買っ＿本（das Buch, das ich gestern kaufte）", optionen: ["た", "て", "る", "ます"], richtig: 0, erkl: "た-Form modifiziert das Nomen." },
      { typ: "cloze", satz: "ミラーさんが住ん＿いる町（die Stadt, wo er wohnt）", luecke: "で", erkl: "住んでいる + 町." },
      { typ: "mc", frage: "Im Relativsatz steht das Verb in der …", optionen: ["Plain-Form", "ます-Form", "て-Form", "Wunschform"], richtig: 0, erkl: "普通形 + Nomen." },
    ],
  },

  "V(辞書形) 時間／約束 が あります": {
    erklaerung_lang: "Wörterbuchform + Nomen wie 時間 (Zeit), 約束 (Verabredung), 用事 (etwas zu erledigen): 食事をする時間がありません — „keine Zeit zum Essen“.",
    uebungen: [
      { typ: "mc", frage: "ごはんを食べる＿がありません。（keine Zeit）", optionen: ["時間", "こと", "もの", "の"], richtig: 0, erkl: "Wörterbuchform + 時間." },
      { typ: "cloze", satz: "友だちに会う約束＿あります。（Verabredung）", luecke: "が", erkl: "約束 + が + あります." },
      { typ: "mc", frage: "Vor 時間／約束 steht …", optionen: ["die Wörterbuchform", "die た-Form", "die て-Form", "die ます-Form"], richtig: 0, erkl: "Wörterbuchform." },
    ],
  },

  "～とき、～": {
    erklaerung_lang: "～とき = „wenn/als“ (Zeitpunkt). Davor: Wörterbuchform (gleichzeitig/zukünftig), た-Form (danach/vergangen), Nomen + の, Adjektiv. 子どものとき = „als Kind“.",
    fehler: ["Nomen + の + とき (子どものとき), nicht „子どもとき“."],
    uebungen: [
      { typ: "mc", frage: "日本へ行く＿、カメラを買います。（wenn ich gehe）", optionen: ["とき", "まえ", "あと", "ながら"], richtig: 0, erkl: "Zeitpunkt → とき." },
      { typ: "cloze", satz: "子ども＿とき、よく遊びました。（als Kind: Nomen + ?）", luecke: "の", erkl: "Nomen + の + とき." },
      { typ: "mc", frage: "„als ich jung war“:", optionen: ["若いとき", "若いのとき", "若なとき", "若くとき"], richtig: 0, erkl: "い-Adjektiv direkt + とき." },
    ],
  },

  "V(辞書形) と、～": {
    erklaerung_lang: "Wörterbuchform + と drückt eine automatische/natürliche Folge aus: „immer wenn …, dann (zwangsläufig) …“ (このボタンをおすと、ドアがあきます).",
    kontrast: [{ a: "と (automatisch)", b: "たら (Bedingung)", note: "と = unweigerliche Folge/Naturgesetz; たら = einmalige Bedingung „wenn/falls“." }],
    uebungen: [
      { typ: "mc", frage: "このボタンをおす＿、ドアがあきます。", optionen: ["と", "たら", "ば", "なら"], richtig: 0, erkl: "automatische Folge → と." },
      { typ: "cloze", satz: "春になる＿、さくらがさきます。（wenn Frühling wird）", luecke: "と", erkl: "Wörterbuchform + と." },
      { typ: "mc", frage: "～と (Wörterbuchform + と) drückt aus …", optionen: ["automatische Folge", "einen Wunsch", "Vergangenheit", "ein Verbot"], richtig: 0, erkl: "„immer wenn …, dann …“." },
    ],
  },

  "V て あげます／くれます／もらいます": {
    erklaerung_lang: "Gefälligkeiten mit der て-Form: ～てあげます (ich tue etwas für jemanden), ～てくれます (jemand tut etwas für mich/uns), ～てもらいます (ich lasse/bitte jemanden etwas für mich tun).",
    fehler: ["～てくれます: der Nutznießer bin ich/mein Kreis.", "～てもらいます: der Geber der Handlung steht mit に."],
    kontrast: [{ a: "てくれます", b: "てもらいます", note: "てくれます: andere tun (von sich aus) für mich; てもらいます: ich erhalte die Handlung (oft auf Bitte)." }],
    uebungen: [
      { typ: "mc", frage: "友だちが手伝っ＿くれました。（für mich）", optionen: ["て", "た", "ない", "で"], richtig: 0, erkl: "て-Form + くれます." },
      { typ: "cloze", satz: "わたしは妹に本を読ん＿あげました。（für sie, よむ→）", luecke: "で", erkl: "よむ → よんで + あげます." },
      { typ: "mc", frage: "„jemand tut etwas für MICH“:", optionen: ["～てくれます", "～てあげます", "～てもらいます", "～ています"], richtig: 0, erkl: "für mich → てくれます." },
    ],
  },

  "～たら、～": {
    erklaerung_lang: "～たら (た-Form + ら) = „wenn/falls …, (dann) …“ (einmalige Bedingung): 雨が降ったら、行きません. Auch bei Adjektiven/Nomen: 安かったら, ひまだったら.",
    kontrast: [{ a: "たら", b: "と", note: "たら = einmalige Bedingung „wenn/falls“; と = automatische, immer geltende Folge." }],
    uebungen: [
      { typ: "mc", frage: "雨が降っ＿、行きません。（wenn es regnet）", optionen: ["たら", "たり", "ても", "から"], richtig: 0, erkl: "Bedingung → たら." },
      { typ: "cloze", satz: "お金があっ＿、車を買います。（wenn ich Geld habe）", luecke: "たら", erkl: "た-Form + ら." },
      { typ: "mc", frage: "～たら wird gebildet aus …", optionen: ["た-Form + ら", "ます-Stamm + ら", "Wörterbuchform + ら", "ない + ら"], richtig: 0, erkl: "た-Form + ら." },
    ],
  },

  "～ても、～": {
    erklaerung_lang: "～ても (て-Form + も) = „auch wenn / selbst wenn …“: 雨が降っても、行きます. Adjektive: 高くても, 便利でも.",
    kontrast: [{ a: "ても", b: "たら", note: "ても = „auch wenn“ (Gegensatz); たら = „wenn/falls“ (erwartete Folge)." }],
    uebungen: [
      { typ: "mc", frage: "雨が降っ＿、行きます。（auch wenn es regnet）", optionen: ["ても", "たら", "から", "と"], richtig: 0, erkl: "auch wenn → ても." },
      { typ: "cloze", satz: "高く＿、買います。（auch wenn teuer, 高い→）", luecke: "ても", erkl: "高い → 高くても." },
      { typ: "mc", frage: "～ても bedeutet …", optionen: ["auch wenn", "weil", "wenn (dann immer)", "bevor"], richtig: 0, erkl: "„selbst wenn“." },
    ],
  },
};
