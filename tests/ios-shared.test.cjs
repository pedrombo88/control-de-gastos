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
