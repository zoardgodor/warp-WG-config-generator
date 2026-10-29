const generalasgomb=document.getElementById("generalasgomb");
const gombszoveg=document.getElementById("gombszoveg");
const allapot=document.getElementById("allapot");
const eredmeny=document.getElementById("eredmeny");
const konfig=document.getElementById("konfig");
const qrcode=document.getElementById("qrcode");
const masolasi=document.getElementById("masolasi");

function ertek(id){
return document.getElementById(id).value.trim();
}

function base64(adat){
let szoveg="";
for(let i=0;i<adat.length;i++)szoveg+=String.fromCharCode(adat[i]);
return btoa(szoveg);
}

function cimlista(cim){
return cim.split(",").map(x=>x.trim()).filter(Boolean).join(", ");
}

function cimkiegeszt(cim,ipv6){
if(!cim)return "";
if(cim.includes("/"))return cim;
return cim+(ipv6?"/128":"/32");
}

function confkeszit(adat,privat){
const cfg=adat.config;
const interf=cfg.interface||{};
const peer=(cfg.peers||[])[0];
if(!peer)throw new Error("The API did not return a WireGuard peer.");
const cim=ertek("cim")||[cimkiegeszt(interf.addresses?.v4,false),cimkiegeszt(interf.addresses?.v6,true)].filter(Boolean).join(", ");
if(!cim)throw new Error("The API did not return interface addresses.");
const dns=ertek("dns")||"1.1.1.1, 1.0.0.1";
const mtu=parseInt(ertek("mtu"),10)||1280;
const vegpont=ertek("vegpont")||peer.endpoint?.host||"engage.cloudflareclient.com:2408";
const eng=cimlista(ertek("engedelyezett")||"0.0.0.0/0, ::/0");
const sor=[
"[Interface]",
"PrivateKey = "+privat,
"Address = "+cim,
"DNS = "+cimlista(dns),
"MTU = "+mtu,
"",
"[Peer]",
"PublicKey = "+peer.public_key,
"AllowedIPs = "+eng,
"Endpoint = "+vegpont,
"PersistentKeepalive = 25",
""
];
return sor.join("\n");
}

async function generalas(){
generalasgomb.disabled=true;
gombszoveg.textContent="Generating";
allapot.textContent="Generating keys and requesting WARP registration…";
eredmeny.hidden=true;
masolasi.textContent="";
qrcode.innerHTML="";
try{
if(!window.nacl)throw new Error("The key-generation library could not be loaded. Check your internet connection and reload the page.");
const kulcs=nacl.box.keyPair();
const privat=base64(kulcs.secretKey);
const nyilvanos=base64(kulcs.publicKey);
const valasz=await fetch("api.php",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
key:nyilvanos,
type:ertek("eszkoz")||"Linux",
model:ertek("modell")||"PC",
locale:ertek("nyelv")||"en_US"
})
});
let adat;
try{adat=await valasz.json()}catch(e){throw new Error("The server returned an unreadable response. Check that api.php is uploaded correctly.")}
if(!valasz.ok||adat.error)throw new Error(adat.error||"Registration failed with HTTP "+valasz.status+".");
const szoveg=confkeszit(adat,privat);
konfig.value=szoveg;
new QRCode(qrcode,{text:szoveg,width:204,height:204,colorDark:"#111111",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.L});
eredmeny.hidden=false;
allapot.textContent="Configuration generated on this device.";
eredmeny.scrollIntoView({behavior:"smooth",block:"start"});
}catch(e){
allapot.textContent=e.message||"Something went wrong. Please try again.";
}finally{
generalasgomb.disabled=false;
gombszoveg.textContent="Generate";
}
}

generalasgomb.addEventListener("click",generalas);

document.getElementById("masolasgomb").addEventListener("click",async()=>{
try{
await navigator.clipboard.writeText(konfig.value);
masolasi.textContent="Configuration copied to clipboard.";
}catch(e){
konfig.focus();
konfig.select();
const ok=document.execCommand("copy");
masolasi.textContent=ok?"Configuration copied to clipboard.":"Copy failed. Select and copy the text manually.";
}
});

document.getElementById("letoltesgomb").addEventListener("click",()=>{
const fajl=new Blob([konfig.value],{type:"text/plain;charset=utf-8"});
const link=document.createElement("a");
link.href=URL.createObjectURL(fajl);
link.download="warp.conf";
document.body.appendChild(link);
link.click();
link.remove();
URL.revokeObjectURL(link.href);
});
