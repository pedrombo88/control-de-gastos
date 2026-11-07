/* Pruebas móviles de Compartidos con Supabase simulado: ninguna petición real ni borrado. */
const {test,expect}=require('@playwright/test');

async function setup(page,{blocked=false,deleteAllowed=false}={}){
  await page.addInitScript(({blocked,deleteAllowed})=>{
    const base='https://bsvtttcuqamjifnpuzlj.supabase.co';
    const fakeUser={id:'otp-ui-user',email:'otp-ui@example.invalid'};
    const fakeSession={access_token:'fake-access',refresh_token:'fake-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:fakeUser};
    localStorage.setItem('budviva-shared-session-v1',JSON.stringify(fakeSession));
    window.__otpCalls=[];
    const original=window.fetch.bind(window);
    window.fetch=async(input,options={})=>{
      const url=String(input);
      if(!url.startsWith(base))return original(input,options);
      const pathname=new URL(url).pathname;
      const body=options.body?JSON.parse(options.body):null;
      window.__otpCalls.push({pathname,body});
      const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
      if(pathname==='/auth/v1/user')return json(fakeUser);
      if(pathname==='/rest/v1/bv_members')return json([]);
      if(pathname==='/functions/v1/bv-delete-account'){
        if(body?.action==='check')return blocked?json({message:'Cuenta vinculada a Compartidos'},409):json({message:'Sin referencias compartidas'});
        if(body?.method==='email_otp')return deleteAllowed?json({message:'Cuenta eliminada'}):json({message:'Código incorrecto'},403);
        return json({message:'Acción no permitida'},400);
      }
      if(pathname==='/auth/v1/otp')return json({});
      return json({message:'Ruta no simulada: '+pathname},404);
    };
  },{blocked,deleteAllowed});
  await page.goto('/compartidos.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#setup')).toBeVisible();
  await page.locator('#setup details').filter({hasText:'Privacidad y baja de cuenta'}).locator('summary').click();
  await expect(page.locator('#send-deletion-otp')).toBeVisible();
}

test('OTP móvil: no envía códigos si hay referencias financieras',async({page})=>{
  await setup(page,{blocked:true});
  await page.locator('#send-deletion-otp').click();
  await expect(page.locator('#deletion-otp-status')).toContainText('No se ha podido enviar');
  await expect(page.locator('#delete-account-otp-form')).toBeHidden();
  const calls=await page.evaluate(()=>window.__otpCalls);
  expect(calls.filter(c=>c.pathname==='/auth/v1/otp')).toHaveLength(0);
  expect(calls.filter(c=>c.body?.method==='email_otp')).toHaveLength(0);
});

test('OTP móvil: solicita código sin crear usuario y rechaza código inválido',async({page})=>{
  await setup(page);
  await page.locator('#send-deletion-otp').click();
  await expect(page.locator('#delete-account-otp-form')).toBeVisible();
  await page.locator('#delete-account-otp-form [name=otp]').fill('123456');
  await page.locator('#delete-account-otp-form [name=confirmation]').fill('ELIMINAR CUENTA');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#delete-account-otp-form button[type=submit]').click();
  await expect(page.locator('#status')).toContainText('Código incorrecto');
  await expect(page.locator('#setup')).toBeVisible();
  const calls=await page.evaluate(()=>window.__otpCalls);
  const sent=calls.find(c=>c.pathname==='/auth/v1/otp');
  expect(sent?.body).toEqual({email:'otp-ui@example.invalid',create_user:false});
  const deletion=calls.find(c=>c.body?.method==='email_otp');
  expect(deletion?.body).toEqual({method:'email_otp',otp:'123456',confirm:'ELIMINAR CUENTA'});
});

test('OTP móvil: respuesta de éxito simulada limpia sesión y mantiene los datos locales',async({page})=>{
  await setup(page,{deleteAllowed:true});
  await page.evaluate(()=>localStorage.setItem('saldo-diario-data-v1','datos-financieros-privados'));
  await page.locator('#send-deletion-otp').click();
  await page.locator('#delete-account-otp-form [name=otp]').fill('123456');
  await page.locator('#delete-account-otp-form [name=confirmation]').fill('ELIMINAR CUENTA');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#delete-account-otp-form button[type=submit]').click();
  await expect(page.locator('#auth')).toBeVisible();
  await expect(page.locator('#status')).toContainText('Cuenta de acceso eliminada');
  const state=await page.evaluate(()=>({
    session:localStorage.getItem('budviva-shared-session-v1'),
    privateData:localStorage.getItem('saldo-diario-data-v1')
  }));
  expect(state.session).toBeNull();
  expect(state.privateData).toBe('datos-financieros-privados');
});

test('Cerrar la sesión en una pestaña oculta los datos en otra',{timeout:30000},async({page,context})=>{
  await setup(page);
  const other=await context.newPage();
  await setup(other);
  await page.evaluate(()=>localStorage.removeItem('budviva-shared-session-v1'));
  await expect(other.locator('#auth')).toBeVisible();
  await expect(other.locator('#setup')).toBeHidden();
  const token=await other.evaluate(()=>localStorage.getItem('budviva-shared-session-v1'));
  expect(token).toBeNull();
  await other.close();
});
