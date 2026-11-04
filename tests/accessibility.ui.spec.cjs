const {test,expect}=require("@playwright/test");
const {default:AxeBuilder}=require("@axe-core/playwright");

test("Cinco apartados de Budviva cumplen controles WCAG críticos y graves en cuatro temas",async({page})=>{
  await page.goto("/?test=accessibility");
  const report={};
  for(const theme of ["oceano","esmeralda","arena","noche"]){
    await page.locator('.bottom-nav [data-tab="settings"]').click();
    await page.locator('[data-theme-choice="'+theme+'"]').click();
    for(const tab of ["home","transactions","budgets","savings","settings"]){
      await page.locator('.bottom-nav [data-tab="'+tab+'"]').click();
      const result=await new AxeBuilder({page})
        .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"])
        .analyze();
      const defects=result.violations.filter(v=>["critical","serious"].includes(v.impact));
      if(defects.length)report[theme+" / "+tab]=defects.map(v=>({
        id:v.id,impact:v.impact,description:v.help,
        targets:v.nodes.slice(0,10).map(n=>n.target)
      }));
    }
  }
  expect(report).toEqual({});
});
