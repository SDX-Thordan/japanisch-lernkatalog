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
  // n=0 → grüne Knospe; n=1..5 → n Blütenblätter (gleichmäßig verteilt) + gelber Kern ab ≥1.
  function sakuraSvg(value,thresholds,opts){
    opts=opts||{};
    const n=sakuraPetals(value,thresholds);
    const PINK='#e8889e', PINKD='#d96a86', CORE='#f6c84c';
    const cls='sakura'+(opts.cls?' '+opts.cls:'')+' sakura-'+n;
    if(n<=0){
      return '<svg class="'+cls+'" viewBox="0 0 48 48" role="img" aria-label="Knospe (noch keine Blüte)">'+
        '<path d="M24 27 v-9" stroke="#7c9a5e" stroke-width="2.4" stroke-linecap="round"/>'+
        '<ellipse cx="24" cy="15" rx="5" ry="7.5" fill="#cdb7a6"/>'+
        '<ellipse cx="24" cy="15" rx="2.4" ry="6" fill="#bda493"/></svg>';
    }
    // n Blätter, sodass die volle Blüte (5) gleichmäßig wie eine echte Sakura aussieht.
    const r=10;
    let petals='';
    for(let i=0;i<n;i++){
      const ang=-90+i*(360/Math.max(n,1));
      petals+='<g transform="translate(24 24) rotate('+ang.toFixed(1)+')">'+
        '<path d="M0 '+(-r).toFixed(1)+' C '+(r*0.85).toFixed(1)+' '+(-r).toFixed(1)+', '+(r*0.85).toFixed(1)+' '+(r*0.55).toFixed(1)+', 0 '+(r*1.05).toFixed(1)+' C '+(-r*0.85).toFixed(1)+' '+(r*0.55).toFixed(1)+', '+(-r*0.85).toFixed(1)+' '+(-r).toFixed(1)+', 0 '+(-r).toFixed(1)+' Z" '+
        'fill="'+PINK+'" stroke="'+PINKD+'" stroke-width="0.6"/></g>';
    }
    const core='<circle cx="24" cy="24" r="3.4" fill="'+CORE+'"/>';
    return '<svg class="'+cls+'" viewBox="0 0 48 48" role="img" aria-label="Blüte: '+n+' von 5 Blütenblättern">'+petals+core+'</svg>';
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
  }
  function kanjiCard(k){
    const on=(k.on||[]).join('・'), kun=(k.kun||[]).join('・');
    const exHtml=(k.examples||[]).map(e=>'<div class="ex"><span class="ex-w">'+ruby(e.w,e.r)+'</span><span class="ex-de">'+esc(e.m)+'</span></div>').join('');
    const card=el('article','kanji-card item');
    card.dataset.filter=k.level;
    card.dataset.search=norm([k.k,on,kun,k.meaning,k.level,k.cls,(k.examples||[]).map(e=>e.w+' '+e.r+' '+e.m).join(' ')].join(' '));
    const wr=(window.SRS&&window.SRS.get&&window.SRS.get('k:'+k.k))||null;
    const writeReps=wr?(wr.writeReps||0):0;
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
        '<span class="kc-writes" title="Schreiben geübt: '+writeReps+'×">'+sakuraSvg(writeReps,[1,2,3,4,5],{cls:'sakura-sm'})+
          (writeReps>0?'<span class="kc-writes-n">'+writeReps+'×</span>':'')+'</span>'+
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
      const wrap=el('div','table-wrap'), table=el('table','vocab');
      table.innerHTML='<thead><tr><th>Japanisch</th><th>Lesung</th><th>Bedeutung</th><th>Wortart</th>'+(listsOn?'<th></th>':'')+'</tr></thead>';
      const tb=el('tbody'); arr.forEach(w=>tb.appendChild(vocabRow(w,listsOn))); table.appendChild(tb);
      wrap.appendChild(table); group.appendChild(wrap); content.appendChild(group);
    });
    buildChips(Object.keys(byLesson).map(Number).sort((a,b)=>a-b), L=>'L'+L);
    buildTypeChips();
    if(listsOn){ content.addEventListener('click',e=>{
      const a=e.target.closest('.v-add'); if(a){ e.stopPropagation(); openListPicker([a.dataset.vid],a.dataset.word); return; }
      const al=e.target.closest('.v-add-lesson'); if(al){ const L=+al.dataset.lesson; const ids=(window.VOKABULAR||[]).filter(v=>v.lesson===L).map(v=>'v:'+v.kana+'|'+v.lesson); openListPicker(ids,'Lektion '+L); return; }
    }); }
  }
  function vocabRow(w,listsOn){
    const written=(w.kanji&&w.kanji.length)?w.kanji:w.kana;
    const showKana=(w.kanji&&w.kanji.length&&w.kanji!==w.kana);
    const tr=el('tr','item'); tr.dataset.filter=String(w.lesson);
    tr.dataset.type=vocabType(w.pos);
    tr.dataset.search=norm([w.kanji,w.kana,w.romaji,w.de,w.pos].join(' '));
    tr.innerHTML='<td class="vocab-jp">'+esc(written)+'</td><td>'+
      (showKana?'<span class="vocab-reading">'+esc(w.kana)+'</span>':'')+'</td>'+
      '<td class="de hideable">'+esc(w.de)+'</td><td><span class="pos">'+esc(w.pos)+'</span></td>'+
      (listsOn?'<td class="vocab-add"><button class="v-add" type="button" title="Zu Liste hinzufügen" data-vid="v:'+esc(w.kana)+'|'+w.lesson+'" data-word="'+esc(written)+'">＋</button></td>':'');
    return tr;
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
    content.addEventListener('click',e=>{ const h=e.target.closest('.card-toggle'); if(!h)return;
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
      '<div class="gp-head card-toggle"><span class="gp-pattern">'+esc(g.pattern)+'</span>'+
      (g.title?'<span class="gp-title">'+esc(g.title)+'</span>':'')+'<span class="tag">L'+L+'</span></div>'+
      '<div class="collapse-body">'+
      (g.bildung?'<div class="gp-bildung"><b>Bildung:</b> '+esc(g.bildung)+'</div>':'')+
      (g.tabelle?gpTable(g.tabelle):'')+
      (g.erklaerung?'<p class="gp-erk">'+esc(g.erklaerung)+'</p>':'')+
      (ex?'<ul class="gp-ex">'+ex+'</ul>':'')+
      '</div>';
    if(drillable.length){
      const btn=el('button','gp-learn','<span class="msi" aria-hidden="true">play_arrow</span> Diese Grammatik üben '+
        '<span class="gp-learn-n">'+drillable.length+' Sätze · beide Richtungen</span>');
      btn.type='button';
      btn.addEventListener('click',()=>openGrammarDrill(g,drillable));
      card.querySelector('.collapse-body').appendChild(btn);
    }
    const plus=(window.GRAMMATIK_PLUS||{})[g.pattern];
    if(plus)card.querySelector('.collapse-body').appendChild(grammarPlusBlock(g,plus));
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
    if(plus.uebungen&&plus.uebungen.length&&window.Exercises){
      const btn=el('button','gp-learn','<span class="msi" aria-hidden="true">play_arrow</span> Grammatik-Übungen <span class="gp-learn-n">'+plus.uebungen.length+' Aufgaben</span>'); btn.type='button';
      const host=el('div','gp-ex-host hidden');
      btn.addEventListener('click',()=>{ host.classList.toggle('hidden');
        if(!host.dataset.built){ buildPlusExercises(host,g.pattern,plus.uebungen); host.dataset.built='1'; } });
      wrap.appendChild(btn); wrap.appendChild(host);
    }
    return wrap;
  }
  function buildPlusExercises(host,pattern,uebungen){
    // Verb-Form-Muster (て/た/ない): immer neue, aus echten Verben generierte Aufgaben statt der
    // zwei statisch eingetippten. Fällt auf die statischen zurück, falls keine Verben verfügbar.
    const form=VERB_FORM_PATTERNS[pattern];
    const gen=form?genVerbFormExercises(form,Math.max(6,(uebungen||[]).length)):null;
    const list=(gen&&gen.length)?gen:(uebungen||[]);
    let i=0; const stage=el('div','gp-ex-stage'); host.appendChild(stage);
    function show(){
      if(i>=list.length){ stage.innerHTML='<div class="gp-ex-done">✓ Alle Übungen erledigt.</div>'; return; }
      const ex=Object.assign({},list[i],{srsId:'g:'+pattern});
      window.Exercises.renderExercise(ex,stage,{ onResult:()=>{
        const nx=el('button','btn btn-next gp-ex-next','Weiter →'); nx.type='button';
        nx.addEventListener('click',()=>{ i++; show(); }); stage.appendChild(nx);
      }});
    }
    show();
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
            '<div class="drill-prompt-lbl"></div>'+
            '<div class="drill-prompt"></div>'+
            '<div class="drill-answer hidden"><div class="drill-answer-lbl"></div><div class="drill-answer-txt"></div></div>'+
            '<div class="drill-controls">'+
              '<button class="btn-primary drill-reveal" type="button">Aufdecken <span class="kbd">Leertaste</span></button>'+
              '<button class="btn btn-again drill-again hidden" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>'+
              '<button class="btn btn-next drill-next hidden" type="button">Weiter →</button>'+
            '</div>'+
          '</div>'+
          '<div class="drill-done hidden"></div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);
    const q=s=>ov.querySelector(s);
    drill={ ov, pattern:q('.drill-pattern'), title:q('.drill-title'), dir:q('.drill-dir'), prog:q('.drill-prog'),
      card:q('.drill-card'), promptLbl:q('.drill-prompt-lbl'), prompt:q('.drill-prompt'),
      answer:q('.drill-answer'), answerLbl:q('.drill-answer-lbl'), answerTxt:q('.drill-answer-txt'),
      reveal:q('.drill-reveal'), again:q('.drill-again'), next:q('.drill-next'), done:q('.drill-done'),
      close:q('.drill-close'), deck:[], allCards:[], total:0 };
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
    if(e.code==='Space'){ e.preventDefault();
      if(!drill.answer.classList.contains('hidden'))drillNext();
      else if(!drill.reveal.classList.contains('hidden'))drillReveal(); }
  }
  function openGrammarDrill(g,examples){
    const d=ensureDrillDom();
    d.pattern.textContent=g.pattern||'';
    d.title.textContent=g.title||'';
    const cards=[];
    examples.forEach(b=>{ cards.push({dir:'jp2de',b}); cards.push({dir:'de2jp',b}); });
    d.allCards=cards.slice();
    d.deck=shuffle(cards); d.total=d.deck.length;
    d.ov.hidden=false; document.body.classList.add('drill-open');
    drillRender();
  }
  function closeDrill(){ if(!drill)return; drill.ov.hidden=true; document.body.classList.remove('drill-open'); }
  function drillRestart(){ const d=drill; d.deck=shuffle(d.allCards.slice()); d.total=d.deck.length; drillRender(); }
  function drillRender(){
    const d=drill;
    if(!d.deck.length){
      d.card.classList.add('hidden'); d.done.classList.remove('hidden');
      d.dir.textContent=''; d.prog.textContent='';
      if(d.total){
        d.done.innerHTML='<div class="drill-done-in">Geschafft!<br>Alle '+d.total+' Übersetzungen sitzen.</div>'+
          '<button class="btn-primary drill-restart" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal üben</button>';
        d.done.querySelector('.drill-restart').addEventListener('click',drillRestart);
      } else {
        d.done.innerHTML='<div class="drill-done-in">Für diesen Punkt gibt es noch keine Beispielsätze zum Üben.</div>';
      }
      return;
    }
    d.done.classList.add('hidden'); d.card.classList.remove('hidden');
    const learned=d.total-d.deck.length;
    d.prog.textContent='Satz '+(learned+1)+' / '+d.total;
    const c=d.deck[0], b=c.b;
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
  // Durchschnittliche Wiederholungen der Items einer Lektion (über alle Kern-Items, ungesehene zählen 0).
  function lessonRepsAvg(L,type){
    if(!(window.SRS&&window.SRS.lessonCore&&window.SRS.get))return 0;
    const core=window.SRS.lessonCore(L).filter(c=>!type||c.type===type);
    if(!core.length)return 0;
    let sum=0; core.forEach(c=>{ const it=window.SRS.get(c.id); if(it)sum+=it.reps||0; });
    return sum/core.length;
  }
  // Sakura-Wiederhol-Indikator je Lektion (Schwellen für Ø-Wiederholungen).
  function lessonRepsBadge(L,type){
    const avg=lessonRepsAvg(L,type);
    const s=el('span','grp-flower',sakuraSvg(avg,[1,2,4,7,12],{cls:'sakura-sm'}));
    s.title='Ø '+avg.toFixed(1)+' Wiederholungen';
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
      return '<div class="tr-answer-jp ja">'+ruby(written,v.kana)+'</div>'+
      '<div class="tr-mean">'+esc(v.de)+'</div>'+
      '<div class="tr-tag"><span class="pos">'+esc(v.pos)+'</span> · Lektion '+v.lesson+'</div>'; }
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
    const lessonParam=parseInt(new URLSearchParams(location.search).get('lesson'),10);
    const onlyLesson=isNaN(lessonParam)?null:lessonParam;
    function lessonOf(c){ return c.type==='kanji'?window.SRS.kanjiLessonOf(c.data.level):c.data.lesson; }
    function refreshStats(){ const s=window.SRS.stats(); setText('h-streak',s.streakDays); setText('h-due',s.due); setText('h-learned',s.learned); setHtml('h-streak-flower',sakuraSvg(s.streakDays)); }
    function start(){
      // Gating: Wiederholungen aus allen freigeschalteten Lektionen; NEUE Items fokussiert auf die
      // aktuelle Lektion (niedrigste, deren Kern noch nicht gemeistert ist) → füllt sichtbar den
      // Lernpfad-Fortschritt. Mit ?lesson=L gezielt genau eine Lektion lernen.
      const maxLesson=onlyLesson!=null?onlyLesson:window.SRS.maxUnlockedLesson();
      const newLesson=onlyLesson!=null?onlyLesson:window.SRS.currentLesson();
      deck=window.SRS.buildQueue({sources:['kanji','vocab','grammar'],newLimit:clampInt('h-newlimit',5),reviewLimit:clampInt('h-revlimit',15),maxLesson:maxLesson,newLesson:newLesson});
      if(onlyLesson!=null)deck=deck.filter(c=>lessonOf(c)===onlyLesson);
      total=deck.length; setup.classList.add('hidden'); done.classList.add('hidden'); stage.classList.remove('hidden'); render();
    }
    function finishItem(grade){ const c=deck[0]; if(grade!=null&&c)window.SRS.grade(c.id,grade); deck.shift(); refreshStats(); render(); }
    function render(){
      if(!deck.length){ stage.classList.add('hidden'); done.classList.remove('hidden');
        // Tagesaufgabe abgeschlossen → Streak genau einmal pro Tag hochzählen (nicht bei Einzel-Bewertungen).
        if(total>0){ window.SRS.completeDaily(); refreshStats(); }
        done.innerHTML=(total?'<div class="tr-done-in">Tagesrunde geschafft!<br>'+total+' Aufgaben erledigt.</div>':'<div class="tr-done-in">Für heute ist alles erledigt.</div>')+
          '<button class="btn-primary" id="h-again" type="button"><span class="msi" aria-hidden="true">refresh</span> Noch eine Runde</button>';
        const a=document.getElementById('h-again'); if(a)a.addEventListener('click',()=>{ done.classList.add('hidden'); setup.classList.remove('hidden'); refreshStats(); });
        return; }
      const c=deck[0], learned=total-deck.length;
      prog.textContent='Aufgabe '+(learned+1)+' / '+total+(onlyLesson!=null?' · Lektion '+onlyLesson:'');
      typeTag.textContent=({kanji:'漢字 Kanji',vocab:'語彙 Vokabel',grammar:'文法 Grammatik'}[c.type]||'')+(c.reason==='due'?' · Wiederholung':' · neu');
      typeTag.className='tag tr-type-'+c.type;
      // Kanji, das sein Schreib-Level erreicht hat: erst korrekt schreiben.
      if(c.type==='kanji'&&window.KanjiWrite&&window.SRS.needsWriting(c.id))renderWriteCard(c);
      else if(c.type==='grammar'&&window.Exercises&&window.SATZ_TEMPLATES&&window.SATZ_TEMPLATES[c.data.pattern])renderExerciseItem(c);
      else renderFlashcard(c);
    }
    function renderWriteCard(c){
      const k=c.data;
      body.innerHTML='<div class="tr-card kw-card"><div class="kw-head"><span class="tr-big ja">'+esc(k.k)+'</span>'+
        '<span class="tr-q">'+esc(k.meaning||'')+' — schreibe das Kanji in richtiger Strichreihenfolge</span></div>'+
        '<div class="kw-stage"></div><div class="kw-msg" aria-live="polite"></div>'+
        '<div class="tr-controls"><button class="btn h-kw-guide" type="button">Vorlage</button>'+
        '<button class="btn h-kw-play" type="button"><span class="msi" aria-hidden="true">play_arrow</span> Reihenfolge</button>'+
        '<button class="btn h-kw-clear" type="button">Löschen</button>'+
        '<button class="btn btn-again h-kw-again" type="button"><span class="msi" aria-hidden="true">refresh</span> Später</button></div></div>';
      const mount=body.querySelector('.kw-stage'), msg=body.querySelector('.kw-msg');
      const size=Math.min(300,(stage.clientWidth||320)-40);
      const snap=((window.SRS.get(c.id)||{}).writeReps||0)<3;
      fetch('assets/kanjivg/'+window.KanjiWrite.cpFile(k.k)).then(r=>r.text()).then(svg=>{
        const w=window.KanjiWrite.create(mount,{svgText:svg,size:size,snap:snap,
          onProgress:(i,n)=>{ msg.textContent='Strich '+i+' / '+n; },
          onComplete:()=>{ msg.textContent='✓ Richtig geschrieben!'; window.SRS.gradeWrite(c.id,true); refreshStats();
            const nx=el('button','btn-primary h-next','Weiter →'); nx.type='button'; nx.addEventListener('click',()=>finishItem(1)); body.querySelector('.tr-controls').appendChild(nx); }});
        body.querySelector('.h-kw-guide').addEventListener('click',()=>w.toggleGuide());
        body.querySelector('.h-kw-play').addEventListener('click',()=>w.play());
        body.querySelector('.h-kw-clear').addEventListener('click',()=>w.clear());
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
      const reveal=body.querySelector('.h-reveal'), good=body.querySelector('.h-good');
      if(reveal&&!reveal.classList.contains('hidden')){ e.preventDefault(); reveal.click(); }
      else if(good&&!good.classList.contains('hidden')){ e.preventDefault(); good.click(); } });
    if(startBtn)startBtn.addEventListener('click',start);
    refreshStats();
  }

  /* ============================================================  FORTSCHRITT (Statistik + Sicherung)  */
  function initProfil(){
    const root=document.getElementById('f-root'); if(!root||!window.SRS)return;
    function draw(){
      const s=window.SRS.stats(), snap=window.SRS.snapshot(), fc=window.SRS.forecast(undefined,7);
      const maxC=Math.max(1,...fc.map(d=>d.count));
      const bars=fc.map(d=>'<div class="f-bar"><div class="f-bar-fill" style="height:'+Math.round(d.count/maxC*100)+'%"></div>'+
        '<span class="f-bar-n">'+d.count+'</span><span class="f-bar-d">'+d.date.slice(5)+'</span></div>').join('');
      setText('f-streak',s.streakDays); setText('f-learned',s.learned); setText('f-due',s.due); setText('f-reviews',s.totalReviews); setHtml('f-streak-flower',sakuraSvg(s.streakDays));
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
      const cls=st.testPassed?'lp-done':(st.unlocked?(st.coreMastered?'lp-test':'lp-open'):'lp-locked');
      const badge=st.testPassed?icon('check_circle'):(st.unlocked?(st.coreMastered?icon('quiz'):icon('play_arrow')):icon('lock'));
      const card=el('article','lp-card '+cls);
      let html='<div class="lp-top"><span class="lp-num">Lektion '+L+'</span><span class="lp-badge">'+badge+'</span></div>'+
        '<div class="lp-thema">'+esc(thema)+'</div>';
      if(!st.unlocked){ html+='<div class="lp-hint"><span class="msi" aria-hidden="true">lock</span> Erst die vorige Lektion bestehen.</div>'; card.innerHTML=html; return card; }
      html+='<div class="lp-core"><div class="lp-core-bar"><span style="width:'+Math.round(cp.fraction*100)+'%"></span></div>'+
        '<span class="lp-core-n">beherrscht '+cp.mastered+' / '+cp.total+'</span></div><div class="lp-actions"></div>';
      card.innerHTML=html;
      const actions=card.querySelector('.lp-actions');
      const learn=el('a','btn lp-learn',st.coreMastered?'Weiter üben':'Lektion lernen'); learn.href='heute.html?lesson='+L; actions.appendChild(learn);
      if(st.coreMastered){ const t=el('button','btn-primary lp-test-btn',st.testPassed?'Test wiederholen':'Test starten'); t.type='button';
        t.addEventListener('click',()=>openLessonTest(L)); actions.appendChild(t); }
      else { actions.appendChild(el('span','lp-need','Erst alle Kern-Items beherrschen, dann Test.')); }
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
  // Freies-Üben-Hub (ueben.html): Quelle wählen → Zufallskarten dieser Quelle.
  function initUeben(){
    const root=document.getElementById('ueben-root'); if(!root)return;
    root.addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b)openFreePractice(b.dataset.src); });
  }

  /* ============================================================  LISTEN (persönliche Vokabellisten)  */
  function initListen(){
    const root=document.getElementById('lst-root'); if(!root||!window.SRS)return;
    const nameInp=document.getElementById('lst-create-name'), createBtn=document.getElementById('lst-create');

    function vocabFront(v){ const w=(v.kanji&&v.kanji.length)?v.kanji:v.kana; return ruby(w,v.kana); }
    function draw(){
      const ls=window.SRS.lists();
      root.innerHTML='';
      if(!ls.length){ root.appendChild(el('p','lst-empty','Noch keine Liste. Lege oben eine an oder füge auf der <a href="vokabular.html">Vokabular-Seite</a> Wörter hinzu.')); return; }
      ls.forEach(l=>{
        const items=window.SRS.listItems(l.id);
        const card=el('article','lst-card');
        card.innerHTML='<div class="lst-head"><span class="lst-name">'+esc(l.name)+'</span><span class="lst-count">'+items.length+' Wörter</span></div>'+
          '<div class="lst-actions"></div><div class="lst-items hidden"></div>';
        const actions=card.querySelector('.lst-actions');
        const train=el('button','btn-primary lst-train','<span class="msi" aria-hidden="true">play_arrow</span> Üben'); train.type='button'; train.disabled=!items.length;
        train.addEventListener('click',()=>openTrainer(l));
        const show=el('button','btn lst-show',(items.length?'Wörter ('+items.length+')':'Wörter')); show.type='button';
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
        row.innerHTML='<span class="lst-jp ja">'+vocabFront(o.data)+'</span><span class="lst-de">'+esc(o.data.de)+'</span>';
        const rm=el('button','lst-rm','<span class="msi" aria-hidden="true">close</span>'); rm.type='button'; rm.title='Aus Liste entfernen';
        rm.addEventListener('click',()=>{ window.SRS.removeFromList(l.id,[o.id]); draw(); });
        row.appendChild(rm); box.appendChild(row); });
    }

    /* ----- Trainer (Karteikarten, Richtung de↔jp) ----- */
    let tov=null, dir='jp2de';
    function ensureTrainer(){
      if(tov)return tov;
      tov=el('div','lt-overlay'); tov.hidden=true;
      tov.innerHTML='<div class="lt-modal" role="dialog" aria-modal="true" aria-label="Liste trainieren">'+
        '<div class="lt-head"><span class="lt-title"></span>'+
          '<button class="lt-dir btn" type="button"></button>'+
          '<button class="drill-close lt-close" type="button" aria-label="Schließen"><span class="msi" aria-hidden="true">close</span></button></div>'+
        '<div class="lt-top"><span class="lt-prog"></span></div>'+
        '<div class="lt-card"><div class="lt-front"></div><div class="lt-back hidden"></div>'+
          '<div class="lt-controls"><button class="btn-primary lt-reveal" type="button">Aufdecken <span class="kbd">Leertaste</span></button>'+
          '<button class="btn btn-again lt-again hidden" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>'+
          '<button class="btn btn-next lt-good hidden" type="button">Gewusst →</button></div></div>'+
        '<div class="lt-done hidden"></div></div>';
      document.body.appendChild(tov);
      tov.querySelector('.lt-close').addEventListener('click',()=>{ tov.hidden=true; });
      tov.addEventListener('click',e=>{ if(e.target===tov)tov.hidden=true; });
      document.addEventListener('keydown',e=>{ if(tov.hidden)return;
        if(e.key==='Escape'){ tov.hidden=true; return; }
        if(e.code==='Space'){ e.preventDefault(); const good=tov.querySelector('.lt-good'), rev=tov.querySelector('.lt-reveal');
          if(good&&!good.classList.contains('hidden'))good.click(); else if(rev&&!rev.classList.contains('hidden'))rev.click(); } });
      return tov;
    }
    function openTrainer(l){
      const ov=ensureTrainer();
      const q=s=>ov.querySelector(s);
      const title=q('.lt-title'), dirBtn=q('.lt-dir'), prog=q('.lt-prog'),
        card=q('.lt-card'), front=q('.lt-front'), back=q('.lt-back'), done=q('.lt-done'),
        reveal=q('.lt-reveal'), again=q('.lt-again'), good=q('.lt-good');
      title.textContent=l.name;
      let deck=[], total=0;
      function dirLabel(){ return dir==='jp2de'?'日本語 → Deutsch':'Deutsch → 日本語'; }
      function start(){ const items=window.SRS.listItems(l.id); deck=shuffle(items.slice()); total=deck.length; done.classList.add('hidden'); card.classList.remove('hidden'); render(); }
      function render(){
        if(!deck.length){ card.classList.add('hidden'); done.classList.remove('hidden');
          done.innerHTML=total?'<div class="tr-done-in">Geschafft!<br>Alle '+total+' Karten durch.</div><button class="btn-primary lt-restart" type="button"><span class="msi" aria-hidden="true">refresh</span> Nochmal</button>':'<div class="tr-done-in">Diese Liste ist leer.</div>';
          const rs=done.querySelector('.lt-restart'); if(rs)rs.addEventListener('click',start); return; }
        const learned=total-deck.length; prog.textContent='Karte '+(learned+1)+' / '+total;
        const o=deck[0], v=o.data;
        const jp='<div class="lt-jp ja">'+vocabFront(v)+'</div>', de='<div class="lt-de">'+esc(v.de)+'</div>';
        const reading='<div class="lt-reading ja">'+esc(v.kana)+'</div>';
        if(dir==='jp2de'){ front.innerHTML=jp; back.innerHTML=de+reading; }
        else { front.innerHTML=de; back.innerHTML=jp+reading; }
        back.classList.add('hidden'); reveal.classList.remove('hidden'); again.classList.add('hidden'); good.classList.add('hidden');
      }
      reveal.onclick=()=>{ back.classList.remove('hidden'); reveal.classList.add('hidden'); again.classList.remove('hidden'); good.classList.remove('hidden'); };
      good.onclick=()=>{ const o=deck.shift(); if(window.SRS.get(o.id)||true)window.SRS.grade(o.id,1); render(); };
      again.onclick=()=>{ const o=deck.shift(); window.SRS.grade(o.id,0); deck.push(o); render(); };
      dirBtn.textContent=dirLabel();
      dirBtn.onclick=()=>{ dir=dir==='jp2de'?'de2jp':'jp2de'; dirBtn.textContent=dirLabel(); start(); };
      ov.hidden=false; start();
    }

    if(createBtn)createBtn.addEventListener('click',()=>{ const nm=(nameInp.value||'').trim(); if(!nm){ nameInp.focus(); return; } window.SRS.createList(nm); nameInp.value=''; draw(); });
    if(nameInp)nameInp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&createBtn)createBtn.click(); });
    draw();
  }

  /* ============================================================  INIT  */
  function init(){
    const page=document.body.dataset.page;
    renderNav(page);
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
    if(page==='ueben')initUeben();
    if(page==='heute')initHeute();
    if(page==='profil')initProfil();
    if(page==='schreiben')initSchreiben();
    if(page==='listen')initListen();
    if(page==='lernpfad')initLernpfad();
    initSearch(); initToggles();
  }
  /* ---------- geteilte Helfer für die neuen Module (srs.js, exercises.js, kanji-write.js) ----------
     Additiv: macht die intern definierten Helfer nutzbar, ohne sie zu duplizieren.
     Vor init() gesetzt, damit Render-Code (z. B. Grammatik-Übungen) sie schon nutzen kann. */
  window.Katalog = {
    el, esc, ruby, rubyPair, norm, furiToRuby, kanaToRomaji, shuffle,
    conjugate, allForms, verbGroup, genVerbFormExercises, sakuraPetals, sakuraSvg, lsGet, lsSet
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();

  /* ---------- PWA: Service Worker registrieren (offline-fähig, installierbar) ---------- */
  if(typeof navigator!=='undefined' && 'serviceWorker' in navigator && location.protocol!=='file:'){
    window.addEventListener('load',function(){ navigator.serviceWorker.register('service-worker.js').catch(function(){}); });
  }
})();
