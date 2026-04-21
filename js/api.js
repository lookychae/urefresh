/**
 * Google Apps Script 통신 계층
 * 전역: SCRIPT_URL, apiGetSettings, apiGetAppsByEno, apiSaveApp, apiCancelApp
 */

var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTy_KocCq4ebppa4Gd1ni_AACZ4kLvkkmRuObC6mZXC6QWzoU0kiZQ_kxXin-oY7n-Pg/exec';

function apiGetSettings(){
  return fetch(SCRIPT_URL + '?action=getSettings').then(function(r){ return r.json(); });
}

function apiGetAppsByEno(eno){
  return fetch(SCRIPT_URL + '?eno=' + encodeURIComponent(eno)).then(function(r){ return r.json(); });
}

function apiSaveApp(payload){
  return fetch(SCRIPT_URL, { method:'POST', body: JSON.stringify(payload) });
}

function apiCancelApp(eno, at){
  return fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action:'cancel', eno: eno, at: at })
  });
}
