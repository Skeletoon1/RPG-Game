"use strict";
// ============================================================================
//  AUDIO — procedural SFX & music via Web Audio API (no sound files).
//  Created lazily on first user interaction (browser autoplay policy).
// ============================================================================
const Audio2 = {
  ctx:null, master:null, musicGain:null, sfxGain:null,
  enabled:true, started:false, musicTimer:null, step:0, curMusic:null,

  init(){
    if(this.ctx) return;
    try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ this.ctx=null; return; }
    this.master=this.ctx.createGain(); this.master.gain.value=this.enabled?0.9:0; this.master.connect(this.ctx.destination);
    this.musicGain=this.ctx.createGain(); this.musicGain.gain.value=0.18; this.musicGain.connect(this.master);
    this.sfxGain=this.ctx.createGain(); this.sfxGain.gain.value=0.5; this.sfxGain.connect(this.master);
  },
  ensure(){ this.init(); if(this.ctx && this.ctx.state==="suspended") this.ctx.resume(); },
  setEnabled(on){ this.enabled=on; if(this.master) this.master.gain.value=on?0.9:0; },

  tone(freq, dur, type, gain, when, dest, glideTo){
    if(!this.ctx) return; const t=(when||this.ctx.currentTime);
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type||"sine"; o.frequency.setValueAtTime(freq,t);
    if(glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(gain||0.3, t+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(dest||this.sfxGain); o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur, gain, filtFreq){
    if(!this.ctx) return; const t=this.ctx.currentTime;
    const n=Math.floor(this.ctx.sampleRate*dur), buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=filtFreq||2200;
    const g=this.ctx.createGain(); g.gain.value=gain||0.4;
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start(t);
  },

  // ---- SFX ----
  hit(){ this.ensure(); this.noise(0.18,0.5,1800); this.tone(150,0.12,"square",0.18,0,null,60); },
  crit(){ this.ensure(); this.noise(0.25,0.6,3000); this.tone(220,0.18,"sawtooth",0.25,0,null,70); },
  spell(elem){ this.ensure();
    const map={Fire:[330,90],Ice:[880,1400],Lightning:[120,1500],Dark:[110,55],Holy:[660,990],
      Poison:[200,140],Arcane:[440,880],Physical:[180,90]};
    const m=map[elem]||map.Arcane; const t=this.ctx?this.ctx.currentTime:0;
    this.tone(m[0],0.35,"triangle",0.28,t,null,m[1]);
    this.tone(m[0]*1.5,0.3,"sine",0.14,t+0.02,null,m[1]*1.5); },
  heal(){ this.ensure(); const t=this.ctx?this.ctx.currentTime:0;
    [523,659,784].forEach((f,i)=>this.tone(f,0.4,"sine",0.22,t+i*0.06)); },
  buff(){ this.ensure(); const t=this.ctx?this.ctx.currentTime:0;
    [330,440].forEach((f,i)=>this.tone(f,0.3,"triangle",0.2,t+i*0.05,null,f*1.2)); },
  select(){ this.ensure(); this.tone(660,0.06,"square",0.14); },
  levelup(){ this.ensure(); const t=this.ctx?this.ctx.currentTime:0;
    [523,659,784,1046].forEach((f,i)=>this.tone(f,0.5,"triangle",0.25,t+i*0.1)); },
  victory(){ this.ensure(); const t=this.ctx?this.ctx.currentTime:0;
    [523,659,784,1046,784,1046].forEach((f,i)=>this.tone(f,0.5,"sawtooth",0.22,t+i*0.13)); },
  defeat(){ this.ensure(); const t=this.ctx?this.ctx.currentTime:0;
    [440,392,330,262].forEach((f,i)=>this.tone(f,0.6,"sine",0.25,t+i*0.18,null,f*0.85)); },
  coin(){ this.ensure(); this.tone(988,0.08,"square",0.18); this.tone(1319,0.1,"square",0.16,(this.ctx?this.ctx.currentTime:0)+0.05); },

  // ---- Music (16-step looping arpeggio + bass, mood per area) ----
  MUS:{
    menu:{root:220,scale:[0,3,7,10,12],tempo:300,wave:"triangle"},
    village:{root:262,scale:[0,4,7,11,12],tempo:280,wave:"triangle"},
    forest:{root:196,scale:[0,3,5,7,10],tempo:300,wave:"sine"},
    swamp:{root:175,scale:[0,2,3,7,8],tempo:330,wave:"sine"},
    crypt:{root:147,scale:[0,1,5,6,8],tempo:340,wave:"sawtooth"},
    capital:{root:165,scale:[0,3,6,7,10],tempo:240,wave:"sawtooth"},
    battle:{root:147,scale:[0,3,5,6,10],tempo:200,wave:"square"},
    boss:{root:110,scale:[0,1,5,7,8],tempo:180,wave:"sawtooth"},
  },
  startMusic(key){ this.ensure(); if(!this.ctx) return;
    if(this.curMusic===key) return; this.curMusic=key; this.stopMusic();
    const m=this.MUS[key]||this.MUS.menu; this.step=0;
    const stepFn=()=>{ if(!this.ctx) return; const s=this.step++, t=this.ctx.currentTime;
      const note=m.scale[s%m.scale.length]; const oct=(Math.floor(s/m.scale.length)%2)*12;
      const f=m.root*Math.pow(2,(note+oct)/12);
      this.tone(f,0.28,m.wave,0.16,t,this.musicGain);
      if(s%4===0){ this.tone(m.root/2,0.5,"sine",0.22,t,this.musicGain); } // bass
      if(s%8===0){ this.tone(m.root*1.5,0.6,"triangle",0.07,t,this.musicGain); } // pad
    };
    this.musicTimer=setInterval(stepFn, m.tempo); stepFn();
  },
  stopMusic(){ if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; } },
};
