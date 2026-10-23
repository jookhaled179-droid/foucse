const express=require('express');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const app=express();
const PORT=Number(process.env.PORT||3000);
const DB=path.join(__dirname,'data','db.json');
const PUBLIC=path.join(__dirname,'public');
if(!fs.existsSync(path.dirname(DB)))fs.mkdirSync(path.dirname(DB),{recursive:true});
const defaultDB={
 settings:{storeName:'FOUCSE',shipping:90,currency:'EGP',whatsapp:''},
 products:[
  {id:'p1',name:'FOUCSE Heavyweight Hoodie',category:'hoodies',price:2400,rating:5,stock:20,sizes:['S','M','L','XL'],image:'',active:true},
  {id:'p2',name:'Essential Matte Black Tee',category:'basics',price:1100,rating:4.8,stock:35,sizes:['S','M','L','XL','XXL'],image:'',active:true},
  {id:'p3',name:'FOUCSE Dark Denim Jeans',category:'jeans',price:2600,rating:4.9,stock:15,sizes:['30','32','34','36','38'],image:'',active:true},
  {id:'p4',name:'Oversized Wide Leg Trousers',category:'wide-leg',price:2200,rating:4.7,stock:18,sizes:['S','M','L','XL'],image:'',active:true},
  {id:'p5',name:'FOUCSE Stealth Sneakers',category:'shoes',price:3500,rating:5,stock:12,sizes:['40','41','42','43','44','45'],image:'',active:true}
 ],
 orders:[],
 admin:{username:'youssef',password:'youssef1234'}
};
function read(){try{return JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){write(defaultDB);return JSON.parse(JSON.stringify(defaultDB))}}
function write(d){fs.writeFileSync(DB,JSON.stringify(d,null,2))}
read();
app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:true}));
function auth(req,res,next){const token=(req.headers.authorization||'').replace('Bearer ','');if(!token||!validToken(token)){return res.status(401).json({error:'Unauthorized'})}next()}
const sessions=new Map();
function validToken(t){const exp=sessions.get(t);if(!exp)return false;if(exp<Date.now()){sessions.delete(t);return false}return true}
app.get('/api/products',(req,res)=>res.json(read().products));
app.get('/api/settings',(req,res)=>{const d=read();res.json(d.settings)});
app.post('/api/orders',(req,res)=>{
 const b=req.body||{};const str=(v,n)=>String(v??'').trim().slice(0,n);b.customerName=str(b.customerName,100);b.phone=str(b.phone,20);b.governorate=str(b.governorate,50);b.address=str(b.address,300);b.notes=str(b.notes,500);if(!b.customerName||!b.phone||!b.governorate||!b.address||!Array.isArray(b.items)||!b.items.length)return res.status(400).json({error:'Please complete all required fields'});
 const d=read();let subtotal=0;const items=[];
 for(const it of b.items){const p=d.products.find(x=>x.id===it.productId&&x.active!==false);const q=Number(it.quantity||1);if(!p)return res.status(400).json({error:'Product unavailable'});if(!Number.isInteger(q)||q<1)return res.status(400).json({error:'Invalid quantity'});if((p.sizes||[]).length&&!p.sizes.includes(it.size))return res.status(400).json({error:`Please choose a valid size for ${p.name}`});const already=items.filter(x=>x.productId===p.id).reduce((s,x)=>s+x.quantity,0);if(p.stock<already+q)return res.status(400).json({error:`Not enough stock for ${p.name}`});subtotal+=p.price*q;items.push({productId:p.id,name:p.name,price:p.price,size:it.size||'',quantity:q});}
 items.forEach(it=>{d.products.find(p=>p.id===it.productId).stock-=it.quantity});
 const order={id:'ORD-'+Date.now().toString(36).toUpperCase(),createdAt:new Date().toISOString(),status:'new',customerName:b.customerName,phone:b.phone,governorate:b.governorate,address:b.address,notes:b.notes||'',items,subtotal,shipping:Number(d.settings.shipping||90),total:subtotal+Number(d.settings.shipping||90)};
 d.orders.unshift(order);write(d);res.status(201).json({order});
});
app.post('/api/admin/login',(req,res)=>{const d=read();if(req.body.username!==d.admin.username||req.body.password!==d.admin.password)return res.status(401).json({error:'Invalid credentials'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+1000*60*60*12);res.json({token})});
app.get('/api/admin/summary',auth,(req,res)=>{const d=read();const revenue=d.orders.reduce((s,o)=>s+o.total,0);res.json({orders:d.orders.length,revenue,products:d.products.length,pending:d.orders.filter(o=>['new','processing'].includes(o.status)).length})});
app.get('/api/admin/orders',auth,(req,res)=>res.json(read().orders));
app.put('/api/admin/orders/:id',auth,(req,res)=>{const d=read(),o=d.orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:'Order not found'});if(req.body.status){if(!['new','processing','shipped','delivered','cancelled'].includes(req.body.status))return res.status(400).json({error:'Invalid status'});o.status=req.body.status}write(d);res.json(o)});
app.get('/api/admin/products',auth,(req,res)=>res.json(read().products));
app.post('/api/admin/products',auth,(req,res)=>{const d=read(),b=req.body;const p={id:'p'+crypto.randomUUID(),name:b.name,category:b.category,price:Number(b.price),rating:Number(b.rating||5),stock:Number(b.stock||0),sizes:Array.isArray(b.sizes)?b.sizes:[],image:b.image||'',active:b.active!==false};if(!p.name||!p.category||!Number.isFinite(p.price))return res.status(400).json({error:'Invalid product'});d.products.push(p);write(d);res.status(201).json(p)});
app.put('/api/admin/products/:id',auth,(req,res)=>{const d=read(),p=d.products.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:'Product not found'});Object.assign(p,{...req.body,price:req.body.price===undefined?p.price:Number(req.body.price),stock:req.body.stock===undefined?p.stock:Number(req.body.stock)});write(d);res.json(p)});
app.delete('/api/admin/products/:id',auth,(req,res)=>{const d=read();d.products=d.products.filter(p=>p.id!==req.params.id);write(d);res.json({ok:true})});
app.get('/api/admin/settings',auth,(req,res)=>res.json(read().settings));
app.put('/api/admin/settings',auth,(req,res)=>{const d=read();if(req.body.shipping!==undefined)d.settings.shipping=Number(req.body.shipping);if(req.body.whatsapp!==undefined)d.settings.whatsapp=String(req.body.whatsapp);write(d);res.json(d.settings)});
app.use(express.static(PUBLIC));
app.get('/admin',(req,res)=>res.sendFile(path.join(PUBLIC,'admin','index.html')));
app.listen(PORT,()=>console.log(`FOUCSE running on http://localhost:${PORT}`));
