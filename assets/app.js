/* ============================================================
   日本語 A1.7 — Lern-Katalog · app.js
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
  function norm(s){ return String(s==null?'':s).toLowerCase(); }

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
  let items=[], groups=[], activeFilter='all', query='';

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
    card.innerHTML=
      '<div class="kc-top"><div class="kanji-char">'+esc(k.k)+'</div>'+
      '<div class="kc-meta"><span class="tag">'+esc(k.level)+(k.cls?' · '+esc(k.cls):'')+'</span>'+
      (k.strokes?'<span class="strokes">'+esc(k.strokes)+' Striche</span>':'')+'</div></div>'+
      '<div class="kc-meaning">'+esc(k.meaning)+'</div>'+
      '<div class="readings hideable">'+
        (on?'<div class="reading-row"><span class="lbl">音</span><span class="vals">'+esc(on)+'</span></div>':'')+
        (kun?'<div class="reading-row"><span class="lbl kun">訓</span><span class="vals">'+esc(kun)+'</span></div>':'')+'</div>'+
      (exHtml?'<div class="kc-examples hideable">'+exHtml+'</div>':'');
    return card;
  }

  /* ============================================================  VOKABULAR  */
  function renderVocab(content){
    const data=window.VOKABULAR||[], byLesson={};
    data.forEach(w=>{(byLesson[w.lesson]=byLesson[w.lesson]||[]).push(w);});
    Object.keys(byLesson).map(Number).sort((a,b)=>a-b).forEach(L=>{
      const arr=byLesson[L];
      const group=el('section','group'); group.dataset.group=String(L);
      group.appendChild(groupHead('Lektion '+L,(L>20?'🔒 Vorschau · ':'')+((LESSON[L]||{}).thema||''),arr.length));
      const wrap=el('div','table-wrap'), table=el('table','vocab');
      table.innerHTML='<thead><tr><th>Japanisch</th><th>Lesung</th><th>Bedeutung</th><th>Wortart</th></tr></thead>';
      const tb=el('tbody'); arr.forEach(w=>tb.appendChild(vocabRow(w))); table.appendChild(tb);
      wrap.appendChild(table); group.appendChild(wrap); content.appendChild(group);
    });
    buildChips(Object.keys(byLesson).map(Number).sort((a,b)=>a-b), L=>'L'+L);
  }
  function vocabRow(w){
    const written=(w.kanji&&w.kanji.length)?w.kanji:w.kana;
    const showKana=(w.kanji&&w.kanji.length&&w.kanji!==w.kana);
    const tr=el('tr','item'); tr.dataset.filter=String(w.lesson); tr.dataset.preview=w.lesson>20?'1':'0';
    tr.dataset.search=norm([w.kanji,w.kana,w.romaji,w.de,w.pos].join(' '));
    tr.innerHTML='<td class="vocab-jp">'+esc(written)+'</td><td>'+
      (showKana?'<span class="vocab-reading">'+esc(w.kana)+'</span> ':'')+
      '<span class="vocab-romaji">'+esc(w.romaji)+'</span></td>'+
      '<td class="de hideable">'+esc(w.de)+'</td><td><span class="pos">'+esc(w.pos)+'</span></td>';
    return tr;
  }

  /* ============================================================  GRAMMATIK  */
  function renderGrammar(content){
    const data=window.GRAMMATIK||[], byLesson={};
    data.forEach(g=>{(byLesson[g.lesson]=byLesson[g.lesson]||[]).push(g);});
    Object.keys(byLesson).map(Number).sort((a,b)=>a-b).forEach(L=>{
      const arr=byLesson[L];
      const group=el('section','group'); group.dataset.group=String(L);
      group.appendChild(groupHead('Lektion '+L,(L>20?'🔒 Vorschau · ':'')+((LESSON[L]||{}).thema||''),arr.length));
      arr.forEach(g=>group.appendChild(grammarCard(g,L)));
      content.appendChild(group);
    });
    buildChips(Object.keys(byLesson).map(Number).sort((a,b)=>a-b), L=>'L'+L);
  }
  function gpTable(t){
    const rows=(t.rows||[]).map(r=>'<tr><th>'+esc(r.g)+'</th><td>'+esc(r.regel)+'</td><td class="ja">'+esc(r.bsp)+'</td></tr>').join('');
    return '<table class="conj-table"><thead><tr><th>Gruppe</th><th>Regel</th><th>Beispiel</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function grammarCard(g,L){
    const extra=(window.GRAMMATIK_EXTRA&&window.GRAMMATIK_EXTRA[g.pattern])||[];
    const all=(g.beispiele||[]).concat(extra);
    const ex=all.map(b=>'<li><span class="ex-jp">'+esc(b.jp)+'</span>'+
      (b.r?'<span class="ex-romaji">'+esc(b.r)+'</span>':'')+
      (b.de?'<span class="ex-trans hideable">'+esc(b.de)+'</span>':'')+'</li>').join('');
    const drillable=all.filter(b=>b.jp&&b.de);
    const card=el('article','gp item'); card.dataset.filter=String(L); card.dataset.preview=L>20?'1':'0';
    card.dataset.search=norm([g.pattern,g.title,g.bildung,g.erklaerung,all.map(b=>b.jp+' '+b.de).join(' ')].join(' '));
    card.innerHTML=
      '<div class="gp-head"><span class="gp-pattern">'+esc(g.pattern)+'</span>'+
      (g.title?'<span class="gp-title">'+esc(g.title)+'</span>':'')+'<span class="tag">L'+L+'</span></div>'+
      (g.bildung?'<div class="gp-bildung"><b>Bildung:</b> '+esc(g.bildung)+'</div>':'')+
      (g.tabelle?gpTable(g.tabelle):'')+
      (g.erklaerung?'<p class="gp-erk">'+esc(g.erklaerung)+'</p>':'')+
      (ex?'<ul class="gp-ex">'+ex+'</ul>':'');
    if(drillable.length){
      const btn=el('button','gp-learn','▶ Diese Grammatik üben '+
        '<span class="gp-learn-n">'+drillable.length+' Sätze · beide Richtungen</span>');
      btn.type='button';
      btn.addEventListener('click',()=>openGrammarDrill(g,drillable));
      card.appendChild(btn);
    }
    return card;
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
          '<button class="drill-close" type="button" aria-label="Schließen">✕</button>'+
        '</div>'+
        '<div class="drill-stage">'+
          '<div class="drill-top"><span class="drill-dir"></span><span class="drill-prog"></span></div>'+
          '<div class="drill-card">'+
            '<div class="drill-prompt-lbl"></div>'+
            '<div class="drill-prompt"></div>'+
            '<div class="drill-answer hidden"><div class="drill-answer-lbl"></div><div class="drill-answer-txt"></div></div>'+
            '<div class="drill-controls">'+
              '<button class="btn-primary drill-reveal" type="button">Aufdecken <span class="kbd">Leertaste</span></button>'+
              '<button class="btn btn-again drill-again hidden" type="button">↻ Nochmal</button>'+
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
        d.done.innerHTML='<div class="drill-done-in">🎉 Geschafft!<br>Alle '+d.total+' Übersetzungen sitzen.</div>'+
          '<button class="btn-primary drill-restart" type="button">↻ Nochmal üben</button>';
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
    const jpHtml='<div class="drill-jp ja">'+esc(b.jp)+'</div>'+(b.r?'<div class="ex-romaji">'+esc(b.r)+'</div>':'');
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
    // Klick/Enter auf eine Form-Zeile blendet kurz die Bildungsregel ein.
    const toggleRow=row=>{ const open=row.classList.toggle('open'); row.setAttribute('aria-expanded',open?'true':'false'); };
    content.addEventListener('click',e=>{ const row=e.target.closest('.vf-row'); if(row)toggleRow(row); });
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
    const card=el('article','verb-card item'); card.dataset.filter=String(g); card.dataset.preview=v.lesson>20?'1':'0';
    card.dataset.search=norm([v.kana,v.kanji,v.romaji,v.de,Object.keys(kana).map(k=>kana[k]).join(' ')].join(' '));
    card.innerHTML=
      '<div class="vc-head"><span class="vc-dict ja">'+rubyPair(disp.dict,kana.dict)+'</span>'+
      '<span class="tag">'+gname+' · L'+v.lesson+'</span></div>'+
      '<div class="vc-de">'+esc(v.de)+'</div>'+
      '<table class="vforms hideable">'+body+'</table>';
    return card;
  }

  /* ---------- gemeinsame Bausteine ---------- */
  function groupHead(title,theme,n){
    const h=el('div','group-head');
    h.innerHTML='<h2>'+esc(title)+'</h2>'+(theme?'<span class="theme">'+esc(theme)+'</span>':'')+'<span class="gcount">'+n+'</span>';
    return h;
  }
  function buildChips(values,labelFn){
    const box=document.getElementById('filters'); if(!box)return;
    const mk=(val,label)=>{ const prev=(val!=='all'&&!isNaN(+val)&&+val>20); const c=el('button','chip'+(val==='all'?' on':'')+(prev?' chip-preview':'')); c.textContent=label; c.dataset.val=val;
      c.addEventListener('click',()=>{ activeFilter=val; box.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.val===val)); applyFilter(); }); return c; };
    box.appendChild(mk('all','Alle'));
    values.forEach(v=>box.appendChild(mk(String(v),labelFn(v))));
  }
  function applyFilter(){
    const q=query.trim().toLowerCase(); let shown=0;
    const previewOn=document.body.classList.contains('show-preview');
    items.forEach(it=>{ const okF=activeFilter==='all'||it.dataset.filter===activeFilter; const okQ=!q||(it.dataset.search||'').indexOf(q)!==-1;
      const okP=previewOn||it.dataset.preview!=='1';
      const vis=okF&&okQ&&okP; it.classList.toggle('hidden',!vis); if(vis)shown++; });
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
    // Rōmaji (Standard: AN) — blendet die Rōmaji-Umschrift aus
    const romaOn=lsGet('katalog_romaji')!=='off';
    body.classList.toggle('romaji-off',!romaOn);
    const roBtn=document.getElementById('toggle-romaji'); setPressed(roBtn,romaOn);
    if(roBtn)roBtn.addEventListener('click',()=>{ const off=body.classList.toggle('romaji-off'); setPressed(roBtn,!off); lsSet('katalog_romaji',off?'off':'on'); });
    // Karteikarten (Standard: AUS)
    const cardsOn=lsGet('katalog_cards')==='on';
    body.classList.toggle('cards-mode',cardsOn);
    const cBtn=document.getElementById('toggle-cards'); setPressed(cBtn,cardsOn);
    if(cBtn)cBtn.addEventListener('click',()=>{ const on=body.classList.toggle('cards-mode'); setPressed(cBtn,on); lsSet('katalog_cards',on?'on':'off');
      if(on)document.querySelectorAll('.hideable.revealed').forEach(e=>e.classList.remove('revealed')); });
    // Vorschau L21–25 (Standard: AUS) — applyFilter() läuft VOR dem Speichern, falls localStorage blockiert ist
    const previewOn=lsGet('katalog_preview')==='on';
    body.classList.toggle('show-preview',previewOn);
    const pBtn=document.getElementById('toggle-preview'); setPressed(pBtn,previewOn);
    if(pBtn)pBtn.addEventListener('click',()=>{ const on=body.classList.toggle('show-preview'); setPressed(pBtn,on); applyFilter(); lsSet('katalog_preview',on?'on':'off'); });
    document.addEventListener('click',e=>{ if(!body.classList.contains('cards-mode'))return; const h=e.target.closest('.hideable'); if(h)h.classList.toggle('revealed'); });
    applyFilter();
  }
  function initSearch(){ const input=document.getElementById('search-input'); if(!input)return; input.addEventListener('input',()=>{ query=input.value; applyFilter(); }); }

  /* ============================================================  TRAINING (Üben)  */
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function initTraining(){
    const front=document.getElementById('tr-front'), back=document.getElementById('tr-back');
    const prog=document.getElementById('tr-progress'), type=document.getElementById('tr-type');
    const revealBtn=document.getElementById('tr-reveal'), againBtn=document.getElementById('tr-again'), nextBtn=document.getElementById('tr-next');
    const done=document.getElementById('tr-done'), cardBox=document.getElementById('tr-card'), newBtn=document.getElementById('tr-new');
    if(!cardBox)return;
    let deck=[], total=0;
    const on=id=>{ const e=document.getElementById(id); return e?e.checked:true; };
    function pool(){ const p=[]; const prev=document.body.classList.contains('show-preview');
      if(on('src-kanji'))(window.KANJI||[]).forEach(k=>p.push({t:'kanji',d:k}));
      if(on('src-vocab'))(window.VOKABULAR||[]).forEach(v=>{ if(prev||v.lesson<=20)p.push({t:'vocab',d:v}); });
      if(on('src-grammar'))(window.GRAMMATIK||[]).forEach(g=>{ if(prev||g.lesson<=20)p.push({t:'grammar',d:g}); });
      return p; }
    function start(){ const p=pool(); deck=p.length?shuffle(p.slice()).slice(0,10):[]; total=deck.length;
      done.classList.add('hidden'); cardBox.classList.remove('hidden'); render(); }
    function render(){
      if(!deck.length){ cardBox.classList.add('hidden'); done.classList.remove('hidden');
        done.innerHTML = total ? '<div class="tr-done-in">🎉 Runde geschafft!<br>Alle '+total+' Karten gelernt.</div>' : '<div class="tr-done-in">Bitte mindestens eine Quelle auswählen.</div>'; return; }
      const learned=total-deck.length; prog.textContent='Gelernt '+learned+' / '+total;
      const c=deck[0]; type.textContent={kanji:'漢字 Kanji',vocab:'語彙 Vokabel',grammar:'文法 Grammatik'}[c.t];
      type.className='tag tr-type-'+c.t;
      front.innerHTML=frontHtml(c); back.innerHTML=backHtml(c); back.classList.add('hidden');
      revealBtn.classList.remove('hidden'); againBtn.classList.add('hidden'); nextBtn.classList.add('hidden');
    }
    function reveal(){ back.classList.remove('hidden'); revealBtn.classList.add('hidden'); againBtn.classList.remove('hidden'); nextBtn.classList.remove('hidden'); }
    function next(){ deck.shift(); render(); }
    function again(){ const c=deck.shift(); deck.push(c); render(); }
    revealBtn.addEventListener('click',reveal); nextBtn.addEventListener('click',next); againBtn.addEventListener('click',again);
    if(newBtn)newBtn.addEventListener('click',start);
    document.addEventListener('keydown',e=>{ if(e.code==='Space'){ e.preventDefault();
      if(!back.classList.contains('hidden'))next(); else if(!revealBtn.classList.contains('hidden'))reveal(); } });
    start();
  }
  // Menge aller Kanji, die in der Kanji-Liste vorkommen (für „außerhalb der Liste“-Erkennung).
  let _kanjiSet=null;
  function kanjiSet(){ if(_kanjiSet)return _kanjiSet; _kanjiSet=new Set();
    (window.KANJI||[]).forEach(k=>{ for(const ch of String(k.k||'')) _kanjiSet.add(ch); }); return _kanjiSet; }
  function isKanjiChar(ch){ return /[㐀-鿿豈-﫿]/.test(ch); }
  // true, wenn das Wort mindestens ein Kanji enthält, das NICHT in der Kanji-Liste steht.
  function hasUnlistedKanji(word){ const set=kanjiSet();
    for(const ch of String(word||'')){ if(isKanjiChar(ch) && !set.has(ch)) return true; } return false; }
  function frontHtml(c){
    if(c.t==='kanji')return '<div class="tr-big ja">'+esc(c.d.k)+'</div><div class="tr-q">On-/Kun-Lesung & Bedeutung?</div>';
    if(c.t==='vocab'){ const v=c.d, w=(v.kanji&&v.kanji.length)?v.kanji:v.kana;
      // Enthält das Wort ein Kanji außerhalb der Liste, ist die Lesung nicht erlernbar → Furigana vorgeben.
      const furi=hasUnlistedKanji(w);
      return '<div class="tr-word ja">'+(furi?ruby(w,v.kana):esc(w))+'</div>'+
        (furi?'<div class="tr-furi-note">enthält Kanji außerhalb der Kanji-Liste</div>':'')+
        '<div class="tr-q">Lesung & Bedeutung?</div>'; }
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
      '<div class="tr-sub"><span class="vocab-romaji">'+esc(v.romaji)+'</span></div>'+
      '<div class="tr-tag"><span class="pos">'+esc(v.pos)+'</span> · Lektion '+v.lesson+'</div>'; }
    const g=c.d, ex=(g.beispiele||[]).slice(0,2).map(b=>'<li><span class="ex-jp">'+esc(b.jp)+'</span>'+
      (b.r?'<span class="ex-romaji">'+esc(b.r)+'</span>':'')+'<span class="ex-trans">'+esc(b.de)+'</span></li>').join('');
    return '<div class="tr-mean">'+esc(g.title||'')+' <span class="tag">L'+g.lesson+'</span></div>'+
      (g.bildung?'<div class="gp-bildung"><b>Bildung:</b> '+esc(g.bildung)+'</div>':'')+
      (g.erklaerung?'<p class="gp-erk">'+esc(g.erklaerung)+'</p>':'')+(ex?'<ul class="gp-ex">'+ex+'</ul>':'');
  }

  /* ============================================================  INIT  */
  function init(){
    const page=document.body.dataset.page;
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
    if(page==='ueben')initTraining();
    initSearch(); initToggles();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
