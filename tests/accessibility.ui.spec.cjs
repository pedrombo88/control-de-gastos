const {test,expect}=require("@playwright/test");
const {default:AxeBuilder}=require("@axe-core/playwright");

test("Las pantallas principales no presentan fallos graves automatizados de accesibilidad",async({page})=>{
  await page.goto("/?test=accessibility");
  const report={};
  for(const tab of ["home","transactions","budgets","savings","settings"]){
    await page.locator('.bottom-nav [data-tab="'+tab+'"]').click();
    const result=await new AxeBuilder({page})
      .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"])
      .analyze();
    const defects=result.violations.filter(v=>["critical","serious"].includes(v.impact));
    report[tab]=defects.map(v=>({id:v.id,impact:v.impact,description:v.help,targets:v.nodes.slice(0,5).map(n=>n.target)}));
  }
  const errors=Object.fromEntries(Object.entries(report).filter(([,v])=>v.length));
  expect(errors).toEqual({});
});
