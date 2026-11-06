const $ = (id) => document.getElementById(id);
async function api(path){
  const response = await fetch(path, {headers: {"Accept":"application/json"}});
  if(response.status === 401) {
    $("connection").textContent = "Sign-in required";
    throw new Error("Dashboard authentication required. Refresh and enter the admin credentials when prompted.");
  }
  if(!response.ok) throw new Error(`API error ${response.status}`);
  return response.json();
}
function esc(value){return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function time(value){if(!value)return "—";const d=new Date(value);return isNaN(d)?esc(value):d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}
async function refresh(){
  try{
    const [summary, ambulances, queue, junctions, departments, events] = await Promise.all([
      api("/api/v1/admin/dashboard"),api("/api/v1/admin/ambulances"),
      api("/api/v1/admin/emergencies/queue"),api("/api/v1/admin/junction-events"),
      api("/api/v1/admin/departments"),api("/api/v1/admin/events")
    ]);
    $("connection").textContent="Connected";
    $("m-ambulances").textContent=summary.total_ambulances;
    $("m-emergencies").textContent=summary.active_emergencies;
    $("m-junctions").textContent=summary.configured_junctions;
    $("m-commands").textContent=summary.pending_model_commands;
    $("fleet-count").textContent=`${ambulances.length} VEHICLES`;
    $("fleet").innerHTML=ambulances.length?ambulances.map(a=>{
      const g=a.gps; const pos=g?`${Number(g.latitude).toFixed(5)}, ${Number(g.longitude).toFixed(5)}`:"No GPS fix";
      const gpsTag=!g?"WAITING":g.stale?"STALE":"LIVE";
      return `<tr><td><b>${esc(a.ambulance_id)}</b><br><small>${esc(a.vehicle_number)}</small></td><td>${esc(a.driver_name)}</td><td>${pos}</td><td>${g&&g.speed_kmph!=null?esc(g.speed_kmph)+" km/h":"—"}</td><td><span class="tag">${gpsTag}</span></td></tr>`;
    }).join(""):`<tr><td colspan="5" class="empty">No ambulances registered yet</td></tr>`;
    $("queue").innerHTML=queue.length?queue.map(e=>`<div class="item"><div><b>${esc(e.emergency_id)} · ${esc(e.ambulance_id)}</b><small>${esc(e.hospital_name)} · ${time(e.created_at)}</small></div><span class="tag ${esc(e.severity)}">${esc(e.severity)}</span></div>`).join(""):`<div class="empty">No active emergencies</div>`;
    $("junction-list").innerHTML=junctions.length?junctions.map(j=>`<div class="item"><div><b>${esc(j.ambulance_id)} → ${esc(j.junction_id)}</b><small>${esc(j.distance_meters)} m away · ${time(j.created_at)}</small></div><span class="tag">${esc(j.status)}</span></div>`).join(""):`<div class="empty">No junction approaches detected</div>`;
    $("department-list").innerHTML=departments.map(d=>`<div class="dept"><b>${esc(d.name.replaceAll("_"," "))}</b><small>${esc(d.description)}</small></div>`).join("");
    $("event-list").innerHTML=events.length?events.slice(0,12).map(e=>`<div class="item"><div><b>${esc(e.event_type)}</b><small>${esc(e.department)} · ${esc(e.message)}</small></div><small>${time(e.created_at)}</small></div>`).join(""):`<div class="empty">No system events yet</div>`;
  }catch(err){$("connection").textContent="Unavailable";console.error(err);}
}
$("refresh").addEventListener("click",refresh);
refresh();
setInterval(refresh,5000);
