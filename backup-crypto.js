/* Budviva: exportación cifrada opcional. AES-256-GCM + PBKDF2-SHA256. */
(function(root){
"use strict";
const FORMAT="budviva-encrypted-v1",ROUNDS=310000;
const encoder=new TextEncoder(),decoder=new TextDecoder();
function bytesToBase64(array){
 let binary="";const chunk=32768;
 for(let i=0;i<array.length;i+=chunk)binary+=String.fromCharCode(...array.subarray(i,i+chunk));
 return btoa(binary);
}
function base64ToBytes(input){
 if(typeof input!=="string"||!/^[A-Za-z0-9+/]*={0,2}$/.test(input))throw Error("Copia cifrada con formato incorrecto.");
 const binary=atob(input),data=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);return data;
}
async function key(password,salt){
 if(typeof password!=="string"||password.length<12||password.length>256)throw Error("La contraseña debe tener entre 12 y 256 caracteres.");
 if(!root.crypto?.subtle)throw Error("Este navegador no dispone de cifrado seguro.");
 const imported=await root.crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveKey"]);
 return root.crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:ROUNDS},imported,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function encrypt(text,password){
 const salt=root.crypto.getRandomValues(new Uint8Array(16));
 const iv=root.crypto.getRandomValues(new Uint8Array(12));
 const secret=await key(password,salt);
 const ciphertext=new Uint8Array(await root.crypto.subtle.encrypt({name:"AES-GCM",iv},secret,encoder.encode(text)));
 return JSON.stringify({format:FORMAT,kdf:"PBKDF2-SHA256",iterations:ROUNDS,salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(ciphertext)});
}
function isEncrypted(object){return !!object&&typeof object==="object"&&object.format===FORMAT;}
async function decrypt(object,password){
 if(!isEncrypted(object)||object.iterations!==ROUNDS||object.kdf!=="PBKDF2-SHA256")throw Error("Formato cifrado desconocido.");
 const salt=base64ToBytes(object.salt),iv=base64ToBytes(object.iv),bytes=base64ToBytes(object.ciphertext);
 if(salt.length!==16||iv.length!==12)throw Error("Los datos de cifrado son incorrectos.");
 try{
   const secret=await key(password,salt);
   const text=await root.crypto.subtle.decrypt({name:"AES-GCM",iv},secret,bytes);
   return decoder.decode(text);
 }catch(err){throw Error("Contraseña incorrecta o copia cifrada dañada.");}
}
root.BudvivaBackupCrypto={encrypt,decrypt,isEncrypted};
})(window);