/* Aislamiento de la pantalla de Compartidos frente a HTML inyectado.
   El backend se simula; ninguna credencial ni cuenta real se utiliza. */
const {test,expect}=require('@playwright/test');

test('Compartidos: texto de gastos, miembros y grupo nunca ejecuta HTML inyectado',async({page})=>{
  await page.addInitScript(()=>{
    const backend='https://bsvtttcuqamjifnpuzlj.supabase.co';
    const userId='xss-test-owner',householdId='xss-group';
    const now=Math.floor(Date.now()/1000);
    const session={
      access_token:'mock-token',refresh_token:'mock-refresh',
      expires_at:now+3600,user:{id:userId,email:'owner@example.invalid'}
    };
    localStorage.setItem('budviva-shared-session-v1',JSON.stringify(session));
    window.__xssExecuted=false;
    const maliciousTitle='<img src=x onerror="window.__xssExecuted=true">';
    const maliciousName='<svg onload="window.__xssExecuted=true"></svg>';
    const response=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    const original=window.fetch.bind(window);
    window.fetch=(request,options)=>{
      const url=String(request);
      if(!url.startsWith(backend))return original(request,options);
      const target=new URL(url);
      if(target.pathname==='/auth/v1/user')return Promise.resolve(response({id:userId,email:'owner@example.invalid'}));
      if(target.pathname==='/rest/v1/bv_members'){
        const own=target.searchParams.get('user_id')==='eq.'+userId;
        return Promise.resolve(response(own
          ?[{household_id:householdId,user_id:userId,display_name:maliciousName}]
          :[{user_id:userId,display_name:maliciousName,joined_at:'2026-10-01T12:00:00Z'},
            {user_id:'xss-test-partner',display_name:'Segundo miembro',joined_at:'2026-10-02T12:00:00Z'}]));
      }
      if(target.pathname==='/rest/v1/bv_households')return Promise.resolve(response([{
        id:householdId,title:'Grupo '+maliciousTitle,owner_id:userId
      }]));
      if(target.pathname==='/rest/v1/bv_expenses')return Promise.resolve(response([{
        id:'xss-expense',author_id:'xss-test-partner',payer_id:'xss-test-partner',title:maliciousTitle,category:'otros',
        amount_cents:2599,share_basis_points_a:5000,spent_on:'2026-11-06',
        created_at:'2026-11-06T12:00:00Z'
      }]));
      if(target.pathname==='/rest/v1/bv_settlements')return Promise.resolve(response([]));
      if(target.pathname==='/rest/v1/bv_household_closure_approvals')return Promise.resolve(response([]));
      return Promise.resolve(new Response(JSON.stringify({message:'No mock for '+target.pathname}),{status:404,headers:{'Content-Type':'application/json'}}));
    };
  });

  await page.goto('/compartidos.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#dashboard')).toBeVisible();
  await expect(page.locator('#home-name')).toContainText('<img src=x');
  await expect(page.locator('#members')).toContainText('<svg onload=');
  await expect(page.locator('#expense-list')).toContainText('<img src=x');
  await expect(page.locator('#activity-list')).toContainText('<img src=x');
  expect(await page.locator('img[src="x"],svg[onload]').count()).toBe(0);
  expect(await page.evaluate(()=>window.__xssExecuted)).toBe(false);
  await expect(page.locator('#expense-list')).toContainText('25,99');
});
