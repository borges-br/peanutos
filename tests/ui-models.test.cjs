const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
function load(file){const m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);return m.exports;}
const {emailDocument,emailText}=load('apps/web/src/lib/email-editor.ts');
const {matchDestinations}=load('apps/web/src/lib/navigation.ts');
test('visual email editing preserves approved formatting and literal data without accepting arbitrary HTML',()=>{
 const value='Olá, {cliente}.\n\n**Total: {total}**\nVencimento: {vencimento}\n\n[Consultar](https://example.invalid/pagar)';
 assert.equal(emailText(emailDocument(value)),value);
 assert.equal(emailText(emailDocument('<img onerror=alert(1)>')), '<img onerror=alert(1)>');
 const {renderBillingEmail}=require('../packages/utils/dist/billing-email');assert.ok(!renderBillingEmail({subject:'QA',body:emailText(emailDocument('<img onerror=alert(1)>'))},{}).html.includes('<img'));
});
test('intent search resolves ordinary terms, honors roles and promotes frequently opened destinations',()=>{
 assert.ok(matchDestinations('cobrar boleto','OWNER').some(d=>d.href==='/dashboard/invoices'));
 assert.ok(matchDestinations('trocar cor','OWNER').some(d=>d.href.includes('aparencia')));
 assert.ok(!matchDestinations('pix','TECHNICIAN').some(d=>d.href==='/dashboard/invoices'));
 assert.equal(matchDestinations('','OWNER',{'/dashboard/templates-email':15})[0].href,'/dashboard/templates-email');
});
