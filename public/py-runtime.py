# =============================================================================
# Start2Code — Python runtime harness.
#
# Loaded by public/runner.html and executed by PyScript. It wires print/input up
# to the console in the parent window, then runs the student's program (handed
# over as window.s2cSource) and turns any crash into a message a child can act
# on rather than a raw traceback.
# =============================================================================
import sys
import os
import re
import ast
import json
import asyncio
import builtins
import importlib
import traceback

from pyscript import window as _w

STUDENT_FILE = "main.py"


class _Stream:
    """A file-like object that forwards writes to the parent window."""

    def __init__(self, name):
        self._name = name

    def write(self, text):
        if text:
            _w.s2cWrite(self._name, text)
        return len(text) if text else 0

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def flush(self):
        pass

    def isatty(self):
        return False


sys.stdout = _Stream("out")
sys.stderr = _Stream("err")


async def _s2c_ask(prompt=""):
    """input(), answered in the console instead of a pop-up."""
    text = "" if prompt is None else str(prompt)
    value = await _w.s2cAsk(text)
    if value is None:
        raise EOFError("The program asked for input but nothing was typed in.")
    # Echo the prompt and the answer so the console reads like a real terminal.
    sys.stdout.write(text + str(value) + "\n")
    return str(value)


def _s2c_input(prompt=""):
    """The plain, blocking input(), for the places a program could not be made
    to await it. Where the browser can pause Python without freezing the page
    (JSPI), the console is still used; where it cannot, this is a pop-up."""
    try:
        from pyodide.ffi import can_run_sync, run_sync
        if can_run_sync():
            return run_sync(_s2c_ask(prompt))
    except Exception:    # noqa: BLE001 - no JSPI here, use the pop-up
        pass

    text = "" if prompt is None else str(prompt)
    value = _w.s2cInput(text)
    if value is None:
        raise EOFError("The program asked for input but nothing was typed in.")
    sys.stdout.write(text + str(value) + "\n")
    return str(value)


builtins.input = _s2c_input


# -----------------------------------------------------------------------------
# Friendly explanations for the mistakes beginners actually make.
# -----------------------------------------------------------------------------
def _hint(exc):
    name = type(exc).__name__
    text = str(exc)

    if isinstance(exc, IndentationError):
        return ("Python cares about indentation. Every line inside an if, a loop or a "
                "function needs the same number of spaces in front of it.")
    if isinstance(exc, SyntaxError):
        return ("Python could not understand this line. Look for a missing ':' at the end, "
                "or a bracket or quote that was never closed.")
    if isinstance(exc, ZeroDivisionError):
        return "You cannot divide a number by zero."
    if isinstance(exc, NameError):
        missing = text.split("'")[1] if "'" in text else "that name"
        return ("Python has never seen '%s' before. Check the spelling, and make sure you "
                "created it before using it." % missing)
    if isinstance(exc, ModuleNotFoundError):
        missing = text.split("'")[1] if "'" in text else "that module"
        return ("Python cannot find '%s'. If it is one of your own files, check that there is a "
                "tab called %s.py and that the spelling matches. Otherwise it is a library that "
                "does not work in the browser - pygame, math, random and time all do." % (missing, missing))
    if isinstance(exc, ImportError):
        return ("Python found the file but not what you asked for in it. Check that the name "
                "after 'import' really exists there, and that it is spelled the same.")
    if isinstance(exc, IndexError):
        return "You asked for an item that is past the end of the list. Remember the first item is number 0."
    if isinstance(exc, KeyError):
        return "That key is not in the dictionary. Check the spelling, or add it first."
    if isinstance(exc, AttributeError):
        return "That object does not have the thing you asked for. Check the spelling after the dot."
    if isinstance(exc, TypeError):
        return ("The values you used do not fit together. Mixing text and numbers is a common "
                "cause - try int(...) or str(...) to convert one of them.")
    if isinstance(exc, ValueError):
        return "The value has the right type but the wrong content - for example int('hello')."
    if isinstance(exc, RecursionError):
        return "A function kept calling itself and never stopped."
    if isinstance(exc, KeyboardInterrupt):
        return "The program was stopped."
    return "%s: %s" % (name, text)


def _is_student_file(filename):
    return filename == STUDENT_FILE or os.path.basename(str(filename)) in _extra_sources


def _short_name(filename):
    return STUDENT_FILE if filename == STUDENT_FILE else os.path.basename(str(filename))


def _where(filename, number):
    """"Line 4" for the main file, "functies.py, line 4" for any other."""
    name = _short_name(filename)
    return ("Line %d" % number) if name == STUDENT_FILE else ("%s, line %d" % (name, number))


def _line_of(number, filename=STUDENT_FILE):
    """The student's source line `number` of `filename`, if it exists.

    The main file was compiled from a string, so traceback cannot find it on its
    own: there is no file on disk for linecache to read. The extra files are
    real files, but this keeps one way of asking for both.
    """
    try:
        lines = _source_lines if _short_name(filename) == STUDENT_FILE else _extra_sources[_short_name(filename)]
        return lines[number - 1].strip()
    except (IndexError, TypeError, KeyError):
        return ""


def _report(exc):
    """Print a compact, student-focused error report to stderr."""
    lines = ["\n── Something went wrong ──\n"]

    if isinstance(exc, SyntaxError) and exc.lineno:
        filename = exc.filename if _is_student_file(exc.filename) else STUDENT_FILE
        lines.append("%s: %s\n" % (_where(filename, exc.lineno), type(exc).__name__))
        text = exc.text or _line_of(exc.lineno, filename)
        if text:
            lines.append("    %s\n" % text.rstrip())
    else:
        # Keep only the frames that belong to the student's own files; the
        # harness frames are noise to them.
        frames = [f for f in traceback.extract_tb(exc.__traceback__) if _is_student_file(f.filename)]
        if frames:
            last = frames[-1]
            lines.append("%s: %s\n" % (_where(last.filename, last.lineno), type(exc).__name__))
            text = last.line or _line_of(last.lineno, last.filename)
            if text:
                lines.append("    %s\n" % text.strip())
            if len(frames) > 1:
                trail = " -> ".join(_where(f.filename, f.lineno).lower() for f in frames)
                lines.append("    (path through your code: %s)\n" % trail)
        else:
            lines.append("%s\n" % type(exc).__name__)

    lines.append("\n%s\n" % _hint(exc))
    sys.stderr.write("".join(lines))


# -----------------------------------------------------------------------------
# Letting the browser breathe, without the child having to know.
#
# A browser runs everything on one thread. A game loop that never hands control
# back freezes the whole tab: no drawing, no clicks, no way to press Stop. The
# standard cure is to make the program async and `await asyncio.sleep(0)` once
# per frame — which is exactly the part a ten-year-old should not have to read.
#
# So the child writes an ordinary pygame loop, and this rewrites it on the way
# in: every `pygame.display.flip()` (or `update()`) is followed by a pause, and
# any function that draws is made async and awaited where it is called. The
# line numbers are untouched, so error messages still point at the child's own
# lines.
#
# Code that already uses asyncio is left exactly as written — lessons from
# before this existed, and anyone who knows what they are doing.
# -----------------------------------------------------------------------------
_FRAME_CALLS = {"flip", "update"}


async def _s2c_pause():
    await asyncio.sleep(0)


def _is_frame_call(node):
    """True for a statement like pygame.display.flip() or display.update()."""
    if not (isinstance(node, ast.Expr) and isinstance(node.value, ast.Call)):
        return False
    func = node.value.func
    if not (isinstance(func, ast.Attribute) and func.attr in _FRAME_CALLS):
        return False
    owner = func.value
    return (
        (isinstance(owner, ast.Attribute) and owner.attr == "display")
        or (isinstance(owner, ast.Name) and owner.id == "display")
    )


def _is_input_call(node):
    return (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "input"
    )


def _already_async(tree):
    for node in ast.walk(tree):
        if isinstance(node, (ast.AsyncFunctionDef, ast.Await, ast.AsyncFor, ast.AsyncWith)):
            return True
        if isinstance(node, ast.Import) and any(a.name.split(".")[0] == "asyncio" for a in node.names):
            return True
        if isinstance(node, ast.ImportFrom) and (node.module or "").split(".")[0] == "asyncio":
            return True
    return False


def _functions_that_wait(tree, with_input):
    """Names of top-level functions that wait on the browser, directly or through
    another: they draw a frame or, if asked, call input()."""
    defs = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}

    def waits(node):
        return _is_frame_call(node) or (with_input and _is_input_call(node))

    slow = {
        name for name, fn in defs.items()
        if any(waits(n) for n in ast.walk(fn))
    }

    # A function that calls a slow function is slow too: it has to wait for it.
    changed = True
    while changed:
        changed = False
        for name, fn in defs.items():
            if name in slow:
                continue
            for n in ast.walk(fn):
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in slow:
                    slow.add(name)
                    changed = True
                    break
    return slow


class _Breathe(ast.NodeTransformer):
    def __init__(self, slow, with_input):
        self.slow = slow
        self.with_input = with_input
        self.in_class = 0
        self.in_function = 0

    def visit_ClassDef(self, node):
        self.in_class += 1
        try:
            return self.generic_visit(node)
        finally:
            self.in_class -= 1

    def visit_FunctionDef(self, node):
        top_level = self.in_class == 0 and self.in_function == 0
        self.in_function += 1
        try:
            self.generic_visit(node)
        finally:
            self.in_function -= 1

        if top_level and node.name in self.slow:
            made = ast.AsyncFunctionDef(**{field: getattr(node, field) for field in node._fields})
            return ast.copy_location(made, node)
        return node

    def visit_Call(self, node):
        self.generic_visit(node)

        # input("...") becomes await _s2c_ask("..."): the answer is typed into
        # the console, which only works if the page is free to show the box.
        if self.with_input and _is_input_call(node):
            node.func = ast.copy_location(ast.Name(id="_s2c_ask", ctx=ast.Load()), node.func)
            return ast.copy_location(ast.Await(value=node), node)

        if isinstance(node.func, ast.Name) and node.func.id in self.slow:
            return ast.copy_location(ast.Await(value=node), node)
        return node

    def generic_visit(self, node):
        super().generic_visit(node)

        # After every frame is drawn, give the browser a turn.
        for field in ("body", "orelse", "finalbody"):
            statements = getattr(node, field, None)
            if not (isinstance(statements, list) and statements
                    and all(isinstance(s, ast.stmt) for s in statements)):
                continue

            rebuilt = []
            for statement in statements:
                rebuilt.append(statement)
                if _is_frame_call(statement):
                    pause = ast.Expr(value=ast.Await(value=ast.Call(
                        func=ast.Name(id="_s2c_pause", ctx=ast.Load()), args=[], keywords=[]
                    )))
                    rebuilt.append(ast.copy_location(pause, statement))
            setattr(node, field, rebuilt)

        return node


def _build(tree_source):
    """Compile the student's program, adding the waits a browser needs.

    Tried in order, each a step down from the last:
      1. frames AND input() made awaitable   (the normal case)
      2. frames only                         (an input() somewhere it cannot await,
                                              such as a method or a lambda)
      3. exactly as written                  (anything else; it still works, it just
                                              cannot be stopped mid-loop)
    A genuine mistake in the code is reported from the last, plain compile.
    """
    if not _already_async(ast.parse(tree_source, STUDENT_FILE)):
        for with_input in (True, False):
            try:
                tree = ast.parse(tree_source, STUDENT_FILE)
                rewritten = _Breathe(_functions_that_wait(tree, with_input), with_input).visit(tree)
                ast.fix_missing_locations(rewritten)
                return compile(rewritten, STUDENT_FILE, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
            except Exception:    # noqa: BLE001
                continue

    return compile(tree_source, STUDENT_FILE, "exec")


# -----------------------------------------------------------------------------
# Run the student's program.
# -----------------------------------------------------------------------------
_w.s2cStarted()

_extra_sources = {}   # file name -> its lines, for error messages


def _install_project_files():
    """Write the project's extra .py files and its sprites where Python looks.

    The program then does what it would do on any computer: `import functies`
    finds functies.py, and pygame.image.load("ster.png") finds ster.png.
    Names are checked here as well as in the editor, since this is the end that
    writes to disk.
    """
    name_ok = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_\-]*\.(py|png)$")

    try:
        extras = json.loads(str(_w.s2cFilesJson or "[]"))
    except Exception:    # noqa: BLE001
        extras = []

    for item in extras:
        name = str(item.get("name", ""))
        if not name_ok.match(name) or not name.endswith(".py") or not name[:-3].isidentifier() or name == STUDENT_FILE:
            continue
        content = str(item.get("content", ""))
        with open(name, "w", encoding="utf-8") as handle:
            handle.write(content)
        _extra_sources[name] = content.splitlines()

    try:
        asset_names = json.loads(str(_w.s2cAssetNames or "[]"))
    except Exception:    # noqa: BLE001
        asset_names = []

    for index, name in enumerate(asset_names):
        name = str(name)
        if not name_ok.match(name) or not name.endswith(".png"):
            continue
        try:
            data = _w.s2cAssetData[index].to_bytes()
        except Exception:    # noqa: BLE001 - a missing picture is reported when the program asks for it
            continue
        with open(name, "wb") as handle:
            handle.write(data)

    if os.getcwd() not in sys.path:
        sys.path.insert(0, os.getcwd())
    importlib.invalidate_caches()


_install_project_files()

def _follow_window_size():
    """Make the stage the size of the window the program asks for.

    The canvas PyScript hands to pygame never changes size by itself, so
    set_mode((400, 300)) drew a small picture in the corner of a big black
    rectangle, and anything larger than 1280 x 720 was cut off. This reports
    every set_mode() to the page, which resizes the canvas to match.
    """
    try:
        import pygame
    except Exception:    # noqa: BLE001 - no pygame, nothing to follow
        return

    original = pygame.display.set_mode

    def set_mode(*args, **kwargs):
        surface = original(*args, **kwargs)
        try:
            width, height = surface.get_size()
            _w.s2cResize(width, height)
        except Exception:    # noqa: BLE001 - never let this get in the program's way
            pass
        return surface

    pygame.display.set_mode = set_mode


if str(_w.s2cMode) == "game":
    _follow_window_size()

_source = str(_w.s2cSource)
_source_lines = _source.splitlines()
_globals = {
    "__name__": "__main__",
    "__builtins__": builtins,
    "_s2c_pause": _s2c_pause,
    "_s2c_ask": _s2c_ask,
}

try:
    # Parsing first gives the usual friendly report for a typo, on the right line.
    ast.parse(_source, STUDENT_FILE)
    _code = _build(_source)
except SyntaxError as exc:          # a mistake in the code itself
    _report(exc)
    _w.s2cDone(False, type(exc).__name__)
else:
    try:
        _outcome = eval(_code, _globals)
        if asyncio.iscoroutine(_outcome):
            await _outcome
    except SystemExit:              # sys.exit() is a normal way to finish
        _w.s2cDone(True, "")
    except BaseException as exc:    # noqa: BLE001 - the point is to catch everything
        _report(exc)
        _w.s2cDone(False, type(exc).__name__)
    else:
        _w.s2cDone(True, "")
