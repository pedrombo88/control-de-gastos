const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('iOS Compartidos: servicio HTTPS, acceso independiente sin transmitir datos privados',()=>{
  const source=fs.readFileSync('ios-native/Sources/SharedExpensesScreen.swift','utf8');
  const main=fs.readFileSync('ios-native/Sources/MainScreens.swift','utf8');
  assert.match(source,/https:\/\/pedrombo88\.github\.io\/control-de-gastos\/compartidos\.html/);
  assert.match(source,/import SafariServices/);
  assert.match(source,/SFSafariViewController\(url: SharedExpensesService\.url\)/);
  assert.match(source,/fullScreenCover\(isPresented: \$showingShared\)/);
  assert(source.includes('SharedExpensesBrowser(isPresented: $showingShared)'));
  assert(source.includes('controller.delegate = context.coordinator'));
  assert(source.includes('func safariViewControllerDidFinish(_ controller: SFSafariViewController)'));
  assert(source.includes('isPresented = false'));
  assert.match(main,/tool\("Compartidos","person\.2",\.shared\)/);
  assert.match(main,/case \.shared: SharedExpensesScreen\(\)/);
  assert.doesNotMatch(source,/auth\.users|apikey|publishableKey|Authorization|\?token=|\?email=|\/rest\/v1\/bv_expenses/);
});
test('iOS Compartidos: la versión nativa conserva su flujo de movimientos y herramientas',()=>{
  const source=fs.readFileSync('ios-native/Sources/MainScreens.swift','utf8');
  for(const tool of ['importFiles','recurring','statistics','shared']){
    assert.match(source,new RegExp('case \\.'+tool+'\\b|case '+tool+'\\b'));
  }
  assert.match(source,/EntryEditor\(entry:editing\)/);
  const root=fs.readFileSync('ios-native/Sources/BudvivaApp.swift','utf8');
  assert(root.includes('NavigationStack { MovementsScreen() }'));
});

test('iOS Movimientos: el borrado requiere confirmación antes de alterar los datos',()=>{
  const source=fs.readFileSync('ios-native/Sources/MainScreens.swift','utf8');
  assert(source.includes('Button("Eliminar movimiento",role:.destructive) { confirmDelete=true }'));
  assert(source.includes('.confirmationDialog("¿Eliminar este movimiento?",isPresented:$confirmDelete'));
  assert(source.includes('Button("Eliminar definitivamente",role:.destructive)'));
  assert(!source.includes('store.delete(entry!.id);dismiss()'));
  assert(source.includes('pendingDeletionIDs=offsets.compactMap'));
  assert(source.includes('showDeleteConfirmation = !pendingDeletionIDs.isEmpty'));
  assert(source.includes('.confirmationDialog("¿Eliminar los movimientos seleccionados?"'));
  assert(!/onDelete\s*\{[\s\S]{0,150}store\.delete\(/.test(source));
});
