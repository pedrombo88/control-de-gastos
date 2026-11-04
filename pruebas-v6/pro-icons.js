/* Iconografía vectorial coherente para la interfaz V6.3. Sin dependencias. */
(function(root){
"use strict";
const shapes={"🛒":"<circle cx=\"9\" cy=\"21\" r=\"1\"/><circle cx=\"20\" cy=\"21\" r=\"1\"/><path d=\"M1 2h3l3 14h13l2-10H5\"/>","🏠":"<path d=\"m3 10 9-7 9 7v10H3z\"/><path d=\"M9 20v-7h6v7\"/>","🚗":"<path d=\"M5 17H3v-6l2-5h14l2 5v6h-2\"/><path d=\"M5 17h14M5 11h14\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><circle cx=\"17\" cy=\"17\" r=\"2\"/>","🛍️":"<path d=\"M4 8h16l-1 13H5z\"/><path d=\"M9 9V6a3 3 0 0 1 6 0v3\"/>","💊":"<path d=\"M10 4a5 5 0 0 1 7 7l-6 6a5 5 0 0 1-7-7z\"/><path d=\"m8 8 8 8\"/>","🎬":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 5l3 5M15 5l3 5\"/><path d=\"m10 13 5 3-5 3z\"/>","📚":"<path d=\"M4 4h7v16H4zM13 4h7v16h-7z\"/><path d=\"M6 8h3M15 8h3M6 12h3M15 12h3\"/>","📱":"<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"2\"/><path d=\"M11 18h2\"/>","✨":"<path d=\"m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z\"/>","💼":"<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18\"/>","💡":"<path d=\"M9 18h6M10 22h4M8 15a7 7 0 1 1 8 0l-1 3H9z\"/>","🎁":"<rect x=\"3\" y=\"9\" width=\"18\" height=\"12\" rx=\"1\"/><path d=\"M12 9v12M3 13h18M12 9c-8 0-8-7-4-7 3 0 4 4 4 7zm0 0c8 0 8-7 4-7-3 0-4 4-4 7z\"/>","💰":"<path d=\"M8 4h8l-2 5c4 3 6 6 6 9 0 3-3 4-8 4s-8-1-8-4c0-3 2-6 6-9z\"/><path d=\"M9 13h6m-3-3v8\"/>","🔁":"<path d=\"M4 7h14l-3-3m3 3-3 3M20 17H6l3-3m-3 3 3 3\"/>","🧾":"<path d=\"M5 2h14v20l-3-2-4 2-4-2-3 2z\"/><path d=\"M9 8h6M9 12h6M9 16h4\"/>","📊":"<path d=\"M4 21V12h4v9M10 21V5h4v16M16 21v-9h4v9M2 21h20\"/>","↗":"<path d=\"M5 18 19 4M9 4h10v10\"/>","↘":"<path d=\"m5 6 14 14M9 20h10V10\"/>","📷":"<path d=\"M3 7h4l2-3h6l2 3h4v13H3z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>","🔎":"<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m16 16 5 5\"/>","🎯":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>","📦":"<path d=\"m12 2 9 5v10l-9 5-9-5V7z\"/><path d=\"m3 7 9 5 9-5M12 12v10\"/>","📥":"<path d=\"M4 15v6h16v-6M12 2v14m-5-5 5 5 5-5\"/>","📈":"<path d=\"M3 18 9 12l4 4 8-9M15 7h6v6\"/>","🏡":"<path d=\"m3 11 9-8 9 8v10H3z\"/><path d=\"M9 21v-7h6v7M7 6V3\"/>","🗑️":"<path d=\"M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6\"/>","🔐":"<rect x=\"4\" y=\"10\" width=\"16\" height=\"12\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/><circle cx=\"12\" cy=\"16\" r=\"1\"/>"};
const glyphs=Object.keys(shapes).sort((a,b)=>b.length-a.length);
const re=new RegExp(glyphs.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
function icon(symbol){
 const path=shapes[symbol];if(!path)return null;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.85');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','cg-pro-icon');
 svg.innerHTML=path;return svg;
}
function upgrade(rootNode){
 if(!rootNode)return;
 const walker=document.createTreeWalker(rootNode,NodeFilter.SHOW_TEXT,{
 acceptNode(node){
  const parent=node.parentElement;
  if(!parent||parent.closest('script,style,textarea,option,svg,[data-no-translate],.cg-pro-icon'))return NodeFilter.FILTER_REJECT;
  return glyphs.some(g=>node.nodeValue.includes(g))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
 }});
 const nodes=[];let node;while(node=walker.nextNode())nodes.push(node);
 nodes.forEach(node=>{
  const parts=node.nodeValue.split(re),matches=[...node.nodeValue.matchAll(re)];
  if(!matches.length)return;
  const frag=document.createDocumentFragment();
  parts.forEach((part,i)=>{if(part)frag.appendChild(document.createTextNode(part));if(matches[i]){const svg=icon(matches[i][0]);if(svg)frag.appendChild(svg);}});
  node.replaceWith(frag);
 });
}
root.CGProIcons={upgrade,icon};
})(window);