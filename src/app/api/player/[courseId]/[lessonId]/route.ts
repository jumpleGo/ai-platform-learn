import { getLesson } from '@/lib/db/courses';
import { getSubscription } from '@/lib/db/subscriptions';
import { getSession } from '@/lib/session';
import { isLocked } from '@/lib/access';
import { playerEmbedUrl, youtubeId } from '@/lib/video-url';

// Экранирование для подстановки в значение HTML-атрибута
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  // встраивать плеер может только наш же сайт
  'content-security-policy': "frame-ancestors 'self'",
  'x-robots-tag': 'noindex, nofollow',
  // контент доступен по подписке — не кешируем в общих кэшах
  'cache-control': 'private, no-store',
} as const;

// Кастомный плеер поверх YouTube: нативные контролы скрыты (controls=0), сверху — прозрачный
// «щит», который перехватывает правый клик и клики, поэтому меню «Скопировать URL видео» и
// ссылка на канал недоступны. Управление — собственная панель через YouTube IFrame API.
function youtubePlayerHtml(videoId: string, title: string, poster: string | null): string {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttr(title)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
  #stage{position:absolute;inset:0;overflow:hidden;background:#000}
  #yt,#yt iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none}
  /* щит над плеером: глотает правый клик и клики по чужим ссылкам */
  #shield{position:absolute;inset:0;z-index:2;cursor:pointer}
  #bar{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;align-items:center;gap:10px;
       padding:10px 14px;color:#fff;background:linear-gradient(to top,rgba(0,0,0,.7),transparent);
       opacity:0;transition:opacity .2s;pointer-events:none}
  #stage.show #bar,#stage.paused #bar{opacity:1;pointer-events:auto}
  #bar button{background:none;border:0;color:#fff;cursor:pointer;padding:4px;display:flex;align-items:center}
  #bar button svg{width:22px;height:22px;display:block;fill:currentColor}
  #time{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;opacity:.9}
  input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:4px;
       background:rgba(255,255,255,.3);cursor:pointer;outline:none}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#fff}
  input[type=range]::-moz-range-thumb{width:13px;height:13px;border:0;border-radius:50%;background:#fff}
  #seek{flex:1}
  #vol{width:74px}
  #poster{position:absolute;inset:0;z-index:4;background:#000 center/cover no-repeat;
       display:flex;align-items:center;justify-content:center;cursor:pointer}
  #poster .play{width:72px;height:72px;border-radius:50%;background:rgba(0,0,0,.55);
       display:flex;align-items:center;justify-content:center;transition:transform .15s,background .15s}
  #poster:hover .play{transform:scale(1.06);background:rgba(0,0,0,.7)}
  #poster .play svg{width:30px;height:30px;fill:#fff;margin-left:3px}
  #poster.entering .play{opacity:0;transition:opacity .2s}
</style>
</head>
<body>
<div id="stage">
  <div id="yt"></div>
  <div id="shield"></div>
  <div id="bar">
    <button id="play" aria-label="Воспроизвести/пауза"></button>
    <input id="seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="Перемотка">
    <span id="time">0:00 / 0:00</span>
    <button id="mute" aria-label="Звук"></button>
    <input id="vol" type="range" min="0" max="100" step="1" value="100" aria-label="Громкость">
    <button id="cc" aria-label="Субтитры"></button>
    <button id="fs" aria-label="Полный экран"></button>
  </div>
  <div id="poster">
    <span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
  </div>
</div>
<script>
(function(){
  var VIDEO_ID=${JSON.stringify(videoId)}, POSTER=${JSON.stringify(poster)};
  var ICON={
    play:'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    vol:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13 3a4 4 0 0 0-2-3.5v7A4 4 0 0 0 16 12z"/></svg>',
    mute:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm18 0-1.5-1.5L17 10l-2.5-2.5L13 9l2.5 2.5L13 14l1.5 1.5L17 13l2.5 2.5L21 14l-2.5-2.5z"/></svg>',
    cc:'<svg viewBox="0 0 24 24"><path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8.5 10.7c-1.65 0-2.9-1.15-2.9-2.7s1.25-2.7 2.9-2.7c.83 0 1.55.32 2.05.85l-.9.85c-.3-.3-.68-.5-1.15-.5-.9 0-1.55.65-1.55 1.5s.65 1.5 1.55 1.5c.47 0 .85-.2 1.15-.5l.9.85c-.5.53-1.22.85-2.05.85zm7.2 0c-1.65 0-2.9-1.15-2.9-2.7s1.25-2.7 2.9-2.7c.83 0 1.55.32 2.05.85l-.9.85c-.3-.3-.68-.5-1.15-.5-.9 0-1.55.65-1.55 1.5s.65 1.5 1.55 1.5c.47 0 .85-.2 1.15-.5l.9.85c-.5.53-1.22.85-2.05.85z"/></svg>',
    fs:'<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>'
  };
  var stage=document.getElementById('stage'), shield=document.getElementById('shield'),
      poster=document.getElementById('poster'), bar=document.getElementById('bar'),
      playBtn=document.getElementById('play'), muteBtn=document.getElementById('mute'),
      ccBtn=document.getElementById('cc'), fsBtn=document.getElementById('fs'),
      seek=document.getElementById('seek'),
      vol=document.getElementById('vol'), timeEl=document.getElementById('time');
  if(POSTER) poster.style.backgroundImage='url('+JSON.stringify(POSTER)+')';
  playBtn.innerHTML=ICON.play; muteBtn.innerHTML=ICON.vol; fsBtn.innerHTML=ICON.fs;
  ccBtn.innerHTML=ICON.cc; ccBtn.style.opacity='.55';

  var player, ready=false, dragging=false, hideTimer, ticker, ccOn=false, fakeFs=false;
  function fmt(s){s=Math.max(0,Math.floor(s||0));var m=Math.floor(s/60);var ss=s%60;return m+':'+(ss<10?'0':'')+ss;}

  window.onYouTubeIframeAPIReady=function(){
    player=new YT.Player('yt',{videoId:VIDEO_ID,
      // cc_load_policy:0 — субтитры выключены по умолчанию, включаются кнопкой CC
      playerVars:{controls:0,modestbranding:1,rel:0,iv_load_policy:3,cc_load_policy:0,playsinline:1,disablekb:1,fs:0,
        origin:location.origin},
      events:{onReady:function(){ready=true;},onStateChange:onState}});
  };
  function onState(e){
    if(e.data===YT.PlayerState.PLAYING){playBtn.innerHTML=ICON.pause;stage.classList.remove('paused');startTicker();autoHide();}
    else{playBtn.innerHTML=ICON.play;stage.classList.add('paused');stopTicker();}
  }
  function startTicker(){stopTicker();ticker=setInterval(tick,250);}
  function stopTicker(){if(ticker)clearInterval(ticker);}
  function tick(){
    if(!ready||dragging)return;
    var d=player.getDuration()||0,c=player.getCurrentTime()||0;
    if(d){seek.value=String(c/d*100);}
    timeEl.textContent=fmt(c)+' / '+fmt(d);
  }
  function toggle(){if(!ready)return;var s=player.getPlayerState();
    if(s===YT.PlayerState.PLAYING)player.pauseVideo();else player.playVideo();}

  // первый запуск — с постера (жест пользователя, можно со звуком). Постер убираем не сразу,
  // а с задержкой — первые секунды YouTube поверх видео показывает свой заголовок и канал,
  // так постер их перекрывает, пока эта плашка не исчезнет
  poster.addEventListener('click',function(){
    if(!ready)return;
    poster.classList.add('entering');
    player.playVideo();
    setTimeout(function(){poster.style.display='none';},1800);
  });
  shield.addEventListener('click',toggle);
  shield.addEventListener('dblclick',toggleFs);
  // глушим контекстное меню на всём документе — никакого «копировать URL видео»
  document.addEventListener('contextmenu',function(e){e.preventDefault();});

  playBtn.addEventListener('click',toggle);
  seek.addEventListener('input',function(){dragging=true;});
  seek.addEventListener('change',function(){
    if(ready){var d=player.getDuration()||0;player.seekTo(d*seek.value/100,true);}dragging=false;});
  muteBtn.addEventListener('click',function(){
    if(!ready)return;
    if(player.isMuted()){player.unMute();muteBtn.innerHTML=ICON.vol;vol.value=String(player.getVolume());}
    else{player.mute();muteBtn.innerHTML=ICON.mute;}});
  vol.addEventListener('input',function(){
    if(!ready)return;var v=Number(vol.value);player.setVolume(v);
    if(v===0){player.mute();muteBtn.innerHTML=ICON.mute;}else{player.unMute();muteBtn.innerHTML=ICON.vol;}});

  // на мобилке (в первую очередь iOS Safari) requestFullscreen на div внутри вложенного
  // iframe часто молча реджектится — тогда просим родительскую страницу растянуть сам
  // iframe на весь экран через CSS (см. video-embed.tsx)
  function setFakeFs(on){
    fakeFs=on;
    parent.postMessage({source:'lessonPlayer',fullscreen:on},location.origin);
  }
  function toggleFs(){
    if(fakeFs){setFakeFs(false);return;}
    if(document.fullscreenElement){document.exitFullscreen();return;}
    if(stage.requestFullscreen)stage.requestFullscreen().catch(function(){setFakeFs(true);});
    else setFakeFs(true);
  }
  fsBtn.addEventListener('click',toggleFs);

  ccBtn.addEventListener('click',function(){
    if(!ready)return;
    ccOn=!ccOn;
    if(ccOn)player.loadModule('captions');else player.unloadModule('captions');
    ccBtn.style.opacity=ccOn?'1':'.55';
  });

  // авто-скрытие панели при движении мыши
  function autoHide(){clearTimeout(hideTimer);hideTimer=setTimeout(function(){stage.classList.remove('show');},2500);}
  stage.addEventListener('mousemove',function(){stage.classList.add('show');autoHide();});
  stage.addEventListener('mouseleave',function(){stage.classList.remove('show');});

  var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
})();
</script>
</body>
</html>`;
}

// Прокси-страница плеера: iframe основной страницы указывает сюда, а не на YouTube,
// поэтому id ролика не виден в исходнике страницы и RSC-пейлоаде. Доступ перепроверяется здесь же —
// заблокированный урок не отдаёт ссылку даже при прямом запросе.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> },
) {
  const { courseId, lessonId } = await params;
  const session = await getSession();
  const [data, sub] = await Promise.all([
    getLesson(courseId, lessonId),
    session ? getSubscription(session.uid) : null,
  ]);
  if (!data) return new Response('Not found', { status: 404 });
  if (isLocked(data.lesson, sub, Date.now())) {
    return new Response('Forbidden', { status: 403 });
  }

  const { lesson } = data;
  const id = youtubeId(lesson.videoEmbedUrl);
  if (id) {
    return new Response(youtubePlayerHtml(id, lesson.title, lesson.previewImageUrl), { headers: HEADERS });
  }

  // Не-YouTube источник: кастомный плеер неприменим — отдаём обычный iframe (правый клик глушим)
  const src = escapeAttr(playerEmbedUrl(lesson.videoEmbedUrl));
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style>
</head>
<body>
<iframe src="${src}" title="${escapeAttr(lesson.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
<script>document.addEventListener('contextmenu',function(e){e.preventDefault();});</script>
</body>
</html>`;
  return new Response(html, { headers: HEADERS });
}
