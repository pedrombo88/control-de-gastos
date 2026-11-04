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
  await expect(links).toHaveCount(2);
  for(const href of ["privacidad.html","soporte.html"]){
    await expect(page.locator('#page-content a[href*="'+href+'"]')).toBeVisible();
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
  await page.getByText("Copia completa",{exact:true}).click();
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
