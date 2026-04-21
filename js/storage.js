/**
 * localStorage 헬퍼 + 신청 내역 로컬 저장
 * 전역 함수: lsGet, lsSet, saveLocal, loadLocal, cancelLocal
 */

function lsGet(k){
  try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }
  catch(e){ return null; }
}

function lsSet(k, v){
  try { localStorage.setItem(k, JSON.stringify(v)); }
  catch(e){}
}

function saveLocal(data){
  var list = lsGet('urefresh_my_apps') || [];
  list.push(data);
  lsSet('urefresh_my_apps', list);
}

function loadLocal(){
  return lsGet('urefresh_my_apps') || [];
}

function cancelLocal(id){
  var list = lsGet('urefresh_my_apps') || [];
  list = list.map(function(a){
    if(String(a.id) === String(id)) a.status = 'cancelled';
    return a;
  });
  lsSet('urefresh_my_apps', list);
}
