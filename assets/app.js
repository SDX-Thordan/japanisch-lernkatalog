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
  // Suchnormalisierung: kleinschreiben + Makrone falten (ō→o …), damit ASCII-Rōmaji wie „kyoshi" auch „kyōshi" trifft.
  function norm(s){ return String(s==null?'':s).toLowerCase()
    .replace(/[āáàâ]/g,'a').replace(/[īíìî]/g,'i').replace(/[ūúùû]/g,'u').replace(/[ēéèê]/g,'e').replace(/[ōóòô]/g,'o'); }
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
  // Wandelt einen Beispielsatz in Ruby-HTML um, falls Furigana-Daten vorliegen (Notation {Basis|Lesung}).
  function furiToRuby(jp){
    const f=(window.GRAMMATIK_FURIGANA||{})[jp];
    if(!f) return esc(jp);
    let out='', last=0, m; const re=/\{([^|{}]+)\|([^{}]+)\}/g;
    while((m=re.exec(f))){ out+=esc(f.slice(last,m.index)); out+='<ruby>'+esc(m[1])+'<rt>'+esc(m[2])+'</rt></ruby>'; last=re.lastIndex; }
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
      {page:'ueben',href:'ueben.html',label:'Freies Üben',icon:'school'},
    ]},
    {group:'Mein Bereich', items:[
      {page:'listen',href:'listen.html',label:'Listen',icon:'bookmarks'},
      {page:'profil',href:'profil.html',label:'Profil',icon:'person'},
    ]},
  ];
  const REFERENCE_PAGES=['vokabular','grammatik','kanji','verben','schreiben','ueben'];
  // Untere App-Leiste: 5 Primärziele; „Nachschlagen" ist ein Hub (Einstieg Vokabular).
  const BOTTOM=[
    {page:'heute',href:'heute.html',label:'Heute',icon:'today'},
    {page:'lernpfad',href:'lernpfad.html',label:'Lernpfad',icon:'route'},
    {page:'listen',href:'listen.html',label:'Listen',icon:'bookmarks'},
    {page:'nachschlagen',href:'vokabular.html',label:'Nachschlagen',icon:'menu_book',match:REFERENCE_PAGES},
    {page:'profil',href:'profil.html',label:'Profil',icon:'person'},
  ];
  function navLink(it,page,cls){
    const active=(it.match?it.match.indexOf(page)!==-1:it.page===page);
    const a=el('a',cls+(active?' active':''),icon(it.icon)+'<span class="nav-label">'+esc(it.label)+'</span>');
    a.href=it.href; if(active)a.setAttribute('aria-current','page'); return a;
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
    return { dict, te:base+teEnd, ta:base+taEnd, nai:base+U2A[u]+'ない' };
  }

  /* ---------- Generierte Verb-Form-Übungen (て/た/ない) aus echten Verben ---------- */
  const VERB_FORM_PATTERNS={'V て-Form':'te','V た-Form':'ta','V ない-Form':'nai'};
  const VERB_FORM_LABEL={te:'て-Form',ta:'た-Form',nai:'ない-Form'};
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
      const naive=stem+({te:'て',ta:'た',nai:'ない'}[form]); // typischer Anfängerfehler (Gruppe-II-Regel überall)
      const seen={}; seen[correct]=1; const distract=[];
      shuffle([c.te,c.ta,c.nai,naive]).forEach(x=>{ if(x&&!seen[x]){ seen[x]=1; distract.push(x); } });
      let guard=0;
      while(distract.length<3&&guard<40){ guard++;
        const o=pool[Math.floor(Math.random()*pool.length)], oc=conjugate(o.kana,verbGroup(o.pos)), x=oc&&oc[form];
        if(x&&!seen[x]){ seen[x]=1; distract.push(x); } }
      const optionen=shuffle([correct].concat(distract.slice(0,3)));
      const prompt=(v.kanji&&v.kanji.length&&v.kanji!==v.kana)?v.kanji+'（'+v.kana+'）':v.kana;
      return { typ:'mc', frage:prompt+' → ?（'+label+'）', optionen:optionen, richtig:optionen.indexOf(correct),
        erkl:c.dict+' → '+correct+(v.de?' — '+v.de:'') };
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

  /* ---------- Zustand für Listen-Seiten ---------- */
  let items=[], groups=[], activeFilter='all', activeType='all', query='';

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
    content.addEventListener('click',e=>{ const a=e.target.closest('.kc-add'); if(a&&window.SRS){ openListPicker(['k:'+a.dataset.kanji], a.dataset.word||a.dataset.kanji); } });
  }
  function kanjiCard(k){
    const on=(k.on||[]).join('・'), kun=(k.kun||[]).join('・');
    const exHtml=(k.examples||[]).map(e=>'<div class="ex"><span class="ex-w">'+ruby(e.w,e.r)+'</span><span class="ex-de">'+esc(e.m)+'</span></div>').join('');
    const card=el('article','kanji-card item');
    card.dataset.filter=k.level;
    card.dataset.search=norm([k.k,on,kun,k.meaning,k.level,k.cls,(k.examples||[]).map(e=>e.w+' '+e.r+' '+e.m).join(' ')].join(' '));
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
        (window.SRS?'<button class="kc-add" type="button" title="Zur Lernliste hinzufügen" data-kanji="'+esc(k.k)+'" data-word="'+esc(k.meaning||k.k)+'">＋</button>':'')+
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
    content.addEventListener('click',e=>{
      if(listsOn){
        const a=e.target.closest('.v-add'); if(a){ e.stopPropagation(); openListPicker([a.dataset.vid],a.dataset.word); return; }
        const al=e.target.closest('.v-add-lesson'); if(al){ const L=+al.dataset.lesson; const ids=(window.VOKABULAR||[]).filter(v=>v.lesson===L).map(v=>'v:'+v.kana+'|'+v.lesson); openListPicker(ids,'Lektion '+L); return; }
      }
      // Klick auf die Karte klappt die erweiterte Bedeutung (Beispiel) auf/zu.
      const row=e.target.closest('.v-row.item'); if(row&&row.dataset.ext)row.classList.toggle('expanded');
    });
  }
  // Gestapelte Vokabel-Karte (handytauglich): (Lesung klein) / Wort / Übersetzung; Blüte oben rechts.
  function vocabRow(w,listsOn){
    const written=(w.kanji&&w.kanji.length)?w.kanji:w.kana;
    const showKana=(w.kanji&&w.kanji.length&&w.kanji!==w.kana);
    const row=el('div','v-row item'); row.dataset.filter=String(w.lesson);
    row.dataset.type=vocabType(w.pos);
    const bsp=(window.VOKABULAR_BEISPIELE||{})[w.kana+'|'+w.lesson];
    row.dataset.search=norm([w.kanji,w.kana,w.romaji,w.de,w.pos,(bsp?bsp.jp+' '+bsp.de+' '+(bsp.note||''):'')].join(' '));
    // Erweiterte Bedeutung (Beispielsatz + Notiz) ist verdeckt und klappt per Klick auf die Karte auf.
    if(bsp)row.dataset.ext='1';
    const ext=bsp?'<span class="v-more" aria-hidden="true" title="Beispiel anzeigen">›</span>'+
      '<div class="v-ext"><div class="v-bsp-inline"><span class="ja">'+esc(bsp.jp)+'</span> — '+esc(bsp.de)+(bsp.note?'<span class="v-note"> · '+esc(bsp.note)+'</span>':'')+'</div></div>':'';
    row.innerHTML='<span class="v-score">'+scoreBadgeHtml('v:'+w.kana+'|'+w.lesson)+'</span>'+
      '<div class="v-main">'+(showKana?'<div class="v-read ja">'+esc(w.kana)+'</div>':'')+'<div class="v-word ja">'+esc(written)+'</div></div>'+
      '<div class="v-mean de hideable">'+esc(w.de)+ext+'</div>'+
      '<div class="v-meta"><span class="pos">'+esc(w.pos)+'</span>'+
      (listsOn?'<button class="v-add" type="button" title="Zu Liste hinzufügen" data-vid="v:'+esc(w.kana)+'|'+w.lesson+'" data-word="'+esc(written)+'">＋</button>':'')+'</div>';
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
    const rows=(t.rows||[]).map(r=>'<tr><th>'+esc(r.g)+'</th><td>'+esc(r.regel)+'</td><td class="ja">'+esc(r.bsp)+'</td></tr>').join('');
    return '<table class="conj-table"><thead><tr><th>Gruppe</th><th>Regel</th><th>Beispiel</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function grammarCard(g,L){
    const extra=(window.GRAMMATIK_EXTRA&&window.GRAMMATIK_EXTRA[g.pattern])||[];
    const all=(g.beispiele||[]).concat(extra);
    const ex=all.map(b=>'<li><span class="ex-jp">'+furiToRuby(b.jp)+'</span>'+
      (b.de?'<span class="ex-trans hideable">'+esc(b.de)+'</span>':'')+'</li>').join('');
    const drillable=all.filter(b=>b.jp&&b.de);
    const card=el('article','gp item collapsible collapsed'); card.dataset.filter=String(L);
    card.dataset.search=norm([g.pattern,g.title,g.bildung,g.erklaerung,all.map(b=>b.jp+' '+(b.r||'')+' '+b.de).join(' ')].join(' '));
    card.innerHTML=
      '<div class="gp-head card-toggle">'+scoreBadgeHtml('g:'+g.pattern)+'<span class="gp-pattern">'+esc(g.pattern)+'</span>'+
      (g.title?'<span class="gp-title">'+esc(g.title)+'</span>':'')+'<span class="tag">L'+L+'</span></div>'+
      '<div class="collapse-body">'+
      (g.bildung?'<div class="gp-bildung"><b>Bildung:</b> '+esc(g.bildung)+'</div>':'')+
      (g.tabelle?gpTable(g.tabelle):'')+
      (g.erklaerung?'<p class="gp-erk">'+esc(g.erklaerung)+'</p>':'')+
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
    if(window.SRS){ const addb=el('button','gp-add btn','＋ Lernliste'); addb.type='button'; addb.dataset.pattern=g.pattern; card.querySelector('.collapse-body').appendChild(addb); }
    return card;
  }
  // Additiver „Mehr erklären"-Block + Übungen (window.Exercises) für Muster mit GRAMMATIK_PLUS.
  function grammarPlusBlock(g,plus){
    const wrap=el('div','gp-plus');
    if(plus.erklaerung_lang)wrap.appendChild(el('div','gp-plus-erk','<b>Mehr erklären:</b> '+esc(plus.erklaerung_lang)));
    if(plus.fehler&&plus.fehler.length){
      wrap.appendChild(el('div','gp-plus-h','Häufige Fehler'));
      const ul=el('ul','gp-fehler'); plus.fehler.forEach(f=>ul.appendChild(el('li',null,esc(f)))); wrap.appendChild(ul);
    }
    if(plus.kontrast&&plus.kontrast.length){
      wrap.appendChild(el('div','gp-plus-h','Abgrenzung'));
      const ul=el('ul','gp-kontrast');
      plus.kontrast.forEach(k=>ul.appendChild(el('li',null,'<span class="ja">'+esc(k.a)+'</span> ↔ <span class="ja">'+esc(k.b)+'</span> — '+esc(k.note))));
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
    ov.addEventListener('click',e=>{ if(e.target===ov)closeDrill(); });
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
    d.deck=shuffle(d.build()); d.total=d.deck.length;
    d.ov.hidden=false; document.body.classList.add('drill-open');
    drillRender();
  }
  // Eine Grammatik üben: Form-/MC-Aufgaben (inkl. generierte て/た/ない) + Satz-Übersetzungen.
  function openGrammarPractice(g){
    const plus=(window.GRAMMATIK_PLUS||{})[g.pattern]||{};
    const extra=(window.GRAMMATIK_EXTRA&&window.GRAMMATIK_EXTRA[g.pattern])||[];
    const all=(g.beispiele||[]).concat(extra);
    const drillable=all.filter(b=>b.jp&&b.de);
    openPracticeSession({ pattern:g.pattern, title:g.title, build:()=>{
      const items=[];
      structuredExercises(g.pattern,plus).forEach(ex=>items.push({kind:'ex',ex:ex,srsId:'g:'+g.pattern}));
      drillable.forEach(b=>{ items.push({kind:'tr',dir:'jp2de',b:b}); items.push({kind:'tr',dir:'de2jp',b:b}); });
      return items;
    }});
  }
  // Verbformen-Runde (て・た・ない) aus echten Verben — vom Hub & der Verben-Seite aus aufrufbar.
  function openVerbFormPractice(){
    openPracticeSession({ pattern:'動詞', title:'Verbformen て・た・ない', build:()=>{
      const items=[];
      [['te','V て-Form',4],['ta','V た-Form',3],['nai','V ない-Form',3]].forEach(grp=>{
        genVerbFormExercises(grp[0],grp[2]).forEach(ex=>items.push({kind:'ex',ex:ex,srsId:'g:'+grp[1]}));
      });
      return items;
    }});
  }
  function closeDrill(){ if(!drill)return; drill.ov.hidden=true; document.body.classList.remove('drill-open'); }
  function drillRestart(){ const d=drill; d.deck=shuffle(d.build?d.build():[]); d.total=d.deck.length; drillRender(); }
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
      return;
    }
    d.done.classList.add('hidden'); d.card.classList.remove('hidden');
    const learned=d.total-d.deck.length;
    d.prog.textContent='Aufgabe '+(learned+1)+' / '+d.total;
    const c=d.deck[0];
    if(c.kind==='ex'){
      d.trBox.classList.add('hidden'); d.exHost.classList.remove('hidden'); d.exHost.innerHTML='';
      d.dir.textContent='Aufgabe';
      const ex=Object.assign({},c.ex,{srsId:c.srsId});
      window.Exercises.renderExercise(ex,d.exHost,{ onResult:()=>{
        const nx=el('button','btn-primary drill-ex-next','Weiter →'); nx.type='button';
        nx.addEventListener('click',drillNext); d.exHost.appendChild(nx);
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
      const dispSrc=(v.kanji&&v.kanji.length)?v.kanji:v.kana;
      const disp=allForms(dispSrc,g)||kana;
      list.push({v,g,kana,disp});
    });
    const names={1:'Gruppe I （五段）',2:'Gruppe II （一段）',3:'Gruppe III （unregelmäßig）'};
    [1,2,3].forEach(g=>{
      const arr=list.filter(o=>o.g===g); if(!arr.length)return;
      const group=el('section','group'); group.dataset.group=String(g);
      group.appendChild(groupHead(names[g],'aus der Wörterbuchform gebildet',arr.length));
      const grid=el('div','verb-grid'); arr.forEach(o=>grid.appendChild(verbCard(o)));
      group.appendChild(grid); content.appendChild(group);
    });
    buildChips([1,2,3], g=>({1:'Gruppe I',2:'Gruppe II',3:'Gruppe III'}[g]));
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
  function verbCard(o){
    const {v,g,kana,disp}=o;
    const body=VERB_ROWS.map(([lbl,key])=>{
      const rule=verbRule(key,g);
      return '<tr class="vf-row" tabindex="0" role="button" aria-expanded="false"><th>'+lbl+
        (rule?'<div class="vf-rule"><b>Bildung:</b> '+rule+'</div>':'')+
        '</th><td class="ja">'+rubyPair(disp[key],kana[key])+'</td></tr>';
    }).join('');
    const gname={1:'Gruppe I',2:'Gruppe II',3:'Gruppe III'}[g];
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
  const SCORE_THRESHOLDS=[20,40,60,80,100];
  // Effektiver Lernstand (0–100) eines Items.
  function itemScore(id){ return (window.SRS&&window.SRS.effectiveScore)?window.SRS.effectiveScore(id):0; }
  // Mini-Blüte für den Lernstand eines einzelnen Items (Vokabel/Grammatik/Kanji).
  function scoreBadge(id){
    const v=Math.round(itemScore(id));
    const s=el('span','grp-flower',sakuraSvg(v,SCORE_THRESHOLDS,{cls:'sakura-sm'}));
    s.title='Lernstand '+v+' %';
    return s;
  }
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
  function buildTypeChips(){
    const box=document.getElementById('type-filters'); if(!box)return;
    const defs=[['all','Alle'],['noun','Nomen'],['verb','Verben'],['adj','Adjektive'],['adv','Adverbien'],['part','Partikel']];
    defs.forEach(([val,label])=>{ const c=el('button','chip'+(val==='all'?' on':'')); c.textContent=label; c.dataset.tval=val;
      c.addEventListener('click',()=>{ activeType=val; box.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.tval===val)); applyFilter(); });
      box.appendChild(c); });
  }
  function applyFilter(){
    const q=norm(query.trim()); let shown=0;
    document.body.classList.toggle('searching',q.length>0);
    items.forEach(it=>{ const okF=activeFilter==='all'||it.dataset.filter===activeFilter; const okQ=!q||(it.dataset.search||'').indexOf(q)!==-1;
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
  function initSearch(){ const input=document.getElementById('search-input'); if(!input)return; input.addEventListener('input',()=>{ query=input.value; applyFilter(); }); }

  /* ============================================================  Karteikarten-Helfer (Heute)  */
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function frontHtml(c){
    if(c.t==='kanji')return '<div class="tr-big ja">'+esc(c.d.k)+'</div><div class="tr-q">On-/Kun-Lesung & Bedeutung?</div>';
    if(c.t==='vocab'){ const v=c.d, w=(v.kanji&&v.kanji.length)?v.kanji:v.kana;
      return '<div class="tr-word ja">'+ruby(w,v.kana)+'</div><div class="tr-q">Lesung & Bedeutung?</div>'; }
    return '<div class="tr-pat ja">'+esc(c.d.pattern)+'</div><div class="tr-q">Bedeutung & Bildung?</div>';
  }
  function backHtml(c){
    if(c.t==='kanji'){ const k=c.d, onr=(k.on||[]).join('・'), kunr=(k.kun||[]).join('・');
      const ex=(k.examples||[]).slice(0,2).map(e=>'<div class="ex"><span class="ex-w">'+ruby(e.w,e.r)+'</span><span class="ex-de">'+esc(e.m)+'</span></div>').join('');
      return '<div class="tr-mean">'+esc(k.meaning)+'</div><div class="readings">'+
        (onr?'<div class="reading-row"><span class="lbl">音</span><span class="vals">'+esc(onr)+'</span></div>':'')+
        (kunr?'<div class="reading-row"><span class="lbl kun">訓</span><span class="vals">'+esc(kunr)+'</span></div>':'')+'</div>'+
        (ex?'<div class="kc-examples">'+ex+'</div>':''); }
    if(c.t==='vocab'){ const v=c.d; const written=(v.kanji&&v.kanji.length)?v.kanji:v.kana;
      const bsp=(window.VOKABULAR_BEISPIELE||{})[v.kana+'|'+v.lesson];
      return '<div class="tr-answer-jp ja">'+ruby(written,v.kana)+'</div>'+
      '<div class="tr-mean">'+esc(v.de)+'</div>'+
      '<div class="tr-tag"><span class="pos">'+esc(v.pos)+'</span> · Lektion '+v.lesson+'</div>'+
      (bsp?'<div class="v-bsp"><div class="v-bsp-jp ja">'+esc(bsp.jp)+'</div>'+
        (bsp.r?'<div class="v-bsp-r">'+esc(bsp.r)+'</div>':'')+
        '<div class="v-bsp-de">'+esc(bsp.de)+'</div>'+
        (bsp.note?'<div class="v-note">'+esc(bsp.note)+'</div>':'')+'</div>':''); }
    const g=c.d, ex=(g.beispiele||[]).slice(0,2).map(b=>'<li><span class="ex-jp">'+furiToRuby(b.jp)+'</span>'+
      '<span class="ex-trans">'+esc(b.de)+'</span></li>').join('');
    return '<div class="tr-mean">'+esc(g.title||'')+' <span class="tag">L'+g.lesson+'</span></div>'+
      (g.bildung?'<div class="gp-bildung"><b>Bildung:</b> '+esc(g.bildung)+'</div>':'')+
      (g.erklaerung?'<p class="gp-erk">'+esc(g.erklaerung)+'</p>':'')+(ex?'<ul class="gp-ex">'+ex+'</ul>':'');
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
    function lessonOf(c){ return c.type==='kanji'?window.SRS.kanjiLessonOf(c.data.level):c.data.lesson; }
    function refreshStats(){ const s=window.SRS.stats(); setText('h-streak',s.streakDays); setText('h-due',s.due); setText('h-learned',s.learned); setHtml('h-streak-flower',sakuraSvg(s.streakDays)); }
    // Grammatik-Items einer Lektion mit Satz-Übungen → Beispiel-Aufgaben für den geführten Kurs.
    function lessonGrammarExamples(L){
      return (window.GRAMMATIK||[]).filter(g=>g.lesson===L && window.SATZ_TEMPLATES && window.SATZ_TEMPLATES[g.pattern])
        .map(g=>({id:window.SRS.srsId('grammar',g),type:'grammar',data:g}));
    }
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
    // Adaptive Modus-Wahl für Vokabeln: leicht → Erkennen, mittel → freier Abruf, fast gemeistert → Produktion (Tippen).
    function pickVocabMode(id){
      if(!window.SRS||!window.SRS.effectiveScore)return 'card';
      const s=window.SRS.effectiveScore(id);
      if(s<40)return 'recognize';
      if(s<70)return 'card';
      return 'type';
    }
    // Fehler-Feedback: kurzer Hinweis bei falscher Antwort (Beispiel/Notiz bzw. typischer Grammatikfehler).
    function mistakeHint(c){
      if(c.type==='vocab'){ const b=(window.VOKABULAR_BEISPIELE||{})[c.data.kana+'|'+c.data.lesson];
        return b?'<div class="fb-hint"><span class="ja">'+esc(b.jp)+'</span> — '+esc(b.de)+(b.note?'<div class="v-note">'+esc(b.note)+'</div>':'')+'</div>':''; }
      if(c.type==='grammar'){ const p=(window.GRAMMATIK_PLUS||{})[c.data.pattern];
        const f=p&&((p.fehler&&p.fehler[0])||p.erklaerung_lang);
        return f?'<div class="fb-hint"><b>Tipp:</b> '+esc(String(f))+'</div>':''; }
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
        const nx=el('button','btn-primary h-next','Weiter →'); nx.type='button'; nx.addEventListener('click',()=>finishItem(null)); nextWrap.appendChild(nx); } });
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
        const written=(d.kanji&&d.kanji.length)?d.kanji:d.kana;
        const showKana=(d.kanji&&d.kanji.length&&d.kanji!==d.kana);
        const bsp=(window.VOKABULAR_BEISPIELE||{})[d.kana+'|'+d.lesson];
        inner='<div class="tc-badge">Neues Wort</div>'+
          '<div class="tr-big ja">'+esc(written)+'</div>'+
          (showKana?'<div class="tc-reading ja">'+esc(d.kana)+'</div>':'')+
          '<div class="tc-de">'+esc(d.de)+'</div>'+
          (d.pos?'<div class="tc-pos">'+esc(d.pos)+'</div>':'')+
          (bsp?'<div class="v-bsp"><div class="v-bsp-jp ja">'+esc(bsp.jp)+'</div>'+(bsp.r?'<div class="v-bsp-r">'+esc(bsp.r)+'</div>':'')+'<div class="v-bsp-de">'+esc(bsp.de)+'</div>'+(bsp.note?'<div class="v-note">'+esc(bsp.note)+'</div>':'')+'</div>':'');
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
          (d.bildung?'<div class="tc-bildung"><b>Bildung:</b> '+esc(d.bildung)+'</div>':'')+
          (d.erklaerung?'<p class="tc-erk">'+esc(d.erklaerung)+'</p>':'')+
          (plus.erklaerung_lang?'<p class="tc-erk tc-erk-more">'+esc(plus.erklaerung_lang)+'</p>':'')+
          exHtml+
          (plus.kontrast&&plus.kontrast.length?'<div class="tc-note tc-kontrast"><b>Abgrenzung:</b><ul>'+plus.kontrast.slice(0,2).map(k=>'<li><span class="ja">'+esc(k.a)+'</span> ↔ <span class="ja">'+esc(k.b)+'</span> — '+esc(k.note)+'</li>').join('')+'</ul></div>':'')+
          (plus.fehler&&plus.fehler.length?'<div class="tc-note tc-fehler"><b>Typische Fehler:</b><ul>'+plus.fehler.slice(0,3).map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul></div>':'');
      }
      body.innerHTML='<div class="tr-card tc-card">'+inner+
        '<div class="tr-controls"><button class="btn-primary tc-next" type="button">Verstanden – weiter <span class="kbd">Leertaste</span></button></div></div>';
      const nx=body.querySelector('.tc-next'); if(nx)nx.addEventListener('click',()=>finishItem(null)); // Vorstellen wertet nicht
    }
    // ERKENNEN: Multiple-Choice (Wort → Bedeutung). Erste echte Abfrage, nachdem das Wort vorgestellt wurde.
    function renderRecognizeCard(c){
      const d=c.data, written=(d.kanji&&d.kanji.length)?d.kanji:d.kana;
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
        const nx=el('button','btn-primary h-next','Weiter →'); nx.type='button';
        nx.addEventListener('click',()=>finishItem(correct?1:0)); wrap.appendChild(nx); nx.focus();
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
        const nx=el('button','btn-primary h-next','Weiter →'); nx.type='button'; nx.addEventListener('click',()=>finishItem(null)); nextWrap.appendChild(nx); } });
    }
    function renderWriteCard(c){
      const k=c.data;
      body.innerHTML='<div class="tr-card kw-card"><div class="kw-head"><span class="tr-big ja">'+esc(k.k)+'</span>'+
        '<span class="tr-q">'+esc(k.meaning||'')+' — schreibe das Kanji in richtiger Strichreihenfolge</span></div>'+
        '<div class="kw-stage"></div><div class="kw-compare-host"></div><div class="kw-msg" aria-live="polite"></div>'+
        '<div class="tr-controls"><button class="btn h-kw-guide" type="button">Vorlage</button>'+
        '<button class="btn h-kw-play" type="button"><span class="msi" aria-hidden="true">play_arrow</span> Reihenfolge</button>'+
        '<button class="btn h-kw-clear" type="button">Löschen</button>'+
        '<button class="btn btn-again h-kw-again" type="button"><span class="msi" aria-hidden="true">refresh</span> Später</button></div></div>';
      const mount=body.querySelector('.kw-stage'), msg=body.querySelector('.kw-msg'), cmp=body.querySelector('.kw-compare-host');
      const size=Math.min(300,(stage.clientWidth||320)-40);
      // Snap/Vorlage rein aus dem 0–100-Lernstand (Kanji werden nur übers Schreiben bewertet).
      const m=window.KanjiWrite.writeMode(window.SRS.scoreOf(c.id));
      fetch('assets/kanjivg/'+window.KanjiWrite.cpFile(k.k)).then(r=>r.text()).then(svg=>{
        const w=window.KanjiWrite.create(mount,{svgText:svg,size:size,snap:m.snap,guide:m.guide,
          onProgress:(i,n)=>{ cmp.innerHTML=''; msg.textContent='Strich '+i+' / '+n; },
          onMistake:(strokeNo)=>{ msg.textContent='✗ Strich '+strokeNo+' passt nicht — nochmal'; },
          onComplete:(clean)=>{
            if(clean){ msg.textContent='✓ Sauber geschrieben!'; }
            else { msg.textContent='✗ Mit Fehlern — Vergleich unten. Kein Fortschritt; gern „Löschen" und nochmal.'; w.showComparison(cmp); }
            refreshStats();
            // Nur saubere Schreibung gibt Punkte; unsauber rückt nur weiter (kein Score-Gewinn).
            const nx=el('button','btn-primary h-next','Weiter →'); nx.type='button'; nx.addEventListener('click',()=>finishItem(clean?1:null)); body.querySelector('.tr-controls').appendChild(nx); }});
        body.querySelector('.h-kw-guide').addEventListener('click',()=>w.toggleGuide());
        body.querySelector('.h-kw-play').addEventListener('click',()=>w.play());
        body.querySelector('.h-kw-clear').addEventListener('click',()=>{ w.clear(); cmp.innerHTML=''; });
      }).catch(()=>{ msg.textContent='SVG konnte nicht geladen werden.'; });
      // „Später": ans Ende schieben, ohne Bewertung.
      body.querySelector('.h-kw-again').addEventListener('click',()=>{ const c2=deck.shift(); deck.push(c2); render(); });
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
      window.Exercises.renderExercise(ex,mount,{ onResult:()=>{ const nx=el('button','btn-primary h-next','Weiter →'); nx.type='button';
        nx.addEventListener('click',()=>finishItem(null)); nextWrap.appendChild(nx); } });
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
          const jp=x.type==='kanji'?d.k:(x.type==='vocab'?((d.kanji&&d.kanji.length)?d.kanji:d.kana):d.pattern);
          const de=x.type==='grammar'?(d.title||d.pattern):d.meaning||d.de||'';
          return '<div class="f-leech-item">'+sakuraSvg(x.score,SCORE_THRESHOLDS,{cls:'sakura-sm'})+
            '<span class="f-leech-jp ja">'+esc(jp)+'</span><span class="f-leech-de">'+esc(de)+'</span>'+
            '<span class="f-leech-n" title="Fehlversuche">×'+x.lapses+'</span></div>'; }).join(''); }
    }
    draw();
    const exp=document.getElementById('f-export'); if(exp)exp.addEventListener('click',()=>window.SRS.downloadBackup());
    const imp=document.getElementById('f-import'); const file=document.getElementById('f-file');
    if(imp&&file){ imp.addEventListener('click',()=>file.click());
      file.addEventListener('change',()=>{ const f=file.files&&file.files[0]; if(!f)return; const r=new FileReader();
        r.onload=()=>{ const res=window.SRS.importJSON(String(r.result),{merge:true}); const msg=document.getElementById('f-msg');
          if(msg)msg.textContent=res.ok?'✓ Fortschritt importiert (zusammengeführt).':'✗ Datei ungültig oder falsche Version.'; draw(); }; r.readAsText(f); }); }
    const rst=document.getElementById('f-reset'); if(rst)rst.addEventListener('click',()=>{
      if(window.confirm('Wirklich den gesamten Fortschritt löschen? Tipp: vorher exportieren.')){ window.SRS.reset(); const msg=document.getElementById('f-msg'); if(msg)msg.textContent='Fortschritt zurückgesetzt.'; draw(); } });
    // App-Update (OTA): nur in der nativen App aktiv; im Browser Hinweis auf Auto-Update.
    const upd=document.getElementById('f-update-check'), umsg=document.getElementById('f-update-msg');
    if(upd){
      if(!(window.OTA&&window.OTA.isNative&&window.OTA.isNative())){
        upd.disabled=true; if(umsg)umsg.textContent='In dieser (Web-)Version aktualisiert sich die App automatisch beim Neuladen.';
      } else {
        upd.addEventListener('click',()=>{ if(umsg)umsg.textContent='Suche nach Updates …';
          window.OTA.check().then(av=>{
            if(!av){ if(umsg)umsg.textContent='Du hast bereits die neueste Version.'; return; }
            const st=window.OTA.state(); if(umsg)umsg.textContent='Update auf v'+(st.version||'')+' wird geladen …';
            return window.OTA.applyUpdate().catch(e=>{ if(umsg)umsg.textContent='Update fehlgeschlagen: '+(e&&e.message||e); });
          }).catch(()=>{ if(umsg)umsg.textContent='Update-Prüfung fehlgeschlagen (offline?).'; }); });
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
      const ready=st.coreMastered||st.learned; // test-bereit: voll gemeistert ODER „als gelernt" markiert
      const cls=st.testPassed?'lp-done':(st.unlocked?(ready?'lp-test':'lp-open'):'lp-locked');
      const badge=st.testPassed?icon('check_circle'):(st.unlocked?(ready?icon('quiz'):icon('play_arrow')):icon('lock'));
      const card=el('article','lp-card '+cls);
      let html='<div class="lp-top"><span class="lp-num">Lektion '+L+'</span><span class="lp-badge">'+badge+'</span></div>'+
        '<div class="lp-thema">'+esc(thema)+'</div>';
      if(!st.unlocked){ html+='<div class="lp-hint"><span class="msi" aria-hidden="true">lock</span> Erst die vorige Lektion bestehen.</div>'; card.innerHTML=html; return card; }
      html+='<div class="lp-core"><div class="lp-core-bar"><span style="width:'+Math.round(cp.fraction*100)+'%"></span></div>'+
        '<span class="lp-core-n">beherrscht '+cp.mastered+' / '+cp.total+'</span></div>';
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
      if(ready){ const t=el('button','btn-primary lp-test-btn',st.testPassed?'Test wiederholen':'Test starten'); t.type='button';
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
    function ensureOverlay(){
      if(overlay)return overlay;
      overlay=el('div','lp-overlay'); overlay.hidden=true;
      overlay.innerHTML='<div class="lp-modal" role="dialog" aria-modal="true" aria-label="Lektionstest">'+
        '<div class="lp-modal-head"><span class="lp-modal-title"></span><button class="drill-close lp-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
        '<div class="lp-modal-top"><span class="lp-modal-prog"></span></div><div class="lp-modal-body"></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('.lp-close').addEventListener('click',closeTest);
      overlay.addEventListener('click',e=>{ if(e.target===overlay)closeTest(); });
      return overlay;
    }
    function closeTest(){ if(overlay){ overlay.hidden=true; document.body.classList.remove('drill-open'); } }
    function openLessonTest(L){
      const ov=ensureOverlay();
      const title=ov.querySelector('.lp-modal-title'), progEl=ov.querySelector('.lp-modal-prog'), bodyEl=ov.querySelector('.lp-modal-body');
      title.textContent='Test · Lektion '+L;
      const qs=window.Exercises.buildLessonTest(L); let i=0, correct=0; const n=qs.length;
      ov.hidden=false; document.body.classList.add('drill-open');
      function show(){
        if(!n){ progEl.textContent=''; bodyEl.innerHTML='<div class="tr-done-in">Für diese Lektion gibt es noch keine Testaufgaben.</div>'; return; }
        if(i>=n)return result();
        progEl.textContent='Frage '+(i+1)+' / '+n;
        bodyEl.innerHTML='<div class="lp-q"></div><div class="lp-q-next"></div>';
        const mount=bodyEl.querySelector('.lp-q'), nextWrap=bodyEl.querySelector('.lp-q-next');
        window.Exercises.renderExercise(qs[i],mount,{ onResult:res=>{ if(res)correct++;
          const nx=el('button','btn-primary','Weiter →'); nx.type='button'; nx.addEventListener('click',()=>{ i++; show(); }); nextWrap.appendChild(nx); } });
      }
      function result(){
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
    function addTo(id,name){ window.SRS.addToList(id,ids); p.msg.textContent='✓ '+ids.length+' zu „'+name+'" hinzugefügt.'; renderExisting(); }
    function renderExisting(){
      const ls=window.SRS.lists();
      p.existing.innerHTML = ls.length ? '<div class="pick-lbl">Vorhandene Listen</div>' : '<div class="pick-lbl">Noch keine Liste — leg unten eine an.</div>';
      ls.forEach(l=>{ const b=el('button','pick-list','<span>'+esc(l.name)+'</span><span class="pick-n">'+l.items.length+'</span>'); b.type='button';
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
    mount.innerHTML='<div class="kw-card"><div class="kw-head"><span class="tr-big ja">'+esc(k.k)+'</span>'+
      '<span class="tr-q">'+esc(k.meaning||'')+' — schreibe das Kanji in richtiger Strichreihenfolge</span></div>'+
      '<div class="kw-stage"></div><div class="kw-compare-host"></div><div class="kw-msg" aria-live="polite"></div>'+
      '<div class="tr-controls"><button class="btn h-kw-guide" type="button">Vorlage</button>'+
      '<button class="btn h-kw-play" type="button"><span class="msi" aria-hidden="true">play_arrow</span> Reihenfolge</button>'+
      '<button class="btn h-kw-clear" type="button">Löschen</button></div></div>';
    const stage=mount.querySelector('.kw-stage'), msg=mount.querySelector('.kw-msg'), cmp=mount.querySelector('.kw-compare-host');
    const size=Math.min(300,(mount.clientWidth||320)-20);
    const m=window.KanjiWrite.writeMode(window.SRS&&window.SRS.scoreOf?window.SRS.scoreOf('k:'+k.k):0);
    let doneCalled=false;
    fetch('assets/kanjivg/'+window.KanjiWrite.cpFile(k.k)).then(r=>r.text()).then(svg=>{
      const w=window.KanjiWrite.create(stage,{svgText:svg,size:size,snap:m.snap,guide:m.guide,
        onProgress:(i,n)=>{ cmp.innerHTML=''; msg.textContent='Strich '+i+' / '+n; },
        onMistake:(no)=>{ msg.textContent='✗ Strich '+no+' passt nicht — nochmal'; },
        onComplete:(clean)=>{
          if(clean){ msg.textContent='✓ Sauber geschrieben!'; if(window.SRS&&window.SRS.grade)window.SRS.grade('k:'+k.k,1); }
          else { msg.textContent='✗ Mit Fehlern — Vergleich unten.'; w.showComparison(cmp); }
          if(!doneCalled){ doneCalled=true; if(opts.onDone)opts.onDone(clean); } }});
      mount.querySelector('.h-kw-guide').addEventListener('click',()=>w.toggleGuide());
      mount.querySelector('.h-kw-play').addEventListener('click',()=>w.play());
      mount.querySelector('.h-kw-clear').addEventListener('click',()=>{ w.clear(); cmp.innerHTML=''; });
    }).catch(()=>{ msg.textContent='SVG konnte nicht geladen werden.'; if(!doneCalled){ doneCalled=true; if(opts.onDone)opts.onDone(null); } });
  }

  /* ============================================================  FREIES ÜBEN (Zufallskarten je Quelle, ungated)  */
  const FREE_SRC={
    kanji:{ data:()=>window.KANJI||[], label:'漢字 Kanji' },
    vocab:{ data:()=>window.VOKABULAR||[], label:'語彙 Vokabeln' },
    grammar:{ data:()=>window.GRAMMATIK||[], label:'文法 Grammatik' },
  };
  let freeOv=null;
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
    ov.querySelector('.lt-close').addEventListener('click',()=>{ ov.hidden=true; });
    ov.addEventListener('click',e=>{ if(e.target===ov)ov.hidden=true; });
    document.addEventListener('keydown',e=>{ if(freeOv.hidden)return;
      if(e.key==='Escape'){ freeOv.hidden=true; return; }
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
    let deck=[], total=0;
    function start(){ deck=shuffle(data.slice()).slice(0,10).map(d=>({t:source,d:d})); total=deck.length; done.classList.add('hidden'); card.classList.remove('hidden'); render(); }
    function render(){
      if(!deck.length){ card.classList.add('hidden'); done.classList.remove('hidden');
        done.innerHTML='<div class="tr-done-in">Runde geschafft — '+total+' Karten.</div><button class="btn-primary fr-restart" type="button"><span class="msi" aria-hidden="true">refresh</span> Neue Runde</button>';
        done.querySelector('.fr-restart').addEventListener('click',start); return; }
      const learned=total-deck.length; prog.textContent='Karte '+(learned+1)+' / '+total;
      const c=deck[0]; front.innerHTML=frontHtml(c); back.innerHTML=backHtml(c);
      back.classList.add('hidden'); reveal.classList.remove('hidden'); again.classList.add('hidden'); good.classList.add('hidden');
    }
    function grade(g){ const c=deck[0]; if(c&&window.SRS){ const id=window.SRS.srsId(c.t,c.d); if(id)window.SRS.grade(id,g); } }
    reveal.onclick=()=>{ back.classList.remove('hidden'); reveal.classList.add('hidden'); again.classList.remove('hidden'); good.classList.remove('hidden'); };
    good.onclick=()=>{ grade(1); deck.shift(); render(); };
    again.onclick=()=>{ grade(0); const c=deck.shift(); deck.push(c); render(); };
    ov.hidden=false; start();
  }
  // Kanji-Seite: „Üben" = Schreiben üben (Strichreihenfolge), führt zur Schreib-Seite.
  function addKanjiSchreibenButton(){
    const host=document.querySelector('.toolbar .toolbar-row')||document.querySelector('.toolbar');
    if(!host)return;
    const a=el('a','btn-primary page-ueben page-schreiben','<span class="msi" aria-hidden="true">draw</span> Schreiben üben');
    a.href='schreiben.html'; host.appendChild(a);
  }
  // Freies-Üben-Hub (ueben.html): Quelle wählen → Karteikarten bzw. Verbform-Aufgaben.
  function initUeben(){
    const root=document.getElementById('ueben-root'); if(!root)return;
    root.addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(!b)return;
      if(b.dataset.src==='verbforms')openVerbFormPractice(); else openFreePractice(b.dataset.src); });
  }
  // Verben-Seite: „Formen üben"-Knopf (generierte て/た/ない-Runde) in die Toolbar.
  function addVerbenFormButton(){
    if(!window.Exercises)return;
    const host=document.querySelector('.toolbar .toolbar-row')||document.querySelector('.toolbar');
    if(!host)return;
    const b=el('button','btn-primary page-ueben','<span class="msi" aria-hidden="true">play_arrow</span> Formen üben'); b.type='button';
    b.addEventListener('click',openVerbFormPractice); host.appendChild(b);
  }

  /* ============================================================  LISTEN (persönliche Vokabellisten)  */
  function initListen(){
    const root=document.getElementById('lst-root'); if(!root||!window.SRS)return;
    const nameInp=document.getElementById('lst-create-name'), createBtn=document.getElementById('lst-create');

    function vocabFront(v){ const w=(v.kanji&&v.kanji.length)?v.kanji:v.kana; return ruby(w,v.kana); }
    // Vorderseite/Glyph je Item-Typ (für die Item-Liste und den Karteikarten-Fallback).
    function itemGlyph(o){ return o.type==='kanji'?o.data.k:(o.type==='grammar'?o.data.pattern:((o.data.kanji&&o.data.kanji.length)?o.data.kanji:o.data.kana)); }
    function itemMeaning(o){ return o.type==='kanji'?(o.data.meaning||''):(o.type==='grammar'?(o.data.title||''):o.data.de); }
    function itemFrontHtml(o){ return o.type==='vocab'?vocabFront(o.data):esc(itemGlyph(o)); }
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
        actions.appendChild(train); actions.appendChild(show); actions.appendChild(ren); actions.appendChild(del);
        root.appendChild(card);
      });
    }
    function buildItems(box,l,items){
      box.innerHTML='';
      items.forEach(o=>{ const row=el('div','lst-item');
        const bsp=o.type==='vocab'?(window.VOKABULAR_BEISPIELE||{})[o.data.kana+'|'+o.data.lesson]:null;
        // Erweiterte Bedeutung (Beispiel + Notiz) klappt per Klick auf die Zeile auf (nur Vokabeln).
        const ext=bsp?'<span class="v-more" aria-hidden="true" title="Beispiel anzeigen">›</span>'+
          '<div class="v-ext"><div class="v-bsp-inline"><span class="ja">'+esc(bsp.jp)+'</span> — '+esc(bsp.de)+(bsp.note?'<span class="v-note"> · '+esc(bsp.note)+'</span>':'')+'</div></div>':'';
        const tag=o.type!=='vocab'?'<span class="lst-tag">'+(o.type==='kanji'?'漢字':'文法')+'</span>':'';
        row.innerHTML='<span class="lst-jp ja">'+itemFrontHtml(o)+'</span><span class="lst-de">'+tag+esc(itemMeaning(o))+ext+'</span>';
        if(bsp){ row.dataset.ext='1'; row.addEventListener('click',e=>{ if(e.target.closest('.lst-rm'))return; row.classList.toggle('expanded'); }); }
        const rm=el('button','lst-rm','<span class="msi" aria-hidden="true">close</span>'); rm.type='button'; rm.title='Aus Liste entfernen';
        rm.addEventListener('click',()=>{ window.SRS.removeFromList(l.id,[o.id]); draw(); });
        row.appendChild(rm); box.appendChild(row); });
    }

    /* ----- Trainer: gemischte, adaptive Übungen aus der zentralen Registry ----- */
    let tov=null;
    function ensureTrainer(){
      if(tov)return tov;
      tov=el('div','lt-overlay'); tov.hidden=true;
      tov.innerHTML='<div class="lt-modal" role="dialog" aria-modal="true" aria-label="Liste üben">'+
        '<div class="lt-head"><span class="lt-title"></span>'+
          '<button class="drill-close lt-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
        '<div class="lt-top"><span class="lt-prog"></span></div>'+
        '<div class="lt-card"><div class="lt-ex"></div><div class="lt-next-wrap"></div></div>'+
        '<div class="lt-done hidden"></div></div>';
      document.body.appendChild(tov);
      tov.querySelector('.lt-close').addEventListener('click',()=>{ tov.hidden=true; });
      tov.addEventListener('click',e=>{ if(e.target===tov)tov.hidden=true; });
      document.addEventListener('keydown',e=>{ if(tov.hidden)return;
        if(e.key==='Escape'){ tov.hidden=true; return; }
        if(e.code==='Space'){ const nx=tov.querySelector('.lt-next'); if(nx){ e.preventDefault(); nx.click(); } } });
      return tov;
    }
    function openTrainer(l){
      const ov=ensureTrainer();
      const q=s=>ov.querySelector(s);
      const title=q('.lt-title'), prog=q('.lt-prog'), card=q('.lt-card'),
        exMount=q('.lt-ex'), nextWrap=q('.lt-next-wrap'), done=q('.lt-done');
      title.textContent=l.name;
      let deck=[], total=0;
      function start(){ deck=shuffle(window.SRS.listItems(l.id).slice()); total=deck.length; done.classList.add('hidden'); card.classList.remove('hidden'); render(); }
      function addNext(){ if(nextWrap.querySelector('.lt-next'))return; const nx=el('button','btn-primary lt-next','Weiter →'); nx.type='button'; nx.addEventListener('click',()=>{ deck.shift(); render(); }); nextWrap.appendChild(nx); nx.focus(); }
      function render(){
        if(!deck.length){ card.classList.add('hidden'); done.classList.remove('hidden');
          done.innerHTML=total?'<div class="tr-done-in">Geschafft!<br>Alle '+total+' Einträge durch.</div><button class="btn-primary lt-restart" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>':'<div class="tr-done-in">Diese Liste ist leer.</div>';
          const rs=done.querySelector('.lt-restart'); if(rs)rs.addEventListener('click',start); return; }
        const learned=total-deck.length; prog.textContent='Aufgabe '+(learned+1)+' / '+total;
        exMount.innerHTML=''; nextWrap.innerHTML='';
        const o=deck[0];
        const score=(window.SRS&&window.SRS.scoreOf)?window.SRS.scoreOf(o.id):0;
        const ex=(window.Exercises&&window.Exercises.pickExercise)?window.Exercises.pickExercise({id:o.id,type:o.type,data:o.data},{score}):null;
        if(!ex){ exMount.innerHTML='<div class="lt-jp ja">'+itemFrontHtml(o)+'</div><div class="lt-de">'+esc(itemMeaning(o))+'</div>'; addNext(); return; }
        renderAnyExercise(ex, exMount, { onDone:()=>{ addNext(); } });
      }
      ov.hidden=false; start();
    }

    if(createBtn)createBtn.addEventListener('click',()=>{ const nm=(nameInp.value||'').trim(); if(!nm){ nameInp.focus(); return; } window.SRS.createList(nm); nameInp.value=''; draw(); });
    if(nameInp)nameInp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&createBtn)createBtn.click(); });
    draw();
  }

  /* ---------- Versionsanzeige im Footer (Quelle: assets/version.js → window.APP_VERSION) ---------- */
  function renderFooterVersion(){
    const v=window.APP_VERSION; if(!v)return;
    const f=document.querySelector('footer'); if(!f||f.querySelector('.app-version'))return;
    f.appendChild(el('span','app-version','Version v'+esc(v)));
  }

  /* ---------- OTA-Update-Hinweis (nur Android; im Web No-Op, da window.OTA dort inaktiv) ----------
     Zeigt einen schließbaren Banner „Update verfügbar" mit Button; angewendet wird nur auf Klick. */
  function initOTA(){
    if(!window.OTA||!document.body)return;
    function render(st){
      let bar=document.getElementById('ota-bar');
      if(!st.available){ if(bar)bar.remove(); return; }
      if(!bar){
        bar=el('div','ota-bar'); bar.id='ota-bar';
        document.body.insertBefore(bar,document.body.firstChild);
      }
      bar.innerHTML='<span class="ota-msg">Update auf <b>v'+esc(st.version||'')+'</b> verfügbar.</span>'+
        '<button class="btn-primary ota-go" type="button">'+(st.busy?'Wird geladen …':'Jetzt aktualisieren')+'</button>'+
        '<button class="ota-x" type="button" aria-label="Später">✕</button>';
      const go=bar.querySelector('.ota-go'); if(go){ go.disabled=!!st.busy;
        go.addEventListener('click',()=>{ window.OTA.applyUpdate().catch(()=>{}); }); }
      const x=bar.querySelector('.ota-x'); if(x)x.addEventListener('click',()=>bar.remove());
    }
    window.OTA.onChange(render);
  }

  /* ============================================================  INIT  */
  function init(){
    const page=document.body.dataset.page;
    renderNav(page);
    renderFooterVersion();
    const content=document.getElementById('content');
    if(content){
      if(page==='kanji')renderKanji(content);
      else if(page==='vokabular')renderVocab(content);
      else if(page==='grammatik')renderGrammar(content);
      else if(page==='verben')renderVerben(content);
      items=Array.prototype.slice.call(content.querySelectorAll('.item'));
      groups=Array.prototype.slice.call(content.querySelectorAll('.group'));
      applyFilter();
    }
    if(page==='kanji')addKanjiSchreibenButton();
    if(page==='verben')addVerbenFormButton();
    if(page==='ueben')initUeben();
    if(page==='heute')initHeute();
    if(page==='profil')initProfil();
    if(page==='schreiben')initSchreiben();
    if(page==='listen')initListen();
    if(page==='lernpfad')initLernpfad();
    initSearch(); initToggles(); initOTA();
  }
  /* ---------- geteilte Helfer für die neuen Module (srs.js, exercises.js, kanji-write.js) ----------
     Additiv: macht die intern definierten Helfer nutzbar, ohne sie zu duplizieren.
     Vor init() gesetzt, damit Render-Code (z. B. Grammatik-Übungen) sie schon nutzen kann. */
  window.Katalog = {
    el, esc, ruby, rubyPair, norm, furiToRuby, kanaToRomaji, shuffle,
    conjugate, allForms, verbGroup, genVerbFormExercises, sakuraPetals, sakuraSvg, lsGet, lsSet
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
