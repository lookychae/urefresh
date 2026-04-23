/**
 * urefresh 메인 앱 로직
 * - 캘린더 / 설정 / 폼 / 내 신청 / 네비게이션 / 타이머
 * - storage.js, api.js 뒤에 로드되어야 함
 */

var WEEKDAYS_FULL = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
var COLOR_MAP = {
  red:'#F04452', orange:'#FF6B00', yellow:'#F5C500',
  green:'#05C072', blue:'#3182F6', navy:'#3D4FE0', purple:'#9B51E0'
};

function _hexToRgba(hex, alpha){
  var h = String(hex || '').replace('#', '');
  if(h.length !== 6) return hex;
  var r = parseInt(h.substring(0,2), 16);
  var g = parseInt(h.substring(2,4), 16);
  var b = parseInt(h.substring(4,6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
var settings = null;
var selDate  = null;  // { clickIsoDate, clickLabel, usageIsoDate, usageLabel, schedule, apply, slots, rate }
var calYear, calMonth;
var _histList = [];
var NOTICES = [];

// ══════════════════════════════════════════════════════════
// 설정 로드 & 적용
// ══════════════════════════════════════════════════════════
function applySettings(s){
  if(!s) return;
  settings = s;
  lsSet('urefresh_settings', s);

  // 헤로 타이틀(문구)만 설정에서 가져옴
  if(s.heroTitle) document.getElementById('hero-hl').textContent = s.heroTitle;

  // 캘린더 초기 월은 schedules 로드 시 자동 이동하므로 여기서는 기본값만
  if(!calYear){
    var now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
  }
  buildCalendar();
  // 헤로의 신청 시작/마감은 일정들에서 계산 (이미 SCHEDULES_CACHE 있으면 즉시 반영)
  _updateHeroPeriod();
}

// 모든 일정의 신청 기간 합집합 → 가장 이른 시작 / 가장 늦은 마감
function _getOverallSchedulePeriod(){
  if(!SCHEDULES_CACHE || !SCHEDULES_CACHE.length) return null;
  var starts = [], ends = [];
  SCHEDULES_CACHE.forEach(function(s){
    if(s.start) starts.push(s.start);
    if(s.end)   ends.push(s.end);
  });
  if(!starts.length && !ends.length) return null;
  starts.sort();
  ends.sort();
  return {
    start: starts[0] || '',
    end:   ends[ends.length - 1] || ''
  };
}

// 헤로 배너의 신청 시작/마감 값 갱신 (일정 기준)
function _updateHeroPeriod(){
  var days = ['일','월','화','수','목','금','토'];
  var startEl = document.getElementById('hero-start');
  var endEl   = document.getElementById('hero-end');
  var p = _getOverallSchedulePeriod();
  if(!p){
    if(startEl) startEl.textContent = '-';
    if(endEl)   endEl.textContent   = '-';
    return;
  }
  if(p.start && startEl){
    var sd = new Date(p.start);
    startEl.textContent = (sd.getMonth()+1)+'월 '+sd.getDate()+'일 ('+days[sd.getDay()]+')';
  }
  if(p.end && endEl){
    var ed = new Date(p.end);
    endEl.textContent = (ed.getMonth()+1)+'월 '+ed.getDate()+'일 ('+days[ed.getDay()]+')';
  }
}

function loadSettings(){
  var cached = lsGet('urefresh_settings');
  if(cached){
    applySettings(cached);
  } else {
    var now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
    buildCalendar();
  }

  apiGetSettings()
    .then(function(s){
      if(s && (s.start || s.end || s.heroTitle)) applySettings(s);
    })
    .catch(function(err){
      console.warn('[loadSettings] failed', err);
    });
}

// ══════════════════════════════════════════════════════════
// 캘린더
// ══════════════════════════════════════════════════════════
function buildCalendar(){
  var title = document.getElementById('cal-month-title');
  title.textContent = calYear + '년 ' + (calMonth+1) + '월';

  var firstDay    = new Date(calYear, calMonth, 1).getDay();
  var daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  var today = new Date();
  var todayStr = today.getFullYear() + '-' +
    String(today.getMonth()+1).padStart(2,'0') + '-' +
    String(today.getDate()).padStart(2,'0');

  var container = document.getElementById('cal-days');
  container.innerHTML = '';

  for(var i=0; i<firstDay; i++){
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    empty.innerHTML = '<span class="cal-num">0</span>';
    container.appendChild(empty);
  }

  for(var d=1; d<=daysInMonth; d++){
    var dateStr = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var dow = new Date(calYear, calMonth, d).getDay();

    // 이 날짜가 어떤 일정의 신청 기간에 속하는가?
    var schedule = _getScheduleByApplicationWindow(dateStr);
    var isAvailable = !!schedule;

    var cell = document.createElement('div');
    var classes = ['cal-day'];
    if(dow === 0) classes.push('sun');
    if(dow === 6) classes.push('sat');
    if(dateStr === todayStr) classes.push('today');

    if(isAvailable){
      classes.push('available');
      // 해당 일정의 룸 컬러 - 옅은 배경 + 선명한 글자색
      var colorHex = COLOR_MAP[schedule.color] || '#3182F6';
      cell.style.background = _hexToRgba(colorHex, 0.15);
      cell.style.color = colorHex;
      cell.dataset.date = dateStr;
      cell.onclick = (function(ds){ return function(){ selectDate(ds); }; })(dateStr);
    }

    if(selDate && selDate.clickIsoDate === dateStr) classes.push('selected');
    cell.className = classes.join(' ');
    cell.innerHTML = '<span class="cal-num">' + d + '</span>';
    container.appendChild(cell);
  }
}

function calPrev(){
  calMonth--;
  if(calMonth < 0){ calMonth = 11; calYear--; }
  buildCalendar();
}

function calNext(){
  calMonth++;
  if(calMonth > 11){ calMonth = 0; calYear++; }
  buildCalendar();
}

// ── 헬퍼: 주어진 날짜가 어느 일정의 신청 기간에 속하는가 ──
function _getScheduleByApplicationWindow(isoDate){
  for(var i = 0; i < SCHEDULES_CACHE.length; i++){
    var s = SCHEDULES_CACHE[i];
    if(!s.start || !s.end) continue;
    if(isoDate >= s.start && isoDate <= s.end) return s;
  }
  return null;
}

// ── 오늘 날짜를 YYYY-MM-DD 로 반환 ──
function _todayIsoDate(){
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// ── 신청 윈도우 상태 ──
function _getApplicationState(schedule){
  if(!schedule) return 'no-schedule';
  var today = _todayIsoDate();
  if(schedule.start && today < schedule.start) return 'before';
  if(schedule.end   && today > schedule.end)   return 'after';
  return 'open';
}

// ── isoDate(YYYY-MM-DD) 를 한국어 라벨 'YYYY년 M월 D일' 로 ──
function _isoToKoreanLabel(isoDate){
  if(!isoDate) return '';
  var p = String(isoDate).split('-');
  if(p.length !== 3) return String(isoDate);
  return parseInt(p[0]) + '년 ' + parseInt(p[1]) + '월 ' + parseInt(p[2]) + '일';
}

// ── isoDate 의 요일(일/월/…/토) ──
function _isoWeekday(isoDate){
  var p = String(isoDate).split('-');
  if(p.length !== 3) return '';
  var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
  return ['일','월','화','수','목','금','토'][d.getDay()];
}

function selectDate(dateStr){
  var schedule = _getScheduleByApplicationWindow(dateStr);
  if(!schedule) return; // 클릭 가능 영역이 아니면 무시

  var state = _getApplicationState(schedule);
  var clickLabel  = _isoToKoreanLabel(dateStr);
  var clickDow    = _isoWeekday(dateStr);
  var usageLabel  = _isoToKoreanLabel(schedule.date);
  var usageDow    = _isoWeekday(schedule.date);

  // 신청 인원 집계는 '이용일' 기준
  var apply = countAppsByDate_(usageLabel);
  var slots = Number(schedule.slots) || 0;
  var rate  = slots > 0 ? (apply / slots) : 0;

  selDate = {
    clickIsoDate: dateStr,
    clickLabel:   clickLabel,
    usageIsoDate: schedule.date,
    usageLabel:   usageLabel,
    usageWeekday: usageDow + '요일',
    schedule:     schedule,
    apply: apply, slots: slots, rate: rate,
    state: state
  };

  var info = document.getElementById('sel-info');
  info.classList.add('on');

  // 뱃지
  var chipHtml = '';
  if(state === 'before')      chipHtml = '<span class="chip chip-gray"   style="margin-left:8px">신청 전</span>';
  else if(state === 'after')  chipHtml = '<span class="chip chip-red"    style="margin-left:8px">신청 마감</span>';
  else if(apply === 0)        chipHtml = '<span class="chip chip-green"  style="margin-left:8px">신청 가능</span>';
  else if(rate >= 4)          chipHtml = '<span class="chip chip-red"    style="margin-left:8px">경쟁 과열</span>';
  else if(rate >= 2.5)        chipHtml = '<span class="chip chip-orange" style="margin-left:8px">경쟁 높음</span>';
  else if(rate >= 1.5)        chipHtml = '<span class="chip chip-blue"   style="margin-left:8px">경쟁 보통</span>';
  else                        chipHtml = '<span class="chip chip-green"  style="margin-left:8px">신청 가능</span>';

  document.getElementById('sel-info-date').innerHTML = clickLabel + ' (' + clickDow + ')' + chipHtml;
  document.getElementById('sel-usage-val').textContent = usageLabel + ' (' + usageDow + ') · ' + (schedule.room || '');
  document.getElementById('sel-apply').textContent = apply + '명';
  if(slots === 0){
    document.getElementById('sel-slots').textContent = '—';
    document.getElementById('sel-rate').textContent  = '—';
  } else {
    document.getElementById('sel-slots').textContent = slots + '구좌';
    document.getElementById('sel-rate').textContent  = rate.toFixed(1) + ':1';
  }

  // 버튼 상태
  var applyBtn = document.getElementById('sel-apply-btn');
  if(applyBtn){
    var canApply = state === 'open';
    applyBtn.disabled = !canApply;
    applyBtn.style.opacity = canApply ? '1' : '.4';
    applyBtn.style.cursor  = canApply ? 'pointer' : 'not-allowed';
    if(state === 'before')     applyBtn.textContent = '아직 신청 기간이 아닙니다';
    else if(state === 'after') applyBtn.textContent = '신청이 마감되었습니다';
    else                       applyBtn.textContent = usageLabel + ' 이용 신청하기';
  }

  setTimeout(function(){ info.scrollIntoView({behavior:'smooth', block:'nearest'}); }, 100);
  buildCalendar();
}

// 신청 내역 / 일정 캐시 + 집계 헬퍼
var APPLICANTS_CACHE = [];
var SCHEDULES_CACHE  = [];
var DEFAULT_SLOTS = 10;

function loadApplicants(){
  apiGetAllApps()
    .then(function(rows){
      APPLICANTS_CACHE = Array.isArray(rows) ? rows : [];
      if(selDate && selDate.clickIsoDate){
        selectDate(selDate.clickIsoDate);
      }
    })
    .catch(function(err){
      console.warn('[loadApplicants] failed', err);
    });
}

var _schedulesFirstLoad = true;

function loadSchedules(){
  apiGetSchedules()
    .then(function(rows){
      if(!Array.isArray(rows)){
        SCHEDULES_CACHE = [];
      } else {
        // 서버가 긴 Date 포맷으로 반환하는 케이스 대비 정규화
        SCHEDULES_CACHE = rows.map(function(r){
          return {
            date:  _normalizeIsoDate(r.date),
            day:   r.day || '',
            room:  r.room || '',
            slots: Number(r.slots || 0),
            start: _normalizeIsoDate(r.start),
            end:   _normalizeIsoDate(r.end)
          };
        });
      }

      // 최초 로드 시 가장 이른 신청 시작일이 있는 월로 캘린더 이동
      if(_schedulesFirstLoad && SCHEDULES_CACHE.length > 0 && !selDate){
        var earliest = SCHEDULES_CACHE.slice()
          .filter(function(s){ return s.start; })
          .sort(function(a, b){ return a.start < b.start ? -1 : 1; })[0];
        if(earliest && earliest.start){
          var parts = earliest.start.split('-');
          calYear  = parseInt(parts[0]);
          calMonth = parseInt(parts[1]) - 1;
        }
        _schedulesFirstLoad = false;
      }

      // 캘린더에 이용일 반영
      buildCalendar();
      // 헤로 배너 신청 시작/마감 갱신
      _updateHeroPeriod();
      if(selDate && selDate.clickIsoDate){
        selectDate(selDate.clickIsoDate);
      }
    })
    .catch(function(err){
      console.warn('[loadSchedules] failed', err);
    });
}

function _normalizeIsoDate(v){
  if(!v) return '';
  var s = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var d = new Date(s);
  if(isNaN(d.getTime())) return s;
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// Google Sheets 이용일 값 → 한국어 라벨로 정규화
function normalizeDateLabel_(v){
  if(!v) return '';
  var s = String(v);
  if(s.indexOf('T') > -1){
    var d = new Date(s);
    if(!isNaN(d.getTime())){
      return d.getFullYear() + '년 ' + (d.getMonth()+1) + '월 ' + d.getDate() + '일';
    }
  }
  return s;
}

function countAppsByDate_(label){
  return APPLICANTS_CACHE.filter(function(a){
    var status = String(a['상태'] || '');
    if(status === 'cancelled' || status === '취소됨') return false;
    return normalizeDateLabel_(a['이용일']) === label;
  }).length;
}

// 날짜별 배정 구좌 수 (관리자가 일정관리에서 설정한 값)
function getSlotsForDate_(isoDate){
  for(var i = 0; i < SCHEDULES_CACHE.length; i++){
    if(SCHEDULES_CACHE[i].date === isoDate){
      return Number(SCHEDULES_CACHE[i].slots) || 0;
    }
  }
  return 0; // 일정에 없는 날짜면 0
}

// ══════════════════════════════════════════════════════════
// 네비게이션 & Detail 진입
// ══════════════════════════════════════════════════════════
function go(id){
  document.querySelectorAll('.scr').forEach(function(s){ s.classList.remove('on'); });
  document.getElementById(id).classList.add('on');
  if(id === 'sc-my')     renderMyPage();
  if(id === 'sc-notice') loadNotices();
}

function goDetail(){
  if(!selDate) return;

  // 신청 윈도우 재검증
  var schedule = selDate.schedule || _getScheduleByApplicationWindow(selDate.clickIsoDate);
  var state = _getApplicationState(schedule);
  if(state !== 'open'){
    var msg = state === 'before' ? '아직 신청 기간이 아닙니다.' :
              state === 'after'  ? '신청이 마감되었습니다.' :
              '등록된 일정이 없습니다.';
    alert(msg);
    return;
  }

  // 상세 페이지에는 '이용일' 표시 (클릭 날짜 아님)
  document.getElementById('dh-date').textContent  = selDate.usageLabel;
  document.getElementById('dh-day').textContent   = selDate.usageWeekday;
  document.getElementById('dh-apply').innerHTML   = selDate.apply + '<span class="dhs-unit">명</span>';
  document.getElementById('dh-slots').innerHTML   = selDate.slots + '<span class="dhs-unit">구좌</span>';
  document.getElementById('dh-rate').innerHTML    = selDate.rate.toFixed(1) + '<span class="dhs-unit">:1</span>';

  ['f-eno','f-nm','f-tel','f-email-local'].forEach(function(id){
    document.getElementById(id).value = '';
  });
  document.getElementById('sel-val').textContent = '본인 포함 1명';
  var box = document.getElementById('chk-infant');
  box.classList.remove('on');
  box.querySelector('svg').style.display = 'none';
  // 제출 버튼 상태 초기화 (이전 제출 후 남은 "제출 중..." 텍스트 복원)
  var submitBtn = document.getElementById('submit-btn');
  submitBtn.textContent = '신청 완료하기';
  checkForm();
  go('sc-detail');
}

// ══════════════════════════════════════════════════════════
// 타이머
// ══════════════════════════════════════════════════════════
(function(){
  function tick(){
    var p   = _getOverallSchedulePeriod();
    // schedule.end 는 'YYYY-MM-DD' → 해당 날짜의 23:59:59 로 치환
    var endTs = null;
    if(p && p.end){
      var ed = new Date(p.end);
      ed.setHours(23, 59, 59, 999);
      endTs = ed.getTime();
    }
    var el  = document.getElementById('timer-val');
    if(!endTs){ if(el) el.textContent = '일정 없음'; return; }
    var diff = Math.max(0, endTs - Date.now());
    var d = Math.floor(diff / 86400000);
    var h = Math.floor(diff % 86400000 / 3600000);
    var m = Math.floor(diff % 3600000 / 60000);
    var s = Math.floor(diff % 60000 / 1000);
    if(el) el.textContent = diff > 0
      ? d + '일 ' + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0')
      : '마감되었습니다';
  }
  tick();
  setInterval(tick, 1000);
})();

// ══════════════════════════════════════════════════════════
// 폼 입력/검증
// ══════════════════════════════════════════════════════════
// 이메일 도메인 고정값
var EMAIL_DOMAIN = 'umoment.co.kr';
var EMAIL_LOCAL_RE = /^[a-z0-9]+$/;

// 전체 이메일 주소 반환 (local@umoment.co.kr)
function getEmailValue(){
  var local = (document.getElementById('f-email-local').value || '').trim();
  if(!local) return '';
  return local + '@' + EMAIL_DOMAIN;
}

function isValidEmail(v){
  var parts = (v || '').split('@');
  if(parts.length !== 2) return false;
  return EMAIL_LOCAL_RE.test(parts[0]) && parts[1] === EMAIL_DOMAIN;
}

function checkForm(){
  var localInput = document.getElementById('f-email-local');
  var localVal   = (localInput.value || '').trim();
  var emailOk    = EMAIL_LOCAL_RE.test(localVal);

  // 시각 피드백: 입력했는데 형식이 아직 맞지 않을 때 빨갛게
  if(localVal && !emailOk){
    localInput.style.color = 'var(--red-dk)';
  } else {
    localInput.style.color = '';
  }

  var ok = (document.getElementById('f-eno').value || '').trim() &&
           (document.getElementById('f-nm').value  || '').trim() &&
           (document.getElementById('f-tel').value || '').trim().length >= 12 &&
           emailOk;
  var btn = document.getElementById('submit-btn');
  btn.disabled = !ok;
  btn.style.opacity = ok ? '1' : '.4';
  btn.style.cursor  = ok ? 'pointer' : 'not-allowed';
}

function formatTel(input){
  var v = input.value.replace(/[^0-9]/g, '');
  if(v.length <= 3)       input.value = v;
  else if(v.length <= 7)  input.value = v.slice(0,3) + '-' + v.slice(3);
  else                    input.value = v.slice(0,3) + '-' + v.slice(3,7) + '-' + v.slice(7,11);
}

function toggleDp(){
  var panel = document.getElementById('dp-panel');
  var arrow = document.getElementById('sel-arrow');
  var card  = document.getElementById('form-card');
  var open = panel.classList.toggle('open');
  arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
  card.style.borderRadius = open ? '12px 12px 0 0' : '12px';
  card.style.borderBottom = open ? 'none' : '';
}

function pickOpt(el, val){
  document.getElementById('sel-val').textContent = val;
  document.querySelectorAll('.dp-item').forEach(function(i){ i.classList.remove('sel'); });
  el.classList.add('sel');
  document.getElementById('dp-panel').classList.remove('open');
  document.getElementById('sel-arrow').style.transform = 'rotate(0deg)';
  document.getElementById('form-card').style.borderRadius = '12px';
  document.getElementById('form-card').style.borderBottom = '';
  event.stopPropagation();
}

function toggleChk(label){
  var box  = label.querySelector('.chk-box');
  var icon = box.querySelector('svg');
  var on   = box.classList.toggle('on');
  icon.style.display = on ? 'block' : 'none';
}

// ══════════════════════════════════════════════════════════
// 신청 제출
// ══════════════════════════════════════════════════════════
function doSubmit(){
  var e     = (document.getElementById('f-eno').value   || '').trim();
  var nm    = (document.getElementById('f-nm').value    || '').trim();
  var tel   = (document.getElementById('f-tel').value   || '').trim();
  var email = getEmailValue();
  var fam    = document.getElementById('sel-val').textContent;
  var infant = document.getElementById('chk-infant').classList.contains('on');

  // 이메일 형식 최종 검증 (버튼 상태와 무관하게 이중 체크)
  if(!isValidEmail(email)){
    alert('이메일 형식이 올바르지 않습니다.\n소문자와 숫자만 사용해주세요. 예: user@company.com');
    document.getElementById('f-email-local').focus();
    return;
  }

  var btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.style.opacity = '0.6';
  btn.textContent = '제출 중...';
  document.getElementById('loading-overlay').classList.add('on');

  var now = new Date();
  var atStr = (now.getMonth()+1) + '.' + String(now.getDate()).padStart(2,'0') + ' ' +
              String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  var payload = {
    at: atStr, eno: e, name: nm, tel: tel, email: email,
    date: selDate ? selDate.usageLabel : '',
    room: selDate && selDate.schedule ? (selDate.schedule.room || '—') : '—',
    fam: fam,
    infant:  infant ? '예' : '아니오',
    toddler: '아니오',
    status:  '신청완료'
  };

  saveLocal(Object.assign({}, payload, {
    id: Date.now(),
    dateLabel: selDate ? selDate.usageLabel   : '',
    isoDate:   selDate ? selDate.usageIsoDate : ''
  }));

  apiSaveApp(payload)
    .catch(function(){})
    .finally(function(){
      document.getElementById('loading-overlay').classList.remove('on');
      document.getElementById('s-date').textContent = selDate ? selDate.usageLabel : '—';
      document.getElementById('s-eno').textContent  = e;
      go('sc-success');
      loadApplicants(); // 신청 인원 집계 즉시 반영
    });
}

// ══════════════════════════════════════════════════════════
// 내 신청 (검색 + 렌더 + 취소)
// ══════════════════════════════════════════════════════════
function renderMyPage(){
  var input = document.getElementById('my-eno-input');
  if(input) input.value = '';
  var histEl = document.getElementById('hist-list');
  if(histEl) histEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--ink4);font-size:14px">사번을 입력하고 조회하세요</div>';
}

function searchMyApps(){
  var eno = (document.getElementById('my-eno-input').value || '').trim();
  var histEl = document.getElementById('hist-list');
  if(!eno){
    histEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--ink4);font-size:14px">사번을 입력하고 조회하세요</div>';
    return;
  }
  var list = (lsGet('urefresh_my_apps') || []).filter(function(a){ return a.eno === eno; });
  lsSet('urefresh_last_eno', eno);

  histEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--ink4);font-size:14px">조회 중...</div>';

  apiGetAppsByEno(eno)
    .then(function(rows){
      if(rows && rows.length){
        var sheetList = rows.map(function(r, i){
          return {
            eno:       String(r['사번'] || ''),
            name:      r['성명'] || '',
            dateLabel: fmtDate_(r['이용일']),
            fam:       r['동반가족수'] || r['동반가족'] || '',
            at:        fmtAt_(r['신청일시']),
            status:    r['상태'] || '신청완료',
            id:        'sheet_' + i + '_' + (r['사번'] || i)
          };
        });
        renderHistList(sheetList);
      } else {
        renderHistList(list);
      }
    })
    .catch(function(){
      renderHistList(list);
    });
}

function fmtDate_(v){
  if(!v) return '';
  if(String(v).indexOf('T') > -1){
    var d = new Date(v);
    return d.getFullYear() + '년 ' + (d.getMonth()+1) + '월 ' + d.getDate() + '일';
  }
  return String(v);
}

function fmtAt_(v){
  if(!v) return '';
  if(String(v).indexOf('T') > -1){
    var d = new Date(v);
    return (d.getMonth()+1) + '.' + String(d.getDate()).padStart(2,'0') + ' ' +
           String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  return String(v);
}

function renderHistList(list){
  _histList = list.slice();
  var histEl = document.getElementById('hist-list');
  if(!list.length){
    histEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--ink4);font-size:14px">신청 내역이 없습니다</div>';
    return;
  }
  histEl.innerHTML = '';
  var CHIP = {
    '신청완료':   '<span class="chip chip-blue">신청완료</span>',
    'cancelled':  '<span class="chip chip-gray">취소됨</span>',
    'selected':   '<span class="chip chip-blue">당첨</span>',
    'waitlisted': '<span class="chip chip-orange">대기</span>',
    'done':       '<span class="chip chip-green">이용 완료</span>'
  };
  list.slice().reverse().forEach(function(a, i){
    var realIdx  = list.length - 1 - i;
    var canCancel = a.status === '신청완료';
    var chip = CHIP[a.status] || '<span class="chip chip-gray">' + a.status + '</span>';
    var div = document.createElement('div');
    div.className = 'hist-item';
    div.innerHTML =
      '<div class="hist-item-row">' +
        '<div class="hist-num" style="background:var(--blue-ll);color:var(--blue-dk)">' + (list.length - i) + '</div>' +
        '<div class="hist-body">' +
          '<div class="hist-t">' + (a.dateLabel || a.date || '—') + '</div>' +
          '<div class="hist-s">' + (a.fam ? a.fam + '<span class="hdot"></span>' : '') + (a.at || '—') + ' 접수</div>' +
        '</div>' + chip +
      '</div>' +
      '<div class="hist-item-actions"></div>';
    var actions = div.querySelector('.hist-item-actions');
    if(canCancel){
      var btn = document.createElement('button');
      btn.className   = 'hist-action-btn hist-btn-cancel';
      btn.textContent = '취소';
      (function(idx){ btn.addEventListener('click', function(){ doCancelApp(idx); }); })(realIdx);
      actions.appendChild(btn);
    } else {
      var btn = document.createElement('button');
      var statusText = a.status === 'cancelled' ? '취소 완료' : '취소 불가';
      btn.className   = 'hist-action-btn hist-btn-disabled';
      btn.textContent = statusText;
      btn.disabled = true;
      actions.appendChild(btn);
    }
    histEl.appendChild(div);
  });
}

function doCancelApp(idx){
  if(!confirm('신청을 취소하시겠습니까?')) return;
  var item = _histList[idx];
  if(!item){ alert('오류가 발생했습니다.'); return; }

  var list = lsGet('urefresh_my_apps') || [];
  var updated = false;
  list = list.map(function(a){
    if(String(a.id) === String(item.id) || (a.eno === item.eno && a.at === item.at)){
      a.status = 'cancelled';
      updated  = true;
    }
    return a;
  });
  if(!updated){ item.status = 'cancelled'; list.push(item); }
  lsSet('urefresh_my_apps', list);
  _histList[idx].status = 'cancelled';
  renderHistList(_histList);

  apiCancelApp(item.eno, item.at).catch(function(){});
}

// ══════════════════════════════════════════════════════════
// 공지사항 (목록 + 상세)
// ══════════════════════════════════════════════════════════
function loadNotices(){
  // 로컬 캐시 먼저 렌더 (빠른 표시)
  var cached = lsGet('urefresh_notices');
  if(Array.isArray(cached) && cached.length){
    NOTICES = cached;
    renderNoticeList();
  }

  apiGetNotices()
    .then(function(rows){
      if(!Array.isArray(rows)) return;
      NOTICES = rows.map(function(r){
        return {
          id:        String(r.id || ''),
          title:     r.title || '',
          content:   r.content || '',
          author:    r.author || '',
          createdAt: r.createdAt || ''
        };
      });
      lsSet('urefresh_notices', NOTICES);
      renderNoticeList();
    })
    .catch(function(err){
      console.warn('[loadNotices] failed', err);
      if(!NOTICES.length) renderNoticeList(); // 빈 상태 표시
    });
}

function _fmtNoticeDate(iso){
  if(!iso) return '';
  var d = new Date(iso);
  if(isNaN(d.getTime())) return String(iso);
  return d.getFullYear() + '.' +
    String(d.getMonth() + 1).padStart(2, '0') + '.' +
    String(d.getDate()).padStart(2, '0');
}

function renderNoticeList(){
  var el = document.getElementById('notice-list');
  if(!el) return;
  if(!NOTICES.length){
    el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--ink4);font-size:14px">등록된 공지사항이 없습니다</div>';
    return;
  }
  // 최신순 정렬
  var sorted = NOTICES.slice().sort(function(a, b){
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  el.innerHTML = '';
  sorted.forEach(function(n, i){
    var row = document.createElement('div');
    row.className = 'ni-row';
    if(i === sorted.length - 1) row.style.borderBottom = 'none';
    var title  = (n.title  || '').replace(/</g, '&lt;');
    var author = (n.author || '').replace(/</g, '&lt;');
    row.innerHTML =
      '<div class="ni-ico"><svg width="17" height="17" stroke="#3182F6"><use href="#i-doc"/></svg></div>' +
      '<div class="ni-body">' +
        '<div class="ni-t">' + title + '</div>' +
        '<div class="ni-d">' + _fmtNoticeDate(n.createdAt) + (author ? ' · ' + author : '') + '</div>' +
      '</div>' +
      '<svg width="18" height="18" stroke="#B0B8C1"><use href="#i-fwd"/></svg>';
    (function(id){
      row.addEventListener('click', function(){ openNoticeDetail(id); });
    })(n.id);
    el.appendChild(row);
  });
}

function openNoticeDetail(id){
  var n = NOTICES.find(function(x){ return String(x.id) === String(id); });
  if(!n) return;
  document.getElementById('nd-title').textContent = n.title || '';
  var meta = _fmtNoticeDate(n.createdAt) + (n.author ? ' · ' + n.author : '');
  document.getElementById('nd-meta').textContent  = meta;
  document.getElementById('nd-body').textContent  = n.content || '';
  go('sc-notice-detail');
}

// ══════════════════════════════════════════════════════════
// 초기화
// ══════════════════════════════════════════════════════════
loadSettings();
loadNotices();
loadApplicants();
loadSchedules();
