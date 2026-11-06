const {test,expect}=require('@playwright/test');
const {default:AxeBuilder}=require('@axe-core/playwright');

test('Compartidos: pantalla de acceso sin vulneraciones WCAG graves',async({page})=>{
  await page.goto('/compartidos.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#auth')).toBeVisible();
  const audit=await new AxeBuilder({page})
    .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  const serious=audit.violations.filter(v=>v.impact==='critical'||v.impact==='serious');
  expect(serious.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
});

test('Compartidos: acceso y formularios sin desbordamiento horizontal en iPhone pequeño',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  await page.goto('/compartidos.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#auth')).toBeVisible();
  await page.locator('#auth details summary').click();
  const width=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth
  }));
  expect(width.document).toBeLessThanOrEqual(width.viewport+2);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password-form input[name="password"]')).toBeVisible();
});
