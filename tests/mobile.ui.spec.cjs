const {test,expect}=require("@playwright/test");
test.beforeEach(async ({page})=>{
  await page.goto('/?test=auditoria', {waitUntil:"domcontentloaded"});
  await expect(page.locator('#page-content')).not.toBeEmpty();
});
test("Las cinco pestañas están visibles en pantalla móvil",async ({page})=>{
  const nav=page.locator('.bottom-nav');
  await expect(nav.locator('.nav-item')).toHaveCount(5);
  for(const id of ["home","transactions","budgets","savings","settings"]){
    await expect(nav.locator('[data-tab="'+id+'"]')).toBeVisible();
  }
  const overflowing=await page.evaluate(()=>{
    const nav=document.querySelector(".bottom-nav");
    return nav.scrollWidth > nav.clientWidth + 4;
  });
  expect(overflowing).toBe(false);
});
test("Cada herramienta está en su apartado",async ({page})=>{
  await expect(page.locator("#page-content")).toContainText("Tu resumen");
  await page.locator('[data-tab="transactions"]').click();
  const view=page.locator("#page-content");
  for(const label of ["Importar","Recurrentes","Estadísticas"]){
    await expect(view).toContainText(label);
  }
  await page.locator('[data-tab="budgets"]').click();
  await expect(page.locator("#budget-alert-threshold")).toBeVisible();
  await page.locator('[data-tab="settings"]').click();
  await expect(view).toContainText("Copias y exportación");
  await expect(view.locator("#budget-alert-threshold")).toHaveCount(0);
  await expect(view).not.toContainText("Cargar datos de demostración");
});
test("Ahorro separa análisis y objetivos",async ({page})=>{
  await page.locator('[data-tab="savings"]').click();
  await expect(page.locator(".saving-subtabs button")).toHaveCount(2);
  await expect(page.locator("#page-content")).toContainText("Tu plan de reducción");
  await page.locator('[data-saving-view="goals"]').click();
  await expect(page.locator("#page-content")).toContainText("Mis objetivos de ahorro");
  await expect(page.locator("#page-content")).not.toContainText("Tu plan de reducción");
  await page.locator('[data-saving-view="analysis"]').click();
  await expect(page.locator("#page-content")).toContainText("Tu plan de reducción");
});
test("El movimiento se guarda y aparece en Movimientos",async ({page})=>{
  await page.locator('[data-action="new-expense"]').first().click();
  await expect(page.locator("#transaction-dialog")).toBeVisible();
  await page.locator("#entry-amount").fill("12,45");
  await page.locator("#entry-title").fill("Auditoría chocolate");
  await page.locator("#transaction-form button[type=submit]").click();
  await expect(page.locator("#transaction-dialog")).not.toBeVisible();
  await page.locator('[data-tab="transactions"]').click();
  await expect(page.locator("#page-content")).toContainText("Auditoría chocolate");
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem("saldo-diario-data-v1")));
  expect(persisted.transactions.some(t=>t.title==="Auditoría chocolate"&&t.amount===1245)).toBe(true);
});
test("Copias cifradas y páginas legales accesibles",async ({page})=>{
  await page.locator('[data-tab="settings"]').click();
  await page.getByText("Copia cifrada",{exact:true}).click();
  await expect(page.locator("#backup-password-dialog")).toBeVisible();
  await page.locator('#backup-password-dialog [data-close]').click();
  await expect(page.locator("#backup-password-dialog")).not.toBeVisible();
  const links=page.locator('#page-content a[href*=".html"]');
  await expect(links).toHaveCount(3);
  for(const href of ["datos-y-privacidad.html","privacidad.html","soporte.html"]){
    await expect(page.locator('#page-content a[href="./'+href+'"]')).toBeVisible();
  }
});


test("Un movimiento permite adjuntar original y exportarlo en una copia completa",async ({page})=>{
  await page.locator('[data-action="new-expense"]').first().click();
  await page.locator("#entry-amount").fill("8,35");
  await page.locator("#entry-title").fill("Ticket de auditoría");
  await page.locator("#transaction-form button[type=submit]").click();
  await expect(page.locator("#transaction-dialog")).not.toBeVisible();
  await page.locator('[data-tab="transactions"]').click();
  await page.locator('[data-edit-id]').filter({hasText:"Ticket de auditoría"}).click();
  await expect(page.locator("#attach-original-btn")).toBeVisible();
  await page.setInputFiles('#attach-original-file',{
    name:"justificante.txt",
    mimeType:"text/plain",
    buffer:Buffer.from("COMERCIO DE PRUEBA\nTOTAL 8,35\n")
  });
  await expect(page.locator("#transaction-dialog")).not.toBeVisible();
  await expect(page.locator('[data-view-originals]')).toBeVisible();
  await page.locator('[data-view-originals]').click();
  await expect(page.locator('#documents-dialog')).toBeVisible();
  await expect(page.locator('#documents-dialog-content')).toContainText("justificante.txt");
  await page.locator('#documents-dialog [data-close]').click();
  await page.locator('[data-tab="settings"]').click();
  const downloadPromise=page.waitForEvent("download");
  await page.getByText("Copia personal",{exact:true}).click();
  const dl=await downloadPromise;
  expect(dl.suggestedFilename()).toMatch(/^budviva-completa-\d{4}-\d{2}-\d{2}\.json$/);
  const filePath=await dl.path();
  const fs=require("node:fs");
  const data=JSON.parse(fs.readFileSync(filePath,"utf8"));
  expect(data.transactions).toHaveLength(1);
  expect(data.transactions[0].sourceDocumentIds).toHaveLength(1);
  expect(data.attachments).toHaveLength(1);
  expect(data.attachments[0].name).toBe("justificante.txt");
  expect(Buffer.from(data.attachments[0].base64,"base64").toString("utf8")).toContain("TOTAL 8,35");
});


function receiptPDF(){
  // PDF elemental con xref válido, Helvetica y tres líneas de texto. Ningún recurso de red.
  const content=[
    "BT /F1 15 Tf 40 740 Td (TIENDA PRUEBA) Tj",
    "0 -26 Td (PAN 2,50) Tj",
    "0 -26 Td (TOTAL 2,50) Tj ET"
  ].join("\n");
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length "+Buffer.byteLength(content,"latin1")+" >>\nstream\n"+content+"\nendstream"
  ];
  let doc="%PDF-1.4\n",offsets=[0];
  for(let i=0;i<objects.length;i++){
    offsets.push(Buffer.byteLength(doc,"latin1"));
    doc+=(i+1)+" 0 obj\n"+objects[i]+"\nendobj\n";
  }
  const start=Buffer.byteLength(doc,"latin1");
  doc+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
  for(const n of offsets.slice(1))doc+=String(n).padStart(10,"0")+" 00000 n \n";
  doc+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+start+"\n%%EOF\n";
  return Buffer.from(doc,"latin1");
}
test("El importador lee un PDF auténtico desde la biblioteca local PDF.js",async({page})=>{
  await page.locator('[data-tab="transactions"]').click();
  await page.locator('#page-content [data-action="smart-import"]').click();
  await expect(page.locator('#page-content')).toContainText("Importar movimientos");
  await page.locator('#smart-import-file').setInputFiles({
    name:"ticket-auditoria.pdf",
    mimeType:"application/pdf",
    buffer:receiptPDF()
  });
  await expect(page.locator('[data-import-row]')).toHaveCount(1,{timeout:20000});
  await expect(page.locator('#smart-import-status')).toContainText("1 posibles movimientos");
  await expect(page.locator('[data-import-field="title"]')).toHaveValue("TIENDA PRUEBA");
  await expect(page.locator('[data-receipt-field="name"]')).toHaveValue("PAN");
  await expect(page.locator('[data-import-field="amount"]')).toHaveValue("2,50");
});


test("OCR de imagen funciona con Tesseract y español descargados desde Budviva",async({page})=>{
  test.setTimeout(100000);
  await page.locator('[data-tab="transactions"]').click();
  await page.locator('#page-content [data-action="smart-import"]').click();
  const png64=await page.evaluate(()=>{
    const canvas=document.createElement("canvas");
    canvas.width=1100;canvas.height=830;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#000";ctx.textBaseline="top";ctx.textAlign="left";
    ctx.font="bold 68px Arial";ctx.fillText("MERCADO PRUEBA",65,70);
    ctx.font="bold 56px Arial";ctx.fillText("PAN   2,00",65,230);
    ctx.fillText("AGUA   10,34",65,340);
    ctx.font="bold 67px Arial";ctx.fillText("TOTAL 12,34",65,540);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#smart-import-file").setInputFiles({
    name:"ticket-auditoria.png",mimeType:"image/png",buffer:Buffer.from(png64,"base64")
  });
  await expect(page.locator('[data-import-row]')).toHaveCount(1,{timeout:85000});
  await expect(page.locator('[data-import-field="amount"]')).toHaveValue("12,34");
});


test("Auditoría limpieza: presupuesto sin límites se despliega bajo demanda",async({page})=>{
  await page.locator('[data-tab="budgets"]').click();
  await expect(page.locator('#page-content')).not.toContainText("Crea tu primer presupuesto");
  const disclosure=page.locator('details.budget-extra');
  await expect(disclosure).toHaveCount(1);
  await expect(disclosure).not.toHaveAttribute("open","");
  await expect(disclosure.locator('[data-budget-category="alimentacion"]')).not.toBeVisible();
  await disclosure.locator('summary').click();
  await expect(disclosure.locator('[data-budget-category="alimentacion"]')).toBeVisible();
  await disclosure.locator('[data-budget-category="alimentacion"]').click();
  await expect(page.locator('#budget-dialog')).toBeVisible();
});

test("Auditoría limpieza: solo un aviso de importación en ahorro sin tickets",async({page})=>{
  await page.locator('[data-tab="savings"]').click();
  await expect(page.locator('.saving-no-tickets')).toHaveCount(1);
  await expect(page.locator('.saving-no-tickets [data-action="smart-import"]')).toHaveCount(1);
  await expect(page.locator('#page-content')).not.toContainText("Todavía no hay tickets");
  await expect(page.locator('#page-content')).not.toContainText("Sin productos prescindibles");
});
