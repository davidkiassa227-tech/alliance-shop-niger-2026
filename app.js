import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, where, limit, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app), auth = getAuth(app), storage = getStorage(app);
const main = document.querySelector("#main");
const state = {
  products: [], favorites: JSON.parse(localStorage.getItem("alliance_favorites") || "[]"),
  cart: JSON.parse(localStorage.getItem("alliance_cart") || "[]"),
  user: null, profile: null, settings: {
    shopName:"ALLIANCE SHOP", slogan:"Parfums • Chaussures • Mode", whatsapp:"+22788665762",
    minShipping:1000, currency:"FCFA", maintenance:false
  }
};

const money = n => new Intl.NumberFormat("fr-FR").format(Number(n)||0) + " FCFA";
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const slug = s => encodeURIComponent(String(s||"").toLowerCase().trim().replace(/\s+/g,"-"));
const saveLocal = ()=>{localStorage.setItem("alliance_favorites",JSON.stringify(state.favorites));localStorage.setItem("alliance_cart",JSON.stringify(state.cart));updateCounts()};
const toast = m=>{const t=document.querySelector("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)};
function updateCounts(){document.querySelector("#favCount").textContent=state.favorites.length;document.querySelector("#cartCount").textContent=state.cart.reduce((a,x)=>a+x.qty,0)}
function go(hash){location.hash=hash}
function productImage(p){return p.images?.[0] || "assets/product-placeholder.svg"}
function priceOf(p){return Number(p.salePrice||p.price||0)}
function stockClass(n){return n<=0?"out":n<=3?"low":"ok"}
function productCard(p){
  const fav=state.favorites.includes(p.id), stock=Number(p.stock||0), price=priceOf(p);
  return `<article class="card">
    <img class="card-img" src="${esc(productImage(p))}" alt="${esc(p.name)}" loading="lazy">
    <button class="fav ${fav?"active":""}" onclick="toggleFav('${esc(p.id)}')">${fav?"♥":"♡"}</button>
    <div class="card-body"><h3>${esc(p.name)}</h3>
      <div>${p.salePrice?`<span class="old">${money(p.price)}</span>`:""}<span class="price">${money(price)}</span></div>
      <div class="stock ${stockClass(stock)}">${stock>0?`✓ ${stock} disponible(s)`:"✕ Rupture de stock"}</div>
      <div class="card-actions">
        <button class="btn btn-light" onclick="viewProduct('${esc(p.id)}')">Voir</button>
        <button class="btn btn-primary" ${stock<=0?"disabled":""} onclick="addCart('${esc(p.id)}')">🛒 Ajouter</button>
      </div>
    </div>
  </article>`;
}

window.toggleFav=id=>{state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];saveLocal();render()};
window.addCart=id=>{
  const p=state.products.find(x=>x.id===id);if(!p)return;
  if(Number(p.stock||0)<=0)return toast("Produit en rupture de stock.");
  const row=state.cart.find(x=>x.id===id);
  if(row){if(row.qty>=Number(p.stock))return toast("Stock disponible atteint.");row.qty++} else state.cart.push({id,qty:1});
  saveLocal();toast("Produit ajouté au panier.");render();
};
window.changeQty=(id,d)=>{
 const r=state.cart.find(x=>x.id===id),p=state.products.find(x=>x.id===id);if(!r)return;
 r.qty=Math.max(1,Math.min(Number(p?.stock||999),r.qty+d));saveLocal();render();
};
window.removeCart=id=>{state.cart=state.cart.filter(x=>x.id!==id);saveLocal();render()};
window.viewProduct=id=>go("#product/"+id);

async function loadSettings(){
 try{const s=await getDoc(doc(db,"settings","public"));if(s.exists())state.settings={...state.settings,...s.data()}}catch(e){console.warn("Firebase settings:",e.message)}
 document.querySelector("#footerWhatsapp").href="https://wa.me/"+state.settings.whatsapp.replace(/\D/g,"");
}
function listenProducts(){
 try{
  onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),snap=>{
   state.products=snap.docs.map(d=>({id:d.id,...d.data()}));render();
  },err=>console.warn("Products listener:",err.message));
 }catch(e){console.warn(e)}
}
function layout(content){return `<div>${content}</div>`}

function home(){
 const products=state.products, featured=products.filter(p=>p.featured).slice(0,8);
 return layout(`<section class="hero"><h1>BIENVENUE CHEZ DAVID ALLIANCE SHOP</h1><p>Découvrez nos nouveautés, parfums, chaussures et meilleures offres.</p><button class="btn btn-primary" onclick="go('#shop')">VOIR LES PRODUITS</button></section>
 <div class="container">
  <div class="section-title"><h2>Catégories</h2></div>
  <div class="categories">
   ${[["🧴","Parfums"],["👟","Chaussures"],["👕","Vêtements"],["🎒","Accessoires"],["🔥","Promotions"]].map(([i,n])=>`<button class="cat" onclick="go('#shop?cat=${encodeURIComponent(n==="Promotions"?"promo":n)}')"><span>${i}</span>${n}</button>`).join("")}
  </div>
  <div class="section-title"><h2>Nouveautés</h2><a class="btn btn-light" href="#shop">Tout voir</a></div>
  <div class="grid">${(featured.length?featured:products.slice(0,8)).map(productCard).join("") || `<div class="empty">Les produits apparaîtront ici dès qu'ils seront ajoutés.</div>`}</div>
  <div class="section-title"><h2>🔥 BONNE NOUVELLE CHEZ ALLIANCE-SHOP</h2></div>
  <div class="notice">Promotions, nouveautés et offres sont synchronisées en ligne. Les prix et stocks affichés sont ceux de la base de données.</div>
 </div>`);
}

function shop(){
 const params=new URLSearchParams(location.hash.split("?")[1]||""), cat=params.get("cat")||"";
 let products=[...state.products]; if(cat&&cat!=="promo")products=products.filter(p=>(p.category||"").toLowerCase()===cat.toLowerCase());
 if(cat==="promo")products=products.filter(p=>p.salePrice);
 return `<div class="container"><div class="section-title"><h1>Boutique</h1></div>
 <div class="toolbar"><input id="shopSearch" class="input searchbox" placeholder="🔍 Rechercher un produit..." oninput="filterShop()">
 <select id="shopCat" class="select" onchange="filterShop()" style="max-width:210px"><option value="">Toutes catégories</option><option>Parfums</option><option>Chaussures</option><option>Vêtements</option><option>Accessoires</option></select>
 <select id="shopSort" class="select" onchange="filterShop()" style="max-width:210px"><option value="new">Nouveautés</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option></select></div>
 <div id="shopGrid" class="grid">${products.map(productCard).join("")||`<div class="empty">Aucun produit trouvé.</div>`}</div></div>`;
}
window.filterShop=()=>{
 const q=(document.querySelector("#shopSearch")?.value||"").toLowerCase(),c=document.querySelector("#shopCat")?.value||"",s=document.querySelector("#shopSort")?.value||"new";
 let ps=state.products.filter(p=>(!q||`${p.name} ${p.brand||""} ${p.description||""}`.toLowerCase().includes(q))&&(!c||p.category===c));
 ps.sort((a,b)=>s==="asc"?priceOf(a)-priceOf(b):s==="desc"?priceOf(b)-priceOf(a):Number(b.createdAt?.seconds||0)-Number(a.createdAt?.seconds||0));
 document.querySelector("#shopGrid").innerHTML=ps.map(productCard).join("")||`<div class="empty">Aucun produit trouvé.</div>`;
};

function productDetail(id){
 const p=state.products.find(x=>x.id===id);if(!p)return `<div class="container"><div class="empty">Produit introuvable.</div></div>`;
 const stock=Number(p.stock||0), price=priceOf(p);
 return `<div class="container"><button class="btn btn-light" onclick="go('#shop')">← Retour boutique</button>
 <div class="about" style="margin-top:20px"><div><img class="card-img" src="${esc(productImage(p))}" alt="${esc(p.name)}"></div>
 <div><p class="muted">${esc(p.category||"Produit")} ${p.brand?`• ${esc(p.brand)}`:""}</p><h1>${esc(p.name)}</h1>
 <p>${esc(p.description||"")}</p>${p.salePrice?`<div><span class="old">${money(p.price)}</span></div>`:""}<div class="price" style="font-size:30px">${money(price)}</div>
 <p class="stock ${stockClass(stock)}">${stock>0?`✓ ${stock} disponible(s)`:"✕ Rupture de stock"}</p>
 <div class="toolbar"><input id="detailQty" class="input" type="number" min="1" max="${stock}" value="1" style="max-width:100px"><button class="btn btn-primary" ${stock<=0?"disabled":""} onclick="addDetail('${esc(id)}')">🛒 AJOUTER AU PANIER</button><button class="btn btn-dark" onclick="waProduct('${esc(id)}')">💬 COMMANDER SUR WHATSAPP</button></div>
 ${p.reference?`<small>Référence : ${esc(p.reference)}</small>`:""}</div></div></div>`;
}
window.addDetail=id=>{const q=Math.max(1,Number(document.querySelector("#detailQty")?.value||1));const p=state.products.find(x=>x.id===id);if(!p)return;for(let i=0;i<q;i++)window.addCart(id)};
window.waProduct=id=>{
 const p=state.products.find(x=>x.id===id);if(!p)return;const q=Number(document.querySelector("#detailQty")?.value||1);
 const msg=`Bonjour ALLIANCE SHOP,%0AJe souhaite commander : ${encodeURIComponent(p.name)}%0AQuantité : ${q}%0APrix unitaire : ${encodeURIComponent(money(priceOf(p)))}%0ASous-total : ${encodeURIComponent(money(priceOf(p)*q))}`;
 window.open(`https://wa.me/${state.settings.whatsapp.replace(/\D/g,"")}?text=${msg}`,"_blank");
};

function cart(){
 const rows=state.cart.map(r=>({...r,p:state.products.find(p=>p.id===r.id)})).filter(x=>x.p);
 const sub=rows.reduce((a,x)=>a+priceOf(x.p)*x.qty,0);
 return `<div class="container"><div class="section-title"><h1>🛒 Panier</h1></div>${rows.length?rows.map(x=>`<div class="cart-row"><img src="${esc(productImage(x.p))}"><div><b>${esc(x.p.name)}</b><div class="muted">${money(priceOf(x.p))}</div></div><div class="qty"><button onclick="changeQty('${x.p.id}',-1)">−</button><b>${x.qty}</b><button onclick="changeQty('${x.p.id}',1)">+</button></div><button class="btn btn-light danger" onclick="removeCart('${x.p.id}')">Supprimer</button></div>`).join(""):`<div class="empty">Votre panier est vide.</div>`}
 ${rows.length?`<div class="summary"><div class="summary-line"><span>Produits</span><b>${money(sub)}</b></div><div class="summary-line"><span>Expédition</span><span>À partir de ${money(state.settings.minShipping)}</span></div><div class="summary-line total"><span>Total estimatif</span><b>${money(sub+Number(state.settings.minShipping||1000))}</b></div><p class="muted">Les frais d'expédition commencent à 1 000 FCFA et peuvent varier selon la destination. Le montant exact sera confirmé avant l'expédition.</p><button class="btn btn-primary" onclick="go('#checkout')">COMMANDER</button></div>`:""}</div>`;
}

function checkout(){
 const rows=state.cart.map(r=>({...r,p:state.products.find(p=>p.id===r.id)})).filter(x=>x.p);
 const sub=rows.reduce((a,x)=>a+priceOf(x.p)*x.qty,0);
 if(!rows.length)return `<div class="container"><div class="empty">Votre panier est vide.<br><br><button class="btn btn-primary" onclick="go('#shop')">Voir la boutique</button></div></div>`;
 return `<div class="container"><h1>Passer une commande</h1><div class="form-grid">
 <input id="cName" class="input" placeholder="Nom et prénom *"><input id="cPhone" class="input" placeholder="Numéro de téléphone *">
 <input id="cCity" class="input" placeholder="Ville *"><input id="cDistrict" class="input" placeholder="Quartier *">
 <input id="cAddress" class="input full" placeholder="Adresse ou lieu de livraison *"><textarea id="cComment" class="textarea full" rows="3" placeholder="Commentaire éventuel"></textarea>
 </div><div class="summary"><h3>🧾 RÉSUMÉ DE LA COMMANDE</h3><div class="summary-line"><span>Produits</span><b>${money(sub)}</b></div><div class="summary-line"><span>Expédition</span><span>À partir de ${money(state.settings.minShipping)}</span></div><div class="summary-line total"><span>TOTAL À PAYER</span><b id="checkoutTotal">${money(sub+Number(state.settings.minShipping||1000))}</b></div><p class="notice">📦 Expédition à partir de 1 000 FCFA selon la destination. Le montant exact sera confirmé avant l'expédition.</p>
 <button class="btn btn-primary" onclick="confirmOrder()">✅ CONFIRMER ET COMMANDER</button></div></div>`;
}

window.confirmOrder=async()=>{
 const fields=["cName","cPhone","cCity","cDistrict","cAddress"];if(fields.some(id=>!document.getElementById(id)?.value.trim()))return toast("Merci de remplir les champs obligatoires.");
 const rows=state.cart.map(r=>({...r,p:state.products.find(p=>p.id===r.id)})).filter(x=>x.p),sub=rows.reduce((a,x)=>a+priceOf(x.p)*x.qty,0);
 const order={number:"AS-"+Date.now().toString().slice(-8),customer:{name:cName.value,phone:cPhone.value,city:cCity.value,district:cDistrict.value,address:cAddress.value,comment:cComment.value},items:rows.map(x=>({productId:x.p.id,name:x.p.name,qty:x.qty,price:priceOf(x.p),purchasePrice:Number(x.p.purchasePrice||0)})),subtotal:sub,shipping:Number(state.settings.minShipping||1000),total:sub+Number(state.settings.minShipping||1000),paymentMethod:"",paymentStatus:"pending",orderStatus:"new",createdAt:serverTimestamp()};
 try{await addDoc(collection(db,"orders"),order);state.lastOrder=order;state.cart=[];saveLocal();go("#payment");}catch(e){toast("Impossible d'enregistrer la commande. Vérifiez Firebase.");console.error(e)}
};

function payment(){
 const o=state.lastOrder;if(!o)return `<div class="container"><div class="empty">Commande non trouvée.</div></div>`;
 return `<div class="container"><h1>✅ COMMANDE PRÉPARÉE !</h1><p>Commande <b>${esc(o.number)}</b></p><div class="summary"><div class="summary-line"><span>Produits</span><b>${money(o.subtotal)}</b></div><div class="summary-line"><span>Expédition</span><b>${money(o.shipping)}</b></div><div class="summary-line total"><span>TOTAL</span><b>${money(o.total)}</b></div></div>
 <h2>💳 CHOISIR UN MODE DE PAIEMENT</h2><div class="toolbar"><button class="btn btn-light" onclick="choosePayment('cash')">💵 PAYER EN ESPÈCES</button><button class="btn btn-primary" onclick="choosePayment('mynita')">📱 PAYER AVEC MY NITA</button><button class="btn btn-primary" onclick="choosePayment('amana')">📱 PAYER AVEC AMANA TA</button></div><div id="paymentBox"></div></div>`;
}
window.choosePayment=async method=>{
 const o=state.lastOrder;if(!o)return;o.paymentMethod=method;
 const labels={cash:"Espèces",mynita:"My NITA",amana:"AMANA TA"};
 let info=method==="cash"?`<div class="notice">Paiement en espèces possible selon les conditions de livraison ou de retrait.</div>`:`<div class="notice">Pour ${labels[method]}, utilisez les informations de paiement définies par le propriétaire. Après paiement, joignez obligatoirement une preuve (photo du reçu ou capture d'écran).</div><input id="proof" class="input" type="file" accept="image/*">`;
 document.querySelector("#paymentBox").innerHTML=info+`<br><button class="btn btn-dark" onclick="finalizePayment('${method}')">💬 ENVOYER LA COMMANDE SUR WHATSAPP</button>`;
};
window.finalizePayment=async method=>{
 const o=state.lastOrder, labels={cash:"Espèces",mynita:"My NITA",amana:"AMANA TA"}; if(!o)return;
 let proofText="";const file=document.querySelector("#proof")?.files?.[0];
 try{
  if(file){const r=ref(storage,`payment-proofs/${o.number}-${Date.now()}-${file.name}`);await uploadBytes(r,file);o.proofUrl=await getDownloadURL(r);o.paymentStatus="proof_received";proofText="🧾 Preuve de paiement jointe à la commande."}
  else if(method!=="cash")return toast("Joignez la preuve de paiement.");
  await updateDoc(doc(db,"orders",o.number),{}).catch(()=>{});
 }catch(e){console.warn("proof:",e.message)}
 const msg=`Bonjour ALLIANCE SHOP,%0A🧾 COMMANDE ${encodeURIComponent(o.number)}%0A${o.items.map(i=>`${encodeURIComponent(i.name)} x${i.qty} — ${encodeURIComponent(money(i.price))}`).join("%0A")}%0ASous-total : ${encodeURIComponent(money(o.subtotal))}%0AExpédition : ${encodeURIComponent(money(o.shipping))}%0ATotal : ${encodeURIComponent(money(o.total))}%0AMode de paiement : ${encodeURIComponent(labels[method])}%0AStatut : ${method==="cash"?"À confirmer":"À vérifier"}%0AClient : ${encodeURIComponent(o.customer.name)}%0ATéléphone : ${encodeURIComponent(o.customer.phone)}%0AVille : ${encodeURIComponent(o.customer.city)}%0AQuartier : ${encodeURIComponent(o.customer.district)}%0AAdresse : ${encodeURIComponent(o.customer.address)}%0A${proofText}`;
 window.open(`https://wa.me/${state.settings.whatsapp.replace(/\D/g,"")}?text=${msg}`,"_blank");
 toast("Commande transmise sur WhatsApp.");
};

function about(){return `<div class="container about"><div class="about-box"><img src="assets/logo.svg" style="max-width:260px;width:100%" alt="ALLIANCE-PARFUM"></div><div><h1>👥 Qui sommes-nous ?</h1><h2>ALLIANCE SHOP</h2><p><b>ALLIANCE-PARFUM</b></p><p>Fondée par <b>David Kiassa et Chittou Idrissa</b>, ALLIANCE SHOP est une boutique pensée autour des parfums, chaussures, vêtements, mode et accessoires.</p><h3>Deux étudiants, une vision, une alliance.</h3><p>Notre vision est de proposer une expérience d'achat simple, moderne et accessible, avec des produits présentés clairement et un service client de proximité.</p><p>📱 Contact WhatsApp : <a class="btn btn-primary" href="https://wa.me/${state.settings.whatsapp.replace(/\D/g,"")}">Nous contacter</a></p></div></div>`}
function favorites(){const ps=state.products.filter(p=>state.favorites.includes(p.id));return `<div class="container"><h1>❤️ Mes favoris</h1><div class="grid">${ps.map(productCard).join("")||`<div class="empty">Aucun favori pour le moment.</div>`}</div></div>`}
function account(){return `<div class="container"><h1>👤 Compte</h1><div class="about-box"><p>La création de compte client reste facultative.</p><button class="btn btn-primary" onclick="adminLogin()">👑 Espace propriétaire / employé</button></div></div>`}

async function adminLogin(){
 const email=prompt("Email propriétaire/employé"); if(!email)return;
 const pass=prompt("Mot de passe"); if(!pass)return;
 try{await signInWithEmailAndPassword(auth,email,pass);go("#admin")}catch(e){toast("Connexion refusée : email ou mot de passe incorrect.");}
}
window.adminLogin=adminLogin;
window.adminLogout=async()=>{await signOut(auth);go("#home")};

function admin(){
 if(!state.user)return `<div class="container"><div class="empty">🔐 Connexion requise.<br><br><button class="btn btn-primary" onclick="adminLogin()">Se connecter</button></div></div>`;
 const can=state.profile?.role==="owner"||state.profile?.permissions?.admin===true;
 if(!can)return `<div class="container"><div class="empty">🚫 Accès refusé — Vous n'avez pas l'autorisation d'accéder à cette section.</div></div>`;
 const section=(location.hash.split("/")[1]||"dashboard");
 return `<div class="admin-layout"><aside class="sidebar">
 <button class="${section==="dashboard"?"active":""}" onclick="go('#admin/dashboard')">📊 Tableau de bord</button>
 <button onclick="go('#admin/products')">🧴 Produits</button><button onclick="go('#admin/stock')">📦 Stock</button><button onclick="go('#admin/orders')">🧾 Commandes</button><button onclick="go('#admin/sales')">💰 Ventes</button><button onclick="go('#admin/payments')">💳 Paiements</button><button onclick="go('#admin/employees')">👥 Mes employés</button><button onclick="go('#admin/shipping')">🚚 Expéditions</button><button onclick="go('#admin/promotions')">🔥 Promotions</button><button onclick="go('#admin/security')">🔐 Sécurité</button><button onclick="go('#admin/settings')">⚙️ Paramètres</button><button onclick="adminLogout()">↪ Déconnexion</button>
 </aside><section class="admin-content">${adminSection(section)}</section></div>`;
}
function adminSection(s){
 if(s==="products")return adminProducts(); if(s==="stock")return adminStock(); if(s==="orders")return adminOrders(); if(s==="employees")return adminEmployees(); if(s==="settings")return adminSettings(); if(s==="security")return `<div class="admin-top"><h1>🔐 Sécurité</h1></div><div class="about-box"><p>Les mots de passe sont gérés par Firebase Authentication et ne sont jamais affichés en clair.</p><button class="btn btn-dark" onclick="adminLogout()">Déconnexion sécurisée</button></div>`;
 return `<div class="admin-top"><h1>📊 Tableau de bord</h1><span class="pill">🟢 Synchronisation active</span></div><div class="metrics">
 ${metric("💰 Chiffre d'affaires","—")}${metric("📈 Bénéfices","—")}${metric("🧾 Commandes","—")}${metric("📦 Produits",state.products.length)}
 </div><div class="about-box" style="margin-top:20px"><h3>ALLIANCE SHOP</h3><p>Les chiffres financiers sont calculés à partir des ventes et commandes validées. Les prix d'achat restent réservés aux utilisateurs autorisés.</p></div>`;
}
const metric=(a,b)=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`;
function adminProducts(){return `<div class="admin-top"><h1>🧴 Produits</h1><button class="btn btn-primary" onclick="productForm()">➕ AJOUTER UN PRODUIT</button></div><div class="table-wrap"><table class="table"><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Actions</th></tr>${state.products.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(priceOf(p))}</td><td>${p.stock||0}</td><td><button class="btn btn-light" onclick="productForm('${p.id}')">✏️</button> <button class="btn btn-light danger" onclick="deleteProduct('${p.id}')">🗑️</button></td></tr>`).join("")}</table></div>`}
function adminStock(){return `<div class="admin-top"><h1>📦 Stock</h1></div><div class="grid">${state.products.map(p=>`<div class="metric"><b>${esc(p.name)}</b><span class="stock ${stockClass(Number(p.stock||0))}">${Number(p.stock||0)} unité(s)</span><button class="btn btn-light" style="margin-top:10px" onclick="productForm('${p.id}')">Modifier</button></div>`).join("")}</div>`}
function adminOrders(){return `<div class="admin-top"><h1>🧾 Commandes</h1></div><div class="table-wrap"><table class="table"><tr><th>N°</th><th>Client</th><th>Total</th><th>Paiement</th><th>Statut</th></tr><tr><td colspan="5">Les commandes en temps réel seront affichées ici avec les règles Firestore.</td></tr></table></div>`}
function adminEmployees(){return `<div class="admin-top"><h1>👥 Mes employés</h1><button class="btn btn-primary" onclick="toast('Crée les comptes employés depuis Firebase Authentication puis attribue leur rôle dans users/{uid}.')">➕ Ajouter</button></div><div class="notice">Les employés doivent avoir un compte Firebase Authentication. Le propriétaire attribue ensuite un rôle et des permissions dans la collection <b>users</b>.</div>`}
function adminSettings(){return `<div class="admin-top"><h1>⚙️ PARAMÈTRES — ALLIANCE SHOP</h1></div><div class="form-grid">
 <label>Nom boutique<input id="setName" class="input" value="${esc(state.settings.shopName)}"></label><label>Slogan<input id="setSlogan" class="input" value="${esc(state.settings.slogan)}"></label>
 <label>WhatsApp principal<input id="setWa" class="input" value="${esc(state.settings.whatsapp)}"></label><label>Frais minimum<input id="setShip" class="input" type="number" value="${Number(state.settings.minShipping||1000)}"></label>
 <label class="full">Message maintenance<textarea id="setMaintMsg" class="textarea"></textarea></label>
 </div><br><button class="btn btn-primary" onclick="saveSettings()">💾 ENREGISTRER LES MODIFICATIONS</button>
 <div class="about-box" style="margin-top:20px"><b>🟢 Synchronisation active</b><p>Devise : FCFA · Langue : Français · Fuseau : Niger (UTC+1)</p></div>`}
window.saveSettings=async()=>{
 try{await setDoc(doc(db,"settings","public"),{shopName:setName.value,slogan:setSlogan.value,whatsapp:setWa.value,minShipping:Number(setShip.value||1000),updatedAt:serverTimestamp()},{merge:true});await loadSettings();toast("✅ Paramètres enregistrés avec succès.");render()}catch(e){toast("❌ Impossible d'enregistrer les modifications.");}
};
window.productForm=async id=>{
 const p=state.products.find(x=>x.id===id)||{};
 const html=`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${id?"Modifier":"Ajouter"} un produit</h2><button class="close" onclick="document.querySelector('#modal').remove()">×</button></div>
 <div class="form-grid"><input id="pfName" class="input full" placeholder="Nom *" value="${esc(p.name||"")}"><select id="pfCat" class="select"><option>Parfums</option><option>Chaussures</option><option>Vêtements</option><option>Accessoires</option><option>Autre</option></select><input id="pfBrand" class="input" placeholder="Marque" value="${esc(p.brand||"")}"><input id="pfCont" class="input" placeholder="Contenance (parfum)" value="${esc(p.volume||"")}"><input id="pfBuy" class="input" type="number" placeholder="Prix d'achat" value="${p.purchasePrice||""}"><input id="pfPrice" class="input" type="number" placeholder="Prix de vente *" value="${p.price||""}"><input id="pfSale" class="input" type="number" placeholder="Prix promotionnel" value="${p.salePrice||""}"><input id="pfStock" class="input" type="number" placeholder="Stock" value="${p.stock||0}"><input id="pfRef" class="input" placeholder="Référence" value="${esc(p.reference||"")}"><input id="pfImage" class="input full" placeholder="URL de photo principale" value="${esc(p.images?.[0]||"")}"><textarea id="pfDesc" class="textarea full" rows="4" placeholder="Description">${esc(p.description||"")}</textarea></div><br><button class="btn btn-primary" onclick="saveProduct('${id||""}')">💾 Enregistrer</button></div></div>`;
 document.querySelector("#modalRoot").innerHTML=html;document.querySelector("#pfCat").value=p.category||"Parfums";
};
window.saveProduct=async id=>{
 const data={name:pfName.value.trim(),category:pfCat.value,brand:pfBrand.value.trim(),volume:pfCont.value.trim(),purchasePrice:Number(pfBuy.value||0),price:Number(pfPrice.value||0),salePrice:Number(pfSale.value||0),stock:Number(pfStock.value||0),reference:pfRef.value.trim(),images:pfImage.value.trim()?[pfImage.value.trim()]:["assets/product-placeholder.svg"],description:pfDesc.value.trim(),updatedAt:serverTimestamp()};
 try{if(id)await updateDoc(doc(db,"products",id),data);else await addDoc(collection(db,"products"),{...data,createdAt:serverTimestamp(),featured:false});document.querySelector("#modal").remove();toast("Produit enregistré.");}catch(e){toast("Erreur lors de l'enregistrement.");console.error(e)}
};
window.deleteProduct=async id=>{if(!confirm("Déplacer ce produit vers la corbeille ?"))return;try{await updateDoc(doc(db,"products",id),{deleted:true,deletedAt:serverTimestamp()});toast("Produit déplacé vers la corbeille.");}catch(e){toast("Suppression refusée.")}};

function render(){
 updateCounts(); const h=location.hash||"#home";
 if(h.startsWith("#product/"))main.innerHTML=productDetail(decodeURIComponent(h.split("/")[1]));
 else if(h==="#shop"||h.startsWith("#shop?"))main.innerHTML=shop();
 else if(h==="#about")main.innerHTML=about();
 else if(h==="#favorites")main.innerHTML=favorites();
 else if(h==="#cart")main.innerHTML=cart();
 else if(h==="#checkout")main.innerHTML=checkout();
 else if(h==="#payment")main.innerHTML=payment();
 else if(h.startsWith("#admin"))main.innerHTML=admin();
 else if(h==="#account")main.innerHTML=account();
 else main.innerHTML=home();
}
window.addEventListener("hashchange",render);
document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{const a=b.dataset.action;go("#"+(a==="search"?"shop":a))}));
document.querySelector("#year").textContent=new Date().getFullYear();
onAuthStateChanged(auth,async u=>{state.user=u;if(u){try{const s=await getDoc(doc(db,"users",u.uid));state.profile=s.exists()?s.data():null}catch(e){}}render()});
await loadSettings();listenProducts();render();
