/**
 * Google Apps Script 통신 계층
 * 전역: SCRIPT_URL, apiGetSettings, apiGetAppsByEno, apiSaveApp, apiCancelApp, apiGetNotices
 */

var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVx3lQqozqixGQWHLaYpFMlqS8NbPiUCgAyEjoDxFEnrdQJcfnlS4vA-JK8RXGoIoc_g/exec';

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

function apiGetNotices(){
  return fetch(SCRIPT_URL + '?action=getNotices').then(function(r){ return r.json(); });
}

function apiGetAllApps(){
  return fetch(SCRIPT_URL).then(function(r){ return r.json(); });
}

function apiGetSchedules(){
  return fetch(SCRIPT_URL + '?action=getSchedules').then(function(r){ return r.json(); });
}
