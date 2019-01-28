const e=e=>({perform(){const r=e(),t=e=>{let n=r.next(e);return n.done?n.value:Promise.resolve(n.value).then(t)};return t()}});export{e as task};
//# sourceMappingURL=js-concurrency.es.js.map
