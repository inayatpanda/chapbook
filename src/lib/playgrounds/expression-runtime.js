// Parse author formulas at build time; the iframe only interprets this small expression AST.
// This works under a strict CSP and never gives a formula access to window or arbitrary code.
import { parse } from 'acorn';
export function expressionAst(expression) {
  const source=String(expression||'0');
  if(source.length>4000) throw Error('Formula is too long');
  const program=parse('('+source+')',{ecmaVersion:'latest'});
  const ast=program.body[0]?.expression;
  if(program.body.length!==1||!ast)throw Error('Expected one formula');
  let count=0;
  function check(n,depth=0){
    if(++count>500||depth>40)throw Error('Formula is too complex');
    const next=x=>check(x,depth+1);
    switch(n.type){
      case 'Literal': if(n.regex||n.bigint)throw Error('Unsupported literal');break;
      case 'Identifier': if(['window','globalThis','document','constructor','__proto__','prototype'].includes(n.name))throw Error('Unsupported variable');break;
      case 'UnaryExpression': if(!['+','-','!','~'].includes(n.operator))throw Error('Unsupported operator');next(n.argument);break;
      case 'BinaryExpression': if(!['+','-','*','/','%','**','<','<=','>','>=','==','!=','===','!==','&','|','^','<<','>>','>>>'].includes(n.operator))throw Error('Unsupported operator');next(n.left);next(n.right);break;
      case 'LogicalExpression':next(n.left);next(n.right);break;
      case 'ConditionalExpression':next(n.test);next(n.consequent);next(n.alternate);break;
      case 'MemberExpression': if(n.computed||n.object.type!=='Identifier'||!['V','Math'].includes(n.object.name)||['constructor','__proto__','prototype'].includes(n.property.name))throw Error('Only V.name and Math.name are supported');break;
      case 'CallExpression': if(n.callee.type!=='MemberExpression'||n.callee.object.name!=='Math')throw Error('Only Math functions are supported');next(n.callee);n.arguments.forEach(next);break;
      default:throw Error('Unsupported formula syntax: '+n.type);
    }
  }
  check(ast);return ast;
}
export function evaluateExpression(n,V={},t=0){
  const ev=x=>evaluateExpression(x,V,t);
  switch(n.type){
    case 'Literal':return n.value;
    case 'Identifier':return n.name==='t'?t:n.name==='Infinity'?Infinity:n.name==='NaN'?NaN:Object.hasOwn(V,n.name)?V[n.name]:0;
    case 'MemberExpression':return n.object.name==='V'?(Object.hasOwn(V,n.property.name)?V[n.property.name]:0):Object.hasOwn(Math,n.property.name)?Math[n.property.name]:undefined;
    case 'CallExpression':{const fn=ev(n.callee);if(typeof fn!=='function')throw Error('Unknown Math function');return fn(...n.arguments.map(ev));}
    case 'ConditionalExpression':return ev(n.test)?ev(n.consequent):ev(n.alternate);
    case 'LogicalExpression':{const a=ev(n.left);return n.operator==='&&'?(a&&ev(n.right)):n.operator==='||'?(a||ev(n.right)):(a??ev(n.right));}
    case 'UnaryExpression':{const a=ev(n.argument);switch(n.operator){case '+':return +a;case '-':return -a;case '!':return !a;case '~':return ~a;}break;}
    case 'BinaryExpression':{const a=ev(n.left),b=ev(n.right);switch(n.operator){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '%':return a%b;case '**':return a**b;case '<':return a<b;case '<=':return a<=b;case '>':return a>b;case '>=':return a>=b;case '==':return a==b;case '!=':return a!=b;case '===':return a===b;case '!==':return a!==b;case '&':return a&b;case '|':return a|b;case '^':return a^b;case '<<':return a<<b;case '>>':return a>>b;case '>>>':return a>>>b;}break;}
  }
  throw Error('Unsupported formula');
}
export function expressionRuntime(expressions){
  const asts={};
  for(const expr of expressions){try{asts[String(expr)]=expressionAst(expr);}catch{asts[String(expr)]=null;}}
  const json=JSON.stringify(asts,(k,v)=>['start','end','raw'].includes(k)?undefined:v).replace(/</g,'\\u003c');
  return 'var FORMULAS='+json+';\n'+evaluateExpression.toString()+'\nfunction compileMathExpression(expr){var tree=FORMULAS[String(expr)];return tree?function(V,t){return evaluateExpression(tree,V,t);}:null;}';
}
