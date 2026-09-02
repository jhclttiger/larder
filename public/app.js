(function(){
"use strict";

/* ============================== constants ============================== */
var DEPARTMENTS = ["Produce","Meat & Seafood","Dairy & Eggs","Bakery","Pantry & Dry Goods","Canned & Jarred","Frozen","Spices & Condiments","Beverages","Other"];
var DEPT_ICON = {"Produce":"🥬","Meat & Seafood":"🥩","Dairy & Eggs":"🥚","Bakery":"🍞","Pantry & Dry Goods":"🌾","Canned & Jarred":"🥫","Frozen":"🧊","Spices & Condiments":"🧂","Beverages":"🥤","Other":"🛒"};
var DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
var MEALS = ["Dinner"];
var DIETARY_OPTIONS = ["Vegetarian","Vegan","Pescatarian","Gluten-Free","Dairy-Free","Nut-Free","Low-Carb","Kosher","Halal"];
var CUISINE_OPTIONS = ["Italian","Mexican","Chinese","Japanese","Thai","Indian","Mediterranean","American","French","Korean","Vietnamese","Middle Eastern","BBQ","Greek","Spanish","Caribbean"];
var AVATAR_OPTIONS = ["🧑‍🍳","😋","🌱","🌶️","🍜","🥗","🍕","🍣","🥑","🍔","🧑","👩","👨","🧒"];

var DEPT_KEYWORDS = [
  [/chicken|beef|pork|steak|lamb|turkey|bacon|sausage|shrimp|salmon|fish|tuna|crab|scallop|ground meat|ham\b/i,"Meat & Seafood"],
  [/milk|cheese|butter|yogurt|yoghurt|cream|egg|parmesan|mozzarella|cheddar|feta|sour cream/i,"Dairy & Eggs"],
  [/lettuce|tomato|onion|garlic|pepper\b|bell pepper|carrot|potato|apple|lemon|lime|herb|basil|cilantro|parsley|spinach|kale|cucumber|avocado|mushroom|broccoli|cabbage|celery|ginger root|scallion|zucchini|squash|fruit|berries|banana/i,"Produce"],
  [/bread|bun|tortilla|bagel|baguette|roll\b|pita|naan/i,"Bakery"],
  [/flour|sugar|rice|pasta|noodle|oil\b|olive oil|vinegar|beans|lentil|oats|quinoa|breadcrumb|honey|syrup|cereal|baking powder|baking soda|yeast|cornstarch|stock cube|broth powder/i,"Pantry & Dry Goods"],
  [/frozen/i,"Frozen"],
  [/canned|can of|jarred|jar of|tomato sauce|marinara|salsa|pickle/i,"Canned & Jarred"],
  [/salt|pepper$|black pepper|spice|cumin|paprika|cinnamon|oregano|thyme|rosemary|chili powder|curry powder|nutmeg|clove|cardamom|bay leaf|red pepper flake/i,"Spices & Condiments"],
  [/soda|juice|wine|beer|water\b|coffee|tea\b|broth|stock\b/i,"Beverages"]
];
function guessDepartment(name){
  for (var i=0;i<DEPT_KEYWORDS.length;i++){ if (DEPT_KEYWORDS[i][0].test(name)) return DEPT_KEYWORDS[i][1]; }
  return "Other";
}
var DIET_EXCLUDE = {
  "Vegetarian": /chicken|beef|pork|steak|lamb|turkey|bacon|sausage|shrimp|salmon|\bfish\b|tuna|crab|scallop|anchov|gelatin|ham\b/i,
  "Vegan": /chicken|beef|pork|steak|lamb|turkey|bacon|sausage|shrimp|salmon|\bfish\b|tuna|crab|scallop|anchov|gelatin|ham\b|milk|cheese|butter|yogurt|cream|egg|honey|mayonnaise/i,
  "Pescatarian": /chicken|beef|pork|steak|lamb|turkey|bacon|sausage|ham\b/i,
  "Gluten-Free": /\bflour\b|\bwheat\b|\bpasta\b|\bnoodle\b|\bbread\b|\bbun\b|\btortilla\b|\bbagel\b|\bbarley\b|\bsoy sauce\b|breadcrumb/i,
  "Dairy-Free": /milk|cheese|butter|yogurt|yoghurt|cream\b|parmesan|mozzarella|cheddar/i,
  "Nut-Free": /almond|walnut|pecan|cashew|pistachio|hazelnut|peanut|\bnuts\b/i
};

/* ============================== utilities ============================== */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function esc(s){ s = (s===undefined||s===null)?"":String(s); return s.replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function pad2(n){ return n<10 ? "0"+n : ""+n; }
function isoDate(d){ return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
function getMonday(d){ var x=new Date(d); var day=x.getDay(); var diff=(day===0? -6:1)-day; x.setDate(x.getDate()+diff); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
function formatWeekRange(mon){
  var sun=addDays(mon,6);
  var optsA={month:"short",day:"numeric"}, optsB={month:"short",day:"numeric",year:"numeric"};
  var sameMonth = mon.getMonth()===sun.getMonth();
  var a = mon.toLocaleDateString(undefined, sameMonth?{day:"numeric"}:optsA);
  var b = sun.toLocaleDateString(undefined, optsB);
  return (sameMonth ? mon.toLocaleDateString(undefined,{month:"short"})+" "+a : a) + " – " + b;
}
function debounce(fn,ms){ var t; return function(){ var a=arguments,c=this; clearTimeout(t); t=setTimeout(function(){fn.apply(c,a);},ms); }; }
function fmtTime(mins){ if(!mins) return ""; if(mins<60) return mins+"m"; var h=Math.floor(mins/60),m=mins%60; return h+"h"+(m? " "+m+"m":""); }

function toast(msg, kind){
  var root=document.getElementById("toast-root");
  var el=document.createElement("div"); el.className="toast"; el.textContent=msg;
  if(kind==="warn"){ el.style.background="var(--warn)"; }
  root.appendChild(el);
  setTimeout(function(){ el.style.transition="opacity .3s"; el.style.opacity="0"; setTimeout(function(){ el.remove(); },320); },2600);
}

function closeModal(){ document.getElementById("modal-root").innerHTML=""; document.removeEventListener("keydown",escCloseHandler); }
function escCloseHandler(e){ if(e.key==="Escape") closeModal(); }
function openModal(innerHtml, opts){
  opts=opts||{};
  var root=document.getElementById("modal-root");
  root.innerHTML =
    '<div class="modal-overlay" id="modal-overlay"><div class="modal '+(opts.wide?"wide":"")+'" role="dialog">'+innerHtml+'</div></div>';
  document.getElementById("modal-overlay").addEventListener("mousedown", function(e){ if(e.target.id==="modal-overlay") closeModal(); });
  document.addEventListener("keydown", escCloseHandler);
  if(opts.onMount) opts.onMount(root);
}
function confirmModal(title, body, onYes, yesLabel){
  openModal(
    '<div class="modal-head"><h3>'+esc(title)+'</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><p style="margin:0;color:var(--ink-soft)">'+esc(body)+'</p></div>'+
    '<div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button>'+
    '<button class="btn btn-danger" id="confirm-yes-btn">'+esc(yesLabel||"Delete")+'</button></div>'
  );
  document.getElementById("confirm-yes-btn").addEventListener("click", function(){ closeModal(); onYes(); });
}
window.closeModal = closeModal;

/* ============================== state ============================== */
var state = {
  users: [],
  recipes: [],
  activeUserId: null,
  weekStart: isoDate(getMonday(new Date())),
  mealPlan: {slots:{}},
  grocery: {checked:{}, extraItems:[]},
  tab: "recipes",
  recipeSearch: "",
  recipeCuisineFilter: "",
  recipeSort: "new",
  aiEnabled: false,
  booted:false
};
var rawState = { recipes:{}, users:{}, mealplans:{}, grocery:{} };

/* ============================== API layer ============================== */
function api(url, method, body){
  return fetch(url, {
    method: method||"GET",
    headers: body!==undefined ? {"content-type":"application/json"} : undefined,
    credentials: "same-origin",
    body: body!==undefined ? JSON.stringify(body) : undefined
  }).then(function(res){
    if(res.status===401){ showLoginScreen(true); return Promise.reject({code:"unauthorized"}); }
    if(!res.ok) return res.json().catch(function(){return {};}).then(function(j){ return Promise.reject({code:"http_"+res.status, message:j.error||res.statusText}); });
    if(res.status===204) return null;
    return res.json();
  });
}

function applyRawState(raw){
  rawState = raw;
  state.recipes = Object.keys(raw.recipes||{}).map(function(id){ return raw.recipes[id]; });
  state.users = Object.keys(raw.users||{}).map(function(id){ return raw.users[id]; });
  var wk = (raw.mealplans||{})[state.weekStart];
  state.mealPlan = wk ? wk : {slots:{}};
  var gr = (raw.grocery||{})[state.weekStart];
  state.grocery = gr ? gr : {checked:{}, extraItems:[]};
}
function refreshState(){
  return api("/api/state").then(function(raw){ applyRawState(raw); render(); }).catch(function(){});
}

var Data = {
  addRecipe: function(r){ return api("/api/recipes","POST", r).then(function(){ return refreshState(); }); },
  updateRecipe: function(id, patch){ return api("/api/recipes/"+id,"PUT", patch).then(function(){ return refreshState(); }); },
  deleteRecipe: function(id){ return api("/api/recipes/"+id,"DELETE").then(function(){ return refreshState(); }); },
  addUser: function(u){ return api("/api/users","POST", u).then(function(){ return refreshState(); }); },
  updateUser: function(id, patch){ return api("/api/users/"+id,"PUT", patch).then(function(){ return refreshState(); }); },
  deleteUser: function(id){ if(state.activeUserId===id) state.activeUserId=null; return api("/api/users/"+id,"DELETE").then(function(){ return refreshState(); }); },
  setMealSlot: function(week, key, val){ return api("/api/mealplan/"+week+"/"+encodeURIComponent(key),"PUT", {value: val}).then(function(){ return refreshState(); }); },
  toggleGroceryChecked: function(week, key){ return api("/api/grocery/"+week+"/checked/"+encodeURIComponent(key),"PUT", {}).then(function(){ return refreshState(); }); },
  setGroceryExtras: function(week, arr){ return api("/api/grocery/"+week+"/extras","PUT", arr).then(function(){ return refreshState(); }); },
  clearGroceryChecked: function(week){ return api("/api/grocery/"+week+"/clear-checked","POST", {}).then(function(){ return refreshState(); }); },
  switchWeek: function(week){ state.weekStart=week; applyRawState(rawState); render(); }
};

/* ============================== boot / auth ============================== */
function showLoginScreen(show){
  document.getElementById("login-screen").classList.toggle("hidden", !show);
  document.getElementById("app").classList.toggle("hidden", show);
}
function wireLoginForm(){
  document.getElementById("login-form").addEventListener("submit", function(e){
    e.preventDefault();
    var pass = document.getElementById("login-passcode").value;
    fetch("/api/login", {method:"POST", headers:{"content-type":"application/json"}, credentials:"same-origin", body:JSON.stringify({passcode:pass})})
      .then(function(res){ return res.json().then(function(j){ return {ok:res.ok, body:j}; }); })
      .then(function(r){
        if(r.ok){ document.getElementById("login-error").textContent=""; boot(); }
        else { document.getElementById("login-error").textContent="That's not the right passcode."; }
      })
      .catch(function(){ document.getElementById("login-error").textContent="Couldn't reach the server."; });
  });
}
function connectEvents(){
  try{
    var es = new EventSource("/api/events");
    es.addEventListener("changed", function(){ refreshState(); });
    es.onerror = function(){ /* browser auto-reconnects */ };
  }catch(e){}
}
function boot(){
  api("/api/config").then(function(cfg){
    state.aiEnabled = !!cfg.aiEnabled;
    if(cfg.passcodeRequired && !cfg.authed){ wireLoginForm(); showLoginScreen(true); return; }
    showLoginScreen(false);
    return refreshState().then(function(){
      state.booted = true;
      connectEvents();
      render();
    });
  }).catch(function(){
    toast("Couldn't reach the Larder server — check your connection.", "warn");
  });
}

/* ============================== scoring / recommendations ============================== */
function recipeText(r){
  return [r.title, r.cuisine, (r.tags||[]).join(" "), (r.ingredients||[]).map(function(i){return i.name;}).join(" ")].join(" ").toLowerCase();
}
function violatesDiet(recipe, dietList){
  if(!dietList || !dietList.length) return false;
  var tags=(recipe.tags||[]).map(function(t){return t.toLowerCase();});
  for(var i=0;i<dietList.length;i++){
    var d=dietList[i];
    if(tags.indexOf(d.toLowerCase())!==-1) continue;
    var re=DIET_EXCLUDE[d];
    if(re){
      var hit=(recipe.ingredients||[]).some(function(ing){ return re.test(ing.name||""); }) || re.test(recipe.title||"");
      if(hit) return true;
    }
  }
  return false;
}
function scoreForUser(recipe, user){
  if(!user) return 0;
  var txt = recipeText(recipe);
  var score = 0;
  (user.favoriteCuisines||[]).forEach(function(c){ if((recipe.cuisine||"").toLowerCase()===c.toLowerCase()) score+=3; });
  (user.likes||[]).forEach(function(l){ if(txt.indexOf(l.toLowerCase())!==-1) score+=1.5; });
  (user.dislikes||[]).forEach(function(d){ if(txt.indexOf(d.toLowerCase())!==-1) score-=3; });
  var rating = (recipe.ratings||{})[user.id];
  if(rating){
    if(typeof rating.stars==="number") score += (rating.stars-3)*1.5;
    if(rating.wouldAgain===true) score += 4;
    if(rating.wouldAgain===false) score -= 8;
  }
  return score;
}
function matchTier(score){
  if(score>=6) return {label:"★ Great match", cls:"badge-good"};
  if(score>=2.5) return {label:"Good match", cls:"badge-gold"};
  if(score<=-4) return {label:"Poor match", cls:"badge-warn"};
  return null;
}
function avgRating(recipe){
  var vals=Object.keys(recipe.ratings||{}).map(function(k){return recipe.ratings[k];}).filter(function(r){return typeof r.stars==="number";});
  if(!vals.length) return null;
  var sum=vals.reduce(function(a,r){return a+r.stars;},0);
  return sum/vals.length;
}
function wouldAgainPct(recipe){
  var vals=Object.keys(recipe.ratings||{}).map(function(k){return recipe.ratings[k];}).filter(function(r){return r.wouldAgain===true||r.wouldAgain===false;});
  if(!vals.length) return null;
  var yes=vals.filter(function(r){return r.wouldAgain===true;}).length;
  return Math.round(100*yes/vals.length);
}

/* ============================== grocery aggregation ============================== */
function normName(name){ return (name||"").trim().toLowerCase().replace(/\s+/g," "); }
function buildGroceryList(){
  var items = {};
  var slots = state.mealPlan.slots || {};
  Object.keys(slots).forEach(function(key){
    var slot = slots[key];
    if(!slot || !slot.r) return;
    var recipe = state.recipes.find(function(r){ return r.id===slot.r; });
    if(!recipe) return;
    var baseServings = recipe.servings || 4;
    var wantServings = slot.s || baseServings;
    var scale = baseServings>0 ? (wantServings/baseServings) : 1;
    (recipe.ingredients||[]).forEach(function(ing){
      var dept = ing.department || guessDepartment(ing.name);
      var unit = (ing.unit||"").trim().toLowerCase();
      var nname = normName(ing.name);
      var scaledQty = (typeof ing.qty==="number") ? Math.round(ing.qty*scale*100)/100 : null;
      var k = nname+"|"+unit;
      if(!items[k]) items[k] = {name: ing.name, unit: ing.unit||"", qty: 0, hasQty:false, department: dept, sources:{}};
      if(scaledQty!==null){ items[k].qty += scaledQty; items[k].hasQty=true; }
      items[k].sources[recipe.title||"Untitled"] = true;
    });
  });
  (state.grocery.extraItems||[]).forEach(function(ex, idx){
    var k = "extra|"+idx+"|"+normName(ex.name);
    items[k] = {name: ex.name, unit:"", qty:null, hasQty:false, department: ex.department||guessDepartment(ex.name), sources:{"Added by you":true}, extraIdx:idx};
  });
  var byDept = {};
  DEPARTMENTS.forEach(function(d){ byDept[d]=[]; });
  Object.keys(items).forEach(function(k){
    var it = items[k];
    it.key = k;
    it.sourceList = Object.keys(it.sources);
    if(!byDept[it.department]) byDept[it.department]=[];
    byDept[it.department].push(it);
  });
  Object.keys(byDept).forEach(function(d){ byDept[d].sort(function(a,b){ return a.name.localeCompare(b.name); }); });
  return byDept;
}

/* ============================== AI: import & snap ============================== */
function parseRecipeFromText(rawText, sourceUrl){
  return api("/api/ai/import","POST", {text: rawText, url: sourceUrl});
}
function fileToBase64(file){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(){ resolve(reader.result.split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
/* Phone camera photos can be huge (10-20MB+) once base64-encoded, well past
   any sane upload limit. Shrink to a max dimension before sending — plenty
   of detail for Claude to recognize a dish, a tiny fraction of the size. */
function downscaleImage(file, maxDim, quality){
  maxDim = maxDim || 1600; quality = quality || 0.82;
  return new Promise(function(resolve, reject){
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function(){
      URL.revokeObjectURL(url);
      var w = img.naturalWidth, h = img.naturalHeight;
      if(!w || !h){ reject(new Error("empty image")); return; }
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var cw = Math.max(1, Math.round(w*scale)), ch = Math.max(1, Math.round(h*scale));
      var canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      canvas.toBlob(function(blob){
        if(blob) resolve(blob); else reject(new Error("canvas export failed"));
      }, "image/jpeg", quality);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error("couldn't read image")); };
    img.src = url;
  });
}
function guessRecipeFromPhoto(file, hint){
  return downscaleImage(file, 1600, 0.82).catch(function(){ return file; }).then(function(sendFile){
    return fileToBase64(sendFile).then(function(b64){
      return api("/api/ai/snap","POST", {imageBase64: b64, mediaType: sendFile.type||"image/jpeg", hint: hint});
    });
  });
}
function normalizeParsedRecipe(parsed){
  return {
    title: String(parsed.title||"Untitled recipe"),
    cuisine: String(parsed.cuisine||""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0,8) : [],
    prepTime: Number(parsed.prepTime)||0,
    cookTime: Number(parsed.cookTime)||0,
    servings: Number(parsed.servings)||4,
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map(function(i){
      return { qty: (typeof i.qty==="number")? i.qty : (i.qty? Number(i.qty)||null : null), unit:String(i.unit||""), name:String(i.name||"").trim(), department: DEPARTMENTS.indexOf(i.department)!==-1? i.department : guessDepartment(i.name||"") };
    }).filter(function(i){return i.name;}) : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    notes: String(parsed.notes||""),
    image:"", sourceUrl:"", sourceType:"", ratings:{}
  };
}

/* ============================== rendering: shell ============================== */
function render(){
  if(!state.booted){ return; }
  renderTopbar();
  renderTabs();
  renderMain();
}

function renderTopbar(){
  var el=document.getElementById("topbar");
  var options = '<option value="">Everyone</option>' + state.users.map(function(u){
    return '<option value="'+u.id+'"'+(state.activeUserId===u.id?" selected":"")+'>'+esc(u.avatar||"🙂")+" "+esc(u.name)+'</option>';
  }).join("");
  el.innerHTML =
    '<div class="brand"><span class="mark">🥘</span><div><h1>Larder <span class="tag">(a cool room or large cupboard used to store food)</span></h1></div></div>'+
    '<div class="profile-picker"><label>Cooking for</label><select id="active-user-select">'+options+'</select></div>';
  document.getElementById("active-user-select").addEventListener("change", function(e){ state.activeUserId=e.target.value||null; render(); });
}

var TABS = [
  {id:"recipes", label:"Recipes", icon:"📖"},
  {id:"import", label:"Import", icon:"📥"},
  {id:"snap", label:"Snap-to-Recipe", icon:"📸"},
  {id:"plan", label:"Meal Plan", icon:"🗓️"},
  {id:"grocery", label:"Grocery List", icon:"🧾"},
  {id:"profiles", label:"Taste Profiles", icon:"👥"}
];
function renderTabs(){
  var el=document.getElementById("tabstrip");
  el.innerHTML = TABS.map(function(t){
    return '<button class="tab-btn'+(state.tab===t.id?" active":"")+'" data-tab="'+t.id+'">'+t.icon+' '+t.label+'</button>';
  }).join("");
  Array.prototype.forEach.call(el.querySelectorAll(".tab-btn"), function(btn){
    btn.addEventListener("click", function(){ state.tab=btn.getAttribute("data-tab"); render(); });
  });
}
function renderMain(){
  var el=document.getElementById("main");
  if(state.tab==="recipes") el.innerHTML = viewRecipes();
  else if(state.tab==="import") el.innerHTML = viewImport();
  else if(state.tab==="snap") el.innerHTML = viewSnap();
  else if(state.tab==="plan") el.innerHTML = viewPlan();
  else if(state.tab==="grocery") el.innerHTML = viewGrocery();
  else if(state.tab==="profiles") el.innerHTML = viewProfiles();
  wireMainEvents();
}

/* ============================== RECIPES TAB ============================== */
function viewRecipes(){
  var activeUser = state.users.find(function(u){return u.id===state.activeUserId;});
  var list = state.recipes.slice();
  var q = state.recipeSearch.trim().toLowerCase();
  if(q) list = list.filter(function(r){ return recipeText(r).indexOf(q)!==-1; });
  if(state.recipeCuisineFilter) list = list.filter(function(r){ return (r.cuisine||"")===state.recipeCuisineFilter; });
  list.forEach(function(r){ r._score = activeUser? scoreForUser(r, activeUser) : 0; });
  if(state.recipeSort==="match" && activeUser) list.sort(function(a,b){ return b._score-a._score; });
  else if(state.recipeSort==="rating") list.sort(function(a,b){ return (avgRating(b)||0)-(avgRating(a)||0); });
  else if(state.recipeSort==="az") list.sort(function(a,b){ return (a.title||"").localeCompare(b.title||""); });
  else list.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });

  var cuisinesUsed = Array.from(new Set(state.recipes.map(function(r){return r.cuisine;}).filter(Boolean))).sort();

  var cardsHtml = list.length ? '<div class="recipe-grid">'+list.map(function(r){ return recipeCardHtml(r, activeUser); }).join("")+'</div>'
    : '<div class="empty-state"><span class="mark">🍲</span><h3>Your larder is empty</h3><p>Import a recipe from something you\'ve saved, snap a photo of a restaurant dish, or add one by hand.</p>'+
      '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" data-action="open-recipe-form">+ Add a recipe</button><button class="btn" data-action="goto-import">Import one</button></div></div>';

  return '<div class="section-head"><div><h2>Recipes</h2><p class="sub">'+state.recipes.length+' saved'+(activeUser? ' · sorted for '+esc(activeUser.name):'')+'</p></div>'+
    '<button class="btn btn-primary" data-action="open-recipe-form">+ New recipe</button></div>'+
    '<div class="field-row form-grid-3" style="margin-bottom:16px;align-items:end;">'+
      '<div class="field" style="margin:0"><label class="field-label">Search</label><input type="search" id="recipe-search" placeholder="title, tag, ingredient…" value="'+esc(state.recipeSearch)+'"></div>'+
      '<div class="field" style="margin:0"><label class="field-label">Cuisine</label><select id="recipe-cuisine-filter"><option value="">All cuisines</option>'+cuisinesUsed.map(function(c){return '<option value="'+esc(c)+'"'+(c===state.recipeCuisineFilter?" selected":"")+'>'+esc(c)+'</option>';}).join("")+'</select></div>'+
      '<div class="field" style="margin:0"><label class="field-label">Sort</label><select id="recipe-sort"><option value="new"'+(state.recipeSort==="new"?" selected":"")+'>Newest</option><option value="match"'+(state.recipeSort==="match"?" selected":"")+'>Best match'+(activeUser?"":" (pick a profile)")+'</option><option value="rating"'+(state.recipeSort==="rating"?" selected":"")+'>Highest rated</option><option value="az"'+(state.recipeSort==="az"?" selected":"")+'>A–Z</option></select></div>'+
    '</div>'+
    cardsHtml;
}
function recipeCardHtml(r, activeUser){
  var avg = avgRating(r);
  var wap = wouldAgainPct(r);
  var tier = activeUser ? matchTier(r._score) : null;
  var thumb = r.image ? 'style="background-image:url(\''+esc(r.image)+'\')"' : "";
  return '<div class="card recipe-card" data-open-recipe="'+r.id+'">'+
    '<div class="thumb" '+thumb+'>'+(r.image? "" : "🍽️")+'</div>'+
    '<div class="body">'+
      (tier? '<span class="badge '+tier.cls+' match-tier">'+tier.label+'</span>':"")+
      '<h3>'+esc(r.title)+'</h3>'+
      '<div class="meta-row">'+ (r.cuisine? '<span>'+esc(r.cuisine)+'</span>':"") + (r.prepTime||r.cookTime? '<span>· '+fmtTime((r.prepTime||0)+(r.cookTime||0))+'</span>':"") + (r.servings? '<span>· serves '+r.servings+'</span>':"") +'</div>'+
      '<div class="meta-row">'+
        (avg!==null? '<span class="stars static sm">'+starsHtml(avg,false)+'</span>' : '<span class="hint" style="margin:0">Not rated yet</span>')+
        (wap!==null? '<span class="badge '+(wap>=50?"badge-good":"badge-warn")+'">'+wap+'% would repeat</span>':"")+
      '</div>'+
      '<div class="tagrow">'+(r.tags||[]).slice(0,4).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join("")+'</div>'+
    '</div></div>';
}
function starsHtml(value, interactive, name){
  var v = Math.round(value||0);
  var out = '<span class="stars'+(interactive?"":" static")+'" data-rating-field="'+(name||"")+'">';
  for(var i=1;i<=5;i++){
    out += '<button type="button" class="'+(i<=v?"filled":"")+'" data-star="'+i+'" '+(interactive?"":"tabindex=\"-1\" disabled")+'>★</button>';
  }
  return out+'</span>';
}

/* ---- recipe detail modal ---- */
function openRecipeDetail(id){
  var r = state.recipes.find(function(x){return x.id===id;});
  if(!r) return;
  var avg = avgRating(r), wap = wouldAgainPct(r);
  openModal(
    '<div class="modal-head"><div><h2>'+esc(r.title)+'</h2><div class="meta-row" style="margin-top:4px">'+(r.cuisine?esc(r.cuisine)+" · ":"")+(r.prepTime?"prep "+fmtTime(r.prepTime)+" · ":"")+(r.cookTime?"cook "+fmtTime(r.cookTime)+" · ":"")+"serves "+(r.servings||4)+'</div></div>'+
      '<div style="display:flex;gap:4px"><button class="btn btn-sm btn-primary" data-action="cook-mode" data-id="'+r.id+'" title="Cook mode">👨‍🍳 Cook</button><button class="icon-btn" data-action="edit-recipe" data-id="'+r.id+'" title="Edit">✎</button><button class="icon-btn" data-action="delete-recipe" data-id="'+r.id+'" title="Delete">🗑</button><button class="icon-btn" onclick="closeModal()">✕</button></div>'+
    '</div>'+
    '<div class="modal-body">'+
      (r.sourceUrl? '<p class="hint">Source: <a href="'+esc(r.sourceUrl)+'" target="_blank" rel="noopener">'+esc(r.sourceUrl)+'</a></p>':"")+
      (r.notes? '<p style="background:var(--surface-2);padding:8px 10px;border-radius:8px;font-size:12.5px;color:var(--ink-soft)">'+esc(r.notes)+'</p>':"")+
      '<div class="meta-row" style="margin-bottom:12px">'+(avg!==null?'<span class="stars static sm">'+starsHtml(avg,false)+'</span> <span class="hint" style="margin:0">household average</span>':'')+(wap!==null?'<span class="badge '+(wap>=50?"badge-good":"badge-warn")+'">'+wap+'% would make again</span>':'')+'</div>'+
      '<div class="tagrow" style="margin-bottom:14px">'+(r.tags||[]).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join("")+'</div>'+
      '<h4 style="font-size:14px;margin-bottom:6px">Ingredients</h4>'+
      '<ul style="margin:0 0 16px 18px;padding:0;font-size:13.5px;">'+(r.ingredients||[]).map(function(i){
        return '<li>'+esc([i.qty!==null&&i.qty!==undefined?i.qty:"", i.unit, i.name].filter(Boolean).join(" "))+' <span class="dept-pill">'+esc(i.department||"")+'</span></li>';
      }).join("")+'</ul>'+
      '<h4 style="font-size:14px;margin-bottom:6px">Steps</h4>'+
      '<ol style="margin:0 0 18px 18px;padding:0;font-size:13.5px;">'+(r.steps||[]).map(function(s){return '<li style="margin-bottom:5px">'+esc(s)+'</li>';}).join("")+'</ol>'+
      '<h4 style="font-size:14px;margin-bottom:6px">Ratings</h4>'+
      '<div id="ratings-list">'+ratingsListHtml(r)+'</div>'+
    '</div>'
  , {wide:true});
  wireRecipeDetailEvents(r);
}
function ratingsListHtml(r){
  if(!state.users.length) return '<p class="hint">Add a taste profile to start rating recipes.</p>';
  return state.users.map(function(u){
    var rating = (r.ratings||{})[u.id] || {};
    return '<div class="rating-row"><div style="display:flex;align-items:center;gap:8px"><span>'+esc(u.avatar||"🙂")+'</span><b style="font-size:13px">'+esc(u.name)+'</b></div>'+
      '<div style="display:flex;align-items:center;gap:10px">'+
        starsHtml(rating.stars||0, true, "stars-"+u.id).replace('<span class="stars"','<span class="stars" data-user="'+u.id+'"')+
        '<div class="segmented" data-wa-user="'+u.id+'">'+
          '<button data-wa="1" class="'+(rating.wouldAgain===true?"active":"")+'">Again</button>'+
          '<button data-wa="0" class="'+(rating.wouldAgain===false?"active":"")+'">Not again</button>'+
        '</div>'+
      '</div></div>';
  }).join("");
}
function wireRecipeDetailEvents(r){
  var body = document.querySelector(".modal-body");
  if(!body) return;
  body.addEventListener("click", function(e){
    var starBtn = e.target.closest("[data-star]");
    if(starBtn){
      var starsWrap = starBtn.closest(".stars");
      var uidAttr = starsWrap.getAttribute("data-user");
      if(uidAttr){
        var val = Number(starBtn.getAttribute("data-star"));
        var ratings = Object.assign({}, r.ratings||{});
        ratings[uidAttr] = Object.assign({}, ratings[uidAttr]||{}, {stars: val, ratedAt: Date.now()});
        Data.updateRecipe(r.id, {ratings:ratings});
        r.ratings = ratings;
        document.getElementById("ratings-list").innerHTML = ratingsListHtml(r);
      }
      return;
    }
    var waBtn = e.target.closest("[data-wa]");
    if(waBtn){
      var seg = waBtn.closest("[data-wa-user]");
      var uAttr = seg.getAttribute("data-wa-user");
      var newVal = waBtn.getAttribute("data-wa")==="1";
      var ratings2 = Object.assign({}, r.ratings||{});
      var existing = ratings2[uAttr]||{};
      var already = existing.wouldAgain===newVal;
      ratings2[uAttr] = Object.assign({}, existing, {wouldAgain: already? null : newVal, ratedAt: Date.now()});
      Data.updateRecipe(r.id, {ratings:ratings2});
      r.ratings = ratings2;
      document.getElementById("ratings-list").innerHTML = ratingsListHtml(r);
      return;
    }
  });
  document.querySelector(".modal-head").addEventListener("click", function(e){
    var cookBtn = e.target.closest('[data-action="cook-mode"]');
    if(cookBtn){ openCookMode(r.id); return; }
    var editBtn = e.target.closest('[data-action="edit-recipe"]');
    if(editBtn){ closeModal(); openRecipeForm(r.id); return; }
    var delBtn = e.target.closest('[data-action="delete-recipe"]');
    if(delBtn){ confirmModal("Delete "+r.title+"?", "This removes the recipe and its ratings for everyone.", function(){ Data.deleteRecipe(r.id); toast("Recipe deleted"); }); return; }
  });
}

/* ============================== COOK MODE ============================== */
var cookState = {recipeId:null, stepIndex:0};
var cookModeActive = false;
var cookWakeLock = null;
var cookTimer = {interval:null, running:false, paused:false, remaining:0, total:0, endsAt:0};
var cookTimerPanelOpen = false;

function openCookMode(id){
  var r = state.recipes.find(function(x){return x.id===id;});
  if(!r) return;
  if(!(r.steps && r.steps.length)){ toast("This recipe doesn't have any steps yet","warn"); return; }
  closeModal();
  cookState = {recipeId:id, stepIndex:0};
  cookModeActive = true;
  cookTimerPanelOpen = false;
  resetCookTimer();
  document.getElementById("cook-root").classList.remove("hidden");
  renderCookMode();
  requestCookWakeLock();
  document.addEventListener("keydown", cookKeyHandler);
}
function closeCookMode(){
  cookModeActive = false;
  document.getElementById("cook-root").classList.add("hidden");
  document.getElementById("cook-root").innerHTML = "";
  releaseCookWakeLock();
  resetCookTimer();
  document.removeEventListener("keydown", cookKeyHandler);
}
window.closeCookMode = closeCookMode;
function cookKeyHandler(e){
  if(!cookModeActive) return;
  if(e.key==="Escape"){ closeCookMode(); return; }
  if(e.key==="ArrowRight"){ var n=document.getElementById("cook-next-btn"); if(n) n.click(); }
  if(e.key==="ArrowLeft"){ var p=document.getElementById("cook-prev-btn"); if(p) p.click(); }
}
function cookStepHtml(steps, activeIndex){
  return steps.map(function(s,i){
    return '<div class="cook-step'+(i===activeIndex?" active":"")+'" data-step-index="'+i+'">'+
      '<span class="cook-step-num">'+(i+1)+'</span><span class="cook-step-text">'+esc(s)+'</span>'+
    '</div>';
  }).join("");
}
function renderCookMode(){
  var r = state.recipes.find(function(x){return x.id===cookState.recipeId;});
  if(!r) return;
  var steps = r.steps||[];
  var root = document.getElementById("cook-root");
  root.innerHTML =
    '<div class="cook-head">'+
      '<div><h2>'+esc(r.title)+'</h2><div class="cook-progress mono">Step '+(cookState.stepIndex+1)+' of '+steps.length+'</div></div>'+
      '<div style="display:flex;gap:6px;align-items:center">'+
        '<button class="btn btn-sm" id="cook-timer-toggle">⏱ Timer</button>'+
        '<button class="icon-btn" id="cook-close-btn" title="Exit cook mode">✕</button>'+
      '</div>'+
    '</div>'+
    '<div class="cook-timer-panel'+(cookTimerPanelOpen?"":" hidden")+'" id="cook-timer-panel">'+cookTimerPanelHtml()+'</div>'+
    '<div class="cook-body" id="cook-steps">'+cookStepHtml(steps, cookState.stepIndex)+'</div>'+
    '<div class="cook-nav">'+
      '<button class="btn" id="cook-prev-btn"'+(cookState.stepIndex===0?" disabled":"")+'>‹ Previous</button>'+
      '<button class="btn btn-primary" id="cook-next-btn">'+(cookState.stepIndex===steps.length-1?"Done ✓":"Next ›")+'</button>'+
    '</div>';
  wireCookMode(steps);
  var activeEl = root.querySelector(".cook-step.active");
  if(activeEl && activeEl.scrollIntoView) activeEl.scrollIntoView({block:"center", behavior:"smooth"});
}
function wireCookMode(steps){
  document.getElementById("cook-close-btn").addEventListener("click", closeCookMode);
  document.getElementById("cook-prev-btn").addEventListener("click", function(){
    if(cookState.stepIndex>0){ cookState.stepIndex--; renderCookMode(); }
  });
  document.getElementById("cook-next-btn").addEventListener("click", function(){
    if(cookState.stepIndex<steps.length-1){ cookState.stepIndex++; renderCookMode(); }
    else { closeCookMode(); toast("Nice work — enjoy!"); }
  });
  document.getElementById("cook-steps").addEventListener("click", function(e){
    var stepEl = e.target.closest(".cook-step");
    if(stepEl){ cookState.stepIndex = Number(stepEl.getAttribute("data-step-index")); renderCookMode(); }
  });
  document.getElementById("cook-timer-toggle").addEventListener("click", function(){
    cookTimerPanelOpen = !cookTimerPanelOpen;
    document.getElementById("cook-timer-panel").classList.toggle("hidden", !cookTimerPanelOpen);
  });
  wireCookTimerPanel();
}

/* ---- cook mode: screen wake lock ---- */
function requestCookWakeLock(){
  if(!("wakeLock" in navigator)) return;
  navigator.wakeLock.request("screen").then(function(lock){ cookWakeLock = lock; }).catch(function(){ cookWakeLock = null; });
}
function releaseCookWakeLock(){
  if(cookWakeLock){ cookWakeLock.release().catch(function(){}); cookWakeLock = null; }
}
document.addEventListener("visibilitychange", function(){
  if(cookModeActive && document.visibilityState==="visible") requestCookWakeLock();
});

/* ---- cook mode: timer ---- */
function fmtMMSS(sec){
  sec = Math.max(0, Math.round(sec));
  var m = Math.floor(sec/60), s = sec%60;
  return (m<10?"0":"")+m+":"+(s<10?"0":"")+s;
}
function cookTimerPanelHtml(){
  if(cookTimer.running || cookTimer.paused){
    return '<div class="timer-display mono" id="cook-timer-display">'+fmtMMSS(cookTimer.remaining)+'</div>'+
      '<div class="timer-controls">'+
        '<button type="button" class="btn btn-sm" id="cook-timer-pause">'+(cookTimer.paused?"Resume":"Pause")+'</button>'+
        '<button type="button" class="btn btn-sm" id="cook-timer-reset">Reset</button>'+
      '</div>';
  }
  return '<div class="timer-presets">'+
      [1,3,5,10,15,20].map(function(m){return '<button type="button" class="btn btn-sm" data-min="'+m+'">'+m+' min</button>';}).join("")+
    '</div>'+
    '<div class="timer-custom"><input type="number" min="1" id="cook-timer-custom" placeholder="custom min"><button type="button" class="btn btn-sm btn-primary" id="cook-timer-custom-start">Start</button></div>';
}
function wireCookTimerPanel(){
  var panel = document.getElementById("cook-timer-panel");
  panel.addEventListener("click", function(e){
    var presetBtn = e.target.closest("[data-min]");
    if(presetBtn){ startCookTimer(Number(presetBtn.getAttribute("data-min"))); return; }
    if(e.target.id==="cook-timer-custom-start"){
      var v = Number(document.getElementById("cook-timer-custom").value);
      if(v>0) startCookTimer(v);
      return;
    }
    if(e.target.id==="cook-timer-pause"){ toggleCookTimerPause(); return; }
    if(e.target.id==="cook-timer-reset"){ resetCookTimer(); refreshCookTimerPanel(); return; }
  });
}
function refreshCookTimerPanel(){
  var panel = document.getElementById("cook-timer-panel");
  if(!panel) return;
  panel.innerHTML = cookTimerPanelHtml();
}
function startCookTimer(minutes){
  clearInterval(cookTimer.interval);
  cookTimer.total = minutes*60;
  cookTimer.remaining = cookTimer.total;
  cookTimer.running = true;
  cookTimer.paused = false;
  cookTimer.endsAt = Date.now() + cookTimer.total*1000;
  cookTimer.interval = setInterval(tickCookTimer, 500);
  cookTimerPanelOpen = true;
  var panelEl = document.getElementById("cook-timer-panel");
  if(panelEl) panelEl.classList.remove("hidden");
  refreshCookTimerPanel();
}
function tickCookTimer(){
  if(!cookTimer.running || cookTimer.paused) return;
  var remaining = Math.round((cookTimer.endsAt - Date.now())/1000);
  cookTimer.remaining = remaining;
  var disp = document.getElementById("cook-timer-display");
  if(disp) disp.textContent = fmtMMSS(Math.max(0,remaining));
  if(remaining<=0){
    clearInterval(cookTimer.interval);
    cookTimer.running = false;
    cookTimerFinished();
  }
}
function toggleCookTimerPause(){
  if(!cookTimer.running) return;
  if(cookTimer.paused){ cookTimer.paused = false; cookTimer.endsAt = Date.now() + cookTimer.remaining*1000; }
  else { cookTimer.paused = true; }
  refreshCookTimerPanel();
}
function resetCookTimer(){
  clearInterval(cookTimer.interval);
  cookTimer = {interval:null, running:false, paused:false, remaining:0, total:0, endsAt:0};
  refreshCookTimerPanel();
}
function cookTimerFinished(){
  playCookTimerSound();
  toast("⏱ Timer done!");
  if(navigator.vibrate){ try{ navigator.vibrate([200,100,200]); }catch(e){} }
  var disp = document.getElementById("cook-timer-display");
  if(disp){ disp.textContent = "Done!"; disp.classList.add("timer-done"); }
}
function playCookTimerSound(){
  try{
    var ctx = new (window.AudioContext||window.webkitAudioContext)();
    var now = ctx.currentTime;
    [0,0.3,0.6].forEach(function(t){
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now+t);
      g.gain.exponentialRampToValueAtTime(0.3, now+t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now+t+0.25);
      o.start(now+t); o.stop(now+t+0.3);
    });
  }catch(e){}
}

/* ---- recipe add/edit form ---- */
function openRecipeForm(id, prefill){
  var editing = id ? state.recipes.find(function(x){return x.id===id;}) : null;
  var r = editing || prefill || {title:"",cuisine:"",tags:[],prepTime:"",cookTime:"",servings:4,ingredients:[{qty:"",unit:"",name:"",department:""}],steps:[""],notes:"",image:"",sourceUrl:""};
  openModal(
    '<div class="modal-head"><h2>'+(editing?"Edit recipe":"New recipe")+'</h2><button class="icon-btn" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body" id="recipe-form-body">'+recipeFormFieldsHtml(r)+'</div>'+
    '<div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-recipe-btn">Save recipe</button></div>'
  , {wide:true, onMount: function(){ wireRecipeForm(r, editing? editing.id : null); }});
}
function recipeFormFieldsHtml(r){
  return '<div class="field-row form-grid-2">'+
      '<div class="field"><label class="field-label">Title</label><input type="text" id="f-title" value="'+esc(r.title)+'" placeholder="Grandma\'s Sunday sauce"></div>'+
      '<div class="field"><label class="field-label">Cuisine</label><input type="text" id="f-cuisine" value="'+esc(r.cuisine)+'" list="cuisine-list" placeholder="Italian"></div>'+
    '</div>'+
    '<datalist id="cuisine-list">'+CUISINE_OPTIONS.map(function(c){return '<option value="'+c+'">';}).join("")+'</datalist>'+
    '<div class="field-row form-grid-3">'+
      '<div class="field"><label class="field-label">Prep (min)</label><input type="number" min="0" id="f-prep" value="'+esc(r.prepTime)+'"></div>'+
      '<div class="field"><label class="field-label">Cook (min)</label><input type="number" min="0" id="f-cook" value="'+esc(r.cookTime)+'"></div>'+
      '<div class="field"><label class="field-label">Servings</label><input type="number" min="1" id="f-servings" value="'+esc(r.servings)+'"></div>'+
    '</div>'+
    '<div class="field"><label class="field-label">Tags</label><div class="chipfield" id="f-tags">'+(r.tags||[]).map(function(t){return chipHtml(t);}).join("")+'<input type="text" placeholder="add a tag, press Enter"></div></div>'+
    '<div class="field"><label class="field-label">Recipe photo (optional)</label>'+
      '<div class="dropzone" id="f-image-dropzone" style="padding:14px">'+imageDropzoneInnerHtml(r.image)+'</div>'+
      '<input type="file" id="f-image-file" accept="image/*" class="hidden">'+
      '<div style="display:flex;gap:8px;align-items:center;margin-top:6px">'+
        '<input type="url" id="f-image-url" placeholder="…or paste an image link" value="'+(r.image && !isDataUrl(r.image) ? esc(r.image) : "")+'" style="flex:1">'+
        '<button type="button" class="btn btn-sm btn-ghost'+(r.image?"":" hidden")+'" id="f-image-remove">Remove</button>'+
      '</div>'+
      '<p class="hint">Upload a photo from your device, or paste a link to an image already online.</p>'+
      '<button type="button" class="btn btn-primary btn-sm" id="save-recipe-btn-top" style="margin-top:8px">💾 Save recipe</button>'+
    '</div>'+
    '<div class="field"><label class="field-label">Source link (optional)</label><input type="url" id="f-source" value="'+esc(r.sourceUrl)+'" placeholder="https://…"></div>'+
    '<div class="field"><label class="field-label">Ingredients</label><div id="f-ingredients">'+(r.ingredients&&r.ingredients.length?r.ingredients:[{qty:"",unit:"",name:"",department:""}]).map(ingredientRowHtml).join("")+'</div>'+
      '<button type="button" class="btn btn-sm" data-action="add-ingredient-row">+ Add ingredient</button></div>'+
    '<div class="field"><label class="field-label">Steps</label><div id="f-steps">'+(r.steps&&r.steps.length?r.steps:[""]).map(stepRowHtml).join("")+'</div>'+
      '<button type="button" class="btn btn-sm" data-action="add-step-row">+ Add step</button></div>'+
    '<div class="field"><label class="field-label">Notes</label><textarea id="f-notes" placeholder="Substitutions, tips, who liked it…">'+esc(r.notes)+'</textarea></div>';
}
function chipHtml(val){ return '<span class="chip" data-value="'+esc(val)+'">'+esc(val)+'<button type="button" onclick="this.parentElement.remove()">✕</button></span>'; }
function isDataUrl(s){ return typeof s==="string" && s.indexOf("data:")===0; }
function imageDropzoneInnerHtml(image){
  return image ? '<img class="photo-preview" style="max-height:160px;margin:0" src="'+(isDataUrl(image)?image:esc(image))+'">' : '<div>📷 Click to add a photo</div>';
}
function blobToDataUrl(blob){
  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(){ resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function ingredientRowHtml(i){
  i = i||{};
  return '<div class="ingredient-row">'+
    '<input class="qty" type="text" placeholder="qty" value="'+esc(i.qty!==undefined&&i.qty!==null?i.qty:"")+'">'+
    '<input class="unit" type="text" placeholder="unit" value="'+esc(i.unit||"")+'">'+
    '<input class="name" type="text" placeholder="ingredient name" value="'+esc(i.name||"")+'">'+
    '<select class="dept">'+ '<option value="">auto</option>' + DEPARTMENTS.map(function(d){return '<option value="'+d+'"'+(i.department===d?" selected":"")+'>'+d+'</option>';}).join("")+'</select>'+
    '<button type="button" class="icon-btn" onclick="this.closest(\'.ingredient-row\').remove()">✕</button>'+
  '</div>';
}
function stepRowHtml(s){
  return '<div class="step-row"><span class="step-num"></span><textarea placeholder="Describe this step…">'+esc(s||"")+'</textarea><button type="button" class="icon-btn" onclick="this.closest(\'.step-row\').remove()">✕</button></div>';
}
var formImageValue = "";
function wireRecipeForm(original, editId){
  var body = document.getElementById("recipe-form-body");
  wireChipField(document.getElementById("f-tags"));
  body.addEventListener("click", function(e){
    if(e.target.closest('[data-action="add-ingredient-row"]')){ document.getElementById("f-ingredients").insertAdjacentHTML("beforeend", ingredientRowHtml({})); }
    if(e.target.closest('[data-action="add-step-row"]')){ document.getElementById("f-steps").insertAdjacentHTML("beforeend", stepRowHtml("")); }
  });

  formImageValue = original && original.image ? original.image : "";
  var dz = document.getElementById("f-image-dropzone");
  var fileInput = document.getElementById("f-image-file");
  var urlInput = document.getElementById("f-image-url");
  var removeBtn = document.getElementById("f-image-remove");
  function setImage(value){
    formImageValue = value || "";
    dz.innerHTML = imageDropzoneInnerHtml(formImageValue);
    removeBtn.classList.toggle("hidden", !formImageValue);
  }
  dz.addEventListener("click", function(){ fileInput.click(); });
  fileInput.addEventListener("change", function(){
    var file = fileInput.files && fileInput.files[0];
    if(!file) return;
    dz.innerHTML = '<span class="spinner dark"></span> Processing photo…';
    downscaleImage(file, 1000, 0.78).catch(function(){ return file; }).then(blobToDataUrl).then(function(dataUrl){
      urlInput.value = "";
      setImage(dataUrl);
    }).catch(function(){ toast("Couldn't process that photo — try a different one","warn"); setImage(formImageValue); });
  });
  urlInput.addEventListener("input", function(){ formImageValue = urlInput.value.trim(); removeBtn.classList.toggle("hidden", !formImageValue); });
  removeBtn.addEventListener("click", function(){ urlInput.value=""; setImage(""); });

  function doSaveRecipe(){
    var data = readRecipeForm();
    if(!data.title){ toast("Give the recipe a title first","warn"); return; }
    if(editId){ Data.updateRecipe(editId, data); toast("Recipe updated"); }
    else { Data.addRecipe(Object.assign({ratings:{}}, data)); toast("Recipe saved"); }
    closeModal();
  }
  document.getElementById("save-recipe-btn").addEventListener("click", doSaveRecipe);
  var topSaveBtn = document.getElementById("save-recipe-btn-top");
  if(topSaveBtn) topSaveBtn.addEventListener("click", doSaveRecipe);
}
function wireChipField(container){
  var input = container.querySelector("input");
  input.addEventListener("keydown", function(e){
    if(e.key==="Enter"){ e.preventDefault(); var v=input.value.trim(); if(v){ input.insertAdjacentHTML("beforebegin", chipHtml(v)); input.value=""; } }
  });
}
function readChips(container){ return Array.prototype.map.call(container.querySelectorAll(".chip"), function(c){return c.getAttribute("data-value");}); }
function readRecipeForm(){
  var ingredients = Array.prototype.map.call(document.querySelectorAll("#f-ingredients .ingredient-row"), function(row){
    var qtyRaw = row.querySelector(".qty").value.trim();
    var name = row.querySelector(".name").value.trim();
    var dept = row.querySelector(".dept").value;
    return { qty: qtyRaw? (isNaN(Number(qtyRaw))? qtyRaw : Number(qtyRaw)) : null, unit: row.querySelector(".unit").value.trim(), name: name, department: dept || guessDepartment(name) };
  }).filter(function(i){ return i.name; });
  var steps = Array.prototype.map.call(document.querySelectorAll("#f-steps .step-row textarea"), function(t){return t.value.trim();}).filter(Boolean);
  return {
    title: document.getElementById("f-title").value.trim(),
    cuisine: document.getElementById("f-cuisine").value.trim(),
    tags: readChips(document.getElementById("f-tags")),
    prepTime: Number(document.getElementById("f-prep").value)||0,
    cookTime: Number(document.getElementById("f-cook").value)||0,
    servings: Number(document.getElementById("f-servings").value)||4,
    image: formImageValue,
    sourceUrl: document.getElementById("f-source").value.trim(),
    ingredients: ingredients,
    steps: steps,
    notes: document.getElementById("f-notes").value.trim()
  };
}

/* ============================== IMPORT TAB ============================== */
function viewImport(){
  var aiOk = state.aiEnabled;
  return '<div class="section-head"><div><h2>Import a recipe</h2><p class="sub">Paste text from a blog, a website, or a social caption — Claude will turn it into a standard recipe.</p></div></div>'+
    (!aiOk? '<div class="banner info">AI import isn\'t configured on this server yet. Ask whoever runs it to add an ANTHROPIC_API_KEY — until then you can still add recipes by hand from the Recipes tab.</div>' : '')+
    '<div class="banner info">This app can\'t fetch web pages or social posts directly — copy the caption or article text and paste it below (the source link is just kept for reference).</div>'+
    '<div class="import-layout">'+
      '<div>'+
        '<div class="field"><label class="field-label">Source link (optional)</label><input type="url" id="import-url" placeholder="https://instagram.com/p/…"></div>'+
        '<div class="field"><label class="field-label">Pasted recipe text or caption</label><textarea id="import-text" style="min-height:220px" placeholder="Paste the ingredients, steps, or caption here…"></textarea></div>'+
        '<button class="btn btn-primary" id="parse-btn" '+(aiOk?"":"disabled")+'><span id="parse-btn-label">✨ Parse with Claude</span></button>'+
      '</div>'+
      '<div id="import-preview"><div class="empty-state"><span class="mark">📥</span><h3>Nothing parsed yet</h3><p>Your structured recipe preview will appear here.</p></div></div>'+
    '</div>';
}
function wireImportTab(){
  var btn = document.getElementById("parse-btn");
  if(!btn) return;
  btn.addEventListener("click", function(){ runImportParse(); });
}
var lastParsed = null;
function runImportParse(){
  var text = document.getElementById("import-text").value.trim();
  var url = document.getElementById("import-url").value.trim();
  if(!text){ toast("Paste some recipe text first","warn"); return; }
  var btn=document.getElementById("parse-btn");
  btn.disabled=true; document.getElementById("parse-btn-label").innerHTML='<span class="spinner"></span> Reading…';
  parseRecipeFromText(text, url).then(function(parsed){
    var norm = normalizeParsedRecipe(parsed);
    norm.sourceUrl = url; norm.sourceType="imported";
    lastParsed = norm;
    document.getElementById("import-preview").innerHTML = parsePreviewHtml(norm, "import");
  }).catch(function(e){
    toast(apiErrorMessage(e),"warn");
  }).finally(function(){
    btn.disabled=false; document.getElementById("parse-btn-label").textContent="✨ Parse with Claude";
  });
}
function parsePreviewHtml(norm, mode){
  return '<div class="parse-preview">'+
    '<h4>'+esc(norm.title)+'</h4>'+
    '<div class="meta-row" style="margin-bottom:8px">'+(norm.cuisine?esc(norm.cuisine)+" · ":"")+(norm.prepTime?"prep "+fmtTime(norm.prepTime)+" · ":"")+(norm.cookTime?"cook "+fmtTime(norm.cookTime)+" · ":"")+"serves "+norm.servings+'</div>'+
    '<div class="tagrow" style="margin-bottom:8px">'+norm.tags.map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join("")+'</div>'+
    (norm.notes? '<p class="hint">'+esc(norm.notes)+'</p>':"")+
    '<ul>'+norm.ingredients.map(function(i){return '<li>'+esc([i.qty!==null?i.qty:"",i.unit,i.name].filter(Boolean).join(" "))+'</li>';}).join("")+'</ul>'+
    '<ol>'+norm.steps.map(function(s){return '<li>'+esc(s)+'</li>';}).join("")+'</ol>'+
    '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary" data-action="save-parsed" data-mode="'+mode+'">Save to Larder</button><button class="btn" data-action="reparse" data-mode="'+mode+'">Try again</button></div>'+
  '</div>';
}
function apiErrorMessage(e){
  if(e && e.code==="http_413") return "That photo was too large to send. Try a different photo, or a screenshot of it.";
  if(e && e.message) return e.message;
  return "Something went wrong talking to the server.";
}

/* ============================== SNAP TAB ============================== */
var snapFile = null, lastSnap = null;
function viewSnap(){
  var aiOk = state.aiEnabled;
  return '<div class="section-head"><div><h2>Snap-to-Recipe</h2><p class="sub">Photograph a dish at a restaurant and get a homemade recipe to try recreating it.</p></div></div>'+
    (!aiOk? '<div class="banner info">AI photo analysis isn\'t configured on this server yet. Ask whoever runs it to add an ANTHROPIC_API_KEY.</div>' : '')+
    '<div class="import-layout">'+
      '<div>'+
        '<div class="field"><label class="field-label">Photo of the dish</label>'+
          '<div class="dropzone" id="snap-dropzone">'+(snapFile? '<img class="photo-preview" id="snap-preview" src="'+snapPreviewUrl()+'">' : '<div>📸 Click to choose a photo</div>')+
          '<input type="file" id="snap-file-input" accept="image/*" class="hidden"></div>'+
        '</div>'+
        '<div class="field"><label class="field-label">Restaurant / dish name (optional, helps accuracy)</label><input type="text" id="snap-hint" placeholder="e.g. spicy tuna crispy rice at Nobu"></div>'+
        '<button class="btn btn-primary" id="snap-btn" '+(aiOk?"":"disabled")+'><span id="snap-btn-label">✨ Guess the recipe</span></button>'+
      '</div>'+
      '<div id="snap-preview-panel"><div class="empty-state"><span class="mark">🍽️</span><h3>No guess yet</h3><p>Upload a photo to reverse-engineer the recipe.</p></div></div>'+
    '</div>';
}
function snapPreviewUrl(){ return snapFile ? URL.createObjectURL(snapFile) : ""; }
function wireSnapTab(){
  var dz = document.getElementById("snap-dropzone");
  if(!dz) return;
  var input = document.getElementById("snap-file-input");
  dz.addEventListener("click", function(){ input.click(); });
  input.addEventListener("change", function(){
    if(input.files && input.files[0]){ snapFile = input.files[0]; renderMain(); }
  });
  var btn = document.getElementById("snap-btn");
  if(btn) btn.addEventListener("click", function(){ runSnapGuess(); });
}
function runSnapGuess(){
  if(!snapFile){ toast("Choose a photo first","warn"); return; }
  var hint = document.getElementById("snap-hint").value.trim();
  var btn=document.getElementById("snap-btn");
  btn.disabled=true; document.getElementById("snap-btn-label").innerHTML='<span class="spinner"></span> Looking closely…';
  guessRecipeFromPhoto(snapFile, hint).then(function(parsed){
    var norm = normalizeParsedRecipe(parsed);
    norm.sourceType="restaurant-photo";
    norm.sourceUrl="";
    lastSnap = norm;
    document.getElementById("snap-preview-panel").innerHTML = parsePreviewHtml(norm, "snap");
  }).catch(function(e){
    toast(apiErrorMessage(e),"warn");
  }).finally(function(){
    btn.disabled=false; document.getElementById("snap-btn-label").textContent="✨ Guess the recipe";
  });
}

/* ============================== MEAL PLAN TAB ============================== */
function viewPlan(){
  var monday = new Date(state.weekStart+"T00:00:00");
  var activeUser = state.users.find(function(u){return u.id===state.activeUserId;});
  var rows = MEALS.map(function(meal){
    var cells = DAYS.map(function(day){
      var key = day+"-"+meal;
      var slot = (state.mealPlan.slots||{})[key];
      var recipe = slot && slot.r ? state.recipes.find(function(r){return r.id===slot.r;}) : null;
      var inner = recipe ?
        '<div class="slot-chip" data-open-recipe="'+recipe.id+'">'+esc(recipe.title)+'<span class="x" data-action="clear-slot" data-key="'+key+'">✕</span><div class="slot-servings">serves '+(slot.s||recipe.servings||4)+'</div></div>'
        : '<div class="slot-empty" data-action="pick-slot" data-key="'+key+'">+ add</div>';
      return '<div class="slot-cell">'+inner+'</div>';
    }).join("");
    return '<div class="meal-label">'+meal+'</div>'+cells;
  }).join("");
  var headCells = DAYS.map(function(d,i){ var dt=addDays(monday,i); return '<div class="head-cell">'+d+' <span class="mono" style="color:var(--ink-faint)">'+dt.getDate()+'</span></div>'; }).join("");
  return '<div class="section-head"><div><h2>Meal Plan</h2><p class="sub">Tap a slot to add a recipe'+(activeUser? " · recommendations favor "+esc(activeUser.name):"")+'.</p></div>'+
    '<div style="display:flex;gap:8px"><button class="btn btn-sm" id="autofill-btn">✨ Auto-fill week</button><button class="btn btn-sm btn-danger" id="clearweek-btn">Clear week</button></div></div>'+
    '<div class="week-nav"><button class="icon-btn" id="prev-week">←</button><span class="range">'+formatWeekRange(monday)+'</span><button class="icon-btn" id="next-week">→</button><button class="btn btn-sm btn-ghost" id="this-week-btn">This week</button></div>'+
    '<div class="meal-grid"><div></div>'+headCells+rows+'</div>';
}
function wirePlanTab(){
  var prev=document.getElementById("prev-week"), next=document.getElementById("next-week"), tw=document.getElementById("this-week-btn");
  if(!prev) return;
  prev.addEventListener("click", function(){ Data.switchWeek(isoDate(addDays(new Date(state.weekStart+"T00:00:00"),-7))); });
  next.addEventListener("click", function(){ Data.switchWeek(isoDate(addDays(new Date(state.weekStart+"T00:00:00"),7))); });
  tw.addEventListener("click", function(){ Data.switchWeek(isoDate(getMonday(new Date()))); });
  document.getElementById("autofill-btn").addEventListener("click", autoFillWeek);
  document.getElementById("clearweek-btn").addEventListener("click", function(){
    confirmModal("Clear this week?", "This empties every meal slot for the week.", function(){
      var chain = Promise.resolve();
      DAYS.forEach(function(day){ MEALS.forEach(function(meal){ chain = chain.then(function(){ return Data.setMealSlot(state.weekStart, day+"-"+meal, null); }); }); });
      chain.then(function(){ toast("Week cleared"); });
    }, "Clear");
  });
}
function openSlotPicker(key){
  var activeUser = state.users.find(function(u){return u.id===state.activeUserId;});
  var list = state.recipes.slice();
  list.forEach(function(r){ r._score = activeUser? scoreForUser(r, activeUser) : 0; });
  list.sort(function(a,b){ return b._score-a._score; });
  openModal(
    '<div class="modal-head"><h3>Add to '+key.replace("-"," · ")+'</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><input type="search" id="slot-search" placeholder="search recipes…" style="margin-bottom:10px">'+
    '<div id="slot-list" style="max-height:340px;overflow:auto;display:flex;flex-direction:column;gap:6px">'+slotPickerListHtml(list,"")+'</div></div>'
  , {onMount:function(){
      document.getElementById("slot-search").addEventListener("input", debounce(function(e){
        var q=e.target.value.toLowerCase();
        document.getElementById("slot-list").innerHTML = slotPickerListHtml(list, q);
      },120));
      document.querySelector(".modal-body").addEventListener("click", function(e){
        var item=e.target.closest("[data-pick-recipe]");
        if(item){ var rid=item.getAttribute("data-pick-recipe"); var recipe=state.recipes.find(function(r){return r.id===rid;}); Data.setMealSlot(state.weekStart, key, {r:rid, s:(recipe&&recipe.servings)||4}); closeModal(); }
      });
    }});
}
function slotPickerListHtml(list,q){
  var filtered = q? list.filter(function(r){return recipeText(r).indexOf(q)!==-1;}) : list;
  if(!filtered.length) return '<p class="hint">No recipes match.</p>';
  return filtered.map(function(r){
    var tier = matchTier(r._score);
    return '<div class="card" style="padding:9px 11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px" data-pick-recipe="'+r.id+'">'+
      '<span>'+esc(r.title)+'</span>'+(tier?'<span class="badge '+tier.cls+'">'+tier.label+'</span>':'')+'</div>';
  }).join("");
}
function autoFillWeek(){
  var activeUser = state.users.find(function(u){return u.id===state.activeUserId;});
  var pool = state.recipes.filter(function(r){ return !activeUser || !violatesDiet(r, activeUser.dietary); });
  if(!pool.length){ toast("Add some recipes first","warn"); return; }
  pool.forEach(function(r){ r._score = activeUser? scoreForUser(r, activeUser) : (avgRating(r)||0); });
  pool.sort(function(a,b){ return b._score-a._score; });
  var used = {};
  var chain = Promise.resolve();
  var filled=0;
  DAYS.forEach(function(day){
    MEALS.forEach(function(meal){
      var key = day+"-"+meal;
      var existing = (state.mealPlan.slots||{})[key];
      if(existing && existing.r) return;
      var pick = pool.find(function(r){ return (used[r.id]||0) < 2; }) || pool[0];
      if(!pick) return;
      used[pick.id] = (used[pick.id]||0)+1;
      filled++;
      chain = chain.then(function(){ return Data.setMealSlot(state.weekStart, key, {r:pick.id, s:pick.servings||4}); });
    });
  });
  chain.then(function(){ toast(filled? "Filled "+filled+" empty slot"+(filled===1?"":"s") : "Week was already full"); });
}

/* ============================== GROCERY TAB ============================== */
function viewGrocery(){
  var byDept = buildGroceryList();
  var anyItems = Object.keys(byDept).some(function(d){ return byDept[d].length; });
  var monday = new Date(state.weekStart+"T00:00:00");
  var body = !anyItems ? '<div class="empty-state"><span class="mark">🧾</span><h3>Nothing on the list</h3><p>Add recipes to this week\'s meal plan and your grocery list builds itself.</p></div>' :
    DEPARTMENTS.map(function(d){
      var items = byDept[d];
      if(!items.length) return "";
      return '<div class="grocery-dept"><h3>'+DEPT_ICON[d]+' '+d+' <span class="hint" style="margin:0">('+items.length+')</span></h3>'+
        items.map(function(it){
          var checked = !!(state.grocery.checked||{})[it.key];
          var qtyLabel = it.hasQty ? (Math.round(it.qty*100)/100)+" "+(it.unit||"") : (it.unit||"");
          return '<div class="grocery-item'+(checked?" checked":"")+'"><input type="checkbox" '+(checked?"checked":"")+' data-action="toggle-grocery" data-key="'+it.key+'">'+
            '<div style="flex:1"><div style="display:flex;gap:8px;align-items:baseline"><span class="g-qty mono">'+esc(qtyLabel)+'</span><span class="g-name">'+esc(it.name)+'</span>'+(it.extraIdx!==undefined?'<button class="icon-btn" data-action="remove-extra" data-idx="'+it.extraIdx+'" style="margin-left:auto">✕</button>':'')+'</div>'+
            '<div class="g-from">'+esc(it.sourceList.join(", "))+'</div></div></div>';
        }).join("")+
      '</div>';
    }).join("");
  return '<div class="section-head"><div><h2>Grocery List</h2><p class="sub">Week of '+formatWeekRange(monday)+' · combined from your meal plan, grouped by aisle.</p></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm" id="add-extra-btn">+ Add item</button><button class="btn btn-sm" id="print-list-btn">🖨 Print</button><button class="btn btn-sm" id="download-list-btn">⬇ Download .txt</button><button class="btn btn-sm btn-ghost" id="clear-checked-btn">Clear checked</button></div></div>'+
    body;
}
function wireGroceryTab(){
  if(!document.getElementById("add-extra-btn")) return;
  document.getElementById("add-extra-btn").addEventListener("click", openAddExtraModal);
  document.getElementById("clear-checked-btn").addEventListener("click", function(){ Data.clearGroceryChecked(state.weekStart); });
  document.getElementById("print-list-btn").addEventListener("click", function(){ window.print(); });
  document.getElementById("download-list-btn").addEventListener("click", downloadGroceryList);
}
function openAddExtraModal(){
  openModal(
    '<div class="modal-head"><h3>Add an item</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><div class="field"><label class="field-label">Item</label><input type="text" id="extra-name" placeholder="paper towels"></div>'+
    '<div class="field"><label class="field-label">Department</label><select id="extra-dept">'+DEPARTMENTS.map(function(d){return '<option value="'+d+'">'+d+'</option>';}).join("")+'</select></div></div>'+
    '<div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="add-extra-save">Add</button></div>'
  , {onMount:function(){
      document.getElementById("add-extra-save").addEventListener("click", function(){
        var name = document.getElementById("extra-name").value.trim();
        if(!name) return;
        var dept = document.getElementById("extra-dept").value;
        var arr=(state.grocery.extraItems||[]).concat([{name:name, department:dept}]);
        Data.setGroceryExtras(state.weekStart, arr);
        closeModal();
      });
    }});
}
function downloadGroceryList(){
  var byDept = buildGroceryList();
  var lines = ["Grocery list — week of "+formatWeekRange(new Date(state.weekStart+"T00:00:00")), ""];
  DEPARTMENTS.forEach(function(d){
    var items=byDept[d];
    if(!items || !items.length) return;
    lines.push(d.toUpperCase());
    items.forEach(function(it){
      var qtyLabel = it.hasQty ? (Math.round(it.qty*100)/100)+" "+(it.unit||"") : (it.unit||"");
      lines.push("- "+(qtyLabel? qtyLabel+" ":"")+it.name);
    });
    lines.push("");
  });
  var blob = new Blob([lines.join("\n")], {type:"text/plain"});
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "grocery-list-"+state.weekStart+".txt";
  document.body.appendChild(a); a.click(); a.remove();
}

/* ============================== PROFILES TAB ============================== */
function viewProfiles(){
  var cardsHtml = state.users.length ? '<div class="profile-grid">'+state.users.map(profileCardHtml).join("")+'</div>' :
    '<div class="empty-state"><span class="mark">👥</span><h3>No taste profiles yet</h3><p>Add everyone you cook for so recipes and meal plans can be tailored to them.</p></div>';
  return '<div class="section-head"><div><h2>Taste Profiles</h2><p class="sub">Likes, dislikes and diets — used to score recipes and auto-fill the meal plan.</p></div>'+
    '<button class="btn btn-primary" id="new-profile-btn">+ New profile</button></div>'+cardsHtml;
}
function profileCardHtml(u){
  return '<div class="card profile-card"><div class="avatar">'+esc(u.avatar||"🙂")+'</div><h3>'+esc(u.name)+'</h3>'+
    (u.dietary&&u.dietary.length? '<div class="tagrow" style="margin-bottom:6px">'+u.dietary.map(function(d){return '<span class="tag">'+esc(d)+'</span>';}).join("")+'</div>':"")+
    (u.favoriteCuisines&&u.favoriteCuisines.length? '<p class="plist"><b>Loves:</b> '+esc(u.favoriteCuisines.join(", "))+'</p>':"")+
    (u.likes&&u.likes.length? '<p class="plist"><b>Likes:</b> '+esc(u.likes.join(", "))+'</p>':"")+
    (u.dislikes&&u.dislikes.length? '<p class="plist"><b>Dislikes:</b> '+esc(u.dislikes.join(", "))+'</p>':"")+
    '<div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-sm" data-action="edit-profile" data-id="'+u.id+'">Edit</button><button class="btn btn-sm btn-danger" data-action="delete-profile" data-id="'+u.id+'">Delete</button></div></div>';
}
function wireProfilesTab(){
  var newBtn=document.getElementById("new-profile-btn");
  if(newBtn) newBtn.addEventListener("click", function(){ openProfileForm(null); });
}
function openProfileForm(id){
  var editing = id? state.users.find(function(u){return u.id===id;}) : null;
  var u = editing || {name:"",avatar:"🧑‍🍳",likes:[],dislikes:[],dietary:[],favoriteCuisines:[]};
  openModal(
    '<div class="modal-head"><h3>'+(editing?"Edit profile":"New taste profile")+'</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body">'+
      '<div class="field-row form-grid-2">'+
        '<div class="field"><label class="field-label">Name</label><input type="text" id="p-name" value="'+esc(u.name)+'"></div>'+
        '<div class="field"><label class="field-label">Avatar</label><select id="p-avatar">'+AVATAR_OPTIONS.map(function(a){return '<option value="'+a+'"'+(u.avatar===a?" selected":"")+'>'+a+'</option>';}).join("")+'</select></div>'+
      '</div>'+
      '<div class="field"><label class="field-label">Favorite cuisines</label><div class="chipfield" id="p-cuisines">'+(u.favoriteCuisines||[]).map(chipHtml).join("")+'<input type="text" list="cuisine-list-p" placeholder="add a cuisine, press Enter"></div><datalist id="cuisine-list-p">'+CUISINE_OPTIONS.map(function(c){return '<option value="'+c+'">';}).join("")+'</datalist></div>'+
      '<div class="field"><label class="field-label">Likes</label><div class="chipfield" id="p-likes">'+(u.likes||[]).map(chipHtml).join("")+'<input type="text" placeholder="e.g. garlic, spicy food"></div></div>'+
      '<div class="field"><label class="field-label">Dislikes</label><div class="chipfield" id="p-dislikes">'+(u.dislikes||[]).map(chipHtml).join("")+'<input type="text" placeholder="e.g. cilantro, mushrooms"></div></div>'+
      '<div class="field"><label class="field-label">Dietary</label><div class="chipfield" style="flex-wrap:wrap">'+DIETARY_OPTIONS.map(function(d){var on=(u.dietary||[]).indexOf(d)!==-1; return '<label style="display:flex;align-items:center;gap:5px;font-size:12.5px;padding:3px 8px;border-radius:999px;background:'+(on?"var(--accent-soft)":"var(--surface-2)")+'"><input type="checkbox" class="p-dietary-cb" value="'+d+'" '+(on?"checked":"")+' style="accent-color:var(--accent)">'+d+'</label>';}).join("")+'</div></div>'+
    '</div>'+
    '<div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="save-profile-btn">Save</button></div>'
  , {onMount:function(){
      wireChipField(document.getElementById("p-cuisines"));
      wireChipField(document.getElementById("p-likes"));
      wireChipField(document.getElementById("p-dislikes"));
      document.getElementById("save-profile-btn").addEventListener("click", function(){
        var name = document.getElementById("p-name").value.trim();
        if(!name){ toast("Give this profile a name","warn"); return; }
        var data = {
          name: name,
          avatar: document.getElementById("p-avatar").value,
          favoriteCuisines: readChips(document.getElementById("p-cuisines")),
          likes: readChips(document.getElementById("p-likes")),
          dislikes: readChips(document.getElementById("p-dislikes")),
          dietary: Array.prototype.filter.call(document.querySelectorAll(".p-dietary-cb"), function(c){return c.checked;}).map(function(c){return c.value;})
        };
        if(editing){ Data.updateUser(editing.id, data); toast("Profile updated"); }
        else { Data.addUser(data); toast("Profile added"); }
        closeModal();
      });
    }});
}

/* ============================== global wiring ============================== */
function wireMainEvents(){
  var main = document.getElementById("main");
  main.querySelectorAll("[data-open-recipe]").forEach(function(el){
    el.addEventListener("click", function(ev){ if(ev.target.closest("[data-action]")) return; openRecipeDetail(el.getAttribute("data-open-recipe")); });
  });
  main.querySelectorAll('[data-action="open-recipe-form"]').forEach(function(b){ b.addEventListener("click", function(){ openRecipeForm(null); }); });
  var gotoImport = main.querySelector('[data-action="goto-import"]');
  if(gotoImport) gotoImport.addEventListener("click", function(){ state.tab="import"; render(); });

  var searchInput = document.getElementById("recipe-search");
  if(searchInput) searchInput.addEventListener("input", debounce(function(e){ state.recipeSearch=e.target.value; render(); },200));
  var cuisineFilter = document.getElementById("recipe-cuisine-filter");
  if(cuisineFilter) cuisineFilter.addEventListener("change", function(e){ state.recipeCuisineFilter=e.target.value; render(); });
  var sortSel = document.getElementById("recipe-sort");
  if(sortSel) sortSel.addEventListener("change", function(e){ state.recipeSort=e.target.value; render(); });

  if(state.tab==="import") wireImportTab();
  if(state.tab==="snap") wireSnapTab();
  if(state.tab==="plan") wirePlanTab();
  if(state.tab==="grocery") wireGroceryTab();
  if(state.tab==="profiles") wireProfilesTab();
}

/* Delegated handlers bound ONCE to the stable #main element (innerHTML is
   replaced on every render, but the element itself persists), so we never
   stack duplicate listeners across renders. */
function wireMainDelegatedOnce(){
  var main = document.getElementById("main");
  main.addEventListener("click", function(e){
    var save = e.target.closest('[data-action="save-parsed"]');
    if(save){
      var mode = save.getAttribute("data-mode");
      var norm = mode==="import" ? lastParsed : lastSnap;
      if(!norm) return;
      Data.addRecipe(Object.assign({ratings:{}}, norm)).then(function(){
        toast("Recipe saved to your Larder");
        if(mode==="import"){ var ta=document.getElementById("import-text"); if(ta) ta.value=""; var ip=document.getElementById("import-preview"); if(ip) ip.innerHTML='<div class="empty-state"><span class="mark">✅</span><h3>Saved</h3><p>Find it in your Recipes tab.</p></div>'; lastParsed=null; }
        else { snapFile=null; lastSnap=null; renderMain(); }
      });
      return;
    }
    var reparse = e.target.closest('[data-action="reparse"]');
    if(reparse){
      var m = reparse.getAttribute("data-mode");
      if(m==="import") runImportParse(); else runSnapGuess();
      return;
    }
    var clearSlot = e.target.closest('[data-action="clear-slot"]');
    if(clearSlot){ e.stopPropagation(); Data.setMealSlot(state.weekStart, clearSlot.getAttribute("data-key"), null); return; }
    var pickSlot = e.target.closest('[data-action="pick-slot"]');
    if(pickSlot){ openSlotPicker(pickSlot.getAttribute("data-key")); return; }
    var toggleGrocery = e.target.closest('[data-action="toggle-grocery"]');
    if(toggleGrocery){ Data.toggleGroceryChecked(state.weekStart, toggleGrocery.getAttribute("data-key")); return; }
    var removeExtra = e.target.closest('[data-action="remove-extra"]');
    if(removeExtra){ var idx=Number(removeExtra.getAttribute("data-idx")); var arr=(state.grocery.extraItems||[]).slice(); arr.splice(idx,1); Data.setGroceryExtras(state.weekStart, arr); return; }
    var editProfile = e.target.closest('[data-action="edit-profile"]');
    if(editProfile){ openProfileForm(editProfile.getAttribute("data-id")); return; }
    var deleteProfile = e.target.closest('[data-action="delete-profile"]');
    if(deleteProfile){
      var id=deleteProfile.getAttribute("data-id");
      var u=state.users.find(function(x){return x.id===id;});
      if(u) confirmModal("Remove "+u.name+"?", "Their ratings stay on recipes but won't be tied to a profile anymore.", function(){ Data.deleteUser(id); toast("Profile removed"); });
      return;
    }
  });
}

/* boot */
wireMainDelegatedOnce();
boot();
})();
