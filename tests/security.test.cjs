const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const {webcrypto} = require("node:crypto");
const {TextEncoder,TextDecoder} = require("node:util");

function load(file){
    const win={crypto:webcrypto};
    const context=vm.createContext({
        window:win,crypto:webcrypto,TextEncoder,TextDecoder,
        btoa:s=>Buffer.from(s,"binary").toString("base64"),
        atob:s=>Buffer.from(s,"base64").toString("binary"),
        Blob,FileReader:class {readAsDataURL(){throw Error("Not supported by this unit test")}},
        console
    });
    vm.runInContext(fs.readFileSync(file,"utf8"),context);
    return win;
}

test("AES-256-GCM encrypts and decrypts compatible backup JSON",async()=>{
    const {BudvivaBackupCrypto:c}=load("backup-crypto.js");
    const input=JSON.stringify({version:2,transactions:[{amount:1305,title:"Ticket privado"}]});
    const encrypted=JSON.parse(await c.encrypt(input,"contraseña-de-prueba-2026"));
    assert.equal(encrypted.format,"budviva-encrypted-v1");
    assert.equal(encrypted.kdf,"PBKDF2-SHA256");
    assert.equal(encrypted.iterations,310000);
    assert.notEqual(encrypted.ciphertext,input);
    assert.equal(await c.decrypt(encrypted,"contraseña-de-prueba-2026"),input);
    await assert.rejects(()=>c.decrypt(encrypted,"contraseña-incorrecta-2026"),/incorrecta|dañada/);
    await assert.rejects(()=>c.encrypt(input,"corta"),/12/);
});

test("GCM authentication detects tampering",async()=>{
    const {BudvivaBackupCrypto:c}=load("backup-crypto.js");
    const encrypted=JSON.parse(await c.encrypt('{"version":2}',"contraseña-segura-2026"));
    const s=encrypted.ciphertext;
    encrypted.ciphertext=(s[0]==="A"?"B":"A")+s.slice(1);
    await assert.rejects(()=>c.decrypt(encrypted,"contraseña-segura-2026"));
});

test("Originals backup decoding rejects corrupt/oversize/duplicate records",()=>{
    const {BudvivaDocuments:d}=load("documents.js");
    const bytes=Buffer.from("originales locales");
    const record={
        id:"abc-123",name:"ticket.pdf",type:"application/pdf",size:bytes.length,
        createdAt:"2026-11-04T18:00:00.000Z",transactionIds:["txn1"],
        base64:bytes.toString("base64")
    };
    const out=d.decodeBundle([record]);
    assert.equal(out.length,1);
    assert.equal(out[0].size,bytes.length);
    assert.throws(()=>d.decodeBundle([record,record]),/no válidos|duplicados|Metadatos/);
    assert.throws(()=>d.decodeBundle([{...record,size:bytes.length+1}]),/tamaño/i);
    assert.throws(()=>d.decodeBundle([{...record,base64:"../not-base64"}]),/corruptos/i);
    assert.throws(()=>d.decodeBundle(Array(201).fill(record)),/demasiados/i);
});

test("No document is persisted remotely by the local originals module",()=>{
    const source=fs.readFileSync("documents.js","utf8");
    assert.match(source,/indexedDB\.open/);
    assert.doesNotMatch(source,/fetch\(/);
    assert.doesNotMatch(source,/XMLHttpRequest/);
});

test("Encrypted backups are compatible with deterministic AES-GCM vector", async () => {
    const {BudvivaBackupCrypto:c}=load("backup-crypto.js");
    const sample=${JSON.stringify(payload)};
    const output=await c.decrypt(JSON.parse(sample),"Budviva-test-contraseña-2026");
    assert.equal(output,${JSON.stringify(expected)});
});
