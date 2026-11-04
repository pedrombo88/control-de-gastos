const {test,expect}=require("@playwright/test");
const fs=require("node:fs");
test("Capturas de las pantallas reales de Budviva para revisión visual",async({page})=>{
  fs.mkdirSync("ui-capturas",{recursive:true});
  await page.goto("/?capturas=auditoria",{waitUntil:"networkidle"});
  const views=["home","transactions","budgets","savings","settings"];
  for(const tab of views){
    await page.locator('.bottom-nav [data-tab="'+tab+'"]').click();
    await expect(page.locator("#page-content")).not.toBeEmpty();
    await page.screenshot({path:"ui-capturas/"+tab+"-oceano.png",fullPage:true,animations:"disabled"});
  }
  await page.locator('[data-theme-choice="noche"]').click();
  for(const tab of ["home","savings","settings"]){
    await page.locator('.bottom-nav [data-tab="'+tab+'"]').click();
    await page.screenshot({path:"ui-capturas/"+tab+"-noche.png",fullPage:true,animations:"disabled"});
  }
});
