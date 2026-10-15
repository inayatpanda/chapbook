import test from 'node:test';
import assert from 'node:assert/strict';
import {expressionAst,evaluateExpression,expressionRuntime} from './expression-runtime.js';
test('formulas evaluate arithmetic, sliders, curves, ternaries and colour strings',()=>{
 const evaluate=(s,v,t)=>evaluateExpression(expressionAst(s),v,t);
 assert.equal(evaluate('days * rate * (1 + buffer/100)',{days:3,rate:100,buffer:10}),330);
 assert.equal(evaluate('Math.pow(t,2)',{},0.5),0.25);
 assert.equal(evaluate("'rgb('+Math.round(V.r)+',0,0)'",{r:127.5}),'rgb(128,0,0)');
 assert.equal(evaluate('V.x > 3 ? 1 : 0',{x:4}),1);
});
test('formulas cannot execute arbitrary JavaScript or reach browser globals',()=>{
 for(const source of ['window.location','V.constructor','Math.constructor("alert(1)")()','(()=>1)()','V.x=3','new Date()'])assert.throws(()=>expressionAst(source),source);
 assert.doesNotMatch(expressionRuntime(['t*t']),/new Function|eval\(/);
});
