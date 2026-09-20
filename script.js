// Rajkamal Medical Store - online version
const API_URL = "https://rajkamal-medical-store-backend-1.onrender.com";
const CATEGORIES=["Skin Care","Tablets","Protein","General Items","Shampoo & Soap","All Items"];

let products=[];
let wishes=JSON.parse(localStorage.getItem("rajkamal_wishes")||"[]");
let selectedCategory="All Items",selectedProductId=null,editingId=null;
let ownerToken=localStorage.getItem("rajkamal_owner_token")||"";

const $=id=>document.getElementById(id);

async function api(path, options={}) {
  const headers = {...(options.headers||{})};
  if (!(options.body instanceof FormData)) headers["Content-Type"]="application/json";
  if (ownerToken) headers.Authorization=`Bearer ${ownerToken}`;
  const r=await fetch(API_URL+path,{...options,headers});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Server error");
  return data;
}

async function loadProducts(){
  try{
    products=await api("/api/products");
    renderCategories(); renderProducts();
  }catch(e){
    console.error(e);
    $("productGrid").innerHTML=`<div class="empty">Server connection failed. Check API URL.</div>`;
  }
}

function renderCategories(){
  $("categories").innerHTML=CATEGORIES.map(c=>`<button class="category" onclick="openCategory('${c}')">${c}</button>`).join("");
}

function openCategory(c){
  selectedCategory=c; selectedProductId=null;
  $("homePage").classList.remove("active"); $("productPage").classList.add("active");
  $("categoryTitle").textContent=c; $("searchInput").value=""; renderProducts();
}

function productCard(p,selected=false){
  const unavailable=p.out||Number(p.qty)<=0;
  const img=p.image||'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#dff4ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#0754b5" font-size="28">Product Image</text></svg>');
  return `<article class="product-card ${selected?'selected-product selected':''}" onclick="selectProduct(${p.id})">
    <img src="${img}" alt="${p.name}">
    <div class="product-info"><h3>${p.name}</h3><div class="price">₹${p.price}</div>
    <div class="stock ${unavailable?'out':''}">${unavailable?'OUT OF STOCK':'Available: '+p.qty}</div>
    <p>${p.desc||""}</p>
    <button class="wish ${wishes.includes(p.id)?'active':''}" onclick="event.stopPropagation();toggleWish(${p.id})">${wishes.includes(p.id)?'♥ Wishlisted':'♡ Add to Wishlist'}</button>
    </div></article>`;
}

function renderProducts(){
  const q=$("searchInput").value.toLowerCase().trim();
  let list=selectedCategory==="All Items"?products:products.filter(p=>p.category===selectedCategory);
  if(q)list=list.filter(p=>(p.name+" "+p.desc).toLowerCase().includes(q));
  if(selectedProductId){const first=list.find(p=>p.id===selectedProductId);list=first?[first,...list.filter(p=>p.id!==selectedProductId)]:list}
  $("productGrid").innerHTML=list.length?list.map(p=>productCard(p,p.id===selectedProductId)).join(""):`<div class="empty">No products found.</div>`;
}

function selectProduct(id){selectedProductId=id;renderProducts();window.scrollTo({top:0,behavior:"smooth"})}
function toggleWish(id){wishes=wishes.includes(id)?wishes.filter(x=>x!==id):[...wishes,id];localStorage.setItem("rajkamal_wishes",JSON.stringify(wishes));renderProducts()}
function closeAll(){document.querySelectorAll(".modal").forEach(x=>x.classList.add("hidden"))}

$("menuBtn").onclick=()=>{$("menuPanel").classList.toggle("show")};
document.addEventListener("click",e=>{if(!e.target.closest(".actions")&&!e.target.closest(".menu-panel"))$("menuPanel").classList.remove("show")});

document.querySelectorAll("[data-info]").forEach(b=>b.onclick=()=>{
  $("modalTitle").textContent=b.dataset.info==="aboutShop"?"About Shop":"About Owner";
  $("modalText").textContent=b.dataset.info==="aboutShop"?"Rajkamal Medical Store — quality products and helpful service.":"Vimal Singh Deora";
  $("modal").classList.remove("hidden");
});

$("closeModal").onclick=closeAll;$("closeOwner").onclick=closeAll;$("closeForm").onclick=closeAll;$("closeLocation").onclick=closeAll;$("closeLocationForm").onclick=closeAll;

$("locationBtn").onclick=async()=>{
  try{
    const d=await api("/api/location");
    $("locationText").textContent=d.location||"Location not set by owner.";
  }catch{$("locationText").textContent="Unable to load location."}
  $("locationModal").classList.remove("hidden");
};

$("backBtn").onclick=()=>{$("productPage").classList.remove("active");$("homePage").classList.add("active");selectedProductId=null};
$("searchInput").addEventListener("input",()=>{selectedProductId=null;renderProducts()});

$("ownerAccessBtn").onclick=()=>{
  $("menuPanel").classList.remove("show");$("ownerModal").classList.remove("hidden");
  $("loginView").classList.remove("hidden");$("dashboardView").classList.add("hidden");
  $("passwordInput").value="";$("loginMsg").textContent="";
};

$("loginBtn").onclick=async()=>{
  try{
    const d=await api("/api/login",{method:"POST",body:JSON.stringify({password:$("passwordInput").value})});
    ownerToken=d.token; localStorage.setItem("rajkamal_owner_token",ownerToken);
    $("loginView").classList.add("hidden");$("dashboardView").classList.remove("hidden");
    renderOwnerProducts();
  }catch(e){$("loginMsg").textContent=e.message}
};

$("setLocationBtn").onclick=async()=>{
  try{const d=await api("/api/location");$("storeLocationInput").value=d.location||"";}catch{}
  $("locationFormModal").classList.remove("hidden");
};

$("saveLocationBtn").onclick=async()=>{
  const v=$("storeLocationInput").value.trim();
  if(!v)return;

  try{
    await api("/api/location",{
      method:"PUT",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("rajkamal_owner_token")
      },
      body:JSON.stringify({location:v})
    });

    closeAll();
  }catch(e){
    alert(e.message);
  }
};
function renderOwnerProducts(){
  $("ownerProducts").innerHTML=products.map(p=>`<div class="owner-row"><div><b>${p.name}</b><br>₹${p.price} • Qty ${p.qty} • ${p.out?"OUT OF STOCK":"In Stock"}</div>
  <button class="edit" onclick="editProduct(${p.id})">Edit</button>
  <button class="stock-btn" onclick="toggleStock(${p.id})">${p.out?"In Stock":"Out of Stock"}</button>
  <button class="delete" onclick="deleteProduct(${p.id})">Delete</button></div>`).join("");
}

$("addProductBtn").onclick=()=>openForm();

function openForm(id=null){
  editingId=id;$("formTitle").textContent=id?"Edit Product":"Add Product";$("productForm").reset();
  $("imagePreview").classList.add("hidden");$("productImage").dataset.image="";
  $("productCategory").value="General Items";
  if(id){
    let p=products.find(x=>x.id===id);
    $("productName").value=p.name;$("productQty").value=p.qty;$("productPrice").value=p.price;
    $("productDesc").value=p.desc;$("productReviews").value=p.reviews||"";
    $("productCategory").value=p.category||"General Items";
    if(p.image){$("imagePreview").src=p.image;$("imagePreview").classList.remove("hidden");$("productImage").dataset.image=p.image}
  }
  $("productFormModal").classList.remove("hidden");
}
function editProduct(id){openForm(id)}

async function deleteProduct(id){
  if(!confirm("Delete this product?"))return;
  try{await api("/api/products/"+id,{method:"DELETE"});await loadProducts();renderOwnerProducts();}
  catch(e){alert(e.message)}
}

async function toggleStock(id){
  try{await api("/api/products/"+id+"/stock",{method:"POST"});await loadProducts();renderOwnerProducts();}
  catch(e){alert(e.message)}
}

$("productImage").onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  $("imagePreview").src=URL.createObjectURL(f);$("imagePreview").classList.remove("hidden");
  try{
    const fd=new FormData();fd.append("image",f);
    const d=await api("/api/upload",{method:"POST",body:fd});
    $("productImage").dataset.image=d.url;
  }catch(err){alert("Image upload failed: "+err.message);$("productImage").value=""}
};

$("productForm").onsubmit=async e=>{
  e.preventDefault();
  const data={
    name:$("productName").value.trim(),
    qty:Number($("productQty").value),
    price:Number($("productPrice").value),
    desc:$("productDesc").value.trim(),
    reviews:$("productReviews").value.trim(),
    image:$("productImage").dataset.image||"",
    category:$("productCategory").value||"General Items",
    out:false
  };
  const old=editingId?products.find(p=>p.id===editingId):null;
  if(old)data.out=old.out;
  try{
    if(editingId) await api("/api/products/"+editingId,{method:"PUT",body:JSON.stringify(data)});
    else await api("/api/products",{method:"POST",body:JSON.stringify(data)});
    closeAll(); await loadProducts(); renderOwnerProducts();
  }catch(err){alert(err.message)}
};

loadProducts();
