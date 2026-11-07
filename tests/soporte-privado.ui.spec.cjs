/* Budviva: el soporte privado no se anuncia antes de estar verificado. */
const {test,expect}=require('@playwright/test');

test('En la beta el soporte no presenta direcciones de correo sin comprobar',async({page})=>{
  await page.goto('/soporte.html');
  await expect(page.getByRole('heading',{name:'Atención privada'})).toBeVisible();
  await expect(page.locator('#private-support-link')).toBeHidden();
  await expect(page.locator('#private-support-state')).toContainText('Todavía no hay un buzón de soporte verificado');
  await expect(page.getByRole('link',{name:/incidencias de GitHub/i})).toBeVisible();
});

test('Soporte en iPhone estrecho: aviso visible y sin scroll horizontal',async({page})=>{
  await page.setViewportSize({width:320,height:720});
  await page.goto('/soporte.html');
  await expect(page.locator('#private-support-state')).toBeVisible();
  const metrics=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  expect(metrics.doc).toBeLessThanOrEqual(metrics.viewport);
});
