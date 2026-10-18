import type { Trace, Step, Value, HeapObject } from "./trace.generated.ts";

/**
 * Semantic checks the JSON Schema can't express: References resolve, ids are stable,
 * Markers point at real Steps, and state only moves forward.
 * Assumes the Trace already passed schema validation.
 */
export function checkTrace(trace: Trace): string[] {
  const errors: string[] = [];
  const files = new Map(trace.source.map((f) => [f.path, f.lines.length]));
  const frameIdentity = new Map<string, string>();
  const objectType = new Map<string, string>();
  const objectState = new Map<string, HeapObject["state"]>();

  const checkLocation = (where: string, file: string, line: number) => {
    const lineCount = files.get(file);
    if (lineCount === undefined) errors.push(`${where}: unknown source file "${file}"`);
    else if (line > lineCount) errors.push(`${where}: line ${line} is past the end of ${file} (${lineCount} lines)`);
  };

  for (const [name, index] of Object.entries(trace.markers)) {
    if (index >= trace.steps.length) {
      errors.push(`marker "${name}": step ${index} does not exist (${trace.steps.length} steps)`);
    }
  }

  trace.steps.forEach((step, i) => {
    const at = `steps[${i}]`;
    const prev = i > 0 ? trace.steps[i - 1] : undefined;
    const heapIds = new Set<string>();
    const threadIds = new Set(step.threads.map((t) => t.id));
    const frameIds = new Set<string>();

    const checkValue = (where: string, value: Value) => {
      if (value.kind === "ref" && !step.heap.some((o) => o.id === value.id)) {
        errors.push(`${where}: Reference to "${value.id}" which is not on the Heap`);
      }
    };

    checkLocation(`${at}.location`, step.location.file, step.location.line);

    if (step.subStep && step.subStep.index >= step.subStep.count) {
      errors.push(`${at}.subStep: index ${step.subStep.index} out of range (count ${step.subStep.count})`);
    }

    if (prev && !step.console.startsWith(prev.console)) {
      errors.push(`${at}.console: output must only grow`);
    }

    for (const obj of step.heap) {
      const where = `${at}.heap[${obj.id}]`;
      if (heapIds.has(obj.id)) errors.push(`${where}: duplicate Object id`);
      heapIds.add(obj.id);

      const knownType = objectType.get(obj.id);
      if (knownType !== undefined && knownType !== obj.type) {
        errors.push(`${where}: type changed from ${knownType} to ${obj.type}`);
      }
      objectType.set(obj.id, obj.type);

      const prevState = objectState.get(obj.id);
      if (prevState && stateRank[obj.state] < stateRank[prevState]) {
        errors.push(`${where}: state went backwards from ${prevState} to ${obj.state}`);
      }
      objectState.set(obj.id, obj.state);

      if (obj.allocatedAt) checkLocation(`${where}.allocatedAt`, obj.allocatedAt.file, obj.allocatedAt.line);
      obj.fields?.forEach((f) => checkValue(`${where}.${f.name}`, f.value));
      obj.elements?.forEach((v, j) => checkValue(`${where}[${j}]`, v));

      if (obj.monitor) {
        for (const t of [obj.monitor.owner, ...obj.monitor.blocked, ...obj.monitor.waiting]) {
          if (t !== null && !threadIds.has(t)) errors.push(`${where}.monitor: unknown thread "${t}"`);
        }
      }
    }

    for (const thread of step.threads) {
      for (const frame of thread.frames) {
        const where = `${at}.threads[${thread.id}].frames[${frame.id}]`;
        if (frameIds.has(frame.id)) errors.push(`${where}: duplicate Frame id`);
        frameIds.add(frame.id);

        const identity = `${thread.id} ${frame.className}.${frame.method}`;
        const known = frameIdentity.get(frame.id);
        if (known !== undefined && known !== identity) {
          errors.push(`${where}: id reused for a different invocation (${known} → ${identity})`);
        }
        frameIdentity.set(frame.id, identity);

        frame.locals.forEach((v) => checkValue(`${where}.${v.name}`, v.value));
      }
    }

    for (const s of step.statics) {
      s.fields.forEach((f) => checkValue(`${at}.statics[${s.className}].${f.name}`, f.value));
    }

    const active = step.threads.find((t) => t.id === step.activeThread);
    if (!active) {
      errors.push(`${at}.activeThread: unknown thread "${step.activeThread}"`);
    } else {
      if (active.state !== "running") errors.push(`${at}: active thread must be "running", is "${active.state}"`);
      const top = active.frames.at(-1);
      if (top && top.line !== step.location.line) {
        errors.push(`${at}: top Frame is at line ${top.line} but the Step is at line ${step.location.line}`);
      }
    }

    checkEvents(step, prev, at, frameIds, heapIds, threadIds, errors, checkValue);
  });

  return errors;
}

const stateRank: Record<HeapObject["state"], number> = { live: 0, eligible: 1, collected: 2 };

function framesOf(step: Step | undefined): Set<string> {
  return new Set(step?.threads.flatMap((t) => t.frames.map((f) => f.id)) ?? []);
}

function checkEvents(
  step: Step,
  prev: Step | undefined,
  at: string,
  frameIds: Set<string>,
  heapIds: Set<string>,
  threadIds: Set<string>,
  errors: string[],
  checkValue: (where: string, value: Value) => void,
) {
  const prevFrames = framesOf(prev);
  const prevHeap = new Set(prev?.heap.map((o) => o.id) ?? []);

  step.events.forEach((event, j) => {
    const where = `${at}.events[${j}] (${event.type})`;
    if ("thread" in event && !threadIds.has(event.thread)) errors.push(`${where}: unknown thread "${event.thread}"`);

    switch (event.type) {
      case "call":
        if (!frameIds.has(event.frameId)) errors.push(`${where}: Frame "${event.frameId}" is not on any Stack`);
        if (prevFrames.has(event.frameId)) errors.push(`${where}: Frame "${event.frameId}" already existed`);
        break;
      case "return":
        if (!prevFrames.has(event.frameId)) errors.push(`${where}: Frame "${event.frameId}" did not exist before`);
        if (frameIds.has(event.frameId)) errors.push(`${where}: Frame "${event.frameId}" is still on a Stack`);
        if (event.value) checkValue(`${where}.value`, event.value);
        break;
      case "allocate":
        if (!heapIds.has(event.objectId)) errors.push(`${where}: Object "${event.objectId}" is not on the Heap`);
        if (prevHeap.has(event.objectId)) errors.push(`${where}: Object "${event.objectId}" already existed`);
        break;
      case "assign": {
        const t = event.target;
        if ("frameId" in t && !frameIds.has(t.frameId)) errors.push(`${where}: unknown Frame "${t.frameId}"`);
        if ("objectId" in t && !heapIds.has(t.objectId)) errors.push(`${where}: unknown Object "${t.objectId}"`);
        checkValue(`${where}.value`, event.value);
        break;
      }
      case "eligible":
      case "collected": {
        const obj = step.heap.find((o) => o.id === event.objectId);
        if (!obj) errors.push(`${where}: Object "${event.objectId}" is not on the Heap`);
        else if (obj.state !== event.type) errors.push(`${where}: Object "${event.objectId}" has state "${obj.state}"`);
        break;
      }
      case "lock-acquire":
      case "lock-release":
      case "lock-block":
      case "wait":
      case "notify":
        if (!heapIds.has(event.objectId)) errors.push(`${where}: unknown Object "${event.objectId}"`);
        break;
    }
  });
}
