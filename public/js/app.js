var S=null,AC=null,AAC=null,MS=[];
window._cls=[];window._vcls=[];window._acls=[];
var _swEditId=null;

function $(id){return document.getElementById(id);}
function cap(s){return s?s[0].toUpperCase()+s.slice(1):'';}
function get(u){return fetch(u).then(r=>r.json());}
function post(u,d){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json());}
function del(u){return fetch(u,{method:'DELETE'}).then(r=>r.json());}
function patch(u,d){return fetch(u,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json());}

function showToast(m,t){
  var el=$('toast');
  if(!el){el=document.createElement('div');el.id='toast';el.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 22px;border-radius:999px;font-size:13px;z-index:9999;opacity:0;transition:opacity .3s;font-weight:500;color:#fff';document.body.appendChild(el);}
  el.style.background=t==='error'?'#dc2626':t==='success'?'#16a34a':'#222';
  el.textContent=m;el.style.opacity='1';
  setTimeout(()=>{el.style.opacity='0';},3000);
}
function openModal(id){$('overlay').classList.remove('hidden');$(id).classList.remove('hidden');}
function closeAll(){$('overlay').classList.add('hidden');document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));}

// ===== PAGES =====
function showPage(id){
  ['pg-switcher','pg-pin','pg-login','pg-app'].forEach(p=>{
    var el=$(p);if(el)el.style.display='none';
  });
  var el=$(id);if(el)el.style.display='';
  // fix flex display for these
  if(id==='pg-switcher'||id==='pg-pin'||id==='pg-login'){$(id).style.display='flex';}
  if(id==='pg-app'){$(id).style.display='flex';}
}

// ===== PULL TO REFRESH =====
(function(){
  var startY=0,pulling=false;
  var sp=document.createElement('div');sp.id='ptr-spinner';document.body.appendChild(sp);
  document.addEventListener('touchstart',e=>{if(window.scrollY===0)startY=e.touches[0].clientY;},{passive:true});
  document.addEventListener('touchmove',e=>{if(!startY)return;if(e.touches[0].clientY-startY>60&&!pulling){pulling=true;sp.classList.add('visible');}},{passive:true});
  document.addEventListener('touchend',()=>{
    if(pulling){sp.classList.add('spinning');setTimeout(()=>{
      sp.classList.remove('visible','spinning');startY=0;pulling=false;
      if($('pg-app').style.display!=='none'){var cur=document.querySelector('.tab.active');if(cur)goTab(cur.dataset.tab,cur);}
      else{init();}
    },800);}else startY=0;
  });
})();

// ===== SWITCHER =====
async function getSwitcherAccounts(){
  try{return await get('/api/switcher');}catch(e){return[];}
}
async function addToSwitcher(user,password){
  try{await post('/api/switcher',{id:user.id,name:user.name,role:user.role,class_id:user.class_id||'',class_name:'',enrollment:user.enrollment||'',email:user.email||'',password:password||''});}catch(e){}
}
async function updateSwitcherPwd(id,pwd){
  try{await patch('/api/switcher/'+id+'/password',{password:pwd});}catch(e){}
}
async function removeFromSwitcher(id){
  try{await del('/api/switcher/'+id);}catch(e){}
}

async function showSwitcher(){
  var accs=await getSwitcherAccounts();
  if(!accs||!accs.length){showLogin();return;}
  showPage('pg-switcher');
  var el=$('sw-accounts');
  el.innerHTML=accs.map((a,i)=>{
    var ini=a.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    var bg=a.role==='admin'?'background:#5a0a0a;color:#f0c040':a.role==='teacher'?'background:#fdf3d0;color:#5a0a0a':'background:#dbeafe;color:#1d4ed8';
    var rl=a.role==='admin'?'Principal':cap(a.role)+(a.class_name?' · '+a.class_name:'');
    return "<div class='sw-card' onclick='swLogin("+i+")'><div class='sw-avatar' style='"+bg+"'>"+ini+"</div><div style='flex:1'><div class='sw-name'>"+a.name+"</div><div class='sw-role'>"+rl+"</div></div><button class='sw-edit' onclick='event.stopPropagation();swEdit("+i+")'>Edit</button></div>";
  }).join('');
}

async function swLogin(i){
  var accs=await getSwitcherAccounts();
  var a=accs[i];if(!a)return;
  if(a.role==='admin'){
    showPage('pg-pin');
    $('pin-avatar').textContent=a.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    $('pin-name').textContent=a.name;
    $('pp-pin').value='';$('pp-err').classList.add('hidden');
    $('pp-pin')._acc=a;
    setTimeout(()=>$('pp-pin').focus(),100);
  }else if(a.password){
    var d=await post('/api/login',{email:a.enrollment||a.email,password:a.password});
    if(d.success){S=d.user;startApp();}
    else{
      showLogin();
      setRole(a.role==='teacher'?'teacher':'student');
      $('lemail').value=a.enrollment||a.email;$('lpass').value='';
      $('back-sw-wrap').classList.remove('hidden');
      showToast('Enter your password','');
    }
  }else{
    showLogin();
    setRole(a.role==='teacher'?'teacher':'student');
    $('lemail').value=a.enrollment||a.email;$('lpass').value='';
    $('back-sw-wrap').classList.remove('hidden');
  }
}

async function swEdit(i){
  var accs=await getSwitcherAccounts();
  var a=accs[i];if(!a)return;
  _swEditId=a.id;
  $('sw-edit-info').textContent=a.name+' · '+cap(a.role);
  openModal('modal-sw-edit');
}
async function swDeleteAccount(){
  closeAll();
  if(_swEditId){await removeFromSwitcher(_swEditId);_swEditId=null;}
  showSwitcher();
}

function showLogin(){
  showPage('pg-login');
  $('back-sw-wrap').classList.add('hidden');
  $('lerr').classList.add('hidden');$('herr').classList.add('hidden');
}

async function init(){
  var accs=await getSwitcherAccounts();
  if(accs&&accs.length>0)showSwitcher();
  else showLogin();
}

window.addEventListener('load',init);

// ===== PIN LOGIN =====
async function doPinLogin(){
  var pin=$('pp-pin').value.trim(),err=$('pp-err'),a=$('pp-pin')._acc;
  err.classList.add('hidden');
  if(!pin){err.textContent='Enter PIN.';err.classList.remove('hidden');return;}
  var d=await post('/api/host-login',{pin});
  if(!d.success){err.textContent='Wrong PIN.';err.classList.remove('hidden');return;}
  S={id:a?a.id:'host',name:a?a.name:'Principal',email:a?a.email||'host@gev.edu':'host@gev.edu',enrollment:'host',role:'admin',class_id:'all'};
  startApp();
}

// ===== ROLE TOGGLE =====
function setRole(r){
  var si=$('btn-student'),ti=$('btn-teacher');
  if(r==='student'){
    si.style.cssText='flex:1;padding:10px;border-radius:6px;border:2px solid #5a0a0a;background:#5a0a0a;color:#f0c040;font-weight:700;cursor:pointer;font-size:13px';
    ti.style.cssText='flex:1;padding:10px;border-radius:6px;border:2px solid #ddd;background:#fff;color:#555;font-weight:700;cursor:pointer;font-size:13px';
    $('login-id-label').textContent='Enrollment Number';$('lemail').placeholder='Enter enrollment number';$('lemail').type='text';
  }else{
    ti.style.cssText='flex:1;padding:10px;border-radius:6px;border:2px solid #5a0a0a;background:#5a0a0a;color:#f0c040;font-weight:700;cursor:pointer;font-size:13px';
    si.style.cssText='flex:1;padding:10px;border-radius:6px;border:2px solid #ddd;background:#fff;color:#555;font-weight:700;cursor:pointer;font-size:13px';
    $('login-id-label').textContent='Email';$('lemail').placeholder='Enter your email';$('lemail').type='email';
  }
}
function updateUserModal(role){var lbl=$('um-id-label'),inp=$('umemail');if(!lbl||!inp)return;if(role==='teacher'){lbl.textContent='Email';inp.placeholder='Enter email';inp.type='email';}else{lbl.textContent='Enrollment Number';inp.placeholder='Enter enrollment number';inp.type='text';}}

// ===== HOST LOGIN =====
async function hostLogin(){
  var pin=$('hpin').value.trim(),err=$('herr');err.classList.add('hidden');
  if(!pin){err.textContent='Enter PIN.';err.classList.remove('hidden');return;}
  var d=await post('/api/host-login',{pin});
  if(!d.success){err.textContent='Wrong PIN.';err.classList.remove('hidden');$('hpin').value='';return;}
  S={id:'host',name:'Principal',email:'host@gev.edu',enrollment:'host',role:'admin',class_id:'all'};
  await addToSwitcher(S,pin);
  startApp();
}

// ===== USER LOGIN =====
async function doLogin(){
  var email=$('lemail').value.trim(),pw=$('lpass').value,err=$('lerr');err.classList.add('hidden');
  if(!email||!pw){err.textContent='Enter credentials.';err.classList.remove('hidden');return;}
  var btn=document.querySelector('.btn-login');if(btn){btn.textContent='Signing in...';btn.disabled=true;}
  try{
    var d=await post('/api/login',{email,password:pw});
    if(!d.success){err.textContent=d.error||'Wrong credentials';err.classList.remove('hidden');if(btn){btn.textContent='Sign in';btn.disabled=false;}return;}
    S=d.user;
    await addToSwitcher(S,pw);
    startApp();
  }catch(e){err.textContent='Cannot reach server.';err.classList.remove('hidden');if(btn){btn.textContent='Sign in';btn.disabled=false;}}
}

function doLogout(){S=null;AC=null;showSwitcher();}

// ===== CHANGE PASSWORD / PIN =====
function openChangePW(){$('cpw-cur').value='';$('cpw-new').value='';$('cpw-err').classList.add('hidden');openModal('modal-changepw');}
async function saveChangePW(){
  var cur=$('cpw-cur').value.trim(),np=$('cpw-new').value.trim(),err=$('cpw-err');err.classList.add('hidden');
  if(!cur||!np){err.textContent='Fill both fields.';err.classList.remove('hidden');return;}
  if(np.length<4){err.textContent='Min 4 characters.';err.classList.remove('hidden');return;}
  var d=await post('/api/profile',{id:S.id,password:cur,new_password:np});
  if(!d.success){err.textContent=d.error||'Wrong password.';err.classList.remove('hidden');return;}
  S=Object.assign({},S,d.user);
  await updateSwitcherPwd(S.id,np);
  closeAll();showToast('Password changed!','success');
}
function openChangePIN(){$('cpin-cur').value='';$('cpin-new').value='';$('cpin-err').classList.add('hidden');openModal('modal-changepin');}
async function saveChangePIN(){
  var cur=$('cpin-cur').value.trim(),np=$('cpin-new').value.trim(),err=$('cpin-err');err.classList.add('hidden');
  if(!cur||!np){err.textContent='Fill both fields.';err.classList.remove('hidden');return;}
  if(np.length<4){err.textContent='Min 4 digits.';err.classList.remove('hidden');return;}
  var d=await post('/api/change-pin',{current:cur,newPin:np});
  if(!d.success){err.textContent=d.error||'Wrong PIN.';err.classList.remove('hidden');return;}
  closeAll();showToast('PIN changed!','success');
}

// ===== START APP =====
async function startApp(){
  showPage('pg-app');
  $('sbrole').textContent=cap(S.role);$('sbname').textContent=S.name;$('tbemail').textContent=S.enrollment||S.email;
  var isA=S.role==='admin',isT=S.role==='teacher'||isA;
  document.querySelector('.tab-admin').classList.toggle('hidden',!isA);
  $('btn-aa').classList.toggle('hidden',!isT);
  $('btn-at').classList.toggle('hidden',!isT);
  await buildSB();
  if(AC&&S.role!=='admin'){
    try{await post('/api/switcher',{id:S.id,name:S.name,role:S.role,class_id:S.class_id,class_name:AC.name,enrollment:S.enrollment||'',email:S.email||''});}catch(e){}
  }
  goTab('home',document.querySelector('.tab[data-tab=home]'));
}

async function buildSB(){
  var cls=await get('/api/classes'),sb=$('sbclasses');
  window._cls=cls;
  if(!cls.length){sb.innerHTML='<div style="font-size:12px;color:rgba(245,230,176,.35);padding:8px 12px">No classes yet.</div>';$('tbcls').textContent='--';return;}
  var visible=S.role==='admin'?cls:cls.filter(c=>c.id===S.class_id);
  window._vcls=visible;
  if(!AC&&visible.length)AC=visible[0];
  sb.innerHTML=visible.map((c,i)=>"<button class='sbcls"+(AC&&AC.id===c.id?' active':'')+"' onclick='switchClsByIdx("+i+",this)'>"+c.name+"</button>").join('');
  $('tbcls').textContent=AC?AC.name:'--';
}

function switchClsByIdx(i,el){
  var cls=window._vcls[i];if(!cls)return;
  AC=cls;
  document.querySelectorAll('.sbcls').forEach(e=>e.classList.remove('active'));
  el.classList.add('active');$('tbcls').textContent=cls.name;
  var cur=document.querySelector('.tab.active');if(cur)goTab(cur.dataset.tab,cur);
}
function toggleSB(){$('sidebar').classList.toggle('open');}
document.addEventListener('click',e=>{if(!e.target.closest('.sidebar')&&!e.target.closest('.mbtn'))$('sidebar').classList.remove('open');});

function goTab(name,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>{p.classList.remove('active');p.classList.add('hidden');p.style.display='';});
  el.classList.add('active');
  var p=$('panel-'+name);if(!p)return;
  p.classList.remove('hidden');p.classList.add('active');p.style.display='flex';
  if(name==='home')loadHome();
  if(name==='notif'){$('notif-send-area').classList.toggle('hidden',S.role==='student');loadNotifications();}
  if(name==='assign')loadAssign();
  if(name==='marks')loadMarks();
  if(name==='admin')loadAdmin();
}

// ===== HOME =====
async function loadHome(){
  var ini=S.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  $('pav').textContent=ini;
  $('pav').className='pav'+(S.role==='student'?' stu':'');
  $('pstrip').style.background=S.role==='student'?'#d4a017':'#5a0a0a';
  $('pname').textContent=S.name;
  $('prole').textContent=S.role==='admin'?'Host Account':S.role==='teacher'?'Teacher — '+(AC?AC.name:'--'):'Student — '+(AC?AC.name:'--');
  $('pgrid').innerHTML=[['Name',S.name],['Role',cap(S.role)]].map(p=>"<div class='ppill'><div class='ppill-l'>"+p[0]+"</div><div class='ppill-v'>"+p[1]+"</div></div>").join('');
  $('changepwbtnwrap').classList.toggle('hidden',S.role==='admin');
  $('changepinbtnwrap').classList.toggle('hidden',S.role!=='admin');
  if(S.role==='admin'){
    try{
      var u=await get('/api/users'),cl=await get('/api/classes');
      $('statrow').innerHTML=[[cl.length,'Classes'],[u.filter(x=>x.role==='teacher').length,'Teachers'],[u.filter(x=>x.role==='student').length,'Students']].map(s=>"<div class='sbox'><div class='sbox-n'>"+s[0]+"</div><div class='sbox-l'>"+s[1]+"</div></div>").join('');
    }catch(e){}
  }
}
function openPM(){$('pmname').value=S.name||'';$('pmphone').value=S.phone||'';$('pmsubj').value=S.subject||'';$('pmdob').value=S.dob||'';$('pmaddr').value=S.address||'';$('pmcur').value='';$('pmnew').value='';$('pmerr').classList.add('hidden');$('pmswrap').style.display=S.role==='teacher'?'block':'none';openModal('modal-profile');}
async function saveProfile(){
  var name=$('pmname').value.trim(),np=$('pmnew').value,cp=$('pmcur').value,err=$('pmerr');err.classList.add('hidden');
  if(!name){err.textContent='Name required.';err.classList.remove('hidden');return;}
  if(np&&!cp){err.textContent='Enter current password.';err.classList.remove('hidden');return;}
  if(np&&np.length<4){err.textContent='Min 4 chars.';err.classList.remove('hidden');return;}
  var pl={id:S.id,name,phone:$('pmphone').value,subject:$('pmsubj').value,dob:$('pmdob').value,address:$('pmaddr').value};
  if(np){pl.password=cp;pl.new_password=np;}
  var d=await post('/api/profile',pl);
  if(!d.success){err.textContent=d.error;err.classList.remove('hidden');return;}
  S=Object.assign({},S,d.user);
  if(np)await updateSwitcherPwd(S.id,np);
  closeAll();loadHome();$('sbname').textContent=S.name;showToast('Profile updated!','success');
}

// ===== NOTIFICATIONS =====
async function loadNotifications(){
  var el=$('notif-feed');if(!el)return;
  var n=await get('/api/notifications?class_id='+(AC?AC.id:'all'));
  if(!n.length){el.innerHTML='<div class="empty">No notifications yet.</div>';return;}
  var isT=S.role!=='student';
  el.innerHTML=n.map(x=>"<div class='notif-card'>"+(isT?"<button class='notif-del' onclick='deleteNotif(\""+x.id+"\")'>✕</button>":"")+(x.image?"<img src='"+x.image+"' class='notif-img'>":"")+"<div style='font-size:14px;color:#111;line-height:1.5'>"+x.message+"</div><div style='font-size:11px;color:#aaa;margin-top:6px'>"+( x.sent_by||'School')+" · "+new Date(x.created_at).toLocaleString()+"</div></div>").join('');
}
async function deleteNotif(id){if(!confirm('Delete?'))return;await del('/api/notifications/'+id);loadNotifications();}
async function sendNotification(){
  var msg=$('notif-msg').value.trim(),fi=$('notif-img');if(!msg){alert('Enter message.');return;}
  var img=null;if(fi.files[0]){img=await new Promise(r=>{var rd=new FileReader();rd.onload=e=>r(e.target.result);rd.readAsDataURL(fi.files[0]);});}
  await post('/api/notifications',{class_id:AC?AC.id:'all',message:msg,image:img,sent_by:S.name});
  $('notif-msg').value='';fi.value='';loadNotifications();showToast('Sent!','success');
}

// ===== ASSIGNMENTS =====
async function loadAssign(){
  var list=$('alist');if(!AC){list.innerHTML='<div class="empty">No class selected.</div>';return;}
  $('atitle').textContent='📚 Assignments — '+AC.name;
  var items=await get('/api/assignments?class_id='+AC.id);
  if(!items.length){list.innerHTML='<div class="empty">No assignments yet.</div>';return;}
  var today=new Date().toISOString().split('T')[0],isT=S.role!=='student';
  list.innerHTML=items.map(a=>{
    var bc=a.due_date<today?'ab-past':a.due_date===today?'ab-today':'ab-up';
    var bt=a.due_date<today?'Done':a.due_date===today?'Due today':'Due '+a.due_date;
    return "<div class='acard'><div class='acard-top'><div class='acard-title'>"+a.title+"</div><div style='display:flex;align-items:center;gap:6px'><span class='abadge "+bc+"'>"+bt+"</span>"+(isT?"<button class='delbtn' onclick='delAssign(\""+a.id+"\")'>✕</button>":"")+"</div></div>"+(a.subject?"<div class='acard-meta'>"+a.subject+(a.posted_by?' · by '+a.posted_by:'')+"</div>":"")+(a.description?"<div class='acard-desc'>"+a.description+"</div>":"")+"</div>";
  }).join('');
}
function openAM(){$('amtitle').value='';$('amsubj').value='';$('amdue').value='';$('amdesc').value='';openModal('modal-assign');}
async function submitAssign(){var t=$('amtitle').value.trim();if(!t){alert('Enter title.');return;}await post('/api/assignments',{class_id:AC.id,title:t,subject:$('amsubj').value.trim(),due_date:$('amdue').value,description:$('amdesc').value.trim(),posted_by:S.name});closeAll();loadAssign();showToast('Assignment posted!','success');}
async function delAssign(id){if(!confirm('Delete?'))return;await del('/api/assignments/'+id);loadAssign();}

// ===== MARKS =====
async function loadMarks(){
  MS=[];renderSL();mView('results',document.querySelector('.mtab'));
  if(!AC){$('mresults').innerHTML='<div class="empty">No class selected.</div>';return;}
  var tests=await get('/api/tests?class_id='+AC.id);
  if(!tests.length){$('mresults').innerHTML='<div class="empty">No results yet.</div>';return;}
  var isT=S.role!=='student',h='';
  for(var i=0;i<tests.length;i++){
    var t=tests[i],marks=await get('/api/marks?test_id='+t.id);
    var filtered=S.role==='student'?marks.filter(m=>m.student_email===S.email):marks;
    h+="<div class='tcard'><div class='tcard-hdr'><div><div class='tcard-name'>"+t.name+(t.subject?' — '+t.subject:'')+"</div><div class='tcard-meta'>"+(t.test_date||'')+' Max: '+t.max_marks+"</div></div>"+(isT?"<div style='display:flex;gap:6px'><button onclick='openEditMarks(\""+t.id+"\",\""+t.name+"\",\""+(t.subject||'')+"\","+t.max_marks+")' style='font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #d4a017;background:#fdf3d0;color:#5a0a0a;cursor:pointer'>✏️</button><button onclick='deleteTest(\""+t.id+"\")' style='font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #fca5a5;background:#fef2f2;color:#991b1b;cursor:pointer'>🗑</button></div>":"")+"</div><table class='mtbl'><thead><tr><th>Rank</th><th>Student</th><th>Marks</th><th>Grade</th></tr></thead><tbody>"+filtered.map(m=>"<tr class='"+(m.rank<=3?'r'+m.rank:'')+"'><td><span class='rlbl'>"+m.rank_label+"</span></td><td>"+m.student_name+"</td><td>"+m.marks+'/'+t.max_marks+"</td><td>"+m.grade+"</td></tr>").join('')+"</tbody></table></div>";
  }
  $('mresults').innerHTML=h;
}
function mView(v,el){document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('active'));el.classList.add('active');$('mresults').classList.toggle('hidden',v!=='results');$('madd').classList.toggle('hidden',v!=='add');if(v==='add')loadSL();}
async function loadSL(){if(!AC)return;try{window._sts=await get('/api/students?class_id='+AC.id);}catch(e){window._sts=[];}}
function searchByEnroll(){var q=$('st-enroll').value.trim(),dd=$('stdrop');if(!q){dd.classList.add('hidden');$('stsearch').value='';return;}var f=(window._sts||[]).filter(s=>(s.enrollment||'').startsWith(q)&&!MS.find(m=>m.email===s.email));if(!f.length){dd.classList.add('hidden');return;}dd.innerHTML=f.slice(0,8).map(s=>"<div class='acitem' data-name='"+s.name+"' data-email='"+s.email+"' data-enroll='"+(s.enrollment||'')+"' onclick='pickEnroll(this)'>"+s.enrollment+' — '+s.name+"</div>").join('');dd.classList.remove('hidden');}
function pickEnroll(el){$('stsearch').value=el.dataset.name;$('st-enroll').value=el.dataset.enroll;$('stdrop').classList.add('hidden');}
function addFromEnroll(){var name=$('stsearch').value.trim(),enroll=$('st-enroll').value.trim();if(!name){alert('Select a student.');return;}var found=(window._sts||[]).find(s=>s.enrollment===enroll||s.name===name);if(!found){alert('Student not found.');return;}if(MS.find(m=>m.email===found.email)){alert('Already added.');return;}MS.push({name:found.name,email:found.email,marks:''});$('st-enroll').value='';$('stsearch').value='';$('stdrop').classList.add('hidden');renderSL();}
function renderSL(){$('stlist').innerHTML=MS.map((s,i)=>"<div class='strow'><div class='stname'>"+s.name+"</div><input type='number' min='0' placeholder='Marks' value='"+s.marks+"' oninput='MS["+i+"].marks=this.value'><button class='stdel' onclick='MS.splice("+i+",1);renderSL()'>✕</button></div>").join('');}
async function submitMarks(){var name=$('tname').value.trim(),max=Number($('tmax').value),filled=MS.filter(s=>s.marks!=='');if(!name){alert('Enter test name.');return;}if(!max){alert('Enter max marks.');return;}if(!filled.length){alert('Add students.');return;}var d=await post('/api/marks',{test_name:name,subject:$('tsubj').value.trim(),max_marks:max,test_date:$('tdate').value,class_id:AC.id,students:filled});if(d.success){showToast('Published!','success');MS=[];renderSL();$('tname').value='';loadMarks();}}
async function deleteTest(tid){if(!confirm('Delete?'))return;await del('/api/marks/test/'+tid);loadMarks();}
async function openEditMarks(tid,name,subj,max){$('em-test-id').value=tid;$('em-name').value=name;$('em-subj').value=subj;$('em-max').value=max;var marks=await get('/api/marks?test_id='+tid);$('em-students-list').innerHTML=marks.map((m,i)=>"<div class='strow'><div class='stname'>"+m.student_name+"</div><input type='number' min='0' value='"+m.marks+"' id='em-mark-"+i+"' data-email='"+m.student_email+"' data-name='"+m.student_name+"'></div>").join('');openModal('modal-editmarks');}
async function submitEditMarks(){var tid=$('em-test-id').value,max=Number($('em-max').value),name=$('em-name').value,subj=$('em-subj').value;var rows=document.querySelectorAll('[id^=em-mark-]');var students=Array.from(rows).map(inp=>({name:inp.dataset.name,email:inp.dataset.email,marks:inp.value}));await del('/api/marks/test/'+tid);var d=await post('/api/marks',{test_name:name,subject:subj,max_marks:max,test_date:'',class_id:AC.id,students});if(d.success){closeAll();loadMarks();showToast('Updated!','success');}}

async function importExcel(){
  var fi=$('xl-file'),tname=$('tname').value.trim(),tmax=$('tmax').value;
  if(!fi.files[0]){alert('Select file.');return;}if(!tname){alert('Enter test name.');return;}if(!tmax){alert('Enter max marks.');return;}if(!AC){alert('Select class.');return;}
  var sp=$('xl-spinner'),sc=$('xl-caption'),pr=$('xl-progress'),st=$('xl-status');
  function ss(msg,pct,state){st.style.display='block';sc.textContent=msg;pr.style.width=pct+'%';if(state==='ok'){sp.style.animation='none';sp.style.borderTopColor='#16a34a';}if(state==='err'){sp.style.animation='none';sp.style.borderTopColor='#dc2626';}}
  sp.style.animation='spin 0.8s linear infinite';sp.style.borderTopColor='#1d4ed8';ss('Reading...',10);
  try{
    var file=fi.files[0],rows=[];
    if(file.name.endsWith('.csv')){var txt=await file.text();rows=txt.trim().split('\n').map(r=>r.split(',').map(c=>c.trim().replace(/"/g,'')));}
    else{if(!window.XLSX){await new Promise((res,rej)=>{var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});}var ab=await file.arrayBuffer();var wb=window.XLSX.read(ab,{type:'array'});rows=window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});}
    ss('Parsing...',40);
    var h=rows[0].map(x=>String(x).toLowerCase().trim());
    var ni=h.findIndex(x=>x.includes('name')),ei=h.findIndex(x=>x.includes('enroll')||x.includes('roll')),mi=h.findIndex(x=>x.includes('mark')||x.includes('score'));
    if(ni===-1)throw new Error('No Name column');if(mi===-1)throw new Error('No Marks column');
    var students=[];
    for(var i=1;i<rows.length;i++){var row=rows[i],name=String(row[ni]||'').trim(),marks=String(row[mi]||'').trim(),enroll=ei>=0?String(row[ei]||'').trim():'';if(!name||!marks||isNaN(Number(marks)))continue;var found=(window._sts||[]).find(s=>s.enrollment===enroll||s.name===name);students.push({name,email:found?found.email:enroll+'@gev.edu',marks});}
    if(!students.length)throw new Error('No valid data');
    ss('Publishing '+students.length+' students...',80);
    var d=await post('/api/marks',{test_name:tname,subject:$('tsubj').value.trim()||'',max_marks:Number(tmax),test_date:$('tdate').value,class_id:AC.id,students});
    if(!d.success)throw new Error(d.error||'Server error');
    ss('Done! '+students.length+' uploaded!',100,'ok');
    setTimeout(()=>{st.style.display='none';$('xl-file').value='';$('tname').value='';MS=[];renderSL();loadMarks();showToast('Imported!','success');},2000);
  }catch(e){ss('Error: '+e.message,0,'err');}
}

// ===== ACHIEVEMENT POPUP =====
function showAchievement(name,role,pwd){
  var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center';
  o.innerHTML="<div style='background:linear-gradient(135deg,#3d0606,#5a0a0a);border-radius:16px;padding:40px;max-width:400px;width:90%;text-align:center;border:2px solid #d4a017'><div style='font-size:48px;margin-bottom:10px'>"+(role==='teacher'?'👩‍🏫':'🎓')+"</div><div style='font-size:12px;color:#d4a017;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px'>Welcome to Golden Eye Vidyapeeth</div><div style='font-size:26px;font-weight:700;color:#f0c040;margin-bottom:6px'>"+name+"</div><div style='font-size:13px;color:rgba(245,230,176,.7);margin-bottom:20px'>"+cap(role)+" Account</div><div style='background:rgba(0,0,0,.3);border-radius:10px;padding:16px;margin-bottom:20px'><div style='font-size:11px;color:#d4a017;margin-bottom:6px'>PASSWORD</div><div style='font-size:32px;font-weight:700;color:#fff;letter-spacing:.1em'>"+pwd+"</div></div><button onclick='this.parentElement.parentElement.remove()' style='background:#d4a017;color:#3d0606;border:none;border-radius:999px;padding:10px 32px;font-size:14px;font-weight:700;cursor:pointer'>Got it ✓</button></div>";
  document.body.appendChild(o);
}

// ===== ADMIN =====
async function loadAdmin(){buildAStats();buildCGrid();}
async function buildAStats(){
  try{
    var u=await get('/api/users'),cl=await get('/api/classes');
    $('adstats').innerHTML=[[cl.length,'Classes'],[u.filter(x=>x.role==='teacher').length,'Teachers'],[u.filter(x=>x.role==='student').length,'Students']].map(s=>"<div class='astat'><div class='astat-n'>"+s[0]+"</div><div class='astat-l'>"+s[1]+"</div></div>").join('');
  }catch(e){}
}
async function buildCGrid(){
  var cls=await get('/api/classes');window._acls=cls;
  if(!cls.length){$('clsgrid').innerHTML='<div class="empty">No classes yet.</div>';return;}
  if(!AAC)AAC=cls[0];
  $('clsgrid').innerHTML='<div class="clsgrid">'+cls.map((c,i)=>"<div class='clsblock"+(AAC&&AAC.id===c.id?' sel':'')+"' onclick='selClsByIdx("+i+",this)'><div><div class='clsname'>"+c.name+"</div><div class='clsmeta' id='cm-"+c.id+"'>...</div></div><button class='clsdel' onclick='event.stopPropagation();delCls(\""+c.id+"\")'>🗑</button></div>").join('')+'</div>';
  cls.forEach(async c=>{try{var u=await get('/api/users?class_id='+c.id);var el=$('cm-'+c.id);if(el){var s=u.filter(x=>x.role==='student').length,t=u.find(x=>x.role==='teacher');el.textContent=s+' students'+(t?' · '+t.name.split(' ')[0]:'');}}catch(e){}});
  loadUTable();
}
function selClsByIdx(i,el){var cls=window._acls[i];if(!cls)return;AAC=cls;document.querySelectorAll('.clsblock').forEach(b=>b.classList.remove('sel'));el.classList.add('sel');$('usectitle').textContent='Users — '+cls.name;loadUTable();}
async function delCls(id){if(!confirm('Delete class?'))return;await del('/api/classes/'+id);if(AAC&&AAC.id===id)AAC=null;loadAdmin();buildSB();}
async function loadUTable(){
  if(!AAC){$('usertbl').innerHTML='<div class="empty">Select a class.</div>';return;}
  $('usectitle').textContent='Users — '+AAC.name;
  var u=await get('/api/users?class_id='+AAC.id+'&showpwd=1');
  if(!u.length){$('usertbl').innerHTML='<div class="empty">No users yet.</div>';return;}
  $('usertbl').innerHTML='<table class="utbl"><thead><tr><th>Name</th><th>ID</th><th>Password</th><th>Role</th><th></th></tr></thead><tbody>'+u.map(u=>"<tr><td style='font-weight:700'>"+u.name+"</td><td style='font-size:12px;color:#888;font-family:monospace'>"+(u.enrollment||u.email)+"</td><td style='font-size:12px;color:#555;font-family:monospace'>"+(u.password||'--')+"</td><td><span class='rpill "+(u.role==='teacher'?'rpt':'rps')+"'>"+u.role+"</span></td><td><button class='tbtn' onclick='editU(\""+u.id+"\",\""+u.name+"\")'>✏️</button><button class='tbtn danger' onclick='delU(\""+u.id+"\")'>🗑</button></td></tr>").join('')+'</tbody></table>';
}
function openCM(){$('cmname').value='';$('cmerr').classList.add('hidden');openModal('modal-class');}
async function submitClass(){var name=$('cmname').value.trim(),err=$('cmerr');err.classList.add('hidden');if(!name){err.textContent='Enter name.';err.classList.remove('hidden');return;}var d=await post('/api/classes',{name});if(!d.success){err.textContent=d.error;err.classList.remove('hidden');return;}closeAll();loadAdmin();buildSB();showToast('Class added!','success');}
async function openUM(){$('umname').value='';$('umemail').value='';$('umerr').classList.add('hidden');var cl=await get('/api/classes');$('umclass').innerHTML=cl.length?cl.map(c=>"<option value='"+c.id+"'>"+c.name+"</option>").join(''):'<option value="">No classes</option>';updateUserModal($('umrole').value);openModal('modal-user');}
async function submitUser(){var name=$('umname').value.trim(),email=$('umemail').value.trim(),role=$('umrole').value,class_id=$('umclass').value,err=$('umerr');err.classList.add('hidden');if(!name||!email){err.textContent='Fill all fields.';err.classList.remove('hidden');return;}if(!class_id){err.textContent='Add a class first.';err.classList.remove('hidden');return;}var userObj=role==='teacher'?{name,email,role,class_id}:{name,enrollment:email,role,class_id};var d=await post('/api/users',{action:'add',user:userObj});if(!d.success){err.textContent=d.error;err.classList.remove('hidden');return;}closeAll();loadAdmin();buildSB();showAchievement(name,role,d.generatedPassword||'welcome123');}
async function delU(id){if(!confirm('Remove?'))return;await post('/api/users',{action:'remove',user:{id}});loadUTable();buildAStats();}
async function editU(id,name){var n=prompt('Edit name:',name);if(!n)return;await post('/api/users',{action:'edit',user:{id,name:n}});loadUTable();}

