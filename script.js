// ================= LOGIN =================
function login(){
  if(user.value==="admin" && pass.value==="1234"){
    closePopup();
    loginBox.style.display="none";
    panel.classList.remove("hide");
    goHome();
  } else {
    showPopup("❌ Invalid Login");
  }
}

// ================= DATA =================
let db = JSON.parse(localStorage.getItem("DB")) || {
  classes: [],
  students: [],
  attendance: []
};
function save(){ localStorage.setItem("DB",JSON.stringify(db)); }

// ================= POPUP =================
function showPopup(msg){
  popupMsg.innerText = msg;
  popup.classList.remove("hide");
}
function closePopup(){
  popup.classList.add("hide");
}

// ================= HOME =================
function goHome(){
  content.innerHTML = `
    <div class="box">
      <h3>Welcome Admin</h3>
      <p>Select option from menu</p>
    </div>`;
}

// ================= CREATE CLASS =================
function showCreateClass(){
  content.innerHTML = `
  <div class="box">
    <h3>Create Class</h3>
    <input id="cls" placeholder="Class Room Name">
    <button onclick="addClass()">Save</button>
    <ul>
      ${db.classes.map((c,i)=>`
        <li>${c}
          <button onclick="deleteClass(${i})">🗑</button>
        </li>`).join("")}
    </ul>
  </div>`;
}
function addClass(){
  if(!cls.value) return;
  db.classes.push(cls.value);
  save();
  cls.value="";
  showPopup("✅ Class Created");
  showCreateClass();
}
function deleteClass(i){
  if(confirm("Delete class?")){
    db.classes.splice(i,1);
    save(); showCreateClass();
  }
}

// ================= CREATE STUDENT =================
function showCreateStudent(){
  content.innerHTML=`
  <div class="box">
    <h3>Create Student</h3>
    <input id="sname" placeholder="Student Name">
    <input id="reg" placeholder="Reg No">
    <input id="mob" placeholder="Mobile No">
    <select id="sclass">
      ${db.classes.map(c=>`<option>${c}</option>`)}
    </select>
    <button onclick="addStudent()">Save</button>

    <hr>
    <h4>Import Students (CSV)</h4>
    <input type="file" id="csvFile" accept=".csv">
    <button onclick="importCSV()">Import CSV</button>
  </div>`;
}

function addStudent(){
  db.students.push({
    name:sname.value,
    reg:reg.value,
    mobile:mob.value,
    class:sclass.value
  });
  save();
  sname.value=reg.value=mob.value="";
  showPopup("✅ Student Created");
}

// ================= CSV IMPORT =================
function importCSV(){
  let file = csvFile.files[0];
  if(!file){
    showPopup("❌ Select CSV file");
    return;
  }
  let reader = new FileReader();
  reader.onload = function(e){
    let rows = e.target.result.split("\n").slice(1);
    rows.forEach(r=>{
      let [name,reg,mobile,cls] = r.split(",");
      if(name && reg){
        db.students.push({
          name:name.trim(),
          reg:reg.trim(),
          mobile:(mobile||"").trim(),
          class:(cls||"").trim()
        });
      }
    });
    save();
    csvFile.value="";
    showPopup("✅ Students Imported Successfully");
  };
  reader.readAsText(file);
}

// ================= ATTENDANCE =================
function showAttendance(){
  content.innerHTML = `
  <div class="box">
    <h3>Select Class</h3>
    ${db.classes.map(c=>`
      <div class="row" onclick="openClass('${c}')">${c}</div>`).join("")}
  </div>`;
}

function openClass(cls){
  content.innerHTML=`
  <div class="box">
    <h3>${cls}</h3>
    <input placeholder="Search Name / Reg"
      onkeyup="searchStudent(this.value,'${cls}')">

    <button onclick="exportAttendance()">⬇ Download Attendance</button>

    <div id="list">
      ${renderStudents(cls)}
    </div>
  </div>`;
}

// ================= ATTENDANCE TABLE =================
function renderStudents(cls,filter=""){
  let html = `
  <table border="1" width="100%">
    <tr>
      <th>Name</th>
      <th>Reg No</th>
      <th>Date</th>
      <th>Check In</th>
      <th>Check Out</th>
      <th>Total Time</th>
      <th>Action</th>
    </tr>`;

  db.students
  .filter(s=>s.class===cls &&
    (s.name.toLowerCase().includes(filter) ||
     s.reg.toLowerCase().includes(filter)))
  .forEach(s=>{
    let today = new Date().toDateString();
    let rec = db.attendance.find(a=>a.reg===s.reg && a.date===today) || {};
    html+=`
    <tr>
      <td>${s.name}</td>
      <td>${s.reg}</td>
      <td>${today}</td>
      <td>${rec.in||"--"}</td>
      <td>${rec.out||"--"}</td>
      <td>${totalTime(s.reg)}</td>
      <td>
        <button onclick="checkIn('${s.reg}')">IN</button>
        <button onclick="checkOut('${s.reg}')">OUT</button>
        <button onclick="details('${s.reg}')">More</button>
      </td>
    </tr>`;
  });

  html+=`</table>`;
  return html;
}

function searchStudent(v,cls){
  list.innerHTML = renderStudents(cls,v.toLowerCase());
}

// ================= CHECK IN / OUT =================
function checkIn(reg){
  let today = new Date().toDateString();
  if(db.attendance.find(a=>a.reg===reg && a.date===today)){
    showPopup("❌ Attendance already locked for today");
    return;
  }
  db.attendance.push({
    reg,
    date:today,
    in:new Date().toLocaleTimeString()
  });
  save(); showPopup("✅ Check-In Successful");
  openClass(db.students.find(s=>s.reg===reg).class);
}

function checkOut(reg){
  let r = db.attendance.slice().reverse()
    .find(a=>a.reg===reg && !a.out);
  if(!r) return;
  r.out=new Date().toLocaleTimeString();
  save(); showPopup("✅ Check-Out Successful");
  openClass(db.students.find(s=>s.reg===reg).class);
}

// ================= TOTAL TIME =================
function totalTime(reg){
  let min=0;
  db.attendance.filter(a=>a.reg===reg && a.out)
  .forEach(a=>{
    let t1=new Date("1970 "+a.in);
    let t2=new Date("1970 "+a.out);
    min+=(t2-t1)/60000;
  });
  return Math.floor(min/60)+"h "+Math.floor(min%60)+"m";
}

// ================= EXPORT ATTENDANCE =================
function exportAttendance(){
  let csv = "Name,Reg No,Date,Check In,Check Out\n";
  db.attendance.forEach(a=>{
    let s=db.students.find(x=>x.reg===a.reg);
    csv+=`${s.name},${a.reg},${a.date},${a.in},${a.out||""}\n`;
  });
  downloadCSV(csv,"attendance_report.csv");
}
function downloadCSV(data,filename){
  let blob=new Blob([data],{type:"text/csv"});
  let url=URL.createObjectURL(blob);
  let a=document.createElement("a");
  a.href=url; a.download=filename; a.click();
}

// ================= DELETE STUDENT =================
function deleteStudent(reg){
  if(confirm("Delete student?")){
    db.students=db.students.filter(s=>s.reg!==reg);
    db.attendance=db.attendance.filter(a=>a.reg!==reg);
    save(); showPopup("Student Deleted");
  }
}

// ================= DETAILS PAGE =================
function details(reg){
  localStorage.setItem("VIEW",reg);
  window.open("student.html");
}
