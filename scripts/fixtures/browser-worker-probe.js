// Experimental page runtime, not a production authority or durable COP ledger.
// Adapted from the 2026-11-26 worker-probe demonstrator.
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function createWorker({id, host, programs}) {
    const saved = host.load();
    if (saved && (saved.schema !== 1 || saved.id !== id)) throw Error('checkpoint identity mismatch');
    let state = saved || {schema: 1, id, locals: {}, task: null, completed: []};
    function commit(next) { host.save(clone(next)); state = next; }
    if (!saved) commit(state);
    function snapshot() { return clone(state); }
    function assign(task) {
      if (state.task) throw Error('worker busy');
      if (!task.id || !Object.hasOwn(programs, task.program)) throw Error('invalid task');
      if (state.completed.includes(task.id)) throw Error('task already completed');
      const next = snapshot();
      next.task = {id: task.id, program: task.program, status: 'ready', pc: 0, locals: clone(task.locals || {})};
      commit(next); return snapshot();
    }
    function step(event = null) {
      if (!state.task) throw Error('worker idle');
      if (state.task.status === 'waiting' && event === null) return snapshot();
      const next = snapshot();
      const t = next.task;
      const result = programs[t.program]({pc: t.pc, locals: t.locals, workerLocals: next.locals, event: clone(event)});
      if (!result || !['ready','waiting','done'].includes(result.status)) throw Error('invalid yield');
      if (result.status === 'done') {
        next.completed.push(t.id); next.lastResult = {taskId: t.id, value: clone(result.value)}; next.task = null;
      } else {
        if (!Number.isSafeInteger(result.pc) || result.pc < 0) throw Error('invalid continuation');
        t.pc = result.pc; t.status = result.status;
      }
      commit(next); return snapshot();
    }
    return Object.freeze({id, snapshot, assign, step});
  }
  root.createWorker = createWorker;
})(globalThis);
