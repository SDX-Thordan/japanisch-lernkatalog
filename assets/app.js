/* ============================================================
   Go! Nihongo · app.js
   Rendering + Suche/Filter + Lesungen-Schalter + Karteikarten
   + Verb-Konjugator + Verben-Seite + Trainings-Modus.
   Reine Vanilla-JS, offline lauffähig (file://), keine Abhängigkeiten.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Lektion-Metadaten ---------- */
  const LESSON = {
    1:{thema:'Begrüßung & sich vorstellen'},2:{thema:'Gegenstände (これ/それ/あれ)'},
    3:{thema:'Orte & Einkaufen (ここ/そこ)'},4:{thema:'Uhrzeit & Tagesablauf'},
    5:{thema:'Bewegung & Verkehrsmittel'},6:{thema:'Tätigkeiten, を, Essen & Trinken'},
    7:{thema:'Geben & Bekommen, Werkzeuge'},8:{thema:'Adjektive (い-/な-Adjektive)'},
    9:{thema:'Vorlieben & Können (すきです)'},10:{thema:'Existenz & Ort (あります/います)'},
    11:{thema:'Mengen & Zähleinheiten'},12:{thema:'Vergangenheit & Vergleich'},
    13:{thema:'Wünsche (〜たい / 〜に行きます)'},14:{thema:'て-Form & Bitten (〜てください)'},
    15:{thema:'Erlaubnis & Zustände (〜ています)'},16:{thema:'Handlungsabfolge (〜てから、〜て)'},
    17:{thema:'ない-Form, Pflicht & Verbot'},18:{thema:'Wörterbuchform & Fähigkeit'},
    19:{thema:'た-Form, Erfahrung & 〜たり'},20:{thema:'Plain-/Umgangsform (普通形)'},
    21:{thema:'〜と思います / 〜と言いました'},22:{thema:'Relativsätze (Nomen-Modifikation)'},
    23:{thema:'〜とき / 〜と (wenn)'},24:{thema:'Geben & Bekommen von Handlungen'},25:{thema:'〜たら / 〜ても'}
  };
  const LEVEL_ORDER = ['A1.2','A1.3','A1.4','A1.5','A1.6','A1.7'];

  /* ---------- Helfer ---------- */
  function el(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function ruby(base, reading){ if(!reading||reading===base) return esc(base); return '<ruby>'+esc(base)+'<rt>'+esc(reading)+'</rt></ruby>'; }
  function rubyPair(disp, read){ return (disp!==read) ? ruby(disp, read) : esc(disp); }
  // Schreibform eines Vokabels: Kanji-Schreibung, sonst Kana.
  function writtenForm(v){ return (v.kanji&&v.kanji.length)?v.kanji:v.kana; }
  // ます-/Prompt-Form: „Kanji（Kana）", wenn eine abweichende Kanji-Schreibung existiert, sonst Kana.
  function masuPrompt(v){ return (v.kanji&&v.kanji.length&&v.kanji!==v.kana)?v.kanji+'（'+v.kana+'）':v.kana; }
  // Einheitliche „Weiter →"-Schaltfläche (type=button) mit Klick-Handler; optionale Zusatzklasse.
  function makeNextButton(onClick, extraCls){ const nx=el('button','btn-primary'+(extraCls?' '+extraCls:''),'Weiter →'); nx.type='button'; nx.addEventListener('click',onClick); return nx; }
  // Suchnormalisierung: kleinschreiben + Makrone falten (ō→o …), damit ASCII-Rōmaji wie „kyoshi" auch „kyōshi" trifft.
  // Zusätzlich: Trennstriche entfernen (Kun-Lesung „み-る" wird über „みる" gefunden) und „・" zu einem
  // Leerzeichen machen — NICHT löschen, sonst entstünden Treffer quer über zwei Lesungen hinweg.
  // Der Chōonpu „ー" (コーヒー) bleibt selbstverständlich unangetastet. Wirkt auf Index UND Suchbegriff.
  function norm(s){ return String(s==null?'':s).toLowerCase()
    .replace(/[āáàâ]/g,'a').replace(/[īíìî]/g,'i').replace(/[ūúùû]/g,'u').replace(/[ēéèê]/g,'e').replace(/[ōóòô]/g,'o')
    .replace(/[-‐‑–—]/g,'').replace(/[・／]/g,' ')
    // Lange Vokale in Rōmaji vereinheitlichen: „houga“/„hoo ga“ treffen dasselbe wie „hō ga“.
    .replace(/ou/g,'o').replace(/oo/g,'o').replace(/uu/g,'u'); }
  // Kompakte Hepburn-Umschrift von Kana → Rōmaji (nur für den Suchindex der Verbformen).
  const ROMA_DI={'きゃ':'kya','きゅ':'kyu','きょ':'kyo','しゃ':'sha','しゅ':'shu','しょ':'sho','ちゃ':'cha','ちゅ':'chu','ちょ':'cho','にゃ':'nya','にゅ':'nyu','にょ':'nyo','ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo','みゃ':'mya','みゅ':'myu','みょ':'myo','りゃ':'rya','りゅ':'ryu','りょ':'ryo','ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo','じゃ':'ja','じゅ':'ju','じょ':'jo','びゃ':'bya','びゅ':'byu','びょ':'byo','ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo'};
  const ROMA_MO={'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko','が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to','だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho','ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo','ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','や':'ya','ゆ':'yu','よ':'yo','ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'o','ん':'n','ー':''};
  function kanaToRomaji(k){ k=String(k||''); let r='';
    for(let i=0;i<k.length;i++){ const two=k.substr(i,2);
      if(ROMA_DI[two]){ r+=ROMA_DI[two]; i++; continue; }
      const c=k[i];
      if(c==='っ'){ const nr=ROMA_DI[k.substr(i+1,2)]||ROMA_MO[k[i+1]]||''; if(nr)r+=nr[0]; continue; }
      r+=(ROMA_MO[c]!=null)?ROMA_MO[c]:c; }
    return r; }
  // ADAPTIVE Furigana für Erklärungs-/Beispieltexte: Lesungen erscheinen nur über Kanji,
  // die noch nicht beherrscht sind — Kanji außerhalb des Lernstoffs sind nie beherrscht
  // und bekommen daher immer eine Lesung (Nutzerwunsch: Erklärungen lesbar halten).
  function kanjiUnmastered(word){
    for(const ch of String(word)){
      if(/[㐀-鿿]/.test(ch) && !(window.SRS&&window.SRS.isMastered&&window.SRS.isMastered('k:'+ch)))return true;
    }
    return false;
  }
  // Wandelt einen Satz in Ruby-HTML um: exakte Furigana-Daten ({Basis|Lesung}) haben Vorrang
  // und werden adaptiv gerendert; ohne Eintrag übernimmt das Wörterbuch-Furigana der
  // Übungs-Engine (Exercises.autoFuri, ebenfalls adaptiv); ganz ohne beides bleibt esc.
  function furiToRuby(jp){
    const f=(window.GRAMMATIK_FURIGANA||{})[jp];
    if(!f){
      if(window.Exercises&&window.Exercises.autoFuri)return window.Exercises.autoFuri(jp);
      return esc(jp);
    }
    let out='', last=0, m; const re=/\{([^|{}]+)\|([^{}]+)\}/g;
    while((m=re.exec(f))){
      out+=esc(f.slice(last,m.index));
      out+=kanjiUnmastered(m[1])?('<ruby>'+esc(m[1])+'<rt>'+esc(m[2])+'</rt></ruby>'):esc(m[1]);
      last=re.lastIndex;
    }
    out+=esc(f.slice(last)); return out;
  }

  /* ---------- Material-Icon (selbst gehostete Outlined-Font, Ligaturen, offline) ---------- */
  function icon(name){ return '<span class="msi" aria-hidden="true">'+name+'</span>'; }

  /* ---------- Sakura-Blüte (Inline-SVG): gewinnt mit dem Wert diskret Blütenblätter ---------- */
  // Anzahl erfüllter Schwellen → 0..5 Blätter. Standard-Schwellen (Streak): 1,3,7,14,30 Tage.
  const SAKURA_STREAK=[1,3,7,14,30];
  function sakuraPetals(value,thresholds){
    value=value||0; thresholds=thresholds||SAKURA_STREAK;
    let n=0; for(let i=0;i<thresholds.length;i++){ if(value>=thresholds[i])n++; }
    return Math.min(5,n);
  }
  // Eindeutige Gradient-ID je Aufruf — verhindert ID-Kollisionen bei vielen Inline-SVGs auf einer Seite.
  let _skId=0;
  // Immer 5 Blätter im festen Kreis; freigeschaltet (k<n) = rosa Verlauf, gesperrt = dezent grau.
  // Sternmitte ab n≥1 farbig, sonst grau. Volle Blüte (n=5) ist dem 🌸-Emoji nachempfunden.
  function sakuraSvg(value,thresholds,opts){
    opts=opts||{};
    const n=sakuraPetals(value,thresholds);
    const cls='sakura'+(opts.cls?' '+opts.cls:'')+' sakura-'+n;
    const gid='sk-grad-'+(_skId++);
    // Kirschblüten-Blatt: nach oben zeigend, oben zweilappig eingekerbt (das Sakura-Merkmal).
    const PETAL='M0 -3 C -7 -4 -8.2 -13 -3.3 -18 C -1.8 -19.6 -1.1 -18 0 -15.4 C 1.1 -18 1.8 -19.6 3.3 -18 C 8.2 -13 7 -4 0 -3 Z';
    // Gesperrte Blätter zuerst (liegen hinten), freigeschaltete darüber.
    let locked='', petals='';
    for(let k=0;k<5;k++){
      const ang=(-90+k*72).toFixed(1);
      const g='<g transform="translate(24 24) rotate('+ang+')"><path d="'+PETAL+'" ';
      if(k<n) petals+=g+'fill="url(#'+gid+')" stroke="#f3b6cf" stroke-width="0.5"/></g>';
      else   locked +=g+'fill="#e7e3e5" stroke="#d7d1d4" stroke-width="0.5"/></g>';
    }
    // Sternförmige Mitte (5-zackig) + Staubgefäß-Punkte; bei n≥1 rosa/golden, sonst grau.
    const open=n>=1;
    let star='';
    for(let k=0;k<10;k++){
      const rad=(k%2===0)?3.6:1.6, a=(-90+k*36)*Math.PI/180;
      star+=(k===0?'M':'L')+(24+rad*Math.cos(a)).toFixed(2)+' '+(24+rad*Math.sin(a)).toFixed(2)+' ';
    }
    star='<path d="'+star+'Z" fill="'+(open?'#d65a86':'#d7d1d4')+'"/>';
    let dots='';
    if(open) for(let k=0;k<5;k++){
      const a=(-90+k*72)*Math.PI/180;
      dots+='<circle cx="'+(24+4.2*Math.cos(a)).toFixed(2)+'" cy="'+(24+4.2*Math.sin(a)).toFixed(2)+'" r="0.75" fill="#f7d35a"/>';
    }
    const defs='<defs><radialGradient id="'+gid+'" gradientUnits="userSpaceOnUse" cx="24" cy="24" r="19">'+
      '<stop offset="0" stop-color="#fff7fb"/><stop offset="0.55" stop-color="#fce6ef"/><stop offset="1" stop-color="#f9ccde"/></radialGradient></defs>';
    const aria=open?('Blüte: '+n+' von 5 Blütenblättern'):'Knospe (noch keine Blüte)';
    return '<svg class="'+cls+'" viewBox="0 0 48 48" role="img" aria-label="'+aria+'">'+defs+locked+petals+star+dots+'</svg>';
  }

  /* ---------- Navigation (responsiv: oben gruppiert / unten Tab-Leiste) ---------- */
  const NAV_GROUPS=[
    {group:'Lernen', items:[
      {page:'heute',href:'heute.html',label:'Heute',icon:'today'},
      {page:'lernpfad',href:'lernpfad.html',label:'Lernpfad',icon:'route'},
    ]},
    {group:'Nachschlagen', items:[
      {page:'vokabular',href:'vokabular.html',label:'Vokabular',icon:'menu_book'},
      {page:'grammatik',href:'grammatik.html',label:'Grammatik',icon:'rule'},
      {page:'kanji',href:'kanji.html',label:'Kanji',icon:'translate'},
      {page:'verben',href:'verben.html',label:'Verben',icon:'bolt'},
      {page:'schreiben',href:'schreiben.html',label:'Schreiben',icon:'draw'},
      {page:'verbtrainer',href:'verbtrainer.html',label:'Verbtrainer',icon:'model_training'},
      {page:'ueben',href:'ueben.html',label:'Freies Üben',icon:'school'},
    ]},
    {group:'Mein Bereich', items:[
      {page:'listen',href:'listen.html',label:'Listen',icon:'bookmarks',match:['listen','liste']},
      {page:'profil',href:'profil.html',label:'Profil',icon:'person'},
    ]},
  ];
  const REFERENCE_PAGES=['vokabular','grammatik','kanji','verben','schreiben','verbtrainer','ueben'];
  // Untere App-Leiste: 5 Primärziele; „Nachschlagen" ist ein Hub (Einstieg Vokabular).
  const BOTTOM=[
    {page:'heute',href:'heute.html',label:'Heute',icon:'today'},
    {page:'lernpfad',href:'lernpfad.html',label:'Lernpfad',icon:'route'},
    {page:'listen',href:'listen.html',label:'Listen',icon:'bookmarks',match:['listen','liste']},
    {page:'nachschlagen',href:'vokabular.html',label:'Nachschlagen',icon:'menu_book',match:REFERENCE_PAGES},
    {page:'profil',href:'profil.html',label:'Profil',icon:'person'},
  ];
  function navLink(it,page,cls){
    const active=(it.match?it.match.indexOf(page)!==-1:it.page===page);
    const a=el('a',cls+(active?' active':''),icon(it.icon)+'<span class="nav-label">'+esc(it.label)+'</span>');
    a.href=it.href; a.title=it.label; if(active)a.setAttribute('aria-current','page'); return a;
  }
  // Beim Runterscrollen bleiben die Menüs als Icons sichtbar: body.scrolled blendet die
  // Textlabels aus (Topbar + Subnav werden kompakt); --topbar-h hält die Subnav sticky darunter.
  function initScrollNav(){
    const tb=document.querySelector('.topbar');
    function measure(){
      if(tb)document.documentElement.style.setProperty('--topbar-h',tb.offsetHeight+'px');
      const sn=document.querySelector('.subnav');
      document.documentElement.style.setProperty('--subnav-h',(sn?sn.offsetHeight:0)+'px');
    }
    let ticking=false;
    function onScroll(){
      if(ticking)return; ticking=true;
      requestAnimationFrame(()=>{ document.body.classList.toggle('scrolled',window.scrollY>60); measure(); ticking=false; });
    }
    measure();
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',measure,{passive:true});
  }
  function renderNav(page){
    // Obere, gruppierte Leiste (Browser)
    const top=document.getElementById('topnav');
    if(top){ top.innerHTML='';
      NAV_GROUPS.forEach(g=>{ const grp=el('div','nav-group');
        grp.appendChild(el('span','nav-group-label',esc(g.group)));
        const row=el('div','nav-row'); g.items.forEach(it=>row.appendChild(navLink(it,page,'nav-tab')));
        grp.appendChild(row); top.appendChild(grp); });
    }
    // Untere Tab-Leiste (App / schmal)
    if(!document.getElementById('bottomnav')){
      const bn=el('nav','bottomnav'); bn.id='bottomnav'; bn.setAttribute('aria-label','App-Navigation');
      BOTTOM.forEach(it=>bn.appendChild(navLink(it,page,'bn-tab')));
      document.body.appendChild(bn);
    }
    // Sekundäre Tab-Zeile auf Nachschlage-Seiten
    if(REFERENCE_PAGES.indexOf(page)!==-1){
      const main=document.querySelector('main');
      if(main && !document.querySelector('.subnav')){
        const sub=el('nav','subnav'); sub.setAttribute('aria-label','Nachschlagen');
        NAV_GROUPS[1].items.forEach(it=>sub.appendChild(navLink(it,page,'subnav-tab')));
        main.insertBefore(sub, main.firstChild);
      }
    }
  }

  /* ============================================================
     VERB-KONJUGATOR (Minna no Nihongo Gruppen I/II/III)
     ============================================================ */
  const I2U = {'い':'う','き':'く','ぎ':'ぐ','し':'す','ち':'つ','に':'ぬ','ひ':'ふ','び':'ぶ','み':'む','り':'る'};
  const U2A = {'う':'わ','く':'か','ぐ':'が','す':'さ','つ':'た','ぬ':'な','ぶ':'ば','む':'ま','る':'ら'};
  const TE  = {'う':'って','つ':'って','る':'って','む':'んで','ぶ':'んで','ぬ':'んで','く':'いて','ぐ':'いで','す':'して'};
  const TA  = {'う':'った','つ':'った','る':'った','む':'んだ','ぶ':'んだ','ぬ':'んだ','く':'いた','ぐ':'いだ','す':'した'};

  function verbGroup(pos){ pos=pos||''; if(/III/.test(pos))return 3; if(/II/.test(pos))return 2; if(/\bV\. I\b/.test(pos)||/^V\. I$/.test(pos))return 1; if(/V\. I/.test(pos))return 1; return 0; }
  function cleanVerb(s){ return String(s||'').replace(/^\[[^\]]*\]/,'').replace(/\s+/g,''); }

  // Liefert {dict, te, ta, nai} aus einer ます-Form (Kana oder Kanji+Okurigana) + Gruppe.
  function conjugate(masuForm, group){
    const w = cleanVerb(masuForm);
    if(!/ます$/.test(w)) return null;
    const stem = w.slice(0,-2);
    if(group===2){
      return { dict:stem+'る', te:stem+'て', ta:stem+'た', nai:stem+'ない' };
    }
    if(group===3){
      if(/し$/.test(stem)){ const b=stem.slice(0,-1); return {dict:b+'する',te:b+'して',ta:b+'した',nai:b+'しない'}; }
      if(/き$/.test(stem)){ const b=stem.slice(0,-1); return {dict:b+'くる',te:b+'きて',ta:b+'きた',nai:b+'こない'}; }
      return null;
    }
    // Gruppe I
    const last = stem.slice(-1);
    const u = I2U[last];
    if(!u) return null;
    const base = stem.slice(0,-1);
    const dict = base + u;
    let teEnd = TE[u], taEnd = TA[u];
    if(/いく$/.test(dict) || /行く$/.test(dict)){ teEnd='って'; taEnd='った'; } // Ausnahme 行く
    // Ausnahme ある: die Verneinung ist ない, nicht das regelmäßige „あらない“ (s. GRAMMATIK L9).
    // Exakter Vergleich, damit Komposita auf ～ある nicht mitgefangen werden.
    const nai = (dict==='ある') ? 'ない' : (base+U2A[u]+'ない');
    return { dict, te:base+teEnd, ta:base+taEnd, nai:nai };
  }

  // Anzeige-Form eines Verbs: die WÖRTERBUCHFORM ist das Stichwort (wichtiger als ます);
  // die ます-Form wird nur beim Aufklappen/auf der Rückseite gezeigt. null für Nicht-Verben.
  function verbDictDisplay(v){
    if(!/^V\./.test(v.pos||''))return null;
    const g=verbGroup(v.pos); if(g<=0)return null;
    const kana=conjugate(v.kana,g); if(!kana)return null;
    const written=(v.kanji&&v.kanji.length&&v.kanji!==v.kana)?conjugate(v.kanji,g):null;
    return { kana:kana.dict, written:(written&&written.dict)||kana.dict };
  }

  /* ---------- Verbgruppe benennen und Stolpersteine am einzelnen Verb vermerken ----------
     Es bleibt beim Drei-Gruppen-System des Lehrbuchs (する UND くる stecken in III). Verben, die
     man sich trotzdem merken muss, bekommen keinen eigenen Gruppen-Namen, sondern einen Hinweis. */
  const VERB_GROUP_NAMES={1:'Gruppe I （五段）',2:'Gruppe II （一段）',3:'Gruppe III （unregelmäßig）'};
  const VERB_GROUP_SHORT={1:'Gruppe I',2:'Gruppe II',3:'Gruppe III'};
  // Verben, deren gebildete Formen von der Regel ihrer Gruppe abweichen (Schlüssel = ます-Form).
  const VERB_NOTES={
    'いきます':'Ausnahme: て-/た-Form ist 行って／行った (nicht 行いて).',
    'あります':'Ausnahme: die Verneinung ist ない (nicht あらない).'
  };
  // え-/い-Reihe: endet die Wörterbuchform auf eines dieser Kana + る, sieht sie nach Gruppe II aus.
  const EI_ROW=/[えけげせぜてでねへべめれいきぎしじちぢにひびみり]る$/;
  /* Kurzer Hinweistext zu einem Verb — oder '' . Die „falschen Ichidan“ (帰る・入る・知る・切る・
     要る) werden per Regel erkannt statt aufgelistet, damit später ergänzte Verben mitgreifen. */
  function verbIrregularNote(v,g,dictKana){
    const key=cleanVerb(v&&v.kana);
    if(VERB_NOTES[key])return VERB_NOTES[key];
    if(g===1&&EI_ROW.test(dictKana||''))
      return 'Sieht wie Gruppe II aus (Wörterbuchform auf ～る), gehört aber zu Gruppe I.';
    return '';
  }

  /* ---------- Generierte Verb-Form-Übungen (て/た/ない/辞書形) aus echten Verben ---------- */
  const VERB_FORM_PATTERNS={'V て-Form':'te','V た-Form':'ta','V ない-Form':'nai','V 辞書形 (Wörterbuchform)':'dict'};
  const VERB_FORM_LABEL={te:'て-Form',ta:'た-Form',nai:'ない-Form',dict:'Wörterbuchform'};
  // Konjugierbare Verben für eine Form. Bevorzugt die freigeschalteten Lektionen (gelernt + neu);
  // sind dort noch zu wenige (frühe Lektionen haben kaum Verben), wird auf alle Verben erweitert,
  // damit immer echte, wiederkehrende Aufgaben entstehen (statt Rückfall auf die statischen).
  function verbPool(form){
    const conjugable=(window.VOKABULAR||[]).filter(v=>{
      if(!/^V\./.test(v.pos)||verbGroup(v.pos)<=0)return false;
      const c=conjugate(v.kana,verbGroup(v.pos)); return !!(c&&c[form]);
    });
    const max=(window.SRS&&window.SRS.maxUnlockedLesson)?window.SRS.maxUnlockedLesson():25;
    const within=conjugable.filter(v=>v.lesson<=max);
    return within.length>=4?within:conjugable;
  }
  // n Multiple-Choice-Aufgaben „<Verb> → ?（<Form>）" mit korrekter Form + plausiblen Distraktoren.
  function genVerbFormExercises(form,n){
    n=n||6;
    const label=VERB_FORM_LABEL[form]||form;
    const pool=verbPool(form);
    if(!pool.length)return [];
    const verbs=shuffle(pool.slice()).slice(0,n);
    return verbs.map(v=>{
      const g=verbGroup(v.pos), c=conjugate(v.kana,g), correct=c[form];
      const stem=v.kana.slice(0,-2);
      const naive=stem+({te:'て',ta:'た',nai:'ない',dict:'る'}[form]); // typischer Anfängerfehler (Gruppe-II-Regel überall)
      const seen={}; seen[correct]=1; const distract=[];
      shuffle([c.te,c.ta,c.nai,naive]).forEach(x=>{ if(x&&!seen[x]){ seen[x]=1; distract.push(x); } });
      let guard=0;
      while(distract.length<3&&guard<40){ guard++;
        const o=pool[Math.floor(Math.random()*pool.length)], oc=conjugate(o.kana,verbGroup(o.pos)), x=oc&&oc[form];
        if(x&&!seen[x]){ seen[x]=1; distract.push(x); } }
      const optionen=shuffle([correct].concat(distract.slice(0,3)));
      const prompt=masuPrompt(v);
      return { typ:'mc', frage:prompt+' → ?（'+label+'）', optionen:optionen, richtig:optionen.indexOf(correct),
        erkl:(form==='dict'?cleanVerb(v.kana):c.dict)+' → '+correct+(v.de?' — '+v.de:'') };
    });
  }

  // Voller Formensatz für Anzeige.
  function allForms(masuForm, group){
    const w = cleanVerb(masuForm);
    if(!/ます$/.test(w)) return null;
    const stem = w.slice(0,-2);
    const c = conjugate(w, group);
    if(!c) return null;
    return {
      masu:w, masen:stem+'ません', mashita:stem+'ました', mashou:stem+'ましょう',
      dict:c.dict, te:c.te, ta:c.ta, nai:c.nai,
      nakatta:c.nai.replace(/ない$/,'なかった'), tai:stem+'たい'
    };
  }

  /* ============================================================  VERBFORMEN-TRAINER · Datenschicht
     „Form A → Form B" ist KEIN Konjugieren, sondern Nachschlagen: allForms() liefert pro Verb alle
     zehn Formen auf einmal, also entsteht jede Richtung (auch die Rückrichtung „て → ます") einfach
     dadurch, dass zwei Spalten derselben Zeile gezogen werden. Berechnet wird zweimal — einmal auf
     der Kana-Schreibung, einmal auf der Kanji-Schreibung (Ruby-Muster wie in renderVerben). */
  const VT_ORDER=['dict','masu','masen','mashita','mashou','te','ta','nai','nakatta','tai'];
  const VT_LABEL={dict:'Wörterbuchform',masu:'ます-Form',masen:'ません-Form',mashita:'ました-Form',
    mashou:'ましょう-Form',te:'て-Form',ta:'た-Form',nai:'ない-Form',nakatta:'なかった-Form',tai:'たい-Form'};
  // Endung, die entsteht, wenn man die Gruppe-II-Regel stur auf alles anwendet — der typische Fehler.
  const VT_NAIVE={dict:'る',masu:'ます',masen:'ません',mashita:'ました',mashou:'ましょう',
    te:'て',ta:'た',nai:'ない',nakatta:'なかった',tai:'たい'};

  // Konjugierbare Verben einer Quelle ('all' oder eine Listen-ID), je Wörterbuchform nur einmal.
  function vtVerbs(src){
    const vocab=(src==='all')?(window.VOKABULAR||[])
      :((window.SRS&&window.SRS.listItems)?window.SRS.listItems(src):[])
        .filter(o=>o&&o.type==='vocab').map(o=>o.data);
    const seen={}, out=[];
    vocab.forEach(v=>{
      if(!v||!/^V\./.test(v.pos||''))return;
      const g=verbGroup(v.pos); if(g<=0)return;          // nicht konjugierbar
      const kana=allForms(v.kana,g); if(!kana)return;    // z. B. Gruppe III ohne し/き
      if(seen[kana.dict])return; seen[kana.dict]=1;
      out.push({v:v, g:g, kana:kana, disp:allForms(writtenForm(v),g)||kana});
    });
    if(src!=='all')return out;
    // Freigeschaltete Lektionen bevorzugen — aber erst NACH dem Verbfilter zählen: die frühen
    // Lektionen enthalten kaum Verben, und ein leerer Trainer wäre schlechter als ein weiter Pool.
    const max=(window.SRS&&window.SRS.maxUnlockedLesson)?window.SRS.maxUnlockedLesson():25;
    const within=out.filter(o=>o.v.lesson<=max);
    return within.length>=4?within:out;
  }

  /* Genau eine Form gewählt → die Zitierform als implizite Gegenform, damit trotzdem in beide
     Richtungen geübt wird. Wörterbuchform zuerst (sie ist in dieser App das Stichwort); ist sie
     gesperrt oder selbst die gewählte Form, weicht es auf ます/ません aus — die sind nie gegatet. */
  function vtPartner(only){
    const open=f=>!window.Exercises||!window.Exercises.formUnlocked||window.Exercises.formUnlocked(f);
    const prefer=(only==='dict')?['masu','masen']:['dict','masu','masen'];
    for(let i=0;i<prefer.length;i++){ if(prefer[i]!==only&&open(prefer[i]))return prefer[i]; }
    return only==='masu'?'masen':'masu';
  }
  /* Geordnetes Paar [von, nach] mit garantiert A≠B — ohne Wiederholungsschleife, weil Tests
     Math.random auf einen festen Wert setzen und eine do…while dort in den Guard liefe. */
  function vtPair(forms,rnd){
    rnd=rnd||Math.random;
    const pool=(forms||[]).slice();
    if(pool.length<2)pool.push(vtPartner(pool[0]));
    const n=pool.length;
    const i=Math.min(n-1,Math.floor(rnd()*n));
    let j=Math.min(n-2,Math.floor(rnd()*(n-1))); if(j>=i)j++;
    return [pool[i],pool[j]];
  }
  // Gültige Eingaben für eine Zielform: Kana, Kanji-Schreibung und die Rōmaji-Umschrift.
  function vtAccept(o,to){
    const kana=o.kana[to], disp=o.disp[to], acc=[kana];
    if(disp&&disp!==kana)acc.push(disp);
    const r=kanaToRomaji(kana); if(r)acc.push(r);
    return acc;
  }
  /* Distraktoren: erst der naive Gruppe-II-Fehler, dann andere Formen DESSELBEN Verbs, zuletzt
     dieselbe Zielform fremder Verben. Die Ausgangsform ist ausgeschlossen — sie steht ja im Prompt. */
  let vtAllCache=null;
  function vtOptions(o,from,to,pool){
    const correct=o.kana[to];
    const seen={}; seen[correct]=1; seen[o.kana[from]]=1;
    const dis=[], push=x=>{ if(x&&!seen[x]){ seen[x]=1; dis.push(x); } };
    push(o.kana.masu.slice(0,-2)+VT_NAIVE[to]);
    shuffle(VT_ORDER.slice()).forEach(f=>push(o.kana[f]));
    const wide=(pool&&pool.length>3)?pool:(vtAllCache||(vtAllCache=vtVerbs('all')));
    let guard=0;
    while(dis.length<3&&guard<40&&wide.length){ guard++;
      push(wide[Math.floor(Math.random()*wide.length)].kana[to]); }
    return shuffle([correct].concat(dis.slice(0,3)));
  }
  /* Eine Aufgabe „von → nach". Gewertet wird NUR die Zielform (g:<Muster>), nie die Vokabel-ID.
     Die Richtungsangabe darf NICHT in frage/prompt stehen — ruby() legte die Lesung sonst über
     den ganzen Satz statt über das Verb; sie steht in der Kopfzeile und im Subprompt. */
  function vtTask(o,from,to,mode,pool){
    const pat=(window.Exercises&&window.Exercises.formPattern)?window.Exercises.formPattern(to):null;
    const srsId=pat?('g:'+pat):null;
    const pDisp=o.disp[from], pKana=o.kana[from], aDisp=o.disp[to], aKana=o.kana[to];
    const erkl=pKana+' → '+aKana+(o.v.de?' — '+o.v.de:'');
    const q='Bilde die '+VT_LABEL[to]+'.';
    if(mode==='mc'){
      const optionen=vtOptions(o,from,to,pool);
      // Auswählen ist leichter als Produzieren → halber Punktgewinn (Vorbild: Kanji-MC).
      if(optionen.length>=2)
        return { typ:'mc', srsId:srsId, big:true, frage:pDisp, furigana:pKana, q:q, optJa:true,
          optionen:optionen, richtig:optionen.indexOf(aKana), erkl:erkl,
          gradeOpts:{gainScale:0.5}, mode:'vt-mc-'+to };
      // zu wenige Distraktoren → doch tippen lassen
    }
    return { typ:'input', srsId:srsId, big:true, promptJa:true, prompt:pDisp, furigana:pKana, q:q,
      antworten:vtAccept(o,to), loesung:(aDisp!==aKana?(aDisp+'（'+aKana+'）'):aKana),
      placeholder:'Kana oder Rōmaji …', erkl:erkl, mode:'vt-input-'+to };
  }

  /* ---------- Zustand für Listen-Seiten ---------- */
  let items=[], groups=[], activeFilter='all', activeType='all', query='';

  /* Delegierte Klicks für Kanji-Karten (＋ zur Lernliste) — an jeden Container bindbar,
     damit die Karten auch außerhalb der Kanji-Seite (Listen-Detailseite) funktionieren. */
  function initKanjiClicks(content){
    content.addEventListener('click',e=>{ const a=e.target.closest('.kc-add'); if(a&&window.SRS){ openListPicker(['k:'+a.dataset.kanji], a.dataset.word||a.dataset.kanji); } });
  }
  /* Delegierte Klicks für Vokabelzeilen: ＋ (Wort/Lektion) und Aufklappen der Beispiele. */
  function initVocabClicks(content,listsOn){
    content.addEventListener('click',e=>{
      if(listsOn){
        const a=e.target.closest('.v-add'); if(a){ e.stopPropagation(); openListPicker([a.dataset.vid],a.dataset.word); return; }
        const al=e.target.closest('.v-add-lesson'); if(al){ const L=+al.dataset.lesson; const ids=(window.VOKABULAR||[]).filter(v=>v.lesson===L).map(v=>'v:'+v.kana+'|'+v.lesson); openListPicker(ids,'Lektion '+L); return; }
      }
      // „Alle Formen“ öffnet das Popup — vor dem Toggle, sonst klappt die Zeile dabei zu.
      const vf=e.target.closest('.v-forms'); if(vf){ e.stopPropagation(); openVerbForms(vocabById(vf.dataset.vid)); return; }
      // Klick auf die Karte klappt die erweiterte Bedeutung (Beispiel) auf/zu.
      const row=e.target.closest('.v-row.item'); if(row&&row.dataset.ext)row.classList.toggle('expanded');
    });
  }

  /* ============================================================  KANJI  */
  function renderKanji(content){
    const data=window.KANJI||[], byLevel={};
    data.forEach(k=>{(byLevel[k.level]=byLevel[k.level]||[]).push(k);});
    LEVEL_ORDER.forEach(lv=>{
      const arr=byLevel[lv]; if(!arr||!arr.length)return;
      const group=el('section','group'); group.dataset.group=lv;
      group.appendChild(groupHead(lv,'Kanji dieser Kursstufe',arr.length));
      const grid=el('div','kanji-grid'); arr.forEach(k=>grid.appendChild(kanjiCard(k)));
      group.appendChild(grid); content.appendChild(group);
    });
    buildChips(LEVEL_ORDER.filter(lv=>byLevel[lv]), v=>v);
    initKanjiClicks(content);
  }
  function kanjiCard(k){
    const on=(k.on||[]).join('・'), kun=(k.kun||[]).join('・');
    const exHtml=(k.examples||[]).map(e=>'<div class="ex"><span class="ex-w">'+ruby(e.w,e.r)+'</span><span class="ex-de">'+esc(e.m)+'</span></div>').join('');
    const card=el('article','kanji-card item');
    card.dataset.filter=k.level;
    card.dataset.search=kanjiSearchIndex(k);
    const kScore=(window.SRS&&window.SRS.scoreOf)?window.SRS.scoreOf('k:'+k.k):0;
    card.innerHTML=
      '<div class="kc-top"><div class="kanji-char">'+esc(k.k)+'</div>'+
      '<div class="kc-meta"><span class="tag">'+esc(k.level)+(k.cls?' · '+esc(k.cls):'')+'</span>'+
      (k.strokes?'<span class="strokes">'+esc(k.strokes)+' Striche</span>':'')+'</div></div>'+
      '<div class="kc-meaning">'+esc(k.meaning)+'</div>'+
      '<div class="readings hideable">'+
        (on?'<div class="reading-row"><span class="lbl">音</span><span class="vals">'+esc(on)+'</span></div>':'')+
        (kun?'<div class="reading-row"><span class="lbl kun">訓</span><span class="vals">'+esc(kun)+'</span></div>':'')+'</div>'+
      (exHtml?'<div class="kc-examples hideable">'+exHtml+'</div>':'')+
      '<div class="kc-foot">'+
        '<span class="kc-writes" title="Lernstand '+Math.round(kScore)+' % (durch Schreiben)">'+sakuraSvg(kScore,SCORE_THRESHOLDS,{cls:'sakura-sm'})+'</span>'+
        (window.SRS?'<button class="kc-add'+(inListCount('k:'+k.k)>0?' in-list':'')+'" type="button" title="'+esc(addBtnTitle('k:'+k.k,'Zur Lernliste hinzufügen'))+'" data-kanji="'+esc(k.k)+'" data-word="'+esc(k.meaning||k.k)+'">'+addBtnLabel('k:'+k.k)+'</button>':'')+
        '<a class="kc-write" href="schreiben.html?kanji='+encodeURIComponent(k.k)+'" aria-label="Dieses Kanji schreiben üben" title="Schreiben üben"><span class="msi" aria-hidden="true">draw</span></a>'+
      '</div>';
    return card;
  }

  /* ============================================================  VOKABULAR  */
  function renderVocab(content){
    const data=window.VOKABULAR||[], byLesson={};
    const listsOn=!!window.SRS;
    data.forEach(w=>{(byLesson[w.lesson]=byLesson[w.lesson]||[]).push(w);});
    Object.keys(byLesson).map(Number).sort((a,b)=>a-b).forEach(L=>{
      const arr=byLesson[L];
      const group=el('section','group'); group.dataset.group=String(L);
      const head=groupHead('Lektion '+L,(LESSON[L]||{}).thema||'',arr.length);
      if(window.SRS)head.appendChild(lessonRepsBadge(L,'vocab'));
      if(listsOn){ const b=el('button','v-add-lesson','＋ Lektion → Liste'); b.type='button'; b.dataset.lesson=String(L); head.appendChild(b); }
      group.appendChild(head);
      const list=el('div','vocab-list'); arr.forEach(w=>list.appendChild(vocabRow(w,listsOn)));
      group.appendChild(list); content.appendChild(group);
    });
    buildChips(Object.keys(byLesson).map(Number).sort((a,b)=>a-b), L=>'L'+L);
    buildTypeChips();
    initVocabClicks(content,listsOn);
  }
  // Gestapelte Vokabel-Karte (handytauglich): (Lesung klein) / Wort / Übersetzung; Blüte oben rechts.
  // Suchindex für Verben: alle Formen (Kana + Schreibung) samt Rōmaji, damit „okiru", „おきる",
  // „起きる" und „たべて" dieselbe Zeile finden wie die ます-Form — wie auf der Verben-Seite (verbCard).
  function verbSearchIndex(w){
    const g=verbGroup(w.pos||''); if(g<=0)return '';
    const f=allForms(w.kana,g); if(!f)return '';
    const disp=allForms(writtenForm(w),g)||{};
    const keys=['dict','te','ta','nai'];
    const kana=keys.map(k=>f[k]).filter(Boolean);
    return kana.concat(kana.map(kanaToRomaji)).concat(keys.map(k=>disp[k]).filter(Boolean)).join(' ');
  }
  /* Suchindizes als REINE Funktionen — dieselben Strings landen an der gerenderten Zeile
     (dataset.search) UND in der Suche des Hinzufügen-Overlays, das ohne DOM auskommen muss.
     Nur eine Quelle, damit Katalog- und Overlay-Suche nicht auseinanderlaufen können. */
  function vocabSearchIndex(w){ return norm([w.kanji,w.kana,w.romaji,w.de,w.pos,verbSearchIndex(w)].join(' ')); }
  function kanjiSearchIndex(k){
    const on=(k.on||[]).join('・'), kun=(k.kun||[]).join('・');
    return norm([k.k,on,kun,k.meaning,k.level,k.cls,(k.examples||[]).map(e=>e.w+' '+e.r+' '+e.m).join(' ')].join(' '));
  }
  function grammarSearchIndex(g){
    const base=norm([g.pattern,g.title,kanaToRomaji(g.pattern)].join(' '));
    return base+' '+base.replace(/\s+/g,'');   // zweite, leerzeichenfreie Fassung für „hou ga“
  }
  function itemSearchIndex(o){
    return o.type==='kanji'?kanjiSearchIndex(o.data):(o.type==='grammar'?grammarSearchIndex(o.data):vocabSearchIndex(o.data));
  }
  // Treffer-Test: Teilstring, plus zweiter Versuch ohne Leerzeichen (siehe applyFilter).
  function searchHit(idx,q,qs){ if(!q)return true; idx=idx||'';
    return idx.indexOf(q)!==-1||(!!qs&&idx.indexOf(qs)!==-1); }
  /* Alle Katalog-Einträge als {id,type,data,idx} — einmal gebaut und gemerkt. Der Aufbau kostet
     (pro Verb ein allForms-Lauf), passiert aber erst beim ersten Öffnen des Overlays. */
  let catIdx=null;
  function catalogIndex(){
    if(catIdx)return catIdx;
    const out=[]; const S=window.SRS;
    if(!S||!S.srsId)return out;
    (window.VOKABULAR||[]).forEach(v=>out.push({id:S.srsId('vocab',v),type:'vocab',data:v,idx:vocabSearchIndex(v)}));
    (window.KANJI||[]).forEach(k=>out.push({id:S.srsId('kanji',k),type:'kanji',data:k,idx:kanjiSearchIndex(k)}));
    (window.GRAMMATIK||[]).forEach(g=>out.push({id:S.srsId('grammar',g),type:'grammar',data:g,idx:grammarSearchIndex(g)}));
    catIdx=out; return out;
  }
  function vocabById(id){
    const m=/^v:(.*)\|(\d+)$/.exec(String(id||'')); if(!m)return null;
    return (window.VOKABULAR||[]).filter(v=>v.kana===m[1]&&String(v.lesson)===m[2])[0]||null;
  }
  /* Verb-Block für den aufgeklappten Bereich: Gruppe + „Alle Formen“ + ggf. Ausnahme-Hinweis.
     Geteilt von der Katalogzeile (vokabular.html/liste.html) und der Listen-Übersicht. */
  function verbExtraHtml(w){
    const g=verbGroup(w.pos||''); if(g<=0)return '';
    const f=allForms(w.kana,g); if(!f)return '';
    const note=verbIrregularNote(w,g,f.dict);
    return '<div class="v-vgrp"><span class="v-masu-lbl v-vgrp-lbl">'+esc(VERB_GROUP_SHORT[g])+'</span>'+
      '<button class="v-forms" type="button" data-vid="v:'+esc(w.kana)+'|'+w.lesson+'">'+
        '<span class="msi" aria-hidden="true">table_rows</span> Alle Formen</button></div>'+
      (note?'<div class="v-vnote">'+esc(note)+'</div>':'');
  }
  function vocabRow(w,listsOn){
    // Verben: Stichwort = Wörterbuchform; die ます-Form erscheint erst beim Aufklappen.
    const dd=verbDictDisplay(w);
    const written=dd?dd.written:(writtenForm(w));
    const readKana=dd?dd.kana:w.kana;
    const showKana=written!==readKana;
    const row=el('div','v-row item'); row.dataset.filter=String(w.lesson);
    row.dataset.type=vocabType(w.pos);
    const bsp=(window.VOKABULAR_BEISPIELE||{})[w.kana+'|'+w.lesson];
    // Nur Kerndaten des Eintrags — der Beispielsatz wird zwar angezeigt, aber NICHT durchsucht:
    // sonst trifft jedes deutsche Wort aus einer Beispielübersetzung fremde Vokabeln.
    row.dataset.search=vocabSearchIndex(w);
    // Erweiterte Infos (ます-Form bei Verben, Beispielsatz + Notiz) klappen per Klick auf.
    if(bsp||dd)row.dataset.ext='1';
    const masuLine=dd?'<div class="v-masu-inline"><span class="v-masu-lbl">ます-Form</span> <span class="ja">'+esc(masuPrompt(w))+'</span></div>':'';
    const bspLine=bsp?'<div class="v-bsp-inline"><span class="ja">'+furiToRuby(bsp.jp)+'</span> — '+esc(bsp.de)+(bsp.note?'<span class="v-note"> · '+esc(bsp.note)+'</span>':'')+'</div>':'';
    const ext=(bsp||dd)?'<span class="v-more" aria-hidden="true" title="Mehr anzeigen">›</span>'+
      '<div class="v-ext">'+(dd?verbExtraHtml(w):'')+masuLine+bspLine+'</div>':'';
    row.innerHTML='<span class="v-score">'+scoreBadgeHtml('v:'+w.kana+'|'+w.lesson)+'</span>'+
      '<div class="v-main">'+(showKana?'<div class="v-read ja">'+esc(readKana)+'</div>':'')+'<div class="v-word ja">'+esc(written)+'</div></div>'+
      '<div class="v-mean de hideable">'+esc(w.de)+ext+'</div>'+
      '<div class="v-meta"><span class="pos">'+esc(w.pos)+'</span>'+
      (listsOn?'<button class="v-add'+(inListCount('v:'+w.kana+'|'+w.lesson)>0?' in-list':'')+'" type="button" title="'+esc(addBtnTitle('v:'+w.kana+'|'+w.lesson,'Zu Liste hinzufügen'))+'" data-vid="v:'+esc(w.kana)+'|'+w.lesson+'" data-word="'+esc(written)+'">'+addBtnLabel('v:'+w.kana+'|'+w.lesson)+'</button>':'')+'</div>';
    return row;
  }
  // Ordnet eine Wortart einer Filter-Kategorie zu.
  function vocabType(pos){ pos=pos||'';
    if(/^V\./.test(pos))return 'verb';
    if(/Adj/.test(pos))return 'adj';
    if(/Adv/.test(pos))return 'adv';
    if(/Partikel/.test(pos))return 'part';
    if(/^N\./.test(pos))return 'noun';
    return 'other';
  }

  /* ============================================================  GRAMMATIK  */
  function renderGrammar(content){
    const data=window.GRAMMATIK||[], byLesson={};
    data.forEach(g=>{(byLesson[g.lesson]=byLesson[g.lesson]||[]).push(g);});
    Object.keys(byLesson).map(Number).sort((a,b)=>a-b).forEach(L=>{
      const arr=byLesson[L];
      const group=el('section','group'); group.dataset.group=String(L);
      const head=groupHead('Lektion '+L,(LESSON[L]||{}).thema||'',arr.length);
      if(window.SRS)head.appendChild(lessonRepsBadge(L,'grammar'));
      group.appendChild(head);
      arr.forEach(g=>group.appendChild(grammarCard(g,L)));
      content.appendChild(group);
    });
    buildChips(Object.keys(byLesson).map(Number).sort((a,b)=>a-b), L=>'L'+L);
    initCollapse(content);
  }
  // Klick auf den Karten-Kopf (.card-toggle) klappt die Karte auf/zu.
  function initCollapse(content){
    content.addEventListener('click',e=>{
      const a=e.target.closest('.gp-add');
      if(a&&window.SRS){ e.stopPropagation(); const g=(window.GRAMMATIK||[]).find(x=>x.pattern===a.dataset.pattern); openListPicker(['g:'+a.dataset.pattern], g?(g.title||g.pattern):a.dataset.pattern); return; }
      const h=e.target.closest('.card-toggle'); if(!h)return;
      const card=h.closest('.collapsible'); if(card)card.classList.toggle('collapsed'); });
  }
  function gpTable(t){
    const rows=(t.rows||[]).map(r=>'<tr><th>'+esc(r.g)+'</th><td>'+esc(r.regel)+'</td><td class="ja">'+furiToRuby(r.bsp)+'</td></tr>').join('');
    return '<table class="conj-table"><thead><tr><th>Gruppe</th><th>Regel</th><th>Beispiel</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function grammarCard(g,L){
    const extra=(window.GRAMMATIK_EXTRA&&window.GRAMMATIK_EXTRA[g.pattern])||[];
    const all=(g.beispiele||[]).concat(extra);
    const ex=all.map(b=>'<li><span class="ex-jp">'+furiToRuby(b.jp)+'</span>'+
      (b.de?'<span class="ex-trans hideable">'+esc(b.de)+'</span>':'')+'</li>').join('');
    const drillable=all.filter(b=>b.jp&&b.de);
    const card=el('article','gp item collapsible collapsed'); card.dataset.filter=String(L);
    // Muster und Titel — weder Beispielsätze noch die Erklärtexte. Die Rōmaji stünden sonst nur in
    // den Beispielen (das Muster selbst ist rein japanisch), darum wird die Umschrift aus dem
    // MUSTER erzeugt: „のほうが“ → „nohouga“, damit „houga“ weiterhin trifft.
    card.dataset.search=grammarSearchIndex(g);
    card.innerHTML=
      '<div class="gp-head card-toggle">'+scoreBadgeHtml('g:'+g.pattern)+'<span class="gp-pattern">'+esc(g.pattern)+'</span>'+
      (g.title?'<span class="gp-title">'+esc(g.title)+'</span>':'')+'<span class="tag">L'+L+'</span>'+
      (window.SRS?'<button class="gp-add'+(inListCount('g:'+g.pattern)>0?' in-list':'')+'" type="button" title="'+esc(addBtnTitle('g:'+g.pattern,'Zur Lernliste hinzufügen'))+'" data-pattern="'+esc(g.pattern)+'">'+addBtnLabel('g:'+g.pattern)+'</button>':'')+
      '</div>'+
      '<div class="collapse-body">'+
      (g.bildung?'<div class="gp-bildung"><b>Bildung:</b> '+furiToRuby(g.bildung)+'</div>':'')+
      (g.tabelle?gpTable(g.tabelle):'')+
      (g.erklaerung?'<p class="gp-erk">'+furiToRuby(g.erklaerung)+'</p>':'')+
      (ex?'<ul class="gp-ex">'+ex+'</ul>':'')+
      '</div>';
    const plus=(window.GRAMMATIK_PLUS||{})[g.pattern];
    if(plus)card.querySelector('.collapse-body').appendChild(grammarPlusBlock(g,plus));
    // EIN „Üben"-Knopf: kombiniert Aufgaben (inkl. generierte て/た/ない) + Satz-Übersetzungen.
    const hasEx=!!VERB_FORM_PATTERNS[g.pattern]||!!(plus&&plus.uebungen&&plus.uebungen.length);
    if((drillable.length||hasEx)&&window.Exercises){
      const hint=(hasEx&&drillable.length)?'Aufgaben & Sätze':(hasEx?'Aufgaben':drillable.length+' Sätze · beide Richtungen');
      const btn=el('button','gp-learn gp-ueben','<span class="msi" aria-hidden="true">play_arrow</span> Üben <span class="gp-learn-n">'+hint+'</span>');
      btn.type='button';
      btn.addEventListener('click',()=>openGrammarPractice(g));
      card.querySelector('.collapse-body').appendChild(btn);
    }
    return card;
  }
  // Additiver „Mehr erklären"-Block + Übungen (window.Exercises) für Muster mit GRAMMATIK_PLUS.
  function grammarPlusBlock(g,plus){
    const wrap=el('div','gp-plus');
    if(plus.erklaerung_lang)wrap.appendChild(el('div','gp-plus-erk','<b>Mehr erklären:</b> '+furiToRuby(plus.erklaerung_lang)));
    if(plus.fehler&&plus.fehler.length){
      wrap.appendChild(el('div','gp-plus-h','Häufige Fehler'));
      const ul=el('ul','gp-fehler'); plus.fehler.forEach(f=>ul.appendChild(el('li',null,furiToRuby(f)))); wrap.appendChild(ul);
    }
    if(plus.kontrast&&plus.kontrast.length){
      wrap.appendChild(el('div','gp-plus-h','Abgrenzung'));
      const ul=el('ul','gp-kontrast');
      plus.kontrast.forEach(k=>ul.appendChild(el('li',null,'<span class="ja">'+furiToRuby(k.a)+'</span> ↔ <span class="ja">'+furiToRuby(k.b)+'</span> — '+esc(k.note))));
      wrap.appendChild(ul);
    }
    // Übungen werden nicht mehr hier gestartet, sondern über den EINEN „Üben"-Knopf der Karte
    // (kombinierte Session: Aufgaben + Satz-Übersetzungen). Dieser Block bleibt rein erklärend.
    return wrap;
  }
  // Aufgaben zu einem Grammatik-Muster: für Verb-Formen (て/た/ない) aus echten Verben generiert,
  // sonst die statischen GRAMMATIK_PLUS-Übungen. Liefert ein Array Exercises-kompatibler Objekte.
  function structuredExercises(pattern,plus){
    const form=VERB_FORM_PATTERNS[pattern];
    if(form){ const gen=genVerbFormExercises(form,6); if(gen.length)return gen; }
    return (plus&&plus.uebungen)?plus.uebungen.slice():[];
  }

  /* ---------- Angefangene Übungsrunden merken (Fortsetzen nach Schließen) ----------
     Wahrheit ist die Modulmap; sessionStorage ist nur ein Spiegel, damit eine Runde auch
     einen Seitenwechsel (listen.html ↔ liste.html) oder ein Neuladen übersteht. Der Spiegel
     darf nie allein tragen: bei leerer Herkunft (file://, jsdom, manche App-Umgebungen)
     wirft sessionStorage. Gespeichert wird die RESTLISTE + Anzahl erledigter Aufgaben —
     die Gesamtzahl ergibt sich daraus und heilt sich, wenn Einträge entfernt wurden. */
  const SESS_KEY='katalog_session_v1';
  const sessMem={};
  function sessAll(){ try{ return JSON.parse(sessionStorage.getItem(SESS_KEY))||{}; }catch(e){ return null; } }
  function sessGet(key){ const all=sessAll(); return (all&&all[key])||sessMem[key]||null; }
  function sessSet(key,val){ sessMem[key]=val; const all=sessAll(); if(all){ all[key]=val; try{ sessionStorage.setItem(SESS_KEY,JSON.stringify(all)); }catch(e){} } }
  function sessClear(key){ delete sessMem[key]; const all=sessAll(); if(all){ delete all[key]; try{ sessionStorage.setItem(SESS_KEY,JSON.stringify(all)); }catch(e){} } }
  // „↻ Neu starten“ im Overlay-Kopf — fragt nach, sobald schon Fortschritt besteht (der Knopf
  // sitzt in derselben Daumenzone, deren Fehlgriffe wir gerade abstellen).
  function restartButton(onRestart,hasProgress,text){
    const b=el('button','ov-restart','<span class="msi" aria-hidden="true">refresh</span>');
    b.type='button'; b.title='Runde neu starten'; b.setAttribute('aria-label','Runde neu starten');
    b.addEventListener('click',()=>{ if(hasProgress()&&!window.confirm(text||'Runde neu starten? Der bisherige Fortschritt dieser Runde geht verloren.'))return; onRestart(); });
    return b;
  }
  // „· fortgesetzt“-Markierung für die Fortschrittszeile (nur beim ersten Rendern nach dem Wiederaufnehmen).
  function resumedTag(on){ return on?' <span class="ov-resumed">fortgesetzt</span>':''; }

  /* ============================================================
     GRAMMATIK-DRILL — Beispielsätze in beide Richtungen übersetzen
     (Modal-Overlay, lazy aufgebaut, von der Grammatik-Karte gestartet)
     ============================================================ */
  let drill=null;
  function ensureDrillDom(){
    if(drill)return drill;
    const ov=el('div','drill-overlay'); ov.id='drill-overlay'; ov.hidden=true;
    ov.innerHTML=
      '<div class="drill-modal" role="dialog" aria-modal="true" aria-label="Grammatik üben">'+
        '<div class="drill-head">'+
          '<div class="drill-titlewrap"><span class="drill-pattern ja"></span><span class="drill-title"></span></div>'+
          '<button class="drill-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button>'+
        '</div>'+
        '<div class="drill-stage">'+
          '<div class="drill-top"><span class="drill-dir"></span><span class="drill-prog"></span></div>'+
          '<div class="drill-card">'+
            '<div class="drill-tr">'+
              '<div class="drill-prompt-lbl"></div>'+
              '<div class="drill-prompt"></div>'+
              '<div class="drill-answer hidden"><div class="drill-answer-lbl"></div><div class="drill-answer-txt"></div></div>'+
              '<div class="drill-controls">'+
                '<button class="btn-primary drill-reveal" type="button">Aufdecken <span class="kbd">Leertaste</span></button>'+
                '<button class="btn btn-again drill-again hidden" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>'+
                '<button class="btn btn-next drill-next hidden" type="button">Weiter →</button>'+
              '</div>'+
            '</div>'+
            '<div class="drill-ex hidden"></div>'+
          '</div>'+
          '<div class="drill-done hidden"></div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);
    const q=s=>ov.querySelector(s);
    drill={ ov, pattern:q('.drill-pattern'), title:q('.drill-title'), dir:q('.drill-dir'), prog:q('.drill-prog'),
      card:q('.drill-card'), trBox:q('.drill-tr'), exHost:q('.drill-ex'),
      promptLbl:q('.drill-prompt-lbl'), prompt:q('.drill-prompt'),
      answer:q('.drill-answer'), answerLbl:q('.drill-answer-lbl'), answerTxt:q('.drill-answer-txt'),
      reveal:q('.drill-reveal'), again:q('.drill-again'), next:q('.drill-next'), done:q('.drill-done'),
      close:q('.drill-close'), deck:[], total:0, build:null };
    drill.reveal.addEventListener('click',drillReveal);
    drill.next.addEventListener('click',drillNext);
    drill.again.addEventListener('click',drillAgain);
    drill.close.addEventListener('click',closeDrill);
    // Kein Schließen beim Klick auf den Hintergrund: mitten in der Übung war das ein
    // versehentlicher Abbruch. Beenden nur über ✕ oder Escape.
    drill.close.parentNode.insertBefore(restartButton(drillRestart,()=>drill.total>drill.deck.length),drill.close);
    document.addEventListener('keydown',drillKey);
    return drill;
  }
  function drillKey(e){
    if(!drill||drill.ov.hidden)return;
    if(e.key==='Escape'){ closeDrill(); return; }
    const cur=drill.deck[0];
    if(e.code==='Space' && cur && cur.kind==='tr'){ e.preventDefault();
      if(!drill.answer.classList.contains('hidden'))drillNext();
      else if(!drill.reveal.classList.contains('hidden'))drillReveal(); }
  }
  // Generische Übungs-Session: build() liefert ein frisches Deck aus
  // {kind:'tr',dir,b} (Satz übersetzen) und/oder {kind:'ex',ex,srsId} (Aufgabe via Exercises).
  function openPracticeSession(opts){
    const d=ensureDrillDom();
    d.pattern.textContent=opts.pattern||'';
    d.title.textContent=opts.title||'';
    d.build=opts.build;
    d.sKey='drill:'+(opts.key||opts.pattern||'x');
    // Angefangene Runde fortsetzen; eine bereits beantwortete Aufgabe wird dabei übersprungen
    // (sie ist schon in den Lernstand eingeflossen — erneut stellen hieße doppelt werten).
    const s0=sessGet(d.sKey); let deck=null;
    if(s0&&Array.isArray(s0.deck)&&s0.deck.length){
      deck=s0.deck.slice(); let done=s0.done|0;
      if(s0.answered){ deck.shift(); done++; }
      if(deck.length){ d.deck=deck; d.total=done+deck.length; d.resumed=true; } else deck=null;
    }
    if(!deck){ sessClear(d.sKey); d.deck=shuffle(d.build()); d.total=d.deck.length; d.resumed=false; }
    d.ov.hidden=false; document.body.classList.add('drill-open');
    drillRender();
  }
  // Eine Grammatik üben: Form-/MC-Aufgaben (inkl. generierte て/た/ない) + Satz-Übersetzungen.
  function openGrammarPractice(g){
    const plus=(window.GRAMMATIK_PLUS||{})[g.pattern]||{};
    const extra=(window.GRAMMATIK_EXTRA&&window.GRAMMATIK_EXTRA[g.pattern])||[];
    const all=(g.beispiele||[]).concat(extra);
    const drillable=all.filter(b=>b.jp&&b.de);
    openPracticeSession({ key:'g:'+g.pattern, pattern:g.pattern, title:g.title, build:()=>{
      const items=[];
      structuredExercises(g.pattern,plus).forEach(ex=>items.push({kind:'ex',ex:ex,srsId:'g:'+g.pattern}));
      drillable.forEach(b=>{ items.push({kind:'tr',dir:'jp2de',b:b}); items.push({kind:'tr',dir:'de2jp',b:b}); });
      return items;
    }});
  }
  function closeDrill(){ if(!drill)return; drill.ov.hidden=true; document.body.classList.remove('drill-open'); }
  function drillRestart(){ const d=drill; if(d.sKey)sessClear(d.sKey); d.resumed=false; d.deck=shuffle(d.build?d.build():[]); d.total=d.deck.length; drillRender(); }
  // Restliste + Anzahl erledigter Aufgaben sichern (answered = beantwortet, „Weiter“ noch offen).
  function drillSave(answered){ const d=drill; if(d&&d.sKey)sessSet(d.sKey,{deck:d.deck,done:d.total-d.deck.length,answered:!!answered}); }
  function drillRender(){
    const d=drill;
    if(!d.deck.length){
      d.card.classList.add('hidden'); d.done.classList.remove('hidden');
      d.dir.textContent=''; d.prog.textContent='';
      if(d.total){
        d.done.innerHTML='<div class="drill-done-in">Geschafft!<br>'+d.total+' Aufgaben erledigt.</div>'+
          '<button class="btn-primary drill-restart" type="button"><span class="msi" aria-hidden="true">refresh</span> Weiter üben</button>';
        d.done.querySelector('.drill-restart').addEventListener('click',drillRestart);
      } else {
        d.done.innerHTML='<div class="drill-done-in">Für diesen Punkt gibt es noch nichts zum Üben.</div>';
      }
      if(d.sKey)sessClear(d.sKey); // Runde durch → nichts mehr fortzusetzen
      return;
    }
    d.done.classList.add('hidden'); d.card.classList.remove('hidden');
    const learned=d.total-d.deck.length;
    d.prog.innerHTML='Aufgabe '+(learned+1)+' / '+d.total+resumedTag(d.resumed);
    d.resumed=false;
    drillSave(false);
    const c=d.deck[0];
    if(c.kind==='ex'){
      d.trBox.classList.add('hidden'); d.exHost.classList.remove('hidden'); d.exHost.innerHTML='';
      d.dir.textContent='Aufgabe';
      const ex=Object.assign({},c.ex,{srsId:c.srsId});
      window.Exercises.renderExercise(ex,d.exHost,{ onResult:()=>{
        drillSave(true); // bewertet — beim Fortsetzen wird diese Aufgabe übersprungen
        d.exHost.appendChild(makeNextButton(drillNext,'drill-ex-next'));
      }});
      return;
    }
    // kind 'tr' — Satz übersetzen (Aufdecken/Selbstkontrolle)
    d.exHost.classList.add('hidden'); d.trBox.classList.remove('hidden');
    const b=c.b;
    const jpHtml='<div class="drill-jp ja">'+furiToRuby(b.jp)+'</div>';
    const deHtml='<div class="drill-de">'+esc(b.de)+'</div>';
    if(c.dir==='jp2de'){
      d.dir.innerHTML='<span class="ja">日本語</span> → Deutsch';
      d.promptLbl.textContent='Übersetze ins Deutsche:';
      d.prompt.innerHTML=jpHtml;
      d.answerLbl.textContent='Deutsch';
      d.answerTxt.innerHTML=deHtml;
    } else {
      d.dir.innerHTML='Deutsch → <span class="ja">日本語</span>';
      d.promptLbl.textContent='Übersetze ins Japanische:';
      d.prompt.innerHTML=deHtml;
      d.answerLbl.textContent='日本語';
      d.answerTxt.innerHTML=jpHtml;
    }
    d.answer.classList.add('hidden');
    d.reveal.classList.remove('hidden'); d.again.classList.add('hidden'); d.next.classList.add('hidden');
  }
  function drillReveal(){ const d=drill; d.answer.classList.remove('hidden'); d.reveal.classList.add('hidden');
    d.again.classList.remove('hidden'); d.next.classList.remove('hidden'); }
  function drillNext(){ drill.deck.shift(); drillRender(); }
  function drillAgain(){ const c=drill.deck.shift(); drill.deck.push(c); drillRender(); }

  /* ============================================================  VERBEN  */
  function renderVerben(content){
    const verbs=(window.VOKABULAR||[]).filter(v=>/^V\./.test(v.pos||''));
    const seen={}, list=[];
    verbs.forEach(v=>{
      const g=verbGroup(v.pos); if(!g)return;
      const kana=allForms(v.kana,g); if(!kana)return;
      if(seen[kana.dict])return; seen[kana.dict]=1;
      const dispSrc=writtenForm(v);
      const disp=allForms(dispSrc,g)||kana;
      list.push({v,g,kana,disp});
    });
    [1,2,3].forEach(g=>{
      const arr=list.filter(o=>o.g===g); if(!arr.length)return;
      const group=el('section','group'); group.dataset.group=String(g);
      group.appendChild(groupHead(VERB_GROUP_NAMES[g],'aus der Wörterbuchform gebildet',arr.length));
      const grid=el('div','verb-grid'); arr.forEach(o=>grid.appendChild(verbCard(o)));
      group.appendChild(grid); content.appendChild(group);
    });
    buildChips([1,2,3], g=>VERB_GROUP_SHORT[g]);
    // Klick auf den Karten-Kopf klappt die Verbkarte auf/zu; Klick/Enter auf eine Form-Zeile zeigt die Bildungsregel.
    const toggleRow=row=>{ const open=row.classList.toggle('open'); row.setAttribute('aria-expanded',open?'true':'false'); };
    content.addEventListener('click',e=>{ const h=e.target.closest('.card-toggle');
      if(h){ const card=h.closest('.collapsible'); if(card)card.classList.toggle('collapsed'); return; }
      const row=e.target.closest('.vf-row'); if(row)toggleRow(row); });
    content.addEventListener('keydown',e=>{ if(e.key!=='Enter'&&e.code!=='Space')return; const row=e.target.closest('.vf-row'); if(row){ e.preventDefault(); toggleRow(row); } });
  }
  const VERB_ROWS=[['Wörterbuchform','dict'],['höflich (ます-Form)','masu'],['höflich verneint (ません-Form)','masen'],
    ['Vergangenheit (た-Form)','ta'],['Verbindung (て-Form)','te'],['Verneinung (ない-Form)','nai'],
    ['Wunsch (たい-Form)','tai'],['Vorschlag (ましょう-Form)','mashou']];
  // Kurze Bildungsregel je Form; bei dict/ta/te/nai gruppenabhängig (g = 1/2/3).
  function verbRule(key,g){
    const R={
      dict:{1:'ます-Stamm: letztes „-i“ → „-u“ (かきます→かく).',2:'ます-Stamm + る (たべます→たべる).',3:'unregelmäßig: します→する, きます→くる.'},
      masu:{0:'Die höfliche Grundform auf ～ます.'},
      masen:{0:'～ます → ～ません (höfliche Verneinung).'},
      ta:{1:'wie die te-Form, aber ～た／～だ statt ～て／～で (かいて→かいた, よんで→よんだ).',2:'ます-Stamm + た (たべた).',3:'しました→した, きました→きた.'},
      te:{1:'う・つ・る→って, む・ぶ・ぬ→んで, く→いて, ぐ→いで, す→して. Ausnahme: 行く→行って.',2:'ます-Stamm + て (たべて).',3:'します→して, きます→きて.'},
      nai:{1:'Wörterbuchform „-u“ → „-a“ + ない (かく→かかない); ～う → ～わない.',2:'ます-Stamm + ない (たべない).',3:'します→しない, きます→こない.'},
      tai:{0:'ます-Stamm + たい (たべます→たべたい).'},
      mashou:{0:'～ます → ～ましょう (Vorschlag „lass uns …“).'}
    };
    const m=R[key]||{}; return m[g]||m[0]||'';
  }
  /* Die Formen-Tabelle als reiner String — geteilt von der Verbkarte (verben.html) und dem
     Formen-Popup, damit VERB_ROWS und verbRule die einzige Quelle bleiben. */
  function verbFormsTableHtml(g,kana,disp){
    return VERB_ROWS.map(([lbl,key])=>{
      const rule=verbRule(key,g);
      return '<tr class="vf-row" tabindex="0" role="button" aria-expanded="false"><th>'+lbl+
        (rule?'<div class="vf-rule"><b>Bildung:</b> '+rule+'</div>':'')+
        '</th><td class="ja">'+rubyPair(disp[key],kana[key])+'</td></tr>';
    }).join('');
  }
  function verbCard(o){
    const {v,g,kana,disp}=o;
    const body=verbFormsTableHtml(g,kana,disp);
    const gname=VERB_GROUP_SHORT[g];
    const card=el('article','verb-card item collapsible collapsed'); card.dataset.filter=String(g);
    card.dataset.search=norm([v.kana,v.kanji,v.romaji,v.de,Object.keys(kana).map(k=>kana[k]+' '+kanaToRomaji(kana[k])).join(' ')].join(' '));
    card.innerHTML=
      '<div class="vc-head card-toggle"><span class="vc-dict ja">'+rubyPair(disp.dict,kana.dict)+'</span>'+
      '<span class="tag">'+gname+' · L'+v.lesson+'</span></div>'+
      '<div class="vc-de">'+esc(v.de)+'</div>'+
      '<div class="collapse-body"><table class="vforms hideable">'+body+'</table></div>';
    return card;
  }

  /* ---------- gemeinsame Bausteine ---------- */
  function groupHead(title,theme,n){
    const h=el('div','group-head');
    h.innerHTML='<h2>'+esc(title)+'</h2>'+(theme?'<span class="theme">'+esc(theme)+'</span>':'')+'<span class="gcount">'+n+'</span>';
    return h;
  }
  // Lernstand-Schwellen: 0 = Knospe (noch nicht gelernt), dann alle 20 % ein Blütenblatt.
  // Einzige Quelle ist SRS; Fallback identisch, falls srs.js (noch) nicht geladen ist.
  const SCORE_THRESHOLDS=(window.SRS&&window.SRS.SCORE_THRESHOLDS)||[20,40,60,80,100];
  // Effektiver Lernstand (0–100) eines Items.
  function itemScore(id){ return (window.SRS&&window.SRS.effectiveScore)?window.SRS.effectiveScore(id):0; }
  // Mini-Blüte (HTML) für den Lernstand eines einzelnen Items (Vokabel/Grammatik/Kanji).
  function scoreBadgeHtml(id){
    if(!(window.SRS&&window.SRS.effectiveScore))return '';
    const v=Math.round(itemScore(id));
    return '<span class="grp-flower lernstand" title="Lernstand '+v+' %">'+sakuraSvg(v,SCORE_THRESHOLDS,{cls:'sakura-sm'})+'</span>';
  }
  // Durchschnittlicher Lernstand der Items einer Lektion (über alle Kern-Items, ungesehene zählen 0).
  function lessonScoreAvg(L,type){
    if(!(window.SRS&&window.SRS.lessonCore&&window.SRS.effectiveScore))return 0;
    const core=window.SRS.lessonCore(L).filter(c=>!type||c.type===type);
    if(!core.length)return 0;
    let sum=0; core.forEach(c=>{ sum+=window.SRS.effectiveScore(c.id); });
    return sum/core.length;
  }
  // Kreis-Fortschrittsanzeige (SVG): pct 0–100 mit Beschriftung in der Mitte.
  function ringSvg(pct,centerBig,centerSmall){
    const r=42, c=2*Math.PI*r, off=c*(1-Math.max(0,Math.min(100,pct))/100);
    return '<svg viewBox="0 0 100 100" class="f-ring-svg" role="img" aria-label="'+esc(centerBig+' '+centerSmall)+'">'+
      '<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="var(--border)" stroke-width="9"/>'+
      '<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" '+
        'stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 50 50)"/>'+
      '<text x="50" y="49" text-anchor="middle" class="f-ring-big">'+esc(centerBig)+'</text>'+
      '<text x="50" y="64" text-anchor="middle" class="f-ring-small">'+esc(centerSmall)+'</text></svg>';
  }
  // Profil-Gesamtüberblick: Ring (gemeistert %), Balken je Typ, Blütenstufen-Verteilung.
  function drawOverview(cs){
    const ringPct=cs.total?Math.round(cs.mastered/cs.total*100):0;
    setHtml('f-ring',ringSvg(ringPct,ringPct+'%','gemeistert'));
    const TYPES=[['vocab','語彙 Vokabeln'],['grammar','文法 Grammatik'],['kanji','漢字 Kanji']];
    setHtml('f-typebars',TYPES.map(([k,lbl])=>{ const t=cs.byType[k]||{total:0,mastered:0,avg:0};
      const pct=t.total?Math.round(t.mastered/t.total*100):0;
      return '<div class="f-typebar"><div class="f-typebar-top"><span>'+esc(lbl)+'</span>'+
        '<span class="f-typebar-n">'+t.mastered+' / '+t.total+'</span></div>'+
        '<div class="f-bar2"><span style="width:'+pct+'%"></span></div></div>';
    }).join(''));
    const max=Math.max(1,...cs.petals);
    setHtml('f-dist',cs.petals.map((n,i)=>'<div class="f-distcol" title="'+n+' Inhalte · '+i+' Blütenblätter">'+
      '<div class="f-distbar-wrap"><div class="f-distbar" style="height:'+Math.round(n/max*100)+'%"></div></div>'+
      '<span class="f-distn">'+n+'</span>'+sakuraSvg(i*20,SCORE_THRESHOLDS,{cls:'sakura-sm'})+'</div>').join(''));
  }

  // Intensitätsstufe (0–4) eines Tages für die Heatmap, anhand der gesammelten Punkte.
  function actLevel(gain){ if(gain<=0)return 0; if(gain<=20)return 1; if(gain<=60)return 2; if(gain<=120)return 3; return 4; }
  // Wochentag Mo=0 … So=6 für ein ISO-Datum (UTC, ohne Zeitzonendrift).
  function isoWeekday(iso){ const p=String(iso).split('-'); return (new Date(Date.UTC(+p[0],+p[1]-1,+p[2])).getUTCDay()+6)%7; }
  // Punkte-pro-Tag-Balken (Verlauf der letzten `days` Tage).
  function activityBars(days){
    if(!window.SRS||!window.SRS.dailyHistory)return '';
    const h=window.SRS.dailyHistory(undefined,days), max=Math.max(1,...h.map(d=>d.gain));
    return h.map(d=>'<div class="act-bar" title="'+esc(d.date)+' · '+d.gain+' Punkte">'+
      '<span class="act-bar-fill" style="height:'+Math.round(d.gain/max*100)+'%"></span></div>').join('');
  }
  // Aktivitäts-Kalender (Heatmap): Wochen als Spalten, Wochentage (Mo–So) als Zeilen.
  function activityCalendar(days){
    if(!window.SRS||!window.SRS.dailyHistory)return '';
    const h=window.SRS.dailyHistory(undefined,days);
    let cells='';
    const lead=isoWeekday(h[0].date);
    for(let i=0;i<lead;i++)cells+='<span class="cal-cell cal-pad" aria-hidden="true"></span>';
    h.forEach(d=>{ cells+='<span class="cal-cell l'+actLevel(d.gain)+'" title="'+esc(d.date)+' · '+d.gain+' Punkte"></span>'; });
    return '<div class="cal-grid">'+cells+'</div>';
  }

  // Sakura-Lernstand-Indikator je Lektion (Ø-Lernstand der Items).
  function lessonRepsBadge(L,type){
    const avg=lessonScoreAvg(L,type);
    const s=el('span','grp-flower',sakuraSvg(avg,SCORE_THRESHOLDS,{cls:'sakura-sm'}));
    s.title='Ø Lernstand '+Math.round(avg)+' %';
    return s;
  }
  function buildChips(values,labelFn){
    const box=document.getElementById('filters'); if(!box)return;
    const mk=(val,label)=>{ const c=el('button','chip'+(val==='all'?' on':'')); c.textContent=label; c.dataset.val=val;
      c.addEventListener('click',()=>{ activeFilter=val; box.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.val===val)); applyFilter(); }); return c; };
    box.appendChild(mk('all','Alle'));
    values.forEach(v=>box.appendChild(mk(String(v),labelFn(v))));
  }
  // Wortart-Chips (nur Vokabular-Seite).
  // Ohne Argument die Wortarten (Vokabular-Seite); mit defs eine andere Chip-Reihe (Listen-Detailseite).
  function buildTypeChips(defs){
    const box=document.getElementById('type-filters'); if(!box)return;
    defs=defs||[['all','Alle'],['noun','Nomen'],['verb','Verben'],['adj','Adjektive'],['adv','Adverbien'],['part','Partikel']];
    defs.forEach(([val,label])=>{ const c=el('button','chip'+(val==='all'?' on':'')); c.textContent=label; c.dataset.tval=val;
      c.addEventListener('click',()=>{ activeType=val; box.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.tval===val)); applyFilter(); });
      box.appendChild(c); });
  }
  function applyFilter(){
    const q=norm(query.trim()); let shown=0;
    // Zusätzlich ohne Leerzeichen vergleichen: „hou ga“ soll die zusammenhängende Umschrift
    // „nohouga“ treffen. Die Indizes führen dafür eine leerzeichenfreie Zweitfassung.
    const qs=q.replace(/\s+/g,'');
    document.body.classList.toggle('searching',q.length>0);
    items.forEach(it=>{ const idx=it.dataset.search||'';
      const okF=activeFilter==='all'||it.dataset.filter===activeFilter;
      const okQ=searchHit(idx,q,qs);
      const okT=activeType==='all'||it.dataset.type===activeType;
      const vis=okF&&okQ&&okT; it.classList.toggle('hidden',!vis); if(vis)shown++; });
    groups.forEach(g=>{ const n=g.querySelectorAll('.item:not(.hidden)').length; g.classList.toggle('hidden',n===0);
      const gc=g.querySelector('.gcount'); if(gc)gc.textContent=n; });
    const c=document.getElementById('count'); if(c)c.textContent='Zeige '+shown+' von '+items.length+' Einträgen';
    const empty=document.getElementById('empty'); if(empty)empty.classList.toggle('hidden',shown!==0);
  }

  /* ============================================================  SCHALTER  */
  function setPressed(btn,on){ if(btn)btn.setAttribute('aria-pressed',on?'true':'false'); }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function initToggles(){
    const body=document.body;
    // Furigana (Standard: AN) — blendet Lesung über Kanji + Kana-Spalte aus
    const furiOn=lsGet('katalog_furigana')!=='off';
    body.classList.toggle('furigana-off',!furiOn);
    const fBtn=document.getElementById('toggle-readings'); setPressed(fBtn,furiOn);
    if(fBtn)fBtn.addEventListener('click',()=>{ const off=body.classList.toggle('furigana-off'); setPressed(fBtn,!off); lsSet('katalog_furigana',off?'off':'on'); });
    // Karteikarten (Standard: AUS)
    const cardsOn=lsGet('katalog_cards')==='on';
    body.classList.toggle('cards-mode',cardsOn);
    const cBtn=document.getElementById('toggle-cards'); setPressed(cBtn,cardsOn);
    if(cBtn)cBtn.addEventListener('click',()=>{ const on=body.classList.toggle('cards-mode'); setPressed(cBtn,on); lsSet('katalog_cards',on?'on':'off');
      if(on)document.querySelectorAll('.hideable.revealed').forEach(e=>e.classList.remove('revealed')); });
    document.addEventListener('click',e=>{ if(!body.classList.contains('cards-mode'))return; const h=e.target.closest('.hideable'); if(h)h.classList.toggle('revealed'); });
    // Filter (Standard: eingeklappt) — blendet die Filter-Chips auf dem Handy aus, spart Platz
    const filtersOpen=lsGet('katalog_filters')==='open';
    body.classList.toggle('filters-collapsed',!filtersOpen);
    const fltBtn=document.getElementById('toggle-filters'); setPressed(fltBtn,filtersOpen);
    if(fltBtn)fltBtn.addEventListener('click',()=>{ const open=!body.classList.toggle('filters-collapsed'); setPressed(fltBtn,open); lsSet('katalog_filters',open?'open':'collapsed'); });
    applyFilter();
  }
  function initSearch(){ const input=document.getElementById('search-input'); if(!input)return;
    input.addEventListener('input',()=>{ query=input.value; applyFilter(); });
    // Gefiltert wird live beim Tippen — die „Suchen“-Taste hat also nichts mehr zu tun und soll
    // nur noch die Bildschirmtastatur schließen, die sonst die Trefferliste verdeckt.
    input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); input.blur(); } });
  }

  /* ============================================================  Karteikarten-Helfer (Heute)  */
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function frontHtml(c){
    if(c.t==='kanji')return '<div class="tr-big ja">'+esc(c.d.k)+'</div><div class="tr-q">On-/Kun-Lesung & Bedeutung?</div>';
    if(c.t==='vocab'){ const v=c.d, dd=verbDictDisplay(v);
      const w=dd?dd.written:(writtenForm(v)), r=dd?dd.kana:v.kana;
      return '<div class="tr-word ja">'+ruby(w,r)+'</div><div class="tr-q">Lesung & Bedeutung?</div>'; }
    return '<div class="tr-pat ja">'+esc(c.d.pattern)+'</div><div class="tr-q">Bedeutung & Bildung?</div>';
  }
  function backHtml(c){
    if(c.t==='kanji'){ const k=c.d, onr=(k.on||[]).join('・'), kunr=(k.kun||[]).join('・');
      const ex=(k.examples||[]).slice(0,2).map(e=>'<div class="ex"><span class="ex-w">'+ruby(e.w,e.r)+'</span><span class="ex-de">'+esc(e.m)+'</span></div>').join('');
      return '<div class="tr-mean">'+esc(k.meaning)+'</div><div class="readings">'+
        (onr?'<div class="reading-row"><span class="lbl">音</span><span class="vals">'+esc(onr)+'</span></div>':'')+
        (kunr?'<div class="reading-row"><span class="lbl kun">訓</span><span class="vals">'+esc(kunr)+'</span></div>':'')+'</div>'+
        (ex?'<div class="kc-examples">'+ex+'</div>':''); }
    if(c.t==='vocab'){ const v=c.d, dd=verbDictDisplay(v);
      const written=dd?dd.written:(writtenForm(v)), read=dd?dd.kana:v.kana;
      const bsp=(window.VOKABULAR_BEISPIELE||{})[v.kana+'|'+v.lesson];
      // Rückseite = aufgeklappt: hier erscheint bei Verben auch die ます-Form.
      const masu=dd?'<div class="tr-masu"><span class="v-masu-lbl">ます-Form</span> <span class="ja">'+esc(masuPrompt(v))+'</span></div>':'';
      return '<div class="tr-answer-jp ja">'+ruby(written,read)+'</div>'+
      '<div class="tr-mean">'+esc(v.de)+'</div>'+masu+
      '<div class="tr-tag"><span class="pos">'+esc(v.pos)+'</span> · Lektion '+v.lesson+'</div>'+
      (bsp?'<div class="v-bsp"><div class="v-bsp-jp ja">'+furiToRuby(bsp.jp)+'</div>'+
        (bsp.r?'<div class="v-bsp-r">'+esc(bsp.r)+'</div>':'')+
        '<div class="v-bsp-de">'+esc(bsp.de)+'</div>'+
        (bsp.note?'<div class="v-note">'+esc(bsp.note)+'</div>':'')+'</div>':''); }
    const g=c.d, ex=(g.beispiele||[]).slice(0,2).map(b=>'<li><span class="ex-jp">'+furiToRuby(b.jp)+'</span>'+
      '<span class="ex-trans">'+esc(b.de)+'</span></li>').join('');
    return '<div class="tr-mean">'+esc(g.title||'')+' <span class="tag">L'+g.lesson+'</span></div>'+
      (g.bildung?'<div class="gp-bildung"><b>Bildung:</b> '+furiToRuby(g.bildung)+'</div>':'')+
      (g.erklaerung?'<p class="gp-erk">'+furiToRuby(g.erklaerung)+'</p>':'')+(ex?'<ul class="gp-ex">'+ex+'</ul>':'');
  }

  /* ============================================================  HEUTE (Tagesaufgabe)  */
  function setText(id,v){ const e=document.getElementById(id); if(e)e.textContent=v; }
  function setHtml(id,h){ const e=document.getElementById(id); if(e)e.innerHTML=h; }
  function clampInt(id,dflt){ const e=document.getElementById(id); let n=e?parseInt(e.value,10):dflt; if(isNaN(n)||n<0)n=dflt; return n; }
  function initHeute(){
    const stage=document.getElementById('h-stage'); if(!stage||!window.SRS)return;
    const setup=document.getElementById('h-setup'), body=document.getElementById('h-body'),
      prog=document.getElementById('h-prog'), typeTag=document.getElementById('h-type'),
      done=document.getElementById('h-done'), startBtn=document.getElementById('h-start');
    let deck=[], total=0;
    const params=new URLSearchParams(location.search);
    const lessonParam=parseInt(params.get('lesson'),10);
    const onlyLesson=isNaN(lessonParam)?null:lessonParam;
    // Teil-Lektion: ?teil=k (1-basiert). Fehlt er → nächster offener Teil. Auf den freigeschalteten
    // Bereich klammern (kein Sprung über die strikte Reihenfolge).
    let lessonPart=null;
    if(onlyLesson!=null&&window.SRS.lessonChunks){
      const n=window.SRS.lessonChunks(onlyLesson).length;
      const tp=parseInt(params.get('teil'),10);
      const want=isNaN(tp)?window.SRS.nextPart(onlyLesson):tp;
      lessonPart=Math.max(1,Math.min(want,window.SRS.nextPart(onlyLesson),n||1));
    }
    function refreshStats(){ const s=window.SRS.stats(); setText('h-streak',s.streakDays); setText('h-due',s.due); setText('h-learned',s.learned); setHtml('h-streak-flower',sakuraSvg(s.streakDays)); }
    // Geführter Kurs EINES TEILS einer Lektion (~5–10 Min): NUR neue Items dieses Teils, didaktisch
    // geordnet Vokabeln → Grammatik → Beispiele → Kanji → Beispiele nochmal. Leer, wenn Teil schon gelernt.
    function buildLessonCourse(L,part){
      const chunks=window.SRS.lessonChunks(L); if(!chunks.length)return [];
      part=part||window.SRS.nextPart(L);
      const chunk=chunks[part-1]||[];
      // „Neu" = noch nicht gestartet (kanonisch über lessonPlan); auf die Items dieses Teils einschränken.
      const plan=window.SRS.lessonPlan(L), newIds={};
      ['vocab','grammar','kanji'].forEach(t=>plan[t].forEach(c=>{newIds[c.id]=1;}));
      const fresh=chunk.filter(c=>newIds[c.id]);
      if(!fresh.length)return [];
      const d=[], step=(c,phase,mode,reason)=>d.push({id:c.id,type:c.type,data:c.data,reason:reason||'new',phase:phase,mode:mode});
      const vocab=fresh.filter(c=>c.type==='vocab'), grammar=fresh.filter(c=>c.type==='grammar'), kanji=fresh.filter(c=>c.type==='kanji');
      // Jedes neue Item: erst VORSTELLEN, dann SOFORT abprüfen (zentrale Registry liefert die Übung).
      vocab.forEach(c=>{ step(c,'Vokabeln','teach'); step(c,'Vokabeln','ex'); });
      // Grammatik umfangreich: Muster ausführlich VORSTELLEN, dann mit mehreren Übungen FESTIGEN (jedes Muster).
      grammar.forEach(c=>{ step(c,'Grammatik','teach'); grammarPracticeSteps(c).forEach(s=>d.push(s)); });
      // Kanji: kurz vorstellen, dann direkt schreiben (das Schreiben ist die erste Prüfung).
      kanji.forEach(c=>{ step(c,'Kanji','teach'); step(c,'Kanji','write'); });
      return d;
    }
    // Übungs-Schritte zu einem Grammatik-Muster: zuerst die GRAMMATIK_PLUS-Aufgaben (mc/cloze) — für JEDES
    // Muster vorhanden —, dann eine Satzbau-Aufgabe aus SATZ_TEMPLATES, falls es welche gibt.
    function grammarPracticeSteps(c){
      const pat=c.data.pattern, out=[];
      const plus=(window.GRAMMATIK_PLUS||{})[pat], uebs=(plus&&plus.uebungen)||[];
      uebs.slice(0,3).forEach(u=>out.push({id:c.id,type:'grammar',data:c.data,reason:'practice',phase:'Grammatik üben',mode:'gex',
        ex:Object.assign({},u,{srsId:c.id})}));
      if(window.SATZ_TEMPLATES&&window.SATZ_TEMPLATES[pat]&&window.Exercises)
        out.push({id:c.id,type:'grammar',data:c.data,reason:'example',phase:'Grammatik üben',mode:'exercise'});
      return out;
    }
    function start(){
      if(onlyLesson!=null){
        // Lernpfad-Modus: geführter Kurs des aktuellen Teils der Lektion (nur neue Items, in Phasen).
        deck=buildLessonCourse(onlyLesson,lessonPart);
      } else {
        // Heute = reine Wiederholung: nur fällige (zerfallene) Items aus allen freigeschalteten Lektionen.
        deck=window.SRS.buildQueue({sources:['kanji','vocab','grammar'],newLimit:0,reviewLimit:clampInt('h-revlimit',30),maxLesson:window.SRS.maxUnlockedLesson()});
        // Übungstyp je Item adaptiv aus der zentralen Registry (in render() über pickExercise).
      }
      total=deck.length; setup.classList.add('hidden'); done.classList.add('hidden'); stage.classList.remove('hidden'); render();
    }
    // Fehler-Feedback: kurzer Hinweis bei falscher Antwort (Beispiel/Notiz bzw. typischer Grammatikfehler).
    function mistakeHint(c){
      if(c.type==='vocab'){ const b=(window.VOKABULAR_BEISPIELE||{})[c.data.kana+'|'+c.data.lesson];
        return b?'<div class="fb-hint"><span class="ja">'+furiToRuby(b.jp)+'</span> — '+esc(b.de)+(b.note?'<div class="v-note">'+esc(b.note)+'</div>':'')+'</div>':''; }
      if(c.type==='grammar'){ const p=(window.GRAMMATIK_PLUS||{})[c.data.pattern];
        const f=p&&((p.fehler&&p.fehler[0])||p.erklaerung_lang);
        return f?'<div class="fb-hint"><b>Tipp:</b> '+furiToRuby(String(f))+'</div>':''; }
      return '';
    }
    function finishItem(grade){ const c=deck[0]; if(grade!=null&&c)window.SRS.grade(c.id,grade); deck.shift(); refreshStats(); render(); }
    function render(){
      if(!deck.length){ stage.classList.add('hidden'); done.classList.remove('hidden');
        // Tagesaufgabe abgeschlossen → Streak genau einmal pro Tag hochzählen (nicht bei Einzel-Bewertungen).
        if(total>0){ window.SRS.completeDaily(); refreshStats(); }
        if(onlyLesson!=null){
          // Teil durchgearbeitet → strikt sequenziell als erledigt markieren (auch wenn er schon gelernt war).
          const nParts=window.SRS.lessonChunks(onlyLesson).length||1;
          window.SRS.markPartDone(onlyLesson,lessonPart);
          if(lessonPart<nParts){
            // Es gibt noch weitere Teile → direkt zum nächsten anbieten.
            done.innerHTML='<div class="tr-done-in">Teil '+lessonPart+' von '+nParts+' geschafft! 🌸<br>Weiter mit dem nächsten kurzen Teil oder Pause machen.</div>'+
              '<a class="btn-primary" href="heute.html?lesson='+onlyLesson+'&teil='+(lessonPart+1)+'"><span class="msi" aria-hidden="true">play_arrow</span> Nächster Teil</a>'+
              '<a class="btn" href="lernpfad.html"><span class="msi" aria-hidden="true">route</span> Zum Lernpfad</a>';
          } else {
            // Letzter Teil → ganze Lektion eingeführt → zum Lektionstest.
            done.innerHTML='<div class="tr-done-in">'+(total?'Lektion '+onlyLesson+' komplett durchgearbeitet! 🌸':'Alle Inhalte dieser Lektion sind gelernt.')+
              '<br>Jetzt im Lernpfad den <b>Lektionstest</b> machen, um die nächste freizuschalten.</div>'+
              '<a class="btn-primary" href="lernpfad.html"><span class="msi" aria-hidden="true">route</span> Zum Lernpfad</a>';
          }
          return;
        }
        done.innerHTML=(total?'<div class="tr-done-in">Wiederholung geschafft!<br>'+total+' Aufgaben erledigt.</div>':'<div class="tr-done-in">Heute nichts fällig — alles frisch. 🌸</div>')+
          '<button class="btn-primary" id="h-again" type="button"><span class="msi" aria-hidden="true">refresh</span> Noch eine Runde</button>';
        const a=document.getElementById('h-again'); if(a)a.addEventListener('click',()=>{ done.classList.add('hidden'); setup.classList.remove('hidden'); refreshStats(); });
        return; }
      const c=deck[0], learned=total-deck.length;
      const nParts=onlyLesson!=null?(window.SRS.lessonChunks(onlyLesson).length||1):0;
      prog.textContent=(onlyLesson!=null&&c.phase?c.phase+' · ':'')+'Aufgabe '+(learned+1)+' / '+total+(onlyLesson!=null?' · Lektion '+onlyLesson+' · Teil '+lessonPart+'/'+nParts:'');
      const modeLbl={teach:' · vorstellen',recognize:' · erkennen',type:' · tippen',gex:' · üben'}[c.mode];
      const reasonLbl=modeLbl||(c.reason==='due'?' · Wiederholung':(c.reason==='example'?' · Beispiel':' · neu'));
      typeTag.textContent=({kanji:'漢字 Kanji',vocab:'語彙 Vokabel',grammar:'文法 Grammatik'}[c.type]||'')+reasonLbl;
      typeTag.className='tag tr-type-'+c.type;
      // Modus aus dem Kurs/adaptiv (teach/recognize/type/gex/card/exercise/write) bzw. Auto-Routing in der Wiederholung.
      const canWrite=window.KanjiWrite, canEx=window.Exercises&&window.SATZ_TEMPLATES&&window.SATZ_TEMPLATES[c.data.pattern];
      const canReg=window.Exercises&&window.Exercises.pickExercise;
      if(c.mode==='teach')renderTeachCard(c);
      else if(c.mode==='recognize')renderRecognizeCard(c);
      else if(c.mode==='type'&&c.type==='vocab'&&window.Exercises&&window.Exercises.acceptsVocabInput)renderTypeCard(c);
      else if(c.mode==='gex'&&c.ex&&window.Exercises)renderGrammarExercise(c);
      else if(c.mode==='write'&&canWrite)renderWriteCard(c);
      else if(c.mode==='exercise'&&canEx)renderExerciseItem(c);
      // „ex" (Kurs-Prüfung) und Wiederholung (mode==null) ziehen die Übung adaptiv aus der zentralen Registry.
      else if((c.mode==='ex'||c.mode==null)&&canReg)renderRegistryItem(c);
      else renderFlashcard(c);
    }
    // GRAMMATIK ÜBEN: eine statische GRAMMATIK_PLUS-Aufgabe (mc/cloze) rendern; sie wertet selbst über ex.srsId.
    function renderGrammarExercise(c){
      body.innerHTML='<div class="tr-card"><div class="h-ex-pat ja">'+esc(c.data.pattern)+'</div>'+
        (c.data.title?'<div class="tr-q">'+esc(c.data.title)+'</div>':'')+'<div class="h-ex"></div><div class="h-next-wrap"></div></div>';
      const mount=body.querySelector('.h-ex'), nextWrap=body.querySelector('.h-next-wrap');
      window.Exercises.renderExercise(c.ex,mount,{ onResult:(ok)=>{
        if(ok===false){ const h=mistakeHint(c); if(h)nextWrap.insertAdjacentHTML('beforebegin',h); }
        nextWrap.appendChild(makeNextButton(()=>finishItem(null),'h-next')); } });
    }
    // TIPPEN (Produktion): Bedeutung → japanisches Wort eingeben. Romaji, Kana/Furigana ODER Kanji gelten als richtig.
    function renderTypeCard(c){
      const v=c.data;
      const forms=[]; if(v.kanji&&v.kanji.length)forms.push(v.kanji); forms.push(v.kana); if(v.romaji)forms.push(v.romaji);
      body.innerHTML='<div class="tr-card ty-card"><div class="ty-q"><div class="tr-q">Wie heißt dieses Wort auf Japanisch?</div>'+
        '<div class="ty-de">'+esc(v.de)+'</div>'+(v.pos?'<div class="tc-pos">'+esc(v.pos)+'</div>':'')+'</div>'+
        '<input class="ex-input ty-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Romaji, Kana oder Kanji …">'+
        '<div class="ty-fb" aria-live="polite"></div>'+
        '<div class="tr-controls"><button class="btn-primary ty-btn" type="button">Prüfen</button></div></div>';
      const input=body.querySelector('.ty-input'), fb=body.querySelector('.ty-fb'), btn=body.querySelector('.ty-btn');
      let checked=false, ok=false;
      input.focus();
      function check(){
        ok=!!window.Exercises.acceptsVocabInput(input.value,v); checked=true;
        input.disabled=true; input.classList.add(ok?'ty-ok':'ty-bad');
        fb.innerHTML=(ok?'<span class="ty-good">Richtig!</span> ':'<span class="ty-wrong">Korrekt:</span> ')+
          '<span class="ja">'+esc(forms.join(' · '))+'</span>'+(ok?'':mistakeHint(c));
        btn.textContent='Weiter →';
      }
      btn.addEventListener('click',()=>{ if(!checked)check(); else finishItem(ok?1:0); });
      input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); btn.click(); } });
    }
    // VORSTELLEN: das neue Item komplett zeigen (Wort/Muster + Lesung + Bedeutung + Beispiel) — kein Raten.
    function renderTeachCard(c){
      const d=c.data; let inner;
      if(c.type==='vocab'){
        const written=writtenForm(d);
        const showKana=(d.kanji&&d.kanji.length&&d.kanji!==d.kana);
        const bsp=(window.VOKABULAR_BEISPIELE||{})[d.kana+'|'+d.lesson];
        inner='<div class="tc-badge">Neues Wort</div>'+
          '<div class="tr-big ja">'+esc(written)+'</div>'+
          (showKana?'<div class="tc-reading ja">'+esc(d.kana)+'</div>':'')+
          '<div class="tc-de">'+esc(d.de)+'</div>'+
          (d.pos?'<div class="tc-pos">'+esc(d.pos)+'</div>':'')+
          (bsp?'<div class="v-bsp"><div class="v-bsp-jp ja">'+furiToRuby(bsp.jp)+'</div>'+(bsp.r?'<div class="v-bsp-r">'+esc(bsp.r)+'</div>':'')+'<div class="v-bsp-de">'+esc(bsp.de)+'</div>'+(bsp.note?'<div class="v-note">'+esc(bsp.note)+'</div>':'')+'</div>':'');
      } else if(c.type==='kanji'){ // Kanji vorstellen, bevor geschrieben wird
        const onr=(d.on||[]).join('・'), kunr=(d.kun||[]).join('・');
        const exHtml=(d.examples||[]).slice(0,2).map(e=>'<div class="v-bsp"><div class="v-bsp-jp ja">'+ruby(e.w,e.r)+'</div><div class="v-bsp-de">'+esc(e.m)+'</div></div>').join('');
        inner='<div class="tc-badge">Neues Kanji</div>'+
          '<div class="tr-big ja">'+esc(d.k)+'</div>'+
          '<div class="tc-de">'+esc(d.meaning||'')+'</div>'+
          (onr?'<div class="tc-reading ja">音 '+esc(onr)+'</div>':'')+
          (kunr?'<div class="tc-reading ja">訓 '+esc(kunr)+'</div>':'')+
          (d.strokes?'<div class="tc-pos">'+esc(d.strokes)+' Striche</div>':'')+
          exHtml;
      } else { // grammar
        const plus=(window.GRAMMATIK_PLUS||{})[d.pattern]||{};
        const exs=(d.beispiele||[]).concat((window.GRAMMATIK_EXTRA||{})[d.pattern]||[]).slice(0,2);
        const exHtml=exs.map(b=>'<div class="v-bsp"><div class="v-bsp-jp ja">'+furiToRuby(b.jp)+'</div>'+(b.de?'<div class="v-bsp-de">'+esc(b.de)+'</div>':'')+'</div>').join('');
        inner='<div class="tc-badge">Neues Muster</div>'+
          '<div class="tr-big ja">'+esc(d.pattern)+'</div>'+
          (d.title?'<div class="tc-de">'+esc(d.title)+'</div>':'')+
          (d.bildung?'<div class="tc-bildung"><b>Bildung:</b> '+furiToRuby(d.bildung)+'</div>':'')+
          (d.erklaerung?'<p class="tc-erk">'+furiToRuby(d.erklaerung)+'</p>':'')+
          (plus.erklaerung_lang?'<p class="tc-erk tc-erk-more">'+furiToRuby(plus.erklaerung_lang)+'</p>':'')+
          exHtml+
          (plus.kontrast&&plus.kontrast.length?'<div class="tc-note tc-kontrast"><b>Abgrenzung:</b><ul>'+plus.kontrast.slice(0,2).map(k=>'<li><span class="ja">'+furiToRuby(k.a)+'</span> ↔ <span class="ja">'+furiToRuby(k.b)+'</span> — '+esc(k.note)+'</li>').join('')+'</ul></div>':'')+
          (plus.fehler&&plus.fehler.length?'<div class="tc-note tc-fehler"><b>Typische Fehler:</b><ul>'+plus.fehler.slice(0,3).map(f=>'<li>'+furiToRuby(f)+'</li>').join('')+'</ul></div>':'');
      }
      body.innerHTML='<div class="tr-card tc-card">'+inner+
        '<div class="tr-controls"><button class="btn-primary tc-next" type="button">Verstanden – weiter <span class="kbd">Leertaste</span></button></div></div>';
      const nx=body.querySelector('.tc-next'); if(nx)nx.addEventListener('click',()=>finishItem(null)); // Vorstellen wertet nicht
    }
    // ERKENNEN: Multiple-Choice (Wort → Bedeutung). Erste echte Abfrage, nachdem das Wort vorgestellt wurde.
    function renderRecognizeCard(c){
      const d=c.data, written=writtenForm(d);
      const showKana=(d.kanji&&d.kanji.length&&d.kanji!==d.kana);
      // Distraktoren: andere Bedeutungen, bevorzugt aus derselben Lektion, sonst aus dem Gesamtwortschatz.
      const pool=(window.VOKABULAR||[]).filter(v=>v.de&&v.de!==d.de);
      const sameL=shuffle(pool.filter(v=>v.lesson===d.lesson)).slice(0,3);
      const fill=shuffle(pool).filter(v=>!sameL.includes(v)).slice(0,3);
      const seen={}; const distract=sameL.concat(fill).map(v=>v.de).filter(de=>{ if(de===d.de||seen[de])return false; seen[de]=1; return true; }).slice(0,3);
      const opts=shuffle([d.de].concat(distract));
      body.innerHTML='<div class="tr-card rc-card"><div class="rc-q"><span class="tr-big ja">'+esc(written)+'</span>'+
        (showKana?'<span class="rc-reading ja">'+esc(d.kana)+'</span>':'')+'<div class="rc-prompt">Was bedeutet das?</div></div>'+
        '<div class="rc-opts">'+opts.map(o=>'<button class="rc-opt" type="button" data-de="'+esc(o)+'">'+esc(o)+'</button>').join('')+'</div>'+
        '<div class="rc-next-wrap"></div></div>';
      const wrap=body.querySelector('.rc-next-wrap');
      let answered=false;
      body.querySelectorAll('.rc-opt').forEach(btn=>btn.addEventListener('click',()=>{
        if(answered)return; answered=true;
        const correct=btn.dataset.de===d.de;
        body.querySelectorAll('.rc-opt').forEach(b=>{ b.disabled=true;
          if(b.dataset.de===d.de)b.classList.add('rc-correct'); else if(b===btn)b.classList.add('rc-wrong'); });
        if(!correct){ const h=mistakeHint(c); if(h)wrap.insertAdjacentHTML('beforebegin',h); }
        const nx=makeNextButton(()=>finishItem(correct?1:0),'h-next'); wrap.appendChild(nx); nx.focus();
      }));
    }
    // ZENTRALE ÜBUNG: adaptiv eine Übung aus der Registry ziehen und einheitlich rendern.
    // Kanji-Zeichnen läuft über die bestehende Schreib-Karte (mit Vergleich); alles andere über Exercises.
    function renderRegistryItem(c){
      const item={id:c.id,type:c.type,data:c.data};
      const score=(window.SRS&&window.SRS.scoreOf)?window.SRS.scoreOf(c.id):0;
      const ex=window.Exercises.pickExercise(item,{score});
      if(!ex){ renderFlashcard(c); return; }
      if(ex.typ==='write'){ renderWriteCard(c); return; }
      body.innerHTML='<div class="tr-card"><div class="h-ex"></div><div class="h-next-wrap"></div></div>';
      const mount=body.querySelector('.h-ex'), nextWrap=body.querySelector('.h-next-wrap');
      window.Exercises.renderExercise(ex,mount,{ onResult:(ok)=>{
        if(ok===false){ const h=mistakeHint(c); if(h)nextWrap.insertAdjacentHTML('beforebegin',h); }
        nextWrap.appendChild(makeNextButton(()=>finishItem(null),'h-next')); } });
    }
    function renderWriteCard(c){
      // Snap/Vorlage rein aus dem 0–100-Lernstand (Kanji werden nur übers Schreiben bewertet);
      // Breite aus der äußeren Bühne, „Später" schiebt ohne Bewertung ans Ende.
      window.KanjiWrite.renderCard(body,c.data,{
        cardClass:'tr-card kw-card', sizeHost:stage, sizeOffset:-40, id:c.id,
        failMsg:'✗ Mit Fehlern — Vergleich unten. Kein Fortschritt; gern „Löschen" und nochmal.',
        onLater:()=>{ const c2=deck.shift(); deck.push(c2); render(); },
        onComplete:(clean,ctx)=>{
          refreshStats();
          // Nur saubere Schreibung gibt Punkte; unsauber rückt nur weiter (kein Score-Gewinn).
          ctx.controls.appendChild(makeNextButton(()=>finishItem(clean?1:null),'h-next'));
        }
      });
    }
    function renderFlashcard(c){
      const fc={t:c.type,d:c.data};
      body.innerHTML='<div class="tr-card"><div class="tr-front">'+frontHtml(fc)+'</div><div class="tr-back hidden">'+backHtml(fc)+'</div>'+
        '<div class="tr-controls"><button class="btn-primary h-reveal" type="button">Aufdecken <span class="kbd">Leertaste</span></button>'+
        '<button class="btn btn-again h-again2 hidden" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>'+
        '<button class="btn btn-next h-good hidden" type="button">Gewusst →</button></div></div>';
      const back=body.querySelector('.tr-back'), reveal=body.querySelector('.h-reveal'), again=body.querySelector('.h-again2'), good=body.querySelector('.h-good');
      reveal.addEventListener('click',()=>{ back.classList.remove('hidden'); reveal.classList.add('hidden'); again.classList.remove('hidden'); good.classList.remove('hidden'); });
      good.addEventListener('click',()=>finishItem(1));
      again.addEventListener('click',()=>{ const c2=deck.shift(); window.SRS.grade(c2.id,0); deck.push(c2); refreshStats(); render(); });
    }
    function renderExerciseItem(c){
      const tpls=window.SATZ_TEMPLATES[c.data.pattern], tpl=tpls[Math.floor(Math.random()*tpls.length)];
      const ex=window.Exercises.fromTemplate(tpl,{});
      body.innerHTML='<div class="tr-card"><div class="h-ex-pat ja">'+esc(c.data.pattern)+'</div><div class="h-ex"></div><div class="h-next-wrap"></div></div>';
      const mount=body.querySelector('.h-ex'), nextWrap=body.querySelector('.h-next-wrap');
      window.Exercises.renderExercise(ex,mount,{ onResult:()=>{
        nextWrap.appendChild(makeNextButton(()=>finishItem(null),'h-next')); } });
    }
    document.addEventListener('keydown',e=>{ if(stage.classList.contains('hidden'))return; if(e.code!=='Space')return;
      const reveal=body.querySelector('.h-reveal'), good=body.querySelector('.h-good'), advance=body.querySelector('.tc-next, .h-next');
      if(reveal&&!reveal.classList.contains('hidden')){ e.preventDefault(); reveal.click(); }
      else if(good&&!good.classList.contains('hidden')){ e.preventDefault(); good.click(); }
      else if(advance){ e.preventDefault(); advance.click(); } });
    if(startBtn)startBtn.addEventListener('click',start);
    refreshStats();
    // Lernpfad-Modus (?lesson=L): Seite als geführten Lektionskurs darstellen und sofort starten,
    // damit „Lektion lernen" nicht wie die Wiederholungsseite aussieht.
    if(onlyLesson!=null){
      const intro=document.querySelector('.page-intro');
      if(intro){
        const nParts=window.SRS.lessonChunks(onlyLesson).length||1;
        const k=intro.querySelector('.kicker'); if(k)k.textContent='学習 · Teil '+lessonPart+'/'+nParts;
        const h=intro.querySelector('h1'); if(h)h.innerHTML='Lektion '+onlyLesson+' · Teil '+lessonPart+' <span class="jp">学習</span>';
        const p=intro.querySelector('p'); if(p)p.innerHTML='Kurzer Teil ('+lessonPart+'/'+nParts+') der Lektion '+onlyLesson+
          ' — ~5–10 Min: erst <b>Vokabeln</b>, dann ggf. <b>Grammatik</b>, <b>Beispiele</b> und <b>Kanji</b>. '+
          'Nur <b>neue</b> Inhalte — die <a href="heute.html">Wiederholung</a> läuft separat.';
      }
      const srcPick=setup&&setup.querySelector('.src-pick'); if(srcPick)srcPick.classList.add('hidden');
      start();
    }
  }

  /* ============================================================  FORTSCHRITT (Statistik + Sicherung)  */
  function initProfil(){
    const root=document.getElementById('f-root'); if(!root||!window.SRS)return;
    function draw(){
      const s=window.SRS.stats(), snap=window.SRS.snapshot(), fc=window.SRS.forecast(undefined,7);
      const maxC=Math.max(1,...fc.map(d=>d.count));
      const bars=fc.map(d=>'<div class="f-bar"><div class="f-bar-fill" style="height:'+Math.round(d.count/maxC*100)+'%"></div>'+
        '<span class="f-bar-n">'+d.count+'</span><span class="f-bar-d">'+d.date.slice(5)+'</span></div>').join('');
      setText('f-streak',s.streakDays); setText('f-learned',s.learned); setText('f-due',s.due); setHtml('f-streak-flower',sakuraSvg(s.streakDays));
      setText('f-avg',Math.round(s.avgScore||0)+'%'); setHtml('f-avg-flower',sakuraSvg(s.avgScore||0,SCORE_THRESHOLDS,{cls:'sakura-sm'}));
      setText('f-daily',(s.dailyGain||0)+' / '+(s.dailyCap||0));
      if(window.SRS.catalogStats)drawOverview(window.SRS.catalogStats());
      const act=document.getElementById('f-activity'); if(act)act.innerHTML=activityBars(30);
      const cal=document.getElementById('f-calendar'); if(cal)cal.innerHTML=activityCalendar(91);
      const forecast=document.getElementById('f-forecast'); if(forecast)forecast.innerHTML=bars;
      // Lernpfad-Fortschritt: Status + Kern-Fortschritt + Test-Score je Lektion.
      const lp=document.getElementById('f-lessons');
      if(lp){ let html='';
        for(let L=1;L<=25;L++){ const st=window.SRS.lessonState(L);
          const cls=st.testPassed?'lp-done':(st.unlocked?'lp-open':'lp-locked');
          const pct=Math.round(st.coreProgress.fraction*100);
          html+='<div class="lp-bar '+cls+'" title="Lektion '+L+' — beherrscht '+st.coreProgress.mastered+'/'+st.coreProgress.total+(st.testPassed?(', Test '+Math.round(st.bestScore*100)+'%'):'')+'">'+
            '<span class="lp-bar-fill" style="height:'+pct+'%"></span><span class="lp-bar-l">'+L+'</span>'+
            (st.testPassed?'<span class="lp-bar-s">'+Math.round(st.bestScore*100)+'</span>':'')+'</div>'; }
        lp.innerHTML=html; }
      // Schwierige Wörter (Leeches): nur einblenden, wenn es welche gibt.
      const lpanel=document.getElementById('f-leech-panel'), lbox=document.getElementById('f-leech');
      if(lbox&&window.SRS.leeches){ const ls=window.SRS.leeches(undefined,{limit:12});
        if(lpanel)lpanel.hidden=ls.length===0;
        lbox.innerHTML=ls.map(x=>{ const d=x.data;
          const jp=x.type==='kanji'?d.k:(x.type==='vocab'?(writtenForm(d)):d.pattern);
          const de=x.type==='grammar'?(d.title||d.pattern):d.meaning||d.de||'';
          return '<div class="f-leech-item">'+sakuraSvg(x.score,SCORE_THRESHOLDS,{cls:'sakura-sm'})+
            '<span class="f-leech-jp ja">'+esc(jp)+'</span><span class="f-leech-de">'+esc(de)+'</span>'+
            '<span class="f-leech-n" title="Fehlversuche">×'+x.lapses+'</span></div>'; }).join(''); }
    }
    draw();
    const exp=document.getElementById('f-export');
    if(exp)exp.addEventListener('click',()=>runExport(exp,document.getElementById('f-msg'),'Sicherung',()=>window.SRS.downloadBackup()));
    const imp=document.getElementById('f-import'); const file=document.getElementById('f-file');
    if(imp&&file){ imp.addEventListener('click',()=>file.click());
      file.addEventListener('change',()=>{ const f=file.files&&file.files[0]; if(!f)return; const r=new FileReader();
        const say=t=>{ const msg=document.getElementById('f-msg'); if(msg)msg.textContent=t; file.value=''; draw(); };
        r.onload=()=>{ const res=window.SRS.importJSON(String(r.result),{merge:true});
          say(res.ok?'✓ Fortschritt importiert (zusammengeführt).':'✗ Datei ungültig oder falsche Version.'); };
        // Ohne onerror bliebe ein fehlgeschlagener Lesevorgang komplett stumm — der Nutzer sähe
        // weder Erfolg noch Fehler und hielte den Import für wirkungslos.
        r.onerror=()=>say('✗ Datei konnte nicht gelesen werden.');
        r.readAsText(f); }); }
    const rst=document.getElementById('f-reset'); if(rst)rst.addEventListener('click',()=>{
      if(window.confirm('Wirklich den gesamten Fortschritt löschen? Tipp: vorher exportieren.')){ window.SRS.reset(); const msg=document.getElementById('f-msg'); if(msg)msg.textContent='Fortschritt zurückgesetzt.'; draw(); } });
    // App-Update (OTA): NUR hier, kein Auto-Banner. Diagnose-Zeile zeigt, welches Bundle
    // wirklich läuft (aktiv vs. eingebaut) — macht jedes Zurückrollen sofort sichtbar.
    const upd=document.getElementById('f-update-check'), uap=document.getElementById('f-update-apply'),
          umsg=document.getElementById('f-update-msg'), udiag=document.getElementById('f-update-diag');
    if(upd){
      if(!(window.OTA&&window.OTA.isNative&&window.OTA.isNative())){
        upd.disabled=true; if(umsg)umsg.textContent='In dieser (Web-)Version aktualisiert sich die App automatisch beim Neuladen.';
      } else {
        if(udiag&&window.OTA.versions)window.OTA.versions().then(v=>{
          udiag.hidden=false;
          udiag.textContent='Aktives Bundle: v'+v.current+(v.native?' · Eingebaut (APK): v'+v.native:'');
        });
        upd.addEventListener('click',()=>{ if(umsg)umsg.textContent='Suche nach Updates …';
          window.OTA.check().then(av=>{
            const st=window.OTA.state();
            if(uap){ uap.hidden=!av; if(av)uap.textContent='Update auf v'+st.version+' installieren'; }
            if(umsg)umsg.textContent=av?('Update auf v'+st.version+' verfügbar.'):'Du hast bereits die neueste Version.';
          }).catch(()=>{ if(umsg)umsg.textContent='Update-Prüfung fehlgeschlagen (offline?).'; }); });
        if(uap)uap.addEventListener('click',()=>{ if(umsg)umsg.textContent='Update wird geladen … Die App startet gleich neu.';
          window.OTA.applyUpdate().catch(e=>{ if(umsg)umsg.textContent='Update fehlgeschlagen: '+(e&&e.message||e); }); });
      }
    }
  }

  /* ============================================================  SCHREIBEN (Kanji-Schreibübung)  */
  function initSchreiben(){
    if(window.KanjiWrite && typeof window.KanjiWrite.initPage==='function') window.KanjiWrite.initPage();
  }

  /* ============================================================  LERNPFAD (Freischalten + Lektionstests)  */
  function initLernpfad(){
    const root=document.getElementById('lp-root'); if(!root||!window.SRS||!window.Exercises)return;
    let overlay=null;

    function lessonCard(L){
      const st=window.SRS.lessonState(L), cp=st.coreProgress, thema=(LESSON[L]||{}).thema||'';
      const ready=st.coreReady||st.learned; // test-bereit: jedes Kern-Item ≥ 40 (erfüllt) ODER „als gelernt" markiert
      const cls=st.testPassed?'lp-done':(st.unlocked?(ready?'lp-test':'lp-open'):'lp-locked');
      const badge=st.testPassed?icon('check_circle'):(st.unlocked?(ready?icon('quiz'):icon('play_arrow')):icon('lock'));
      const card=el('article','lp-card '+cls);
      let html='<div class="lp-top"><span class="lp-num">Lektion '+L+'</span><span class="lp-badge">'+badge+'</span></div>'+
        '<div class="lp-thema">'+esc(thema)+'</div>';
      if(!st.unlocked){ html+='<div class="lp-hint"><span class="msi" aria-hidden="true">lock</span> Erst die vorige Lektion bestehen.</div>'; card.innerHTML=html; return card; }
      html+='<div class="lp-core"><div class="lp-core-bar"><span style="width:'+Math.round(cp.readyFraction*100)+'%"></span></div>'+
        '<span class="lp-core-n">erfüllt '+cp.ready+' / '+cp.total+' <span class="lp-core-sub">(≥40)</span></span></div>';
      // Teil-Leiste: kurze 5–10-Min-Häppchen, strikt der Reihe nach freigeschaltet.
      const parts=window.SRS.partsInfo?window.SRS.partsInfo(L):[], np=window.SRS.nextPart?window.SRS.nextPart(L):1;
      if(parts.length>1){
        let pills='';
        parts.forEach(pi=>{
          const cur=pi.part===np&&!ready;
          const cl='lp-part '+(pi.done?'lp-part-done':(pi.unlocked?'lp-part-cur':'lp-part-lock'))+(cur?' lp-part-now':'');
          const mins=Math.max(5,Math.round(pi.cost*0.8));
          const title='Teil '+pi.part+' · '+pi.total+' Items · ~'+mins+' Min'+(pi.unlocked?'':' (gesperrt)');
          const label=pi.done?'✓':String(pi.part);
          pills+=pi.unlocked
            ? '<a class="'+cl+'" href="heute.html?lesson='+L+'&teil='+pi.part+'" title="'+esc(title)+'">'+label+'</a>'
            : '<span class="'+cl+'" title="'+esc(title)+'">'+label+'</span>';
        });
        html+='<div class="lp-parts" aria-label="Teile">'+pills+'</div>'+
          '<div class="lp-parts-hint">'+parts.length+' Teile · je ~5–10 Min</div>';
      }
      html+='<div class="lp-actions"></div>';
      card.innerHTML=html;
      const actions=card.querySelector('.lp-actions');
      const learn=el('a','btn lp-learn',ready?'Weiter üben':('Teil '+np+' lernen'));
      learn.href=ready?'heute.html':('heute.html?lesson='+L+'&teil='+np); actions.appendChild(learn);
      // Angefangener Test? Dann kündigt der Knopf das Fortsetzen an.
      if(ready){ const pend=sessGet('lessontest:'+L);
        const t=el('button','btn-primary lp-test-btn',pend?'Test fortsetzen':(st.testPassed?'Test wiederholen':'Test starten')); t.type='button';
        t.addEventListener('click',()=>openLessonTest(L)); actions.appendChild(t);
        // „als gelernt" markiert, aber noch nicht voll gemeistert und Test noch nicht bestanden → Hinweis aufs Gate.
        if(st.learned&&!st.coreMastered&&!st.testPassed)
          actions.appendChild(el('span','lp-need','Als gelernt markiert — bestehe den Test, um die nächste Lektion freizuschalten.'));
      }
      else {
        const mk=el('button','btn lp-mark-learned','Als gelernt markieren'); mk.type='button';
        mk.title='Alle Inhalte dieser Lektion als gelernt markieren — Teile werden erledigt, Inhalte kommen in die Wiederholung.';
        mk.addEventListener('click',()=>{
          if(window.confirm('Ganze Lektion '+L+' als gelernt markieren?\nAlle Vokabeln, Grammatik und Kanji landen in der Wiederholung und alle Teile gelten als erledigt.\nMit dem Test schaltest du danach die nächste Lektion frei.')){
            window.SRS.markLessonLearned(L); draw();
          }
        });
        actions.appendChild(mk);
        actions.appendChild(el('span','lp-need','Oder Kern-Items üben, bis sie beherrscht sind — dann Test.'));
      }
      if(st.testPassed)actions.appendChild(el('span','lp-score','Bestes Ergebnis: '+Math.round(st.bestScore*100)+'%'));
      return card;
    }
    function draw(){
      const grid=el('div','lp-grid');
      for(let L=1;L<=25;L++)grid.appendChild(lessonCard(L));
      root.innerHTML=''; root.appendChild(grid);
    }
    let lpRestart=null;
    function ensureOverlay(){
      if(overlay)return overlay;
      overlay=el('div','lp-overlay'); overlay.hidden=true;
      overlay.innerHTML='<div class="lp-modal" role="dialog" aria-modal="true" aria-label="Lektionstest">'+
        '<div class="lp-modal-head"><span class="lp-modal-title"></span><button class="drill-close lp-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
        '<div class="lp-modal-top"><span class="lp-modal-prog"></span></div><div class="lp-modal-body"></div></div>';
      document.body.appendChild(overlay);
      const cl=overlay.querySelector('.lp-close');
      cl.addEventListener('click',closeTest);
      // Kein Schließen beim Klick auf den Hintergrund — ein Fehlgriff verwarf sonst den halben Test.
      cl.parentNode.insertBefore(restartButton(()=>{ if(lpRestart)lpRestart(); },()=>!!(overlay&&overlay.dataset.i&&overlay.dataset.i!=='0'),
        'Test neu starten? Das bisherige Ergebnis wird verworfen.'),cl);
      return overlay;
    }
    function closeTest(){ if(overlay){ overlay.hidden=true; document.body.classList.remove('drill-open'); draw(); } }
    function openLessonTest(L){
      const ov=ensureOverlay();
      const title=ov.querySelector('.lp-modal-title'), progEl=ov.querySelector('.lp-modal-prog'), bodyEl=ov.querySelector('.lp-modal-body');
      title.textContent='Test · Lektion '+L;
      // Angefangenen Test fortsetzen: die GENERIERTEN Fragen werden mitgesichert — neu erzeugen
      // würde andere Fragen (und andere Antwortreihenfolgen) liefern.
      const sKey='lessontest:'+L, sess=sessGet(sKey);
      let qs, i, correct, resumed=false;
      if(sess&&Array.isArray(sess.qs)&&sess.qs.length){ qs=sess.qs; i=sess.i|0; correct=sess.correct|0; resumed=true; }
      else { qs=window.Exercises.buildLessonTest(L); i=0; correct=0; }
      const n=qs.length;
      lpRestart=()=>{ sessClear(sKey); qs=window.Exercises.buildLessonTest(L); i=0; correct=0; resumed=false; ov.dataset.i='0'; show(); };
      ov.hidden=false; document.body.classList.add('drill-open');
      function show(){
        if(!n){ progEl.textContent=''; bodyEl.innerHTML='<div class="tr-done-in">Für diese Lektion gibt es noch keine Testaufgaben.</div>'; return; }
        if(i>=n)return result();
        ov.dataset.i=String(i);
        sessSet(sKey,{qs:qs,i:i,correct:correct});
        progEl.innerHTML='Frage '+(i+1)+' / '+n+resumedTag(resumed);
        resumed=false;
        bodyEl.innerHTML='<div class="lp-q"></div><div class="lp-q-next"></div>';
        const mount=bodyEl.querySelector('.lp-q'), nextWrap=bodyEl.querySelector('.lp-q-next');
        // Punkt VOR dem „Weiter“ buchen: wer dazwischen schließt, verliert ihn sonst.
        window.Exercises.renderExercise(qs[i],mount,{ onResult:res=>{ if(res)correct++;
          sessSet(sKey,{qs:qs,i:i+1,correct:correct});
          nextWrap.appendChild(makeNextButton(()=>{ i++; show(); })); } });
      }
      function result(){
        sessClear(sKey); ov.dataset.i='0';
        const score=n?correct/n:0, r=window.SRS.recordLessonTest(L,score), pct=Math.round(score*100);
        progEl.textContent='';
        bodyEl.innerHTML='<div class="lp-result '+(r.passed?'ok':'no')+'">'+(r.passed?'Bestanden!':'Leider nicht bestanden')+
          '<div class="lp-result-score">'+correct+' / '+n+' richtig · '+pct+'%</div>'+
          '<div class="lp-result-msg">'+(r.passed?(r.unlocked?'Lektion '+(L+1)+' ist jetzt freigeschaltet.':'Du hast alle Lektionen abgeschlossen!'):'Mindestens 80 % nötig — übe weiter und versuch es erneut.')+'</div></div>'+
          '<button class="btn-primary lp-result-close" type="button">Weiter</button>';
        bodyEl.querySelector('.lp-result-close').addEventListener('click',()=>{ closeTest(); draw(); });
      }
      show();
    }

    draw();
    const ua=document.getElementById('lp-unlockall');
    if(ua)ua.addEventListener('click',()=>{ if(window.confirm('Alle Lektionen freischalten? Der geführte Lernpfad ist dann komplett offen.')){ window.SRS.unlockAll(); draw(); } });
    document.addEventListener('keydown',e=>{ if(overlay&&!overlay.hidden&&e.key==='Escape')closeTest(); });
  }

  /* ============================================================  LISTEN-PICKER (geteilt: Vokabular-Seite)  */
  // Zähler am ＋-Button: „2+" statt „＋", wenn das Item schon in 2 Listen ist.
  /* ---------- Export-Rückmeldung (nie stumm scheitern) ---------- */
  // Statustext je Speicherweg; „was" ist die Bezeichnung des Exports (z. B. „Sicherung").
  function saveMsg(res,what){
    if(!res)return '✗ '+what+': Export fehlgeschlagen.';
    if(res.how==='share')return '✓ '+what+' geteilt/gespeichert.';
    if(res.how==='download')return '✓ '+what+' heruntergeladen.';
    if(res.how==='clipboard')return '✓ '+what+' in die Zwischenablage kopiert (kein Dateizugriff möglich).';
    if(res.how==='canceled')return 'Abgebrochen.';
    return '✗ '+what+': Speichern nicht möglich — Text unten kopieren und sichern.';
  }
  // Letzte Rettung: JSON in einem Textfeld zum Kopieren anbieten (hinter dem Statusabsatz).
  function showJsonFallback(afterEl,res){
    const old=document.querySelector('.f-json'); if(old)old.remove();
    if(!res||res.how!=='none'||!res.json||!afterEl)return;
    const ta=el('textarea','f-json'); ta.readOnly=true; ta.value=res.json;
    afterEl.parentNode.insertBefore(ta,afterEl.nextSibling);
    try{ ta.focus(); ta.select(); }catch(e){}
  }
  // Export anstoßen und Ergebnis melden; Knopf ist währenddessen gesperrt (kein Doppelklick).
  function runExport(btn,msgEl,what,fn){
    if(btn)btn.disabled=true;
    if(msgEl)msgEl.textContent=what+' wird erstellt …';
    return Promise.resolve().then(fn).then(res=>{
      if(msgEl){ msgEl.textContent=saveMsg(res,what); showJsonFallback(msgEl,res); }
      return res;
    }).catch(e=>{
      if(msgEl)msgEl.textContent='✗ '+what+': '+(e&&e.message||e);
    }).then(r=>{ if(btn)btn.disabled=false; return r; });
  }

  function inListCount(id){ return (window.SRS&&window.SRS.listsContaining)?window.SRS.listsContaining(id).length:0; }
  function addBtnLabel(id){ const n=inListCount(id); return n>0?n+'+':'＋'; }
  function addBtnTitle(id,base){ const n=inListCount(id); return n>0?('In '+n+(n===1?' Liste':' Listen')+' — '+base):base; }
  // Nach dem Hinzufügen im Picker die betroffenen ＋-Buttons auf der Seite aktualisieren.
  function refreshAddButtons(ids){
    const set=new Set(ids||[]);
    document.querySelectorAll('.v-add').forEach(b=>{ const id=b.dataset.vid; if(!set.has(id))return;
      b.textContent=addBtnLabel(id); b.title=addBtnTitle(id,'Zu Liste hinzufügen'); b.classList.toggle('in-list',inListCount(id)>0); });
    document.querySelectorAll('.kc-add').forEach(b=>{ const id='k:'+b.dataset.kanji; if(!set.has(id))return;
      b.textContent=addBtnLabel(id); b.title=addBtnTitle(id,'Zur Lernliste hinzufügen'); b.classList.toggle('in-list',inListCount(id)>0); });
    document.querySelectorAll('.gp-add').forEach(b=>{ const id='g:'+b.dataset.pattern; if(!set.has(id))return;
      b.textContent=addBtnLabel(id); b.title=addBtnTitle(id,'Zur Lernliste hinzufügen'); b.classList.toggle('in-list',inListCount(id)>0); });
  }
  /* ---------- Formen-Popup: alle Verbformen auf einen Blick ----------
     Reines Anzeige-Popup (keine Übung) — daher nach dem Vorbild des Listen-Pickers: Schließen per
     Hintergrund-Klick, ✕ und Escape, und KEIN body.drill-open (das gehört den Übungs-Overlays). */
  let vfp=null;
  function ensureVerbFormsPopup(){
    if(vfp)return vfp;
    const ov=el('div','vf-overlay'); ov.id='verbforms-overlay'; ov.hidden=true;
    ov.innerHTML='<div class="pick-modal vf-modal" role="dialog" aria-modal="true" aria-label="Verbformen">'+
      '<div class="pick-head"><span class="pick-title vf-title"></span>'+
        '<button class="drill-close vf-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
      '<div class="vf-sub"></div><div class="vf-note"></div>'+
      '<table class="vforms vf-table"></table>'+
      '<a class="btn vf-train" href="verbtrainer.html"><span class="msi" aria-hidden="true">play_arrow</span> Formen üben</a></div>';
    document.body.appendChild(ov);
    const close=()=>{ ov.hidden=true; };
    ov.addEventListener('click',e=>{ if(e.target===ov)close(); });
    ov.querySelector('.vf-close').addEventListener('click',close);
    document.addEventListener('keydown',e=>{ if(!ov.hidden&&e.key==='Escape')close(); });
    // Klick/Enter auf eine Formzeile zeigt die Bildungsregel — wie auf der Verben-Seite.
    const toggleRow=row=>{ const open=row.classList.toggle('open'); row.setAttribute('aria-expanded',open?'true':'false'); };
    ov.addEventListener('click',e=>{ const row=e.target.closest('.vf-row'); if(row)toggleRow(row); });
    ov.addEventListener('keydown',e=>{ if(e.key!=='Enter'&&e.code!=='Space')return;
      const row=e.target.closest('.vf-row'); if(row){ e.preventDefault(); toggleRow(row); } });
    vfp={ ov, title:ov.querySelector('.vf-title'), sub:ov.querySelector('.vf-sub'),
      note:ov.querySelector('.vf-note'), table:ov.querySelector('.vf-table') };
    return vfp;
  }
  // Öffnet das Popup für eine Vokabel; tut nichts, wenn es kein konjugierbares Verb ist.
  function openVerbForms(v){
    if(!v)return false;
    const g=verbGroup(v.pos||''); if(g<=0)return false;
    const kana=allForms(v.kana,g); if(!kana)return false;
    const disp=allForms(writtenForm(v),g)||kana;
    const p=ensureVerbFormsPopup();
    p.title.innerHTML='<span class="ja">'+rubyPair(disp.dict,kana.dict)+'</span>';
    p.sub.innerHTML='<span class="vf-group">'+esc(VERB_GROUP_NAMES[g])+'</span> '+esc(v.de||'');
    const note=verbIrregularNote(v,g,kana.dict);
    p.note.innerHTML=note?esc(note):''; p.note.hidden=!note;
    p.table.innerHTML=verbFormsTableHtml(g,kana,disp);
    p.ov.hidden=false;
    return true;
  }

  /* ---------- „Hinzufügen" auf der Listen-Detailseite: suchen und direkt einsortieren ----------
     Die Umkehrung des Listen-Pickers: dort wählt man zu einem Eintrag die Liste, hier zu einer
     Liste die Einträge. Chassis (.pick-overlay/.pick-modal/.pick-head) ist dasselbe; gesucht wird
     über catalogIndex(), also ohne den Katalog zu rendern. Eigenes Suchfeld — die Seitensuche
     darunter darf davon nichts mitbekommen. */
  const ADD_MAX=30;   // Treffer je Sorte; darüber lieber die Suche verfeinern
  const ADD_GROUPS=[['vocab','語彙 Vokabeln'],['kanji','漢字 Kanji'],['grammar','文法 Grammatik']];
  let addPick=null;
  function ensureAddPicker(){
    if(addPick)return addPick;
    const ov=el('div','add-overlay'); ov.id='add-overlay'; ov.hidden=true;
    ov.innerHTML='<div class="pick-modal add-modal" role="dialog" aria-modal="true" aria-label="Zur Liste hinzufügen">'+
      '<div class="pick-head"><span class="pick-title add-title"></span>'+
        '<button class="drill-close add-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
      '<input class="add-q" type="search" enterkeyhint="search" placeholder="Suchen: Wort, Lesung, Rōmaji, Bedeutung, Kanji, Muster …" autocomplete="off" spellcheck="false" aria-label="Katalog durchsuchen">'+
      '<div class="add-results"></div></div>';
    document.body.appendChild(ov);
    const close=()=>{ ov.hidden=true; };
    ov.addEventListener('click',e=>{ if(e.target===ov)close(); });
    ov.querySelector('.add-close').addEventListener('click',close);
    document.addEventListener('keydown',e=>{ if(!ov.hidden&&e.key==='Escape')close(); });
    addPick={ ov, title:ov.querySelector('.add-title'), q:ov.querySelector('.add-q'), res:ov.querySelector('.add-results') };
    return addPick;
  }
  /* onChange(id, added, obj) meldet jede Änderung, damit die Seite darunter mitziehen kann. */
  function openAddPicker(list, onChange){
    if(!window.SRS)return;
    const p=ensureAddPicker();
    p.title.textContent='Zu „'+list.name+'" hinzufügen';
    p.q.value='';
    // „Schon drin" einmal als Set — listItems() baut sonst je Zeile den ganzen Katalogindex neu.
    let inList=new Set((window.SRS.lists()||[]).filter(l=>l.id===list.id).map(l=>l.items||[])[0]||[]);
    function rowFor(o){
      const row=el('div','lst-item add-item'+(inList.has(o.id)?' add-has':''));
      row.dataset.id=o.id;
      row.innerHTML='<span class="add-mark" aria-hidden="true">'+(inList.has(o.id)?'✓':'＋')+'</span>'+
        '<span class="lst-jp ja">'+itemFrontHtml(o)+'</span>'+
        '<span class="lst-de">'+(o.type!=='vocab'?'<span class="lst-tag">'+(o.type==='kanji'?'漢字':'文法')+'</span>':'')+esc(itemMeaning(o))+'</span>'+
        scoreBadgeHtml(o.id);
      row.addEventListener('click',()=>{
        const has=inList.has(o.id);
        if(has){ window.SRS.removeFromList(list.id,[o.id]); inList.delete(o.id); }
        else { window.SRS.addToList(list.id,[o.id]); inList.add(o.id); }
        row.classList.toggle('add-has',!has);
        row.querySelector('.add-mark').textContent=has?'＋':'✓';
        refreshAddButtons([o.id]);
        if(onChange)onChange(o.id,!has,o);
      });
      return row;
    }
    function render(){
      const q=norm((p.q.value||'').trim()), qs=q.replace(/\s+/g,'');
      p.res.innerHTML='';
      if(!q){ p.res.appendChild(el('p','add-hint','Tippe einen Suchbegriff — Wort, Lesung, Rōmaji, Bedeutung, Kanji oder Grammatikmuster.')); return; }
      const all=catalogIndex().filter(o=>searchHit(o.idx,q,qs));
      if(!all.length){ p.res.appendChild(el('p','add-hint','Keine Treffer für „'+esc(p.q.value.trim())+'".')); return; }
      ADD_GROUPS.forEach(([t,label])=>{
        const arr=all.filter(o=>o.type===t); if(!arr.length)return;
        p.res.appendChild(el('div','pick-lbl',esc(label)+' · '+arr.length));
        arr.slice(0,ADD_MAX).forEach(o=>p.res.appendChild(rowFor(o)));
        if(arr.length>ADD_MAX)p.res.appendChild(el('p','add-hint','… '+(arr.length-ADD_MAX)+' weitere — Suche verfeinern.'));
      });
    }
    p.q.oninput=render;
    p.q.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); p.q.blur(); } };
    render();
    p.ov.hidden=false;
    p.q.focus();
  }

  let picker=null;
  function ensurePicker(){
    if(picker)return picker;
    const ov=el('div','pick-overlay'); ov.hidden=true;
    ov.innerHTML='<div class="pick-modal" role="dialog" aria-modal="true" aria-label="Zu Liste hinzufügen">'+
      '<div class="pick-head"><span class="pick-title"></span><button class="drill-close pick-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
      '<div class="pick-existing"></div>'+
      '<div class="pick-new"><input class="pick-name" type="text" placeholder="Neue Liste …" aria-label="Neue Liste"><button class="btn-primary pick-add" type="button">Anlegen &amp; hinzufügen</button></div>'+
      '<div class="pick-msg" role="status"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov)ov.hidden=true; });
    ov.querySelector('.pick-close').addEventListener('click',()=>{ ov.hidden=true; });
    picker={ ov, title:ov.querySelector('.pick-title'), existing:ov.querySelector('.pick-existing'),
      name:ov.querySelector('.pick-name'), add:ov.querySelector('.pick-add'), msg:ov.querySelector('.pick-msg') };
    return picker;
  }
  // Öffnet den Picker, um die gegebenen Vokabel-IDs zu einer (neuen) Liste hinzuzufügen.
  function openListPicker(ids, label){
    if(!window.SRS)return;
    const p=ensurePicker();
    p.title.textContent='„'+label+'" zu Liste hinzufügen';
    p.msg.textContent=''; p.name.value='';
    function addTo(id,name){ window.SRS.addToList(id,ids); p.msg.textContent='✓ '+ids.length+' zu „'+name+'" hinzugefügt.'; renderExisting(); refreshAddButtons(ids); }
    function renderExisting(){
      const ls=window.SRS.lists();
      p.existing.innerHTML = ls.length ? '<div class="pick-lbl">Vorhandene Listen</div>' : '<div class="pick-lbl">Noch keine Liste — leg unten eine an.</div>';
      ls.forEach(l=>{
        // ✓, wenn die Liste alle betroffenen Items bereits enthält.
        const has=ids.every(id=>(l.items||[]).indexOf(id)!==-1);
        const b=el('button','pick-list'+(has?' pick-has':''),(has?'<span class="pick-check" aria-hidden="true">✓</span>':'')+'<span class="pick-name-lbl">'+esc(l.name)+'</span><span class="pick-n">'+l.items.length+'</span>'); b.type='button';
        b.addEventListener('click',()=>addTo(l.id,l.name)); p.existing.appendChild(b); });
    }
    renderExisting();
    p.add.onclick=()=>{ const nm=(p.name.value||'').trim(); if(!nm){ p.name.focus(); return; } const l=window.SRS.createList(nm); addTo(l.id,l.name); p.name.value=''; };
    p.ov.hidden=false;
  }

  /* ============================================================  ZENTRALER ÜBUNGS-RENDERER (für jeden Modus)
     Rendert einen Übungs-Deskriptor aus der Registry: Kanji-Zeichnen über KanjiWrite (mit Vergleich),
     alles andere über Exercises.renderExercise. opts.onDone(correct) signalisiert „beantwortet". */
  function renderAnyExercise(ex, mount, opts){
    opts=opts||{};
    if(!ex){ if(opts.onDone)opts.onDone(null); return; }
    if(ex.typ==='write'){ return renderWriteExercise(ex.data, mount, opts); }
    window.Exercises.renderExercise(ex, mount, { onResult: opts.onDone });
  }
  function renderWriteExercise(k, mount, opts){
    opts=opts||{};
    let doneCalled=false;
    const finish=(v)=>{ if(!doneCalled){ doneCalled=true; if(opts.onDone)opts.onDone(v); } };
    window.KanjiWrite.renderCard(mount,k,{
      sizeOffset:-20, id:'k:'+k.k,
      onComplete:(clean)=>{
        if(clean&&window.SRS&&window.SRS.grade)window.SRS.grade('k:'+k.k,1);
        finish(clean);
      },
      onError:()=>finish(null)
    });
  }

  /* ============================================================  FREIES ÜBEN (Zufallskarten je Quelle, ungated)  */
  const FREE_SRC={
    kanji:{ data:()=>window.KANJI||[], label:'漢字 Kanji' },
    vocab:{ data:()=>window.VOKABULAR||[], label:'語彙 Vokabeln' },
    grammar:{ data:()=>window.GRAMMATIK||[], label:'文法 Grammatik' },
  };
  let freeOv=null, freeRestart=null;
  function closeFree(){ if(freeOv){ freeOv.hidden=true; document.body.classList.remove('drill-open'); } }
  function ensureFreeDom(){
    if(freeOv)return freeOv;
    const ov=el('div','lt-overlay'); ov.hidden=true;
    ov.innerHTML='<div class="lt-modal" role="dialog" aria-modal="true" aria-label="Freies Üben">'+
      '<div class="lt-head"><span class="lt-title"></span><button class="drill-close lt-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
      '<div class="lt-top"><span class="lt-prog"></span></div>'+
      '<div class="lt-card"><div class="lt-front"></div><div class="lt-back hidden"></div>'+
        '<div class="lt-controls"><button class="btn-primary fr-reveal" type="button">Aufdecken <span class="kbd">Leertaste</span></button>'+
        '<button class="btn btn-again fr-again hidden" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>'+
        '<button class="btn btn-next fr-good hidden" type="button">Gewusst →</button></div></div>'+
      '<div class="lt-done hidden"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.lt-close').addEventListener('click',closeFree);
    // Kein Schließen beim Klick auf den Hintergrund (versehentlicher Abbruch mitten in der Runde).
    const cl=ov.querySelector('.lt-close');
    cl.parentNode.insertBefore(restartButton(()=>{ if(freeRestart)freeRestart(); },()=>!!(freeOv&&freeOv.dataset.done&&freeOv.dataset.done!=='0')),cl);
    document.addEventListener('keydown',e=>{ if(!freeOv||freeOv.hidden)return;
      if(e.key==='Escape'){ closeFree(); return; }
      if(e.code==='Space'){ e.preventDefault(); const g=freeOv.querySelector('.fr-good'),r=freeOv.querySelector('.fr-reveal');
        if(g&&!g.classList.contains('hidden'))g.click(); else if(r&&!r.classList.contains('hidden'))r.click(); } });
    freeOv=ov; return ov;
  }
  function openFreePractice(source){
    const cfg=FREE_SRC[source]; if(!cfg)return;
    const data=cfg.data(); if(!data.length)return;
    const ov=ensureFreeDom(), q=s=>ov.querySelector(s);
    const title=q('.lt-title'),prog=q('.lt-prog'),card=q('.lt-card'),front=q('.lt-front'),back=q('.lt-back'),done=q('.lt-done'),reveal=q('.fr-reveal'),again=q('.fr-again'),good=q('.fr-good');
    title.textContent='Freies Üben · '+cfg.label;
    const sKey='free:'+source;
    let deck=[], total=0, resumed=false;
    function save(){ ov.dataset.done=String(total-deck.length);
      sessSet(sKey,{ids:deck.map(c=>window.SRS?window.SRS.srsId(c.t,c.d):null).filter(Boolean),done:total-deck.length}); }
    function start(){ sessClear(sKey); deck=shuffle(data.slice()).slice(0,10).map(d=>({t:source,d:d})); total=deck.length; resumed=false;
      ov.dataset.done='0'; done.classList.add('hidden'); card.classList.remove('hidden'); render(); }
    // Angefangene Runde wiederherstellen (Karten über ihre SRS-ID auflösen).
    function resume(s){
      if(!window.SRS)return false;
      const idx={}; data.forEach(d=>{ const id=window.SRS.srsId(source,d); if(id)idx[id]=d; });
      const rest=(s.ids||[]).map(x=>idx[x]).filter(Boolean).map(d=>({t:source,d:d}));
      if(!rest.length)return false;
      deck=rest; total=(s.done|0)+rest.length; resumed=true;
      ov.dataset.done=String(s.done|0); done.classList.add('hidden'); card.classList.remove('hidden'); render();
      return true;
    }
    function render(){
      if(!deck.length){ sessClear(sKey); card.classList.add('hidden'); done.classList.remove('hidden');
        done.innerHTML='<div class="tr-done-in">Runde geschafft — '+total+' Karten.</div><button class="btn-primary fr-restart" type="button"><span class="msi" aria-hidden="true">refresh</span> Neue Runde</button>';
        done.querySelector('.fr-restart').addEventListener('click',start); return; }
      const learned=total-deck.length; prog.innerHTML='Karte '+(learned+1)+' / '+total+resumedTag(resumed);
      resumed=false; save();
      const c=deck[0]; front.innerHTML=frontHtml(c); back.innerHTML=backHtml(c);
      back.classList.add('hidden'); reveal.classList.remove('hidden'); again.classList.add('hidden'); good.classList.add('hidden');
    }
    function grade(g){ const c=deck[0]; if(c&&window.SRS){ const id=window.SRS.srsId(c.t,c.d); if(id)window.SRS.grade(id,g); } }
    reveal.onclick=()=>{ back.classList.remove('hidden'); reveal.classList.add('hidden'); again.classList.remove('hidden'); good.classList.remove('hidden'); };
    good.onclick=()=>{ grade(1); deck.shift(); render(); };
    again.onclick=()=>{ grade(0); const c=deck.shift(); deck.push(c); render(); };
    ov.hidden=false; document.body.classList.add('drill-open');
    freeRestart=start;
    const sess=sessGet(sKey);
    if(!(sess&&resume(sess)))start();
  }
  // Kanji-Seite: „Üben" = Schreiben üben (Strichreihenfolge), führt zur Schreib-Seite.
  function addKanjiSchreibenButton(){
    const host=document.querySelector('.toolbar .toolbar-row')||document.querySelector('.toolbar');
    if(!host)return;
    const a=el('a','btn-primary page-ueben page-schreiben','<span class="msi" aria-hidden="true">draw</span> Schreiben üben');
    a.href='schreiben.html'; host.appendChild(a);
  }
  // Freies-Üben-Hub (ueben.html): Quelle wählen → Karteikarten.
  function initUeben(){
    const root=document.getElementById('ueben-root'); if(!root)return;
    root.addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(!b)return;
      openFreePractice(b.dataset.src); });
  }
  // Verben-Seite: Verweis auf den Verbformen-Trainer (löst den früheren festen Drill ab).
  function addVerbenFormButton(){
    const host=document.querySelector('.toolbar .toolbar-row')||document.querySelector('.toolbar');
    if(!host)return;
    const a=el('a','btn-primary page-ueben','<span class="msi" aria-hidden="true">play_arrow</span> Formen üben');
    a.href='verbtrainer.html'; host.appendChild(a);
  }

  /* ---------- Verbformen-Trainer: Auswahlseite (verbtrainer.html) ---------- */
  const VT_SRC_KEY='katalog_vt_src', VT_FORMS_KEY='katalog_vt_forms';
  const VT_DEFAULT_FORMS=['masu','dict'];
  function vtFormOpen(f){ return !window.Exercises||!window.Exercises.formUnlocked||window.Exercises.formUnlocked(f); }
  // Gespeicherte Auswahl laden und gegen die aktuelle Freischaltung filtern (Lernpfad kann
  // zurückgesetzt worden sein). Fallback-Kette: gespeichert → ます+辞書形 → ます.
  function vtLoadForms(){
    const raw=lsGet(VT_FORMS_KEY);
    let sel=(raw?String(raw).split(','):VT_DEFAULT_FORMS).filter(f=>VT_LABEL[f]&&vtFormOpen(f));
    if(!sel.length)sel=VT_DEFAULT_FORMS.filter(vtFormOpen);
    if(!sel.length)sel=['masu'];
    return sel;
  }
  function initVerbtrainer(){
    const root=document.getElementById('vt-root');
    if(!root||!window.SRS||!window.Exercises)return;
    let src=lsGet(VT_SRC_KEY)||'all', forms=vtLoadForms();

    function sources(){
      const max=window.SRS.maxUnlockedLesson?window.SRS.maxUnlockedLesson():25;
      const out=[{id:'all',label:'Alle Verben',hint:'bis L'+max,n:vtVerbs('all').length}];
      (window.SRS.lists()||[]).forEach(l=>out.push({id:l.id,label:l.name,hint:'Liste',n:vtVerbs(l.id).length}));
      return out;
    }
    function section(title,sub){
      const s=el('section','vt-sec');
      s.appendChild(el('h2','vt-lbl',esc(title)));
      if(sub)s.appendChild(el('p','vt-hint',sub));
      return s;
    }
    function draw(){
      const srcs=sources();
      // Quelle, die inzwischen leer (oder gelöscht) ist, still auf „Alle Verben" zurücknehmen.
      const cur=srcs.filter(s=>s.id===src)[0];
      if(!cur||!cur.n){ src='all'; lsSet(VT_SRC_KEY,src); }
      const pool=vtVerbs(src);
      root.innerHTML='';

      /* --- Quelle (Einfachauswahl, wie die Filter-Chips im Katalog) --- */
      const s1=section('Quelle','Woraus sollen die Verben kommen?');
      const chips=el('div','chips vt-srcs');
      srcs.forEach(o=>{
        const c=el('button','chip vt-src'+(o.id===src?' on':'')); c.type='button'; c.dataset.src=o.id;
        c.textContent=o.label+' ('+o.n+')'; c.title=o.hint;
        if(!o.n){ c.disabled=true; c.title='Diese Liste enthält keine konjugierbaren Verben.'; }
        else c.addEventListener('click',()=>{ src=o.id; lsSet(VT_SRC_KEY,src); draw(); });
        chips.appendChild(c);
      });
      s1.appendChild(chips);
      if(srcs.length<2)s1.appendChild(el('p','vt-hint','Eigene Listen legst du unter <a href="listen.html">Listen</a> an.'));
      root.appendChild(s1);

      /* --- Formen (Mehrfachauswahl nach dem Muster der Lesungs-Übung) --- */
      const s2=section('Formen','Mindestens eine. Gesperrte Formen schaltest du im Lernpfad frei.');
      const box=el('div','ex-options vt-forms');
      const sample=pool[0];
      VT_ORDER.forEach(f=>{
        const open=vtFormOpen(f), on=forms.indexOf(f)!==-1;
        const b=el('button','ex-opt vt-form'+(open?'':' vt-locked')+(on?' sel':'')); b.type='button';
        b.dataset.form=f; b.setAttribute('aria-pressed',on?'true':'false');
        b.innerHTML='<span class="vt-form-de">'+esc(VT_LABEL[f])+'</span>'+
          (sample?'<span class="vt-form-ja ja">'+esc(sample.kana[f])+'</span>':'')+
          (open?'':'<span class="msi vt-lock" aria-hidden="true">lock</span>');
        if(!open){ b.disabled=true;
          b.title='Ab Lektion '+window.Exercises.formLesson(f)+' — im Lernpfad freischalten.'; }
        else b.addEventListener('click',()=>{
          const i=forms.indexOf(f);
          if(i===-1)forms.push(f); else if(forms.length>1)forms.splice(i,1); // eine Form muss bleiben
          lsSet(VT_FORMS_KEY,forms.join(',')); draw();
        });
        box.appendChild(b);
      });
      s2.appendChild(box);
      root.appendChild(s2);

      /* --- Zusammenfassung + Start --- */
      const s3=el('section','vt-sec vt-start');
      const k=forms.length;
      const sum=k<2
        ? 'Nur eine Form gewählt — geübt wird in beide Richtungen gegen die '+VT_LABEL[vtPartner(forms[0])]+'.'
        : pool.length+' Verben · '+k+' Formen · '+(k*(k-1))+' Richtungen — der Trainer läuft endlos.';
      s3.appendChild(el('p','vt-sum',esc(pool.length?sum:'Diese Quelle enthält keine konjugierbaren Verben.')));
      const go=el('button','btn-primary vt-go','<span class="msi" aria-hidden="true">play_arrow</span> Training starten');
      go.type='button'; go.disabled=!pool.length;
      go.addEventListener('click',()=>openVerbtrainer({src:src,forms:forms,label:(sources().filter(o=>o.id===src)[0]||{}).label||''}));
      s3.appendChild(go);
      root.appendChild(s3);
    }
    draw();
  }

  /* ============================================================  LISTEN (persönliche Vokabellisten)  */
  /* ---------- Listen-Trainer + Item-Darstellung (geteilt: listen.html & liste.html) ---------- */
  function vocabFront(v){ const dd=verbDictDisplay(v);
    const w=dd?dd.written:(writtenForm(v)); return ruby(w,dd?dd.kana:v.kana); }
  // Vorderseite/Glyph je Item-Typ (für die Item-Liste und den Karteikarten-Fallback).
  function itemGlyph(o){ return o.type==='kanji'?o.data.k:(o.type==='grammar'?o.data.pattern:(writtenForm(o.data))); }
  function itemMeaning(o){ return o.type==='kanji'?(o.data.meaning||''):(o.type==='grammar'?(o.data.title||''):o.data.de); }
  function itemFrontHtml(o){ return o.type==='vocab'?vocabFront(o.data):esc(itemGlyph(o)); }

  /* ----- Trainer: gemischte, adaptive Übungen aus der zentralen Registry ----- */
  let tov=null, trainerRestart=null;
  function closeTrainer(){ if(tov){ tov.hidden=true; document.body.classList.remove('drill-open'); } }
  function ensureTrainer(){
    if(tov)return tov;
    tov=el('div','lt-overlay'); tov.id='trainer-overlay'; tov.hidden=true;
    tov.innerHTML='<div class="lt-modal" role="dialog" aria-modal="true" aria-label="Liste üben">'+
      '<div class="lt-head"><span class="lt-title"></span>'+
        '<button class="drill-close lt-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
      '<div class="lt-top"><span class="lt-prog"></span></div>'+
      '<div class="lt-card"><div class="lt-ex"></div><div class="lt-next-wrap"></div></div>'+
      '<div class="lt-done hidden"></div></div>';
    document.body.appendChild(tov);
    const cl=tov.querySelector('.lt-close');
    cl.addEventListener('click',closeTrainer);
    // Kein Schließen beim Klick auf den Hintergrund (versehentlicher Abbruch mitten in der Runde).
    cl.parentNode.insertBefore(restartButton(()=>{ if(trainerRestart)trainerRestart(); },()=>!!(tov&&tov.dataset.done!=='0'&&tov.dataset.done)),cl);
    document.addEventListener('keydown',e=>{ if(tov.hidden)return;
      if(e.key==='Escape'){ closeTrainer(); return; }
      if(e.code==='Space'){ const nx=tov.querySelector('.lt-next'); if(nx){ e.preventDefault(); nx.click(); } } });
    return tov;
  }
  /* Portionsgröße: eine Runde bleibt überschaubar, danach entscheidet man „Mehr“ oder „Aufhören“. */
  const TRAINER_PORTION=10;
  /* Dringlichkeit eines Listeneintrags — kleiner = wichtiger. Dieselbe Formel wie in
     SRS.buildQueue: schwacher Lernstand zuerst, häufige Fehler ziehen zusätzlich nach vorn.
     Dadurch bringt jede neue Portion die schlechter beherrschten Wörter, statt derselben zehn. */
  function trainerPrio(o){
    const sc=(window.SRS&&window.SRS.scoreOf)?window.SRS.scoreOf(o.id):0;
    const it=(window.SRS&&window.SRS.get)?window.SRS.get(o.id):null;
    return sc-8*((it&&it.lapses)||0);
  }
  function openTrainer(l){
    const ov=ensureTrainer();
    const q=s=>ov.querySelector(s);
    const title=q('.lt-title'), prog=q('.lt-prog'), card=q('.lt-card'),
      exMount=q('.lt-ex'), nextWrap=q('.lt-next-wrap'), done=q('.lt-done');
    title.textContent=l.name;
    const sKey='trainer:'+l.id;
    let deck=[], total=0, resumed=false, seen=[];
    function save(answered){ ov.dataset.done=String(total-deck.length);
      sessSet(sKey,{ids:deck.map(o=>o.id),done:total-deck.length,answered:!!answered,seen:seen.slice()}); }
    /* Nächste Portion zusammenstellen: bevorzugt Einträge, die diese Sitzung noch nicht dran hatte
       (sonst käme bei gleichem Lernstand immer dieselbe Auswahl), darin die dringendsten zuerst.
       Sind alle einmal durch, beginnt die Rotation von vorn. */
    function nextPortion(){
      const all=window.SRS.listItems(l.id);
      if(!all.length)return [];
      const had={}; seen.forEach(id=>{ had[id]=1; });
      let pool=all.filter(o=>!had[o.id]);
      if(!pool.length){ seen=[]; pool=all.slice(); }        // alle einmal durch → von vorn
      // Mischen VOR dem Sortieren, damit gleich dringende Einträge rotieren.
      pool=shuffle(pool.slice()).sort((a,b)=>trainerPrio(a)-trainerPrio(b)).slice(0,TRAINER_PORTION);
      pool.forEach(o=>seen.push(o.id));
      return shuffle(pool);                                  // Reihenfolge innerhalb der Portion
    }
    function begin(){ deck=nextPortion(); total=deck.length; resumed=false;
      ov.dataset.done='0'; done.classList.add('hidden'); card.classList.remove('hidden'); render(); }
    function start(){ sessClear(sKey); seen=[]; begin(); }
    // Angefangene Runde wiederherstellen; inzwischen entfernte Einträge fallen still weg.
    function resume(s){
      const idx={}; window.SRS.listItems(l.id).forEach(o=>{ idx[o.id]=o; });
      seen=(s.seen||[]).slice();
      let rest=(s.ids||[]).map(x=>idx[x]).filter(Boolean), doneN=s.done|0;
      if(s.answered&&rest.length){ rest.shift(); doneN++; }
      if(!rest.length)return false;
      deck=rest; total=doneN+rest.length; resumed=true;
      ov.dataset.done=String(doneN); done.classList.add('hidden'); card.classList.remove('hidden'); render();
      return true;
    }
    function addNext(){ if(nextWrap.querySelector('.lt-next'))return; const nx=makeNextButton(()=>{ deck.shift(); render(); },'lt-next'); nextWrap.appendChild(nx); nx.focus(); }
    /* Portion zu Ende. Sind noch ungeübte Einträge da, wird nicht abgeschlossen, sondern gefragt —
       so bleibt eine lange Liste in Häppchen lernbar, statt am Stück durchgezogen zu werden. */
    function finish(){
      const n=window.SRS.listItems(l.id).length;
      sessClear(sKey);
      card.classList.add('hidden'); done.classList.remove('hidden');
      if(!total){ done.innerHTML='<div class="tr-done-in">Diese Liste ist leer.</div>'; return; }
      if(seen.length<n){
        done.innerHTML='<div class="tr-done-in">'+total+' geübt — '+seen.length+' von '+n+' Einträgen dieser Liste.<br>Weitermachen oder Schluss für heute?</div>'+
          '<div class="lt-more-wrap"><button class="btn-primary lt-more" type="button"><span class="msi" aria-hidden="true">play_arrow</span> Mehr</button>'+
          '<button class="btn lt-stop" type="button"><span class="msi" aria-hidden="true">check</span> Aufhören</button></div>';
        done.querySelector('.lt-more').addEventListener('click',begin);
        done.querySelector('.lt-stop').addEventListener('click',closeTrainer);
        return;
      }
      done.innerHTML='<div class="tr-done-in">Geschafft!<br>Alle '+n+' Einträge durch.</div>'+
        '<button class="btn-primary lt-restart" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>';
      done.querySelector('.lt-restart').addEventListener('click',start);
    }
    function render(){
      if(!deck.length){ finish(); return; }
      const learned=total-deck.length; prog.innerHTML='Aufgabe '+(learned+1)+' / '+total+resumedTag(resumed);
      resumed=false; save(false);
      exMount.innerHTML=''; nextWrap.innerHTML='';
      const o=deck[0];
      const score=(window.SRS&&window.SRS.scoreOf)?window.SRS.scoreOf(o.id):0;
      const ex=(window.Exercises&&window.Exercises.pickExercise)?window.Exercises.pickExercise({id:o.id,type:o.type,data:o.data},{score}):null;
      if(!ex){ exMount.innerHTML='<div class="lt-jp ja">'+itemFrontHtml(o)+'</div><div class="lt-de">'+esc(itemMeaning(o))+'</div>'; save(true); addNext(); return; }
      renderAnyExercise(ex, exMount, { onDone:()=>{ save(true); addNext(); } });
    }
    ov.hidden=false; document.body.classList.add('drill-open');
    trainerRestart=start;
    const sess=sessGet(sKey);
    if(!(sess&&resume(sess)))start(); // angefangene Runde fortsetzen, sonst frisch beginnen
  }

  /* ============================================================  VERBFORMEN-TRAINER · Endlos-Overlay
     Bewusst NICHT das drill-Overlay: der Drill lebt von einem festen Deck (Restliste sichern,
     beantwortete Aufgabe beim Fortsetzen überspringen, Fertig-Screen bei leerem Deck). Hier wird
     jede Aufgabe frisch gewürfelt — es gibt kein Deck, kein Rundenende und nichts zu puffern.
     Geteilt werden nur die kleinen Bausteine: sess*, restartButton, resumedTag, makeNextButton. */
  let vtOv=null, vtS=null;
  function closeVerbtrainer(){ if(vtOv){ vtOv.hidden=true; document.body.classList.remove('drill-open'); } }
  function ensureVerbtrainerDom(){
    if(vtOv)return vtOv;
    vtOv=el('div','lt-overlay'); vtOv.id='verbtrainer-overlay'; vtOv.hidden=true;
    vtOv.innerHTML='<div class="lt-modal" role="dialog" aria-modal="true" aria-label="Verbformen üben">'+
      '<div class="lt-head"><span class="lt-title"></span>'+
        '<button class="drill-close lt-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
      '<div class="lt-top vt-top"><span class="drill-dir vt-dir"></span><span class="lt-prog vt-prog"></span></div>'+
      '<div class="lt-card"><div class="lt-ex vt-ex"></div><div class="lt-next-wrap vt-next-wrap"></div></div></div>';
    document.body.appendChild(vtOv);
    const cl=vtOv.querySelector('.lt-close');
    cl.addEventListener('click',closeVerbtrainer);
    // Kein Schließen beim Klick auf den Hintergrund (versehentlicher Abbruch mitten in der Übung).
    cl.parentNode.insertBefore(restartButton(vtRestart,()=>!!(vtS&&vtS.done>0),
      'Zähler zurücksetzen? Die gesammelten Lernpunkte bleiben erhalten, nur die Anzeige beginnt neu.'),cl);
    document.addEventListener('keydown',e=>{ if(!vtOv||vtOv.hidden)return;
      if(e.key==='Escape'){ closeVerbtrainer(); return; }
      if(e.code==='Space'){ const nx=vtOv.querySelector('.vt-next'); if(nx){ e.preventDefault(); nx.click(); } } });
    return vtOv;
  }
  function vtSave(){ if(vtS)sessSet(vtS.sKey,{done:vtS.done,right:vtS.right,miss:vtS.miss}); }
  function vtRestart(){ if(!vtS)return; vtS.done=0; vtS.right=0; vtS.miss={}; vtS.resumed=false;
    sessClear(vtS.sKey); vtNext(); }
  function openVerbtrainer(cfg){
    const pool=vtVerbs(cfg.src);
    if(!pool.length)return false;
    vtAllCache=null; // Lernpfad kann seit dem letzten Mal weiter freigeschaltet sein
    const ov=ensureVerbtrainerDom();
    // Der Schlüssel kodiert die Auswahl — eine andere Quelle/Formenmenge hat ihren eigenen Zähler.
    const sKey='verbtrainer:'+cfg.src+'|'+(cfg.forms||[]).slice().sort().join('+');
    const s0=sessGet(sKey)||{};
    vtS={ ov:ov, sKey:sKey, pool:pool, forms:(cfg.forms||[]).slice(),
      done:s0.done|0, right:s0.right|0, miss:s0.miss||{}, resumed:(s0.done|0)>0 };
    ov.querySelector('.lt-title').textContent='Verbformen · '+(cfg.label||'');
    ov.hidden=false; document.body.classList.add('drill-open');
    vtNext();
    return true;
  }
  // „Nachschub" ist hier einfach die nächste Zufallsaufgabe — darum endet der Trainer nie.
  function vtNext(){
    const s=vtS; if(!s)return;
    const q=x=>s.ov.querySelector(x);
    const o=s.pool[Math.floor(Math.random()*s.pool.length)];
    const pr=vtPair(s.forms), from=pr[0], to=pr[1];
    // Zweimal falsch in Folge auf derselben ZIELFORM → Multiple Choice als Stütze;
    // eine richtige Antwort setzt zurück, danach wird wieder getippt.
    const mode=((s.miss[to]|0)>=2)?'mc':'input';
    const ex=vtTask(o,from,to,mode,s.pool);
    q('.vt-dir').innerHTML='<span class="ja">'+esc(VT_LABEL[from])+'</span> → <span class="ja">'+esc(VT_LABEL[to])+'</span>';
    q('.vt-prog').innerHTML='Aufgabe '+(s.done+1)+' · '+s.right+' richtig'+resumedTag(s.resumed);
    s.resumed=false;
    const host=q('.vt-ex'), nxw=q('.vt-next-wrap');
    host.innerHTML=''; nxw.innerHTML='';
    window.Exercises.renderExercise(ex,host,{ onResult:ok=>{
      s.done++; if(ok)s.right++;
      s.miss[to]=ok?0:((s.miss[to]|0)+1);
      vtSave(); // erst NACH der Wertung sichern → ein Abbruch davor kann nichts doppelt zählen
      const nx=makeNextButton(vtNext,'vt-next'); nxw.appendChild(nx); nx.focus();
    }});
  }

  /* ============================================================  LISTE (Detailseite einer Lernliste)
     liste.html?id=l1 — zeigt die Einträge wie im Katalog (Vokabelzeilen, Kanji- und Grammatikkarten)
     und nutzt dieselbe Such-/Filter-Maschinerie wie die Katalogseiten: init() sammelt danach die
     .item/.group-Knoten aus #content ein, initSearch()/initToggles() binden die Toolbar. */
  function listeIdFromUrl(){ try{ return new URLSearchParams(location.search).get('id')||''; }catch(e){ return ''; } }
  function renderListe(content){
    if(!window.SRS)return;
    const list=(window.SRS.lists()||[]).find(x=>x.id===listeIdFromUrl());
    const titleEl=document.getElementById('li-title'), subEl=document.getElementById('li-sub'),
      actionsEl=document.getElementById('li-actions');
    if(!list){
      if(titleEl)titleEl.textContent='Liste nicht gefunden';
      if(subEl)subEl.textContent='Diese Lernliste gibt es nicht (mehr).';
      if(actionsEl)actionsEl.innerHTML='<a class="btn" href="listen.html"><span class="msi" aria-hidden="true">arrow_back</span> Alle Listen</a>';
      return;
    }
    function head(){
      const objs=window.SRS.listItems(list.id);
      if(titleEl)titleEl.textContent=list.name;
      if(subEl)subEl.textContent=objs.length+(objs.length===1?' Eintrag':' Einträge')+' · Vokabeln, Kanji und Grammatik dieser Liste.';
      if(!actionsEl)return;
      actionsEl.innerHTML='';
      const train=el('button','btn-primary li-train','<span class="msi" aria-hidden="true">play_arrow</span> Üben');
      train.type='button'; train.disabled=!objs.length;
      train.addEventListener('click',()=>openTrainer(list));
      const exp=el('button','btn li-export','<span class="msi" aria-hidden="true">download</span> Export'); exp.type='button';
      exp.addEventListener('click',()=>runExport(exp,document.getElementById('li-msg'),'Liste „'+list.name+'"',()=>window.SRS.downloadList(list.id)));
      const add=el('button','btn li-add','<span class="msi" aria-hidden="true">add</span> Hinzufügen'); add.type='button';
      add.title='Vokabeln, Kanji oder Grammatik suchen und dieser Liste hinzufügen';
      add.addEventListener('click',()=>openAddPicker(list,onListChange));
      const back=el('a','btn li-back','<span class="msi" aria-hidden="true">arrow_back</span> Alle Listen'); back.href='listen.html';
      actionsEl.appendChild(train); actionsEl.appendChild(add); actionsEl.appendChild(exp); actionsEl.appendChild(back);
    }
    // Ein Eintrag als Katalog-Element + Entfernen-Knopf. Der Klick auf ✕ darf die Karte NICHT
    // aufklappen → direkter Listener mit stopPropagation (wie .lst-rm auf der Listen-Seite).
    function mountItem(o){
      const node=o.type==='kanji'?kanjiCard(o.data)
        :(o.type==='grammar'?grammarCard(o.data,o.data.lesson):vocabRow(o.data,true));
      node.dataset.type=o.type; // Typ-Chips dieser Seite filtern nach Vokabel/Kanji/Grammatik
      node.dataset.liId=o.id;   // damit das Hinzufügen-Overlay den Knoten wiederfindet
      const rm=el('button','li-rm','<span class="msi" aria-hidden="true">close</span>');
      rm.type='button'; rm.title='Aus dieser Liste entfernen';
      rm.addEventListener('click',e=>{
        e.stopPropagation();
        window.SRS.removeFromList(list.id,[o.id]);
        const i=items.indexOf(node); if(i>=0)items.splice(i,1);
        node.remove(); head(); applyFilter();
      });
      node.appendChild(rm);
      return node;
    }
    const GROUPS=[['vocab','語彙 Vokabeln','vocab-list'],['kanji','漢字 Kanji','kanji-grid'],['grammar','文法 Grammatik','gp-list']];
    /* Die Box einer Sorte holen — und sie anlegen, falls die Liste bisher nichts davon enthielt.
       Die neue Sektion muss an ihren Platz in der Reihenfolge Vokabeln → Kanji → Grammatik und
       zusätzlich in `groups`, sonst filtert applyFilter sie nicht mit. */
    function groupBox(t){
      const g=content.querySelector('.group[data-group="'+t+'"]');
      if(g)return g.querySelector('.vocab-list,.kanji-grid,.gp-list');
      const def=GROUPS.filter(x=>x[0]===t)[0]; if(!def)return null;
      const group=el('section','group'); group.dataset.group=t;
      group.appendChild(groupHead(def[1],'',0));
      const box=el('div',def[2]); group.appendChild(box);
      // vor der ersten Sektion einhängen, die in der Reihenfolge NACH dieser kommt
      const after=GROUPS.slice(GROUPS.indexOf(def)+1)
        .map(x=>content.querySelector('.group[data-group="'+x[0]+'"]')).filter(Boolean)[0];
      content.insertBefore(group,after||null);
      groups.push(group);
      return box;
    }
    /* Eine Änderung aus dem Hinzufügen-Overlay in die Seite einarbeiten — ohne Vollneuaufbau,
       damit Suche, Filter und Scrollposition erhalten bleiben. */
    function onListChange(id,added,o){
      if(added){
        const box=groupBox(o.type); if(!box)return;
        const node=mountItem({id:id,type:o.type,data:o.data});
        box.appendChild(node); items.push(node);
      } else {
        const node=items.filter(n=>n.dataset.liId===id)[0];
        if(node){ const i=items.indexOf(node); if(i>=0)items.splice(i,1); node.remove(); }
      }
      head(); applyFilter();
    }
    head();
    const objs=window.SRS.listItems(list.id);
    GROUPS.forEach(([t,label,boxCls])=>{
      const arr=objs.filter(o=>o.type===t); if(!arr.length)return;
      const group=el('section','group'); group.dataset.group=t;
      group.appendChild(groupHead(label,'',arr.length));
      const box=el('div',boxCls); arr.forEach(o=>box.appendChild(mountItem(o)));
      group.appendChild(box); content.appendChild(group);
    });
    buildTypeChips([['all','Alle'],['vocab','Vokabeln'],['kanji','Kanji'],['grammar','Grammatik']]);
    initVocabClicks(content,true); initKanjiClicks(content); initCollapse(content);
  }

  function initListen(){
    const root=document.getElementById('lst-root'); if(!root||!window.SRS)return;
    const nameInp=document.getElementById('lst-create-name'), createBtn=document.getElementById('lst-create');

    function draw(){
      const ls=window.SRS.lists();
      root.innerHTML='';
      if(!ls.length){ root.appendChild(el('p','lst-empty','Noch keine Liste. Lege oben eine an oder füge auf der <a href="vokabular.html">Vokabular-Seite</a> Wörter hinzu.')); return; }
      ls.forEach(l=>{
        const items=window.SRS.listItems(l.id);
        const card=el('article','lst-card');
        card.innerHTML='<div class="lst-head"><span class="lst-name">'+esc(l.name)+'</span><span class="lst-count">'+items.length+' Einträge</span></div>'+
          '<div class="lst-actions"></div><div class="lst-items hidden"></div>';
        const actions=card.querySelector('.lst-actions');
        const train=el('button','btn-primary lst-train','<span class="msi" aria-hidden="true">play_arrow</span> Üben'); train.type='button'; train.disabled=!items.length;
        train.addEventListener('click',()=>openTrainer(l));
        const show=el('button','btn lst-show',(items.length?'Einträge ('+items.length+')':'Einträge')); show.type='button';
        const itemsBox=card.querySelector('.lst-items');
        show.addEventListener('click',()=>{ itemsBox.classList.toggle('hidden'); if(!itemsBox.dataset.built){ buildItems(itemsBox,l,items); itemsBox.dataset.built='1'; } });
        const ren=el('button','btn lst-ren','<span class="msi" aria-hidden="true">edit</span> Umbenennen'); ren.type='button';
        ren.addEventListener('click',()=>{ const nn=window.prompt('Liste umbenennen:',l.name); if(nn&&nn.trim()){ window.SRS.renameList(l.id,nn.trim()); draw(); } });
        const del=el('button','btn lst-del','<span class="msi" aria-hidden="true">delete</span> Löschen'); del.type='button';
        del.addEventListener('click',()=>{ if(window.confirm('Liste „'+l.name+'" löschen? (Vokabeln selbst bleiben erhalten.)')){ window.SRS.deleteList(l.id); draw(); } });
        const exp=el('button','btn lst-export','<span class="msi" aria-hidden="true">download</span> Export'); exp.type='button';
        exp.title='Diese Liste als JSON-Datei exportieren (zum Teilen/Übertragen)';
        exp.addEventListener('click',()=>runExport(exp,document.getElementById('lst-msg'),'Liste „'+l.name+'"',()=>window.SRS.downloadList(l.id)));
        const open=el('a','btn lst-open','<span class="msi" aria-hidden="true">open_in_new</span> Öffnen');
        open.href='liste.html?id='+encodeURIComponent(l.id);
        open.title='Alle Einträge mit Suche und Filter anzeigen';
        actions.appendChild(train); actions.appendChild(open); actions.appendChild(show); actions.appendChild(ren); actions.appendChild(exp); actions.appendChild(del);
        root.appendChild(card);
      });
    }
    function buildItems(box,l,items){
      box.innerHTML='';
      items.forEach(o=>{ const row=el('div','lst-item');
        const bsp=o.type==='vocab'?(window.VOKABULAR_BEISPIELE||{})[o.data.kana+'|'+o.data.lesson]:null;
        // Verben klappen auch OHNE Beispielsatz auf — dort stehen Gruppe und „Alle Formen“.
        const vex=o.type==='vocab'?verbExtraHtml(o.data):'';
        // Erweiterte Bedeutung (Verbblock, Beispiel + Notiz) klappt per Klick auf die Zeile auf.
        const ext=(bsp||vex)?'<span class="v-more" aria-hidden="true" title="Mehr anzeigen">›</span>'+
          '<div class="v-ext">'+vex+(bsp?'<div class="v-bsp-inline"><span class="ja">'+furiToRuby(bsp.jp)+'</span> — '+esc(bsp.de)+(bsp.note?'<span class="v-note"> · '+esc(bsp.note)+'</span>':'')+'</div>':'')+'</div>':'';
        const tag=o.type!=='vocab'?'<span class="lst-tag">'+(o.type==='kanji'?'漢字':'文法')+'</span>':'';
        row.innerHTML='<span class="lst-jp ja">'+itemFrontHtml(o)+'</span><span class="lst-de">'+tag+esc(itemMeaning(o))+ext+'</span>';
        if(bsp||vex){ row.dataset.ext='1'; row.addEventListener('click',e=>{
          if(e.target.closest('.lst-rm'))return;
          const vf=e.target.closest('.v-forms'); if(vf){ e.stopPropagation(); openVerbForms(vocabById(vf.dataset.vid)); return; }
          row.classList.toggle('expanded'); }); }
        const rm=el('button','lst-rm','<span class="msi" aria-hidden="true">close</span>'); rm.type='button'; rm.title='Aus Liste entfernen';
        // Nur die Zeile entfernen und Zähler/Buttons aktualisieren — NICHT die ganze Seite neu
        // zeichnen, sonst klappt die geöffnete Einträge-Ansicht zu.
        rm.addEventListener('click',()=>{
          window.SRS.removeFromList(l.id,[o.id]); row.remove();
          const card=box.closest('.lst-card'); const n=window.SRS.listItems(l.id).length;
          const cnt=card&&card.querySelector('.lst-count'); if(cnt)cnt.textContent=n+' Einträge';
          const trainBtn=card&&card.querySelector('.lst-train'); if(trainBtn)trainBtn.disabled=!n;
          const showBtn=card&&card.querySelector('.lst-show'); if(showBtn)showBtn.textContent=n?'Einträge ('+n+')':'Einträge';
        });
        row.appendChild(rm); box.appendChild(row); });
    }

    if(createBtn)createBtn.addEventListener('click',()=>{ const nm=(nameInp.value||'').trim(); if(!nm){ nameInp.focus(); return; } window.SRS.createList(nm); nameInp.value=''; draw(); });
    if(nameInp)nameInp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&createBtn)createBtn.click(); });
    // Einzelne Liste importieren (JSON aus dem Export) — wird als NEUE Liste angelegt.
    const impBtn=document.getElementById('lst-import'), impFile=document.getElementById('lst-import-file'), msg=document.getElementById('lst-msg');
    if(impBtn&&impFile){
      impBtn.addEventListener('click',()=>impFile.click());
      impFile.addEventListener('change',()=>{
        const f=impFile.files&&impFile.files[0]; if(!f)return;
        const r=new FileReader();
        const say=t=>{ if(msg)msg.textContent=t; impFile.value=''; draw(); };
        r.onload=()=>{
          const res=window.SRS.importListJSON(String(r.result));
          say(res.ok
            ?('✓ Liste „'+res.list.name+'" importiert ('+res.added+' Einträge'+(res.skipped?', '+res.skipped+' unbekannte übersprungen':'')+').')
            :'✗ Keine gültige Listen-Datei (bitte einen Listen-Export wählen, nicht die Komplett-Sicherung).');
        };
        // Ohne onerror bliebe ein fehlgeschlagener Lesevorgang komplett stumm.
        r.onerror=()=>say('✗ Datei konnte nicht gelesen werden.');
        r.readAsText(f);
      });
    }
    draw();
  }

  /* ---------- Versionsanzeige + GitHub-Link im Footer (Quelle: assets/version.js → window.APP_VERSION) ---------- */
  const GH_URL='https://github.com/SDX-Thordan/japanisch-lernkatalog';
  const GH_ICON='<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">'
    +'<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 '
    +'0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01'
    +'1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 '
    +'0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 '
    +'1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 '
    +'0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  function renderFooterVersion(){
    const f=document.querySelector('footer'); if(!f)return;
    if(window.APP_VERSION && !f.querySelector('.app-version')){
      f.appendChild(el('span','app-version','Version v'+esc(window.APP_VERSION)));
    }
    if(!f.querySelector('.footer-gh')){
      const a=el('a','footer-gh',GH_ICON);
      a.href=GH_URL; a.target='_blank'; a.rel='noopener';
      a.setAttribute('aria-label','Quelltext auf GitHub');
      a.title='Quelltext auf GitHub';
      f.appendChild(a);
    }
  }

  /* ============================================================  INIT  */
  // Genau einmal aufbauen: ein zweites DOMContentLoaded (oder ein manuell gefeuertes) würde sonst
  // die Navigation verdoppeln, Listener mehrfach binden und Seiten mit eigenem Zustand — etwa die
  // Formenauswahl im Verbtrainer — mitten im Betrieb auf die Startwerte zurücksetzen.
  let inited=false;
  function init(){
    if(inited)return; inited=true;
    const page=document.body.dataset.page;
    renderNav(page);
    renderFooterVersion();
    const content=document.getElementById('content');
    if(content){
      if(page==='kanji')renderKanji(content);
      else if(page==='vokabular')renderVocab(content);
      else if(page==='grammatik')renderGrammar(content);
      else if(page==='verben')renderVerben(content);
      else if(page==='liste')renderListe(content);
      items=Array.prototype.slice.call(content.querySelectorAll('.item'));
      groups=Array.prototype.slice.call(content.querySelectorAll('.group'));
      applyFilter();
    }
    if(page==='kanji')addKanjiSchreibenButton();
    if(page==='verben')addVerbenFormButton();
    if(page==='ueben')initUeben();
    if(page==='verbtrainer')initVerbtrainer();
    if(page==='heute')initHeute();
    if(page==='profil')initProfil();
    if(page==='schreiben')initSchreiben();
    if(page==='listen')initListen();
    if(page==='lernpfad')initLernpfad();
    initSearch(); initToggles(); initScrollNav();
  }
  /* ---------- geteilte Helfer für die neuen Module (srs.js, exercises.js, kanji-write.js) ----------
     Additiv: macht die intern definierten Helfer nutzbar, ohne sie zu duplizieren.
     Vor init() gesetzt, damit Render-Code (z. B. Grammatik-Übungen) sie schon nutzen kann. */
  window.Katalog = {
    el, esc, ruby, rubyPair, norm, furiToRuby, kanaToRomaji, shuffle,
    conjugate, allForms, verbGroup, genVerbFormExercises, sakuraPetals, sakuraSvg, lsGet, lsSet, sessGet, sessSet, sessClear,
    vtVerbs, vtPair, vtPartner, vtTask, vtAccept, VT_ORDER, VT_LABEL,
    vocabSearchIndex, kanjiSearchIndex, grammarSearchIndex, searchHit
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();

  /* ---------- PWA: Service Worker registrieren (offline-fähig, installierbar) ----------
     Selbst-Update: Übernimmt ein neuer SW die Kontrolle (controllerchange), wird die Seite
     EINMAL neu geladen — aber nur, wenn beim Laden bereits ein Controller aktiv war
     (sonst würde der Erst-Install jeder neuen Installation einen unnötigen Reload auslösen). */
  if(typeof navigator!=='undefined' && 'serviceWorker' in navigator && location.protocol!=='file:'){
    var hadController=!!navigator.serviceWorker.controller, reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',function(){
      if(hadController && !reloading){ reloading=true; location.reload(); }
    });
    window.addEventListener('load',function(){ navigator.serviceWorker.register('service-worker.js').catch(function(){}); });
  }
})();
