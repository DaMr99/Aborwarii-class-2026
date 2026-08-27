let supabaseClient = null;
let supabase = null;
function showFatal(message){
  document.querySelectorAll('.msg').forEach(x=>{x.textContent=message;x.className='msg err';x.style.display='block';});
}
if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  showFatal('The Supabase library did not load. Refresh the page or check your internet connection.');
} else if (!window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) {
  showFatal('Supabase configuration is missing.');
} else {
  supabaseClient = window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  supabase = supabaseClient;
}
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const icon=c=>c==="football"?"⚽":c==="birthday"?"🎂":c==="event"?"📅":"📢";
function msg(el,t,e=false){if(el){el.textContent=t;el.className="msg"+(e?" err":"");el.style.display="block"}}
function annHTML(a,admin=false){return `<div class="announcement"><div class="icon">${icon(a.category)}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(a.title)}</b><span class="tag ${esc(a.category)}">${esc(a.category)}</span></div><div class="muted" style="margin-top:5px">${esc(a.description)}</div><small class="muted">${new Date(a.created_at).toLocaleDateString()}</small></div>${admin?`<button class="btn danger" onclick="deleteAnnouncement('${a.id}')">Delete</button>`:""}</div>`}

async function profile(){
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError) throw authError;
  if(!user) return null;
  // Use a SECURITY DEFINER RPC so the logged-in user's profile can be read
  // even when RLS policies are being changed or are temporarily restrictive.
  const {data,error}=await supabase.rpc("get_my_profile");
  if(error) throw error;
  return Array.isArray(data)?(data[0]||null):data;
}
async function anns(el,admin=false){const {data,error}=await supabase.from("announcements").select("*").order("created_at",{ascending:false});if(error)throw error;$(el).innerHTML=data.length?data.map(a=>annHTML(a,admin)).join(""):`<div class="empty">No announcements yet.</div>`}
async function boot(){
 if(!supabase){ return; }
 try{await supabase.auth.getSession();}catch(e){console.error(e)}
 if(!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){document.querySelectorAll(".msg").forEach(x=>msg(x,"Supabase configuration is missing.",true));return}
 if($("#homeAnnouncements")) anns("#homeAnnouncements").catch(e=>console.error(e));
 if($("#allAnnouncements")) anns("#allAnnouncements").catch(e=>console.error(e));
 const reg=$("#registerForm");
 if(reg)reg.onsubmit=async e=>{e.preventDefault();try{let f=Object.fromEntries(new FormData(reg));
if((f.password||'').length<6) throw Error('Password must be at least 6 characters.');
if(f.password!==f.confirmPassword && f.confirmPassword!==undefined) throw Error('Passwords do not match.');
const submit=reg.querySelector('button[type="submit"],button:not([type])'); if(submit) submit.disabled=true;
let {data,error}=await supabase.auth.signUp({email:f.email.trim().toLowerCase(),password:f.password,options:{data:{name:f.name,phone:f.phone||"",className:f.className||""}}});
if(error)throw error;
reg.reset();
msg($("#registerMsg"),data.session?"Account created successfully. Your account is now waiting for administrator approval.":"Account created. If email confirmation is enabled, confirm your email first. Your account will then wait for administrator approval.");
if(submit) submit.disabled=false;}catch(x){msg($("#registerMsg"),x.message,true)}};
 const sl=$("#studentLogin");
 if(sl)sl.onsubmit=async e=>{e.preventDefault();try{let f=Object.fromEntries(new FormData(sl));let {error}=await supabase.auth.signInWithPassword({email:f.email.trim().toLowerCase(),password:f.password});if(error)throw error;let p=await profile();if(!p||p.role!=="student"){await supabase.auth.signOut();throw Error("This account is not a student account.")}if(p.status!=="approved"){await supabase.auth.signOut();throw Error(p.status==="pending"?"Your account is waiting for admin approval.":"Your account has been rejected.")}window.location.assign("./student.html")}catch(x){msg($("#loginMsg"),x.message||"Login failed.",true)}};
 const al=$("#adminLogin");
 if(al)al.onsubmit=async e=>{
   e.preventDefault();
   const button=al.querySelector("button"); if(button)button.disabled=true;
   const out=$("#adminMsg");
   try{
     let f=Object.fromEntries(new FormData(al));
     msg(out,"Signing in…");
     const {data,error}=await supabase.auth.signInWithPassword({email:f.email.trim().toLowerCase(),password:f.password});
     if(error)throw error;
     if(!data?.session)throw Error("Supabase did not create a login session. Check Authentication settings.");
     const p=await profile();
     if(!p)throw Error("Login succeeded, but no profile was found for this account. Make sure the profiles trigger/SQL has been installed.");
     if(p.role!=="admin")throw Error("This account is not an administrator. In Supabase, set role to admin for your email.");
     if(p.status!=="approved")throw Error("This administrator account is not approved. Set status to approved in the profiles table.");
     msg(out,"Login successful. Opening administrator dashboard…");
     // Small delay makes the success state visible and gives auth persistence time to finish.
     setTimeout(()=>window.location.assign("./admin.html"),250);
   }catch(x){
     console.error("ABORWARII admin login:",x);
     msg(out,x.message||"Administrator login failed.",true);
   }finally{if(button)button.disabled=false;}
 };
 const cf=$("#contactForm");if(cf)cf.onsubmit=async e=>{e.preventDefault();try{let f=Object.fromEntries(new FormData(cf));let {error}=await supabase.from("messages").insert(f);if(error)throw error;cf.reset();msg($("#contactMsg"),"Message sent successfully.")}catch(x){msg($("#contactMsg"),x.message,true)}};
 const out=$("#logout");if(out)out.onclick=async()=>{await supabase.auth.signOut();window.location.assign("./")};
 if($("#studentArea")){try{let p=await profile();if(!p||p.role!=="student"){window.location.assign("./student-login.html");return}$("#studentName").textContent=p.name;await anns("#studentAnnouncements")}catch(e){console.error(e)}}
 if($("#adminArea"))await loadAdmin();
}
async function loadAdmin(){
 let p;
 try{p=await profile()}catch(x){msg($("#adminMsg"),"Administrator session/profile check failed: "+(x.message||x),true);return}
 if(!p){msg($("#adminMsg"),"No administrator profile was found. Please sign out and sign in again.",true);return}
 if(p.role!=="admin"||p.status!=="approved"){
   msg($("#adminMsg"),`Access denied. Your profile says role=${p.role||"(empty)"}, status=${p.status||"(empty)"}.`,true);
   return;
 }
 try{
 const q=await Promise.all([
  supabase.from("profiles").select("*").eq("role","student").eq("status","pending"),
  supabase.from("profiles").select("*").eq("role","student"),
  supabase.from("announcements").select("*").order("created_at",{ascending:false}),
  supabase.from("messages").select("*").order("created_at",{ascending:false})
 ]);
 q.forEach(x=>{if(x.error)throw x.error});
 let [pending,students,as,ms]=q.map(x=>x.data);
 $("#pendingCount").textContent=pending.length;$("#studentCount").textContent=students.length;$("#announcementCount").textContent=as.length;
 $("#pending").innerHTML=pending.length?pending.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.class_name||"-")}</td><td><button class="btn primary" onclick="studentAction('${u.id}','approved')">Approve</button> <button class="btn danger" onclick="studentAction('${u.id}','rejected')">Reject</button></td></tr>`).join(""):`<tr><td colspan="4" class="empty">No pending approvals.</td></tr>`;
 $("#students").innerHTML=students.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.class_name||"-")}</td><td>${esc(u.status)}</td></tr>`).join("");
 $("#adminAnnouncements").innerHTML=as.map(a=>annHTML(a,true)).join("");
 if($("#messagesList"))$("#messagesList").innerHTML=ms.length?ms.map(m=>`<div class="announcement"><div class="icon">✉️</div><div><b>${esc(m.name)}</b> <small class="muted">${esc(m.email)}</small><div class="muted">${esc(m.message)}</div></div></div>`).join(""):`<div class="empty">No messages.</div>`;
 $("#announcementForm").onsubmit=async e=>{e.preventDefault();try{let f=Object.fromEntries(new FormData(e.target));let {data:{user}}=await supabase.auth.getUser();let {error}=await supabase.from("announcements").insert({title:f.title,description:f.description,category:f.category,created_by:user.id});if(error)throw error;e.target.reset();msg($("#adminMsg"),"Announcement published.");await loadAdmin()}catch(x){msg($("#adminMsg"),x.message,true)}};
 }catch(x){msg($("#adminMsg"),"Dashboard data could not be loaded: "+(x.message||x),true)}
}
async function studentAction(id,status){try{let {error}=await supabase.rpc("admin_set_student_status",{p_student_id:id,p_status:status});if(error)throw error;await loadAdmin()}catch(x){alert(x.message)}}
async function deleteAnnouncement(id){if(!confirm("Delete this announcement?"))return;let {error}=await supabase.from("announcements").delete().eq("id",id);if(error)alert(error.message);else await loadAdmin()}
document.addEventListener("DOMContentLoaded",boot);
