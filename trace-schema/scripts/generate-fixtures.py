"""Writes the method-calls fixture (mirrors lessons/memory/method-calls/Program.java, verified against jdb) and the invalid fixtures. Run after editing that Program."""
import json, copy, sys
import os
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
lines = open(f"{root}/lessons/memory/method-calls/Program.java").read().rstrip("\n").split("\n")
F = "Program.java"

def prim(v, t="int"): return {"kind": "primitive", "type": t, "display": str(v)}
def ref(i): return {"kind": "ref", "id": i}
NULL = {"kind": "null"}
def var(n, t, v): return {"name": n, "type": t, "value": v}
def loc(l): return {"file": F, "line": l}

args = {"id": "o1", "type": "java.lang.String[]", "shape": "array", "elements": [], "state": "live", "internal": True, "inline": False}
def point(x, y, state="live"):
    return {"id": "o2", "type": "Point", "shape": "object", "fields": [var("x", "int", prim(x)), var("y", "int", prim(y))],
            "state": state, "internal": False, "inline": False, "allocatedAt": loc(6)}
def frame(fid, cls, m, line, locals_): return {"id": fid, "className": cls, "method": m, "line": line, "locals": locals_}
def main(line, *locals_): return frame("f1", "Program", "main", line, [var("args", "java.lang.String[]", ref("o1")), *locals_])

X, Y, SUM = var("x", "int", prim(2)), var("y", "int", prim(3)), var("sum", "int", prim(5))
OUT = "Point[x=5, y=0]\n"

def step(line, frames, heap, events, console=""):
    return {"location": loc(line), "activeThread": "main",
            "threads": [{"id": "main", "name": "main", "state": "running", "frames": frames}],
            "statics": [], "heap": heap, "console": console, "events": events}

steps = [
    step(3, [main(3)], [args], [{"type": "call", "thread": "main", "frameId": "f1"}]),
    step(4, [main(4, X)], [args], [{"type": "assign", "target": {"frameId": "f1", "name": "x"}, "value": prim(2)}]),
    step(5, [main(5, X, Y)], [args], [{"type": "assign", "target": {"frameId": "f1", "name": "y"}, "value": prim(3)}]),
    step(12, [main(5, X, Y), frame("f2", "Program", "add", 12, [var("a", "int", prim(2)), var("b", "int", prim(3))])], [args],
         [{"type": "call", "thread": "main", "frameId": "f2"}]),
    step(13, [main(5, X, Y), frame("f2", "Program", "add", 13, [var("a", "int", prim(2)), var("b", "int", prim(3)), var("result", "int", prim(5))])], [args],
         [{"type": "assign", "target": {"frameId": "f2", "name": "result"}, "value": prim(5)}]),
    step(5, [main(5, X, Y)], [args], [{"type": "return", "thread": "main", "frameId": "f2", "value": prim(5)}]),
    step(6, [main(6, X, Y, SUM)], [args], [{"type": "assign", "target": {"frameId": "f1", "name": "sum"}, "value": prim(5)}]),
    step(17, [main(6, X, Y, SUM), frame("f3", "Point", "<init>", 17, [var("this", "Point", ref("o2")), var("x", "int", prim(5)), var("y", "int", prim(0))])],
         [args, point(0, 0)],
         [{"type": "allocate", "objectId": "o2"}, {"type": "call", "thread": "main", "frameId": "f3"}]),
    step(6, [main(6, X, Y, SUM)], [args, point(5, 0)],
         [{"type": "return", "thread": "main", "frameId": "f3"},
          {"type": "assign", "target": {"objectId": "o2", "field": "x"}, "value": prim(5)}]),
    step(7, [main(7, X, Y, SUM, var("p", "Point", ref("o2")))], [args, point(5, 0)],
         [{"type": "assign", "target": {"frameId": "f1", "name": "p"}, "value": ref("o2")}]),
    step(17, [main(7, X, Y, SUM, var("p", "Point", ref("o2"))), frame("f4", "Point", "toString", 17, [var("this", "Point", ref("o2"))])],
         [args, point(5, 0)], [{"type": "call", "thread": "main", "frameId": "f4"}]),
    step(8, [main(8, X, Y, SUM, var("p", "Point", ref("o2")))], [args, point(5, 0)],
         [{"type": "return", "thread": "main", "frameId": "f4"}, {"type": "output", "text": OUT}], OUT),
    step(9, [main(9, X, Y, SUM, var("p", "Point", NULL))], [args, point(5, 0, "eligible")],
         [{"type": "assign", "target": {"frameId": "f1", "name": "p"}, "value": NULL}, {"type": "eligible", "objectId": "o2"}], OUT),
]

trace = {"schemaVersion": 1, "lessonId": "memory/method-calls", "variantId": "default",
         "source": [{"path": F, "lines": lines}],
         "markers": {"call-add": 2, "new-point": 6, "print": 9, "object-dropped": 11, "end": 12, "add-compute": 3, "point-constructor": 7}, "steps": steps}
out = f"{root}/trace-schema/fixtures/method-calls.json"
json.dump(trace, open(out, "w"), indent=2); open(out, "a").write("\n")

# Invalid fixtures: each breaks exactly one rule the checks must catch.
def broken(name, mutate):
    t = copy.deepcopy(trace); mutate(t)
    p = f"{root}/trace-schema/fixtures/invalid/{name}.json"
    json.dump(t, open(p, "w"), indent=2); open(p, "a").write("\n")
import os; os.makedirs(f"{root}/trace-schema/fixtures/invalid", exist_ok=True)
broken("dangling-reference", lambda t: t["steps"][9]["threads"][0]["frames"][0]["locals"][-1]["value"].update(id="o99"))
broken("marker-out-of-range", lambda t: t["markers"].update({"add-compute": 99}))
broken("eligible-object-revived", lambda t: t["steps"].append(copy.deepcopy(t["steps"][9]) | {"console": OUT}))
broken("missing-required-field", lambda t: t["steps"][0].pop("heap"))
