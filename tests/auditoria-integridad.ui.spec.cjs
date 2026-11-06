const {test,expect}=require('@playwright/test');

test('Dos pestañas: los cambios externos no pueden sobrescribirse',async({page,context})=>{
  await page.goto('/?auditoria=concurrencia');
  const other=await context.newPage();
  await other.goto('/?auditoria=concurrencia');
  await expect(other.locator('#page-content')).not.toBeEmpty();
  // La segunda pestaña deja un formulario abierto antes de un cambio externo.
  await other.locator('[data-action="new-expense"]').first().click();
  await other.locator('#entry-amount').fill('19,20');
  await other.locator('#entry-title').fill('Movimiento pendiente en otra pestaña');
  await page.locator('[data-action="new-expense"]').first().click();
  await page.locator('#entry-amount').fill('11,30');
  await page.locator('#entry-title').fill('Movimiento protegido de la primera pestaña');
  await page.locator('#transaction-form button[type=submit]').click();
  await expect(page.locator('#transaction-dialog')).not.toBeVisible();
  await other.locator('#transaction-form button[type=submit]').click();
  await expect(other.locator('#transaction-dialog')).toBeVisible();
  const persisted=await other.evaluate(()=>JSON.parse(localStorage.getItem('saldo-diario-data-v1')));
  expect(persisted.transactions.map(t=>t.title)).toContain('Movimiento protegido de la primera pestaña');
  expect(persisted.transactions.map(t=>t.title)).not.toContain('Movimiento pendiente en otra pestaña');
  await expect(other.locator('#toast')).toContainText('otra pestaña');
  await other.close();
});

test('Actualizar sin conexión conserva datos y no provoca recarga',async({page,context})=>{
  await page.goto('/?auditoria=offline');
  await page.locator('[data-action="new-expense"]').first().click();
  await page.locator('#entry-amount').fill('3,40');
  await page.locator('#entry-title').fill('Movimiento guardado sin borrar');
  await page.locator('#transaction-form button[type=submit]').click();
  await page.locator('[data-tab="settings"]').click();
  const url=page.url();
  await context.setOffline(true);
  try{
    await page.locator('[data-action="refresh-app"]').first().click();
    await expect(page.locator('#toast')).toContainText('Sin conexión');
    expect(page.url()).toBe(url);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('saldo-diario-data-v1')));
    expect(stored.transactions.some(t=>t.title==='Movimiento guardado sin borrar')).toBe(true);
  }finally{await context.setOffline(false);}
});
