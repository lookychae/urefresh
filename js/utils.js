/**
 * 공통 유틸리티
 * - 날짜 변환 헬퍼 (ISO / 한국어 라벨 / 점 구분 / 요일)
 * - HTML escape
 *
 * 전역: toIsoDate, toKoreanLabel, toDotDate, weekdayKor, todayIso, escAttr, hexToRgba
 */

// 어떤 형식이든 'YYYY-MM-DD' 로 정규화
// - 이미 'YYYY-MM-DD': 그대로
// - 'YYYY년 M월 D일': 파싱
// - ISO 'YYYY-MM-DDTHH...': 파싱
// - 긴 Date 포맷 'Sat May 02 2026 ...': 파싱
function toIsoDate(v){
  if(!v) return '';
  var s = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var mKor = s.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
  if(mKor){
    return mKor[1] + '-' +
      String(mKor[2]).padStart(2, '0') + '-' +
      String(mKor[3]).padStart(2, '0');
  }
  var d = new Date(s);
  if(isNaN(d.getTime())) return s;
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// 'YYYY년 M월 D일' (한국어 라벨)
function toKoreanLabel(v){
  var iso = toIsoDate(v);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(v || '');
  var p = iso.split('-');
  return p[0] + '년 ' + parseInt(p[1]) + '월 ' + parseInt(p[2]) + '일';
}

// 'YYYY.MM.DD'
function toDotDate(v){
  var iso = toIsoDate(v);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(v || '');
  return iso.replace(/-/g, '.');
}

// 요일 한 글자 '일'~'토' (파싱 실패 시 '')
function weekdayKor(v){
  var iso = toIsoDate(v);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  var p = iso.split('-');
  var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
  return ['일','월','화','수','목','금','토'][d.getDay()];
}

// 오늘 'YYYY-MM-DD'
function todayIso(){
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// HTML 속성 escape
function escAttr(v){
  return String(v == null ? '' : v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Hex(#RRGGBB) → rgba(r,g,b,alpha) 문자열 (캘린더 셀 배경 틴트용)
function hexToRgba(hex, alpha){
  var h = String(hex || '').replace('#', '');
  if(h.length !== 6) return hex;
  var r = parseInt(h.substring(0, 2), 16);
  var g = parseInt(h.substring(2, 4), 16);
  var b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
