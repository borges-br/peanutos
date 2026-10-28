const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve('apps/web/src'), findings=[],routes=[];
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(file.endsWith('.tsx')){
 const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(file.endsWith(path.sep+'page.tsx'))routes.push(path.relative(root,file).replaceAll('\\','/'));
 function visit(node){if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
  const tag=node.tagName.getText(source),attrs=node.attributes.properties,has=name=>attrs.some(a=>a.name?.getText(source)===name);
  if(['button','Button'].includes(tag)&&!has('onClick')&&!has('disabled')&&!has('planned')){
   let parent=node.parent,inForm=false;while(parent){if(ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(source)==='form')inForm=true;parent=parent.parent;}
   const type=attrs.find(a=>a.name?.getText(source)==='type')?.initializer?.getText(source);
   if(!inForm && type!=='"submit"' && type!=="'submit'")findings.push({file:path.relative(root,file).replaceAll('\\','/'),line:source.getLineAndCharacterOfPosition(node.getStart()).line+1,issue:'button-without-action',text:node.getText(source).slice(0,170)});
  }
 }ts.forEachChild(node,visit);}visit(source);
 }} }
scan(root);
const report={generatedAt:new Date().toISOString(),routes:routes.sort(),routeCount:routes.length,actionCandidates:findings};
fs.mkdirSync('data/qa/ui-audit',{recursive:true});fs.writeFileSync('data/qa/ui-audit/source-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({routeCount:routes.length,actionCandidates:findings},null,2));
